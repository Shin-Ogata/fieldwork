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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaGlzdG9yeS9pbnRlcm5hbC50cyIsInV0aWxzLnRzIiwiaGlzdG9yeS9zZXNzaW9uLnRzIiwiaGlzdG9yeS9tZW1vcnkudHMiLCJyb3V0ZXIvaW50ZXJuYWwudHMiLCJyb3V0ZXIvYXN5bmMtcHJvY2Vzcy50cyIsInJvdXRlci9jb3JlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgUk9VVEVSID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMTUsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBNVkNfUk9VVEVSX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMSwgJ3JvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAyLCAnUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDMsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfSU5WQUxJRF9TVUJGTE9XX0JBU0VfVVJMID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgNCwgJ0ludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfQlVTWSAgICAgICAgICAgICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgNSwgJ0luIGNoYW5naW5nIHBhZ2UgcHJvY2VzcyBub3cuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTCA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgYXQsXG4gICAgc29ydCxcbiAgICBub29wLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHR5cGUgeyBIaXN0b3J5U3RhdGUsIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBub3JtYWx6aWUgaWQgc3RyaW5nICovXG5leHBvcnQgY29uc3Qgbm9ybWFsaXplSWQgPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIC8vIHJlbW92ZSBoZWFkIG9mIFwiI1wiLCBcIi9cIiwgXCIjL1wiIGFuZCB0YWlsIG9mIFwiL1wiXG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9eKCNcXC8pfF5bIy9dfFxccyskLywgJycpLnJlcGxhY2UoL15cXHMrJHwoXFwvJCkvLCAnJyk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSBzdGFjayAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZURhdGEgPSA8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBIaXN0b3J5U3RhdGU8VD4gPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHsgJ0BpZCc6IG5vcm1hbGl6ZUlkKGlkKSB9LCBzdGF0ZSk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSB1bmNhbmNlbGxhYmxlIGRlZmVycmVkICovXG5leHBvcnQgY29uc3QgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkID0gKHdhcm46IHN0cmluZyk6IERlZmVycmVkID0+IHtcbiAgICBjb25zdCB1bmNhbmNlbGxhYmxlID0gbmV3IERlZmVycmVkKCkgYXMgV3JpdGFibGU8RGVmZXJyZWQ+O1xuICAgIHVuY2FuY2VsbGFibGUucmVqZWN0ID0gKCkgPT4ge1xuICAgICAgICBjb25zb2xlLndhcm4od2Fybik7XG4gICAgICAgIHVuY2FuY2VsbGFibGUucmVzb2x2ZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIHVuY2FuY2VsbGFibGU7XG59O1xuXG4vKiogQGludGVybmFsIGFzc2lnbiBzdGF0ZSBlbGVtZW50IGlmIGFscmVhZHkgZXhpc3RzICovXG5leHBvcnQgY29uc3QgYXNzaWduU3RhdGVFbGVtZW50ID0gKHN0YXRlOiBIaXN0b3J5U3RhdGUsIHN0YWNrOiBIaXN0b3J5U3RhY2spOiB2b2lkID0+IHtcbiAgICBjb25zdCBlbCA9IHN0YWNrLmRpcmVjdChzdGF0ZVsnQGlkJ10pPy5zdGF0ZT8uZWw7XG4gICAgKCFzdGF0ZS5lbCAmJiBlbCkgJiYgKHN0YXRlLmVsID0gZWwpO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsIHN0YWNrIG1hbmFnZW1lbnQgY29tbW9uIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhY2s8VCA9IFBsYWluT2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfc3RhY2s6IEhpc3RvcnlTdGF0ZTxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RhbmNlKDApO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlWydAaWQnXTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaWR4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBNYXRoLnRydW5jKGlkeCk7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgYXJyYXkoKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc2xpY2UoKTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgZmlyc3Qgb3Igbm90ICovXG4gICAgZ2V0IGlzRmlyc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAwID09PSB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgbGFzdCBvciBub3QgKi9cbiAgICBnZXQgaXNMYXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXggPT09IHRoaXMuX3N0YWNrLmxlbmd0aCAtIDE7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIHB1YmxpYyBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX3N0YWNrLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIGNsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHVibGljIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5zbGljZSgwLCB0aGlzLl9pbmRleCArIDEpO1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELiAqL1xuICAgIHB1YmxpYyBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgICAgICAgY29uc3QgeyBfaW5kZXg6IGJhc2UgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLl9zdGFja1xuICAgICAgICAgICAgLm1hcCgocywgaW5kZXgpID0+IHsgcmV0dXJuIHsgaW5kZXgsIGRpc3RhbmNlOiBNYXRoLmFicyhiYXNlIC0gaW5kZXgpLCAuLi5zIH07IH0pXG4gICAgICAgICAgICAuZmlsdGVyKHMgPT4gc1snQGlkJ10gPT09IGlkKVxuICAgICAgICA7XG4gICAgICAgIHNvcnQoY2FuZGlkYXRlcywgKGwsIHIpID0+IChsLmRpc3RhbmNlID4gci5kaXN0YW5jZSA/IDEgOiAtMSksIHRydWUpO1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXT8uaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgc3RhY2sgaW5mb3JtYXRpb24gYnkgdG8gSUQgYW5kIGZyb20gSUQuICovXG4gICAgcHVibGljIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgY29uc3QgdG9JbmRleCAgID0gdGhpcy5jbG9zZXN0KHRvSWQpO1xuICAgICAgICBjb25zdCBmcm9tSW5kZXggPSBudWxsID09IGZyb21JZCA/IHRoaXMuX2luZGV4IDogdGhpcy5jbG9zZXN0KGZyb21JZCk7XG4gICAgICAgIGlmIChudWxsID09IGZyb21JbmRleCB8fCBudWxsID09IHRvSW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbjogJ21pc3NpbmcnIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRvSW5kZXggLSBmcm9tSW5kZXg7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSAwID09PSBkZWx0YVxuICAgICAgICAgICAgICAgID8gJ25vbmUnXG4gICAgICAgICAgICAgICAgOiBkZWx0YSA8IDAgPyAnYmFjaycgOiAnZm9yd2FyZCc7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb24sIGRlbHRhLCBpbmRleDogdG9JbmRleCwgc3RhdGU6IHRoaXMuX3N0YWNrW3RvSW5kZXhdIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZ2V0IGFjdGl2ZSBkYXRhIGZyb20gY3VycmVudCBpbmRleCBvcmlnaW4gKi9cbiAgICBwdWJsaWMgZGlzdGFuY2UoZGVsdGE6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMuX2luZGV4ICsgZGVsdGE7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHt0aGlzLmxlbmd0aH0sIGdpdmVuOiAke3Bvc31dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXQocG9zKTtcbiAgICB9XG5cbiAgICAvKiogbm9vcCBzdGFjayAqL1xuICAgIHB1YmxpYyBub29wU3RhY2sgPSBub29wOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tZW1iZXItYWNjZXNzaWJpbGl0eVxuXG4gICAgLyoqIHB1c2ggc3RhY2sgKi9cbiAgICBwdWJsaWMgcHVzaFN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1srK3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHJlcGxhY2Ugc3RhY2sgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiBzZWVrIHN0YWNrICovXG4gICAgcHVibGljIHNlZWtTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmNsb3Nlc3QoZGF0YVsnQGlkJ10pO1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhpcy5wdXNoU3RhY2soZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGRpc3Bvc2Ugb2JqZWN0ICovXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTmFOO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHdlYlJvb3QgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyBVUkwgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4vaGlzdG9yeS9pbnRlcm5hbCc7XG5cbi8qKiByZS1leHBvcnQgKi9cbmV4cG9ydCAqIGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwJztcblxuLyoqXG4gKiBAZW4gR2VuZXJhdGVzIGFuIElEIHRvIGJlIHVzZWQgYnkgdGhlIHN0YWNrIGluc2lkZSB0aGUgcm91dGVyLlxuICogQGphIOODq+ODvOOCv+ODvOWGhemDqOOBriBzdGFjayDjgYzkvb/nlKjjgZnjgosgSUQg44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzcGVjaWZpZXMgd2hlcmUgdGhlIHBhdGggc3RyaW5nIGlzIGNyZWF0ZWQgZnJvbSBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKiAgLSBgamFgIHBhdGgg5paH5a2X5YiX44Gu5L2c5oiQ5YWD44KS5oyH5a6aIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVyU3RhY2tJZCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgaWYgKFVSTC5jYW5QYXJzZShzcmMpKSB7XG4gICAgICAgIGNvbnN0IHsgaGFzaCB9ID0gbmV3IFVSTChzcmMpO1xuICAgICAgICByZXR1cm4gaGFzaCA/IG5vcm1hbGl6ZUlkKGhhc2gpIDogbm9ybWFsaXplSWQoc3JjLnN1YnN0cmluZyh3ZWJSb290Lmxlbmd0aCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVJZChzcmMpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQGVuIEdldCB0aGUgbm9ybWFsaXplZCBgLzxpZD5gIHN0cmluZyBmcm9tIHRoZSB1cmwgLyBwYXRoLlxuICogQGphIHVybCAvIHBhdGgg44KS5oyH5a6a44GX44GmLCDmraPopo/ljJbjgZfjgZ8gYC88c3RhY2sgaWQ+YCDmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNwZWNpZmllcyB3aGVyZSB0aGUgcGF0aCBzdHJpbmcgaXMgY3JlYXRlZCBmcm9tIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqICAtIGBqYWAgcGF0aCDmloflrZfliJfjga7kvZzmiJDlhYPjgpLmjIflrpogW2V4OiBgbG9jYXRpb24uaGFzaGAsIGBsb2NhdGlvbi5ocmVmYCwgYCNwYXRoYCwgYHBhdGhgLCBgL3BhdGhgXVxuICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZXJQYXRoID0gKHNyYzogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gYC8ke3RvUm91dGVyU3RhY2tJZChzcmMpfWA7XG59O1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICBpc09iamVjdCxcbiAgICBub29wLFxuICAgICRjZHAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyB0b1VybCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHRvUm91dGVyU3RhY2tJZCBhcyB0b0lkIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi4vc3NyJztcbmltcG9ydCB0eXBlIHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGFjayxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBhc3NpZ25TdGF0ZUVsZW1lbnQsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGRpc3BhdGNoIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gKi9cbmludGVyZmFjZSBEaXNwYXRjaEluZm88VD4ge1xuICAgIGRmOiBEZWZlcnJlZDtcbiAgICBuZXdJZDogc3RyaW5nO1xuICAgIG9sZElkOiBzdHJpbmc7XG4gICAgcG9zdHByb2M6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJztcbiAgICBuZXh0U3RhdGU/OiBIaXN0b3J5U3RhdGU8VD47XG4gICAgcHJldlN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xufVxuXG4vKiogQGludGVybmFsIGNvbnN0YW50ICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBIQVNIX1BSRUZJWCA9ICcjLycsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzZXREaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4sIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFQgPT4ge1xuICAgIChzdGF0ZVskY2RwXSBhcyBEaXNwYXRjaEluZm88VD4pID0gYWRkaXRpb25hbDtcbiAgICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBwYXJzZURpc3BhdGNoSW5mbyA9IDxUPihzdGF0ZTogQWNjZXNzaWJsZTxUPik6IFtULCBEaXNwYXRjaEluZm88VD4/XSA9PiB7XG4gICAgaWYgKGlzT2JqZWN0KHN0YXRlKSAmJiBzdGF0ZVskY2RwXSkge1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsID0gc3RhdGVbJGNkcF07XG4gICAgICAgIGRlbGV0ZSBzdGF0ZVskY2RwXTtcbiAgICAgICAgcmV0dXJuIFtzdGF0ZSwgYWRkaXRpb25hbCBhcyBEaXNwYXRjaEluZm88VD5dO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbc3RhdGVdO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdTZXNzaW9uSGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX21vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb3BTdGF0ZUhhbmRsZXI6IChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcbiAgICBwcml2YXRlIF9kZkdvPzogRGVmZXJyZWQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdpbmRvd0NvbnR4dDogV2luZG93LCBtb2RlOiAnaGFzaCcgfCAnaGlzdG9yeScsIGlkPzogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbmRvd0NvbnR4dDtcbiAgICAgICAgdGhpcy5fbW9kZSA9IG1vZGU7XG5cbiAgICAgICAgdGhpcy5fcG9wU3RhdGVIYW5kbGVyID0gdGhpcy5vblBvcFN0YXRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCA/PyB0b0lkKHRoaXMuX3dpbmRvdy5sb2NhdGlvbi5ocmVmKSwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IHByZXZTdGF0ZSA9IHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ1Nlc3Npb25IaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiAnbm9vcCcsXG4gICAgICAgICAgICAgICAgcHJldlN0YXRlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKHRoaXMuc3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUhpc3Rvcnk8VD5cblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmlkO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBzdGFjaygpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hcnJheTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzRmlyc3Q7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0xhc3Q7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXQoaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIC8vIGlmIGFscmVhZHkgY2FsbGVkLCBubyByZWFjdGlvbi5cbiAgICAgICAgaWYgKHRoaXMuX2RmR28pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgZ2l2ZW4gMCwganVzdCByZWxvYWQuXG4gICAgICAgIGlmICghZGVsdGEpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgncmVmcmVzaCcsIHRoaXMuc3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fZGZHbztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJGb3J3YXJkSGlzdG9yeSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgpLmjIflrprjgZfjgabjgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFVSTCAqL1xuICAgIHByaXZhdGUgdG9VcmwoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAoJ2hhc2gnID09PSB0aGlzLl9tb2RlKSA/IGAke0NvbnN0LkhBU0hfUFJFRklYfSR7aWR9YCA6IHRvVXJsKGlkKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgZXZlbnQgJiB3YWl0IHByb2Nlc3MgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyaWdnZXJFdmVudEFuZFdhaXQoXG4gICAgICAgIGV2ZW50OiAncmVmcmVzaCcgfCAnY2hhbmdpbmcnLFxuICAgICAgICBhcmcxOiBIaXN0b3J5U3RhdGU8VD4sXG4gICAgICAgIGFyZzI6IEhpc3RvcnlTdGF0ZTxUPiB8IHVuZGVmaW5lZCB8ICgocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCksXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKGV2ZW50LCBhcmcxLCBhcmcyIGFzIGFueSwgcHJvbWlzZXMpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24sIGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcblxuICAgICAgICBjb25zdCBkYXRhID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZCA9IGRhdGFbJ0BpZCddO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgZGF0YVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgICAgIGhpc3RvcnlbYCR7bWV0aG9kfVN0YXRlYF0oZGF0YSwgJycsIHRoaXMudG9VcmwoaWQpKTtcbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQoZGF0YSwgdGhpcy5fc3RhY2sgYXMgSGlzdG9yeVN0YWNrKTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBuZXcgRGVmZXJyZWQoY2FuY2VsKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0b0lkKG9sZFVSTCksXG4gICAgICAgICAgICAgICAgcG9zdHByb2M6IG1ldGhvZCxcbiAgICAgICAgICAgICAgICBuZXh0U3RhdGU6IGRhdGEsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8oZGF0YSwgYWRkaXRpb25hbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGlzcGF0Y2ggYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRpc3BhdGNoQ2hhbmdlSW5mbyhuZXdTdGF0ZTogQWNjZXNzaWJsZTxUPiwgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gc2V0RGlzcGF0Y2hJbmZvKG5ld1N0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgdGhpcy5fd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFBvcFN0YXRlRXZlbnQoJ3BvcHN0YXRlJywgeyBzdGF0ZSB9KSk7XG4gICAgICAgIGF3YWl0IGFkZGl0aW9uYWwuZGY7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgcG9wc3RhdGUgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KSA9PiBQcm9taXNlPHZvaWQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICAgICAgY29uc3Qgd2FpdFBvcFN0YXRlID0gKCk6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgKGV2OiBQb3BTdGF0ZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGV2LnN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgZXhlY3V0b3Iod2FpdFBvcFN0YXRlKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHJvbGxiYWNrIGhpc3RvcnkgKi9cbiAgICBwcml2YXRlIGFzeW5jIHJvbGxiYWNrSGlzdG9yeShtZXRob2Q6IHN0cmluZywgbmV3SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlcGxhY2UnOlxuICAgICAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHRoaXMuc3RhdGUsICcnLCB0aGlzLnRvVXJsKHRoaXMuaWQpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3B1c2gnOlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgaGlzdG9yeS5nbygtMSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVsdGEgPSB0aGlzLmluZGV4IC0gdGhpcy5jbG9zZXN0KG5ld0lkKSE7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwICE9PSBkZWx0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbHRhICYmIGhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjbGVhciBmb3J3YXJkIHNlc3Npb24gaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHJpdmF0ZSBhc3luYyBjbGVhckZvcndhcmRIaXN0b3J5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc09yaWdpbiA9IChzdDogQWNjZXNzaWJsZTx1bmtub3duPik6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdD8uWydAb3JpZ2luJ10gYXMgYm9vbGVhbjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gaGlzdG9yeS5zdGF0ZTtcblxuICAgICAgICAgICAgLy8gYmFjayB0byBzZXNzaW9uIG9yaWdpblxuICAgICAgICAgICAgd2hpbGUgKCFpc09yaWdpbihzdGF0ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZW5zdXJlID0gKHNyYzogQWNjZXNzaWJsZTx1bmtub3duPik6IHVua25vd24gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN0eCA9IHsgLi4uc3JjIH07XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN0eFsncm91dGVyJ107XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN0eFsnQHBhcmFtcyddO1xuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN0eCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gZm9yd2FyZCBmcm9tIGluZGV4IDEgdG8gY3VycmVudCB2YWx1ZVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDEsIG4gPSB0aGlzLl9zdGFjay5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdCA9IHRoaXMuX3N0YWNrLmF0KGkpO1xuICAgICAgICAgICAgICAgIGhpc3RvcnkucHVzaFN0YXRlKGVuc3VyZShzdCksICcnLCB0aGlzLnRvVXJsKHN0WydAaWQnXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgcmVjZWl2ZSBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25Qb3BTdGF0ZShldjogUG9wU3RhdGVFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IFtuZXdTdGF0ZSwgYWRkaXRpb25hbF0gPSBwYXJzZURpc3BhdGNoSW5mbyhldi5zdGF0ZSk7XG4gICAgICAgIGNvbnN0IG5ld0lkICAgPSBhZGRpdGlvbmFsPy5uZXdJZCA/PyB0b0lkKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBjb25zdCBtZXRob2QgID0gYWRkaXRpb25hbD8ucG9zdHByb2MgPz8gJ3NlZWsnO1xuICAgICAgICBjb25zdCBkZiAgICAgID0gYWRkaXRpb25hbD8uZGYgPz8gdGhpcy5fZGZHbyA/PyBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgY29uc3Qgb2xkRGF0YSA9IGFkZGl0aW9uYWw/LnByZXZTdGF0ZSA/PyB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCBuZXdEYXRhID0gYWRkaXRpb25hbD8ubmV4dFN0YXRlID8/IHRoaXMuZGlyZWN0KG5ld0lkKS5zdGF0ZSA/PyBjcmVhdGVEYXRhKG5ld0lkLCBuZXdTdGF0ZSk7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIGRmLmNhdGNoKG5vb3ApO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ2NoYW5naW5nJywgbmV3RGF0YSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3RGF0YSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdEYXRhLCBvbGREYXRhKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBoaXN0b3J5IOOCkuWFg+OBq+aIu+OBmVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsYmFja0hpc3RvcnkobWV0aG9kLCBuZXdJZCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSBhcyBFcnJvcik7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgY3JlYXRlU2Vzc2lvbkhpc3Rvcnl9KCkgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgY3JlYXRlU2Vzc2lvbkhpc3Rvcnl9KCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9ucyB7XG4gICAgY29udGV4dD86IFdpbmRvdztcbiAgICBtb2RlPzogJ2hhc2gnIHwgJ2hpc3RvcnknO1xufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz566h55CG44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIGlkXG4gKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICogQHBhcmFtIHN0YXRlXG4gKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnN9IG9iamVjdFxuICogIC0gYGphYCB7QGxpbmsgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaWQ/OiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9ucyk6IElIaXN0b3J5PFQ+IHtcbiAgICBjb25zdCB7IGNvbnRleHQsIG1vZGUgfSA9IE9iamVjdC5hc3NpZ24oeyBtb2RlOiAnaGFzaCcgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBTZXNzaW9uSGlzdG9yeShjb250ZXh0ID8/IHdpbmRvdywgbW9kZSwgaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc2V0U2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIFNlc3Npb25IaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIFNlc3Npb25IaXN0b3J5PFQ+KS5kaXNwb3NlKCk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQgeyB0eXBlIFBsYWluT2JqZWN0LCBwb3N0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHR5cGUgU2lsZW5jZWFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGFjayxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBhc3NpZ25TdGF0ZUVsZW1lbnQsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnTWVtb3J5SGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEhpc3RvcnlFdmVudDxUPj4gaW1wbGVtZW50cyBJSGlzdG9yeTxUPiB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkOiBzdHJpbmcsIHN0YXRlPzogVCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdID0gdHJ1ZTtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuXG4gICAgICAgIGNvbnN0IG9sZFN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLnN0YXRlO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCgnTWVtb3J5SGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZSgnbm9vcCcsIGRmLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSBkZWx0YSA/IHRoaXMuc3RhdGUgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhID8/IDApO1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ3NlZWsnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXF1aXJlLWF3YWl0XG4gICAgICAgIHRoaXMuX3N0YWNrLmNsZWFyRm9yd2FyZCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgYvjgonntYLngrnjga7jgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgbmV3U3RhdGVbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQobmV3U3RhdGUsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKGNhbmNlbCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKG1ldGhvZCwgZGYsIG5ld1N0YXRlLCB0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBzdGF0ZSBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNoYW5nZVN0YXRlKG1ldGhvZDogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnLCBkZjogRGVmZXJyZWQsIG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8VD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld1N0YXRlLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlIGFzIEVycm9yKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IElIaXN0b3J5PFQ+IHtcbiAgICByZXR1cm4gbmV3IE1lbW9yeUhpc3RvcnkoaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgbWVtb3J5IGhpc3RvcnkuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiaW1wb3J0IHsgcGF0aDJyZWdleHAgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5pbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBDbGFzcyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgYXNzaWduVmFsdWUsXG4gICAgc2xlZXAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgdG9RdWVyeVN0cmluZ3MsXG4gICAgcGFyc2VVcmxRdWVyeSxcbiAgICBjb252ZXJ0VXJsUGFyYW1UeXBlLFxufSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHtcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIHRvVXJsLFxuICAgIGxvYWRUZW1wbGF0ZVNvdXJjZSxcbiAgICB0b1RlbXBsYXRlRWxlbWVudCxcbn0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgdHlwZSBJSGlzdG9yeSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgUGFnZVRyYW5zaXRpb25QYXJhbXMsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXRoUGFyYW1zLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXMsXG4gICAgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgREVGQVVMVF9QUkVGSVggICAgICAgPSAnY2RwJyxcbiAgICBUUkFOU0lUSU9OX0RJUkVDVElPTiA9ICd0cmFuc2l0aW9uLWRpcmVjdGlvbicsXG4gICAgVFJBTlNJVElPTl9SVU5OSU5HICAgPSAndHJhbnNpdGlvbi1ydW5uaW5nJyxcbiAgICBQQUdFX0NVUlJFTlQgICAgICAgICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgICAgICAgID0gJ3BhZ2UtcHJldmlvdXMnLFxuICAgIEhJRERFTiAgICAgICAgICAgICAgID0gJ2hpZGRlbicsXG4gICAgRU5URVJfRlJPTV9DTEFTUyAgICAgPSAnZW50ZXItZnJvbScsXG4gICAgRU5URVJfQUNUSVZFX0NMQVNTICAgPSAnZW50ZXItYWN0aXZlJyxcbiAgICBFTlRFUl9UT19DTEFTUyAgICAgICA9ICdlbnRlci10bycsXG4gICAgTEVBVkVfRlJPTV9DTEFTUyAgICAgPSAnbGVhdmUtZnJvbScsXG4gICAgTEVBVkVfQUNUSVZFX0NMQVNTICAgPSAnbGVhdmUtYWN0aXZlJyxcbiAgICBMRUFWRV9UT19DTEFTUyAgICAgICA9ICdsZWF2ZS10bycsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIERvbUNhY2hlIHtcbiAgICBEQVRBX05BTUUgICAgICAgICAgID0gJ2RvbS1jYWNoZScsXG4gICAgQ0FDSEVfTEVWRUxfTUVNT1JZICA9ICdtZW1vcnknLFxuICAgIENBQ0hFX0xFVkVMX0NPTk5FQ1QgPSAnY29ubmVjdCcsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIExpbmtEYXRhIHtcbiAgICBUUkFOU0lUSU9OICAgICAgID0gJ3RyYW5zaXRpb24nLFxuICAgIE5BVklBR0FURV9NRVRIT0QgPSAnbmF2aWdhdGUtbWV0aG9kJyxcbiAgICBQUkVGRVRDSCAgICAgICAgID0gJ3ByZWZldGNoJyxcbiAgICBQUkVWRU5UX1JPVVRFUiAgID0gJ3ByZXZlbnQtcm91dGVyJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ29uc3Qge1xuICAgIFdBSVRfVFJBTlNJVElPTl9NQVJHSU4gPSAxMDAsIC8vIG1zZWNcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgUGFnZUV2ZW50ID0gJ2luaXQnIHwgJ21vdW50ZWQnIHwgJ2Nsb25lZCcgfCAnYmVmb3JlLWVudGVyJyB8ICdhZnRlci1lbnRlcicgfCAnYmVmb3JlLWxlYXZlJyB8ICdhZnRlci1sZWF2ZScgfCAndW5tb3VudGVkJyB8ICdyZW1vdmVkJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZUNoYW5nZUluZm9Db250ZXh0IGV4dGVuZHMgUm91dGVDaGFuZ2VJbmZvIHtcbiAgICByZWFkb25seSBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0O1xuICAgIHNhbWVQYWdlSW5zdGFuY2U/OiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBmbGF0IFJvdXRlUGFyYW1ldGVycyAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IE9taXQ8Um91dGVQYXJhbWV0ZXJzLCAncm91dGVzJz4gJiB7XG4gICAgLyoqIHJlZ2V4cCBmcm9tIHBhdGggKi9cbiAgICByZWdleHA6IFJlZ0V4cDtcbiAgICAvKioga2V5cyBvZiBwYXJhbXMgKi9cbiAgICBwYXJhbUtleXM6IHN0cmluZ1tdO1xuICAgIC8qKiBET00gdGVtcGxhdGUgaW5zdGFuY2Ugd2l0aCBQYWdlIGVsZW1lbnQgKi9cbiAgICAkdGVtcGxhdGU/OiBET007XG4gICAgLyoqIHJvdXRlciBwYWdlIGluc3RhbmNlIGZyb20gYGNvbXBvbmVudGAgcHJvcGVydHkgKi9cbiAgICBwYWdlPzogUGFnZTtcbiAgICAvKiogbGF0ZXN0IHJvdXRlIGNvbnRleHQgY2FjaGUgKi9cbiAgICAnQHJvdXRlJz86IFJvdXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCA9IFJvdXRlU3ViRmxvd1BhcmFtcyAmIFJlcXVpcmVkPFBhZ2VUcmFuc2l0aW9uUGFyYW1zPiAmIHtcbiAgICBvcmlnaW46IHN0cmluZztcbn07XG5cbi8qKiBAaW50ZXJuYWwgUm91dGVDb250ZXh0ICovXG5leHBvcnQgdHlwZSBSb3V0ZUNvbnRleHQgPSBXcml0YWJsZTxSb3V0ZT4gJiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zICYge1xuICAgICdAcGFyYW1zJzogUm91dGVDb250ZXh0UGFyYW1ldGVycztcbiAgICBzdWJmbG93PzogUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dDtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGJ1aWx0LWluIGNzcyAqL1xuZXhwb3J0IGNvbnN0IGFwcGx5QnVpbHRJbkNzcyA9IChjb250ZXh0OiB0eXBlb2YgZ2xvYmFsVGhpcywgcHJlZml4OiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICBjb25zdCBzdHlsZVRleHQgPSBgXG4gICAgLiR7cHJlZml4fS10cmFuc2l0aW9uLXJ1bm5pbmcge1xuICAgICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICB9XG4gICAgLiR7cHJlZml4fS1oaWRkZW4ge1xuICAgICAgICB2aXNpYmlsaXR5OiBoaWRkZW47XG4gICAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIH1cbiAgICBgO1xuICAgIGNvbnN0IHNoZWV0ID0gbmV3IGNvbnRleHQuQ1NTU3R5bGVTaGVldCgpO1xuICAgIHNoZWV0LnJlcGxhY2VTeW5jKHN0eWxlVGV4dCk7XG5cbiAgICBjb25zdCB7IGRvY3VtZW50OiByb290IH0gPSBjb250ZXh0O1xuICAgIGNvbnN0IGRlZmF1bHRzID0gcm9vdC5hZG9wdGVkU3R5bGVTaGVldHM7XG4gICAgcm9vdC5hZG9wdGVkU3R5bGVTaGVldHMgPSBbLi4uZGVmYXVsdHMsIHNoZWV0XTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgdG8gUm91dGVDb250ZXh0ICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZUNvbnRleHQgPSAodXJsOiBzdHJpbmcsIHJvdXRlcjogUm91dGVyLCBwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsIG5hdk9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUm91dGVDb250ZXh0ID0+IHtcbiAgICAvLyBvbWl0IHVuY2xvbmFibGUgcHJvcHNcbiAgICBjb25zdCBmcm9tTmF2aWdhdGUgPSAhIW5hdk9wdGlvbnM7XG4gICAgY29uc3QgZW5zdXJlQ2xvbmUgPSAoY3R4OiB1bmtub3duKTogUm91dGVDb250ZXh0ID0+IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3R4KSk7XG4gICAgY29uc3QgY29udGV4dCA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIHJvdXRlcjogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcm91dGVyLFxuICAgICAgICB9LFxuICAgICAgICBuYXZPcHRpb25zLFxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBmb3JjZSBvdmVycmlkZVxuICAgICAgICAgICAgcXVlcnk6IHt9LFxuICAgICAgICAgICAgcGFyYW1zOiB7fSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcy5wYXRoLFxuICAgICAgICAgICAgJ0BwYXJhbXMnOiBmcm9tTmF2aWdhdGUgPyB1bmRlZmluZWQgOiBwYXJhbXMsXG4gICAgICAgIH0sXG4gICAgKTtcbiAgICByZXR1cm4gZnJvbU5hdmlnYXRlID8gZW5zdXJlQ2xvbmUoY29udGV4dCkgOiBjb250ZXh0IGFzIFJvdXRlQ29udGV4dDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCBjb250ZXh0IHBhcmFtcyAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IChyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdIHwgdW5kZWZpbmVkKTogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0+IHtcbiAgICBjb25zdCBmbGF0dGVuID0gKHBhcmVudFBhdGg6IHN0cmluZywgbmVzdGVkOiBSb3V0ZVBhcmFtZXRlcnNbXSk6IFJvdXRlUGFyYW1ldGVyc1tdID0+IHtcbiAgICAgICAgY29uc3QgcmV0dmFsOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG4gb2YgbmVzdGVkKSB7XG4gICAgICAgICAgICBuLnBhdGggPSBgJHtwYXJlbnRQYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7bm9ybWFsaXplSWQobi5wYXRoKX1gO1xuICAgICAgICAgICAgcmV0dmFsLnB1c2gobik7XG4gICAgICAgICAgICBpZiAobi5yb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaCguLi5mbGF0dGVuKG4ucGF0aCwgbi5yb3V0ZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmxhdHRlbignJywgaXNBcnJheShyb3V0ZXMpID8gcm91dGVzIDogcm91dGVzID8gW3JvdXRlc10gOiBbXSlcbiAgICAgICAgLm1hcCgoc2VlZDogUm91dGVDb250ZXh0UGFyYW1ldGVycykgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHJlZ2V4cCwga2V5cyB9ID0gcGF0aDJyZWdleHAucGF0aFRvUmVnZXhwKHNlZWQucGF0aCk7XG4gICAgICAgICAgICAgICAgc2VlZC5yZWdleHAgPSByZWdleHA7XG4gICAgICAgICAgICAgICAgc2VlZC5wYXJhbUtleXMgPSBrZXlzLmZpbHRlcihrID0+IGlzU3RyaW5nKGsubmFtZSkpLm1hcChrID0+IGsubmFtZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWVkO1xuICAgICAgICB9KTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHByZXBhcmUgSUhpc3Rvcnkgb2JqZWN0ICovXG5leHBvcnQgY29uc3QgcHJlcGFyZUhpc3RvcnkgPSAoc2VlZDogJ2hhc2gnIHwgJ2hpc3RvcnknIHwgJ21lbW9yeScgfCBJSGlzdG9yeSA9ICdoYXNoJywgaW5pdGlhbFBhdGg/OiBzdHJpbmcsIGNvbnRleHQ/OiBXaW5kb3cpOiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+ID0+IHtcbiAgICByZXR1cm4gKGlzU3RyaW5nKHNlZWQpXG4gICAgICAgID8gJ21lbW9yeScgPT09IHNlZWQgPyBjcmVhdGVNZW1vcnlIaXN0b3J5KGluaXRpYWxQYXRoID8/ICcnKSA6IGNyZWF0ZVNlc3Npb25IaXN0b3J5KGluaXRpYWxQYXRoLCB1bmRlZmluZWQsIHsgbW9kZTogc2VlZCwgY29udGV4dCB9KVxuICAgICAgICA6IHNlZWRcbiAgICApIGFzIElIaXN0b3J5PFJvdXRlQ29udGV4dD47XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVQYXRoUGFyYW1zID0gKHBhcmFtczogUm91dGVQYXRoUGFyYW1zIHwgdW5kZWZpbmVkKTogcGF0aDJyZWdleHAuUGFyYW1EYXRhID0+IHtcbiAgICBjb25zdCBwYXRoUGFyYW1zOiBwYXRoMnJlZ2V4cC5QYXJhbURhdGEgPSB7fTtcbiAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHBhcmFtcykpIHtcbiAgICAgICAgICAgIHBhdGhQYXJhbXNba2V5XSA9IFN0cmluZyhwYXJhbXNba2V5XSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdGhQYXJhbXM7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgYnVpbGROYXZpZ2F0ZVVybCA9IChwYXRoOiBzdHJpbmcsIG9wdGlvbnM6IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBzdHJpbmcgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHBhdGggPSBgLyR7bm9ybWFsaXplSWQocGF0aCl9YDtcbiAgICAgICAgY29uc3QgeyBxdWVyeSwgcGFyYW1zIH0gPSBvcHRpb25zO1xuICAgICAgICBsZXQgdXJsID0gcGF0aDJyZWdleHAuY29tcGlsZShwYXRoKShlbnN1cmVQYXRoUGFyYW1zKHBhcmFtcykpO1xuICAgICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MocXVlcnkpfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsXG4gICAgICAgICAgICBgQ29uc3RydWN0IHJvdXRlIGRlc3RpbmF0aW9uIGZhaWxlZC4gW3BhdGg6ICR7cGF0aH0sIGRldGFpbDogJHsoZXJyb3IgYXMgRXJyb3IpLnRvU3RyaW5nKCl9XWAsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgcGFyc2VVcmxQYXJhbXMgPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHsgdXJsIH0gPSByb3V0ZTtcbiAgICByb3V0ZS5xdWVyeSAgPSB1cmwuaW5jbHVkZXMoJz8nKSA/IHBhcnNlVXJsUXVlcnkobm9ybWFsaXplSWQodXJsKSkgOiB7fTtcbiAgICByb3V0ZS5wYXJhbXMgPSB7fTtcblxuICAgIGNvbnN0IHsgcmVnZXhwLCBwYXJhbUtleXMgfSA9IHJvdXRlWydAcGFyYW1zJ107XG4gICAgaWYgKHBhcmFtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gcmVnZXhwLmV4ZWModXJsKT8ubWFwKCh2YWx1ZSwgaW5kZXgpID0+IHsgcmV0dXJuIHsgdmFsdWUsIGtleTogcGFyYW1LZXlzW2luZGV4IC0gMV0gfTsgfSk7XG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zISkge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gcGFyYW0ua2V5ICYmIG51bGwgIT0gcGFyYW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShyb3V0ZS5wYXJhbXMsIHBhcmFtLmtleSwgY29udmVydFVybFBhcmFtVHlwZShwYXJhbS52YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMjaW5zdGFuY2UgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UgPSBhc3luYyAocm91dGU6IFJvdXRlQ29udGV4dCk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBwYXJhbXMgfSA9IHJvdXRlO1xuXG4gICAgaWYgKHBhcmFtcy5wYWdlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgeyBjb21wb25lbnQsIGNvbXBvbmVudE9wdGlvbnMgfSA9IHBhcmFtcztcbiAgICBpZiAoaXNGdW5jdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYXJhbXMucGFnZSA9IG5ldyAoY29tcG9uZW50IGFzIHVua25vd24gYXMgQ2xhc3MpKHJvdXRlLCBjb21wb25lbnRPcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICBwYXJhbXMucGFnZSA9IGF3YWl0IGNvbXBvbmVudChyb3V0ZSwgY29tcG9uZW50T3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGNvbXBvbmVudCkpIHtcbiAgICAgICAgcGFyYW1zLnBhZ2UgPSBPYmplY3QuYXNzaWduKHsgJ0Byb3V0ZSc6IHJvdXRlLCAnQG9wdGlvbnMnOiBjb21wb25lbnRPcHRpb25zIH0sIGNvbXBvbmVudCkgYXMgUGFnZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMucGFnZSA9IHsgJ0Byb3V0ZSc6IHJvdXRlLCAnQG9wdGlvbnMnOiBjb21wb25lbnRPcHRpb25zIH0gYXMgUGFnZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyMkdGVtcGxhdGUgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUgPSBhc3luYyAocGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgaWYgKHBhcmFtcy4kdGVtcGxhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGNyZWF0ZWRcbiAgICB9XG5cbiAgICBjb25zdCBlbnN1cmVJbnN0YW5jZSA9IChlbDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQpOiBET00gPT4ge1xuICAgICAgICByZXR1cm4gZWwgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gJChbLi4uZWwuY29udGVudC5jaGlsZHJlbl0pIGFzIERPTSA6ICQoZWwpO1xuICAgIH07XG5cbiAgICBjb25zdCB7IGNvbnRlbnQgfSA9IHBhcmFtcztcbiAgICBpZiAobnVsbCA9PSBjb250ZW50KSB7XG4gICAgICAgIC8vIG5vb3AgZWxlbWVudFxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gJDxIVE1MRWxlbWVudD4oKTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKChjb250ZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnc2VsZWN0b3InXSkpIHtcbiAgICAgICAgLy8gZnJvbSBhamF4XG4gICAgICAgIGNvbnN0IHsgc2VsZWN0b3IsIHVybCB9ID0gY29udGVudCBhcyB7IHNlbGVjdG9yOiBzdHJpbmc7IHVybD86IHN0cmluZzsgfTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0b1RlbXBsYXRlRWxlbWVudChhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsOiB1cmwgJiYgdG9VcmwodXJsKSB9KSk7XG4gICAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGB0ZW1wbGF0ZSBsb2FkIGZhaWxlZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yfSwgdXJsOiAke3VybH1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKHRlbXBsYXRlKTtcbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oY29udGVudCkpIHtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCQoYXdhaXQgY29udGVudCgpKVswXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCQoY29udGVudCBhcyBET01TZWxlY3RvcilbMF0pO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGRlY2lkZSB0cmFuc2l0aW9uIGRpcmVjdGlvbiAqL1xuZXhwb3J0IGNvbnN0IGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24gPSAoY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvKTogSGlzdG9yeURpcmVjdGlvbiA9PiB7XG4gICAgaWYgKGNoYW5nZUluZm8ucmV2ZXJzZSkge1xuICAgICAgICBzd2l0Y2ggKGNoYW5nZUluZm8uZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdiYWNrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2ZvcndhcmQnO1xuICAgICAgICAgICAgY2FzZSAnZm9yd2FyZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdiYWNrJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZUluZm8uZGlyZWN0aW9uO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBFZmZlY3RUeXBlID0gJ2FuaW1hdGlvbicgfCAndHJhbnNpdGlvbic7XG5cbi8qKiBAaW50ZXJuYWwgcmV0cmlldmUgZWZmZWN0IGR1cmF0aW9uIHByb3BlcnR5ICovXG5jb25zdCBnZXRFZmZlY3REdXJhdGlvblNlYyA9ICgkZWw6IERPTSwgZWZmZWN0OiBFZmZlY3RUeXBlKTogbnVtYmVyID0+IHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKCRlbFswXSlbYCR7ZWZmZWN0fUR1cmF0aW9uYF0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCB3YWl0Rm9yRWZmZWN0ID0gKCRlbDogRE9NLCBlZmZlY3Q6IEVmZmVjdFR5cGUsIGR1cmF0aW9uU2VjOiBudW1iZXIpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgbmV3IFByb21pc2UocmVzb2x2ZSA9PiAkZWxbYCR7ZWZmZWN0fUVuZGBdKHJlc29sdmUpKSxcbiAgICAgICAgc2xlZXAoZHVyYXRpb25TZWMgKiAxMDAwICsgQ29uc3QuV0FJVF9UUkFOU0lUSU9OX01BUkdJTiksXG4gICAgXSk7XG59O1xuXG4vKiogQGludGVybmFsIHRyYW5zaXRpb24gZXhlY3V0aW9uICovXG5leHBvcnQgY29uc3QgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uID0gYXN5bmMoJGVsOiBET00sIGZyb21DbGFzczogc3RyaW5nLCBhY3RpdmVDbGFzczogc3RyaW5nLCB0b0NsYXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAkZWwucmVtb3ZlQ2xhc3MoZnJvbUNsYXNzKTtcbiAgICAkZWwuYWRkQ2xhc3ModG9DbGFzcyk7XG5cbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgWydhbmltYXRpb24nLCAndHJhbnNpdGlvbiddIGFzIEVmZmVjdFR5cGVbXSkge1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IGdldEVmZmVjdER1cmF0aW9uU2VjKCRlbCwgZWZmZWN0KTtcbiAgICAgICAgZHVyYXRpb24gJiYgcHJvbWlzZXMucHVzaCh3YWl0Rm9yRWZmZWN0KCRlbCwgZWZmZWN0LCBkdXJhdGlvbikpO1xuICAgIH1cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3MoW2FjdGl2ZUNsYXNzLCB0b0NsYXNzXSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBSb3V0ZUF5bmNQcm9jZXNzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUF5bmNQcm9jZXNzIGltcGxlbWVudGF0aW9uICovXG5leHBvcnQgY2xhc3MgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgaW1wbGVtZW50cyBSb3V0ZUF5bmNQcm9jZXNzIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBSb3V0ZUF5bmNQcm9jZXNzXG5cbiAgICByZWdpc3Rlcihwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWwgbWV0aG9kczpcblxuICAgIGdldCBwcm9taXNlcygpOiByZWFkb25seSBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbWlzZXM7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGNvbXBsZXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9wcm9taXNlcyk7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLmxlbmd0aCA9IDA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNhbWVsaXplLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBOYXRpdmVQcm9taXNlIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgaXNSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyB3YWl0RnJhbWUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyB0b1JvdXRlclBhdGggfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuLi9zc3InO1xuaW1wb3J0IHsgbm9ybWFsaXplSWQgfSBmcm9tICcuLi9oaXN0b3J5L2ludGVybmFsJztcbmltcG9ydCB0eXBlIHsgSUhpc3RvcnksIEhpc3RvcnlTdGF0ZSB9IGZyb20gJy4uL2hpc3RvcnknO1xuaW1wb3J0IHtcbiAgICB0eXBlIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIHR5cGUgUm91dGVyRXZlbnQsXG4gICAgdHlwZSBQYWdlLFxuICAgIHR5cGUgUm91dGVQYXJhbWV0ZXJzLFxuICAgIHR5cGUgUm91dGUsXG4gICAgdHlwZSBUcmFuc2l0aW9uU2V0dGluZ3MsXG4gICAgdHlwZSBOYXZpZ2F0aW9uU2V0dGluZ3MsXG4gICAgdHlwZSBQYWdlU3RhY2ssXG4gICAgdHlwZSBQdXNoUGFnZVN0YWNrT3B0aW9ucyxcbiAgICB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICB0eXBlIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMsXG4gICAgdHlwZSBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIHR5cGUgUm91dGVyLFxuICAgIFJvdXRlclJlZnJlc2hMZXZlbCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgQ3NzTmFtZSxcbiAgICBEb21DYWNoZSxcbiAgICBMaW5rRGF0YSxcbiAgICB0eXBlIFBhZ2VFdmVudCxcbiAgICB0eXBlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgdHlwZSBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0LFxuICAgIHR5cGUgUm91dGVDb250ZXh0LFxuICAgIHR5cGUgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICBhcHBseUJ1aWx0SW5Dc3MsXG4gICAgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLFxuICAgIHRvUm91dGVDb250ZXh0LFxuICAgIHByZXBhcmVIaXN0b3J5LFxuICAgIGJ1aWxkTmF2aWdhdGVVcmwsXG4gICAgcGFyc2VVcmxQYXJhbXMsXG4gICAgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlLFxuICAgIGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZSxcbiAgICBkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uLFxuICAgIHByb2Nlc3NQYWdlVHJhbnNpdGlvbixcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCB9IGZyb20gJy4vYXN5bmMtcHJvY2Vzcyc7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBSb3V0ZXIgaW1wbGltZW50IGNsYXNzLlxuICogQGphIFJvdXRlciDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUm91dGVyQ29udGV4dCBleHRlbmRzIEV2ZW50UHVibGlzaGVyPFJvdXRlckV2ZW50PiBpbXBsZW1lbnRzIFJvdXRlciB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm91dGVzOiBSZWNvcmQ8c3RyaW5nLCBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzPiA9IHt9O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3Rvcnk6IElIaXN0b3J5PFJvdXRlQ29udGV4dD47XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJGVsOiBET007XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcmFmOiBVbmtub3duRnVuY3Rpb247XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeUNoYW5naW5nSGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGlzdG9yeUNoYW5naW5nO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3RvcnlSZWZyZXNoSGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGlzdG9yeVJlZnJlc2g7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfZXJyb3JIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IYW5kbGVFcnJvcjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9jc3NQcmVmaXg6IHN0cmluZztcbiAgICBwcml2YXRlIF90cmFuc2l0aW9uU2V0dGluZ3M6IFRyYW5zaXRpb25TZXR0aW5ncztcbiAgICBwcml2YXRlIF9uYXZpZ2F0aW9uU2V0dGluZ3M6IFJlcXVpcmVkPE5hdmlnYXRpb25TZXR0aW5ncz47XG4gICAgcHJpdmF0ZSBfbGFzdFJvdXRlPzogUm91dGVDb250ZXh0O1xuICAgIHByaXZhdGUgX3ByZXZSb3V0ZT86IFJvdXRlQ29udGV4dDtcbiAgICBwcml2YXRlIF9zdWJmbG93VHJhbnNpdGlvblBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zO1xuICAgIHByaXZhdGUgX2luQ2hhbmdpbmdQYWdlID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yOiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD4sIG9wdGlvbnM6IFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICByb3V0ZXMsXG4gICAgICAgICAgICBzdGFydCxcbiAgICAgICAgICAgIGVsLFxuICAgICAgICAgICAgd2luZG93OiBjb250ZXh0LFxuICAgICAgICAgICAgaGlzdG9yeSxcbiAgICAgICAgICAgIGluaXRpYWxQYXRoLFxuICAgICAgICAgICAgYWRkaXRpb25hbFN0YWNrcyxcbiAgICAgICAgICAgIGNzc1ByZWZpeCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICBuYXZpZ2F0aW9uLFxuICAgICAgICB9ID0gb3B0aW9ucztcblxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgIHRoaXMuX3JhZiA9IGNvbnRleHQ/LnJlcXVlc3RBbmltYXRpb25GcmFtZSA/PyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgICAgIHRoaXMuXyRlbCA9ICQoc2VsZWN0b3IsIGVsKTtcbiAgICAgICAgaWYgKCF0aGlzLl8kZWwubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQsIGBSb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuIFtzZWxlY3RvcjogJHtzZWxlY3RvciBhcyBzdHJpbmd9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faGlzdG9yeSA9IHByZXBhcmVIaXN0b3J5KGhpc3RvcnksIGluaXRpYWxQYXRoLCBjb250ZXh0ISk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIgPSB0aGlzLm9uSGlzdG9yeUNoYW5naW5nLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlciAgPSB0aGlzLm9uSGlzdG9yeVJlZnJlc2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fZXJyb3JIYW5kbGVyICAgICAgICAgICA9IHRoaXMub25IYW5kbGVFcnJvci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGZvbGxvdyBhbmNob3JcbiAgICAgICAgdGhpcy5fJGVsLm9uKCdjbGljaycsICdbaHJlZl0nLCB0aGlzLm9uQW5jaG9yQ2xpY2tlZC5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9jc3NQcmVmaXggPSBjc3NQcmVmaXggPz8gQ3NzTmFtZS5ERUZBVUxUX1BSRUZJWDtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7IGRlZmF1bHQ6ICdub25lJywgcmVsb2FkOiAnbm9uZScgfSwgdHJhbnNpdGlvbik7XG4gICAgICAgIHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBtZXRob2Q6ICdwdXNoJyB9LCBuYXZpZ2F0aW9uKTtcblxuICAgICAgICAvLyBidWlsdC1pbiBjc3NcbiAgICAgICAgYXBwbHlCdWlsdEluQ3NzKChjb250ZXh0ID8/IHdpbmRvdykgYXMgdW5rbm93biBhcyB0eXBlb2YgZ2xvYmFsVGhpcywgdGhpcy5fY3NzUHJlZml4KTtcblxuICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlZ2lzdGVyKHJvdXRlcyEsIGZhbHNlKTtcbiAgICAgICAgICAgIGlmIChhZGRpdGlvbmFsU3RhY2tzPy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnB1c2hQYWdlU3RhY2soYWRkaXRpb25hbFN0YWNrcywgeyBub05hdmlnYXRlOiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhcnQgJiYgYXdhaXQgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIH0pKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUm91dGVyXG5cbiAgICAvKiogUm91dGVyJ3MgdmlldyBIVE1MIGVsZW1lbnQgKi9cbiAgICBnZXQgZWwoKTogSFRNTEVsZW1lbnQge1xuICAgICAgICByZXR1cm4gdGhpcy5fJGVsWzBdO1xuICAgIH1cblxuICAgIC8qKiBPYmplY3Qgd2l0aCBjdXJyZW50IHJvdXRlIGRhdGEgKi9cbiAgICBnZXQgY3VycmVudFJvdXRlKCk6IFJvdXRlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3Rvcnkuc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIHN0YXRlIGlzIGluIHN1Yi1mbG93ICovXG4gICAgZ2V0IGlzSW5TdWJGbG93KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLmZpbmRTdWJGbG93UGFyYW1zKGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5CYWNrO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LmNhbkZvcndhcmQ7XG4gICAgfVxuXG4gICAgLyoqIFJvdXRlIHJlZ2lzdHJhdGlvbiAqL1xuICAgIGFzeW5jIHJlZ2lzdGVyKHJvdXRlczogUm91dGVQYXJhbWV0ZXJzIHwgUm91dGVQYXJhbWV0ZXJzW10sIHJlZnJlc2ggPSBmYWxzZSk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBjb25zdCBwcmVmZXRjaFBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgY29udGV4dCBvZiB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMocm91dGVzKSkge1xuICAgICAgICAgICAgdGhpcy5fcm91dGVzW2NvbnRleHQucGF0aF0gPSBjb250ZXh0O1xuICAgICAgICAgICAgY29uc3QgeyBjb250ZW50LCBwcmVmZXRjaCB9ID0gY29udGV4dDtcbiAgICAgICAgICAgIGNvbnRlbnQgJiYgcHJlZmV0Y2ggJiYgcHJlZmV0Y2hQYXJhbXMucHVzaChjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByZWZldGNoUGFyYW1zLmxlbmd0aCAmJiBhd2FpdCB0aGlzLnNldFByZWZldGNoQ29udGVudHMocHJlZmV0Y2hQYXJhbXMpO1xuICAgICAgICByZWZyZXNoICYmIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBOYXZpZ2F0ZSB0byBuZXcgcGFnZS4gKi9cbiAgICBhc3luYyBuYXZpZ2F0ZSh0bzogc3RyaW5nLCBvcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc2VlZCA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh0byk7XG4gICAgICAgICAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELCBgUm91dGUgbm90IGZvdW5kLiBbdG86ICR7dG99XWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBvcHRzICAgPSBPYmplY3QuYXNzaWduKHsgaW50ZW50OiB1bmRlZmluZWQgfSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCB1cmwgICAgPSBidWlsZE5hdmlnYXRlVXJsKHRvLCBvcHRzKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlICA9IHRvUm91dGVDb250ZXh0KHVybCwgdGhpcywgc2VlZCwgb3B0cyk7XG4gICAgICAgICAgICBjb25zdCBtZXRob2QgPSBvcHRzLm1ldGhvZCA/PyB0aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3MubWV0aG9kO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIGV4ZWMgbmF2aWdhdGVcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5W21ldGhvZF0odXJsLCByb3V0ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBub29wXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBBZGQgcGFnZSBzdGFjayBzdGFydGluZyBmcm9tIHRoZSBjdXJyZW50IGhpc3RvcnkuICovXG4gICAgYXN5bmMgcHVzaFBhZ2VTdGFjayhzdGFjazogUGFnZVN0YWNrIHwgUGFnZVN0YWNrW10sIG9wdGlvbnM/OiBQdXNoUGFnZVN0YWNrT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBub05hdmlnYXRlLCB0cmF2ZXJzZVRvIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICAgICAgY29uc3Qgc3RhY2tzID0gaXNBcnJheShzdGFjaykgPyBzdGFjayA6IFtzdGFja107XG4gICAgICAgICAgICBjb25zdCByb3V0ZXMgPSBzdGFja3MuZmlsdGVyKHMgPT4gISFzLnJvdXRlKS5tYXAocyA9PiBzLnJvdXRlISk7XG5cbiAgICAgICAgICAgIC8vIGVuc3J1ZSBSb3V0ZVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWdpc3Rlcihyb3V0ZXMsIGZhbHNlKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gcHVzaCBoaXN0b3J5XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIHN0YWNrcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBhdGg6IHVybCwgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gcGFnZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHRvUm91dGVyUGF0aCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXMocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09IHBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCwgYFJvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4gW3BhdGg6ICR7dXJsfV1gLCBwYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBzaWxlbnQgcmVnaXN0cnlcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0b1JvdXRlQ29udGV4dChwYXRoLCB0aGlzLCBwYXJhbXMsIHsgaW50ZW50OiB1bmRlZmluZWQgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLnRyYW5zaXRpb24gPSB0cmFuc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5yZXZlcnNlICAgID0gcmV2ZXJzZTtcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLl9oaXN0b3J5LnB1c2gocGF0aCwgcm91dGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAodHJhdmVyc2VUbykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LnRyYXZlcnNlVG8odG9Sb3V0ZXJQYXRoKHRyYXZlcnNlVG8pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFub05hdmlnYXRlKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkgYnkgcGF0aCBzdHJpbmcuICovXG4gICAgYXN5bmMgdHJhdmVyc2VUbyhzcmM6IHN0cmluZyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LnRyYXZlcnNlVG8odG9Sb3V0ZXJQYXRoKHNyYykpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQmVnaW4gc3ViLWZsb3cgdHJhbnNhY3Rpb24uICovXG4gICAgYXN5bmMgYmVnaW5TdWJGbG93KHRvOiBzdHJpbmcsIHN1YmZsb3c/OiBSb3V0ZVN1YkZsb3dQYXJhbXMsIG9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbjogdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLmRlZmF1bHQhLFxuICAgICAgICAgICAgICAgICAgICByZXZlcnNlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luOiB0aGlzLmN1cnJlbnRSb3V0ZS51cmwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdWJmbG93LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZVN1YkZsb3dQYXJhbXMocGFyYW1zKTtcbiAgICAgICAgICAgICh0aGlzLmN1cnJlbnRSb3V0ZSBhcyBSb3V0ZUNvbnRleHQpLnN1YmZsb3cgPSBwYXJhbXM7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLm5hdmlnYXRlKHRvLCBvcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBDb21taXQgc3ViLWZsb3cgdHJhbnNhY3Rpb24uICovXG4gICAgYXN5bmMgY29tbWl0U3ViRmxvdyhwYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBjb25zdCBzdWJmbG93ID0gdGhpcy5maW5kU3ViRmxvd1BhcmFtcyh0cnVlKTtcbiAgICAgICAgaWYgKCFzdWJmbG93KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gc3ViZmxvdy5wYXJhbXM7XG5cbiAgICAgICAgdGhpcy5fc3ViZmxvd1RyYW5zaXRpb25QYXJhbXMgPSBPYmplY3QuYXNzaWduKHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9LCBwYXJhbXMpO1xuICAgICAgICBjb25zdCB7IGFkZGl0aW9uYWxEaXN0YW5jZSwgYWRkaXRpb25hbFN0YWNrcyB9ID0gc3ViZmxvdy5wYXJhbXM7XG4gICAgICAgIGNvbnN0IGRpc3RhbmNlID0gc3ViZmxvdy5kaXN0YW5jZSArIGFkZGl0aW9uYWxEaXN0YW5jZTtcblxuICAgICAgICBpZiAoYWRkaXRpb25hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKCgpID0+IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW9uYWxTdGFja3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5nbygtMSAqIGRpc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmNsZWFyRm9yd2FyZCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBDYW5jZWwgc3ViLWZsb3cgdHJhbnNhY3Rpb24uICovXG4gICAgYXN5bmMgY2FuY2VsU3ViRmxvdyhwYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBjb25zdCBzdWJmbG93ID0gdGhpcy5maW5kU3ViRmxvd1BhcmFtcyh0cnVlKTtcbiAgICAgICAgaWYgKCFzdWJmbG93KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gc3ViZmxvdy5wYXJhbXM7XG5cbiAgICAgICAgdGhpcy5fc3ViZmxvd1RyYW5zaXRpb25QYXJhbXMgPSBPYmplY3QuYXNzaWduKHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9LCBwYXJhbXMpO1xuICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogc3ViZmxvdy5kaXN0YW5jZSk7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFNldCBjb21tb24gdHJhbnNpdGlvbiBzZXR0bmlncy4gKi9cbiAgICB0cmFuc2l0aW9uU2V0dGluZ3MobmV3U2V0dGluZ3M/OiBUcmFuc2l0aW9uU2V0dGluZ3MpOiBUcmFuc2l0aW9uU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4udGhpcy5fdHJhbnNpdGlvblNldHRpbmdzIH07XG4gICAgICAgIG5ld1NldHRpbmdzICYmIE9iamVjdC5hc3NpZ24odGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLCBuZXdTZXR0aW5ncyk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogU2V0IGNvbW1vbiBuYXZpZ2F0aW9uIHNldHRuaWdzLiAqL1xuICAgIG5hdmlnYXRpb25TZXR0aW5ncyhuZXdTZXR0aW5ncz86IE5hdmlnYXRpb25TZXR0aW5ncyk6IE5hdmlnYXRpb25TZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi50aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3MgfTtcbiAgICAgICAgbmV3U2V0dGluZ3MgJiYgT2JqZWN0LmFzc2lnbih0aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3MsIG5ld1NldHRpbmdzKTtcbiAgICAgICAgcmV0dXJuIG9sZFNldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiBSZWZyZXNoIHJvdXRlciAoc3BlY2lmeSB1cGRhdGUgbGV2ZWwpLiAqL1xuICAgIGFzeW5jIHJlZnJlc2gobGV2ZWwgPSBSb3V0ZXJSZWZyZXNoTGV2ZWwuUkVMT0FEKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHN3aXRjaCAobGV2ZWwpIHtcbiAgICAgICAgICAgIGNhc2UgUm91dGVyUmVmcmVzaExldmVsLlJFTE9BRDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbygpO1xuICAgICAgICAgICAgY2FzZSBSb3V0ZXJSZWZyZXNoTGV2ZWwuRE9NX0NMRUFSOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWxlYXNlQ2FjaGVDb250ZW50cyh1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZSb3V0ZSAmJiAodGhpcy5fcHJldlJvdXRlLmVsID0gbnVsbCEpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdvKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5zdXBwb3J0ZWQgbGV2ZWw6ICR7bGV2ZWx9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHN1Yi1mbG93XG5cbiAgICAvKiogQGludGVybmFsIGV2YWx1YXRlIHN1Yi1mbG93IHBhcmFtZXRlcnMgKi9cbiAgICBwcml2YXRlIGV2YWx1YXRlU3ViRmxvd1BhcmFtcyhzdWJmbG93OiBSb3V0ZVN1YkZsb3dQYXJhbXMpOiB2b2lkIHtcbiAgICAgICAgbGV0IGFkZGl0aW9uYWxEaXN0YW5jZSA9IDA7XG5cbiAgICAgICAgaWYgKHN1YmZsb3cuYmFzZSkge1xuICAgICAgICAgICAgY29uc3QgYmFzZUlkID0gbm9ybWFsaXplSWQoc3ViZmxvdy5iYXNlKTtcbiAgICAgICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc3QgeyBpbmRleCwgc3RhY2sgfSA9IHRoaXMuX2hpc3Rvcnk7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gaW5kZXg7IGkgPj0gMDsgaS0tLCBhZGRpdGlvbmFsRGlzdGFuY2UrKykge1xuICAgICAgICAgICAgICAgIGlmIChzdGFja1tpXVsnQGlkJ10gPT09IGJhc2VJZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfSU5WQUxJRF9TVUJGTE9XX0JBU0VfVVJMLCBgSW52YWxpZCBzdWItZmxvdyBiYXNlIHVybC4gW3VybDogJHtzdWJmbG93LmJhc2V9XWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3ViZmxvdy5iYXNlID0gdGhpcy5jdXJyZW50Um91dGUudXJsO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbihzdWJmbG93LCB7IGFkZGl0aW9uYWxEaXN0YW5jZSB9KTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGZpbmQgc3ViLWZsb3cgcGFyYW1ldGVycyAqL1xuICAgIHByaXZhdGUgZmluZFN1YkZsb3dQYXJhbXMoZGV0YWNoOiBib29sZWFuKTogeyBkaXN0YW5jZTogbnVtYmVyOyBwYXJhbXM6IFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgJiB7IGFkZGl0aW9uYWxEaXN0YW5jZTogbnVtYmVyOyB9OyB9IHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gdGhpcy5faGlzdG9yeS5zdGFjaztcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YWNrLmxlbmd0aCAtIDEsIGRpc3RhbmNlID0gMDsgaSA+PSAwOyBpLS0sIGRpc3RhbmNlKyspIHtcbiAgICAgICAgICAgIGlmIChzdGFja1tpXS5zdWJmbG93KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gc3RhY2tbaV0uc3ViZmxvdyBhcyBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ICYgeyBhZGRpdGlvbmFsRGlzdGFuY2U6IG51bWJlcjsgfTtcbiAgICAgICAgICAgICAgICBkZXRhY2ggJiYgZGVsZXRlIHN0YWNrW2ldLnN1YmZsb3c7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZGlzdGFuY2UsIHBhcmFtcyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiB0cmFuc2l0aW9uIHV0aWxzXG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBgUm91dGVyRXZlbnRBcmdgIG1ha2VyICovXG4gICAgcHJpdmF0ZSBtYWtlUm91dGVDaGFuZ2VJbmZvKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0Piwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkKTogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCB7XG4gICAgICAgIGNvbnN0IGludGVudCA9IG5ld1N0YXRlLmludGVudDtcbiAgICAgICAgZGVsZXRlIG5ld1N0YXRlLmludGVudDsgLy8gbmF2aWdhdGUg5pmC44Gr5oyH5a6a44GV44KM44GfIGludGVudCDjga8gb25lIHRpbWUg44Gu44G/5pyJ5Yq544Gr44GZ44KLXG5cbiAgICAgICAgY29uc3QgZnJvbSA9IChvbGRTdGF0ZSA/PyB0aGlzLl9sYXN0Um91dGUpIGFzIEFjY2Vzc2libGU8Um91dGVDb250ZXh0LCBzdHJpbmc+IHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB0aGlzLl9oaXN0b3J5LmRpcmVjdChuZXdTdGF0ZVsnQGlkJ10sIGZyb20/LlsnQGlkJ10pLmRpcmVjdGlvbjtcbiAgICAgICAgY29uc3QgYXN5bmNQcm9jZXNzID0gbmV3IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0KCk7XG4gICAgICAgIGNvbnN0IHJlbG9hZCA9IGZyb20gPyBuZXdTdGF0ZS51cmwgPT09IGZyb20udXJsIDogdHJ1ZTtcbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH1cbiAgICAgICAgICAgID0gdGhpcy5fc3ViZmxvd1RyYW5zaXRpb25QYXJhbXMgPz8gKHJlbG9hZFxuICAgICAgICAgICAgICAgID8geyB0cmFuc2l0aW9uOiB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MucmVsb2FkLCByZXZlcnNlOiBmYWxzZSB9XG4gICAgICAgICAgICAgICAgOiAoJ2JhY2snICE9PSBkaXJlY3Rpb24gPyBuZXdTdGF0ZSA6IGZyb20gYXMgUm91dGVDb250ZXh0KSk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJvdXRlcjogdGhpcyxcbiAgICAgICAgICAgIGZyb20sXG4gICAgICAgICAgICB0bzogbmV3U3RhdGUsXG4gICAgICAgICAgICBkaXJlY3Rpb24sXG4gICAgICAgICAgICBhc3luY1Byb2Nlc3MsXG4gICAgICAgICAgICByZWxvYWQsXG4gICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgcmV2ZXJzZSxcbiAgICAgICAgICAgIGludGVudCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGZpbmQgcm91dGUgYnkgdXJsICovXG4gICAgcHJpdmF0ZSBmaW5kUm91dGVDb250ZXh0UGFyYW1zKHBhdGg6IHN0cmluZyk6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgfCB2b2lkIHtcbiAgICAgICAgY29uc3Qga2V5ID0gYC8ke25vcm1hbGl6ZUlkKHBhdGguc3BsaXQoJz8nKVswXSl9YDtcbiAgICAgICAgZm9yIChjb25zdCBwYXRoIG9mIE9iamVjdC5rZXlzKHRoaXMuX3JvdXRlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVnZXhwIH0gPSB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICBpZiAocmVnZXhwLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgcGFnZSBldmVudCAqL1xuICAgIHByaXZhdGUgdHJpZ2dlclBhZ2VDYWxsYmFjayhldmVudDogUGFnZUV2ZW50LCB0YXJnZXQ6IFBhZ2UgfCB1bmRlZmluZWQsIGFyZzogUm91dGUgfCBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IGNhbWVsaXplKGBwYWdlLSR7ZXZlbnR9YCk7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKCh0YXJnZXQgYXMgQWNjZXNzaWJsZTxQYWdlLCBVbmtub3duRnVuY3Rpb24+IHwgdW5kZWZpbmVkKT8uW21ldGhvZF0pKSB7XG4gICAgICAgICAgICBjb25zdCByZXR2YWwgPSAodGFyZ2V0IGFzIEFjY2Vzc2libGU8UGFnZSwgVW5rbm93bkZ1bmN0aW9uPilbbWV0aG9kXShhcmcpO1xuICAgICAgICAgICAgaWYgKHJldHZhbCBpbnN0YW5jZW9mIE5hdGl2ZVByb21pc2UgJiYgKGFyZyBhcyBBY2Nlc3NpYmxlPFJvdXRlPilbJ2FzeW5jUHJvY2VzcyddKSB7XG4gICAgICAgICAgICAgICAgKGFyZyBhcyBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KS5hc3luY1Byb2Nlc3MucmVnaXN0ZXIocmV0dmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgd2FpdCBmcmFtZSAqL1xuICAgIHByaXZhdGUgd2FpdEZyYW1lKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gd2FpdEZyYW1lKDEsIHRoaXMuX3JhZik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiB0cmFuc2l0aW9uIGVudHJhbmNlXG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBwYWdlIG1haW4gcHJvY2VkdXJlICovXG4gICAgcHJpdmF0ZSBhc3luYyBjaGFuZ2VQYWdlKG5leHRSb3V0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIHByZXZSb3V0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2luQ2hhbmdpbmdQYWdlID0gdHJ1ZTtcblxuICAgICAgICAgICAgcGFyc2VVcmxQYXJhbXMobmV4dFJvdXRlKTtcblxuICAgICAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRoaXMubWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXh0Um91dGUsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICB0aGlzLl9zdWJmbG93VHJhbnNpdGlvblBhcmFtcyA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgY29uc3QgW1xuICAgICAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LFxuICAgICAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LFxuICAgICAgICAgICAgXSA9IGF3YWl0IHRoaXMucHJlcGFyZUNoYW5nZUNvbnRleHQoY2hhbmdlSW5mbyk7XG5cbiAgICAgICAgICAgIC8vIHRyYW5zaXRpb24gY29yZVxuICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGF3YWl0IHRoaXMudHJhbnNpdGlvblBhZ2UocGFnZU5leHQsICRlbE5leHQsIHBhZ2VQcmV2LCAkZWxQcmV2LCBjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgdGhpcy51cGRhdGVDaGFuZ2VDb250ZXh0KCRlbE5leHQsICRlbFByZXYsIGNoYW5nZUluZm8sIHRyYW5zaXRpb24pO1xuXG4gICAgICAgICAgICAvLyDpgbfnp7vlhYjjgYwgc3ViZmxvdyDplovlp4vngrnjgafjgYLjgovloLTlkIgsIHN1YmZsb3cg6Kej6ZmkXG4gICAgICAgICAgICBpZiAobmV4dFJvdXRlLnVybCA9PT0gdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk/LnBhcmFtcy5vcmlnaW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHByZWZldGNoIGNvbnRlbnQg44Gu44Kx44KiXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyZWF0UHJlZmV0Y2hDb250ZW50cygpO1xuXG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2luQ2hhbmdpbmdQYWdlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gcHJlcGFyZVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgcHJlcGFyZUNoYW5nZUNvbnRleHQoY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCk6IFByb21pc2U8W1BhZ2UsIERPTSwgUGFnZSwgRE9NXT4ge1xuICAgICAgICBjb25zdCBuZXh0Um91dGUgPSBjaGFuZ2VJbmZvLnRvIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+O1xuICAgICAgICBjb25zdCBwcmV2Um91dGUgPSBjaGFuZ2VJbmZvLmZyb20gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgY29uc3QgeyAnQHBhcmFtcyc6IG5leHRQYXJhbXMgfSA9IG5leHRSb3V0ZTtcbiAgICAgICAgY29uc3QgeyAnQHBhcmFtcyc6IHByZXZQYXJhbXMgfSA9IHByZXZSb3V0ZSA/PyB7fTtcblxuICAgICAgICAvLyBwYWdlIGluc3RhbmNlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZShuZXh0Um91dGUpO1xuICAgICAgICAvLyBwYWdlICR0ZW1wbGF0ZVxuICAgICAgICBhd2FpdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUobmV4dFBhcmFtcyk7XG5cbiAgICAgICAgY2hhbmdlSW5mby5zYW1lUGFnZUluc3RhbmNlID0gcHJldlBhcmFtcz8ucGFnZSAmJiBwcmV2UGFyYW1zLnBhZ2UgPT09IG5leHRQYXJhbXMucGFnZTtcbiAgICAgICAgY29uc3QgeyByZWxvYWQsIHNhbWVQYWdlSW5zdGFuY2UsIGFzeW5jUHJvY2VzcyB9ID0gY2hhbmdlSW5mbztcblxuICAgICAgICAvLyBwYWdlICRlbFxuICAgICAgICBpZiAoIXJlbG9hZCAmJiBzYW1lUGFnZUluc3RhbmNlKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNsb25lQ29udGVudChuZXh0Um91dGUsIG5leHRQYXJhbXMsIHByZXZSb3V0ZSEsIGNoYW5nZUluZm8sIGFzeW5jUHJvY2Vzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIW5leHRSb3V0ZS5lbCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkQ29udGVudChuZXh0Um91dGUsIG5leHRQYXJhbXMsIGNoYW5nZUluZm8sIGFzeW5jUHJvY2Vzcyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZWxOZXh0ID0gJChuZXh0Um91dGUuZWwpO1xuICAgICAgICBjb25zdCBwYWdlTmV4dCA9IG5leHRQYXJhbXMucGFnZSE7XG5cbiAgICAgICAgLy8gbW91bnRcbiAgICAgICAgaWYgKCEkZWxOZXh0LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLm1vdW50Q29udGVudCgkZWxOZXh0LCBwYWdlTmV4dCwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dFxuICAgICAgICAgICAgKHJlbG9hZCAmJiB7fSB8fCAocHJldlBhcmFtcz8ucGFnZSA/PyB7fSkpLCAocmVsb2FkICYmICQobnVsbCkgfHwgJChwcmV2Um91dGU/LmVsKSksIC8vIHByZXZcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBjbG9uZUNvbnRlbnQoXG4gICAgICAgIG5leHRSb3V0ZTogUm91dGVDb250ZXh0LCBuZXh0UGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLFxuICAgICAgICBwcmV2Um91dGU6IFJvdXRlQ29udGV4dCxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgbmV4dFJvdXRlLmVsID0gcHJldlJvdXRlLmVsO1xuICAgICAgICBwcmV2Um91dGUuZWwgPSBuZXh0Um91dGUuZWw/LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgJChwcmV2Um91dGUuZWwpLnJlbW92ZUF0dHIoJ2lkJykuaW5zZXJ0QmVmb3JlKG5leHRSb3V0ZS5lbCk7XG4gICAgICAgICQobmV4dFJvdXRlLmVsKVxuICAgICAgICAgICAgLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLkhJRERFTn1gKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKFtgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YCwgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gXSlcbiAgICAgICAgO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2Nsb25lZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2Nsb25lZCcsIG5leHRQYXJhbXMucGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGxvYWRDb250ZW50KFxuICAgICAgICByb3V0ZTogUm91dGVDb250ZXh0LCBwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgICAgIGFzeW5jUHJvY2VzczogUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGxldCBmaXJlRXZlbnRzID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXJvdXRlLmVsKSB7XG4gICAgICAgICAgICBjb25zdCBlbENhY2hlID0gdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXT8uZWw7XG4gICAgICAgICAgICBmaXJlRXZlbnRzID0gIWVsQ2FjaGU7XG4gICAgICAgICAgICBpZiAoZWxDYWNoZSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvbS1jYWNoZSBjYXNlXG4gICAgICAgICAgICAgICAgcm91dGUuZWwgPSBlbENhY2hlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMuJHRlbXBsYXRlPy5pc0Nvbm5lY3RlZCkgeyAvLyBwcmVmZXRjaCBjYXNlXG4gICAgICAgICAgICAgICAgcm91dGUuZWwgICAgICAgICA9IHBhcmFtcy4kdGVtcGxhdGVbMF07XG4gICAgICAgICAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IHBhcmFtcy4kdGVtcGxhdGUuY2xvbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm91dGUuZWwgPSBwYXJhbXMuJHRlbXBsYXRlIS5jbG9uZSgpWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXBkYXRlIG1hc3RlciBjYWNoZVxuICAgICAgICBpZiAocm91dGUgIT09IHRoaXMuX3JvdXRlc1tyb3V0ZS5wYXRoXVsnQHJvdXRlJ10pIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tyb3V0ZS5wYXRoXVsnQHJvdXRlJ10gPSByb3V0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2xvYWRlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2luaXQnLCBwYXJhbXMucGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIG1vdW50Q29udGVudChcbiAgICAgICAgJGVsOiBET00sIHBhZ2U6IFBhZ2UgfCB1bmRlZmluZWQsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgICAgIGFzeW5jUHJvY2VzczogUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgICRlbC5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5ISURERU59YCk7XG4gICAgICAgIHRoaXMuXyRlbC5hcHBlbmQoJGVsKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdtb3VudGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnbW91bnRlZCcsIHBhZ2UsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1bm1vdW50Q29udGVudChyb3V0ZTogUm91dGVDb250ZXh0KTogdm9pZCB7XG4gICAgICAgIGNvbnN0ICRlbCA9ICQocm91dGUuZWwpO1xuICAgICAgICBjb25zdCBwYWdlID0gcm91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICBpZiAoJGVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAkZWwuZGV0YWNoKCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubW91bnRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygndW5tb3VudGVkJywgcGFnZSwgcm91dGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyb3V0ZS5lbCkge1xuICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5sb2FkZWQnLCByb3V0ZSk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3JlbW92ZWQnLCBwYWdlLCByb3V0ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gY29yZVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJhbnNpdGlvblBhZ2UoXG4gICAgICAgIHBhZ2VOZXh0OiBQYWdlLCAkZWxOZXh0OiBET00sXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGNoYW5nZUluZm8udHJhbnNpdGlvbiA/PyB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MuZGVmYXVsdDtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICAnZW50ZXItZnJvbS1jbGFzcyc6IGN1c3RvbUVudGVyRnJvbUNsYXNzLFxuICAgICAgICAgICAgJ2VudGVyLWFjdGl2ZS1jbGFzcyc6IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItdG8tY2xhc3MnOiBjdXN0b21FbnRlclRvQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtZnJvbS1jbGFzcyc6IGN1c3RvbUxlYXZlRnJvbUNsYXNzLFxuICAgICAgICAgICAgJ2xlYXZlLWFjdGl2ZS1jbGFzcyc6IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtdG8tY2xhc3MnOiBjdXN0b21MZWF2ZVRvQ2xhc3MsXG4gICAgICAgIH0gPSB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3M7XG5cbiAgICAgICAgLy8gZW50ZXItY3NzLWNsYXNzXG4gICAgICAgIGNvbnN0IGVudGVyRnJvbUNsYXNzICAgPSBjdXN0b21FbnRlckZyb21DbGFzcyAgID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5FTlRFUl9GUk9NX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGVudGVyQWN0aXZlQ2xhc3MgPSBjdXN0b21FbnRlckFjdGl2ZUNsYXNzID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5FTlRFUl9BQ1RJVkVfQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJUb0NsYXNzICAgICA9IGN1c3RvbUVudGVyVG9DbGFzcyAgICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX1RPX0NMQVNTfWA7XG5cbiAgICAgICAgLy8gbGVhdmUtY3NzLWNsYXNzXG4gICAgICAgIGNvbnN0IGxlYXZlRnJvbUNsYXNzICAgPSBjdXN0b21MZWF2ZUZyb21DbGFzcyAgID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5MRUFWRV9GUk9NX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGxlYXZlQWN0aXZlQ2xhc3MgPSBjdXN0b21MZWF2ZUFjdGl2ZUNsYXNzID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5MRUFWRV9BQ1RJVkVfQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVUb0NsYXNzICAgICA9IGN1c3RvbUxlYXZlVG9DbGFzcyAgICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX1RPX0NMQVNTfWA7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5iZWdpblRyYW5zaXRpb24oXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICBjaGFuZ2VJbmZvLFxuICAgICAgICApO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgLy8gdHJhbnNpc2lvbiBleGVjdXRpb25cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uKCRlbE5leHQsIGVudGVyRnJvbUNsYXNzLCBlbnRlckFjdGl2ZUNsYXNzLCBlbnRlclRvQ2xhc3MpLFxuICAgICAgICAgICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uKCRlbFByZXYsIGxlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLCBsZWF2ZVRvQ2xhc3MpLFxuICAgICAgICBdKTtcblxuICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuZW5kVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LFxuICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBjaGFuZ2VJbmZvLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0cmFuc2l0aW9uO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogYmVnaW4gKi9cbiAgICBwcml2YXRlIGFzeW5jIGJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSwgZW50ZXJGcm9tQ2xhc3M6IHN0cmluZywgZW50ZXJBY3RpdmVDbGFzczogc3RyaW5nLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLCBsZWF2ZUZyb21DbGFzczogc3RyaW5nLCBsZWF2ZUFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuXyRlbC5hZGRDbGFzcyhbXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YCxcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fRElSRUNUSU9OfS0ke2RlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24oY2hhbmdlSW5mbyl9YCxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgJGVsTmV4dFxuICAgICAgICAgICAgLmFkZENsYXNzKFtlbnRlckZyb21DbGFzcywgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLkhJRERFTn1gKVxuICAgICAgICAgICAgLnJlZmxvdygpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoZW50ZXJBY3RpdmVDbGFzcylcbiAgICAgICAgO1xuICAgICAgICAkZWxQcmV2LmFkZENsYXNzKFtsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcywgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcblxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JlZm9yZS10cmFuc2l0aW9uJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2JlZm9yZS1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyYW5zaXRpb24gcHJvYyA6IGVuZCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZW5kVHJhbnNpdGlvbihcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgKCRlbE5leHRbMF0gIT09ICRlbFByZXZbMF0pICYmICRlbFByZXYuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuSElEREVOfWApO1xuICAgICAgICAkZWxOZXh0LnJlbW92ZUNsYXNzKFtgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuICAgICAgICAkZWxQcmV2LnJlbW92ZUNsYXNzKFtgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuXG4gICAgICAgIHRoaXMuXyRlbC5yZW1vdmVDbGFzcyhbXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YCxcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fRElSRUNUSU9OfS0ke2RlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24oY2hhbmdlSW5mbyl9YCxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1sZWF2ZScsIHBhZ2VQcmV2LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdhZnRlci10cmFuc2l0aW9uJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiB0cmFuc2l0aW9uIGZpbmFsaXplXG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSBwYWdlIHN0YXR1cyBhZnRlciB0cmFuc2l0aW9uICovXG4gICAgcHJpdmF0ZSB1cGRhdGVDaGFuZ2VDb250ZXh0KFxuICAgICAgICAkZWxOZXh0OiBET00sXG4gICAgICAgICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgdHJhbnNpdGlvbjogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGZyb20sIHJlbG9hZCwgc2FtZVBhZ2VJbnN0YW5jZSwgZGlyZWN0aW9uLCB0byB9ID0gY2hhbmdlSW5mbztcbiAgICAgICAgY29uc3QgcHJldlJvdXRlID0gZnJvbSBhcyBSb3V0ZUNvbnRleHQ7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IHRvIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgY29uc3QgdXJsQ2hhbmdlZCA9ICFyZWxvYWQ7XG5cblxuICAgICAgICBpZiAoJGVsTmV4dFswXSAhPT0gJGVsUHJldlswXSkge1xuICAgICAgICAgICAgLy8gdXBkYXRlIGNsYXNzXG4gICAgICAgICAgICAkZWxQcmV2XG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWApXG4gICAgICAgICAgICA7XG4gICAgICAgICAgICAkZWxOZXh0LmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gKTtcblxuICAgICAgICAgICAgaWYgKHVybENoYW5nZWQgJiYgdGhpcy5fcHJldlJvdXRlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlLmVsPy5jbGFzc0xpc3QucmVtb3ZlKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVhdERvbUNhY2hlQ29udGVudHMobmV4dFJvdXRlLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVybENoYW5nZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZSb3V0ZSA9IHByZXZSb3V0ZTtcbiAgICAgICAgICAgIGlmIChzYW1lUGFnZUluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgJGVsUHJldi5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICAkZWxOZXh0LmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlICYmICh0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsISk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9sYXN0Um91dGUgPSB0aGlzLmN1cnJlbnRSb3V0ZSBhcyBSb3V0ZUNvbnRleHQ7XG4gICAgICAgICdmb3J3YXJkJyA9PT0gZGlyZWN0aW9uICYmIHRyYW5zaXRpb24gJiYgKHRoaXMuX2xhc3RSb3V0ZS50cmFuc2l0aW9uID0gdHJhbnNpdGlvbik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiBwcmVmZXRjaCAmIGRvbSBjYWNoZVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1bnNldCBkb20gY2FjaGVkIGNvbnRlbnRzICovXG4gICAgcHJpdmF0ZSByZWxlYXNlQ2FjaGVDb250ZW50cyhlbDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5fcm91dGVzKSkge1xuICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0aGlzLl9yb3V0ZXNba2V5XVsnQHJvdXRlJ10gYXMgUm91dGVDb250ZXh0IHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKHJvdXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bm1vdW50Q29udGVudChyb3V0ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyb3V0ZS5lbCA9PT0gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiB0aGlzLl9oaXN0b3J5LnN0YWNrKSB7XG4gICAgICAgICAgICBpZiAoKG51bGwgPT0gZWwgJiYgcm91dGUuZWwpIHx8IHJvdXRlLmVsID09PSBlbCkge1xuICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gbnVsbCE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGRlc3RydWN0aW9uIG9mIGRvbSBhY2NvcmRpbmcgdG8gY29uZGl0aW9uICovXG4gICAgcHJpdmF0ZSB0cmVhdERvbUNhY2hlQ29udGVudHMobmV4dFJvdXRlOiBSb3V0ZUNvbnRleHQsIHByZXZSb3V0ZTogUm91dGVDb250ZXh0KTogdm9pZCB7XG4gICAgICAgIGlmIChwcmV2Um91dGUuZWwgJiYgcHJldlJvdXRlLmVsICE9PSB0aGlzLmN1cnJlbnRSb3V0ZS5lbCkge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChwcmV2Um91dGUuZWwpO1xuICAgICAgICAgICAgY29uc3QgY2FjaGVMdiA9ICRlbC5kYXRhKERvbUNhY2hlLkRBVEFfTkFNRSk7XG4gICAgICAgICAgICBpZiAoRG9tQ2FjaGUuQ0FDSEVfTEVWRUxfQ09OTkVDVCAhPT0gY2FjaGVMdikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2UgPSBwcmV2Um91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgICRlbC5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaXJlRXZlbnRzID0gcHJldlJvdXRlWydAcGFyYW1zJ10ucGFnZSAhPT0gbmV4dFJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICBpZiAoZmlyZUV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubW91bnRlZCcsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygndW5tb3VudGVkJywgcGFnZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKERvbUNhY2hlLkNBQ0hFX0xFVkVMX01FTU9SWSAhPT0gY2FjaGVMdikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbGVhc2VDYWNoZUNvbnRlbnRzKHByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICAgICAgICAgIHByZXZSb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlyZUV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3JlbW92ZWQnLCBwYWdlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgZG9tIHByZWZldGNoZWQgY29udGVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIHNldFByZWZldGNoQ29udGVudHMocGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgdG9Sb3V0ZSA9IChwYXJhbTogUm91dGVDb250ZXh0UGFyYW1ldGVycywgZWw6IEhUTUxFbGVtZW50KTogUm91dGVDb250ZXh0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRvUm91dGVDb250ZXh0KHBhcmFtLnByZWZldGNoISwgdGhpcywgcGFyYW0pO1xuICAgICAgICAgICAgY3R4LmVsID0gZWw7XG4gICAgICAgICAgICByZXR1cm4gY3R4O1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRvUm91dGVDaGFuZ2VJbmZvID0gKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgICAgIHRvOiByb3V0ZSxcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb246ICdub25lJyxcbiAgICAgICAgICAgICAgICBhc3luY1Byb2Nlc3M6IG5ldyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCgpLFxuICAgICAgICAgICAgICAgIHJlbG9hZDogZmFsc2UsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zKSB7XG4gICAgICAgICAgICBjb25zdCBlbFJvdXRlID0gcGFyYW1bJ0Byb3V0ZSddPy5lbDtcbiAgICAgICAgICAgIGlmICghZWxSb3V0ZSB8fCAodGhpcy5jdXJyZW50Um91dGUuZWwgIT09IGVsUm91dGUgJiYgdGhpcy5fbGFzdFJvdXRlPy5lbCAhPT0gZWxSb3V0ZSAmJiB0aGlzLl9wcmV2Um91dGU/LmVsICE9PSBlbFJvdXRlKSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShwYXJhbSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSBwYXJhbS4kdGVtcGxhdGUhWzBdO1xuICAgICAgICAgICAgICAgIGlmICghZWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0b1JvdXRlKHBhcmFtLCBlbCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZShyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0b1JvdXRlQ2hhbmdlSW5mbyhyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICAgICAgICAgICAgICAvLyBsb2FkICYgaW5pdFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDb250ZW50KHJvdXRlLCBwYXJhbSwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW91bnRcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5tb3VudENvbnRlbnQoJChlbCksIHBhcmFtLnBhZ2UsIGNoYW5nZUluZm8sIGFzeW5jUHJvY2Vzcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBsb2FkIHByZWZldGNoIGRvbSBjb250ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJlYXRQcmVmZXRjaENvbnRlbnRzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAvLyDpgbfnp7vlhYjjgYvjgokgcHJlZmV0Y2ggY29udGVudCDjgpLmpJzlh7pcbiAgICAgICAgY29uc3QgcHJlZmV0Y2hQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5jdXJyZW50Um91dGUuZWw/LnF1ZXJ5U2VsZWN0b3JBbGwoYFtkYXRhLSR7TGlua0RhdGEuUFJFRkVUQ0h9XWApID8/IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRhcmdldHMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgaWYgKGZhbHNlICE9PSAkZWwuZGF0YShMaW5rRGF0YS5QUkVGRVRDSCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSAkZWwuYXR0cignaHJlZicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmwhKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5wcmVmZXRjaCA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgcHJlZmV0Y2hQYXJhbXMucHVzaChwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNldFByZWZldGNoQ29udGVudHMocHJlZmV0Y2hQYXJhbXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYGNoYW5naW5nYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlDaGFuZ2luZyhuZXh0U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBjYW5jZWw6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9pbkNoYW5naW5nUGFnZSkge1xuICAgICAgICAgICAgY2FuY2VsKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9CVVNZKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRoaXMubWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXh0U3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1jaGFuZ2UnLCBjaGFuZ2VJbmZvLCBjYW5jZWwpO1xuICAgICAgICBwcm9taXNlcy5wdXNoKC4uLmNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLnByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgcmVmcmVzaGAgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5UmVmcmVzaChuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCwgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbnN1cmUgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+KTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgcGF0aCAgPSBgLyR7c3RhdGVbJ0BpZCddfWA7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXMocGF0aCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVELCBgUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLiBbcGF0aDogJHtwYXRofV1gLCBzdGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBzdGF0ZVsnQHBhcmFtcyddKSB7XG4gICAgICAgICAgICAgICAgLy8gUm91dGVDb250ZXh0UGFyYW1ldGVyIOOCkiBhc3NpZ25cbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHN0YXRlLCB0b1JvdXRlQ29udGV4dChwYXRoLCB0aGlzLCBwYXJhbXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGlkIOOBq+e0kOOBpeOBj+imgee0oOOBjOOBmeOBp+OBq+WtmOWcqOOBmeOCi+WgtOWQiOOBr+WJsuOCiuW9k+OBplxuICAgICAgICAgICAgc3RhdGUuZWwgPz89IHRoaXMuX2hpc3RvcnkuZGlyZWN0KHN0YXRlWydAaWQnXSk/LnN0YXRlPy5lbDtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PjtcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gc2NoZWR1bGluZyBgcmVmcmVzaGAgZG9uZS5cbiAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5jaGFuZ2VQYWdlKGVuc3VyZShuZXdTdGF0ZSksIG9sZFN0YXRlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZXJyb3IgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IYW5kbGVFcnJvcihlcnJvcjogdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLnB1Ymxpc2goXG4gICAgICAgICAgICAnZXJyb3InLFxuICAgICAgICAgICAgaXNSZXN1bHQoZXJyb3IpID8gZXJyb3IgOiBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicsIGVycm9yKVxuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGFuY2hvciBjbGljayBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkFuY2hvckNsaWNrZWQoZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpLmNsb3Nlc3QoJ1tocmVmXScpO1xuICAgICAgICBpZiAoJHRhcmdldC5kYXRhKExpbmtEYXRhLlBSRVZFTlRfUk9VVEVSKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBjb25zdCB1cmwgICAgICAgID0gJHRhcmdldC5hdHRyKCdocmVmJyk7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSAkdGFyZ2V0LmRhdGEoTGlua0RhdGEuVFJBTlNJVElPTikgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBtZXRob2QgICAgID0gJHRhcmdldC5kYXRhKExpbmtEYXRhLk5BVklBR0FURV9NRVRIT0QpIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbWV0aG9kT3B0cyA9ICgncHVzaCcgPT09IG1ldGhvZCB8fCAncmVwbGFjZScgPT09IG1ldGhvZCA/IHsgbWV0aG9kIH0gOiB7fSkgYXMgTmF2aWdhdGlvblNldHRpbmdzO1xuXG4gICAgICAgIGlmICgnIycgPT09IHVybCkge1xuICAgICAgICAgICAgdm9pZCB0aGlzLmJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5uYXZpZ2F0ZSh1cmwhLCB7IHRyYW5zaXRpb24sIC4uLm1ldGhvZE9wdHMgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNpbGVudCBldmVudCBsaXN0bmVyIHNjb3BlICovXG4gICAgcHJpdmF0ZSBhc3luYyBzdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShleGVjdXRvcjogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dW5rbm93bj4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBleGVjdXRvcigpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSB7QGxpbmsgUm91dGVyfSBvYmplY3QuXG4gKiBAamEge0BsaW5rIFJvdXRlcn0g44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zfSBvYmplY3RcbiAqICAtIGBqYWAge0BsaW5rIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUm91dGVyKHNlbGVjdG9yOiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD4sIG9wdGlvbnM/OiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKTogUm91dGVyIHtcbiAgICByZXR1cm4gbmV3IFJvdXRlckNvbnRleHQoc2VsZWN0b3IsIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBzdGFydDogdHJ1ZSxcbiAgICB9LCBvcHRpb25zKSk7XG59XG4iXSwibmFtZXMiOlsic2FmZSIsIkRlZmVycmVkIiwiYXQiLCJzb3J0Iiwibm9vcCIsIndlYlJvb3QiLCIkY2RwIiwiaXNPYmplY3QiLCIkc2lnbmF0dXJlIiwiRXZlbnRQdWJsaXNoZXIiLCJ0b0lkIiwidG9VcmwiLCJDYW5jZWxUb2tlbiIsInBvc3QiLCJpc0FycmF5IiwicGF0aDJyZWdleHAiLCJpc1N0cmluZyIsInRvUXVlcnlTdHJpbmdzIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwicGFyc2VVcmxRdWVyeSIsImFzc2lnblZhbHVlIiwiY29udmVydFVybFBhcmFtVHlwZSIsImlzRnVuY3Rpb24iLCIkIiwidG9UZW1wbGF0ZUVsZW1lbnQiLCJsb2FkVGVtcGxhdGVTb3VyY2UiLCJzbGVlcCIsImNhbWVsaXplIiwiTmF0aXZlUHJvbWlzZSIsIndhaXRGcmFtZSIsImlzUmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFHRztJQUVILENBQUEsWUFBcUI7SUFNakI7OztJQUdHO0lBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtJQUFBLElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsb0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxvQkFBNkM7WUFDN0MsV0FBQSxDQUFBLFdBQUEsQ0FBQSxvQ0FBQSxDQUFBLEdBQTRDLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBQSxHQUFBLDZCQUF1QixFQUFBLGdDQUF5QixDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQSxHQUFBLG9DQUFBO1lBQzdJLFdBQUEsQ0FBQSxXQUFBLENBQUEsMkNBQUEsQ0FBQSxHQUE0QyxXQUFBLENBQUEsa0JBQWtCLENBQUEsR0FBQSw2QkFBdUIsRUFBQSxnQ0FBeUIsQ0FBQyxFQUFFLDJCQUEyQixDQUFDLENBQUEsR0FBQSwyQ0FBQTtZQUM3SSxXQUFBLENBQUEsV0FBQSxDQUFBLGtDQUFBLENBQUEsR0FBNEMsV0FB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