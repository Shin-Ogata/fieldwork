/*!
 * @cdp/router 0.9.17
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
        /** @internal convert to ID */
        toId(src) {
            return 'hash' === this._mode ? toHash(src) : toPath(src);
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
            const keys = [];
            seed.regexp = extensionPath2regexp.path2regexp.pathToRegexp(seed.path, keys);
            seed.paramKeys = keys.filter(k => coreUtils.isString(k.name)).map(k => k.name);
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
    const buildNavigateUrl = (path, options) => {
        try {
            path = `/${normalizeId(path)}`;
            const { query, params } = options;
            let url = extensionPath2regexp.path2regexp.compile(path)(params ?? {});
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
                // eslint-disable-next-line @typescript-eslint/await-thenable
                params.page = await new component(route, componentOptions);
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
        else {
            const $el = dom.dom(content);
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
        async pushPageStack(stack, noNavigate) {
            try {
                const stacks = coreUtils.isArray(stack) ? stack : [stack];
                const routes = stacks.filter(s => !!s.route).map(s => s.route);
                // ensrue Route
                this.register(routes, false);
                await this.suppressEventListenerScope(async () => {
                    // push history
                    for (const page of stacks) {
                        const { url, transition, reverse } = page;
                        const params = this.findRouteContextParams(url);
                        if (null == params) {
                            throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, page);
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
                    for (const route of this._history.stack) {
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
        // private methods: transition
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
            const method = coreUtils.camelize(`page-${event}`);
            if (coreUtils.isFunction(target?.[method])) {
                const retval = target?.[method](arg);
                if (retval instanceof promise.NativePromise && arg['asyncProcess']) {
                    arg.asyncProcess.register(retval);
                }
            }
        }
        /** @internal wait frame */
        waitFrame() {
            return webUtils.waitFrame(1, this._raf);
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
                    nextRoute.el = prevRoute.el;
                    prevRoute.el = nextRoute.el?.cloneNode(true);
                    dom.dom(prevRoute.el).insertBefore(nextRoute.el);
                    dom.dom(nextRoute.el).attr('aria-hidden', true).removeClass([`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`, `${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`]);
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
            const $elNext = dom.dom(nextRoute.el);
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
                (reload && {} || (prevParams?.page ?? {})), (reload && dom.dom(null) || dom.dom(prevRoute?.el)), // prev
            ];
        }
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
                    const $el = dom.dom(this._prevRoute.el);
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
                const url = `/${state['@id']}`;
                const params = this.findRouteContextParams(url);
                if (null == params) {
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, state);
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
    Object.keys(extensionPath2regexp).forEach(function (k) {
        if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionPath2regexp[k]; }
        });
    });

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaGlzdG9yeS9pbnRlcm5hbC50cyIsImhpc3Rvcnkvc2Vzc2lvbi50cyIsImhpc3RvcnkvbWVtb3J5LnRzIiwicm91dGVyL2ludGVybmFsLnRzIiwicm91dGVyL2FzeW5jLXByb2Nlc3MudHMiLCJyb3V0ZXIvY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFJPVVRFUiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDE1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1JPVVRFUl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5EICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDEsICdyb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMiwgJ1JvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAzLCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDQsICdJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0JVU1kgICAgICAgICAgICAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDUsICdJbiBjaGFuZ2luZyBwYWdlIHByb2Nlc3Mgbm93LicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4iLCJpbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGF0LFxuICAgIHNvcnQsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEhpc3RvcnlTdGF0ZSwgSGlzdG9yeURpcmVjdFJldHVyblR5cGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIG5vcm1hbHppZSBpZCBzdHJpbmcgKi9cbmV4cG9ydCBjb25zdCBub3JtYWxpemVJZCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgLy8gcmVtb3ZlIGhlYWQgb2YgXCIjXCIsIFwiL1wiLCBcIiMvXCIgYW5kIHRhaWwgb2YgXCIvXCJcbiAgICByZXR1cm4gc3JjLnJlcGxhY2UoL14oI1xcLyl8XlsjL118XFxzKyQvLCAnJykucmVwbGFjZSgvXlxccyskfChcXC8kKS8sICcnKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIHN0YWNrICovXG5leHBvcnQgY29uc3QgY3JlYXRlRGF0YSA9IDxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IEhpc3RvcnlTdGF0ZTxUPiA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oeyAnQGlkJzogbm9ybWFsaXplSWQoaWQpIH0sIHN0YXRlKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIHVuY2FuY2VsbGFibGUgZGVmZXJyZWQgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQgPSAod2Fybjogc3RyaW5nKTogRGVmZXJyZWQgPT4ge1xuICAgIGNvbnN0IHVuY2FuY2VsbGFibGUgPSBuZXcgRGVmZXJyZWQoKSBhcyBXcml0YWJsZTxEZWZlcnJlZD47XG4gICAgdW5jYW5jZWxsYWJsZS5yZWplY3QgPSAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUud2Fybih3YXJuKTtcbiAgICAgICAgdW5jYW5jZWxsYWJsZS5yZXNvbHZlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gdW5jYW5jZWxsYWJsZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgYXNzaWduIHN0YXRlIGVsZW1lbnQgaWYgYWxyZWFkeSBleGlzdHMgKi9cbmV4cG9ydCBjb25zdCBhc3NpZ25TdGF0ZUVsZW1lbnQgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZSwgc3RhY2s6IEhpc3RvcnlTdGFjayk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGVsID0gc3RhY2suZGlyZWN0KHN0YXRlWydAaWQnXSk/LnN0YXRlPy5lbDtcbiAgICAoIXN0YXRlLmVsICYmIGVsKSAmJiAoc3RhdGUuZWwgPSBlbCk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWwgc3RhY2sgbWFuYWdlbWVudCBjb21tb24gY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIEhpc3RvcnlTdGFjazxUID0gUGxhaW5PYmplY3Q+IHtcbiAgICBwcml2YXRlIF9zdGFjazogSGlzdG9yeVN0YXRlPFQ+W10gPSBbXTtcbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlzdGFuY2UoMCk7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGVbJ0BpZCddO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIHNldCBpbmRleChpZHg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IE1hdGgudHJ1bmMoaWR4KTtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBhcnJheSgpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zbGljZSgpO1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBwb3NpdGlvbiBpbiBzdGFjayBpcyBmaXJzdCBvciBub3QgKi9cbiAgICBnZXQgaXNGaXJzdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIDAgPT09IHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBwb3NpdGlvbiBpbiBzdGFjayBpcyBsYXN0IG9yIG5vdCAqL1xuICAgIGdldCBpc0xhc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleCA9PT0gdGhpcy5fc3RhY2subGVuZ3RoIC0gMTtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgcHVibGljIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5fc3RhY2ssIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogY2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC4gKi9cbiAgICBwdWJsaWMgY2xlYXJGb3J3YXJkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjayA9IHRoaXMuX3N0YWNrLnNsaWNlKDAsIHRoaXMuX2luZGV4ICsgMSk7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuICovXG4gICAgcHVibGljIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICAgICAgICBjb25zdCB7IF9pbmRleDogYmFzZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IHRoaXMuX3N0YWNrXG4gICAgICAgICAgICAubWFwKChzLCBpbmRleCkgPT4geyByZXR1cm4geyBpbmRleCwgZGlzdGFuY2U6IE1hdGguYWJzKGJhc2UgLSBpbmRleCksIC4uLnMgfTsgfSlcbiAgICAgICAgICAgIC5maWx0ZXIocyA9PiBzWydAaWQnXSA9PT0gaWQpXG4gICAgICAgIDtcbiAgICAgICAgc29ydChjYW5kaWRhdGVzLCAobCwgcikgPT4gKGwuZGlzdGFuY2UgPiByLmRpc3RhbmNlID8gMSA6IC0xKSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGVzWzBdPy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogcmV0dXJuIGNsb3NldCBzdGFjayBpbmZvcm1hdGlvbiBieSB0byBJRCBhbmQgZnJvbSBJRC4gKi9cbiAgICBwdWJsaWMgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICBjb25zdCB0b0luZGV4ICAgPSB0aGlzLmNsb3Nlc3QodG9JZCk7XG4gICAgICAgIGNvbnN0IGZyb21JbmRleCA9IG51bGwgPT0gZnJvbUlkID8gdGhpcy5faW5kZXggOiB0aGlzLmNsb3Nlc3QoZnJvbUlkKTtcbiAgICAgICAgaWYgKG51bGwgPT0gZnJvbUluZGV4IHx8IG51bGwgPT0gdG9JbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uOiAnbWlzc2luZycgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gdG9JbmRleCAtIGZyb21JbmRleDtcbiAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IDAgPT09IGRlbHRhXG4gICAgICAgICAgICAgICAgPyAnbm9uZSdcbiAgICAgICAgICAgICAgICA6IGRlbHRhIDwgMCA/ICdiYWNrJyA6ICdmb3J3YXJkJztcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbiwgZGVsdGEsIGluZGV4OiB0b0luZGV4LCBzdGF0ZTogdGhpcy5fc3RhY2tbdG9JbmRleF0gfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBnZXQgYWN0aXZlIGRhdGEgZnJvbSBjdXJyZW50IGluZGV4IG9yaWdpbiAqL1xuICAgIHB1YmxpYyBkaXN0YW5jZShkZWx0YTogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgY29uc3QgcG9zID0gdGhpcy5faW5kZXggKyBkZWx0YTtcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBpbnZhbGlkIGFycmF5IGluZGV4LiBbbGVuZ3RoOiAke3RoaXMubGVuZ3RofSwgZ2l2ZW46ICR7cG9zfV1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hdChwb3MpO1xuICAgIH1cblxuICAgIC8qKiBub29wIHN0YWNrICovXG4gICAgcHVibGljIG5vb3BTdGFjayA9IG5vb3A7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1lbWJlci1hY2Nlc3NpYmlsaXR5XG5cbiAgICAvKiogcHVzaCBzdGFjayAqL1xuICAgIHB1YmxpYyBwdXNoU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrWysrdGhpcy5faW5kZXhdID0gZGF0YTtcbiAgICB9XG5cbiAgICAvKiogcmVwbGFjZSBzdGFjayAqL1xuICAgIHB1YmxpYyByZXBsYWNlU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrW3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHNlZWsgc3RhY2sgKi9cbiAgICBwdWJsaWMgc2Vla1N0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuY2xvc2VzdChkYXRhWydAaWQnXSk7XG4gICAgICAgIGlmIChudWxsID09IGluZGV4KSB7XG4gICAgICAgICAgICB0aGlzLnB1c2hTdGFjayhkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZGlzcG9zZSBvYmplY3QgKi9cbiAgICBwdWJsaWMgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2subGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faW5kZXggPSBOYU47XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBBY2Nlc3NpYmxlLFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzT2JqZWN0LFxuICAgIG5vb3AsXG4gICAgJGNkcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyB0b1VybCwgd2ViUm9vdCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgbm9ybWFsaXplSWQsXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uICovXG5pbnRlcmZhY2UgRGlzcGF0Y2hJbmZvPFQ+IHtcbiAgICBkZjogRGVmZXJyZWQ7XG4gICAgbmV3SWQ6IHN0cmluZztcbiAgICBvbGRJZDogc3RyaW5nO1xuICAgIHBvc3Rwcm9jOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2Vlayc7XG4gICAgbmV4dFN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xuICAgIHByZXZTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb25zdGFudCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgSEFTSF9QUkVGSVggPSAnIy8nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCByZW1vdmUgdXJsIHBhdGggc2VjdGlvbiAqL1xuY29uc3QgdG9IYXNoID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBpZCA9IC8jLiokLy5leGVjKHVybCk/LlswXTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiAnJztcbn07XG5cbi8qKiBAaW50ZXJuYWwgcmVtb3ZlIHVybCBwYXRoIHNlY3Rpb24gKi9cbmNvbnN0IHRvUGF0aCA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgaWQgPSB1cmwuc3Vic3RyaW5nKHdlYlJvb3QubGVuZ3RoKTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiB1cmw7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzZXREaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4sIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFQgPT4ge1xuICAgIChzdGF0ZVskY2RwXSBhcyBEaXNwYXRjaEluZm88VD4pID0gYWRkaXRpb25hbDtcbiAgICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBwYXJzZURpc3BhdGNoSW5mbyA9IDxUPihzdGF0ZTogQWNjZXNzaWJsZTxUPik6IFtULCBEaXNwYXRjaEluZm88VD4/XSA9PiB7XG4gICAgaWYgKGlzT2JqZWN0KHN0YXRlKSAmJiBzdGF0ZVskY2RwXSkge1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsID0gc3RhdGVbJGNkcF07XG4gICAgICAgIGRlbGV0ZSBzdGF0ZVskY2RwXTtcbiAgICAgICAgcmV0dXJuIFtzdGF0ZSwgYWRkaXRpb25hbCBhcyBEaXNwYXRjaEluZm88VD5dO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbc3RhdGVdO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdTZXNzaW9uSGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX21vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb3BTdGF0ZUhhbmRsZXI6IChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcbiAgICBwcml2YXRlIF9kZkdvPzogRGVmZXJyZWQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdpbmRvd0NvbnR4dDogV2luZG93LCBtb2RlOiAnaGFzaCcgfCAnaGlzdG9yeScsIGlkPzogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbmRvd0NvbnR4dDtcbiAgICAgICAgdGhpcy5fbW9kZSA9IG1vZGU7XG5cbiAgICAgICAgdGhpcy5fcG9wU3RhdGVIYW5kbGVyID0gdGhpcy5vblBvcFN0YXRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCA/PyB0aGlzLnRvSWQodGhpcy5fd2luZG93LmxvY2F0aW9uLmhyZWYpLCBzdGF0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGlzcG9zZSBvYmplY3RcbiAgICAgKi9cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zdGFjay5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMub2ZmKCk7XG4gICAgICAgIGRlbGV0ZSAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0IGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyByZXNldChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKE51bWJlci5pc05hTih0aGlzLmluZGV4KSB8fCB0aGlzLl9zdGFjay5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBzaWxlbnQgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgcHJldlN0YXRlID0gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICBjb25zdCBuZXdVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4gPSB7XG4gICAgICAgICAgICAgICAgZGY6IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCgnU2Vzc2lvbkhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdGhpcy50b0lkKG5ld1VSTCksXG4gICAgICAgICAgICAgICAgb2xkSWQ6IHRoaXMudG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiAnbm9vcCcsXG4gICAgICAgICAgICAgICAgcHJldlN0YXRlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKHRoaXMuc3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUhpc3Rvcnk8VD5cblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmlkO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBzdGFjaygpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hcnJheTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzRmlyc3Q7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0xhc3Q7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXQoaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIC8vIGlmIGFscmVhZHkgY2FsbGVkLCBubyByZWFjdGlvbi5cbiAgICAgICAgaWYgKHRoaXMuX2RmR28pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgZ2l2ZW4gMCwganVzdCByZWxvYWQuXG4gICAgICAgIGlmICghZGVsdGEpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgncmVmcmVzaCcsIHRoaXMuc3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fZGZHbztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJGb3J3YXJkSGlzdG9yeSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgpLmjIflrprjgZfjgabjgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIElEICovXG4gICAgcHJpdmF0ZSB0b0lkKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdoYXNoJyA9PT0gdGhpcy5fbW9kZSA/IHRvSGFzaChzcmMpIDogdG9QYXRoKHNyYyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFVSTCAqL1xuICAgIHByaXZhdGUgdG9VcmwoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAoJ2hhc2gnID09PSB0aGlzLl9tb2RlKSA/IGAke0NvbnN0LkhBU0hfUFJFRklYfSR7aWR9YCA6IHRvVXJsKGlkKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgZXZlbnQgJiB3YWl0IHByb2Nlc3MgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyaWdnZXJFdmVudEFuZFdhaXQoXG4gICAgICAgIGV2ZW50OiAncmVmcmVzaCcgfCAnY2hhbmdpbmcnLFxuICAgICAgICBhcmcxOiBIaXN0b3J5U3RhdGU8VD4sXG4gICAgICAgIGFyZzI6IEhpc3RvcnlTdGF0ZTxUPiB8IHVuZGVmaW5lZCB8ICgocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCksXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKGV2ZW50LCBhcmcxLCBhcmcyIGFzIGFueSwgcHJvbWlzZXMpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24sIGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcblxuICAgICAgICBjb25zdCBkYXRhID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZCA9IGRhdGFbJ0BpZCddO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgZGF0YVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgICAgIGhpc3RvcnlbYCR7bWV0aG9kfVN0YXRlYF0oZGF0YSwgJycsIHRoaXMudG9VcmwoaWQpKTtcbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQoZGF0YSwgdGhpcy5fc3RhY2sgYXMgSGlzdG9yeVN0YWNrKTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBuZXcgRGVmZXJyZWQoY2FuY2VsKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdGhpcy50b0lkKG5ld1VSTCksXG4gICAgICAgICAgICAgICAgb2xkSWQ6IHRoaXMudG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgbmV4dFN0YXRlOiBkYXRhLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKGRhdGEsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0oZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGRpc3BhdGNoIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBkaXNwYXRjaENoYW5nZUluZm8obmV3U3RhdGU6IEFjY2Vzc2libGU8VD4sIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IHNldERpc3BhdGNoSW5mbyhuZXdTdGF0ZSwgYWRkaXRpb25hbCk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBQb3BTdGF0ZUV2ZW50KCdwb3BzdGF0ZScsIHsgc3RhdGUgfSkpO1xuICAgICAgICBhd2FpdCBhZGRpdGlvbmFsLmRmO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IHBvcHN0YXRlIGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPikgPT4gUHJvbWlzZTx2b2lkPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgICAgIGNvbnN0IHdhaXRQb3BTdGF0ZSA9ICgpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIChldjogUG9wU3RhdGVFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShldi5zdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IGV4ZWN1dG9yKHdhaXRQb3BTdGF0ZSk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCByb2xsYmFjayBoaXN0b3J5ICovXG4gICAgcHJpdmF0ZSBhc3luYyByb2xsYmFja0hpc3RvcnkobWV0aG9kOiBzdHJpbmcsIG5ld0lkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlICdyZXBsYWNlJzpcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZSh0aGlzLnN0YXRlLCAnJywgdGhpcy50b1VybCh0aGlzLmlkKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdwdXNoJzpcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgIGhpc3RvcnkuZ28oLTEpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gdGhpcy5pbmRleCAtIHRoaXMuY2xvc2VzdChuZXdJZCkhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCAhPT0gZGVsdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWx0YSAmJiBoaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY2xlYXIgZm9yd2FyZCBzZXNzaW9uIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LiAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2xlYXJGb3J3YXJkSGlzdG9yeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNPcmlnaW4gPSAoc3Q6IEFjY2Vzc2libGU8dW5rbm93bj4pOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Q/LlsnQG9yaWdpbiddIGFzIGJvb2xlYW47XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IGhpc3Rvcnkuc3RhdGU7XG5cbiAgICAgICAgICAgIC8vIGJhY2sgdG8gc2Vzc2lvbiBvcmlnaW5cbiAgICAgICAgICAgIHdoaWxlICghaXNPcmlnaW4oc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGVuc3VyZSA9IChzcmM6IEFjY2Vzc2libGU8dW5rbm93bj4pOiB1bmtub3duID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdHggPSB7IC4uLnNyYyB9O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHhbJ3JvdXRlciddO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHhbJ0BwYXJhbXMnXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdHgpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGZvcndhcmQgZnJvbSBpbmRleCAxIHRvIGN1cnJlbnQgdmFsdWVcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAxLCBuID0gdGhpcy5fc3RhY2subGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3QgPSB0aGlzLl9zdGFjay5hdChpKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnB1c2hTdGF0ZShlbnN1cmUoc3QpLCAnJywgdGhpcy50b1VybChzdFsnQGlkJ10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIHJlY2VpdmUgYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIG9uUG9wU3RhdGUoZXY6IFBvcFN0YXRlRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBbbmV3U3RhdGUsIGFkZGl0aW9uYWxdID0gcGFyc2VEaXNwYXRjaEluZm8oZXYuc3RhdGUpO1xuICAgICAgICBjb25zdCBuZXdJZCAgID0gYWRkaXRpb25hbD8ubmV3SWQgPz8gdGhpcy50b0lkKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBjb25zdCBtZXRob2QgID0gYWRkaXRpb25hbD8ucG9zdHByb2MgPz8gJ3NlZWsnO1xuICAgICAgICBjb25zdCBkZiAgICAgID0gYWRkaXRpb25hbD8uZGYgPz8gdGhpcy5fZGZHbyA/PyBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgY29uc3Qgb2xkRGF0YSA9IGFkZGl0aW9uYWw/LnByZXZTdGF0ZSB8fCB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCBuZXdEYXRhID0gYWRkaXRpb25hbD8ubmV4dFN0YXRlIHx8IHRoaXMuZGlyZWN0KG5ld0lkKS5zdGF0ZSB8fCBjcmVhdGVEYXRhKG5ld0lkLCBuZXdTdGF0ZSk7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIGRmLmNhdGNoKG5vb3ApO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ2NoYW5naW5nJywgbmV3RGF0YSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3RGF0YSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdEYXRhLCBvbGREYXRhKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBoaXN0b3J5IOOCkuWFg+OBq+aIu+OBmVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsYmFja0hpc3RvcnkobWV0aG9kLCBuZXdJZCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgY3JlYXRlU2Vzc2lvbkhpc3Rvcnl9KCkgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgY3JlYXRlU2Vzc2lvbkhpc3Rvcnl9KCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKiBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMge1xuICAgIGNvbnRleHQ/OiBXaW5kb3c7XG4gICAgbW9kZT86ICdoYXNoJyB8ICdoaXN0b3J5Jztcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zfSBvYmplY3RcbiAqICAtIGBqYWAge0BsaW5rIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkPzogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMpOiBJSGlzdG9yeTxUPiB7XG4gICAgY29uc3QgeyBjb250ZXh0LCBtb2RlIH0gPSBPYmplY3QuYXNzaWduKHsgbW9kZTogJ2hhc2gnIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXcgU2Vzc2lvbkhpc3RvcnkoY29udGV4dCA/PyB3aW5kb3csIG1vZGUsIGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikucmVzZXQob3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIERpc3Bvc2UgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz566h55CG44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPik6IHZvaWQge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHsgUGxhaW5PYmplY3QsIHBvc3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU2lsZW5jZWFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGFjayxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBhc3NpZ25TdGF0ZUVsZW1lbnQsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnTWVtb3J5SGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEhpc3RvcnlFdmVudDxUPj4gaW1wbGVtZW50cyBJSGlzdG9yeTxUPiB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkOiBzdHJpbmcsIHN0YXRlPzogVCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdID0gdHJ1ZTtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuXG4gICAgICAgIGNvbnN0IG9sZFN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLnN0YXRlO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCgnTWVtb3J5SGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZSgnbm9vcCcsIGRmLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSBkZWx0YSA/IHRoaXMuc3RhdGUgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhID8/IDApO1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ3NlZWsnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXF1aXJlLWF3YWl0XG4gICAgICAgIHRoaXMuX3N0YWNrLmNsZWFyRm9yd2FyZCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgYvjgonntYLngrnjga7jgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgbmV3U3RhdGVbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQobmV3U3RhdGUsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKGNhbmNlbCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKG1ldGhvZCwgZGYsIG5ld1N0YXRlLCB0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBzdGF0ZSBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNoYW5nZVN0YXRlKG1ldGhvZDogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnLCBkZjogRGVmZXJyZWQsIG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8VD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld1N0YXRlLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IElIaXN0b3J5PFQ+IHtcbiAgICByZXR1cm4gbmV3IE1lbW9yeUhpc3RvcnkoaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgbWVtb3J5IGhpc3RvcnkuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiaW1wb3J0IHsgcGF0aDJyZWdleHAgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5pbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIENsYXNzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBzbGVlcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICB0b1F1ZXJ5U3RyaW5ncyxcbiAgICBwYXJzZVVybFF1ZXJ5LFxuICAgIGNvbnZlcnRVcmxQYXJhbVR5cGUsXG59IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHtcbiAgICB0b1VybCxcbiAgICBsb2FkVGVtcGxhdGVTb3VyY2UsXG4gICAgdG9UZW1wbGF0ZUVsZW1lbnQsXG59IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBJSGlzdG9yeSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgUGFnZVRyYW5zaXRpb25QYXJhbXMsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgfSBmcm9tICcuL2FzeW5jLXByb2Nlc3MnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDc3NOYW1lIHtcbiAgICBERUZBVUxUX1BSRUZJWCAgICAgICA9ICdjZHAnLFxuICAgIFRSQU5TSVRJT05fRElSRUNUSU9OID0gJ3RyYW5zaXRpb24tZGlyZWN0aW9uJyxcbiAgICBUUkFOU0lUSU9OX1JVTk5JTkcgICA9ICd0cmFuc2l0aW9uLXJ1bm5pbmcnLFxuICAgIFBBR0VfQ1VSUkVOVCAgICAgICAgID0gJ3BhZ2UtY3VycmVudCcsXG4gICAgUEFHRV9QUkVWSU9VUyAgICAgICAgPSAncGFnZS1wcmV2aW91cycsXG4gICAgRU5URVJfRlJPTV9DTEFTUyAgICAgPSAnZW50ZXItZnJvbScsXG4gICAgRU5URVJfQUNUSVZFX0NMQVNTICAgPSAnZW50ZXItYWN0aXZlJyxcbiAgICBFTlRFUl9UT19DTEFTUyAgICAgICA9ICdlbnRlci10bycsXG4gICAgTEVBVkVfRlJPTV9DTEFTUyAgICAgPSAnbGVhdmUtZnJvbScsXG4gICAgTEVBVkVfQUNUSVZFX0NMQVNTICAgPSAnbGVhdmUtYWN0aXZlJyxcbiAgICBMRUFWRV9UT19DTEFTUyAgICAgICA9ICdsZWF2ZS10bycsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIERvbUNhY2hlIHtcbiAgICBEQVRBX05BTUUgICAgICAgICAgID0gJ2RvbS1jYWNoZScsXG4gICAgQ0FDSEVfTEVWRUxfTUVNT1JZICA9ICdtZW1vcnknLFxuICAgIENBQ0hFX0xFVkVMX0NPTk5FQ1QgPSAnY29ubmVjdCcsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIExpbmtEYXRhIHtcbiAgICBUUkFOU0lUSU9OICAgICAgID0gJ3RyYW5zaXRpb24nLFxuICAgIE5BVklBR0FURV9NRVRIT0QgPSAnbmF2aWdhdGUtbWV0aG9kJyxcbiAgICBQUkVWRU5UX1JPVVRFUiAgID0gJ3ByZXZlbnQtcm91dGVyJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ29uc3Qge1xuICAgIFdBSVRfVFJBTlNJVElPTl9NQVJHSU4gPSAxMDAsIC8vIG1zZWNcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgUGFnZUV2ZW50ID0gJ2luaXQnIHwgJ21vdW50ZWQnIHwgJ2Nsb25lZCcgfCAnYmVmb3JlLWVudGVyJyB8ICdhZnRlci1lbnRlcicgfCAnYmVmb3JlLWxlYXZlJyB8ICdhZnRlci1sZWF2ZScgfCAndW5tb3VudGVkJyB8ICdyZW1vdmVkJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZUNoYW5nZUluZm9Db250ZXh0IGV4dGVuZHMgUm91dGVDaGFuZ2VJbmZvIHtcbiAgICByZWFkb25seSBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0O1xuICAgIHNhbWVQYWdlSW5zdGFuY2U/OiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBmbGF0IFJvdXRlUGFyYW1ldGVycyAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IE9taXQ8Um91dGVQYXJhbWV0ZXJzLCAncm91dGVzJz4gJiB7XG4gICAgLyoqIHJlZ2V4cCBmcm9tIHBhdGggKi9cbiAgICByZWdleHA6IFJlZ0V4cDtcbiAgICAvKioga2V5cyBvZiBwYXJhbXMgKi9cbiAgICBwYXJhbUtleXM6IHN0cmluZ1tdO1xuICAgIC8qKiBET00gdGVtcGxhdGUgaW5zdGFuY2Ugd2l0aCBQYWdlIGVsZW1lbnQgKi9cbiAgICAkdGVtcGxhdGU/OiBET007XG4gICAgLyoqIHJvdXRlciBwYWdlIGluc3RhbmNlIGZyb20gYGNvbXBvbmVudGAgcHJvcGVydHkgKi9cbiAgICBwYWdlPzogUGFnZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgPSBSb3V0ZVN1YkZsb3dQYXJhbXMgJiBSZXF1aXJlZDxQYWdlVHJhbnNpdGlvblBhcmFtcz4gJiB7XG4gICAgb3JpZ2luOiBzdHJpbmc7XG59O1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0ID0gV3JpdGFibGU8Um91dGU+ICYgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyAmIHtcbiAgICAnQHBhcmFtcyc6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7XG4gICAgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQ7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHRvIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0ID0gKHVybDogc3RyaW5nLCByb3V0ZXI6IFJvdXRlciwgcGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCBuYXZPcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFJvdXRlQ29udGV4dCA9PiB7XG4gICAgLy8gb21pdCB1bmNsb25hYmxlIHByb3BzXG4gICAgY29uc3QgZnJvbU5hdmlnYXRlID0gISFuYXZPcHRpb25zO1xuICAgIGNvbnN0IGVuc3VyZUNsb25lID0gKGN0eDogdW5rbm93bik6IFJvdXRlQ29udGV4dCA9PiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN0eCkpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICB7XG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICByb3V0ZXI6IGZyb21OYXZpZ2F0ZSA/IHVuZGVmaW5lZCA6IHJvdXRlcixcbiAgICAgICAgfSxcbiAgICAgICAgbmF2T3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gZm9yY2Ugb3ZlcnJpZGVcbiAgICAgICAgICAgIHF1ZXJ5OiB7fSxcbiAgICAgICAgICAgIHBhcmFtczoge30sXG4gICAgICAgICAgICBwYXRoOiBwYXJhbXMucGF0aCxcbiAgICAgICAgICAgICdAcGFyYW1zJzogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcGFyYW1zLFxuICAgICAgICB9LFxuICAgICk7XG4gICAgcmV0dXJuIGZyb21OYXZpZ2F0ZSA/IGVuc3VyZUNsb25lKGNvbnRleHQpIDogY29udGV4dCBhcyBSb3V0ZUNvbnRleHQ7XG59O1xuXG4vKiogQGludGVybmFsIGNvbnZlcnQgY29udGV4dCBwYXJhbXMgKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSAocm91dGVzOiBSb3V0ZVBhcmFtZXRlcnMgfCBSb3V0ZVBhcmFtZXRlcnNbXSB8IHVuZGVmaW5lZCk6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9PiB7XG4gICAgY29uc3QgZmxhdHRlbiA9IChwYXJlbnRQYXRoOiBzdHJpbmcsIG5lc3RlZDogUm91dGVQYXJhbWV0ZXJzW10pOiBSb3V0ZVBhcmFtZXRlcnNbXSA9PiB7XG4gICAgICAgIGNvbnN0IHJldHZhbDogUm91dGVQYXJhbWV0ZXJzW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBuIG9mIG5lc3RlZCkge1xuICAgICAgICAgICAgbi5wYXRoID0gYCR7cGFyZW50UGF0aC5yZXBsYWNlKC9cXC8kLywgJycpfS8ke25vcm1hbGl6ZUlkKG4ucGF0aCl9YDtcbiAgICAgICAgICAgIHJldHZhbC5wdXNoKG4pO1xuICAgICAgICAgICAgaWYgKG4ucm91dGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goLi4uZmxhdHRlbihuLnBhdGgsIG4ucm91dGVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZsYXR0ZW4oJycsIGlzQXJyYXkocm91dGVzKSA/IHJvdXRlcyA6IHJvdXRlcyA/IFtyb3V0ZXNdIDogW10pXG4gICAgICAgIC5tYXAoKHNlZWQ6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleXM6IHBhdGgycmVnZXhwLktleVtdID0gW107XG4gICAgICAgICAgICBzZWVkLnJlZ2V4cCA9IHBhdGgycmVnZXhwLnBhdGhUb1JlZ2V4cChzZWVkLnBhdGgsIGtleXMpO1xuICAgICAgICAgICAgc2VlZC5wYXJhbUtleXMgPSBrZXlzLmZpbHRlcihrID0+IGlzU3RyaW5nKGsubmFtZSkpLm1hcChrID0+IGsubmFtZSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgICAgIH0pO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgcHJlcGFyZSBJSGlzdG9yeSBvYmplY3QgKi9cbmV4cG9ydCBjb25zdCBwcmVwYXJlSGlzdG9yeSA9IChzZWVkOiAnaGFzaCcgfCAnaGlzdG9yeScgfCAnbWVtb3J5JyB8IElIaXN0b3J5ID0gJ2hhc2gnLCBpbml0aWFsUGF0aD86IHN0cmluZywgY29udGV4dD86IFdpbmRvdyk6IElIaXN0b3J5PFJvdXRlQ29udGV4dD4gPT4ge1xuICAgIHJldHVybiAoaXNTdHJpbmcoc2VlZClcbiAgICAgICAgPyAnbWVtb3J5JyA9PT0gc2VlZCA/IGNyZWF0ZU1lbW9yeUhpc3RvcnkoaW5pdGlhbFBhdGggPz8gJycpIDogY3JlYXRlU2Vzc2lvbkhpc3RvcnkoaW5pdGlhbFBhdGgsIHVuZGVmaW5lZCwgeyBtb2RlOiBzZWVkLCBjb250ZXh0IH0pXG4gICAgICAgIDogc2VlZFxuICAgICkgYXMgSUhpc3Rvcnk8Um91dGVDb250ZXh0Pjtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBidWlsZE5hdmlnYXRlVXJsID0gKHBhdGg6IHN0cmluZywgb3B0aW9uczogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IHN0cmluZyA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcGF0aCA9IGAvJHtub3JtYWxpemVJZChwYXRoKX1gO1xuICAgICAgICBjb25zdCB7IHF1ZXJ5LCBwYXJhbXMgfSA9IG9wdGlvbnM7XG4gICAgICAgIGxldCB1cmwgPSBwYXRoMnJlZ2V4cC5jb21waWxlKHBhdGgpKHBhcmFtcyA/PyB7fSk7XG4gICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhxdWVyeSl9YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCxcbiAgICAgICAgICAgIGBDb25zdHJ1Y3Qgcm91dGUgZGVzdGluYXRpb24gZmFpbGVkLiBbcGF0aDogJHtwYXRofSwgZGV0YWlsOiAke2Vycm9yLnRvU3RyaW5nKCl9XWAsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgcGFyc2VVcmxQYXJhbXMgPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHsgdXJsIH0gPSByb3V0ZTtcbiAgICByb3V0ZS5xdWVyeSAgPSB1cmwuaW5jbHVkZXMoJz8nKSA/IHBhcnNlVXJsUXVlcnkobm9ybWFsaXplSWQodXJsKSkgOiB7fTtcbiAgICByb3V0ZS5wYXJhbXMgPSB7fTtcblxuICAgIGNvbnN0IHsgcmVnZXhwLCBwYXJhbUtleXMgfSA9IHJvdXRlWydAcGFyYW1zJ107XG4gICAgaWYgKHBhcmFtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gcmVnZXhwLmV4ZWModXJsKT8ubWFwKCh2YWx1ZSwgaW5kZXgpID0+IHsgcmV0dXJuIHsgdmFsdWUsIGtleTogcGFyYW1LZXlzW2luZGV4IC0gMV0gfTsgfSk7XG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zISkge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gcGFyYW0ua2V5ICYmIG51bGwgIT0gcGFyYW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShyb3V0ZS5wYXJhbXMsIHBhcmFtLmtleSwgY29udmVydFVybFBhcmFtVHlwZShwYXJhbS52YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMjaW5zdGFuY2UgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UgPSBhc3luYyAocm91dGU6IFJvdXRlQ29udGV4dCk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBwYXJhbXMgfSA9IHJvdXRlO1xuXG4gICAgaWYgKHBhcmFtcy5wYWdlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgeyBjb21wb25lbnQsIGNvbXBvbmVudE9wdGlvbnMgfSA9IHBhcmFtcztcbiAgICBpZiAoaXNGdW5jdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2F3YWl0LXRoZW5hYmxlXG4gICAgICAgICAgICBwYXJhbXMucGFnZSA9IGF3YWl0IG5ldyAoY29tcG9uZW50IGFzIHVua25vd24gYXMgQ2xhc3MpKHJvdXRlLCBjb21wb25lbnRPcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICBwYXJhbXMucGFnZSA9IGF3YWl0IGNvbXBvbmVudChyb3V0ZSwgY29tcG9uZW50T3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGNvbXBvbmVudCkpIHtcbiAgICAgICAgcGFyYW1zLnBhZ2UgPSBPYmplY3QuYXNzaWduKHsgJ0Byb3V0ZSc6IHJvdXRlLCAnQG9wdGlvbnMnOiBjb21wb25lbnRPcHRpb25zIH0sIGNvbXBvbmVudCkgYXMgUGFnZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMucGFnZSA9IHsgJ0Byb3V0ZSc6IHJvdXRlLCAnQG9wdGlvbnMnOiBjb21wb25lbnRPcHRpb25zIH0gYXMgUGFnZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyMkdGVtcGxhdGUgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUgPSBhc3luYyAocGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgaWYgKHBhcmFtcy4kdGVtcGxhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGNyZWF0ZWRcbiAgICB9XG5cbiAgICBjb25zdCBlbnN1cmVJbnN0YW5jZSA9IChlbDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQpOiBET00gPT4ge1xuICAgICAgICByZXR1cm4gZWwgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gJChbLi4uZWwuY29udGVudC5jaGlsZHJlbl0pIGFzIERPTSA6ICQoZWwpO1xuICAgIH07XG5cbiAgICBjb25zdCB7IGNvbnRlbnQgfSA9IHBhcmFtcztcbiAgICBpZiAobnVsbCA9PSBjb250ZW50KSB7XG4gICAgICAgIC8vIG5vb3AgZWxlbWVudFxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gJDxIVE1MRWxlbWVudD4oKTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKChjb250ZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnc2VsZWN0b3InXSkpIHtcbiAgICAgICAgLy8gZnJvbSBhamF4XG4gICAgICAgIGNvbnN0IHsgc2VsZWN0b3IsIHVybCB9ID0gY29udGVudCBhcyB7IHNlbGVjdG9yOiBzdHJpbmc7IHVybD86IHN0cmluZzsgfTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0b1RlbXBsYXRlRWxlbWVudChhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsOiB1cmwgJiYgdG9VcmwodXJsKSB9KSk7XG4gICAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGB0ZW1wbGF0ZSBsb2FkIGZhaWxlZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yfSwgdXJsOiAke3VybH1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKHRlbXBsYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCAkZWwgPSAkKGNvbnRlbnQgYXMgRE9NU2VsZWN0b3IpO1xuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UoJGVsWzBdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBkZWNpZGUgdHJhbnNpdGlvbiBkaXJlY3Rpb24gKi9cbmV4cG9ydCBjb25zdCBkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uID0gKGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IEhpc3RvcnlEaXJlY3Rpb24gPT4ge1xuICAgIGlmIChjaGFuZ2VJbmZvLnJldmVyc2UpIHtcbiAgICAgICAgc3dpdGNoIChjaGFuZ2VJbmZvLmRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnYmFjayc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdmb3J3YXJkJztcbiAgICAgICAgICAgIGNhc2UgJ2ZvcndhcmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnYmFjayc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjaGFuZ2VJbmZvLmRpcmVjdGlvbjtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgRWZmZWN0VHlwZSA9ICdhbmltYXRpb24nIHwgJ3RyYW5zaXRpb24nO1xuXG4vKiogQGludGVybmFsIHJldHJpZXZlIGVmZmVjdCBkdXJhdGlvbiBwcm9wZXJ0eSAqL1xuY29uc3QgZ2V0RWZmZWN0RHVyYXRpb25TZWMgPSAoJGVsOiBET00sIGVmZmVjdDogRWZmZWN0VHlwZSk6IG51bWJlciA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZSgkZWxbMF0pW2Ake2VmZmVjdH1EdXJhdGlvbmBdKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgd2FpdEZvckVmZmVjdCA9ICgkZWw6IERPTSwgZWZmZWN0OiBFZmZlY3RUeXBlLCBkdXJhdGlvblNlYzogbnVtYmVyKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgcmV0dXJuIFByb21pc2UucmFjZShbXG4gICAgICAgIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gJGVsW2Ake2VmZmVjdH1FbmRgXShyZXNvbHZlKSksXG4gICAgICAgIHNsZWVwKGR1cmF0aW9uU2VjICogMTAwMCArIENvbnN0LldBSVRfVFJBTlNJVElPTl9NQVJHSU4pLFxuICAgIF0pO1xufTtcblxuLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIGV4ZWN1dGlvbiAqL1xuZXhwb3J0IGNvbnN0IHByb2Nlc3NQYWdlVHJhbnNpdGlvbiA9IGFzeW5jKCRlbDogRE9NLCBmcm9tQ2xhc3M6IHN0cmluZywgYWN0aXZlQ2xhc3M6IHN0cmluZywgdG9DbGFzczogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgJGVsLnJlbW92ZUNsYXNzKGZyb21DbGFzcyk7XG4gICAgJGVsLmFkZENsYXNzKHRvQ2xhc3MpO1xuXG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIFsnYW5pbWF0aW9uJywgJ3RyYW5zaXRpb24nXSBhcyBFZmZlY3RUeXBlW10pIHtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBnZXRFZmZlY3REdXJhdGlvblNlYygkZWwsIGVmZmVjdCk7XG4gICAgICAgIGR1cmF0aW9uICYmIHByb21pc2VzLnB1c2god2FpdEZvckVmZmVjdCgkZWwsIGVmZmVjdCwgZHVyYXRpb24pKTtcbiAgICB9XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgJGVsLnJlbW92ZUNsYXNzKFthY3RpdmVDbGFzcywgdG9DbGFzc10pO1xufTtcbiIsImltcG9ydCB0eXBlIHsgUm91dGVBeW5jUHJvY2VzcyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgUm91dGVBeW5jUHJvY2VzcyBpbXBsZW1lbnRhdGlvbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IGltcGxlbWVudHMgUm91dGVBeW5jUHJvY2VzcyB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUm91dGVBeW5jUHJvY2Vzc1xuXG4gICAgcmVnaXN0ZXIocHJvbWlzZTogUHJvbWlzZTx1bmtub3duPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9wcm9taXNlcy5wdXNoKHByb21pc2UpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsIG1ldGhvZHM6XG5cbiAgICBnZXQgcHJvbWlzZXMoKTogcmVhZG9ubHkgUHJvbWlzZTx1bmtub3duPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb21pc2VzO1xuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBjb21wbGV0ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodGhpcy5fcHJvbWlzZXMpO1xuICAgICAgICB0aGlzLl9wcm9taXNlcy5sZW5ndGggPSAwO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBjYW1lbGl6ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgTmF0aXZlUHJvbWlzZSB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIGlzUmVzdWx0LFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxuICAgIERPTVNlbGVjdG9yLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyB3YWl0RnJhbWUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuLi9zc3InO1xuaW1wb3J0IHsgbm9ybWFsaXplSWQgfSBmcm9tICcuLi9oaXN0b3J5L2ludGVybmFsJztcbmltcG9ydCB0eXBlIHsgSUhpc3RvcnksIEhpc3RvcnlTdGF0ZSB9IGZyb20gJy4uL2hpc3RvcnknO1xuaW1wb3J0IHtcbiAgICBQYWdlVHJhbnNpdGlvblBhcmFtcyxcbiAgICBSb3V0ZXJFdmVudCxcbiAgICBQYWdlLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBUcmFuc2l0aW9uU2V0dGluZ3MsXG4gICAgTmF2aWdhdGlvblNldHRpbmdzLFxuICAgIFBhZ2VTdGFjayxcbiAgICBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlclJlZnJlc2hMZXZlbCxcbiAgICBSb3V0ZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIENzc05hbWUsXG4gICAgRG9tQ2FjaGUsXG4gICAgTGlua0RhdGEsXG4gICAgUGFnZUV2ZW50LFxuICAgIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCxcbiAgICBSb3V0ZUNvbnRleHQsXG4gICAgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgdG9Sb3V0ZUNvbnRleHQsXG4gICAgcHJlcGFyZUhpc3RvcnksXG4gICAgYnVpbGROYXZpZ2F0ZVVybCxcbiAgICBwYXJzZVVybFBhcmFtcyxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UsXG4gICAgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlLFxuICAgIGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24sXG4gICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFJvdXRlciBpbXBsaW1lbnQgY2xhc3MuXG4gKiBAamEgUm91dGVyIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSb3V0ZXJDb250ZXh0IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8Um91dGVyRXZlbnQ+IGltcGxlbWVudHMgUm91dGVyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXM6IFJlY29yZDxzdHJpbmcsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnM+ID0ge307XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kZWw6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yYWY6IFVua25vd25GdW5jdGlvbjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5Q2hhbmdpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeVJlZnJlc2hIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5UmVmcmVzaDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9lcnJvckhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhhbmRsZUVycm9yO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Nzc1ByZWZpeDogc3RyaW5nO1xuICAgIHByaXZhdGUgX3RyYW5zaXRpb25TZXR0aW5nczogVHJhbnNpdGlvblNldHRpbmdzO1xuICAgIHByaXZhdGUgX25hdmlnYXRpb25TZXR0aW5nczogUmVxdWlyZWQ8TmF2aWdhdGlvblNldHRpbmdzPjtcbiAgICBwcml2YXRlIF9sYXN0Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfcHJldlJvdXRlPzogUm91dGVDb250ZXh0O1xuICAgIHByaXZhdGUgX3RlbXBUcmFuc2l0aW9uUGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXM7XG4gICAgcHJpdmF0ZSBfaW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VsZWN0b3I6IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50Piwgb3B0aW9uczogUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgIHJvdXRlcyxcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgZWwsXG4gICAgICAgICAgICB3aW5kb3c6IGNvbnRleHQsXG4gICAgICAgICAgICBoaXN0b3J5LFxuICAgICAgICAgICAgaW5pdGlhbFBhdGgsXG4gICAgICAgICAgICBjc3NQcmVmaXgsXG4gICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgbmF2aWdhdGlvbixcbiAgICAgICAgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICB0aGlzLl9yYWYgPSBjb250ZXh0Py5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPz8gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuICAgICAgICB0aGlzLl8kZWwgPSAkKHNlbGVjdG9yLCBlbCk7XG4gICAgICAgIGlmICghdGhpcy5fJGVsLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5ELCBgUm91dGVyIGVsZW1lbnQgbm90IGZvdW5kLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3IgYXMgc3RyaW5nfV1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2hpc3RvcnkgPSBwcmVwYXJlSGlzdG9yeShoaXN0b3J5LCBpbml0aWFsUGF0aCwgY29udGV4dCEpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyID0gdGhpcy5vbkhpc3RvcnlDaGFuZ2luZy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIgID0gdGhpcy5vbkhpc3RvcnlSZWZyZXNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2Vycm9ySGFuZGxlciAgICAgICAgICAgPSB0aGlzLm9uSGFuZGxlRXJyb3IuYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcblxuICAgICAgICAvLyBmb2xsb3cgYW5jaG9yXG4gICAgICAgIHRoaXMuXyRlbC5vbignY2xpY2snLCAnW2hyZWZdJywgdGhpcy5vbkFuY2hvckNsaWNrZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fY3NzUHJlZml4ID0gY3NzUHJlZml4ID8/IENzc05hbWUuREVGQVVMVF9QUkVGSVg7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBkZWZhdWx0OiAnbm9uZScsIHJlbG9hZDogJ25vbmUnIH0sIHRyYW5zaXRpb24pO1xuICAgICAgICB0aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbWV0aG9kOiAncHVzaCcgfSwgbmF2aWdhdGlvbik7XG5cbiAgICAgICAgdGhpcy5yZWdpc3Rlcihyb3V0ZXMhLCBzdGFydCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUm91dGVyXG5cbiAgICAvKiogUm91dGVyJ3MgdmlldyBIVE1MIGVsZW1lbnQgKi9cbiAgICBnZXQgZWwoKTogSFRNTEVsZW1lbnQge1xuICAgICAgICByZXR1cm4gdGhpcy5fJGVsWzBdO1xuICAgIH1cblxuICAgIC8qKiBPYmplY3Qgd2l0aCBjdXJyZW50IHJvdXRlIGRhdGEgKi9cbiAgICBnZXQgY3VycmVudFJvdXRlKCk6IFJvdXRlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3Rvcnkuc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIHN0YXRlIGlzIGluIHN1Yi1mbG93ICovXG4gICAgZ2V0IGlzSW5TdWJGbG93KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLmZpbmRTdWJGbG93UGFyYW1zKGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5CYWNrO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LmNhbkZvcndhcmQ7XG4gICAgfVxuXG4gICAgLyoqIFJvdXRlIHJlZ2lzdHJhdGlvbiAqL1xuICAgIHJlZ2lzdGVyKHJvdXRlczogUm91dGVQYXJhbWV0ZXJzIHwgUm91dGVQYXJhbWV0ZXJzW10sIHJlZnJlc2ggPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKHJvdXRlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tjb250ZXh0LnBhdGhdID0gY29udGV4dDtcbiAgICAgICAgfVxuICAgICAgICByZWZyZXNoICYmIHZvaWQgdGhpcy5nbygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogTmF2aWdhdGUgdG8gbmV3IHBhZ2UuICovXG4gICAgYXN5bmMgbmF2aWdhdGUodG86IHN0cmluZywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXModG8pO1xuICAgICAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgYFJvdXRlIG5vdCBmb3VuZC4gW3RvOiAke3RvfV1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb3B0cyAgID0gT2JqZWN0LmFzc2lnbih7IGludGVudDogdW5kZWZpbmVkIH0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgdXJsICAgID0gYnVpbGROYXZpZ2F0ZVVybCh0bywgb3B0cyk7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSAgPSB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHNlZWQsIG9wdHMpO1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gb3B0cy5tZXRob2QgPz8gdGhpcy5fbmF2aWdhdGlvblNldHRpbmdzLm1ldGhvZDtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBleGVjIG5hdmlnYXRlXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeVttZXRob2RdKHVybCwgcm91dGUpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQWRkIHBhZ2Ugc3RhY2sgc3RhcnRpbmcgZnJvbSB0aGUgY3VycmVudCBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIHB1c2hQYWdlU3RhY2soc3RhY2s6IFBhZ2VTdGFjayB8IFBhZ2VTdGFja1tdLCBub05hdmlnYXRlPzogYm9vbGVhbik6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3RhY2tzID0gaXNBcnJheShzdGFjaykgPyBzdGFjayA6IFtzdGFja107XG4gICAgICAgICAgICBjb25zdCByb3V0ZXMgPSBzdGFja3MuZmlsdGVyKHMgPT4gISFzLnJvdXRlKS5tYXAocyA9PiBzLnJvdXRlISk7XG5cbiAgICAgICAgICAgIC8vIGVuc3J1ZSBSb3V0ZVxuICAgICAgICAgICAgdGhpcy5yZWdpc3Rlcihyb3V0ZXMsIGZhbHNlKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gcHVzaCBoaXN0b3J5XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIHN0YWNrcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHVybCwgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gcGFnZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09IHBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCwgYFJvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4gW3VybDogJHt1cmx9XWAsIHBhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbGVudCByZWdpc3RyeVxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRvUm91dGVDb250ZXh0KHVybCwgdGhpcywgcGFyYW1zLCB7IGludGVudDogdW5kZWZpbmVkIH0pO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS50cmFuc2l0aW9uID0gdHJhbnNpdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUucmV2ZXJzZSAgICA9IHJldmVyc2U7XG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5faGlzdG9yeS5wdXNoKHVybCwgcm91dGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobm9OYXZpZ2F0ZSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmdvKC0xICogc3RhY2tzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghbm9OYXZpZ2F0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZ28oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICBhc3luYyB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS50cmF2ZXJzZVRvKGlkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEJlZ2luIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGJlZ2luU3ViRmxvdyh0bzogc3RyaW5nLCBzdWJmbG93PzogUm91dGVTdWJGbG93UGFyYW1zLCBvcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb246IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0ISxcbiAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbjogdGhpcy5jdXJyZW50Um91dGUudXJsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3ViZmxvdyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVTdWJGbG93UGFyYW1zKHBhcmFtcyk7XG4gICAgICAgICAgICAodGhpcy5jdXJyZW50Um91dGUgYXMgUm91dGVDb250ZXh0KS5zdWJmbG93ID0gcGFyYW1zO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5uYXZpZ2F0ZSh0bywgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ29tbWl0IHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNvbW1pdFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHN1YmZsb3cucGFyYW1zO1xuXG4gICAgICAgIHRoaXMuX3RlbXBUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zaXRpb24sIHJldmVyc2UgfSwgcGFyYW1zKTtcbiAgICAgICAgY29uc3QgeyBhZGRpdGlvbmFsRGlzdGFuY2UsIGFkZGl0aW5hbFN0YWNrcyB9ID0gc3ViZmxvdy5wYXJhbXM7XG4gICAgICAgIGNvbnN0IGRpc3RhbmNlID0gc3ViZmxvdy5kaXN0YW5jZSArIGFkZGl0aW9uYWxEaXN0YW5jZTtcblxuICAgICAgICBpZiAoYWRkaXRpbmFsU3RhY2tzPy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoKCkgPT4gdGhpcy5nbygtMSAqIGRpc3RhbmNlKSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnB1c2hQYWdlU3RhY2soYWRkaXRpbmFsU3RhY2tzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ2FuY2VsIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNhbmNlbFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHN1YmZsb3cucGFyYW1zO1xuXG4gICAgICAgIHRoaXMuX3RlbXBUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zaXRpb24sIHJldmVyc2UgfSwgcGFyYW1zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5nbygtMSAqIHN1YmZsb3cuZGlzdGFuY2UpO1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmNsZWFyRm9yd2FyZCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIHRyYW5zaXRpb24gc2V0dG5pZ3MuICovXG4gICAgdHJhbnNpdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogVHJhbnNpdGlvblNldHRpbmdzKTogVHJhbnNpdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLnRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncyB9O1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiBPYmplY3QuYXNzaWduKHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncywgbmV3U2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIFNldCBjb21tb24gbmF2aWdhdGlvbiBzZXR0bmlncy4gKi9cbiAgICBuYXZpZ2F0aW9uU2V0dGluZ3MobmV3U2V0dGluZ3M/OiBOYXZpZ2F0aW9uU2V0dGluZ3MpOiBOYXZpZ2F0aW9uU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4udGhpcy5fbmF2aWdhdGlvblNldHRpbmdzIH07XG4gICAgICAgIG5ld1NldHRpbmdzICYmIE9iamVjdC5hc3NpZ24odGhpcy5fbmF2aWdhdGlvblNldHRpbmdzLCBuZXdTZXR0aW5ncyk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogUmVmcmVzaCByb3V0ZXIgKHNwZWNpZnkgdXBkYXRlIGxldmVsKS4gKi9cbiAgICBhc3luYyByZWZyZXNoKGxldmVsID0gUm91dGVyUmVmcmVzaExldmVsLlJFTE9BRCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIGNhc2UgUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUjoge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGhpcy5faGlzdG9yeS5zdGFjaykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKHJvdXRlLmVsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnZSA9IHJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRlbC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bm1vdW50ZWQnLCByb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3VubW91bnRlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocm91dGUuZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gbnVsbCE7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubG9hZGVkJywgcm91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdyZW1vdmVkJywgcGFnZSwgcm91dGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZSb3V0ZSAmJiAodGhpcy5fcHJldlJvdXRlLmVsID0gbnVsbCEpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdvKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5zdXBwb3J0ZWQgbGV2ZWw6ICR7bGV2ZWx9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHN1Yi1mbG93XG5cbiAgICAvKiogQGludGVybmFsIGV2YWx1YXRlIHN1Yi1mbG93IHBhcmFtZXRlcnMgKi9cbiAgICBwcml2YXRlIGV2YWx1YXRlU3ViRmxvd1BhcmFtcyhzdWJmbG93OiBSb3V0ZVN1YkZsb3dQYXJhbXMpOiB2b2lkIHtcbiAgICAgICAgbGV0IGFkZGl0aW9uYWxEaXN0YW5jZSA9IDA7XG5cbiAgICAgICAgaWYgKHN1YmZsb3cuYmFzZSkge1xuICAgICAgICAgICAgY29uc3QgYmFzZUlkID0gbm9ybWFsaXplSWQoc3ViZmxvdy5iYXNlKTtcbiAgICAgICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc3QgeyBpbmRleCwgc3RhY2sgfSA9IHRoaXMuX2hpc3Rvcnk7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gaW5kZXg7IGkgPj0gMDsgaS0tLCBhZGRpdGlvbmFsRGlzdGFuY2UrKykge1xuICAgICAgICAgICAgICAgIGlmIChzdGFja1tpXVsnQGlkJ10gPT09IGJhc2VJZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfSU5WQUxJRF9TVUJGTE9XX0JBU0VfVVJMLCBgSW52YWxpZCBzdWItZmxvdyBiYXNlIHVybC4gW3VybDogJHtzdWJmbG93LmJhc2V9XWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3ViZmxvdy5iYXNlID0gdGhpcy5jdXJyZW50Um91dGUudXJsO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbihzdWJmbG93LCB7IGFkZGl0aW9uYWxEaXN0YW5jZSB9KTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGZpbmQgc3ViLWZsb3cgcGFyYW1ldGVycyAqL1xuICAgIHByaXZhdGUgZmluZFN1YkZsb3dQYXJhbXMoZGV0YWNoOiBib29sZWFuKTogeyBkaXN0YW5jZTogbnVtYmVyOyBwYXJhbXM6IFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgJiB7IGFkZGl0aW9uYWxEaXN0YW5jZTogbnVtYmVyOyB9OyB9IHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gdGhpcy5faGlzdG9yeS5zdGFjaztcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YWNrLmxlbmd0aCAtIDEsIGRpc3RhbmNlID0gMDsgaSA+PSAwOyBpLS0sIGRpc3RhbmNlKyspIHtcbiAgICAgICAgICAgIGlmIChzdGFja1tpXS5zdWJmbG93KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gc3RhY2tbaV0uc3ViZmxvdyBhcyBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ICYgeyBhZGRpdGlvbmFsRGlzdGFuY2U6IG51bWJlcjsgfTtcbiAgICAgICAgICAgICAgICBkZXRhY2ggJiYgZGVsZXRlIHN0YWNrW2ldLnN1YmZsb3c7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZGlzdGFuY2UsIHBhcmFtcyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiB0cmFuc2l0aW9uXG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBgUm91dGVyRXZlbnRBcmdgIG1ha2VyICovXG4gICAgcHJpdmF0ZSBtYWtlUm91dGVDaGFuZ2VJbmZvKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0Piwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkKTogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCB7XG4gICAgICAgIGNvbnN0IGludGVudCA9IG5ld1N0YXRlLmludGVudDtcbiAgICAgICAgZGVsZXRlIG5ld1N0YXRlLmludGVudDsgLy8gbmF2aWdhdGUg5pmC44Gr5oyH5a6a44GV44KM44GfIGludGVudCDjga8gb25lIHRpbWUg44Gu44G/5pyJ5Yq544Gr44GZ44KLXG5cbiAgICAgICAgY29uc3QgZnJvbSA9IChvbGRTdGF0ZSA/PyB0aGlzLl9sYXN0Um91dGUpIGFzIFJvdXRlQ29udGV4dCAmIFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHRoaXMuX2hpc3RvcnkuZGlyZWN0KG5ld1N0YXRlWydAaWQnXSwgZnJvbT8uWydAaWQnXSkuZGlyZWN0aW9uO1xuICAgICAgICBjb25zdCBhc3luY1Byb2Nlc3MgPSBuZXcgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQoKTtcbiAgICAgICAgY29uc3QgcmVsb2FkID0gbmV3U3RhdGUudXJsID09PSBmcm9tPy51cmw7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9XG4gICAgICAgICAgICA9IHRoaXMuX3RlbXBUcmFuc2l0aW9uUGFyYW1zID8/IChyZWxvYWRcbiAgICAgICAgICAgICAgICA/IHsgdHJhbnNpdGlvbjogdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLnJlbG9hZCwgcmV2ZXJzZTogZmFsc2UgfVxuICAgICAgICAgICAgICAgIDogKCdiYWNrJyAhPT0gZGlyZWN0aW9uID8gbmV3U3RhdGUgOiBmcm9tIGFzIFJvdXRlQ29udGV4dCkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByb3V0ZXI6IHRoaXMsXG4gICAgICAgICAgICBmcm9tLFxuICAgICAgICAgICAgdG86IG5ld1N0YXRlLFxuICAgICAgICAgICAgZGlyZWN0aW9uLFxuICAgICAgICAgICAgYXN5bmNQcm9jZXNzLFxuICAgICAgICAgICAgcmVsb2FkLFxuICAgICAgICAgICAgdHJhbnNpdGlvbixcbiAgICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgICBpbnRlbnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHJvdXRlIGJ5IHVybCAqL1xuICAgIHByaXZhdGUgZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmw6IHN0cmluZyk6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgfCB2b2lkIHtcbiAgICAgICAgY29uc3Qga2V5ID0gYC8ke25vcm1hbGl6ZUlkKHVybC5zcGxpdCgnPycpWzBdKX1gO1xuICAgICAgICBmb3IgKGNvbnN0IHBhdGggb2YgT2JqZWN0LmtleXModGhpcy5fcm91dGVzKSkge1xuICAgICAgICAgICAgY29uc3QgeyByZWdleHAgfSA9IHRoaXMuX3JvdXRlc1twYXRoXTtcbiAgICAgICAgICAgIGlmIChyZWdleHAudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JvdXRlc1twYXRoXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBwYWdlIGV2ZW50ICovXG4gICAgcHJpdmF0ZSB0cmlnZ2VyUGFnZUNhbGxiYWNrKGV2ZW50OiBQYWdlRXZlbnQsIHRhcmdldDogUGFnZSB8IHVuZGVmaW5lZCwgYXJnOiBSb3V0ZSB8IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWV0aG9kID0gY2FtZWxpemUoYHBhZ2UtJHtldmVudH1gKTtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oKHRhcmdldCBhcyBQYWdlICYgUmVjb3JkPHN0cmluZywgVW5rbm93bkZ1bmN0aW9uPiB8IHVuZGVmaW5lZCk/LlttZXRob2RdKSkge1xuICAgICAgICAgICAgY29uc3QgcmV0dmFsID0gKHRhcmdldCBhcyBQYWdlICYgUmVjb3JkPHN0cmluZywgVW5rbm93bkZ1bmN0aW9uPiB8IHVuZGVmaW5lZCk/LlttZXRob2RdKGFyZyk7XG4gICAgICAgICAgICBpZiAocmV0dmFsIGluc3RhbmNlb2YgTmF0aXZlUHJvbWlzZSAmJiAoYXJnIGFzIFJvdXRlICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pWydhc3luY1Byb2Nlc3MnXSkge1xuICAgICAgICAgICAgICAgIChhcmcgYXMgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCkuYXN5bmNQcm9jZXNzLnJlZ2lzdGVyKHJldHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHdhaXQgZnJhbWUgKi9cbiAgICBwcml2YXRlIHdhaXRGcmFtZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHdhaXRGcmFtZSgxLCB0aGlzLl9yYWYpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY2hhbmdlIHBhZ2UgbWFpbiBwcm9jZWR1cmUgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZVBhZ2UobmV4dFJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgcHJldlJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSB0cnVlO1xuXG4gICAgICAgICAgICBwYXJzZVVybFBhcmFtcyhuZXh0Um91dGUpO1xuXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRSb3V0ZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMuX3RlbXBUcmFuc2l0aW9uUGFyYW1zID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBdID0gYXdhaXQgdGhpcy5wcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgLy8gdHJhbnNpdGlvbiBjb3JlXG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gYXdhaXQgdGhpcy50cmFuc2l0aW9uUGFnZShwYWdlTmV4dCwgJGVsTmV4dCwgcGFnZVByZXYsICRlbFByZXYsIGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZUNvbnRleHQoJGVsTmV4dCwgJGVsUHJldiwgY2hhbmdlSW5mbywgdHJhbnNpdGlvbik7XG5cbiAgICAgICAgICAgIC8vIOmBt+enu+WFiOOBjCBzdWJmbG93IOmWi+Wni+eCueOBp+OBguOCi+WgtOWQiCwgc3ViZmxvdyDop6PpmaRcbiAgICAgICAgICAgIGlmIChuZXh0Um91dGUudXJsID09PSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKGZhbHNlKT8ucGFyYW1zLm9yaWdpbikge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdjaGFuZ2VkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgcHJlcGFyZUNoYW5nZUNvbnRleHQoY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCk6IFByb21pc2U8W1BhZ2UsIERPTSwgUGFnZSwgRE9NXT4ge1xuICAgICAgICBjb25zdCBuZXh0Um91dGUgPSBjaGFuZ2VJbmZvLnRvIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+O1xuICAgICAgICBjb25zdCBwcmV2Um91dGUgPSBjaGFuZ2VJbmZvLmZyb20gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgY29uc3QgeyAnQHBhcmFtcyc6IG5leHRQYXJhbXMgfSA9IG5leHRSb3V0ZTtcbiAgICAgICAgY29uc3QgeyAnQHBhcmFtcyc6IHByZXZQYXJhbXMgfSA9IHByZXZSb3V0ZSA/PyB7fTtcblxuICAgICAgICAvLyBwYWdlIGluc3RhbmNlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZShuZXh0Um91dGUpO1xuICAgICAgICAvLyBwYWdlICR0ZW1wbGF0ZVxuICAgICAgICBhd2FpdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUobmV4dFBhcmFtcyk7XG5cbiAgICAgICAgY2hhbmdlSW5mby5zYW1lUGFnZUluc3RhbmNlID0gcHJldlBhcmFtcz8ucGFnZSAmJiBwcmV2UGFyYW1zLnBhZ2UgPT09IG5leHRQYXJhbXMucGFnZTtcbiAgICAgICAgY29uc3QgeyByZWxvYWQsIHNhbWVQYWdlSW5zdGFuY2UsIGFzeW5jUHJvY2VzcyB9ID0gY2hhbmdlSW5mbztcblxuICAgICAgICAvLyBwYWdlICRlbFxuICAgICAgICBpZiAoIW5leHRSb3V0ZS5lbCkge1xuICAgICAgICAgICAgaWYgKCFyZWxvYWQgJiYgc2FtZVBhZ2VJbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIG5leHRSb3V0ZS5lbCAgPSBwcmV2Um91dGUhLmVsO1xuICAgICAgICAgICAgICAgIHByZXZSb3V0ZSEuZWwgPSBuZXh0Um91dGUuZWw/LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAkKHByZXZSb3V0ZSEuZWwpLmluc2VydEJlZm9yZShuZXh0Um91dGUuZWwpO1xuICAgICAgICAgICAgICAgICQobmV4dFJvdXRlLmVsKS5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpLnJlbW92ZUNsYXNzKFtgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YCwgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdjbG9uZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2Nsb25lZCcsIG5leHRQYXJhbXMucGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChuZXh0UGFyYW1zLiR0ZW1wbGF0ZT8uaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFJvdXRlLmVsICAgICAgICAgPSBuZXh0UGFyYW1zLiR0ZW1wbGF0ZVswXTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFBhcmFtcy4kdGVtcGxhdGUgPSBuZXh0UGFyYW1zLiR0ZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRSb3V0ZS5lbCA9IG5leHRQYXJhbXMuJHRlbXBsYXRlIS5jbG9uZSgpWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2xvYWRlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnaW5pdCcsIG5leHRQYXJhbXMucGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZWxOZXh0ID0gJChuZXh0Um91dGUuZWwpO1xuICAgICAgICBjb25zdCBwYWdlTmV4dCA9IG5leHRQYXJhbXMucGFnZSE7XG5cbiAgICAgICAgLy8gbW91bnRcbiAgICAgICAgaWYgKCEkZWxOZXh0LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAkZWxOZXh0LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLl8kZWwuYXBwZW5kKCRlbE5leHQpO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdtb3VudGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ21vdW50ZWQnLCBwYWdlTmV4dCwgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dFxuICAgICAgICAgICAgKHJlbG9hZCAmJiB7fSB8fCAocHJldlBhcmFtcz8ucGFnZSA/PyB7fSkpLCAocmVsb2FkICYmICQobnVsbCkgfHwgJChwcmV2Um91dGU/LmVsKSksIC8vIHByZXZcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmFuc2l0aW9uUGFnZShcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gY2hhbmdlSW5mby50cmFuc2l0aW9uID8/IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0O1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICdlbnRlci1mcm9tLWNsYXNzJzogY3VzdG9tRW50ZXJGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItYWN0aXZlLWNsYXNzJzogY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdlbnRlci10by1jbGFzcyc6IGN1c3RvbUVudGVyVG9DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1mcm9tLWNsYXNzJzogY3VzdG9tTGVhdmVGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtYWN0aXZlLWNsYXNzJzogY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS10by1jbGFzcyc6IGN1c3RvbUxlYXZlVG9DbGFzcyxcbiAgICAgICAgfSA9IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncztcblxuICAgICAgICAvLyBlbnRlci1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgZW50ZXJGcm9tQ2xhc3MgICA9IGN1c3RvbUVudGVyRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJBY3RpdmVDbGFzcyA9IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlclRvQ2xhc3MgICAgID0gY3VzdG9tRW50ZXJUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfVE9fQ0xBU1N9YDtcblxuICAgICAgICAvLyBsZWF2ZS1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgbGVhdmVGcm9tQ2xhc3MgICA9IGN1c3RvbUxlYXZlRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVBY3RpdmVDbGFzcyA9IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZVRvQ2xhc3MgICAgID0gY3VzdG9tTGVhdmVUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfVE9fQ0xBU1N9YDtcblxuICAgICAgICBhd2FpdCB0aGlzLmJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAvLyB0cmFuc2lzaW9uIGV4ZWN1dGlvblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsIGVudGVyVG9DbGFzcyksXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGxlYXZlVG9DbGFzcyksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5lbmRUcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRyYW5zaXRpb247XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIHByb2MgOiBiZWdpbiAqL1xuICAgIHByaXZhdGUgYXN5bmMgYmVnaW5UcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLCBlbnRlckZyb21DbGFzczogc3RyaW5nLCBlbnRlckFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sIGxlYXZlRnJvbUNsYXNzOiBzdHJpbmcsIGxlYXZlQWN0aXZlQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fJGVsLmFkZENsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICAkZWxOZXh0XG4gICAgICAgICAgICAuYWRkQ2xhc3MoW2VudGVyRnJvbUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pXG4gICAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4nKVxuICAgICAgICAgICAgLnJlZmxvdygpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoZW50ZXJBY3RpdmVDbGFzcylcbiAgICAgICAgO1xuICAgICAgICAkZWxQcmV2LmFkZENsYXNzKFtsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcywgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcblxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JlZm9yZS10cmFuc2l0aW9uJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2JlZm9yZS1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyYW5zaXRpb24gcHJvYyA6IGVuZCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZW5kVHJhbnNpdGlvbihcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgKCRlbE5leHRbMF0gIT09ICRlbFByZXZbMF0pICYmICRlbFByZXYuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcbiAgICAgICAgJGVsTmV4dC5yZW1vdmVDbGFzcyhbYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcbiAgICAgICAgJGVsUHJldi5yZW1vdmVDbGFzcyhbYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcblxuICAgICAgICB0aGlzLl8kZWwucmVtb3ZlQ2xhc3MoW1xuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWAsXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX0RJUkVDVElPTn0tJHtkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uKGNoYW5nZUluZm8pfWAsXG4gICAgICAgIF0pO1xuXG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYWZ0ZXItbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYWZ0ZXItZW50ZXInLCBwYWdlTmV4dCwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnYWZ0ZXItdHJhbnNpdGlvbicsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBjaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlIHBhZ2Ugc3RhdHVzIGFmdGVyIHRyYW5zaXRpb24gKi9cbiAgICBwcml2YXRlIHVwZGF0ZUNoYW5nZUNvbnRleHQoXG4gICAgICAgICRlbE5leHQ6IERPTSxcbiAgICAgICAgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICB0cmFuc2l0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZnJvbSwgcmVsb2FkLCBzYW1lUGFnZUluc3RhbmNlLCBkaXJlY3Rpb24sIHRvIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICBjb25zdCBwcmV2Um91dGUgPSBmcm9tIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gdG8gYXMgUm91dGVDb250ZXh0O1xuICAgICAgICBjb25zdCB1cmxDaGFuZ2VkID0gIXJlbG9hZDtcblxuXG4gICAgICAgIGlmICgkZWxOZXh0WzBdICE9PSAkZWxQcmV2WzBdKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgY2xhc3NcbiAgICAgICAgICAgICRlbFByZXZcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YClcbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApO1xuXG4gICAgICAgICAgICBpZiAodXJsQ2hhbmdlZCAmJiB0aGlzLl9wcmV2Um91dGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKHRoaXMuX3ByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICAgICAgJGVsLnJlbW92ZUNsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3ByZXZSb3V0ZS5lbCAmJiB0aGlzLl9wcmV2Um91dGUuZWwgIT09IHRoaXMuY3VycmVudFJvdXRlLmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlTHYgPSAkZWwuZGF0YShEb21DYWNoZS5EQVRBX05BTUUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoRG9tQ2FjaGUuQ0FDSEVfTEVWRUxfQ09OTkVDVCAhPT0gY2FjaGVMdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnZSA9IHRoaXMuX3ByZXZSb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXJlRXZlbnRzID0gdGhpcy5fcHJldlJvdXRlWydAcGFyYW1zJ10ucGFnZSAhPT0gbmV4dFJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bm1vdW50ZWQnLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygndW5tb3VudGVkJywgcGFnZSwgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9NRU1PUlkgIT09IGNhY2hlTHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyZUV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubG9hZGVkJywgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdyZW1vdmVkJywgcGFnZSwgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXJsQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlID0gcHJldlJvdXRlO1xuICAgICAgICAgICAgaWYgKHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICAkZWxQcmV2LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xhc3RSb3V0ZSA9IHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgJ2ZvcndhcmQnID09PSBkaXJlY3Rpb24gJiYgdHJhbnNpdGlvbiAmJiAodGhpcy5fbGFzdFJvdXRlLnRyYW5zaXRpb24gPSB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGBjaGFuZ2luZ2AgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5Q2hhbmdpbmcobmV4dFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgY2FuY2VsOiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCwgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5faW5DaGFuZ2luZ1BhZ2UpIHtcbiAgICAgICAgICAgIGNhbmNlbChtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfQlVTWSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0aGlzLm1ha2VSb3V0ZUNoYW5nZUluZm8obmV4dFN0YXRlLCB1bmRlZmluZWQpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ3dpbGwtY2hhbmdlJywgY2hhbmdlSW5mbywgY2FuY2VsKTtcbiAgICAgICAgcHJvbWlzZXMucHVzaCguLi5jaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5wcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYHJlZnJlc2hgIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGlzdG9yeVJlZnJlc2gobmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQsIHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW5zdXJlID0gKHN0YXRlOiBIaXN0b3J5U3RhdGU8UGFydGlhbDxSb3V0ZUNvbnRleHQ+Pik6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVybCAgPSBgLyR7c3RhdGVbJ0BpZCddfWA7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXModXJsKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFt1cmw6ICR7dXJsfV1gLCBzdGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBzdGF0ZVsnQHBhcmFtcyddKSB7XG4gICAgICAgICAgICAgICAgLy8gUm91dGVDb250ZXh0UGFyYW1ldGVyIOOCkiBhc3NpZ25cbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHN0YXRlLCB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHBhcmFtcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdGF0ZS5lbCkge1xuICAgICAgICAgICAgICAgIC8vIGlkIOOBq+e0kOOBpeOBj+imgee0oOOBjOOBmeOBp+OBq+WtmOWcqOOBmeOCi+WgtOWQiOOBr+WJsuOCiuW9k+OBplxuICAgICAgICAgICAgICAgIHN0YXRlLmVsID0gdGhpcy5faGlzdG9yeS5kaXJlY3Qoc3RhdGVbJ0BpZCddKT8uc3RhdGU/LmVsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBzY2hlZHVsaW5nIGByZWZyZXNoYCBkb25lLlxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLmNoYW5nZVBhZ2UoZW5zdXJlKG5ld1N0YXRlKSwgb2xkU3RhdGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBlcnJvciBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhhbmRsZUVycm9yKGVycm9yOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaChcbiAgICAgICAgICAgICdlcnJvcicsXG4gICAgICAgICAgICBpc1Jlc3VsdChlcnJvcikgPyBlcnJvciA6IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJywgZXJyb3IpXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYW5jaG9yIGNsaWNrIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uQW5jaG9yQ2xpY2tlZChldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQgYXMgRWxlbWVudCkuY2xvc2VzdCgnW2hyZWZdJyk7XG4gICAgICAgIGlmICgkdGFyZ2V0LmRhdGEoTGlua0RhdGEuUFJFVkVOVF9ST1VURVIpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgPSAkdGFyZ2V0LmF0dHIoJ2hyZWYnKTtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9ICR0YXJnZXQuZGF0YShMaW5rRGF0YS5UUkFOU0lUSU9OKSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1ldGhvZCAgICAgPSAkdGFyZ2V0LmRhdGEoTGlua0RhdGEuTkFWSUFHQVRFX01FVEhPRCkgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBtZXRob2RPcHRzID0gKCdwdXNoJyA9PT0gbWV0aG9kIHx8ICdyZXBsYWNlJyA9PT0gbWV0aG9kID8geyBtZXRob2QgfSA6IHt9KSBhcyBOYXZpZ2F0aW9uU2V0dGluZ3M7XG5cbiAgICAgICAgaWYgKCcjJyA9PT0gdXJsKSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMuYmFjaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdm9pZCB0aGlzLm5hdmlnYXRlKHVybCEsIHsgdHJhbnNpdGlvbiwgLi4ubWV0aG9kT3B0cyB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIHtAbGluayBSb3V0ZXJ9IG9iamVjdC5cbiAqIEBqYSB7QGxpbmsgUm91dGVyfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnN9IG9iamVjdFxuICogIC0gYGphYCB7QGxpbmsgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb3V0ZXIoc2VsZWN0b3I6IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50Piwgb3B0aW9ucz86IFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMpOiBSb3V0ZXIge1xuICAgIHJldHVybiBuZXcgUm91dGVyQ29udGV4dChzZWxlY3RvciwgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIHN0YXJ0OiB0cnVlLFxuICAgIH0sIG9wdGlvbnMpKTtcbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwiRGVmZXJyZWQiLCJhdCIsInNvcnQiLCJub29wIiwid2ViUm9vdCIsIiRjZHAiLCJpc09iamVjdCIsIiRzaWduYXR1cmUiLCJFdmVudFB1Ymxpc2hlciIsInRvVXJsIiwiQ2FuY2VsVG9rZW4iLCJwb3N0IiwiaXNBcnJheSIsInBhdGgycmVnZXhwIiwiaXNTdHJpbmciLCJ0b1F1ZXJ5U3RyaW5ncyIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInBhcnNlVXJsUXVlcnkiLCJhc3NpZ25WYWx1ZSIsImNvbnZlcnRVcmxQYXJhbVR5cGUiLCJpc0Z1bmN0aW9uIiwiJCIsInRvVGVtcGxhdGVFbGVtZW50IiwibG9hZFRlbXBsYXRlU291cmNlIiwic2xlZXAiLCJjYW1lbGl6ZSIsIk5hdGl2ZVByb21pc2UiLCJ3YWl0RnJhbWUiLCJpc1Jlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFPQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdB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