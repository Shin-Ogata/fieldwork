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
        /** @internal follow the session history until `origin` (in silent) */
        async backToSesssionOrigin() {
            await this.suppressEventListenerScope(async (wait) => {
                const isOrigin = (st) => {
                    return (st && st['@origin']);
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
            const { silent } = options || {};
            const oldState = this.state;
            this.setIndex(0);
            this.clearForward();
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
                const newState = this._stack.distance(delta || 0);
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
            ? 'memory' === seed ? createMemoryHistory(initialPath || '') : createSessionHistory(initialPath, undefined, { mode: seed, context })
            : seed);
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
    const parseUrlParams = (route) => {
        const { url } = route;
        route.query = url.includes('?') ? ajax.parseUrlQuery(normalizeId(url)) : {};
        route.params = {};
        const { regexp, paramKeys } = route['@params'];
        if (paramKeys.length) {
            const params = regexp.exec(url)?.map((value, index) => { return { value, key: paramKeys[index - 1] }; });
            for (const param of params) { // eslint-disable-line @typescript-eslint/no-non-null-assertion
                if (null != param.key) {
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
            const template = webUtils.toTemplateElement(await webUtils.loadTemplateSource(selector, { url }));
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
        _lastRoute;
        _prevRoute;
        _tempTransitionParams;
        _inChangingPage = false;
        /**
         * constructor
         */
        constructor(selector, options) {
            super();
            const { routes, start, el, window: context, history, initialPath, cssPrefix, transition, } = options;
            // eslint-disable-next-line @typescript-eslint/unbound-method
            this._raf = context?.requestAnimationFrame || window.requestAnimationFrame;
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
            this._cssPrefix = cssPrefix || "cdp" /* CssName.DEFAULT_PREFIX */;
            this._transitionSettings = Object.assign({ default: 'none', reload: 'none' }, transition);
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
                const seed = this.findRouteContextParameter(to);
                if (!seed) {
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
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
                const stacks = coreUtils.isArray(stack) ? stack : [stack];
                const routes = stacks.filter(s => !!s.route).map(s => s.route);
                // ensrue Route
                this.register(routes, false);
                await this.suppressEventListenerScope(async () => {
                    // push history
                    for (const page of stacks) {
                        const { url, transition, reverse } = page;
                        const params = this.findRouteContextParameter(url);
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
                            route.el = null; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                            this.publish('unloaded', route);
                            this.triggerPageCallback('removed', page, route);
                        }
                    }
                    this._prevRoute && (this._prevRoute.el = null); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    return this.go();
                }
                default:
                    console.warn(`unsupported level: ${level}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
                    return this;
            }
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
            const from = (oldState || this._lastRoute);
            const direction = this._history.direct(newState['@id'], from?.['@id']).direction;
            const asyncProcess = new RouteAyncProcessContext();
            const reload = newState.url === from?.url;
            const { transition, reverse } = this._tempTransitionParams || reload
                ? { transition: this._transitionSettings.reload, reverse: false }
                : ('back' !== direction ? newState : from);
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
            const method = coreUtils.camelize(`page-${event}`);
            if (coreUtils.isFunction(target?.[method])) {
                const retval = target?.[method](arg);
                if (retval instanceof Promise && arg['asyncProcess']) {
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
                await this.transitionPage(pageNext, $elNext, pagePrev, $elPrev, changeInfo);
                this.updateChangeContext($elNext, $elPrev, changeInfo.from, !changeInfo.reload);
                this.publish('changed', changeInfo);
            }
            finally {
                this._inChangingPage = false;
            }
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
                if (params.$template?.isConnected) {
                    nextRoute.el = params.$template[0];
                    params.$template = params.$template.clone();
                }
                else {
                    nextRoute.el = params.$template.clone()[0];
                }
                this.publish('loaded', changeInfo);
                await changeInfo.asyncProcess.complete();
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                this.triggerPageCallback('init', nextRoute['@params'].page, changeInfo);
                await changeInfo.asyncProcess.complete();
            }
            const $elNext = dom.dom(nextRoute.el);
            const pageNext = nextRoute['@params'].page;
            // mount
            if (!$elNext.isConnected) {
                $elNext.attr('aria-hidden', true);
                this._$el.append($elNext);
                this.publish('mounted', changeInfo);
                this.triggerPageCallback('mounted', pageNext, changeInfo);
                await changeInfo.asyncProcess.complete();
            }
            const { reload } = changeInfo;
            return [
                pageNext, $elNext,
                (reload && {} || prevRoute?.['@params']?.page || {}), (reload && dom.dom(null) || dom.dom(prevRoute?.el)), // prev
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
            await this.beginTransition(pageNext, $elNext, enterFromClass, enterActiveClass, pagePrev, $elPrev, leaveFromClass, leaveActiveClass, changeInfo);
            await this.waitFrame();
            // transision execution
            await Promise.all([
                processPageTransition($elNext, enterFromClass, enterActiveClass, enterToClass),
                processPageTransition($elPrev, leaveFromClass, leaveActiveClass, leaveToClass),
            ]);
            await this.waitFrame();
            await this.endTransition(pageNext, $elNext, pagePrev, $elPrev, changeInfo);
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
            this.triggerPageCallback('before-enter', pageNext, changeInfo);
            this.triggerPageCallback('before-leave', pagePrev, changeInfo);
            await changeInfo.asyncProcess.complete();
        }
        /** @internal transition proc : end */
        async endTransition(pageNext, $elNext, pagePrev, $elPrev, changeInfo) {
            ($elNext[0] !== $elPrev[0]) && $elPrev.attr('aria-hidden', true);
            $elNext.removeClass([`${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`]);
            $elPrev.removeClass([`${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`]);
            this._$el.removeClass([
                `${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`,
                `${this._cssPrefix}-${"transition-direction" /* CssName.TRANSITION_DIRECTION */}-${changeInfo.direction}`,
            ]);
            this.triggerPageCallback('after-enter', pageNext, changeInfo);
            this.triggerPageCallback('after-leave', pagePrev, changeInfo);
            this.publish('after-transition', changeInfo);
            await changeInfo.asyncProcess.complete();
        }
        /** @internal update page status after transition */
        updateChangeContext($elNext, $elPrev, prevRoute, urlChanged) {
            if ($elNext[0] !== $elPrev[0]) {
                // update class
                $elPrev
                    .removeClass(`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`)
                    .addClass(`${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`);
                $elNext.addClass(`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`);
                if (this._prevRoute) {
                    const $el = dom.dom(this._prevRoute.el);
                    $el.removeClass(`${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`);
                    if (this._prevRoute.el !== this.currentRoute.el) {
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
                }
            }
            if (urlChanged) {
                this._prevRoute = prevRoute;
            }
            this._lastRoute = this.currentRoute;
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
                const params = this.findRouteContextParameter(url);
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

    exports.createMemoryHistory = createMemoryHistory;
    exports.createRouter = createRouter;
    exports.createSessionHistory = createSessionHistory;
    exports.disposeMemoryHistory = disposeMemoryHistory;
    exports.disposeSessionHistory = disposeSessionHistory;
    exports.resetMemoryHistory = resetMemoryHistory;
    exports.resetSessionHistory = resetSessionHistory;
    Object.keys(extensionPath2regexp).forEach(function (k) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionPath2regexp[k]; }
        });
    });

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaGlzdG9yeS9pbnRlcm5hbC50cyIsImhpc3Rvcnkvc2Vzc2lvbi50cyIsImhpc3RvcnkvbWVtb3J5LnRzIiwicm91dGVyL2ludGVybmFsLnRzIiwicm91dGVyL2FzeW5jLXByb2Nlc3MudHMiLCJyb3V0ZXIvY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFJPVVRFUiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDE1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1JPVVRFUl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5EICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDEsICdyb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMiwgJ1JvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAzLCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDQsICdJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0JVU1kgICAgICAgICAgICAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDUsICdJbiBjaGFuZ2luZyBwYWdlIHByb2Nlc3Mgbm93LicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4iLCJpbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGF0LFxuICAgIHNvcnQsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEhpc3RvcnlTdGF0ZSwgSGlzdG9yeURpcmVjdFJldHVyblR5cGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIG5vcm1hbHppZSBpZCBzdHJpbmcgKi9cbmV4cG9ydCBjb25zdCBub3JtYWxpemVJZCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgLy8gcmVtb3ZlIGhlYWQgb2YgXCIjXCIsIFwiL1wiLCBcIiMvXCIgYW5kIHRhaWwgb2YgXCIvXCJcbiAgICByZXR1cm4gc3JjLnJlcGxhY2UoL14oI1xcLyl8XlsjL118XFxzKyQvLCAnJykucmVwbGFjZSgvXlxccyskfChcXC8kKS8sICcnKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIHN0YWNrICovXG5leHBvcnQgY29uc3QgY3JlYXRlRGF0YSA9IDxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IEhpc3RvcnlTdGF0ZTxUPiA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oeyAnQGlkJzogbm9ybWFsaXplSWQoaWQpIH0sIHN0YXRlKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIHVuY2FuY2VsbGFibGUgZGVmZXJyZWQgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQgPSAod2Fybjogc3RyaW5nKTogRGVmZXJyZWQgPT4ge1xuICAgIGNvbnN0IHVuY2FuY2VsbGFibGUgPSBuZXcgRGVmZXJyZWQoKSBhcyBXcml0YWJsZTxEZWZlcnJlZD47XG4gICAgdW5jYW5jZWxsYWJsZS5yZWplY3QgPSAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUud2Fybih3YXJuKTtcbiAgICAgICAgdW5jYW5jZWxsYWJsZS5yZXNvbHZlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gdW5jYW5jZWxsYWJsZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgYXNzaWduIHN0YXRlIGVsZW1lbnQgaWYgYWxyZWFkeSBleGlzdHMgKi9cbmV4cG9ydCBjb25zdCBhc3NpZ25TdGF0ZUVsZW1lbnQgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZSwgc3RhY2s6IEhpc3RvcnlTdGFjayk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGVsID0gc3RhY2suZGlyZWN0KHN0YXRlWydAaWQnXSk/LnN0YXRlPy5lbDtcbiAgICAoIXN0YXRlLmVsICYmIGVsKSAmJiAoc3RhdGUuZWwgPSBlbCk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWwgc3RhY2sgbWFuYWdlbWVudCBjb21tb24gY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIEhpc3RvcnlTdGFjazxUID0gUGxhaW5PYmplY3Q+IHtcbiAgICBwcml2YXRlIF9zdGFjazogSGlzdG9yeVN0YXRlPFQ+W10gPSBbXTtcbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlzdGFuY2UoMCk7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGVbJ0BpZCddO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIHNldCBpbmRleChpZHg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IE1hdGgudHJ1bmMoaWR4KTtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBhcnJheSgpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zbGljZSgpO1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBwb3NpdGlvbiBpbiBzdGFjayBpcyBmaXJzdCBvciBub3QgKi9cbiAgICBnZXQgaXNGaXJzdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIDAgPT09IHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBwb3NpdGlvbiBpbiBzdGFjayBpcyBsYXN0IG9yIG5vdCAqL1xuICAgIGdldCBpc0xhc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleCA9PT0gdGhpcy5fc3RhY2subGVuZ3RoIC0gMTtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgcHVibGljIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5fc3RhY2ssIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogY2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC4gKi9cbiAgICBwdWJsaWMgY2xlYXJGb3J3YXJkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjayA9IHRoaXMuX3N0YWNrLnNsaWNlKDAsIHRoaXMuX2luZGV4ICsgMSk7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuICovXG4gICAgcHVibGljIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICAgICAgICBjb25zdCB7IF9pbmRleDogYmFzZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IHRoaXMuX3N0YWNrXG4gICAgICAgICAgICAubWFwKChzLCBpbmRleCkgPT4geyByZXR1cm4geyBpbmRleCwgZGlzdGFuY2U6IE1hdGguYWJzKGJhc2UgLSBpbmRleCksIC4uLnMgfTsgfSlcbiAgICAgICAgICAgIC5maWx0ZXIocyA9PiBzWydAaWQnXSA9PT0gaWQpXG4gICAgICAgIDtcbiAgICAgICAgc29ydChjYW5kaWRhdGVzLCAobCwgcikgPT4gKGwuZGlzdGFuY2UgPiByLmRpc3RhbmNlID8gMSA6IC0xKSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGVzWzBdPy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogcmV0dXJuIGNsb3NldCBzdGFjayBpbmZvcm1hdGlvbiBieSB0byBJRCBhbmQgZnJvbSBJRC4gKi9cbiAgICBwdWJsaWMgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICBjb25zdCB0b0luZGV4ICAgPSB0aGlzLmNsb3Nlc3QodG9JZCk7XG4gICAgICAgIGNvbnN0IGZyb21JbmRleCA9IG51bGwgPT0gZnJvbUlkID8gdGhpcy5faW5kZXggOiB0aGlzLmNsb3Nlc3QoZnJvbUlkKTtcbiAgICAgICAgaWYgKG51bGwgPT0gZnJvbUluZGV4IHx8IG51bGwgPT0gdG9JbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uOiAnbWlzc2luZycgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gdG9JbmRleCAtIGZyb21JbmRleDtcbiAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IDAgPT09IGRlbHRhXG4gICAgICAgICAgICAgICAgPyAnbm9uZSdcbiAgICAgICAgICAgICAgICA6IGRlbHRhIDwgMCA/ICdiYWNrJyA6ICdmb3J3YXJkJztcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbiwgZGVsdGEsIGluZGV4OiB0b0luZGV4LCBzdGF0ZTogdGhpcy5fc3RhY2tbdG9JbmRleF0gfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBnZXQgYWN0aXZlIGRhdGEgZnJvbSBjdXJyZW50IGluZGV4IG9yaWdpbiAqL1xuICAgIHB1YmxpYyBkaXN0YW5jZShkZWx0YTogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgY29uc3QgcG9zID0gdGhpcy5faW5kZXggKyBkZWx0YTtcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBpbnZhbGlkIGFycmF5IGluZGV4LiBbbGVuZ3RoOiAke3RoaXMubGVuZ3RofSwgZ2l2ZW46ICR7cG9zfV1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hdChwb3MpO1xuICAgIH1cblxuICAgIC8qKiBub29wIHN0YWNrICovXG4gICAgcHVibGljIG5vb3BTdGFjayA9IG5vb3A7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1lbWJlci1hY2Nlc3NpYmlsaXR5XG5cbiAgICAvKiogcHVzaCBzdGFjayAqL1xuICAgIHB1YmxpYyBwdXNoU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrWysrdGhpcy5faW5kZXhdID0gZGF0YTtcbiAgICB9XG5cbiAgICAvKiogcmVwbGFjZSBzdGFjayAqL1xuICAgIHB1YmxpYyByZXBsYWNlU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrW3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHNlZWsgc3RhY2sgKi9cbiAgICBwdWJsaWMgc2Vla1N0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuY2xvc2VzdChkYXRhWydAaWQnXSk7XG4gICAgICAgIGlmIChudWxsID09IGluZGV4KSB7XG4gICAgICAgICAgICB0aGlzLnB1c2hTdGFjayhkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZGlzcG9zZSBvYmplY3QgKi9cbiAgICBwdWJsaWMgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2subGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faW5kZXggPSBOYU47XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzT2JqZWN0LFxuICAgIG5vb3AsXG4gICAgJGNkcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyB0b1VybCwgd2ViUm9vdCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgbm9ybWFsaXplSWQsXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uICovXG5pbnRlcmZhY2UgRGlzcGF0Y2hJbmZvPFQ+IHtcbiAgICBkZjogRGVmZXJyZWQ7XG4gICAgbmV3SWQ6IHN0cmluZztcbiAgICBvbGRJZDogc3RyaW5nO1xuICAgIHBvc3Rwcm9jOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2Vlayc7XG4gICAgbmV4dFN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xuICAgIHByZXZTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb25zdGFudCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgSEFTSF9QUkVGSVggPSAnIy8nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCByZW1vdmUgdXJsIHBhdGggc2VjdGlvbiAqL1xuY29uc3QgdG9IYXNoID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBpZCA9IC8jLiokLy5leGVjKHVybCk/LlswXTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiAnJztcbn07XG5cbi8qKiBAaW50ZXJuYWwgcmVtb3ZlIHVybCBwYXRoIHNlY3Rpb24gKi9cbmNvbnN0IHRvUGF0aCA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgaWQgPSB1cmwuc3Vic3RyaW5nKHdlYlJvb3QubGVuZ3RoKTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiB1cmw7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzZXREaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IFQgJiBVbmtub3duT2JqZWN0LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBUID0+IHtcbiAgICAoc3RhdGVbJGNkcF0gYXMgRGlzcGF0Y2hJbmZvPFQ+KSA9IGFkZGl0aW9uYWw7XG4gICAgcmV0dXJuIHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VEaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IFQgJiBVbmtub3duT2JqZWN0KTogW1QsIERpc3BhdGNoSW5mbzxUPj9dID0+IHtcbiAgICBpZiAoaXNPYmplY3Qoc3RhdGUpICYmIHN0YXRlWyRjZHBdKSB7XG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWwgPSBzdGF0ZVskY2RwXTtcbiAgICAgICAgZGVsZXRlIHN0YXRlWyRjZHBdO1xuICAgICAgICByZXR1cm4gW3N0YXRlLCBhZGRpdGlvbmFsIGFzIERpc3BhdGNoSW5mbzxUPl07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFtzdGF0ZV07XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ1Nlc3Npb25IaXN0b3J5I3NpZ25hdHVyZScpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBjbGFzcy5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTnrqHnkIbjgq/jg6njgrlcbiAqL1xuY2xhc3MgU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEhpc3RvcnlFdmVudDxUPj4gaW1wbGVtZW50cyBJSGlzdG9yeTxUPiB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfd2luZG93OiBXaW5kb3c7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfbW9kZTogJ2hhc2gnIHwgJ2hpc3RvcnknO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BvcFN0YXRlSGFuZGxlcjogKGV2OiBQb3BTdGF0ZUV2ZW50KSA9PiB2b2lkO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuICAgIHByaXZhdGUgX2RmR28/OiBEZWZlcnJlZDtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iod2luZG93Q29udHh0OiBXaW5kb3csIG1vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JywgaWQ/OiBzdHJpbmcsIHN0YXRlPzogVCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fd2luZG93ID0gd2luZG93Q29udHh0O1xuICAgICAgICB0aGlzLl9tb2RlID0gbW9kZTtcblxuICAgICAgICB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIgPSB0aGlzLm9uUG9wU3RhdGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcblxuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIHZvaWQgdGhpcy5yZXBsYWNlKG51bGwgIT0gaWQgPyBpZCA6IHRoaXMudG9JZCh0aGlzLl93aW5kb3cubG9jYXRpb24uaHJlZiksIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBwcmV2U3RhdGUgPSB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICAgICAgY29uc3Qgb2xkVVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICB0aGlzLnNldEluZGV4KDApO1xuICAgICAgICB0aGlzLmNsZWFyRm9yd2FyZCgpO1xuICAgICAgICBhd2FpdCB0aGlzLmJhY2tUb1Nlc3NzaW9uT3JpZ2luKCk7XG5cbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ1Nlc3Npb25IaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRoaXMudG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0aGlzLnRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogJ25vb3AnLFxuICAgICAgICAgICAgICAgIHByZXZTdGF0ZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyh0aGlzLnN0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICAvLyBpZiBhbHJlYWR5IGNhbGxlZCwgbm8gcmVhY3Rpb24uXG4gICAgICAgIGlmICh0aGlzLl9kZkdvKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICBpZiAoIWRlbHRhKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCB0aGlzLnN0YXRlLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2RmR28gPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhKTtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX2RmR287XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gZGVzdGluYXRpb24gc3RhY2sgaW5mb3JtYXRpb24gYnkgYHN0YXJ0YCBhbmQgYGVuZGAgSUQuXG4gICAgICogQGphIOi1t+eCuSwg57WC54K544GuIElEIOOCkuaMh+WumuOBl+OBpuOCueOCv+ODg+OCr+aDheWgseOCkui/lOWNtFxuICAgICAqL1xuICAgIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmRpcmVjdCh0b0lkLCBmcm9tSWQgYXMgc3RyaW5nKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIElEICovXG4gICAgcHJpdmF0ZSB0b0lkKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdoYXNoJyA9PT0gdGhpcy5fbW9kZSA/IHRvSGFzaChzcmMpIDogdG9QYXRoKHNyYyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFVSTCAqL1xuICAgIHByaXZhdGUgdG9VcmwoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAoJ2hhc2gnID09PSB0aGlzLl9tb2RlKSA/IGAke0NvbnN0LkhBU0hfUFJFRklYfSR7aWR9YCA6IHRvVXJsKGlkKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgZXZlbnQgJiB3YWl0IHByb2Nlc3MgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyaWdnZXJFdmVudEFuZFdhaXQoXG4gICAgICAgIGV2ZW50OiAncmVmcmVzaCcgfCAnY2hhbmdpbmcnLFxuICAgICAgICBhcmcxOiBIaXN0b3J5U3RhdGU8VD4sXG4gICAgICAgIGFyZzI6IEhpc3RvcnlTdGF0ZTxUPiB8IHVuZGVmaW5lZCB8ICgocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCksXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKGV2ZW50LCBhcmcxLCBhcmcyIGFzIGFueSwgcHJvbWlzZXMpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24sIGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcblxuICAgICAgICBjb25zdCBkYXRhID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZCA9IGRhdGFbJ0BpZCddO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgZGF0YVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgICAgIGhpc3RvcnlbYCR7bWV0aG9kfVN0YXRlYF0oZGF0YSwgJycsIHRoaXMudG9VcmwoaWQpKTtcbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQoZGF0YSwgdGhpcy5fc3RhY2sgYXMgSGlzdG9yeVN0YWNrKTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBuZXcgRGVmZXJyZWQoY2FuY2VsKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdGhpcy50b0lkKG5ld1VSTCksXG4gICAgICAgICAgICAgICAgb2xkSWQ6IHRoaXMudG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgbmV4dFN0YXRlOiBkYXRhLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKGRhdGEsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0oZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGRpc3BhdGNoIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBkaXNwYXRjaENoYW5nZUluZm8obmV3U3RhdGU6IFQgJiBVbmtub3duT2JqZWN0LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzZXREaXNwYXRjaEluZm8obmV3U3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB0aGlzLl93aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgUG9wU3RhdGVFdmVudCgncG9wc3RhdGUnLCB7IHN0YXRlIH0pKTtcbiAgICAgICAgYXdhaXQgYWRkaXRpb25hbC5kZjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNpbGVudCBwb3BzdGF0ZSBldmVudCBsaXN0bmVyIHNjb3BlICovXG4gICAgcHJpdmF0ZSBhc3luYyBzdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShleGVjdXRvcjogKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pID0+IFByb21pc2U8dm9pZD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgICAgICBjb25zdCB3YWl0UG9wU3RhdGUgPSAoKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXYuc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCBleGVjdXRvcih3YWl0UG9wU3RhdGUpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcm9sbGJhY2sgaGlzdG9yeSAqL1xuICAgIHByaXZhdGUgYXN5bmMgcm9sbGJhY2tIaXN0b3J5KG1ldGhvZDogc3RyaW5nLCBuZXdJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAncmVwbGFjZSc6XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUodGhpcy5zdGF0ZSwgJycsIHRoaXMudG9VcmwodGhpcy5pZCkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncHVzaCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICBoaXN0b3J5LmdvKC0xKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRoaXMuaW5kZXggLSAodGhpcy5jbG9zZXN0KG5ld0lkKSBhcyBudW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCAhPT0gZGVsdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWx0YSAmJiBoaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZm9sbG93IHRoZSBzZXNzaW9uIGhpc3RvcnkgdW50aWwgYG9yaWdpbmAgKGluIHNpbGVudCkgKi9cbiAgICBwcml2YXRlIGFzeW5jIGJhY2tUb1Nlc3NzaW9uT3JpZ2luKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc09yaWdpbiA9IChzdDogdW5rbm93bik6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiAoc3QgJiYgKHN0IGFzIFVua25vd25PYmplY3QpWydAb3JpZ2luJ10pIGFzIGJvb2xlYW47XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IGhpc3Rvcnkuc3RhdGU7XG4gICAgICAgICAgICB3aGlsZSAoIWlzT3JpZ2luKHN0YXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgcmVjZWl2ZSBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25Qb3BTdGF0ZShldjogUG9wU3RhdGVFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IFtuZXdTdGF0ZSwgYWRkaXRpb25hbF0gPSBwYXJzZURpc3BhdGNoSW5mbyhldi5zdGF0ZSk7XG4gICAgICAgIGNvbnN0IG5ld0lkICAgPSBhZGRpdGlvbmFsPy5uZXdJZCB8fCB0aGlzLnRvSWQobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGNvbnN0IG1ldGhvZCAgPSBhZGRpdGlvbmFsPy5wb3N0cHJvYyB8fCAnc2Vlayc7XG4gICAgICAgIGNvbnN0IGRmICAgICAgPSBhZGRpdGlvbmFsPy5kZiB8fCB0aGlzLl9kZkdvIHx8IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICBjb25zdCBvbGREYXRhID0gYWRkaXRpb25hbD8ucHJldlN0YXRlIHx8IHRoaXMuc3RhdGU7XG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSBhZGRpdGlvbmFsPy5uZXh0U3RhdGUgfHwgdGhpcy5kaXJlY3QobmV3SWQpLnN0YXRlIHx8IGNyZWF0ZURhdGEobmV3SWQsIG5ld1N0YXRlKTtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZVxuICAgICAgICAgICAgZGYuY2F0Y2gobm9vcCk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgnY2hhbmdpbmcnLCBuZXdEYXRhLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdEYXRhKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgncmVmcmVzaCcsIG5ld0RhdGEsIG9sZERhdGEpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIGhpc3Rvcnkg44KS5YWD44Gr5oi744GZXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJvbGxiYWNrSGlzdG9yeShtZXRob2QsIG5ld0lkKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFtbY3JlYXRlU2Vzc2lvbkhpc3RvcnldXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tjcmVhdGVTZXNzaW9uSGlzdG9yeV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKiBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMge1xuICAgIGNvbnRleHQ/OiBXaW5kb3c7XG4gICAgbW9kZT86ICdoYXNoJyB8ICdoaXN0b3J5Jztcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW1Nlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc11dIG9iamVjdFxuICogIC0gYGphYCBbW1Nlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc11dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZD86IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zKTogSUhpc3Rvcnk8VD4ge1xuICAgIGNvbnN0IHsgY29udGV4dCwgbW9kZSB9ID0gT2JqZWN0LmFzc2lnbih7IG1vZGU6ICdoYXNoJyB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFNlc3Npb25IaXN0b3J5KGNvbnRleHQgfHwgd2luZG93LCBtb2RlLCBpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBicm93c2VyIHNlc3Npb24gaGlzdG9yeS5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7IFBsYWluT2JqZWN0LCBwb3N0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ01lbW9yeUhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZDogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQsIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIHRoaXMuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgZGYgPSBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ01lbW9yeUhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ25vb3AnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gYmFjayBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkJhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNGaXJzdDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzTGFzdDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hdChpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3Qgb2xkSW5kZXggPSB0aGlzLmluZGV4O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBpZiBnaXZlbiAwLCBqdXN0IHJlbG9hZC5cbiAgICAgICAgICAgIGNvbnN0IG9sZFN0YXRlID0gZGVsdGEgPyB0aGlzLnN0YXRlIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLl9zdGFjay5kaXN0YW5jZShkZWx0YSB8fCAwKTtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKCdzZWVrJywgZGYsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZSk7XG4gICAgICAgICAgICB0aGlzLnNldEluZGV4KG9sZEluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gZGVzdGluYXRpb24gc3RhY2sgaW5mb3JtYXRpb24gYnkgYHN0YXJ0YCBhbmQgYGVuZGAgSUQuXG4gICAgICogQGphIOi1t+eCuSwg57WC54K544GuIElEIOOBi+OCiee1gueCueOBruOCueOCv+ODg+OCr+aDheWgseOCkui/lOWNtFxuICAgICAqL1xuICAgIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmRpcmVjdCh0b0lkLCBmcm9tSWQgYXMgc3RyaW5nKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgbmV3U3RhdGVbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQobmV3U3RhdGUsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKGNhbmNlbCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKG1ldGhvZCwgZGYsIG5ld1N0YXRlLCB0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBzdGF0ZSBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNoYW5nZVN0YXRlKG1ldGhvZDogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnLCBkZjogRGVmZXJyZWQsIG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8VD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld1N0YXRlLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IElIaXN0b3J5PFQ+IHtcbiAgICByZXR1cm4gbmV3IE1lbW9yeUhpc3RvcnkoaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgbWVtb3J5IGhpc3RvcnkuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiaW1wb3J0IHsgcGF0aDJyZWdleHAgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5pbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIENsYXNzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBzbGVlcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICB0b1F1ZXJ5U3RyaW5ncyxcbiAgICBwYXJzZVVybFF1ZXJ5LFxuICAgIGNvbnZlcnRVcmxQYXJhbVR5cGUsXG59IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgbG9hZFRlbXBsYXRlU291cmNlLCB0b1RlbXBsYXRlRWxlbWVudCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBJSGlzdG9yeSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgREVGQVVMVF9QUkVGSVggICAgICAgPSAnY2RwJyxcbiAgICBUUkFOU0lUSU9OX0RJUkVDVElPTiA9ICd0cmFuc2l0aW9uLWRpcmVjdGlvbicsXG4gICAgVFJBTlNJVElPTl9SVU5OSU5HICAgPSAndHJhbnNpdGlvbi1ydW5uaW5nJyxcbiAgICBQQUdFX0NVUlJFTlQgICAgICAgICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgICAgICAgID0gJ3BhZ2UtcHJldmlvdXMnLFxuICAgIEVOVEVSX0ZST01fQ0xBU1MgICAgID0gJ2VudGVyLWZyb20nLFxuICAgIEVOVEVSX0FDVElWRV9DTEFTUyAgID0gJ2VudGVyLWFjdGl2ZScsXG4gICAgRU5URVJfVE9fQ0xBU1MgICAgICAgPSAnZW50ZXItdG8nLFxuICAgIExFQVZFX0ZST01fQ0xBU1MgICAgID0gJ2xlYXZlLWZyb20nLFxuICAgIExFQVZFX0FDVElWRV9DTEFTUyAgID0gJ2xlYXZlLWFjdGl2ZScsXG4gICAgTEVBVkVfVE9fQ0xBU1MgICAgICAgPSAnbGVhdmUtdG8nLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBEb21DYWNoZSB7XG4gICAgREFUQV9OQU1FICAgICAgICAgICA9ICdkb20tY2FjaGUnLFxuICAgIENBQ0hFX0xFVkVMX01FTU9SWSAgPSAnbWVtb3J5JyxcbiAgICBDQUNIRV9MRVZFTF9DT05ORUNUID0gJ2Nvbm5lY3QnLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBMaW5rRGF0YSB7XG4gICAgVFJBTlNJVElPTiAgICAgPSAndHJhbnNpdGlvbicsXG4gICAgUFJFVkVOVF9ST1VURVIgPSAncHJldmVudC1yb3V0ZXInLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDb25zdCB7XG4gICAgV0FJVF9UUkFOU0lUSU9OX01BUkdJTiA9IDEwMCwgLy8gbXNlY1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBQYWdlRXZlbnQgPSAnaW5pdCcgfCAnbW91bnRlZCcgfCAnYmVmb3JlLWVudGVyJyB8ICdhZnRlci1lbnRlcicgfCAnYmVmb3JlLWxlYXZlJyB8ICdhZnRlci1sZWF2ZScgfCAndW5tb3VudGVkJyB8ICdyZW1vdmVkJztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZmxhdCBSb3V0ZVBhcmFtZXRlcnMgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSBPbWl0PFJvdXRlUGFyYW1ldGVycywgJ3JvdXRlcyc+ICYge1xuICAgIC8qKiByZWdleHAgZnJvbSBwYXRoICovXG4gICAgcmVnZXhwOiBSZWdFeHA7XG4gICAgLyoqIGtleXMgb2YgcGFyYW1zICovXG4gICAgcGFyYW1LZXlzOiBzdHJpbmdbXTtcbiAgICAvKiogRE9NIHRlbXBsYXRlIGluc3RhbmNlIHdpdGggUGFnZSBlbGVtZW50ICovXG4gICAgJHRlbXBsYXRlPzogRE9NO1xuICAgIC8qKiByb3V0ZXIgcGFnZSBpbnN0YW5jZSBmcm9tIGBjb21wb25lbnRgIHByb3BlcnR5ICovXG4gICAgcGFnZT86IFBhZ2U7XG59O1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0ID0gV3JpdGFibGU8Um91dGU+ICYgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyAmIHtcbiAgICAnQHBhcmFtcyc6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7XG4gICAgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtcztcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgdG8gUm91dGVDb250ZXh0ICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZUNvbnRleHQgPSAodXJsOiBzdHJpbmcsIHJvdXRlcjogUm91dGVyLCBwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsIG5hdk9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUm91dGVDb250ZXh0ID0+IHtcbiAgICAvLyBvbWl0IHVuY2xvbmFibGUgcHJvcHNcbiAgICBjb25zdCBmcm9tTmF2aWdhdGUgPSAhIW5hdk9wdGlvbnM7XG4gICAgY29uc3QgZW5zdXJlQ2xvbmUgPSAoY3R4OiB1bmtub3duKTogUm91dGVDb250ZXh0ID0+IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3R4KSk7XG4gICAgY29uc3QgY29udGV4dCA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIHJvdXRlcjogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcm91dGVyLFxuICAgICAgICB9LFxuICAgICAgICBuYXZPcHRpb25zLFxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBmb3JjZSBvdmVycmlkZVxuICAgICAgICAgICAgcXVlcnk6IHt9LFxuICAgICAgICAgICAgcGFyYW1zOiB7fSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcy5wYXRoLFxuICAgICAgICAgICAgJ0BwYXJhbXMnOiBmcm9tTmF2aWdhdGUgPyB1bmRlZmluZWQgOiBwYXJhbXMsXG4gICAgICAgIH0sXG4gICAgKTtcbiAgICByZXR1cm4gZnJvbU5hdmlnYXRlID8gZW5zdXJlQ2xvbmUoY29udGV4dCkgOiBjb250ZXh0IGFzIFJvdXRlQ29udGV4dDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCBjb250ZXh0IHBhcmFtcyAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IChyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdIHwgdW5kZWZpbmVkKTogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0+IHtcbiAgICBjb25zdCBmbGF0dGVuID0gKHBhcmVudFBhdGg6IHN0cmluZywgbmVzdGVkOiBSb3V0ZVBhcmFtZXRlcnNbXSk6IFJvdXRlUGFyYW1ldGVyc1tdID0+IHtcbiAgICAgICAgY29uc3QgcmV0dmFsOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG4gb2YgbmVzdGVkKSB7XG4gICAgICAgICAgICBuLnBhdGggPSBgJHtwYXJlbnRQYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7bm9ybWFsaXplSWQobi5wYXRoKX1gO1xuICAgICAgICAgICAgcmV0dmFsLnB1c2gobik7XG4gICAgICAgICAgICBpZiAobi5yb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaCguLi5mbGF0dGVuKG4ucGF0aCwgbi5yb3V0ZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmxhdHRlbignJywgaXNBcnJheShyb3V0ZXMpID8gcm91dGVzIDogcm91dGVzID8gW3JvdXRlc10gOiBbXSlcbiAgICAgICAgLm1hcCgoc2VlZDogUm91dGVDb250ZXh0UGFyYW1ldGVycykgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5czogcGF0aDJyZWdleHAuS2V5W10gPSBbXTtcbiAgICAgICAgICAgIHNlZWQucmVnZXhwID0gcGF0aDJyZWdleHAucGF0aFRvUmVnZXhwKHNlZWQucGF0aCwga2V5cyk7XG4gICAgICAgICAgICBzZWVkLnBhcmFtS2V5cyA9IGtleXMuZmlsdGVyKGsgPT4gaXNTdHJpbmcoay5uYW1lKSkubWFwKGsgPT4gay5uYW1lIGFzIHN0cmluZyk7XG4gICAgICAgICAgICByZXR1cm4gc2VlZDtcbiAgICAgICAgfSk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBwcmVwYXJlIElIaXN0b3J5IG9iamVjdCAqL1xuZXhwb3J0IGNvbnN0IHByZXBhcmVIaXN0b3J5ID0gKHNlZWQ6ICdoYXNoJyB8ICdoaXN0b3J5JyB8ICdtZW1vcnknIHwgSUhpc3RvcnkgPSAnaGFzaCcsIGluaXRpYWxQYXRoPzogc3RyaW5nLCBjb250ZXh0PzogV2luZG93KTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgcmV0dXJuIChpc1N0cmluZyhzZWVkKVxuICAgICAgICA/ICdtZW1vcnknID09PSBzZWVkID8gY3JlYXRlTWVtb3J5SGlzdG9yeShpbml0aWFsUGF0aCB8fCAnJykgOiBjcmVhdGVTZXNzaW9uSGlzdG9yeShpbml0aWFsUGF0aCwgdW5kZWZpbmVkLCB7IG1vZGU6IHNlZWQsIGNvbnRleHQgfSlcbiAgICAgICAgOiBzZWVkXG4gICAgKSBhcyBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGJ1aWxkTmF2aWdhdGVVcmwgPSAocGF0aDogc3RyaW5nLCBvcHRpb25zOiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogc3RyaW5nID0+IHtcbiAgICB0cnkge1xuICAgICAgICBwYXRoID0gYC8ke25vcm1hbGl6ZUlkKHBhdGgpfWA7XG4gICAgICAgIGNvbnN0IHsgcXVlcnksIHBhcmFtcyB9ID0gb3B0aW9ucztcbiAgICAgICAgbGV0IHVybCA9IHBhdGgycmVnZXhwLmNvbXBpbGUocGF0aCkocGFyYW1zIHx8IHt9KTtcbiAgICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKHF1ZXJ5KX1gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELFxuICAgICAgICAgICAgYENvbnN0cnVjdCByb3V0ZSBkZXN0aW5hdGlvbiBmYWlsZWQuIFtwYXRoOiAke3BhdGh9LCBkZXRhaWw6ICR7ZXJyb3IudG9TdHJpbmcoKX1dYCxcbiAgICAgICAgICAgIGVycm9yLFxuICAgICAgICApO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBwYXJzZVVybFBhcmFtcyA9IChyb3V0ZTogUm91dGVDb250ZXh0KTogdm9pZCA9PiB7XG4gICAgY29uc3QgeyB1cmwgfSA9IHJvdXRlO1xuICAgIHJvdXRlLnF1ZXJ5ICA9IHVybC5pbmNsdWRlcygnPycpID8gcGFyc2VVcmxRdWVyeShub3JtYWxpemVJZCh1cmwpKSA6IHt9O1xuICAgIHJvdXRlLnBhcmFtcyA9IHt9O1xuXG4gICAgY29uc3QgeyByZWdleHAsIHBhcmFtS2V5cyB9ID0gcm91dGVbJ0BwYXJhbXMnXTtcbiAgICBpZiAocGFyYW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSByZWdleHAuZXhlYyh1cmwpPy5tYXAoKHZhbHVlLCBpbmRleCkgPT4geyByZXR1cm4geyB2YWx1ZSwga2V5OiBwYXJhbUtleXNbaW5kZXggLSAxXSB9OyB9KTtcbiAgICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBwYXJhbXMhKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgaWYgKG51bGwgIT0gcGFyYW0ua2V5KSB7XG4gICAgICAgICAgICAgICAgYXNzaWduVmFsdWUocm91dGUucGFyYW1zLCBwYXJhbS5rZXksIGNvbnZlcnRVcmxQYXJhbVR5cGUocGFyYW0udmFsdWUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzI2luc3RhbmNlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlID0gYXN5bmMgKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCB7ICdAcGFyYW1zJzogcGFyYW1zIH0gPSByb3V0ZTtcblxuICAgIGlmIChwYXJhbXMucGFnZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IHsgY29tcG9uZW50LCBjb21wb25lbnRPcHRpb25zIH0gPSBwYXJhbXM7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29tcG9uZW50KSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9hd2FpdC10aGVuYWJsZVxuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBhd2FpdCBuZXcgKGNvbXBvbmVudCBhcyB1bmtub3duIGFzIENsYXNzKShyb3V0ZSwgY29tcG9uZW50T3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBhd2FpdCBjb21wb25lbnQocm91dGUsIGNvbXBvbmVudE9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChjb21wb25lbnQpKSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0gT2JqZWN0LmFzc2lnbih7ICdAcm91dGUnOiByb3V0ZSwgJ0BvcHRpb25zJzogY29tcG9uZW50T3B0aW9ucyB9LCBjb21wb25lbnQpIGFzIFBhZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLnBhZ2UgPSB7ICdAcm91dGUnOiByb3V0ZSwgJ0BvcHRpb25zJzogY29tcG9uZW50T3B0aW9ucyB9IGFzIFBhZ2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIG5ld2x5IGNyZWF0ZWRcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMjJHRlbXBsYXRlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlID0gYXN5bmMgKHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGlmIChwYXJhbXMuJHRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgZW5zdXJlSW5zdGFuY2UgPSAoZWw6IEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkKTogRE9NID0+IHtcbiAgICAgICAgcmV0dXJuIGVsIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/ICQoWy4uLmVsLmNvbnRlbnQuY2hpbGRyZW5dKSBhcyBET00gOiAkKGVsKTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyBjb250ZW50IH0gPSBwYXJhbXM7XG4gICAgaWYgKG51bGwgPT0gY29udGVudCkge1xuICAgICAgICAvLyBub29wIGVsZW1lbnRcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9ICQ8SFRNTEVsZW1lbnQ+KCk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZygoY29udGVudCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ3NlbGVjdG9yJ10pKSB7XG4gICAgICAgIC8vIGZyb20gYWpheFxuICAgICAgICBjb25zdCB7IHNlbGVjdG9yLCB1cmwgfSA9IGNvbnRlbnQgYXMgeyBzZWxlY3Rvcjogc3RyaW5nOyB1cmw/OiBzdHJpbmc7IH07XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdG9UZW1wbGF0ZUVsZW1lbnQoYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybCB9KSk7XG4gICAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGB0ZW1wbGF0ZSBsb2FkIGZhaWxlZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yfSwgdXJsOiAke3VybH1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKHRlbXBsYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCAkZWwgPSAkKGNvbnRlbnQgYXMgRE9NU2VsZWN0b3IpO1xuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UoJGVsWzBdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBkZWNpZGUgdHJhbnNpdGlvbiBkaXJlY3Rpb24gKi9cbmV4cG9ydCBjb25zdCBkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uID0gKGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IEhpc3RvcnlEaXJlY3Rpb24gPT4ge1xuICAgIGlmIChjaGFuZ2VJbmZvLnJldmVyc2UpIHtcbiAgICAgICAgc3dpdGNoIChjaGFuZ2VJbmZvLmRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnYmFjayc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdmb3J3YXJkJztcbiAgICAgICAgICAgIGNhc2UgJ2ZvcndhcmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnYmFjayc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjaGFuZ2VJbmZvLmRpcmVjdGlvbjtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgRWZmZWN0VHlwZSA9ICdhbmltYXRpb24nIHwgJ3RyYW5zaXRpb24nO1xuXG4vKiogQGludGVybmFsIHJldHJpZXZlIGVmZmVjdCBkdXJhdGlvbiBwcm9wZXJ0eSAqL1xuY29uc3QgZ2V0RWZmZWN0RHVyYXRpb25TZWMgPSAoJGVsOiBET00sIGVmZmVjdDogRWZmZWN0VHlwZSk6IG51bWJlciA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZSgkZWxbMF0pW2Ake2VmZmVjdH1EdXJhdGlvbmBdKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgd2FpdEZvckVmZmVjdCA9ICgkZWw6IERPTSwgZWZmZWN0OiBFZmZlY3RUeXBlLCBkdXJhdGlvblNlYzogbnVtYmVyKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgcmV0dXJuIFByb21pc2UucmFjZShbXG4gICAgICAgIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gJGVsW2Ake2VmZmVjdH1FbmRgXShyZXNvbHZlKSksXG4gICAgICAgIHNsZWVwKGR1cmF0aW9uU2VjICogMTAwMCArIENvbnN0LldBSVRfVFJBTlNJVElPTl9NQVJHSU4pLFxuICAgIF0pO1xufTtcblxuLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIGV4ZWN1dGlvbiAqL1xuZXhwb3J0IGNvbnN0IHByb2Nlc3NQYWdlVHJhbnNpdGlvbiA9IGFzeW5jKCRlbDogRE9NLCBmcm9tQ2xhc3M6IHN0cmluZywgYWN0aXZlQ2xhc3M6IHN0cmluZywgdG9DbGFzczogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgJGVsLnJlbW92ZUNsYXNzKGZyb21DbGFzcyk7XG4gICAgJGVsLmFkZENsYXNzKHRvQ2xhc3MpO1xuXG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIFsnYW5pbWF0aW9uJywgJ3RyYW5zaXRpb24nXSBhcyBFZmZlY3RUeXBlW10pIHtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBnZXRFZmZlY3REdXJhdGlvblNlYygkZWwsIGVmZmVjdCk7XG4gICAgICAgIGR1cmF0aW9uICYmIHByb21pc2VzLnB1c2god2FpdEZvckVmZmVjdCgkZWwsIGVmZmVjdCwgZHVyYXRpb24pKTtcbiAgICB9XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgJGVsLnJlbW92ZUNsYXNzKFthY3RpdmVDbGFzcywgdG9DbGFzc10pO1xufTtcbiIsImltcG9ydCB0eXBlIHsgUm91dGVBeW5jUHJvY2VzcywgUm91dGVDaGFuZ2VJbmZvIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUF5bmNQcm9jZXNzIGltcGxlbWVudGF0aW9uICovXG5leHBvcnQgY2xhc3MgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgaW1wbGVtZW50cyBSb3V0ZUF5bmNQcm9jZXNzIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBSb3V0ZUF5bmNQcm9jZXNzXG5cbiAgICByZWdpc3Rlcihwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWwgbWV0aG9kczpcblxuICAgIGdldCBwcm9taXNlcygpOiByZWFkb25seSBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbWlzZXM7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGNvbXBsZXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9wcm9taXNlcyk7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLmxlbmd0aCA9IDA7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQgZXh0ZW5kcyBSb3V0ZUNoYW5nZUluZm8ge1xuICAgIHJlYWRvbmx5IGFzeW5jUHJvY2VzczogUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQ7XG59XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2FtZWxpemUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgaXNSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUgeyBJSGlzdG9yeSwgSGlzdG9yeVN0YXRlIH0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlckV2ZW50LFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFRyYW5zaXRpb25TZXR0aW5ncyxcbiAgICBQYWdlU3RhY2ssXG4gICAgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXMsXG4gICAgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXJSZWZyZXNoTGV2ZWwsXG4gICAgUm91dGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBDc3NOYW1lLFxuICAgIERvbUNhY2hlLFxuICAgIExpbmtEYXRhLFxuICAgIFBhZ2VFdmVudCxcbiAgICBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLFxuICAgIFJvdXRlQ29udGV4dCxcbiAgICB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgdG9Sb3V0ZUNvbnRleHQsXG4gICAgcHJlcGFyZUhpc3RvcnksXG4gICAgYnVpbGROYXZpZ2F0ZVVybCxcbiAgICBwYXJzZVVybFBhcmFtcyxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UsXG4gICAgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlLFxuICAgIGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24sXG4gICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LCBSb3V0ZUNoYW5nZUluZm9Db250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFJvdXRlciBpbXBsaW1lbnQgY2xhc3MuXG4gKiBAamEgUm91dGVyIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSb3V0ZXJDb250ZXh0IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8Um91dGVyRXZlbnQ+IGltcGxlbWVudHMgUm91dGVyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXM6IFJlY29yZDxzdHJpbmcsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnM+ID0ge307XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kZWw6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yYWY6IFVua25vd25GdW5jdGlvbjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5Q2hhbmdpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeVJlZnJlc2hIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5UmVmcmVzaDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9lcnJvckhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhhbmRsZUVycm9yO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Nzc1ByZWZpeDogc3RyaW5nO1xuICAgIHByaXZhdGUgX3RyYW5zaXRpb25TZXR0aW5nczogVHJhbnNpdGlvblNldHRpbmdzO1xuICAgIHByaXZhdGUgX2xhc3RSb3V0ZT86IFJvdXRlQ29udGV4dDtcbiAgICBwcml2YXRlIF9wcmV2Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfdGVtcFRyYW5zaXRpb25QYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcztcbiAgICBwcml2YXRlIF9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zOiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgcm91dGVzLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHdpbmRvdzogY29udGV4dCxcbiAgICAgICAgICAgIGhpc3RvcnksXG4gICAgICAgICAgICBpbml0aWFsUGF0aCxcbiAgICAgICAgICAgIGNzc1ByZWZpeCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICAgICAgdGhpcy5fcmFmID0gY29udGV4dD8ucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cbiAgICAgICAgdGhpcy5fJGVsID0gJChzZWxlY3RvciwgZWwpO1xuICAgICAgICBpZiAoIXRoaXMuXyRlbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9FTEVNRU5UX05PVF9GT1VORCwgYFJvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yIGFzIHN0cmluZ31dYCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9oaXN0b3J5ID0gcHJlcGFyZUhpc3RvcnkoaGlzdG9yeSwgaW5pdGlhbFBhdGgsIGNvbnRleHQgYXMgV2luZG93KTtcbiAgICAgICAgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlciA9IHRoaXMub25IaXN0b3J5Q2hhbmdpbmcuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyICA9IHRoaXMub25IaXN0b3J5UmVmcmVzaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9lcnJvckhhbmRsZXIgICAgICAgICAgID0gdGhpcy5vbkhhbmRsZUVycm9yLmJpbmQodGhpcyk7XG5cbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG5cbiAgICAgICAgLy8gZm9sbG93IGFuY2hvclxuICAgICAgICB0aGlzLl8kZWwub24oJ2NsaWNrJywgJ1tocmVmXScsIHRoaXMub25BbmNob3JDbGlja2VkLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX2Nzc1ByZWZpeCA9IGNzc1ByZWZpeCB8fCBDc3NOYW1lLkRFRkFVTFRfUFJFRklYO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgZGVmYXVsdDogJ25vbmUnLCByZWxvYWQ6ICdub25lJyB9LCB0cmFuc2l0aW9uKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyKHJvdXRlcyBhcyBSb3V0ZVBhcmFtZXRlcnNbXSwgc3RhcnQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBzdGF0ZSBpcyBpbiBzdWItZmxvdyAqL1xuICAgIGdldCBpc0luU3ViRmxvdygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuQmFjaztcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5Gb3J3YXJkO1xuICAgIH1cblxuICAgIC8qKiBSb3V0ZSByZWdpc3RyYXRpb24gKi9cbiAgICByZWdpc3Rlcihyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdLCByZWZyZXNoID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyhyb3V0ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3V0ZXNbY29udGV4dC5wYXRoXSA9IGNvbnRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmVmcmVzaCAmJiB2b2lkIHRoaXMuZ28oKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIE5hdmlnYXRlIHRvIG5ldyBwYWdlLiAqL1xuICAgIGFzeW5jIG5hdmlnYXRlKHRvOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1ldGVyKHRvKTtcbiAgICAgICAgICAgIGlmICghc2VlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsIGBSb3V0ZSBub3QgZm91bmQuIFt0bzogJHt0b31dYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG9wdHMgID0gT2JqZWN0LmFzc2lnbih7IGludGVudDogdW5kZWZpbmVkIH0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgdXJsICAgPSBidWlsZE5hdmlnYXRlVXJsKHRvLCBvcHRzKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBzZWVkLCBvcHRzKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBleGVjIG5hdmlnYXRlXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5wdXNoKHVybCwgcm91dGUpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQWRkIHBhZ2Ugc3RhY2sgc3RhcnRpbmcgZnJvbSB0aGUgY3VycmVudCBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIHB1c2hQYWdlU3RhY2soc3RhY2s6IFBhZ2VTdGFjayB8IFBhZ2VTdGFja1tdLCBub05hdmlnYXRlPzogYm9vbGVhbik6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3RhY2tzID0gaXNBcnJheShzdGFjaykgPyBzdGFjayA6IFtzdGFja107XG4gICAgICAgICAgICBjb25zdCByb3V0ZXMgPSBzdGFja3MuZmlsdGVyKHMgPT4gISFzLnJvdXRlKS5tYXAocyA9PiBzLnJvdXRlIGFzIFJvdXRlUGFyYW1ldGVycyk7XG5cbiAgICAgICAgICAgIC8vIGVuc3J1ZSBSb3V0ZVxuICAgICAgICAgICAgdGhpcy5yZWdpc3Rlcihyb3V0ZXMsIGZhbHNlKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gcHVzaCBoaXN0b3J5XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIHN0YWNrcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHVybCwgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gcGFnZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1ldGVyKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09IHBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCwgYFJvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4gW3VybDogJHt1cmx9XWAsIHBhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbGVudCByZWdpc3RyeVxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRvUm91dGVDb250ZXh0KHVybCwgdGhpcywgcGFyYW1zLCB7IGludGVudDogdW5kZWZpbmVkIH0pO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS50cmFuc2l0aW9uID0gdHJhbnNpdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUucmV2ZXJzZSAgICA9IHJldmVyc2U7XG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5faGlzdG9yeS5wdXNoKHVybCwgcm91dGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobm9OYXZpZ2F0ZSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmdvKC0xICogc3RhY2tzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghbm9OYXZpZ2F0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZ28oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICBhc3luYyB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS50cmF2ZXJzZVRvKGlkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEJlZ2luIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGJlZ2luU3ViRmxvdyh0bzogc3RyaW5nLCBzdWJmbG93PzogUm91dGVTdWJGbG93UGFyYW1zLCBvcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7fSwgc3ViZmxvdyB8fCB7fSk7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRpb25TdWJGbG93UGFyYW1zKHBhcmFtcyk7XG4gICAgICAgICAgICAodGhpcy5jdXJyZW50Um91dGUgYXMgUm91dGVDb250ZXh0KS5zdWJmbG93ID0gcGFyYW1zO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5uYXZpZ2F0ZSh0bywgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ29tbWl0IHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNvbW1pdFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBgcmV2ZXJzZWA6IOWxpeattOS4iuOBryBgYmFja2Ag5pa55ZCR44Gr44Gq44KL44Gf44KBLCBJL0Yg5oyH5a6a5pa55ZCR44Go5Y+N6Lui44GZ44KL44KI44GG44Gr6Kq/5pW0XG4gICAgICAgIHRoaXMuX3RlbXBUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7fSwgcGFyYW1zLCB7IHJldmVyc2U6ICFwYXJhbXM/LnJldmVyc2UgfSk7XG4gICAgICAgIGNvbnN0IHsgYWRkaXRpb25hbERpc3RhbmNlLCBhZGRpdGluYWxTdGFja3MgfSA9IHN1YmZsb3cucGFyYW1zO1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHN1YmZsb3cuZGlzdGFuY2UgKyBhZGRpdGlvbmFsRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGFkZGl0aW5hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKCgpID0+IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW5hbFN0YWNrcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogZGlzdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENhbmNlbCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjYW5jZWxTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYHJldmVyc2VgOiDlsaXmrbTkuIrjga8gYGJhY2tgIOaWueWQkeOBq+OBquOCi+OBn+OCgSwgSS9GIOaMh+WumuaWueWQkeOBqOWPjei7ouOBmeOCi+OCiOOBhuOBq+iqv+aVtC4gZGVmYXVsdDogdHJ1ZVxuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIHBhcmFtcywgeyByZXZlcnNlOiAhT2JqZWN0LmFzc2lnbih7IHJldmVyc2U6IHRydWUgfSwgcGFyYW1zKS5yZXZlcnNlIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogc3ViZmxvdy5kaXN0YW5jZSk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFNldCBjb21tb24gdHJhbnNpdGlvbiBzZXR0bmlncy4gKi9cbiAgICBzZXRUcmFuc2l0aW9uU2V0dGluZ3MobmV3U2V0dGluZ3M6IFRyYW5zaXRpb25TZXR0aW5ncyk6IFRyYW5zaXRpb25TZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0gdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgPSB7IC4uLm5ld1NldHRpbmdzIH07XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogUmVmcmVzaCByb3V0ZXIgKHNwZWNpZnkgdXBkYXRlIGxldmVsKS4gKi9cbiAgICBhc3luYyByZWZyZXNoKGxldmVsID0gUm91dGVyUmVmcmVzaExldmVsLlJFTE9BRCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIGNhc2UgUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUjoge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGhpcy5faGlzdG9yeS5zdGFjaykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKHJvdXRlLmVsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnZSA9IHJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRlbC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bm1vdW50ZWQnLCByb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3VubW91bnRlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocm91dGUuZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gbnVsbCE7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bnN1cHBvcnRlZCBsZXZlbDogJHtsZXZlbH1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogc3ViLWZsb3dcblxuICAgIC8qKiBAaW50ZXJuYWwgZXZhbHVhdGlvbiBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBldmFsdWF0aW9uU3ViRmxvd1BhcmFtcyhzdWJmbG93OiBSb3V0ZVN1YkZsb3dQYXJhbXMpOiB2b2lkIHtcbiAgICAgICAgbGV0IGFkZGl0aW9uYWxEaXN0YW5jZSA9IDA7XG5cbiAgICAgICAgaWYgKHN1YmZsb3cuYmFzZSkge1xuICAgICAgICAgICAgY29uc3QgYmFzZUlkID0gbm9ybWFsaXplSWQoc3ViZmxvdy5iYXNlKTtcbiAgICAgICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc3QgeyBpbmRleCwgc3RhY2sgfSA9IHRoaXMuX2hpc3Rvcnk7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gaW5kZXg7IGkgPj0gMDsgaS0tLCBhZGRpdGlvbmFsRGlzdGFuY2UrKykge1xuICAgICAgICAgICAgICAgIGlmIChzdGFja1tpXVsnQGlkJ10gPT09IGJhc2VJZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfSU5WQUxJRF9TVUJGTE9XX0JBU0VfVVJMLCBgSW52YWxpZCBzdWItZmxvdyBiYXNlIHVybC4gW3VybDogJHtzdWJmbG93LmJhc2V9XWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3ViZmxvdy5iYXNlID0gdGhpcy5jdXJyZW50Um91dGUudXJsO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbihzdWJmbG93LCB7IGFkZGl0aW9uYWxEaXN0YW5jZSB9KTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGZpbmQgc3ViLWZsb3cgcGFyYW1ldGVycyAqL1xuICAgIHByaXZhdGUgZmluZFN1YkZsb3dQYXJhbXMoZGV0YWNoOiBib29sZWFuKTogeyBkaXN0YW5jZTogbnVtYmVyOyBwYXJhbXM6IFJvdXRlU3ViRmxvd1BhcmFtcyAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07IH0gfCB2b2lkIHtcbiAgICAgICAgY29uc3Qgc3RhY2sgPSB0aGlzLl9oaXN0b3J5LnN0YWNrO1xuICAgICAgICBmb3IgKGxldCBpID0gc3RhY2subGVuZ3RoIC0gMSwgZGlzdGFuY2UgPSAwOyBpID49IDA7IGktLSwgZGlzdGFuY2UrKykge1xuICAgICAgICAgICAgaWYgKHN0YWNrW2ldLnN1YmZsb3cpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBzdGFja1tpXS5zdWJmbG93IGFzIFJvdXRlU3ViRmxvd1BhcmFtcyAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgZGV0YWNoICYmIGRlbGV0ZSBzdGFja1tpXS5zdWJmbG93O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRpc3RhbmNlLCBwYXJhbXMgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvblxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gYFJvdXRlckV2ZW50QXJnYCBtYWtlciAqL1xuICAgIHByaXZhdGUgbWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQge1xuICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXdTdGF0ZS5pbnRlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdTdGF0ZS5pbnRlbnQ7IC8vIG5hdmlnYXRlIOaZguOBq+aMh+WumuOBleOCjOOBnyBpbnRlbnQg44GvIG9uZSB0aW1lIOOBruOBv+acieWKueOBq+OBmeOCi1xuXG4gICAgICAgIGNvbnN0IGZyb20gPSAob2xkU3RhdGUgfHwgdGhpcy5fbGFzdFJvdXRlKSBhcyBSb3V0ZUNvbnRleHQgJiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB0aGlzLl9oaXN0b3J5LmRpcmVjdChuZXdTdGF0ZVsnQGlkJ10sIGZyb20/LlsnQGlkJ10pLmRpcmVjdGlvbjtcbiAgICAgICAgY29uc3QgYXN5bmNQcm9jZXNzID0gbmV3IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0KCk7XG4gICAgICAgIGNvbnN0IHJlbG9hZCA9IG5ld1N0YXRlLnVybCA9PT0gZnJvbT8udXJsO1xuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfVxuICAgICAgICAgICAgPSB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyB8fCByZWxvYWRcbiAgICAgICAgICAgICAgICA/IHsgdHJhbnNpdGlvbjogdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLnJlbG9hZCwgcmV2ZXJzZTogZmFsc2UgfVxuICAgICAgICAgICAgICAgIDogKCdiYWNrJyAhPT0gZGlyZWN0aW9uID8gbmV3U3RhdGUgOiBmcm9tIGFzIFJvdXRlQ29udGV4dCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJvdXRlcjogdGhpcyxcbiAgICAgICAgICAgIGZyb20sXG4gICAgICAgICAgICB0bzogbmV3U3RhdGUsXG4gICAgICAgICAgICBkaXJlY3Rpb24sXG4gICAgICAgICAgICBhc3luY1Byb2Nlc3MsXG4gICAgICAgICAgICByZWxvYWQsXG4gICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgcmV2ZXJzZSxcbiAgICAgICAgICAgIGludGVudCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGZpbmQgcm91dGUgYnkgdXJsICovXG4gICAgcHJpdmF0ZSBmaW5kUm91dGVDb250ZXh0UGFyYW1ldGVyKHVybDogc3RyaW5nKTogUm91dGVDb250ZXh0UGFyYW1ldGVycyB8IHZvaWQge1xuICAgICAgICBjb25zdCBrZXkgPSBgLyR7bm9ybWFsaXplSWQodXJsLnNwbGl0KCc/JylbMF0pfWA7XG4gICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCB7IHJlZ2V4cCB9ID0gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgaWYgKHJlZ2V4cC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIHBhZ2UgZXZlbnQgKi9cbiAgICBwcml2YXRlIHRyaWdnZXJQYWdlQ2FsbGJhY2soZXZlbnQ6IFBhZ2VFdmVudCwgdGFyZ2V0OiBQYWdlIHwgdW5kZWZpbmVkLCBhcmc6IFJvdXRlIHwgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCk6IHZvaWQge1xuICAgICAgICBjb25zdCBtZXRob2QgPSBjYW1lbGl6ZShgcGFnZS0ke2V2ZW50fWApO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbigodGFyZ2V0IGFzIFBhZ2UgJiBSZWNvcmQ8c3RyaW5nLCBVbmtub3duRnVuY3Rpb24+IHwgdW5kZWZpbmVkKT8uW21ldGhvZF0pKSB7XG4gICAgICAgICAgICBjb25zdCByZXR2YWwgPSAodGFyZ2V0IGFzIFBhZ2UgJiBSZWNvcmQ8c3RyaW5nLCBVbmtub3duRnVuY3Rpb24+IHwgdW5kZWZpbmVkKT8uW21ldGhvZF0oYXJnKTtcbiAgICAgICAgICAgIGlmIChyZXR2YWwgaW5zdGFuY2VvZiBQcm9taXNlICYmIChhcmcgYXMgUm91dGUgJiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ2FzeW5jUHJvY2VzcyddKSB7XG4gICAgICAgICAgICAgICAgKGFyZyBhcyBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KS5hc3luY1Byb2Nlc3MucmVnaXN0ZXIocmV0dmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgd2FpdCBmcmFtZSAqL1xuICAgIHByaXZhdGUgd2FpdEZyYW1lKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gd2FpdEZyYW1lKDEsIHRoaXMuX3JhZik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjaGFuZ2UgcGFnZSBtYWluIHByb2NlZHVyZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2hhbmdlUGFnZShuZXh0Um91dGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBwcmV2Um91dGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9pbkNoYW5naW5nUGFnZSA9IHRydWU7XG5cbiAgICAgICAgICAgIHBhcnNlVXJsUGFyYW1zKG5leHRSb3V0ZSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0aGlzLm1ha2VSb3V0ZUNoYW5nZUluZm8obmV4dFJvdXRlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgdGhpcy5fdGVtcFRyYW5zaXRpb25QYXJhbXMgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIGNvbnN0IFtcbiAgICAgICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCxcbiAgICAgICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIF0gPSBhd2FpdCB0aGlzLnByZXBhcmVDaGFuZ2VDb250ZXh0KGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICAvLyB0cmFuc2l0aW9uIGNvcmVcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJhbnNpdGlvblBhZ2UocGFnZU5leHQsICRlbE5leHQsIHBhZ2VQcmV2LCAkZWxQcmV2LCBjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgdGhpcy51cGRhdGVDaGFuZ2VDb250ZXh0KFxuICAgICAgICAgICAgICAgICRlbE5leHQsICRlbFByZXYsXG4gICAgICAgICAgICAgICAgY2hhbmdlSW5mby5mcm9tIGFzIFJvdXRlQ29udGV4dCxcbiAgICAgICAgICAgICAgICAhY2hhbmdlSW5mby5yZWxvYWQsXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2luQ2hhbmdpbmdQYWdlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogUHJvbWlzZTxbUGFnZSwgRE9NLCBQYWdlLCBET01dPiB7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IGNoYW5nZUluZm8udG8gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGNoYW5nZUluZm8uZnJvbSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogcGFyYW1zIH0gPSBuZXh0Um91dGU7XG5cbiAgICAgICAgLy8gcGFnZSBpbnN0YW5jZVxuICAgICAgICBhd2FpdCBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UobmV4dFJvdXRlKTtcbiAgICAgICAgLy8gcGFnZSAkdGVtcGxhdGVcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlKHBhcmFtcyk7XG5cbiAgICAgICAgLy8gcGFnZSAkZWxcbiAgICAgICAgaWYgKCFuZXh0Um91dGUuZWwpIHtcbiAgICAgICAgICAgIGlmIChwYXJhbXMuJHRlbXBsYXRlPy5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgIG5leHRSb3V0ZS5lbCAgICAgPSBwYXJhbXMuJHRlbXBsYXRlWzBdO1xuICAgICAgICAgICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSBwYXJhbXMuJHRlbXBsYXRlLmNsb25lKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHRSb3V0ZS5lbCA9IHBhcmFtcy4kdGVtcGxhdGUhLmNsb25lKClbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2xvYWRlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1hc3NlcnRpb25cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnaW5pdCcsIG5leHRSb3V0ZVsnQHBhcmFtcyddLnBhZ2UhLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgIGF3YWl0IGNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZWxOZXh0ID0gJChuZXh0Um91dGUuZWwpO1xuICAgICAgICBjb25zdCBwYWdlTmV4dCA9IG5leHRSb3V0ZVsnQHBhcmFtcyddLnBhZ2UhO1xuXG4gICAgICAgIC8vIG1vdW50XG4gICAgICAgIGlmICghJGVsTmV4dC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgJGVsTmV4dC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5fJGVsLmFwcGVuZCgkZWxOZXh0KTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbW91bnRlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdtb3VudGVkJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgcmVsb2FkIH0gPSBjaGFuZ2VJbmZvO1xuXG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0XG4gICAgICAgICAgICAocmVsb2FkICYmIHt9IHx8IHByZXZSb3V0ZT8uWydAcGFyYW1zJ10/LnBhZ2UgfHwge30pLCAocmVsb2FkICYmICQobnVsbCkgfHwgJChwcmV2Um91dGU/LmVsKSksICAvLyBwcmV2XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmFuc2l0aW9uUGFnZShcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGNoYW5nZUluZm8udHJhbnNpdGlvbiB8fCB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MuZGVmYXVsdDtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICAnZW50ZXItZnJvbS1jbGFzcyc6IGN1c3RvbUVudGVyRnJvbUNsYXNzLFxuICAgICAgICAgICAgJ2VudGVyLWFjdGl2ZS1jbGFzcyc6IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItdG8tY2xhc3MnOiBjdXN0b21FbnRlclRvQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtZnJvbS1jbGFzcyc6IGN1c3RvbUxlYXZlRnJvbUNsYXNzLFxuICAgICAgICAgICAgJ2xlYXZlLWFjdGl2ZS1jbGFzcyc6IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtdG8tY2xhc3MnOiBjdXN0b21MZWF2ZVRvQ2xhc3MsXG4gICAgICAgIH0gPSB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3M7XG5cbiAgICAgICAgLy8gZW50ZXItY3NzLWNsYXNzXG4gICAgICAgIGNvbnN0IGVudGVyRnJvbUNsYXNzICAgPSBjdXN0b21FbnRlckZyb21DbGFzcyAgIHx8IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5FTlRFUl9GUk9NX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGVudGVyQWN0aXZlQ2xhc3MgPSBjdXN0b21FbnRlckFjdGl2ZUNsYXNzIHx8IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5FTlRFUl9BQ1RJVkVfQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJUb0NsYXNzICAgICA9IGN1c3RvbUVudGVyVG9DbGFzcyAgICAgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX1RPX0NMQVNTfWA7XG5cbiAgICAgICAgLy8gbGVhdmUtY3NzLWNsYXNzXG4gICAgICAgIGNvbnN0IGxlYXZlRnJvbUNsYXNzICAgPSBjdXN0b21MZWF2ZUZyb21DbGFzcyAgIHx8IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5MRUFWRV9GUk9NX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGxlYXZlQWN0aXZlQ2xhc3MgPSBjdXN0b21MZWF2ZUFjdGl2ZUNsYXNzIHx8IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5MRUFWRV9BQ1RJVkVfQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVUb0NsYXNzICAgICA9IGN1c3RvbUxlYXZlVG9DbGFzcyAgICAgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX1RPX0NMQVNTfWA7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5iZWdpblRyYW5zaXRpb24oXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICBjaGFuZ2VJbmZvLFxuICAgICAgICApO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgLy8gdHJhbnNpc2lvbiBleGVjdXRpb25cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uKCRlbE5leHQsIGVudGVyRnJvbUNsYXNzLCBlbnRlckFjdGl2ZUNsYXNzLCBlbnRlclRvQ2xhc3MpLFxuICAgICAgICAgICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uKCRlbFByZXYsIGxlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLCBsZWF2ZVRvQ2xhc3MpLFxuICAgICAgICBdKTtcblxuICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuZW5kVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LFxuICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBjaGFuZ2VJbmZvLFxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogYmVnaW4gKi9cbiAgICBwcml2YXRlIGFzeW5jIGJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSwgZW50ZXJGcm9tQ2xhc3M6IHN0cmluZywgZW50ZXJBY3RpdmVDbGFzczogc3RyaW5nLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLCBsZWF2ZUZyb21DbGFzczogc3RyaW5nLCBsZWF2ZUFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuXyRlbC5hZGRDbGFzcyhbXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YCxcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fRElSRUNUSU9OfS0ke2RlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24oY2hhbmdlSW5mbyl9YCxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgJGVsTmV4dFxuICAgICAgICAgICAgLmFkZENsYXNzKFtlbnRlckZyb21DbGFzcywgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKVxuICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuJylcbiAgICAgICAgICAgIC5yZWZsb3coKVxuICAgICAgICAgICAgLmFkZENsYXNzKGVudGVyQWN0aXZlQ2xhc3MpXG4gICAgICAgIDtcbiAgICAgICAgJGVsUHJldi5hZGRDbGFzcyhbbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG5cbiAgICAgICAgdGhpcy5wdWJsaXNoKCdiZWZvcmUtdHJhbnNpdGlvbicsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2JlZm9yZS1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdiZWZvcmUtbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIHByb2MgOiBlbmQgKi9cbiAgICBwcml2YXRlIGFzeW5jIGVuZFRyYW5zaXRpb24oXG4gICAgICAgIHBhZ2VOZXh0OiBQYWdlLCAkZWxOZXh0OiBET00sXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgICgkZWxOZXh0WzBdICE9PSAkZWxQcmV2WzBdKSAmJiAkZWxQcmV2LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG4gICAgICAgICRlbE5leHQucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG4gICAgICAgICRlbFByZXYucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG5cbiAgICAgICAgdGhpcy5fJGVsLnJlbW92ZUNsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7Y2hhbmdlSW5mby5kaXJlY3Rpb259YCxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1sZWF2ZScsIHBhZ2VQcmV2LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdhZnRlci10cmFuc2l0aW9uJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgcGFnZSBzdGF0dXMgYWZ0ZXIgdHJhbnNpdGlvbiAqL1xuICAgIHByaXZhdGUgdXBkYXRlQ2hhbmdlQ29udGV4dCgkZWxOZXh0OiBET00sICRlbFByZXY6IERPTSwgcHJldlJvdXRlOiBSb3V0ZUNvbnRleHQgfCB1bmRlZmluZWQsIHVybENoYW5nZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICAgICAgaWYgKCRlbE5leHRbMF0gIT09ICRlbFByZXZbMF0pIHtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBjbGFzc1xuICAgICAgICAgICAgJGVsUHJldlxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YClcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgJGVsTmV4dC5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YCk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9wcmV2Um91dGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKHRoaXMuX3ByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICAgICAgJGVsLnJlbW92ZUNsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3ByZXZSb3V0ZS5lbCAhPT0gdGhpcy5jdXJyZW50Um91dGUuZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FjaGVMdiA9ICRlbC5kYXRhKERvbUNhY2hlLkRBVEFfTkFNRSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9DT05ORUNUICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWdlID0gdGhpcy5fcHJldlJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygndW5tb3VudGVkJywgcGFnZSwgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9NRU1PUlkgIT09IGNhY2hlTHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsITsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHRoaXMuX3ByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdyZW1vdmVkJywgcGFnZSwgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1cmxDaGFuZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgPSBwcmV2Um91dGU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9sYXN0Um91dGUgPSB0aGlzLmN1cnJlbnRSb3V0ZSBhcyBSb3V0ZUNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgY2hhbmdpbmdgIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGlzdG9yeUNoYW5naW5nKG5leHRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIGNhbmNlbDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQsIHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2luQ2hhbmdpbmdQYWdlKSB7XG4gICAgICAgICAgICBjYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0JVU1kpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRTdGF0ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCd3aWxsLWNoYW5nZScsIGNoYW5nZUluZm8sIGNhbmNlbCk7XG4gICAgICAgIHByb21pc2VzLnB1c2goLi4uY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MucHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGByZWZyZXNoYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlSZWZyZXNoKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8UGFydGlhbDxSb3V0ZUNvbnRleHQ+Piwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuc3VyZSA9IChzdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4pOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgICAgICAgICBjb25zdCB1cmwgID0gYC8ke3N0YXRlWydAaWQnXX1gO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1ldGVyKHVybCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVELCBgUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLiBbdXJsOiAke3VybH1dYCwgc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG51bGwgPT0gc3RhdGVbJ0BwYXJhbXMnXSkge1xuICAgICAgICAgICAgICAgIC8vIFJvdXRlQ29udGV4dFBhcmFtZXRlciDjgpIgYXNzaWduXG4gICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihzdGF0ZSwgdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBwYXJhbXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3RhdGUuZWwpIHtcbiAgICAgICAgICAgICAgICAvLyBpZCDjgavntJDjgaXjgY/opoHntKDjgYzjgZnjgafjgavlrZjlnKjjgZnjgovloLTlkIjjga/libLjgorlvZPjgaZcbiAgICAgICAgICAgICAgICBzdGF0ZS5lbCA9IHRoaXMuX2hpc3RvcnkuZGlyZWN0KHN0YXRlWydAaWQnXSk/LnN0YXRlPy5lbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzdGF0ZSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PjtcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gc2NoZWR1bGluZyBgcmVmcmVzaGAgZG9uZS5cbiAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5jaGFuZ2VQYWdlKGVuc3VyZShuZXdTdGF0ZSksIG9sZFN0YXRlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZXJyb3IgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IYW5kbGVFcnJvcihlcnJvcjogdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLnB1Ymxpc2goXG4gICAgICAgICAgICAnZXJyb3InLFxuICAgICAgICAgICAgaXNSZXN1bHQoZXJyb3IpID8gZXJyb3IgOiBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicsIGVycm9yKVxuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGFuY2hvciBjbGljayBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkFuY2hvckNsaWNrZWQoZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpLmNsb3Nlc3QoJ1tocmVmXScpO1xuICAgICAgICBpZiAoJHRhcmdldC5kYXRhKExpbmtEYXRhLlBSRVZFTlRfUk9VVEVSKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBjb25zdCB1cmwgICAgICAgID0gJHRhcmdldC5hdHRyKCdocmVmJyk7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSAkdGFyZ2V0LmRhdGEoTGlua0RhdGEuVFJBTlNJVElPTikgYXMgc3RyaW5nO1xuXG4gICAgICAgIGlmICgnIycgPT09IHVybCkge1xuICAgICAgICAgICAgdm9pZCB0aGlzLmJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5uYXZpZ2F0ZSh1cmwgYXMgc3RyaW5nLCB7IHRyYW5zaXRpb24gfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNpbGVudCBldmVudCBsaXN0bmVyIHNjb3BlICovXG4gICAgcHJpdmF0ZSBhc3luYyBzdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShleGVjdXRvcjogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dW5rbm93bj4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBleGVjdXRvcigpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBbW1JvdXRlcl1dIG9iamVjdC5cbiAqIEBqYSBbW1JvdXRlcl1dIOOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zXV0gb2JqZWN0XG4gKiAgLSBgamFgIFtbUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc11dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUm91dGVyKHNlbGVjdG9yOiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD4sIG9wdGlvbnM/OiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKTogUm91dGVyIHtcbiAgICByZXR1cm4gbmV3IFJvdXRlckNvbnRleHQoc2VsZWN0b3IsIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBzdGFydDogdHJ1ZSxcbiAgICB9LCBvcHRpb25zKSk7XG59XG4iXSwibmFtZXMiOlsic2FmZSIsIkRlZmVycmVkIiwiYXQiLCJzb3J0Iiwibm9vcCIsIndlYlJvb3QiLCIkY2RwIiwiaXNPYmplY3QiLCIkc2lnbmF0dXJlIiwiRXZlbnRQdWJsaXNoZXIiLCJ0b1VybCIsIkNhbmNlbFRva2VuIiwicG9zdCIsImlzQXJyYXkiLCJwYXRoMnJlZ2V4cCIsImlzU3RyaW5nIiwidG9RdWVyeVN0cmluZ3MiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJwYXJzZVVybFF1ZXJ5IiwiYXNzaWduVmFsdWUiLCJjb252ZXJ0VXJsUGFyYW1UeXBlIiwiaXNGdW5jdGlvbiIsIiQiLCJ0b1RlbXBsYXRlRWxlbWVudCIsImxvYWRUZW1wbGF0ZVNvdXJjZSIsInNsZWVwIiwiY2FtZWxpemUiLCJ3YWl0RnJhbWUiLCJpc1Jlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEs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QSxnQkFBQSwrQkFBeUIsRUFBRTtnQkFDdkMsT0FBTztJQUNWLFNBQUE7WUFFRCxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFdkIsTUFBTSxHQUFHLEdBQVUsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QyxRQUFBLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLHdDQUErQixDQUFDO1lBRS9ELElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRTtJQUNiLFlBQUEsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDcEIsU0FBQTtJQUFNLGFBQUE7Z0JBQ0gsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQWEsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDckQsU0FBQTtTQUNKOztRQUdPLE1BQU0sMEJBQTBCLENBQUMsUUFBZ0MsRUFBQTtZQUNyRSxJQUFJO2dCQUNBLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNsRCxPQUFPLE1BQU0sUUFBUSxFQUFFLENBQUM7SUFDM0IsU0FBQTtJQUFTLGdCQUFBO2dCQUNOLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDM0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3BELFNBQUE7U0FDSjtJQUNKLENBQUE7SUFFRDtJQUVBOzs7Ozs7Ozs7O0lBVUc7SUFDYSxTQUFBLFlBQVksQ0FBQyxRQUEyQyxFQUFFLE9BQW1DLEVBQUE7UUFDekcsT0FBTyxJQUFJLGFBQWEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM3QyxRQUFBLEtBQUssRUFBRSxJQUFJO1NBQ2QsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2pCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9yb3V0ZXIvIn0=