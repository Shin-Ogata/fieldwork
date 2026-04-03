/*!
 * @cdp/router 0.9.22
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
            const oldData = additional?.prevState ?? this.state;
            const newData = additional?.nextState ?? this.direct(newId).state ?? createData(newId, newState);
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
        return flatten('', coreUtils.isArray(routes) ? routes : routes ? [routes] : [])
            .map((seed) => {
            try {
                const { regexp, keys } = extensionPath2regexp.path2regexp.pathToRegexp(seed.path);
                seed.regexp = regexp;
                seed.paramKeys = keys.filter(k => coreUtils.isString(k.name)).map(k => k.name);
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
            throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Construct route destination failed. [path: ${path}, detail: ${String(error)}]`, error);
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
            dom.dom(nextRoute.el)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaGlzdG9yeS9pbnRlcm5hbC50cyIsInV0aWxzLnRzIiwiaGlzdG9yeS9zZXNzaW9uLnRzIiwiaGlzdG9yeS9tZW1vcnkudHMiLCJyb3V0ZXIvaW50ZXJuYWwudHMiLCJyb3V0ZXIvYXN5bmMtcHJvY2Vzcy50cyIsInJvdXRlci9jb3JlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgUk9VVEVSID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMTUsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBNVkNfUk9VVEVSX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMSwgJ3JvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAyLCAnUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDMsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfSU5WQUxJRF9TVUJGTE9XX0JBU0VfVVJMID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgNCwgJ0ludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfQlVTWSAgICAgICAgICAgICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgNSwgJ0luIGNoYW5naW5nIHBhZ2UgcHJvY2VzcyBub3cuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTCA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgYXQsXG4gICAgc29ydCxcbiAgICBub29wLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHR5cGUgeyBIaXN0b3J5U3RhdGUsIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBub3JtYWx6aWUgaWQgc3RyaW5nICovXG5leHBvcnQgY29uc3Qgbm9ybWFsaXplSWQgPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIC8vIHJlbW92ZSBoZWFkIG9mIFwiI1wiLCBcIi9cIiwgXCIjL1wiIGFuZCB0YWlsIG9mIFwiL1wiXG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9eKCNcXC8pfF5bIy9dfFxccyskLywgJycpLnJlcGxhY2UoL15cXHMrJHwoXFwvJCkvLCAnJyk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSBzdGFjayAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZURhdGEgPSA8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBIaXN0b3J5U3RhdGU8VD4gPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHsgJ0BpZCc6IG5vcm1hbGl6ZUlkKGlkKSB9LCBzdGF0ZSk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSB1bmNhbmNlbGxhYmxlIGRlZmVycmVkICovXG5leHBvcnQgY29uc3QgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkID0gKHdhcm46IHN0cmluZyk6IERlZmVycmVkID0+IHtcbiAgICBjb25zdCB1bmNhbmNlbGxhYmxlID0gbmV3IERlZmVycmVkKCkgYXMgV3JpdGFibGU8RGVmZXJyZWQ+O1xuICAgIHVuY2FuY2VsbGFibGUucmVqZWN0ID0gKCkgPT4ge1xuICAgICAgICBjb25zb2xlLndhcm4od2Fybik7XG4gICAgICAgIHVuY2FuY2VsbGFibGUucmVzb2x2ZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIHVuY2FuY2VsbGFibGU7XG59O1xuXG4vKiogQGludGVybmFsIGFzc2lnbiBzdGF0ZSBlbGVtZW50IGlmIGFscmVhZHkgZXhpc3RzICovXG5leHBvcnQgY29uc3QgYXNzaWduU3RhdGVFbGVtZW50ID0gKHN0YXRlOiBIaXN0b3J5U3RhdGUsIHN0YWNrOiBIaXN0b3J5U3RhY2spOiB2b2lkID0+IHtcbiAgICBjb25zdCBlbCA9IHN0YWNrLmRpcmVjdChzdGF0ZVsnQGlkJ10pPy5zdGF0ZT8uZWw7XG4gICAgKCFzdGF0ZS5lbCAmJiBlbCkgJiYgKHN0YXRlLmVsID0gZWwpO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsIHN0YWNrIG1hbmFnZW1lbnQgY29tbW9uIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhY2s8VCA9IFBsYWluT2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfc3RhY2s6IEhpc3RvcnlTdGF0ZTxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RhbmNlKDApO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlWydAaWQnXTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaWR4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBNYXRoLnRydW5jKGlkeCk7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgYXJyYXkoKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc2xpY2UoKTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgZmlyc3Qgb3Igbm90ICovXG4gICAgZ2V0IGlzRmlyc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAwID09PSB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgbGFzdCBvciBub3QgKi9cbiAgICBnZXQgaXNMYXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXggPT09IHRoaXMuX3N0YWNrLmxlbmd0aCAtIDE7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIHB1YmxpYyBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX3N0YWNrLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIGNsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHVibGljIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5zbGljZSgwLCB0aGlzLl9pbmRleCArIDEpO1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELiAqL1xuICAgIHB1YmxpYyBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgICAgICAgY29uc3QgeyBfaW5kZXg6IGJhc2UgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLl9zdGFja1xuICAgICAgICAgICAgLm1hcCgocywgaW5kZXgpID0+IHsgcmV0dXJuIHsgaW5kZXgsIGRpc3RhbmNlOiBNYXRoLmFicyhiYXNlIC0gaW5kZXgpLCAuLi5zIH07IH0pXG4gICAgICAgICAgICAuZmlsdGVyKHMgPT4gc1snQGlkJ10gPT09IGlkKVxuICAgICAgICA7XG4gICAgICAgIHNvcnQoY2FuZGlkYXRlcywgKGwsIHIpID0+IChsLmRpc3RhbmNlID4gci5kaXN0YW5jZSA/IDEgOiAtMSksIHRydWUpO1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXT8uaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgc3RhY2sgaW5mb3JtYXRpb24gYnkgdG8gSUQgYW5kIGZyb20gSUQuICovXG4gICAgcHVibGljIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgY29uc3QgdG9JbmRleCAgID0gdGhpcy5jbG9zZXN0KHRvSWQpO1xuICAgICAgICBjb25zdCBmcm9tSW5kZXggPSBudWxsID09IGZyb21JZCA/IHRoaXMuX2luZGV4IDogdGhpcy5jbG9zZXN0KGZyb21JZCk7XG4gICAgICAgIGlmIChudWxsID09IGZyb21JbmRleCB8fCBudWxsID09IHRvSW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbjogJ21pc3NpbmcnIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRvSW5kZXggLSBmcm9tSW5kZXg7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSAwID09PSBkZWx0YVxuICAgICAgICAgICAgICAgID8gJ25vbmUnXG4gICAgICAgICAgICAgICAgOiBkZWx0YSA8IDAgPyAnYmFjaycgOiAnZm9yd2FyZCc7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb24sIGRlbHRhLCBpbmRleDogdG9JbmRleCwgc3RhdGU6IHRoaXMuX3N0YWNrW3RvSW5kZXhdIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZ2V0IGFjdGl2ZSBkYXRhIGZyb20gY3VycmVudCBpbmRleCBvcmlnaW4gKi9cbiAgICBwdWJsaWMgZGlzdGFuY2UoZGVsdGE6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMuX2luZGV4ICsgZGVsdGE7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHt0aGlzLmxlbmd0aH0sIGdpdmVuOiAke3Bvc31dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXQocG9zKTtcbiAgICB9XG5cbiAgICAvKiogbm9vcCBzdGFjayAqL1xuICAgIHB1YmxpYyBub29wU3RhY2sgPSBub29wOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tZW1iZXItYWNjZXNzaWJpbGl0eVxuXG4gICAgLyoqIHB1c2ggc3RhY2sgKi9cbiAgICBwdWJsaWMgcHVzaFN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1srK3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHJlcGxhY2Ugc3RhY2sgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiBzZWVrIHN0YWNrICovXG4gICAgcHVibGljIHNlZWtTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmNsb3Nlc3QoZGF0YVsnQGlkJ10pO1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhpcy5wdXNoU3RhY2soZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGRpc3Bvc2Ugb2JqZWN0ICovXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTmFOO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHdlYlJvb3QgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyBVUkwgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4vaGlzdG9yeS9pbnRlcm5hbCc7XG5cbi8qKiByZS1leHBvcnQgKi9cbmV4cG9ydCAqIGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwJztcblxuLyoqXG4gKiBAZW4gR2VuZXJhdGVzIGFuIElEIHRvIGJlIHVzZWQgYnkgdGhlIHN0YWNrIGluc2lkZSB0aGUgcm91dGVyLlxuICogQGphIOODq+ODvOOCv+ODvOWGhemDqOOBriBzdGFjayDjgYzkvb/nlKjjgZnjgosgSUQg44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzcGVjaWZpZXMgd2hlcmUgdGhlIHBhdGggc3RyaW5nIGlzIGNyZWF0ZWQgZnJvbSBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKiAgLSBgamFgIHBhdGgg5paH5a2X5YiX44Gu5L2c5oiQ5YWD44KS5oyH5a6aIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVyU3RhY2tJZCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgaWYgKFVSTC5jYW5QYXJzZShzcmMpKSB7XG4gICAgICAgIGNvbnN0IHsgaGFzaCB9ID0gbmV3IFVSTChzcmMpO1xuICAgICAgICByZXR1cm4gaGFzaCA/IG5vcm1hbGl6ZUlkKGhhc2gpIDogbm9ybWFsaXplSWQoc3JjLnN1YnN0cmluZyh3ZWJSb290Lmxlbmd0aCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVJZChzcmMpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQGVuIEdldCB0aGUgbm9ybWFsaXplZCBgLzxpZD5gIHN0cmluZyBmcm9tIHRoZSB1cmwgLyBwYXRoLlxuICogQGphIHVybCAvIHBhdGgg44KS5oyH5a6a44GX44GmLCDmraPopo/ljJbjgZfjgZ8gYC88c3RhY2sgaWQ+YCDmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNwZWNpZmllcyB3aGVyZSB0aGUgcGF0aCBzdHJpbmcgaXMgY3JlYXRlZCBmcm9tIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqICAtIGBqYWAgcGF0aCDmloflrZfliJfjga7kvZzmiJDlhYPjgpLmjIflrpogW2V4OiBgbG9jYXRpb24uaGFzaGAsIGBsb2NhdGlvbi5ocmVmYCwgYCNwYXRoYCwgYHBhdGhgLCBgL3BhdGhgXVxuICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZXJQYXRoID0gKHNyYzogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gYC8ke3RvUm91dGVyU3RhY2tJZChzcmMpfWA7XG59O1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICBpc09iamVjdCxcbiAgICBub29wLFxuICAgICRjZHAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyB0b1VybCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHRvUm91dGVyU3RhY2tJZCBhcyB0b0lkIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi4vc3NyJztcbmltcG9ydCB0eXBlIHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGFjayxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBhc3NpZ25TdGF0ZUVsZW1lbnQsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGRpc3BhdGNoIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gKi9cbmludGVyZmFjZSBEaXNwYXRjaEluZm88VD4ge1xuICAgIGRmOiBEZWZlcnJlZDtcbiAgICBuZXdJZDogc3RyaW5nO1xuICAgIG9sZElkOiBzdHJpbmc7XG4gICAgcG9zdHByb2M6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJztcbiAgICBuZXh0U3RhdGU/OiBIaXN0b3J5U3RhdGU8VD47XG4gICAgcHJldlN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xufVxuXG4vKiogQGludGVybmFsIGNvbnN0YW50ICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBIQVNIX1BSRUZJWCA9ICcjLycsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzZXREaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4sIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFQgPT4ge1xuICAgIChzdGF0ZVskY2RwXSBhcyBEaXNwYXRjaEluZm88VD4pID0gYWRkaXRpb25hbDtcbiAgICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBwYXJzZURpc3BhdGNoSW5mbyA9IDxUPihzdGF0ZTogQWNjZXNzaWJsZTxUPik6IFtULCBEaXNwYXRjaEluZm88VD4/XSA9PiB7XG4gICAgaWYgKGlzT2JqZWN0KHN0YXRlKSAmJiBzdGF0ZVskY2RwXSkge1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsID0gc3RhdGVbJGNkcF07XG4gICAgICAgIGRlbGV0ZSBzdGF0ZVskY2RwXTtcbiAgICAgICAgcmV0dXJuIFtzdGF0ZSwgYWRkaXRpb25hbCBhcyBEaXNwYXRjaEluZm88VD5dO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbc3RhdGVdO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdTZXNzaW9uSGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX21vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb3BTdGF0ZUhhbmRsZXI6IChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcbiAgICBwcml2YXRlIF9kZkdvPzogRGVmZXJyZWQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdpbmRvd0NvbnR4dDogV2luZG93LCBtb2RlOiAnaGFzaCcgfCAnaGlzdG9yeScsIGlkPzogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbmRvd0NvbnR4dDtcbiAgICAgICAgdGhpcy5fbW9kZSA9IG1vZGU7XG5cbiAgICAgICAgdGhpcy5fcG9wU3RhdGVIYW5kbGVyID0gKGV2OiBQb3BTdGF0ZUV2ZW50KTogdm9pZCA9PiB7IHZvaWQgdGhpcy5vblBvcFN0YXRlKGV2KTsgfTtcbiAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcblxuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIHZvaWQgdGhpcy5yZXBsYWNlKGlkID8/IHRvSWQodGhpcy5fd2luZG93LmxvY2F0aW9uLmhyZWYpLCBzdGF0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGlzcG9zZSBvYmplY3RcbiAgICAgKi9cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zdGFjay5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMub2ZmKCk7XG4gICAgICAgIGRlbGV0ZSAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0IGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyByZXNldChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKE51bWJlci5pc05hTih0aGlzLmluZGV4KSB8fCB0aGlzLl9zdGFjay5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBzaWxlbnQgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgcHJldlN0YXRlID0gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICBjb25zdCBuZXdVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4gPSB7XG4gICAgICAgICAgICAgICAgZGY6IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCgnU2Vzc2lvbkhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0b0lkKG9sZFVSTCksXG4gICAgICAgICAgICAgICAgcG9zdHByb2M6ICdub29wJyxcbiAgICAgICAgICAgICAgICBwcmV2U3RhdGUsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8odGhpcy5zdGF0ZSwgYWRkaXRpb25hbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gYmFjayBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkJhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNGaXJzdDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzTGFzdDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hdChpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgLy8gaWYgYWxyZWFkeSBjYWxsZWQsIG5vIHJlYWN0aW9uLlxuICAgICAgICBpZiAodGhpcy5fZGZHbykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBnaXZlbiAwLCBqdXN0IHJlbG9hZC5cbiAgICAgICAgaWYgKCFkZWx0YSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgdGhpcy5zdGF0ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb2xkSW5kZXggPSB0aGlzLmluZGV4O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gbmV3IERlZmVycmVkKCk7XG4gICAgICAgICAgICB0aGlzLl9zdGFjay5kaXN0YW5jZShkZWx0YSk7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuaGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9kZkdvO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZSk7XG4gICAgICAgICAgICB0aGlzLnNldEluZGV4KG9sZEluZGV4KTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2RmR28gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkgYnkgc3RhY2sgSUQuICovXG4gICAgdHJhdmVyc2VUbyhpZDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBkaXJlY3Rpb24sIGRlbHRhIH0gPSB0aGlzLmRpcmVjdChpZCk7XG4gICAgICAgIGlmICgnbWlzc2luZycgPT09IGRpcmVjdGlvbikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGB0cmF2ZXJzZVRvKCR7aWR9KSwgcmV0dXJuZWQgbWlzc2luZy5gKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5pbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oZGVsdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciBuZXcgaGlzdG9yeS5cbiAgICAgKiBAamEg5paw6KaP5bGl5q2044Gu55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVzaChpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3B1c2gnLCBpZCwgc3RhdGUsIG9wdGlvbnMgPz8ge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGN1cnJlbnQgaGlzdG9yeS5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu572u5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcmVwbGFjZShpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3JlcGxhY2UnLCBpZCwgc3RhdGUsIG9wdGlvbnMgPz8ge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBmb3J3YXJkIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgojjgorliY3mlrnjga7lsaXmrbTjgpLliYrpmaRcbiAgICAgKi9cbiAgICBjbGVhckZvcndhcmQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmNsZWFyRm9yd2FyZCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5jbGVhckZvcndhcmRIaXN0b3J5KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gZGVzdGluYXRpb24gc3RhY2sgaW5mb3JtYXRpb24gYnkgYHN0YXJ0YCBhbmQgYGVuZGAgSUQuXG4gICAgICogQGphIOi1t+eCuSwg57WC54K544GuIElEIOOCkuaMh+WumuOBl+OBpuOCueOCv+ODg+OCr+aDheWgseOCkui/lOWNtFxuICAgICAqL1xuICAgIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmRpcmVjdCh0b0lkLCBmcm9tSWQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgc2V0IGluZGV4ICovXG4gICAgcHJpdmF0ZSBzZXRJbmRleChpZHg6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5pbmRleCA9IGlkeDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbnZlcnQgdG8gVVJMICovXG4gICAgcHJpdmF0ZSB0b1VybChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICgnaGFzaCcgPT09IHRoaXMuX21vZGUpID8gYCR7Q29uc3QuSEFTSF9QUkVGSVh9JHtpZH1gIDogdG9VcmwoaWQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBldmVudCAmIHdhaXQgcHJvY2VzcyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJpZ2dlckV2ZW50QW5kV2FpdChcbiAgICAgICAgZXZlbnQ6ICdyZWZyZXNoJyB8ICdjaGFuZ2luZycsXG4gICAgICAgIGFyZzE6IEhpc3RvcnlTdGF0ZTxUPixcbiAgICAgICAgYXJnMjogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkIHwgKChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgICAgICB0aGlzLnB1Ymxpc2goZXZlbnQsIGFyZzEsIGFyZzIgYXMgYW55LCBwcm9taXNlcyk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlU3RhdGUobWV0aG9kOiAncHVzaCcgfCAncmVwbGFjZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGNhbmNlbCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiwgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSBjcmVhdGVEYXRhKGlkLCBzdGF0ZSk7XG4gICAgICAgIGlkID0gZGF0YVsnQGlkJ107XG4gICAgICAgIGlmICgncmVwbGFjZScgPT09IG1ldGhvZCAmJiAwID09PSB0aGlzLmluZGV4KSB7XG4gICAgICAgICAgICBkYXRhWydAb3JpZ2luJ10gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb2xkVVJMID0gbG9jYXRpb24uaHJlZjtcbiAgICAgICAgaGlzdG9yeVtgJHttZXRob2R9U3RhdGVgXShkYXRhLCAnJywgdGhpcy50b1VybChpZCkpO1xuICAgICAgICBjb25zdCBuZXdVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIGFzc2lnblN0YXRlRWxlbWVudChkYXRhLCB0aGlzLl9zdGFjayBhcyBIaXN0b3J5U3RhY2spO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4gPSB7XG4gICAgICAgICAgICAgICAgZGY6IG5ldyBEZWZlcnJlZChjYW5jZWwpLFxuICAgICAgICAgICAgICAgIG5ld0lkOiB0b0lkKG5ld1VSTCksXG4gICAgICAgICAgICAgICAgb2xkSWQ6IHRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogbWV0aG9kLFxuICAgICAgICAgICAgICAgIG5leHRTdGF0ZTogZGF0YSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyhkYXRhLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgZGlzcGF0Y2hDaGFuZ2VJbmZvKG5ld1N0YXRlOiBBY2Nlc3NpYmxlPFQ+LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzZXREaXNwYXRjaEluZm8obmV3U3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB0aGlzLl93aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgUG9wU3RhdGVFdmVudCgncG9wc3RhdGUnLCB7IHN0YXRlIH0pKTtcbiAgICAgICAgYXdhaXQgYWRkaXRpb25hbC5kZjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNpbGVudCBwb3BzdGF0ZSBldmVudCBsaXN0bmVyIHNjb3BlICovXG4gICAgcHJpdmF0ZSBhc3luYyBzdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShleGVjdXRvcjogKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pID0+IFByb21pc2U8dm9pZD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgICAgICBjb25zdCB3YWl0UG9wU3RhdGUgPSAoKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXYuc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCBleGVjdXRvcih3YWl0UG9wU3RhdGUpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcm9sbGJhY2sgaGlzdG9yeSAqL1xuICAgIHByaXZhdGUgYXN5bmMgcm9sbGJhY2tIaXN0b3J5KG1ldGhvZDogc3RyaW5nLCBuZXdJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAncmVwbGFjZSc6XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUodGhpcy5zdGF0ZSwgJycsIHRoaXMudG9VcmwodGhpcy5pZCkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncHVzaCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICBoaXN0b3J5LmdvKC0xKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRoaXMuaW5kZXggLSB0aGlzLmNsb3Nlc3QobmV3SWQpITtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgIT09IGRlbHRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGEgJiYgaGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNsZWFyIGZvcndhcmQgc2Vzc2lvbiBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC4gKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyRm9yd2FyZEhpc3RvcnkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzT3JpZ2luID0gKHN0OiBBY2Nlc3NpYmxlPHVua25vd24+KTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0Py5bJ0BvcmlnaW4nXSBhcyBib29sZWFuO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBoaXN0b3J5LnN0YXRlO1xuXG4gICAgICAgICAgICAvLyBiYWNrIHRvIHNlc3Npb24gb3JpZ2luXG4gICAgICAgICAgICB3aGlsZSAoIWlzT3JpZ2luKHN0YXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBlbnN1cmUgPSAoc3JjOiBBY2Nlc3NpYmxlPHVua25vd24+KTogdW5rbm93biA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3R4ID0geyAuLi5zcmMgfTtcbiAgICAgICAgICAgICAgICBkZWxldGUgY3R4Wydyb3V0ZXInXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgY3R4WydAcGFyYW1zJ107XG4gICAgICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3R4KSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBmb3J3YXJkIGZyb20gaW5kZXggMSB0byBjdXJyZW50IHZhbHVlXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMSwgbiA9IHRoaXMuX3N0YWNrLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0ID0gdGhpcy5fc3RhY2suYXQoaSk7XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoZW5zdXJlKHN0KSwgJycsIHRoaXMudG9Vcmwoc3RbJ0BpZCddKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCByZWNlaXZlIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBvblBvcFN0YXRlKGV2OiBQb3BTdGF0ZUV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgW25ld1N0YXRlLCBhZGRpdGlvbmFsXSA9IHBhcnNlRGlzcGF0Y2hJbmZvKGV2LnN0YXRlKTtcbiAgICAgICAgY29uc3QgbmV3SWQgICA9IGFkZGl0aW9uYWw/Lm5ld0lkID8/IHRvSWQobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGNvbnN0IG1ldGhvZCAgPSBhZGRpdGlvbmFsPy5wb3N0cHJvYyA/PyAnc2Vlayc7XG4gICAgICAgIGNvbnN0IGRmICAgICAgPSBhZGRpdGlvbmFsPy5kZiA/PyB0aGlzLl9kZkdvID8/IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICBjb25zdCBvbGREYXRhID0gYWRkaXRpb25hbD8ucHJldlN0YXRlID8/IHRoaXMuc3RhdGU7XG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSBhZGRpdGlvbmFsPy5uZXh0U3RhdGUgPz8gdGhpcy5kaXJlY3QobmV3SWQpLnN0YXRlID8/IGNyZWF0ZURhdGEobmV3SWQsIG5ld1N0YXRlKTtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZVxuICAgICAgICAgICAgZGYuY2F0Y2gobm9vcCk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgnY2hhbmdpbmcnLCBuZXdEYXRhLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdEYXRhKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgncmVmcmVzaCcsIG5ld0RhdGEsIG9sZERhdGEpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIGhpc3Rvcnkg44KS5YWD44Gr5oi744GZXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJvbGxiYWNrSGlzdG9yeShtZXRob2QsIG5ld0lkKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlIGFzIEVycm9yKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIHtAbGluayBjcmVhdGVTZXNzaW9uSGlzdG9yeX0oKSBvcHRpb25zLlxuICogQGphIHtAbGluayBjcmVhdGVTZXNzaW9uSGlzdG9yeX0oKSDjgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zIHtcbiAgICBjb250ZXh0PzogV2luZG93O1xuICAgIG1vZGU/OiAnaGFzaCcgfCAnaGlzdG9yeSc7XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc30gb2JqZWN0XG4gKiAgLSBgamFgIHtAbGluayBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZD86IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zKTogSUhpc3Rvcnk8VD4ge1xuICAgIGNvbnN0IHsgY29udGV4dCwgbW9kZSB9ID0gT2JqZWN0LmFzc2lnbih7IG1vZGU6ICdoYXNoJyB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFNlc3Npb25IaXN0b3J5KGNvbnRleHQgPz8gd2luZG93LCBtb2RlLCBpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBicm93c2VyIHNlc3Npb24gaGlzdG9yeS5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7IHR5cGUgUGxhaW5PYmplY3QsIHBvc3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBTaWxlbmNlYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHR5cGUge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeVN0YWNrLFxuICAgIGNyZWF0ZURhdGEsXG4gICAgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkLFxuICAgIGFzc2lnblN0YXRlRWxlbWVudCxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdNZW1vcnlIaXN0b3J5I3NpZ25hdHVyZScpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBjbGFzcy5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgq/jg6njgrlcbiAqL1xuY2xhc3MgTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8SGlzdG9yeUV2ZW50PFQ+PiBpbXBsZW1lbnRzIElIaXN0b3J5PFQ+IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoaWQ6IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIHZvaWQgdGhpcy5yZXBsYWNlKGlkLCBzdGF0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGlzcG9zZSBvYmplY3RcbiAgICAgKi9cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMub2ZmKCk7XG4gICAgICAgIGRlbGV0ZSAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0IGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyByZXNldChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKE51bWJlci5pc05hTih0aGlzLmluZGV4KSB8fCB0aGlzLl9zdGFjay5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBzaWxlbnQgfSA9IG9wdGlvbnMgPz8ge307XG5cbiAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSB0aGlzLnN0YXRlO1xuICAgICAgICB0aGlzLnNldEluZGV4KDApO1xuICAgICAgICBhd2FpdCB0aGlzLmNsZWFyRm9yd2FyZCgpO1xuICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuc3RhdGU7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkKCdNZW1vcnlIaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKCdub29wJywgZGYsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUhpc3Rvcnk8VD5cblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmlkO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBzdGFjaygpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hcnJheTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzRmlyc3Q7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0xhc3Q7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXQoaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gaWYgZ2l2ZW4gMCwganVzdCByZWxvYWQuXG4gICAgICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IGRlbHRhID8gdGhpcy5zdGF0ZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEgPz8gMCk7XG4gICAgICAgICAgICBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZSgnc2VlaycsIGRmLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkgYnkgc3RhY2sgSUQuICovXG4gICAgdHJhdmVyc2VUbyhpZDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBkaXJlY3Rpb24sIGRlbHRhIH0gPSB0aGlzLmRpcmVjdChpZCk7XG4gICAgICAgIGlmICgnbWlzc2luZycgPT09IGRpcmVjdGlvbikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGB0cmF2ZXJzZVRvKCR7aWR9KSwgcmV0dXJuZWQgbWlzc2luZy5gKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5pbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oZGVsdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciBuZXcgaGlzdG9yeS5cbiAgICAgKiBAamEg5paw6KaP5bGl5q2044Gu55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVzaChpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3B1c2gnLCBpZCwgc3RhdGUsIG9wdGlvbnMgPz8ge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGN1cnJlbnQgaGlzdG9yeS5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu572u5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcmVwbGFjZShpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3JlcGxhY2UnLCBpZCwgc3RhdGUsIG9wdGlvbnMgPz8ge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBmb3J3YXJkIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgojjgorliY3mlrnjga7lsaXmrbTjgpLliYrpmaRcbiAgICAgKi9cbiAgICBhc3luYyBjbGVhckZvcndhcmQoKTogUHJvbWlzZTx2b2lkPiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3JlcXVpcmUtYXdhaXRcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gZGVzdGluYXRpb24gc3RhY2sgaW5mb3JtYXRpb24gYnkgYHN0YXJ0YCBhbmQgYGVuZGAgSUQuXG4gICAgICogQGphIOi1t+eCuSwg57WC54K544GuIElEIOOBi+OCiee1gueCueOBruOCueOCv+ODg+OCr+aDheWgseOCkui/lOWNtFxuICAgICAqL1xuICAgIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmRpcmVjdCh0b0lkLCBmcm9tSWQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgc2V0IGluZGV4ICovXG4gICAgcHJpdmF0ZSBzZXRJbmRleChpZHg6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5pbmRleCA9IGlkeDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgZXZlbnQgJiB3YWl0IHByb2Nlc3MgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyaWdnZXJFdmVudEFuZFdhaXQoXG4gICAgICAgIGV2ZW50OiAncmVmcmVzaCcgfCAnY2hhbmdpbmcnLFxuICAgICAgICBhcmcxOiBIaXN0b3J5U3RhdGU8VD4sXG4gICAgICAgIGFyZzI6IEhpc3RvcnlTdGF0ZTxUPiB8IHVuZGVmaW5lZCB8ICgocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCksXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKGV2ZW50LCBhcmcxLCBhcmcyIGFzIGFueSwgcHJvbWlzZXMpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgY29uc3QgbmV3U3RhdGUgPSBjcmVhdGVEYXRhKGlkLCBzdGF0ZSk7XG4gICAgICAgIGlmICgncmVwbGFjZScgPT09IG1ldGhvZCAmJiAwID09PSB0aGlzLmluZGV4KSB7XG4gICAgICAgICAgICBuZXdTdGF0ZVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzc2lnblN0YXRlRWxlbWVudChuZXdTdGF0ZSwgdGhpcy5fc3RhY2sgYXMgSGlzdG9yeVN0YWNrKTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoY2FuY2VsKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUobWV0aG9kLCBkZiwgbmV3U3RhdGUsIHRoaXMuc3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld1N0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY2hhbmdlIHN0YXRlIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIGFzeW5jIG9uQ2hhbmdlU3RhdGUobWV0aG9kOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2VlaycsIGRmOiBEZWZlcnJlZCwgbmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxUPiwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxUPiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGNhbmNlbCwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ2NoYW5naW5nJywgbmV3U3RhdGUsIGNhbmNlbCk7XG5cbiAgICAgICAgICAgIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0b2tlbi5yZWFzb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld1N0YXRlKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgncmVmcmVzaCcsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG5cbiAgICAgICAgICAgIGRmLnJlc29sdmUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdlcnJvcicsIGUgYXMgRXJyb3IpO1xuICAgICAgICAgICAgZGYucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBUKTogSUhpc3Rvcnk8VD4ge1xuICAgIHJldHVybiBuZXcgTWVtb3J5SGlzdG9yeShpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBtZW1vcnkgaGlzdG9yeS5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYE1lbW9yeUhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBNZW1vcnlIaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc2V0TWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikucmVzZXQob3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIERpc3Bvc2UgbWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPik6IHZvaWQge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIChpbnN0YW5jZSBhcyBNZW1vcnlIaXN0b3J5PFQ+KS5kaXNwb3NlKCk7XG59XG4iLCJpbXBvcnQgeyBwYXRoMnJlZ2V4cCB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwJztcbmltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIENsYXNzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBzbGVlcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICB0b1F1ZXJ5U3RyaW5ncyxcbiAgICBwYXJzZVVybFF1ZXJ5LFxuICAgIGNvbnZlcnRVcmxQYXJhbVR5cGUsXG59IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgdG9VcmwsXG4gICAgbG9hZFRlbXBsYXRlU291cmNlLFxuICAgIHRvVGVtcGxhdGVFbGVtZW50LFxufSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgSGlzdG9yeURpcmVjdGlvbixcbiAgICB0eXBlIElIaXN0b3J5LFxuICAgIGNyZWF0ZVNlc3Npb25IaXN0b3J5LFxuICAgIGNyZWF0ZU1lbW9yeUhpc3RvcnksXG59IGZyb20gJy4uL2hpc3RvcnknO1xuaW1wb3J0IHsgbm9ybWFsaXplSWQgfSBmcm9tICcuLi9oaXN0b3J5L2ludGVybmFsJztcbmltcG9ydCB0eXBlIHtcbiAgICBQYWdlVHJhbnNpdGlvblBhcmFtcyxcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgUGFnZSxcbiAgICBSb3V0ZVBhdGhQYXJhbXMsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgfSBmcm9tICcuL2FzeW5jLXByb2Nlc3MnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDc3NOYW1lIHtcbiAgICBERUZBVUxUX1BSRUZJWCAgICAgICA9ICdjZHAnLFxuICAgIFRSQU5TSVRJT05fRElSRUNUSU9OID0gJ3RyYW5zaXRpb24tZGlyZWN0aW9uJyxcbiAgICBUUkFOU0lUSU9OX1JVTk5JTkcgICA9ICd0cmFuc2l0aW9uLXJ1bm5pbmcnLFxuICAgIFBBR0VfQ1VSUkVOVCAgICAgICAgID0gJ3BhZ2UtY3VycmVudCcsXG4gICAgUEFHRV9QUkVWSU9VUyAgICAgICAgPSAncGFnZS1wcmV2aW91cycsXG4gICAgSElEREVOICAgICAgICAgICAgICAgPSAnaGlkZGVuJyxcbiAgICBFTlRFUl9GUk9NX0NMQVNTICAgICA9ICdlbnRlci1mcm9tJyxcbiAgICBFTlRFUl9BQ1RJVkVfQ0xBU1MgICA9ICdlbnRlci1hY3RpdmUnLFxuICAgIEVOVEVSX1RPX0NMQVNTICAgICAgID0gJ2VudGVyLXRvJyxcbiAgICBMRUFWRV9GUk9NX0NMQVNTICAgICA9ICdsZWF2ZS1mcm9tJyxcbiAgICBMRUFWRV9BQ1RJVkVfQ0xBU1MgICA9ICdsZWF2ZS1hY3RpdmUnLFxuICAgIExFQVZFX1RPX0NMQVNTICAgICAgID0gJ2xlYXZlLXRvJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gRG9tQ2FjaGUge1xuICAgIERBVEFfTkFNRSAgICAgICAgICAgPSAnZG9tLWNhY2hlJyxcbiAgICBDQUNIRV9MRVZFTF9NRU1PUlkgID0gJ21lbW9yeScsXG4gICAgQ0FDSEVfTEVWRUxfQ09OTkVDVCA9ICdjb25uZWN0Jyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gTGlua0RhdGEge1xuICAgIFRSQU5TSVRJT04gICAgICAgPSAndHJhbnNpdGlvbicsXG4gICAgTkFWSUFHQVRFX01FVEhPRCA9ICduYXZpZ2F0ZS1tZXRob2QnLFxuICAgIFBSRUZFVENIICAgICAgICAgPSAncHJlZmV0Y2gnLFxuICAgIFBSRVZFTlRfUk9VVEVSICAgPSAncHJldmVudC1yb3V0ZXInLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDb25zdCB7XG4gICAgV0FJVF9UUkFOU0lUSU9OX01BUkdJTiA9IDEwMCwgLy8gbXNlY1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBQYWdlRXZlbnQgPSAnaW5pdCcgfCAnbW91bnRlZCcgfCAnY2xvbmVkJyB8ICdiZWZvcmUtZW50ZXInIHwgJ2FmdGVyLWVudGVyJyB8ICdiZWZvcmUtbGVhdmUnIHwgJ2FmdGVyLWxlYXZlJyB8ICd1bm1vdW50ZWQnIHwgJ3JlbW92ZWQnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQgZXh0ZW5kcyBSb3V0ZUNoYW5nZUluZm8ge1xuICAgIHJlYWRvbmx5IGFzeW5jUHJvY2VzczogUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQ7XG4gICAgc2FtZVBhZ2VJbnN0YW5jZT86IGJvb2xlYW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGZsYXQgUm91dGVQYXJhbWV0ZXJzICovXG5leHBvcnQgdHlwZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzID0gT21pdDxSb3V0ZVBhcmFtZXRlcnMsICdyb3V0ZXMnPiAmIHtcbiAgICAvKiogcmVnZXhwIGZyb20gcGF0aCAqL1xuICAgIHJlZ2V4cDogUmVnRXhwO1xuICAgIC8qKiBrZXlzIG9mIHBhcmFtcyAqL1xuICAgIHBhcmFtS2V5czogc3RyaW5nW107XG4gICAgLyoqIERPTSB0ZW1wbGF0ZSBpbnN0YW5jZSB3aXRoIFBhZ2UgZWxlbWVudCAqL1xuICAgICR0ZW1wbGF0ZT86IERPTTtcbiAgICAvKiogcm91dGVyIHBhZ2UgaW5zdGFuY2UgZnJvbSBgY29tcG9uZW50YCBwcm9wZXJ0eSAqL1xuICAgIHBhZ2U/OiBQYWdlO1xuICAgIC8qKiBsYXRlc3Qgcm91dGUgY29udGV4dCBjYWNoZSAqL1xuICAgICdAcm91dGUnPzogUm91dGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ID0gUm91dGVTdWJGbG93UGFyYW1zICYgUmVxdWlyZWQ8UGFnZVRyYW5zaXRpb25QYXJhbXM+ICYge1xuICAgIG9yaWdpbjogc3RyaW5nO1xufTtcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHQgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dCA9IFdyaXRhYmxlPFJvdXRlPiAmIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMgJiB7XG4gICAgJ0BwYXJhbXMnOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzO1xuICAgIHN1YmZsb3c/OiBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0O1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgYnVpbHQtaW4gY3NzICovXG5leHBvcnQgY29uc3QgYXBwbHlCdWlsdEluQ3NzID0gKGNvbnRleHQ6IHR5cGVvZiBnbG9iYWxUaGlzLCBwcmVmaXg6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHN0eWxlVGV4dCA9IGBcbiAgICAuJHtwcmVmaXh9LXRyYW5zaXRpb24tcnVubmluZyB7XG4gICAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIH1cbiAgICAuJHtwcmVmaXh9LWhpZGRlbiB7XG4gICAgICAgIHZpc2liaWxpdHk6IGhpZGRlbjtcbiAgICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgfVxuICAgIGA7XG4gICAgY29uc3Qgc2hlZXQgPSBuZXcgY29udGV4dC5DU1NTdHlsZVNoZWV0KCk7XG4gICAgc2hlZXQucmVwbGFjZVN5bmMoc3R5bGVUZXh0KTtcblxuICAgIGNvbnN0IHsgZG9jdW1lbnQ6IHJvb3QgfSA9IGNvbnRleHQ7XG4gICAgY29uc3QgZGVmYXVsdHMgPSByb290LmFkb3B0ZWRTdHlsZVNoZWV0cztcbiAgICByb290LmFkb3B0ZWRTdHlsZVNoZWV0cyA9IFsuLi5kZWZhdWx0cywgc2hlZXRdO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgUm91dGVDb250ZXh0UGFyYW1ldGVycyB0byBSb3V0ZUNvbnRleHQgKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlQ29udGV4dCA9ICh1cmw6IHN0cmluZywgcm91dGVyOiBSb3V0ZXIsIHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycywgbmF2T3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBSb3V0ZUNvbnRleHQgPT4ge1xuICAgIC8vIG9taXQgdW5jbG9uYWJsZSBwcm9wc1xuICAgIGNvbnN0IGZyb21OYXZpZ2F0ZSA9ICEhbmF2T3B0aW9ucztcbiAgICBjb25zdCBlbnN1cmVDbG9uZSA9IChjdHg6IHVua25vd24pOiBSb3V0ZUNvbnRleHQgPT4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdHgpKTtcbiAgICBjb25zdCBjb250ZXh0ID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAge1xuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgcm91dGVyOiBmcm9tTmF2aWdhdGUgPyB1bmRlZmluZWQgOiByb3V0ZXIsXG4gICAgICAgIH0sXG4gICAgICAgIG5hdk9wdGlvbnMsXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIGZvcmNlIG92ZXJyaWRlXG4gICAgICAgICAgICBxdWVyeToge30sXG4gICAgICAgICAgICBwYXJhbXM6IHt9LFxuICAgICAgICAgICAgcGF0aDogcGFyYW1zLnBhdGgsXG4gICAgICAgICAgICAnQHBhcmFtcyc6IGZyb21OYXZpZ2F0ZSA/IHVuZGVmaW5lZCA6IHBhcmFtcyxcbiAgICAgICAgfSxcbiAgICApO1xuICAgIHJldHVybiBmcm9tTmF2aWdhdGUgPyBlbnN1cmVDbG9uZShjb250ZXh0KSA6IGNvbnRleHQgYXMgUm91dGVDb250ZXh0O1xufTtcblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IGNvbnRleHQgcGFyYW1zICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzID0gKHJvdXRlczogUm91dGVQYXJhbWV0ZXJzIHwgUm91dGVQYXJhbWV0ZXJzW10gfCB1bmRlZmluZWQpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10gPT4ge1xuICAgIGNvbnN0IGZsYXR0ZW4gPSAocGFyZW50UGF0aDogc3RyaW5nLCBuZXN0ZWQ6IFJvdXRlUGFyYW1ldGVyc1tdKTogUm91dGVQYXJhbWV0ZXJzW10gPT4ge1xuICAgICAgICBjb25zdCByZXR2YWw6IFJvdXRlUGFyYW1ldGVyc1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgbiBvZiBuZXN0ZWQpIHtcbiAgICAgICAgICAgIG4ucGF0aCA9IGAke3BhcmVudFBhdGgucmVwbGFjZSgvXFwvJC8sICcnKX0vJHtub3JtYWxpemVJZChuLnBhdGgpfWA7XG4gICAgICAgICAgICByZXR2YWwucHVzaChuKTtcbiAgICAgICAgICAgIGlmIChuLnJvdXRlcykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKC4uLmZsYXR0ZW4obi5wYXRoLCBuLnJvdXRlcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfTtcblxuICAgIHJldHVybiBmbGF0dGVuKCcnLCBpc0FycmF5KHJvdXRlcykgPyByb3V0ZXMgOiByb3V0ZXMgPyBbcm91dGVzXSA6IFtdKVxuICAgICAgICAubWFwKChzZWVkOiBSb3V0ZVBhcmFtZXRlcnMpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyByZWdleHAsIGtleXMgfSA9IHBhdGgycmVnZXhwLnBhdGhUb1JlZ2V4cChzZWVkLnBhdGgpO1xuICAgICAgICAgICAgICAgIChzZWVkIGFzIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpLnJlZ2V4cCA9IHJlZ2V4cDtcbiAgICAgICAgICAgICAgICAoc2VlZCBhcyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKS5wYXJhbUtleXMgPSBrZXlzLmZpbHRlcihrID0+IGlzU3RyaW5nKGsubmFtZSkpLm1hcChrID0+IGsubmFtZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWVkIGFzIFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7XG4gICAgICAgIH0pO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgcHJlcGFyZSBJSGlzdG9yeSBvYmplY3QgKi9cbmV4cG9ydCBjb25zdCBwcmVwYXJlSGlzdG9yeSA9IChzZWVkOiAnaGFzaCcgfCAnaGlzdG9yeScgfCAnbWVtb3J5JyB8IElIaXN0b3J5ID0gJ2hhc2gnLCBpbml0aWFsUGF0aD86IHN0cmluZywgY29udGV4dD86IFdpbmRvdyk6IElIaXN0b3J5PFJvdXRlQ29udGV4dD4gPT4ge1xuICAgIHJldHVybiAoaXNTdHJpbmcoc2VlZClcbiAgICAgICAgPyAnbWVtb3J5JyA9PT0gc2VlZCA/IGNyZWF0ZU1lbW9yeUhpc3RvcnkoaW5pdGlhbFBhdGggPz8gJycpIDogY3JlYXRlU2Vzc2lvbkhpc3RvcnkoaW5pdGlhbFBhdGgsIHVuZGVmaW5lZCwgeyBtb2RlOiBzZWVkLCBjb250ZXh0IH0pXG4gICAgICAgIDogc2VlZFxuICAgICkgYXMgSUhpc3Rvcnk8Um91dGVDb250ZXh0Pjtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVuc3VyZVBhdGhQYXJhbXMgPSAocGFyYW1zOiBSb3V0ZVBhdGhQYXJhbXMgfCB1bmRlZmluZWQpOiBwYXRoMnJlZ2V4cC5QYXJhbURhdGEgPT4ge1xuICAgIGNvbnN0IHBhdGhQYXJhbXM6IHBhdGgycmVnZXhwLlBhcmFtRGF0YSA9IHt9O1xuICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMocGFyYW1zKSkge1xuICAgICAgICAgICAgcGF0aFBhcmFtc1trZXldID0gU3RyaW5nKHBhcmFtc1trZXldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGF0aFBhcmFtcztcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBidWlsZE5hdmlnYXRlVXJsID0gKHBhdGg6IHN0cmluZywgb3B0aW9uczogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IHN0cmluZyA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcGF0aCA9IGAvJHtub3JtYWxpemVJZChwYXRoKX1gO1xuICAgICAgICBjb25zdCB7IHF1ZXJ5LCBwYXJhbXMgfSA9IG9wdGlvbnM7XG4gICAgICAgIGxldCB1cmwgPSBwYXRoMnJlZ2V4cC5jb21waWxlKHBhdGgpKGVuc3VyZVBhdGhQYXJhbXMocGFyYW1zKSk7XG4gICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhxdWVyeSl9YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCxcbiAgICAgICAgICAgIGBDb25zdHJ1Y3Qgcm91dGUgZGVzdGluYXRpb24gZmFpbGVkLiBbcGF0aDogJHtwYXRofSwgZGV0YWlsOiAke1N0cmluZyhlcnJvcil9XWAsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgcGFyc2VVcmxQYXJhbXMgPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHsgdXJsIH0gPSByb3V0ZTtcbiAgICByb3V0ZS5xdWVyeSAgPSB1cmwuaW5jbHVkZXMoJz8nKSA/IHBhcnNlVXJsUXVlcnkobm9ybWFsaXplSWQodXJsKSkgOiB7fTtcbiAgICByb3V0ZS5wYXJhbXMgPSB7fTtcblxuICAgIGNvbnN0IHsgcmVnZXhwLCBwYXJhbUtleXMgfSA9IHJvdXRlWydAcGFyYW1zJ107XG4gICAgaWYgKHBhcmFtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gcmVnZXhwLmV4ZWModXJsKT8ubWFwKCh2YWx1ZSwgaW5kZXgpID0+IHsgcmV0dXJuIHsgdmFsdWUsIGtleTogcGFyYW1LZXlzW2luZGV4IC0gMV0gfTsgfSk7XG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zISkge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gcGFyYW0ua2V5ICYmIG51bGwgIT0gcGFyYW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShyb3V0ZS5wYXJhbXMsIHBhcmFtLmtleSwgY29udmVydFVybFBhcmFtVHlwZShwYXJhbS52YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMjaW5zdGFuY2UgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UgPSBhc3luYyAocm91dGU6IFJvdXRlQ29udGV4dCk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBwYXJhbXMgfSA9IHJvdXRlO1xuXG4gICAgaWYgKHBhcmFtcy5wYWdlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgeyBjb21wb25lbnQsIGNvbXBvbmVudE9wdGlvbnMgfSA9IHBhcmFtcztcbiAgICBpZiAoaXNGdW5jdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYXJhbXMucGFnZSA9IG5ldyAoY29tcG9uZW50IGFzIHVua25vd24gYXMgQ2xhc3MpKHJvdXRlLCBjb21wb25lbnRPcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICBwYXJhbXMucGFnZSA9IGF3YWl0IGNvbXBvbmVudChyb3V0ZSwgY29tcG9uZW50T3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGNvbXBvbmVudCkpIHtcbiAgICAgICAgcGFyYW1zLnBhZ2UgPSBPYmplY3QuYXNzaWduKHsgJ0Byb3V0ZSc6IHJvdXRlLCAnQG9wdGlvbnMnOiBjb21wb25lbnRPcHRpb25zIH0sIGNvbXBvbmVudCkgYXMgUGFnZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMucGFnZSA9IHsgJ0Byb3V0ZSc6IHJvdXRlLCAnQG9wdGlvbnMnOiBjb21wb25lbnRPcHRpb25zIH0gYXMgUGFnZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyMkdGVtcGxhdGUgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUgPSBhc3luYyAocGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgaWYgKHBhcmFtcy4kdGVtcGxhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGNyZWF0ZWRcbiAgICB9XG5cbiAgICBjb25zdCBlbnN1cmVJbnN0YW5jZSA9IChlbDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQpOiBET00gPT4ge1xuICAgICAgICByZXR1cm4gZWwgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gJChbLi4uZWwuY29udGVudC5jaGlsZHJlbl0pIGFzIERPTSA6ICQoZWwpO1xuICAgIH07XG5cbiAgICBjb25zdCB7IGNvbnRlbnQgfSA9IHBhcmFtcztcbiAgICBpZiAobnVsbCA9PSBjb250ZW50KSB7XG4gICAgICAgIC8vIG5vb3AgZWxlbWVudFxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gJDxIVE1MRWxlbWVudD4oKTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKChjb250ZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnc2VsZWN0b3InXSkpIHtcbiAgICAgICAgLy8gZnJvbSBhamF4XG4gICAgICAgIGNvbnN0IHsgc2VsZWN0b3IsIHVybCB9ID0gY29udGVudCBhcyB7IHNlbGVjdG9yOiBzdHJpbmc7IHVybD86IHN0cmluZzsgfTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0b1RlbXBsYXRlRWxlbWVudChhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsOiB1cmwgJiYgdG9VcmwodXJsKSB9KSk7XG4gICAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGB0ZW1wbGF0ZSBsb2FkIGZhaWxlZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yfSwgdXJsOiAke3VybH1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKHRlbXBsYXRlKTtcbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oY29udGVudCkpIHtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCQoYXdhaXQgY29udGVudCgpKVswXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCQoY29udGVudCBhcyBET01TZWxlY3RvcilbMF0pO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGRlY2lkZSB0cmFuc2l0aW9uIGRpcmVjdGlvbiAqL1xuZXhwb3J0IGNvbnN0IGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24gPSAoY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvKTogSGlzdG9yeURpcmVjdGlvbiA9PiB7XG4gICAgaWYgKGNoYW5nZUluZm8ucmV2ZXJzZSkge1xuICAgICAgICBzd2l0Y2ggKGNoYW5nZUluZm8uZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdiYWNrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2ZvcndhcmQnO1xuICAgICAgICAgICAgY2FzZSAnZm9yd2FyZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdiYWNrJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZUluZm8uZGlyZWN0aW9uO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBFZmZlY3RUeXBlID0gJ2FuaW1hdGlvbicgfCAndHJhbnNpdGlvbic7XG5cbi8qKiBAaW50ZXJuYWwgcmV0cmlldmUgZWZmZWN0IGR1cmF0aW9uIHByb3BlcnR5ICovXG5jb25zdCBnZXRFZmZlY3REdXJhdGlvblNlYyA9ICgkZWw6IERPTSwgZWZmZWN0OiBFZmZlY3RUeXBlKTogbnVtYmVyID0+IHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKCRlbFswXSlbYCR7ZWZmZWN0fUR1cmF0aW9uYF0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCB3YWl0Rm9yRWZmZWN0ID0gKCRlbDogRE9NLCBlZmZlY3Q6IEVmZmVjdFR5cGUsIGR1cmF0aW9uU2VjOiBudW1iZXIpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgbmV3IFByb21pc2UocmVzb2x2ZSA9PiAkZWxbYCR7ZWZmZWN0fUVuZGBdKHJlc29sdmUpKSxcbiAgICAgICAgc2xlZXAoZHVyYXRpb25TZWMgKiAxMDAwICsgQ29uc3QuV0FJVF9UUkFOU0lUSU9OX01BUkdJTiksXG4gICAgXSk7XG59O1xuXG4vKiogQGludGVybmFsIHRyYW5zaXRpb24gZXhlY3V0aW9uICovXG5leHBvcnQgY29uc3QgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uID0gYXN5bmMoJGVsOiBET00sIGZyb21DbGFzczogc3RyaW5nLCBhY3RpdmVDbGFzczogc3RyaW5nLCB0b0NsYXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAkZWwucmVtb3ZlQ2xhc3MoZnJvbUNsYXNzKTtcbiAgICAkZWwuYWRkQ2xhc3ModG9DbGFzcyk7XG5cbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgWydhbmltYXRpb24nLCAndHJhbnNpdGlvbiddIGFzIEVmZmVjdFR5cGVbXSkge1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IGdldEVmZmVjdER1cmF0aW9uU2VjKCRlbCwgZWZmZWN0KTtcbiAgICAgICAgZHVyYXRpb24gJiYgcHJvbWlzZXMucHVzaCh3YWl0Rm9yRWZmZWN0KCRlbCwgZWZmZWN0LCBkdXJhdGlvbikpO1xuICAgIH1cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3MoW2FjdGl2ZUNsYXNzLCB0b0NsYXNzXSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBSb3V0ZUF5bmNQcm9jZXNzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUF5bmNQcm9jZXNzIGltcGxlbWVudGF0aW9uICovXG5leHBvcnQgY2xhc3MgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgaW1wbGVtZW50cyBSb3V0ZUF5bmNQcm9jZXNzIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBSb3V0ZUF5bmNQcm9jZXNzXG5cbiAgICByZWdpc3Rlcihwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWwgbWV0aG9kczpcblxuICAgIGdldCBwcm9taXNlcygpOiByZWFkb25seSBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbWlzZXM7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGNvbXBsZXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9wcm9taXNlcyk7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLmxlbmd0aCA9IDA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIEFueUZ1bmN0aW9uLFxuICAgIHR5cGUgQWNjZXNzaWJsZSxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2FtZWxpemUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IE5hdGl2ZVByb21pc2UgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBpc1Jlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHRvUm91dGVyUGF0aCB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUgeyBJSGlzdG9yeSwgSGlzdG9yeVN0YXRlIH0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQge1xuICAgIHR5cGUgUGFnZVRyYW5zaXRpb25QYXJhbXMsXG4gICAgdHlwZSBSb3V0ZXJFdmVudCxcbiAgICB0eXBlIFBhZ2UsXG4gICAgdHlwZSBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgdHlwZSBSb3V0ZSxcbiAgICB0eXBlIFRyYW5zaXRpb25TZXR0aW5ncyxcbiAgICB0eXBlIE5hdmlnYXRpb25TZXR0aW5ncyxcbiAgICB0eXBlIFBhZ2VTdGFjayxcbiAgICB0eXBlIFB1c2hQYWdlU3RhY2tPcHRpb25zLFxuICAgIHR5cGUgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIHR5cGUgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICB0eXBlIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgdHlwZSBSb3V0ZXIsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBDc3NOYW1lLFxuICAgIERvbUNhY2hlLFxuICAgIExpbmtEYXRhLFxuICAgIHR5cGUgUGFnZUV2ZW50LFxuICAgIHR5cGUgUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQsXG4gICAgdHlwZSBSb3V0ZUNvbnRleHQsXG4gICAgdHlwZSBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgIGFwcGx5QnVpbHRJbkNzcyxcbiAgICB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgdG9Sb3V0ZUNvbnRleHQsXG4gICAgcHJlcGFyZUhpc3RvcnksXG4gICAgYnVpbGROYXZpZ2F0ZVVybCxcbiAgICBwYXJzZVVybFBhcmFtcyxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UsXG4gICAgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlLFxuICAgIGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24sXG4gICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFJvdXRlciBpbXBsaW1lbnQgY2xhc3MuXG4gKiBAamEgUm91dGVyIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSb3V0ZXJDb250ZXh0IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8Um91dGVyRXZlbnQ+IGltcGxlbWVudHMgUm91dGVyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXM6IFJlY29yZDxzdHJpbmcsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnM+ID0ge307XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kZWw6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yYWY6IEFueUZ1bmN0aW9uO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlDaGFuZ2luZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5UmVmcmVzaEhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlSZWZyZXNoO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Vycm9ySGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGFuZGxlRXJyb3I7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY3NzUHJlZml4OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdHJhbnNpdGlvblNldHRpbmdzOiBUcmFuc2l0aW9uU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBfbmF2aWdhdGlvblNldHRpbmdzOiBSZXF1aXJlZDxOYXZpZ2F0aW9uU2V0dGluZ3M+O1xuICAgIHByaXZhdGUgX2xhc3RSb3V0ZT86IFJvdXRlQ29udGV4dDtcbiAgICBwcml2YXRlIF9wcmV2Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfc3ViZmxvd1RyYW5zaXRpb25QYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcztcbiAgICBwcml2YXRlIF9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zOiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgcm91dGVzLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHdpbmRvdzogY29udGV4dCxcbiAgICAgICAgICAgIGhpc3RvcnksXG4gICAgICAgICAgICBpbml0aWFsUGF0aCxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxTdGFja3MsXG4gICAgICAgICAgICBjc3NQcmVmaXgsXG4gICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgbmF2aWdhdGlvbixcbiAgICAgICAgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICB0aGlzLl9yYWYgPSBjb250ZXh0Py5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPz8gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuICAgICAgICB0aGlzLl8kZWwgPSAkKHNlbGVjdG9yLCBlbCk7XG4gICAgICAgIGlmICghdGhpcy5fJGVsLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5ELCBgUm91dGVyIGVsZW1lbnQgbm90IGZvdW5kLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3IgYXMgc3RyaW5nfV1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2hpc3RvcnkgPSBwcmVwYXJlSGlzdG9yeShoaXN0b3J5LCBpbml0aWFsUGF0aCwgY29udGV4dCEpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyID0gdGhpcy5vbkhpc3RvcnlDaGFuZ2luZy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIgID0gdGhpcy5vbkhpc3RvcnlSZWZyZXNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2Vycm9ySGFuZGxlciAgICAgICAgICAgPSB0aGlzLm9uSGFuZGxlRXJyb3IuYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcblxuICAgICAgICAvLyBmb2xsb3cgYW5jaG9yXG4gICAgICAgIHRoaXMuXyRlbC5vbignY2xpY2snLCAnW2hyZWZdJywgdGhpcy5vbkFuY2hvckNsaWNrZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fY3NzUHJlZml4ID0gY3NzUHJlZml4ID8/IENzc05hbWUuREVGQVVMVF9QUkVGSVg7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBkZWZhdWx0OiAnbm9uZScsIHJlbG9hZDogJ25vbmUnIH0sIHRyYW5zaXRpb24pO1xuICAgICAgICB0aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbWV0aG9kOiAncHVzaCcgfSwgbmF2aWdhdGlvbik7XG5cbiAgICAgICAgLy8gYnVpbHQtaW4gY3NzXG4gICAgICAgIGFwcGx5QnVpbHRJbkNzcygoY29udGV4dCA/PyB3aW5kb3cpIGFzIHVua25vd24gYXMgdHlwZW9mIGdsb2JhbFRoaXMsIHRoaXMuX2Nzc1ByZWZpeCk7XG5cbiAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWdpc3Rlcihyb3V0ZXMhLCBmYWxzZSk7XG4gICAgICAgICAgICBpZiAoYWRkaXRpb25hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW9uYWxTdGFja3MsIHsgbm9OYXZpZ2F0ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXJ0ICYmIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9KSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBzdGF0ZSBpcyBpbiBzdWItZmxvdyAqL1xuICAgIGdldCBpc0luU3ViRmxvdygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuQmFjaztcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5Gb3J3YXJkO1xuICAgIH1cblxuICAgIC8qKiBSb3V0ZSByZWdpc3RyYXRpb24gKi9cbiAgICBhc3luYyByZWdpc3Rlcihyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdLCByZWZyZXNoID0gZmFsc2UpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3QgcHJlZmV0Y2hQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKHJvdXRlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tjb250ZXh0LnBhdGhdID0gY29udGV4dDtcbiAgICAgICAgICAgIGNvbnN0IHsgY29udGVudCwgcHJlZmV0Y2ggfSA9IGNvbnRleHQ7XG4gICAgICAgICAgICBjb250ZW50ICYmIHByZWZldGNoICYmIHByZWZldGNoUGFyYW1zLnB1c2goY29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBwcmVmZXRjaFBhcmFtcy5sZW5ndGggJiYgYXdhaXQgdGhpcy5zZXRQcmVmZXRjaENvbnRlbnRzKHByZWZldGNoUGFyYW1zKTtcbiAgICAgICAgcmVmcmVzaCAmJiBhd2FpdCB0aGlzLnJlZnJlc2goKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogTmF2aWdhdGUgdG8gbmV3IHBhZ2UuICovXG4gICAgYXN5bmMgbmF2aWdhdGUodG86IHN0cmluZywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXModG8pO1xuICAgICAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgYFJvdXRlIG5vdCBmb3VuZC4gW3RvOiAke3RvfV1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb3B0cyAgID0gT2JqZWN0LmFzc2lnbih7IGludGVudDogdW5kZWZpbmVkIH0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgdXJsICAgID0gYnVpbGROYXZpZ2F0ZVVybCh0bywgb3B0cyk7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSAgPSB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHNlZWQsIG9wdHMpO1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gb3B0cy5tZXRob2QgPz8gdGhpcy5fbmF2aWdhdGlvblNldHRpbmdzLm1ldGhvZDtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBleGVjIG5hdmlnYXRlXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeVttZXRob2RdKHVybCwgcm91dGUpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQWRkIHBhZ2Ugc3RhY2sgc3RhcnRpbmcgZnJvbSB0aGUgY3VycmVudCBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIHB1c2hQYWdlU3RhY2soc3RhY2s6IFBhZ2VTdGFjayB8IFBhZ2VTdGFja1tdLCBvcHRpb25zPzogUHVzaFBhZ2VTdGFja09wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgbm9OYXZpZ2F0ZSwgdHJhdmVyc2VUbyB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrcyA9IGlzQXJyYXkoc3RhY2spID8gc3RhY2sgOiBbc3RhY2tdO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVzID0gc3RhY2tzLmZpbHRlcihzID0+ICEhcy5yb3V0ZSkubWFwKHMgPT4gcy5yb3V0ZSEpO1xuXG4gICAgICAgICAgICAvLyBlbnNydWUgUm91dGVcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVnaXN0ZXIocm91dGVzLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIHB1c2ggaGlzdG9yeVxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBzdGFja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwYXRoOiB1cmwsIHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHBhZ2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSB0b1JvdXRlclBhdGgodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFtwYXRoOiAke3VybH1dYCwgcGFnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gc2lsZW50IHJlZ2lzdHJ5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gdG9Sb3V0ZUNvbnRleHQocGF0aCwgdGhpcywgcGFyYW1zLCB7IGludGVudDogdW5kZWZpbmVkIH0pO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS50cmFuc2l0aW9uID0gdHJhbnNpdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUucmV2ZXJzZSAgICA9IHJldmVyc2U7XG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5faGlzdG9yeS5wdXNoKHBhdGgsIHJvdXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRyYXZlcnNlVG8pIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS50cmF2ZXJzZVRvKHRvUm91dGVyUGF0aCh0cmF2ZXJzZVRvKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghbm9OYXZpZ2F0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHBhdGggc3RyaW5nLiAqL1xuICAgIGFzeW5jIHRyYXZlcnNlVG8oc3JjOiBzdHJpbmcpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS50cmF2ZXJzZVRvKHRvUm91dGVyUGF0aChzcmMpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEJlZ2luIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGJlZ2luU3ViRmxvdyh0bzogc3RyaW5nLCBzdWJmbG93PzogUm91dGVTdWJGbG93UGFyYW1zLCBvcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb246IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0ISxcbiAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbjogdGhpcy5jdXJyZW50Um91dGUudXJsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3ViZmxvdyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVTdWJGbG93UGFyYW1zKHBhcmFtcyk7XG4gICAgICAgICAgICAodGhpcy5jdXJyZW50Um91dGUgYXMgUm91dGVDb250ZXh0KS5zdWJmbG93ID0gcGFyYW1zO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5uYXZpZ2F0ZSh0bywgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ29tbWl0IHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNvbW1pdFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHN1YmZsb3cucGFyYW1zO1xuXG4gICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zaXRpb24sIHJldmVyc2UgfSwgcGFyYW1zKTtcbiAgICAgICAgY29uc3QgeyBhZGRpdGlvbmFsRGlzdGFuY2UsIGFkZGl0aW9uYWxTdGFja3MgfSA9IHN1YmZsb3cucGFyYW1zO1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHN1YmZsb3cuZGlzdGFuY2UgKyBhZGRpdGlvbmFsRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGFkZGl0aW9uYWxTdGFja3M/Lmxlbmd0aCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZSgoKSA9PiB0aGlzLmdvKC0xICogZGlzdGFuY2UpKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucHVzaFBhZ2VTdGFjayhhZGRpdGlvbmFsU3RhY2tzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ2FuY2VsIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNhbmNlbFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHN1YmZsb3cucGFyYW1zO1xuXG4gICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zaXRpb24sIHJldmVyc2UgfSwgcGFyYW1zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5nbygtMSAqIHN1YmZsb3cuZGlzdGFuY2UpO1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmNsZWFyRm9yd2FyZCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIHRyYW5zaXRpb24gc2V0dG5pZ3MuICovXG4gICAgdHJhbnNpdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogVHJhbnNpdGlvblNldHRpbmdzKTogVHJhbnNpdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLnRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncyB9O1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiBPYmplY3QuYXNzaWduKHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncywgbmV3U2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIFNldCBjb21tb24gbmF2aWdhdGlvbiBzZXR0bmlncy4gKi9cbiAgICBuYXZpZ2F0aW9uU2V0dGluZ3MobmV3U2V0dGluZ3M/OiBOYXZpZ2F0aW9uU2V0dGluZ3MpOiBOYXZpZ2F0aW9uU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4udGhpcy5fbmF2aWdhdGlvblNldHRpbmdzIH07XG4gICAgICAgIG5ld1NldHRpbmdzICYmIE9iamVjdC5hc3NpZ24odGhpcy5fbmF2aWdhdGlvblNldHRpbmdzLCBuZXdTZXR0aW5ncyk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogUmVmcmVzaCByb3V0ZXIgKHNwZWNpZnkgdXBkYXRlIGxldmVsKS4gKi9cbiAgICBhc3luYyByZWZyZXNoKGxldmVsID0gUm91dGVyUmVmcmVzaExldmVsLlJFTE9BRCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIGNhc2UgUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUjoge1xuICAgICAgICAgICAgICAgIHRoaXMucmVsZWFzZUNhY2hlQ29udGVudHModW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVuc3VwcG9ydGVkIGxldmVsOiAke2xldmVsfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiBzdWItZmxvd1xuXG4gICAgLyoqIEBpbnRlcm5hbCBldmFsdWF0ZSBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBldmFsdWF0ZVN1YkZsb3dQYXJhbXMoc3ViZmxvdzogUm91dGVTdWJGbG93UGFyYW1zKTogdm9pZCB7XG4gICAgICAgIGxldCBhZGRpdGlvbmFsRGlzdGFuY2UgPSAwO1xuXG4gICAgICAgIGlmIChzdWJmbG93LmJhc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKHN1YmZsb3cuYmFzZSk7XG4gICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IHsgaW5kZXgsIHN0YWNrIH0gPSB0aGlzLl9oaXN0b3J5O1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpID49IDA7IGktLSwgYWRkaXRpb25hbERpc3RhbmNlKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhY2tbaV1bJ0BpZCddID09PSBiYXNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCwgYEludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuIFt1cmw6ICR7c3ViZmxvdy5iYXNlfV1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1YmZsb3cuYmFzZSA9IHRoaXMuY3VycmVudFJvdXRlLnVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24oc3ViZmxvdywgeyBhZGRpdGlvbmFsRGlzdGFuY2UgfSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHN1Yi1mbG93IHBhcmFtZXRlcnMgKi9cbiAgICBwcml2YXRlIGZpbmRTdWJGbG93UGFyYW1zKGRldGFjaDogYm9vbGVhbik6IHsgZGlzdGFuY2U6IG51bWJlcjsgcGFyYW1zOiBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ICYgeyBhZGRpdGlvbmFsRGlzdGFuY2U6IG51bWJlcjsgfTsgfSB8IHZvaWQge1xuICAgICAgICBjb25zdCBzdGFjayA9IHRoaXMuX2hpc3Rvcnkuc3RhY2s7XG4gICAgICAgIGZvciAobGV0IGkgPSBzdGFjay5sZW5ndGggLSAxLCBkaXN0YW5jZSA9IDA7IGkgPj0gMDsgaS0tLCBkaXN0YW5jZSsrKSB7XG4gICAgICAgICAgICBpZiAoc3RhY2tbaV0uc3ViZmxvdykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN0YWNrW2ldLnN1YmZsb3cgYXMgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgZGV0YWNoICYmIGRlbGV0ZSBzdGFja1tpXS5zdWJmbG93O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRpc3RhbmNlLCBwYXJhbXMgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiB1dGlsc1xuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gYFJvdXRlckV2ZW50QXJnYCBtYWtlciAqL1xuICAgIHByaXZhdGUgbWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQge1xuICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXdTdGF0ZS5pbnRlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdTdGF0ZS5pbnRlbnQ7IC8vIG5hdmlnYXRlIOaZguOBq+aMh+WumuOBleOCjOOBnyBpbnRlbnQg44GvIG9uZSB0aW1lIOOBruOBv+acieWKueOBq+OBmeOCi1xuXG4gICAgICAgIGNvbnN0IGZyb20gPSAob2xkU3RhdGUgPz8gdGhpcy5fbGFzdFJvdXRlKSBhcyBBY2Nlc3NpYmxlPFJvdXRlQ29udGV4dCwgc3RyaW5nPiB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gdGhpcy5faGlzdG9yeS5kaXJlY3QobmV3U3RhdGVbJ0BpZCddLCBmcm9tPy5bJ0BpZCddKS5kaXJlY3Rpb247XG4gICAgICAgIGNvbnN0IGFzeW5jUHJvY2VzcyA9IG5ldyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCgpO1xuICAgICAgICBjb25zdCByZWxvYWQgPSBmcm9tID8gbmV3U3RhdGUudXJsID09PSBmcm9tLnVybCA6IHRydWU7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9XG4gICAgICAgICAgICA9IHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID8/IChyZWxvYWRcbiAgICAgICAgICAgICAgICA/IHsgdHJhbnNpdGlvbjogdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLnJlbG9hZCwgcmV2ZXJzZTogZmFsc2UgfVxuICAgICAgICAgICAgICAgIDogKCdiYWNrJyAhPT0gZGlyZWN0aW9uID8gbmV3U3RhdGUgOiBmcm9tIGFzIFJvdXRlQ29udGV4dCkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByb3V0ZXI6IHRoaXMsXG4gICAgICAgICAgICBmcm9tLFxuICAgICAgICAgICAgdG86IG5ld1N0YXRlLFxuICAgICAgICAgICAgZGlyZWN0aW9uLFxuICAgICAgICAgICAgYXN5bmNQcm9jZXNzLFxuICAgICAgICAgICAgcmVsb2FkLFxuICAgICAgICAgICAgdHJhbnNpdGlvbixcbiAgICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgICBpbnRlbnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHJvdXRlIGJ5IHVybCAqL1xuICAgIHByaXZhdGUgZmluZFJvdXRlQ29udGV4dFBhcmFtcyhwYXRoOiBzdHJpbmcpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAvJHtub3JtYWxpemVJZChwYXRoLnNwbGl0KCc/JylbMF0pfWA7XG4gICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCB7IHJlZ2V4cCB9ID0gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgaWYgKHJlZ2V4cC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIHBhZ2UgZXZlbnQgKi9cbiAgICBwcml2YXRlIHRyaWdnZXJQYWdlQ2FsbGJhY2soZXZlbnQ6IFBhZ2VFdmVudCwgdGFyZ2V0OiBQYWdlIHwgdW5kZWZpbmVkLCBhcmc6IFJvdXRlIHwgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCk6IHZvaWQge1xuICAgICAgICBjb25zdCBtZXRob2QgPSBjYW1lbGl6ZShgcGFnZS0ke2V2ZW50fWApO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbigodGFyZ2V0IGFzIEFjY2Vzc2libGU8UGFnZSwgQW55RnVuY3Rpb24+IHwgdW5kZWZpbmVkKT8uW21ldGhvZF0pKSB7XG4gICAgICAgICAgICBjb25zdCByZXR2YWwgPSAodGFyZ2V0IGFzIEFjY2Vzc2libGU8UGFnZSwgQW55RnVuY3Rpb24+KVttZXRob2RdKGFyZyk7XG4gICAgICAgICAgICBpZiAocmV0dmFsIGluc3RhbmNlb2YgTmF0aXZlUHJvbWlzZSAmJiAoYXJnIGFzIEFjY2Vzc2libGU8Um91dGU+KVsnYXN5bmNQcm9jZXNzJ10pIHtcbiAgICAgICAgICAgICAgICAoYXJnIGFzIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpLmFzeW5jUHJvY2Vzcy5yZWdpc3RlcihyZXR2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB3YWl0IGZyYW1lICovXG4gICAgcHJpdmF0ZSB3YWl0RnJhbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB3YWl0RnJhbWUoMSwgdGhpcy5fcmFmKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZW50cmFuY2VcblxuICAgIC8qKiBAaW50ZXJuYWwgY2hhbmdlIHBhZ2UgbWFpbiBwcm9jZWR1cmUgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZVBhZ2UobmV4dFJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgcHJldlJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSB0cnVlO1xuXG4gICAgICAgICAgICBwYXJzZVVybFBhcmFtcyhuZXh0Um91dGUpO1xuXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRSb3V0ZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBdID0gYXdhaXQgdGhpcy5wcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgLy8gdHJhbnNpdGlvbiBjb3JlXG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gYXdhaXQgdGhpcy50cmFuc2l0aW9uUGFnZShwYWdlTmV4dCwgJGVsTmV4dCwgcGFnZVByZXYsICRlbFByZXYsIGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZUNvbnRleHQoJGVsTmV4dCwgJGVsUHJldiwgY2hhbmdlSW5mbywgdHJhbnNpdGlvbik7XG5cbiAgICAgICAgICAgIC8vIOmBt+enu+WFiOOBjCBzdWJmbG93IOmWi+Wni+eCueOBp+OBguOCi+WgtOWQiCwgc3ViZmxvdyDop6PpmaRcbiAgICAgICAgICAgIGlmIChuZXh0Um91dGUudXJsID09PSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKGZhbHNlKT8ucGFyYW1zLm9yaWdpbikge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHJlZmV0Y2ggY29udGVudCDjga7jgrHjgqJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJlYXRQcmVmZXRjaENvbnRlbnRzKCk7XG5cbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBwcmVwYXJlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogUHJvbWlzZTxbUGFnZSwgRE9NLCBQYWdlLCBET01dPiB7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IGNoYW5nZUluZm8udG8gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGNoYW5nZUluZm8uZnJvbSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogbmV4dFBhcmFtcyB9ID0gbmV4dFJvdXRlO1xuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogcHJldlBhcmFtcyB9ID0gcHJldlJvdXRlID8/IHt9O1xuXG4gICAgICAgIC8vIHBhZ2UgaW5zdGFuY2VcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKG5leHRSb3V0ZSk7XG4gICAgICAgIC8vIHBhZ2UgJHRlbXBsYXRlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShuZXh0UGFyYW1zKTtcblxuICAgICAgICBjaGFuZ2VJbmZvLnNhbWVQYWdlSW5zdGFuY2UgPSBwcmV2UGFyYW1zPy5wYWdlICYmIHByZXZQYXJhbXMucGFnZSA9PT0gbmV4dFBhcmFtcy5wYWdlO1xuICAgICAgICBjb25zdCB7IHJlbG9hZCwgc2FtZVBhZ2VJbnN0YW5jZSwgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuXG4gICAgICAgIC8vIHBhZ2UgJGVsXG4gICAgICAgIGlmICghcmVsb2FkICYmIHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xvbmVDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgcHJldlJvdXRlISwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmICghbmV4dFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRlbE5leHQgPSAkKG5leHRSb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2VOZXh0ID0gbmV4dFBhcmFtcy5wYWdlITtcblxuICAgICAgICAvLyBtb3VudFxuICAgICAgICBpZiAoISRlbE5leHQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubW91bnRDb250ZW50KCRlbE5leHQsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0XG4gICAgICAgICAgICAocmVsb2FkICYmIHt9IHx8IChwcmV2UGFyYW1zPy5wYWdlID8/IHt9KSksIChyZWxvYWQgJiYgJChudWxsKSB8fCAkKHByZXZSb3V0ZT8uZWwpKSwgLy8gcHJldlxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsb25lQ29udGVudChcbiAgICAgICAgbmV4dFJvdXRlOiBSb3V0ZUNvbnRleHQsIG5leHRQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgICAgIHByZXZSb3V0ZTogUm91dGVDb250ZXh0LFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBuZXh0Um91dGUuZWwgPSBwcmV2Um91dGUuZWw7XG4gICAgICAgIHByZXZSb3V0ZS5lbCA9IG5leHRSb3V0ZS5lbD8uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAkKHByZXZSb3V0ZS5lbCkucmVtb3ZlQXR0cignaWQnKS5pbnNlcnRCZWZvcmUobmV4dFJvdXRlLmVsKTtcbiAgICAgICAgJChuZXh0Um91dGUuZWwpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuSElEREVOfWApXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWBdKVxuICAgICAgICA7XG4gICAgICAgIHRoaXMucHVibGlzaCgnY2xvbmVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnY2xvbmVkJywgbmV4dFBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgbG9hZENvbnRlbnQoXG4gICAgICAgIHJvdXRlOiBSb3V0ZUNvbnRleHQsIHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgbGV0IGZpcmVFdmVudHMgPSB0cnVlO1xuXG4gICAgICAgIGlmICghcm91dGUuZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsQ2FjaGUgPSB0aGlzLl9yb3V0ZXNbcm91dGUucGF0aF1bJ0Byb3V0ZSddPy5lbDtcbiAgICAgICAgICAgIGZpcmVFdmVudHMgPSAhZWxDYWNoZTtcbiAgICAgICAgICAgIGlmIChlbENhY2hlKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG9tLWNhY2hlIGNhc2VcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IGVsQ2FjaGU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy4kdGVtcGxhdGU/LmlzQ29ubmVjdGVkKSB7IC8vIHByZWZldGNoIGNhc2VcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCAgICAgICAgID0gcGFyYW1zLiR0ZW1wbGF0ZVswXTtcbiAgICAgICAgICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gcGFyYW1zLiR0ZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IHBhcmFtcy4kdGVtcGxhdGUhLmNsb25lKClbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1cGRhdGUgbWFzdGVyIGNhY2hlXG4gICAgICAgIGlmIChyb3V0ZSAhPT0gdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXSkge1xuICAgICAgICAgICAgdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXSA9IHJvdXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpcmVFdmVudHMpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbG9hZGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnaW5pdCcsIHBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgbW91bnRDb250ZW50KFxuICAgICAgICAkZWw6IERPTSwgcGFnZTogUGFnZSB8IHVuZGVmaW5lZCxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgJGVsLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLkhJRERFTn1gKTtcbiAgICAgICAgdGhpcy5fJGVsLmFwcGVuZCgkZWwpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ21vdW50ZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdtb3VudGVkJywgcGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVubW91bnRDb250ZW50KHJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgJGVsID0gJChyb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2UgPSByb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgIGlmICgkZWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICRlbC5kZXRhY2goKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcm91dGUpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCByb3V0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJvdXRlLmVsKSB7XG4gICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBjb3JlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmFuc2l0aW9uUGFnZShcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gY2hhbmdlSW5mby50cmFuc2l0aW9uID8/IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0O1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICdlbnRlci1mcm9tLWNsYXNzJzogY3VzdG9tRW50ZXJGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItYWN0aXZlLWNsYXNzJzogY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdlbnRlci10by1jbGFzcyc6IGN1c3RvbUVudGVyVG9DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1mcm9tLWNsYXNzJzogY3VzdG9tTGVhdmVGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtYWN0aXZlLWNsYXNzJzogY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS10by1jbGFzcyc6IGN1c3RvbUxlYXZlVG9DbGFzcyxcbiAgICAgICAgfSA9IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncztcblxuICAgICAgICAvLyBlbnRlci1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgZW50ZXJGcm9tQ2xhc3MgICA9IGN1c3RvbUVudGVyRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJBY3RpdmVDbGFzcyA9IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlclRvQ2xhc3MgICAgID0gY3VzdG9tRW50ZXJUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfVE9fQ0xBU1N9YDtcblxuICAgICAgICAvLyBsZWF2ZS1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgbGVhdmVGcm9tQ2xhc3MgICA9IGN1c3RvbUxlYXZlRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVBY3RpdmVDbGFzcyA9IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZVRvQ2xhc3MgICAgID0gY3VzdG9tTGVhdmVUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfVE9fQ0xBU1N9YDtcblxuICAgICAgICBhd2FpdCB0aGlzLmJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAvLyB0cmFuc2lzaW9uIGV4ZWN1dGlvblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsIGVudGVyVG9DbGFzcyksXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGxlYXZlVG9DbGFzcyksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5lbmRUcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRyYW5zaXRpb247XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIHByb2MgOiBiZWdpbiAqL1xuICAgIHByaXZhdGUgYXN5bmMgYmVnaW5UcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLCBlbnRlckZyb21DbGFzczogc3RyaW5nLCBlbnRlckFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sIGxlYXZlRnJvbUNsYXNzOiBzdHJpbmcsIGxlYXZlQWN0aXZlQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fJGVsLmFkZENsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICAkZWxOZXh0XG4gICAgICAgICAgICAuYWRkQ2xhc3MoW2VudGVyRnJvbUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuSElEREVOfWApXG4gICAgICAgICAgICAucmVmbG93KClcbiAgICAgICAgICAgIC5hZGRDbGFzcyhlbnRlckFjdGl2ZUNsYXNzKVxuICAgICAgICA7XG4gICAgICAgICRlbFByZXYuYWRkQ2xhc3MoW2xlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuXG4gICAgICAgIHRoaXMucHVibGlzaCgnYmVmb3JlLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdiZWZvcmUtbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBjaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogZW5kICovXG4gICAgcHJpdmF0ZSBhc3luYyBlbmRUcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAoJGVsTmV4dFswXSAhPT0gJGVsUHJldlswXSkgJiYgJGVsUHJldi5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5ISURERU59YCk7XG4gICAgICAgICRlbE5leHQucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG4gICAgICAgICRlbFByZXYucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG5cbiAgICAgICAgdGhpcy5fJGVsLnJlbW92ZUNsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2FmdGVyLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2FmdGVyLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2FmdGVyLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZmluYWxpemVcblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlIHBhZ2Ugc3RhdHVzIGFmdGVyIHRyYW5zaXRpb24gKi9cbiAgICBwcml2YXRlIHVwZGF0ZUNoYW5nZUNvbnRleHQoXG4gICAgICAgICRlbE5leHQ6IERPTSxcbiAgICAgICAgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICB0cmFuc2l0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZnJvbSwgcmVsb2FkLCBzYW1lUGFnZUluc3RhbmNlLCBkaXJlY3Rpb24sIHRvIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICBjb25zdCBwcmV2Um91dGUgPSBmcm9tIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gdG8gYXMgUm91dGVDb250ZXh0O1xuICAgICAgICBjb25zdCB1cmxDaGFuZ2VkID0gIXJlbG9hZDtcblxuXG4gICAgICAgIGlmICgkZWxOZXh0WzBdICE9PSAkZWxQcmV2WzBdKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgY2xhc3NcbiAgICAgICAgICAgICRlbFByZXZcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YClcbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApO1xuXG4gICAgICAgICAgICBpZiAodXJsQ2hhbmdlZCAmJiB0aGlzLl9wcmV2Um91dGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUuZWw/LmNsYXNzTGlzdC5yZW1vdmUoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWF0RG9tQ2FjaGVDb250ZW50cyhuZXh0Um91dGUsIHRoaXMuX3ByZXZSb3V0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXJsQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlID0gcHJldlJvdXRlO1xuICAgICAgICAgICAgaWYgKHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICAkZWxQcmV2LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xhc3RSb3V0ZSA9IHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgJ2ZvcndhcmQnID09PSBkaXJlY3Rpb24gJiYgdHJhbnNpdGlvbiAmJiAodGhpcy5fbGFzdFJvdXRlLnRyYW5zaXRpb24gPSB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHByZWZldGNoICYgZG9tIGNhY2hlXG5cbiAgICAvKiogQGludGVybmFsIHVuc2V0IGRvbSBjYWNoZWQgY29udGVudHMgKi9cbiAgICBwcml2YXRlIHJlbGVhc2VDYWNoZUNvbnRlbnRzKGVsOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRoaXMuX3JvdXRlc1trZXldWydAcm91dGUnXSBhcyBSb3V0ZUNvbnRleHQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAocm91dGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBlbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVubW91bnRDb250ZW50KHJvdXRlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJvdXRlLmVsID09PSBlbCkge1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRoaXMuX2hpc3Rvcnkuc3RhY2spIHtcbiAgICAgICAgICAgIGlmICgobnVsbCA9PSBlbCAmJiByb3V0ZS5lbCkgfHwgcm91dGUuZWwgPT09IGVsKSB7XG4gICAgICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGVzdHJ1Y3Rpb24gb2YgZG9tIGFjY29yZGluZyB0byBjb25kaXRpb24gKi9cbiAgICBwcml2YXRlIHRyZWF0RG9tQ2FjaGVDb250ZW50cyhuZXh0Um91dGU6IFJvdXRlQ29udGV4dCwgcHJldlJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgaWYgKHByZXZSb3V0ZS5lbCAmJiBwcmV2Um91dGUuZWwgIT09IHRoaXMuY3VycmVudFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKHByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICBjb25zdCBjYWNoZUx2ID0gJGVsLmRhdGEoRG9tQ2FjaGUuREFUQV9OQU1FKTtcbiAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9DT05ORUNUICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZSA9IHByZXZSb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgICAgICAgICAgJGVsLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpcmVFdmVudHMgPSBwcmV2Um91dGVbJ0BwYXJhbXMnXS5wYWdlICE9PSBuZXh0Um91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoRG9tQ2FjaGUuQ0FDSEVfTEVWRUxfTUVNT1JZICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVsZWFzZUNhY2hlQ29udGVudHMocHJldlJvdXRlLmVsKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlJvdXRlLmVsID0gbnVsbCE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubG9hZGVkJywgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNldCBkb20gcHJlZmV0Y2hlZCBjb250ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJlZmV0Y2hDb250ZW50cyhwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB0b1JvdXRlID0gKHBhcmFtOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCBlbDogSFRNTEVsZW1lbnQpOiBSb3V0ZUNvbnRleHQgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdG9Sb3V0ZUNvbnRleHQocGFyYW0ucHJlZmV0Y2ghLCB0aGlzLCBwYXJhbSk7XG4gICAgICAgICAgICBjdHguZWwgPSBlbDtcbiAgICAgICAgICAgIHJldHVybiBjdHg7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdG9Sb3V0ZUNoYW5nZUluZm8gPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByb3V0ZXI6IHRoaXMsXG4gICAgICAgICAgICAgICAgdG86IHJvdXRlLFxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogJ25vbmUnLFxuICAgICAgICAgICAgICAgIGFzeW5jUHJvY2VzczogbmV3IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0KCksXG4gICAgICAgICAgICAgICAgcmVsb2FkOiBmYWxzZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsUm91dGUgPSBwYXJhbVsnQHJvdXRlJ10/LmVsO1xuICAgICAgICAgICAgaWYgKCFlbFJvdXRlIHx8ICh0aGlzLmN1cnJlbnRSb3V0ZS5lbCAhPT0gZWxSb3V0ZSAmJiB0aGlzLl9sYXN0Um91dGU/LmVsICE9PSBlbFJvdXRlICYmIHRoaXMuX3ByZXZSb3V0ZT8uZWwgIT09IGVsUm91dGUpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlKHBhcmFtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHBhcmFtLiR0ZW1wbGF0ZSFbMF07XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRvUm91dGUocGFyYW0sIGVsKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRvUm91dGVDaGFuZ2VJbmZvKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhc3luY1Byb2Nlc3MgfSA9IGNoYW5nZUluZm87XG4gICAgICAgICAgICAgICAgICAgIC8vIGxvYWQgJiBpbml0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZENvbnRlbnQocm91dGUsIHBhcmFtLCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICAgICAgICAgICAgICAvLyBtb3VudFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm1vdW50Q29udGVudCgkKGVsKSwgcGFyYW0ucGFnZSwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGxvYWQgcHJlZmV0Y2ggZG9tIGNvbnRlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmVhdFByZWZldGNoQ29udGVudHMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIC8vIOmBt+enu+WFiOOBi+OCiSBwcmVmZXRjaCBjb250ZW50IOOCkuaknOWHulxuICAgICAgICBjb25zdCBwcmVmZXRjaFBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0gW107XG4gICAgICAgIGNvbnN0IHRhcmdldHMgPSB0aGlzLmN1cnJlbnRSb3V0ZS5lbD8ucXVlcnlTZWxlY3RvckFsbChgW2RhdGEtJHtMaW5rRGF0YS5QUkVGRVRDSH1dYCkgPz8gW107XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGFyZ2V0cykge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICBpZiAoZmFsc2UgIT09ICRlbC5kYXRhKExpbmtEYXRhLlBSRUZFVENIKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9ICRlbC5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHVybCEpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnByZWZldGNoID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICBwcmVmZXRjaFBhcmFtcy5wdXNoKHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJlZmV0Y2hDb250ZW50cyhwcmVmZXRjaFBhcmFtcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgY2hhbmdpbmdgIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGlzdG9yeUNoYW5naW5nKG5leHRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIGNhbmNlbDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQsIHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2luQ2hhbmdpbmdQYWdlKSB7XG4gICAgICAgICAgICBjYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0JVU1kpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRTdGF0ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCd3aWxsLWNoYW5nZScsIGNoYW5nZUluZm8sIGNhbmNlbCk7XG4gICAgICAgIHByb21pc2VzLnB1c2goLi4uY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MucHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGByZWZyZXNoYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlSZWZyZXNoKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8UGFydGlhbDxSb3V0ZUNvbnRleHQ+Piwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuc3VyZSA9IChzdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4pOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXRoICA9IGAvJHtzdGF0ZVsnQGlkJ119YDtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyhwYXRoKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFtwYXRoOiAke3BhdGh9XWAsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsID09IHN0YXRlWydAcGFyYW1zJ10pIHtcbiAgICAgICAgICAgICAgICAvLyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXIg44KSIGFzc2lnblxuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc3RhdGUsIHRvUm91dGVDb250ZXh0KHBhdGgsIHRoaXMsIHBhcmFtcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWQg44Gr57SQ44Gl44GP6KaB57Sg44GM44GZ44Gn44Gr5a2Y5Zyo44GZ44KL5aC05ZCI44Gv5Ymy44KK5b2T44GmXG4gICAgICAgICAgICBzdGF0ZS5lbCA/Pz0gdGhpcy5faGlzdG9yeS5kaXJlY3Qoc3RhdGVbJ0BpZCddKT8uc3RhdGU/LmVsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBzY2hlZHVsaW5nIGByZWZyZXNoYCBkb25lLlxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLmNoYW5nZVBhZ2UoZW5zdXJlKG5ld1N0YXRlKSwgb2xkU3RhdGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBlcnJvciBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhhbmRsZUVycm9yKGVycm9yOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaChcbiAgICAgICAgICAgICdlcnJvcicsXG4gICAgICAgICAgICBpc1Jlc3VsdChlcnJvcikgPyBlcnJvciA6IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJywgZXJyb3IpXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYW5jaG9yIGNsaWNrIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uQW5jaG9yQ2xpY2tlZChldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQgYXMgRWxlbWVudCkuY2xvc2VzdCgnW2hyZWZdJyk7XG4gICAgICAgIGlmICgkdGFyZ2V0LmRhdGEoTGlua0RhdGEuUFJFVkVOVF9ST1VURVIpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgPSAkdGFyZ2V0LmF0dHIoJ2hyZWYnKTtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9ICR0YXJnZXQuZGF0YShMaW5rRGF0YS5UUkFOU0lUSU9OKSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1ldGhvZCAgICAgPSAkdGFyZ2V0LmRhdGEoTGlua0RhdGEuTkFWSUFHQVRFX01FVEhPRCkgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBtZXRob2RPcHRzID0gKCdwdXNoJyA9PT0gbWV0aG9kIHx8ICdyZXBsYWNlJyA9PT0gbWV0aG9kID8geyBtZXRob2QgfSA6IHt9KSBhcyBOYXZpZ2F0aW9uU2V0dGluZ3M7XG5cbiAgICAgICAgaWYgKCcjJyA9PT0gdXJsKSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMuYmFjaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdm9pZCB0aGlzLm5hdmlnYXRlKHVybCEsIHsgdHJhbnNpdGlvbiwgLi4ubWV0aG9kT3B0cyB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIHtAbGluayBSb3V0ZXJ9IG9iamVjdC5cbiAqIEBqYSB7QGxpbmsgUm91dGVyfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnN9IG9iamVjdFxuICogIC0gYGphYCB7QGxpbmsgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb3V0ZXIoc2VsZWN0b3I6IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50Piwgb3B0aW9ucz86IFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMpOiBSb3V0ZXIge1xuICAgIHJldHVybiBuZXcgUm91dGVyQ29udGV4dChzZWxlY3RvciwgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIHN0YXJ0OiB0cnVlLFxuICAgIH0sIG9wdGlvbnMpKTtcbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwiRGVmZXJyZWQiLCJhdCIsInNvcnQiLCJub29wIiwid2ViUm9vdCIsIiRjZHAiLCJpc09iamVjdCIsIiRzaWduYXR1cmUiLCJFdmVudFB1Ymxpc2hlciIsInRvSWQiLCJ0b1VybCIsIkNhbmNlbFRva2VuIiwicG9zdCIsImlzQXJyYXkiLCJwYXRoMnJlZ2V4cCIsImlzU3RyaW5nIiwidG9RdWVyeVN0cmluZ3MiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJwYXJzZVVybFF1ZXJ5IiwiYXNzaWduVmFsdWUiLCJjb252ZXJ0VXJsUGFyYW1UeXBlIiwiaXNGdW5jdGlvbiIsIiQiLCJ0b1RlbXBsYXRlRWxlbWVudCIsImxvYWRUZW1wbGF0ZVNvdXJjZSIsInNsZWVwIiwiY2FtZWxpemUiLCJOYXRpdmVQcm9taXNlIiwid2FpdEZyYW1lIiwiaXNSZXN1bHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBQUEsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBO0lBQUEsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxvQkFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLG9CQUE2QztZQUM3QyxXQUFBLENBQUEsV0FBQSxDQUFBLG9DQUFBLENBQUEsR0FBNEMsV0FBQSxDQUFBLGtCQUFrQixDQUFBLEdBQUEsNkJBQXVCLEVBQUEsZ0NBQXlCLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBLEdBQUEsb0NBQUE7WUFDN0ksV0FBQSxDQUFBLFdBQUEsQ0FBQSwyQ0FBQSxDQUFBLEdBQTRDLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBQSxHQUFBLDZCQUF1QixFQUFBLGdDQUF5QixDQUFDLEVB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