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

    /* eslint-disable
        @typescript-eslint/no-non-null-assertion
     */
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
            const oldSettings = this._transitionSettings;
            newSettings && (this._transitionSettings = { ...newSettings });
            return oldSettings;
        }
        /** Set common navigation settnigs. */
        navigationSettings(newSettings) {
            const oldSettings = this._navigationSettings;
            newSettings && (this._navigationSettings = Object.assign({ method: 'push' }, newSettings));
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
                (reload && {} || prevParams?.page || {}), (reload && dom.dom(null) || dom.dom(prevRoute?.el)), // prev
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaGlzdG9yeS9pbnRlcm5hbC50cyIsImhpc3Rvcnkvc2Vzc2lvbi50cyIsImhpc3RvcnkvbWVtb3J5LnRzIiwicm91dGVyL2ludGVybmFsLnRzIiwicm91dGVyL2FzeW5jLXByb2Nlc3MudHMiLCJyb3V0ZXIvY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFJPVVRFUiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDE1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1JPVVRFUl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5EICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDEsICdyb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMiwgJ1JvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAzLCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDQsICdJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0JVU1kgICAgICAgICAgICAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDUsICdJbiBjaGFuZ2luZyBwYWdlIHByb2Nlc3Mgbm93LicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4iLCJpbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGF0LFxuICAgIHNvcnQsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEhpc3RvcnlTdGF0ZSwgSGlzdG9yeURpcmVjdFJldHVyblR5cGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIG5vcm1hbHppZSBpZCBzdHJpbmcgKi9cbmV4cG9ydCBjb25zdCBub3JtYWxpemVJZCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgLy8gcmVtb3ZlIGhlYWQgb2YgXCIjXCIsIFwiL1wiLCBcIiMvXCIgYW5kIHRhaWwgb2YgXCIvXCJcbiAgICByZXR1cm4gc3JjLnJlcGxhY2UoL14oI1xcLyl8XlsjL118XFxzKyQvLCAnJykucmVwbGFjZSgvXlxccyskfChcXC8kKS8sICcnKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIHN0YWNrICovXG5leHBvcnQgY29uc3QgY3JlYXRlRGF0YSA9IDxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IEhpc3RvcnlTdGF0ZTxUPiA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oeyAnQGlkJzogbm9ybWFsaXplSWQoaWQpIH0sIHN0YXRlKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIHVuY2FuY2VsbGFibGUgZGVmZXJyZWQgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQgPSAod2Fybjogc3RyaW5nKTogRGVmZXJyZWQgPT4ge1xuICAgIGNvbnN0IHVuY2FuY2VsbGFibGUgPSBuZXcgRGVmZXJyZWQoKSBhcyBXcml0YWJsZTxEZWZlcnJlZD47XG4gICAgdW5jYW5jZWxsYWJsZS5yZWplY3QgPSAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUud2Fybih3YXJuKTtcbiAgICAgICAgdW5jYW5jZWxsYWJsZS5yZXNvbHZlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gdW5jYW5jZWxsYWJsZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgYXNzaWduIHN0YXRlIGVsZW1lbnQgaWYgYWxyZWFkeSBleGlzdHMgKi9cbmV4cG9ydCBjb25zdCBhc3NpZ25TdGF0ZUVsZW1lbnQgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZSwgc3RhY2s6IEhpc3RvcnlTdGFjayk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGVsID0gc3RhY2suZGlyZWN0KHN0YXRlWydAaWQnXSk/LnN0YXRlPy5lbDtcbiAgICAoIXN0YXRlLmVsICYmIGVsKSAmJiAoc3RhdGUuZWwgPSBlbCk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWwgc3RhY2sgbWFuYWdlbWVudCBjb21tb24gY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIEhpc3RvcnlTdGFjazxUID0gUGxhaW5PYmplY3Q+IHtcbiAgICBwcml2YXRlIF9zdGFjazogSGlzdG9yeVN0YXRlPFQ+W10gPSBbXTtcbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlzdGFuY2UoMCk7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGVbJ0BpZCddO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIHNldCBpbmRleChpZHg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IE1hdGgudHJ1bmMoaWR4KTtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBhcnJheSgpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zbGljZSgpO1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBwb3NpdGlvbiBpbiBzdGFjayBpcyBmaXJzdCBvciBub3QgKi9cbiAgICBnZXQgaXNGaXJzdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIDAgPT09IHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBwb3NpdGlvbiBpbiBzdGFjayBpcyBsYXN0IG9yIG5vdCAqL1xuICAgIGdldCBpc0xhc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleCA9PT0gdGhpcy5fc3RhY2subGVuZ3RoIC0gMTtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgcHVibGljIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5fc3RhY2ssIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogY2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC4gKi9cbiAgICBwdWJsaWMgY2xlYXJGb3J3YXJkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjayA9IHRoaXMuX3N0YWNrLnNsaWNlKDAsIHRoaXMuX2luZGV4ICsgMSk7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuICovXG4gICAgcHVibGljIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICAgICAgICBjb25zdCB7IF9pbmRleDogYmFzZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IHRoaXMuX3N0YWNrXG4gICAgICAgICAgICAubWFwKChzLCBpbmRleCkgPT4geyByZXR1cm4geyBpbmRleCwgZGlzdGFuY2U6IE1hdGguYWJzKGJhc2UgLSBpbmRleCksIC4uLnMgfTsgfSlcbiAgICAgICAgICAgIC5maWx0ZXIocyA9PiBzWydAaWQnXSA9PT0gaWQpXG4gICAgICAgIDtcbiAgICAgICAgc29ydChjYW5kaWRhdGVzLCAobCwgcikgPT4gKGwuZGlzdGFuY2UgPiByLmRpc3RhbmNlID8gMSA6IC0xKSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGVzWzBdPy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogcmV0dXJuIGNsb3NldCBzdGFjayBpbmZvcm1hdGlvbiBieSB0byBJRCBhbmQgZnJvbSBJRC4gKi9cbiAgICBwdWJsaWMgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICBjb25zdCB0b0luZGV4ICAgPSB0aGlzLmNsb3Nlc3QodG9JZCk7XG4gICAgICAgIGNvbnN0IGZyb21JbmRleCA9IG51bGwgPT0gZnJvbUlkID8gdGhpcy5faW5kZXggOiB0aGlzLmNsb3Nlc3QoZnJvbUlkKTtcbiAgICAgICAgaWYgKG51bGwgPT0gZnJvbUluZGV4IHx8IG51bGwgPT0gdG9JbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uOiAnbWlzc2luZycgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gdG9JbmRleCAtIGZyb21JbmRleDtcbiAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IDAgPT09IGRlbHRhXG4gICAgICAgICAgICAgICAgPyAnbm9uZSdcbiAgICAgICAgICAgICAgICA6IGRlbHRhIDwgMCA/ICdiYWNrJyA6ICdmb3J3YXJkJztcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbiwgZGVsdGEsIGluZGV4OiB0b0luZGV4LCBzdGF0ZTogdGhpcy5fc3RhY2tbdG9JbmRleF0gfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBnZXQgYWN0aXZlIGRhdGEgZnJvbSBjdXJyZW50IGluZGV4IG9yaWdpbiAqL1xuICAgIHB1YmxpYyBkaXN0YW5jZShkZWx0YTogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgY29uc3QgcG9zID0gdGhpcy5faW5kZXggKyBkZWx0YTtcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBpbnZhbGlkIGFycmF5IGluZGV4LiBbbGVuZ3RoOiAke3RoaXMubGVuZ3RofSwgZ2l2ZW46ICR7cG9zfV1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hdChwb3MpO1xuICAgIH1cblxuICAgIC8qKiBub29wIHN0YWNrICovXG4gICAgcHVibGljIG5vb3BTdGFjayA9IG5vb3A7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1lbWJlci1hY2Nlc3NpYmlsaXR5XG5cbiAgICAvKiogcHVzaCBzdGFjayAqL1xuICAgIHB1YmxpYyBwdXNoU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrWysrdGhpcy5faW5kZXhdID0gZGF0YTtcbiAgICB9XG5cbiAgICAvKiogcmVwbGFjZSBzdGFjayAqL1xuICAgIHB1YmxpYyByZXBsYWNlU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrW3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHNlZWsgc3RhY2sgKi9cbiAgICBwdWJsaWMgc2Vla1N0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuY2xvc2VzdChkYXRhWydAaWQnXSk7XG4gICAgICAgIGlmIChudWxsID09IGluZGV4KSB7XG4gICAgICAgICAgICB0aGlzLnB1c2hTdGFjayhkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZGlzcG9zZSBvYmplY3QgKi9cbiAgICBwdWJsaWMgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2subGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faW5kZXggPSBOYU47XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBBY2Nlc3NpYmxlLFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzT2JqZWN0LFxuICAgIG5vb3AsXG4gICAgJGNkcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyB0b1VybCwgd2ViUm9vdCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgbm9ybWFsaXplSWQsXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uICovXG5pbnRlcmZhY2UgRGlzcGF0Y2hJbmZvPFQ+IHtcbiAgICBkZjogRGVmZXJyZWQ7XG4gICAgbmV3SWQ6IHN0cmluZztcbiAgICBvbGRJZDogc3RyaW5nO1xuICAgIHBvc3Rwcm9jOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2Vlayc7XG4gICAgbmV4dFN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xuICAgIHByZXZTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb25zdGFudCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgSEFTSF9QUkVGSVggPSAnIy8nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCByZW1vdmUgdXJsIHBhdGggc2VjdGlvbiAqL1xuY29uc3QgdG9IYXNoID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBpZCA9IC8jLiokLy5leGVjKHVybCk/LlswXTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiAnJztcbn07XG5cbi8qKiBAaW50ZXJuYWwgcmVtb3ZlIHVybCBwYXRoIHNlY3Rpb24gKi9cbmNvbnN0IHRvUGF0aCA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgaWQgPSB1cmwuc3Vic3RyaW5nKHdlYlJvb3QubGVuZ3RoKTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiB1cmw7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzZXREaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4sIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFQgPT4ge1xuICAgIChzdGF0ZVskY2RwXSBhcyBEaXNwYXRjaEluZm88VD4pID0gYWRkaXRpb25hbDtcbiAgICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBwYXJzZURpc3BhdGNoSW5mbyA9IDxUPihzdGF0ZTogQWNjZXNzaWJsZTxUPik6IFtULCBEaXNwYXRjaEluZm88VD4/XSA9PiB7XG4gICAgaWYgKGlzT2JqZWN0KHN0YXRlKSAmJiBzdGF0ZVskY2RwXSkge1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsID0gc3RhdGVbJGNkcF07XG4gICAgICAgIGRlbGV0ZSBzdGF0ZVskY2RwXTtcbiAgICAgICAgcmV0dXJuIFtzdGF0ZSwgYWRkaXRpb25hbCBhcyBEaXNwYXRjaEluZm88VD5dO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbc3RhdGVdO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdTZXNzaW9uSGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX21vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb3BTdGF0ZUhhbmRsZXI6IChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcbiAgICBwcml2YXRlIF9kZkdvPzogRGVmZXJyZWQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdpbmRvd0NvbnR4dDogV2luZG93LCBtb2RlOiAnaGFzaCcgfCAnaGlzdG9yeScsIGlkPzogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbmRvd0NvbnR4dDtcbiAgICAgICAgdGhpcy5fbW9kZSA9IG1vZGU7XG5cbiAgICAgICAgdGhpcy5fcG9wU3RhdGVIYW5kbGVyID0gdGhpcy5vblBvcFN0YXRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShudWxsICE9IGlkID8gaWQgOiB0aGlzLnRvSWQodGhpcy5fd2luZG93LmxvY2F0aW9uLmhyZWYpLCBzdGF0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGlzcG9zZSBvYmplY3RcbiAgICAgKi9cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zdGFjay5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMub2ZmKCk7XG4gICAgICAgIGRlbGV0ZSAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0IGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyByZXNldChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKE51bWJlci5pc05hTih0aGlzLmluZGV4KSB8fCB0aGlzLl9zdGFjay5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBzaWxlbnQgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgcHJldlN0YXRlID0gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICBjb25zdCBuZXdVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4gPSB7XG4gICAgICAgICAgICAgICAgZGY6IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCgnU2Vzc2lvbkhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdGhpcy50b0lkKG5ld1VSTCksXG4gICAgICAgICAgICAgICAgb2xkSWQ6IHRoaXMudG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiAnbm9vcCcsXG4gICAgICAgICAgICAgICAgcHJldlN0YXRlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKHRoaXMuc3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUhpc3Rvcnk8VD5cblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmlkO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBzdGFjaygpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hcnJheTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzRmlyc3Q7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0xhc3Q7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXQoaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIC8vIGlmIGFscmVhZHkgY2FsbGVkLCBubyByZWFjdGlvbi5cbiAgICAgICAgaWYgKHRoaXMuX2RmR28pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgZ2l2ZW4gMCwganVzdCByZWxvYWQuXG4gICAgICAgIGlmICghZGVsdGEpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgncmVmcmVzaCcsIHRoaXMuc3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fZGZHbztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zIHx8IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zIHx8IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJGb3J3YXJkSGlzdG9yeSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgpLmjIflrprjgZfjgabjgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkIGFzIHN0cmluZyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29udmVydCB0byBJRCAqL1xuICAgIHByaXZhdGUgdG9JZChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnaGFzaCcgPT09IHRoaXMuX21vZGUgPyB0b0hhc2goc3JjKSA6IHRvUGF0aChzcmMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29udmVydCB0byBVUkwgKi9cbiAgICBwcml2YXRlIHRvVXJsKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gKCdoYXNoJyA9PT0gdGhpcy5fbW9kZSkgPyBgJHtDb25zdC5IQVNIX1BSRUZJWH0ke2lkfWAgOiB0b1VybChpZCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uLCBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWQgPSBkYXRhWydAaWQnXTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIGRhdGFbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuICAgICAgICBoaXN0b3J5W2Ake21ldGhvZH1TdGF0ZWBdKGRhdGEsICcnLCB0aGlzLnRvVXJsKGlkKSk7XG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgYXNzaWduU3RhdGVFbGVtZW50KGRhdGEsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogbmV3IERlZmVycmVkKGNhbmNlbCksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRoaXMudG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0aGlzLnRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogbWV0aG9kLFxuICAgICAgICAgICAgICAgIG5leHRTdGF0ZTogZGF0YSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyhkYXRhLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgZGlzcGF0Y2hDaGFuZ2VJbmZvKG5ld1N0YXRlOiBBY2Nlc3NpYmxlPFQ+LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzZXREaXNwYXRjaEluZm8obmV3U3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB0aGlzLl93aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgUG9wU3RhdGVFdmVudCgncG9wc3RhdGUnLCB7IHN0YXRlIH0pKTtcbiAgICAgICAgYXdhaXQgYWRkaXRpb25hbC5kZjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNpbGVudCBwb3BzdGF0ZSBldmVudCBsaXN0bmVyIHNjb3BlICovXG4gICAgcHJpdmF0ZSBhc3luYyBzdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShleGVjdXRvcjogKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pID0+IFByb21pc2U8dm9pZD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgICAgICBjb25zdCB3YWl0UG9wU3RhdGUgPSAoKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXYuc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCBleGVjdXRvcih3YWl0UG9wU3RhdGUpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcm9sbGJhY2sgaGlzdG9yeSAqL1xuICAgIHByaXZhdGUgYXN5bmMgcm9sbGJhY2tIaXN0b3J5KG1ldGhvZDogc3RyaW5nLCBuZXdJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAncmVwbGFjZSc6XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUodGhpcy5zdGF0ZSwgJycsIHRoaXMudG9VcmwodGhpcy5pZCkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncHVzaCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICBoaXN0b3J5LmdvKC0xKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRoaXMuaW5kZXggLSAodGhpcy5jbG9zZXN0KG5ld0lkKSBhcyBudW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCAhPT0gZGVsdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWx0YSAmJiBoaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY2xlYXIgZm9yd2FyZCBzZXNzaW9uIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LiAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2xlYXJGb3J3YXJkSGlzdG9yeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNPcmlnaW4gPSAoc3Q6IEFjY2Vzc2libGU8dW5rbm93bj4pOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHN0ICYmIHN0WydAb3JpZ2luJ10pIGFzIGJvb2xlYW47XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IGhpc3Rvcnkuc3RhdGU7XG5cbiAgICAgICAgICAgIC8vIGJhY2sgdG8gc2Vzc2lvbiBvcmlnaW5cbiAgICAgICAgICAgIHdoaWxlICghaXNPcmlnaW4oc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGVuc3VyZSA9IChzcmM6IEFjY2Vzc2libGU8dW5rbm93bj4pOiB1bmtub3duID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdHggPSB7IC4uLnNyYyB9O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHhbJ3JvdXRlciddO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHhbJ0BwYXJhbXMnXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdHgpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGZvcndhcmQgZnJvbSBpbmRleCAxIHRvIGN1cnJlbnQgdmFsdWVcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAxLCBuID0gdGhpcy5fc3RhY2subGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3QgPSB0aGlzLl9zdGFjay5hdChpKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnB1c2hTdGF0ZShlbnN1cmUoc3QpLCAnJywgdGhpcy50b1VybChzdFsnQGlkJ10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIHJlY2VpdmUgYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIG9uUG9wU3RhdGUoZXY6IFBvcFN0YXRlRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBbbmV3U3RhdGUsIGFkZGl0aW9uYWxdID0gcGFyc2VEaXNwYXRjaEluZm8oZXYuc3RhdGUpO1xuICAgICAgICBjb25zdCBuZXdJZCAgID0gYWRkaXRpb25hbD8ubmV3SWQgfHwgdGhpcy50b0lkKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBjb25zdCBtZXRob2QgID0gYWRkaXRpb25hbD8ucG9zdHByb2MgfHwgJ3NlZWsnO1xuICAgICAgICBjb25zdCBkZiAgICAgID0gYWRkaXRpb25hbD8uZGYgfHwgdGhpcy5fZGZHbyB8fCBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgY29uc3Qgb2xkRGF0YSA9IGFkZGl0aW9uYWw/LnByZXZTdGF0ZSB8fCB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCBuZXdEYXRhID0gYWRkaXRpb25hbD8ubmV4dFN0YXRlIHx8IHRoaXMuZGlyZWN0KG5ld0lkKS5zdGF0ZSB8fCBjcmVhdGVEYXRhKG5ld0lkLCBuZXdTdGF0ZSk7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIGRmLmNhdGNoKG5vb3ApO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ2NoYW5naW5nJywgbmV3RGF0YSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3RGF0YSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdEYXRhLCBvbGREYXRhKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBoaXN0b3J5IOOCkuWFg+OBq+aIu+OBmVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsYmFja0hpc3RvcnkobWV0aG9kLCBuZXdJZCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBbW2NyZWF0ZVNlc3Npb25IaXN0b3J5XV0oKSBvcHRpb25zLlxuICogQGphIFtbY3JlYXRlU2Vzc2lvbkhpc3RvcnldXSgpIOOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICogXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zIHtcbiAgICBjb250ZXh0PzogV2luZG93O1xuICAgIG1vZGU/OiAnaGFzaCcgfCAnaGlzdG9yeSc7XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnNdXSBvYmplY3RcbiAqICAtIGBqYWAgW1tTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnNdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaWQ/OiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9ucyk6IElIaXN0b3J5PFQ+IHtcbiAgICBjb25zdCB7IGNvbnRleHQsIG1vZGUgfSA9IE9iamVjdC5hc3NpZ24oeyBtb2RlOiAnaGFzaCcgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBTZXNzaW9uSGlzdG9yeShjb250ZXh0IHx8IHdpbmRvdywgbW9kZSwgaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc2V0U2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIFNlc3Npb25IaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIFNlc3Npb25IaXN0b3J5PFQ+KS5kaXNwb3NlKCk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQgeyBQbGFpbk9iamVjdCwgcG9zdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTaWxlbmNlYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHR5cGUge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeVN0YWNrLFxuICAgIGNyZWF0ZURhdGEsXG4gICAgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkLFxuICAgIGFzc2lnblN0YXRlRWxlbWVudCxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdNZW1vcnlIaXN0b3J5I3NpZ25hdHVyZScpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBjbGFzcy5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgq/jg6njgrlcbiAqL1xuY2xhc3MgTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8SGlzdG9yeUV2ZW50PFQ+PiBpbXBsZW1lbnRzIElIaXN0b3J5PFQ+IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoaWQ6IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIHZvaWQgdGhpcy5yZXBsYWNlKGlkLCBzdGF0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGlzcG9zZSBvYmplY3RcbiAgICAgKi9cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMub2ZmKCk7XG4gICAgICAgIGRlbGV0ZSAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0IGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyByZXNldChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKE51bWJlci5pc05hTih0aGlzLmluZGV4KSB8fCB0aGlzLl9zdGFjay5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBzaWxlbnQgfSA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSB0aGlzLnN0YXRlO1xuICAgICAgICB0aGlzLnNldEluZGV4KDApO1xuICAgICAgICBhd2FpdCB0aGlzLmNsZWFyRm9yd2FyZCgpO1xuICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuc3RhdGU7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkKCdNZW1vcnlIaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKCdub29wJywgZGYsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUhpc3Rvcnk8VD5cblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmlkO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBzdGFjaygpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hcnJheTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzRmlyc3Q7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0xhc3Q7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXQoaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gaWYgZ2l2ZW4gMCwganVzdCByZWxvYWQuXG4gICAgICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IGRlbHRhID8gdGhpcy5zdGF0ZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEgfHwgMCk7XG4gICAgICAgICAgICBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZSgnc2VlaycsIGRmLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkgYnkgc3RhY2sgSUQuICovXG4gICAgdHJhdmVyc2VUbyhpZDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBkaXJlY3Rpb24sIGRlbHRhIH0gPSB0aGlzLmRpcmVjdChpZCk7XG4gICAgICAgIGlmICgnbWlzc2luZycgPT09IGRpcmVjdGlvbikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGB0cmF2ZXJzZVRvKCR7aWR9KSwgcmV0dXJuZWQgbWlzc2luZy5gKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5pbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oZGVsdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciBuZXcgaGlzdG9yeS5cbiAgICAgKiBAamEg5paw6KaP5bGl5q2044Gu55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVzaChpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3B1c2gnLCBpZCwgc3RhdGUsIG9wdGlvbnMgfHwge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGN1cnJlbnQgaGlzdG9yeS5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu572u5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcmVwbGFjZShpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3JlcGxhY2UnLCBpZCwgc3RhdGUsIG9wdGlvbnMgfHwge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBmb3J3YXJkIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgojjgorliY3mlrnjga7lsaXmrbTjgpLliYrpmaRcbiAgICAgKi9cbiAgICBhc3luYyBjbGVhckZvcndhcmQoKTogUHJvbWlzZTx2b2lkPiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3JlcXVpcmUtYXdhaXRcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gZGVzdGluYXRpb24gc3RhY2sgaW5mb3JtYXRpb24gYnkgYHN0YXJ0YCBhbmQgYGVuZGAgSUQuXG4gICAgICogQGphIOi1t+eCuSwg57WC54K544GuIElEIOOBi+OCiee1gueCueOBruOCueOCv+ODg+OCr+aDheWgseOCkui/lOWNtFxuICAgICAqL1xuICAgIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmRpcmVjdCh0b0lkLCBmcm9tSWQgYXMgc3RyaW5nKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgbmV3U3RhdGVbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQobmV3U3RhdGUsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKGNhbmNlbCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKG1ldGhvZCwgZGYsIG5ld1N0YXRlLCB0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBzdGF0ZSBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNoYW5nZVN0YXRlKG1ldGhvZDogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnLCBkZjogRGVmZXJyZWQsIG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8VD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld1N0YXRlLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IElIaXN0b3J5PFQ+IHtcbiAgICByZXR1cm4gbmV3IE1lbW9yeUhpc3RvcnkoaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgbWVtb3J5IGhpc3RvcnkuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiaW1wb3J0IHsgcGF0aDJyZWdleHAgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5pbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIENsYXNzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBzbGVlcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICB0b1F1ZXJ5U3RyaW5ncyxcbiAgICBwYXJzZVVybFF1ZXJ5LFxuICAgIGNvbnZlcnRVcmxQYXJhbVR5cGUsXG59IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHtcbiAgICB0b1VybCxcbiAgICBsb2FkVGVtcGxhdGVTb3VyY2UsXG4gICAgdG9UZW1wbGF0ZUVsZW1lbnQsXG59IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBJSGlzdG9yeSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgUGFnZVRyYW5zaXRpb25QYXJhbXMsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgfSBmcm9tICcuL2FzeW5jLXByb2Nlc3MnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDc3NOYW1lIHtcbiAgICBERUZBVUxUX1BSRUZJWCAgICAgICA9ICdjZHAnLFxuICAgIFRSQU5TSVRJT05fRElSRUNUSU9OID0gJ3RyYW5zaXRpb24tZGlyZWN0aW9uJyxcbiAgICBUUkFOU0lUSU9OX1JVTk5JTkcgICA9ICd0cmFuc2l0aW9uLXJ1bm5pbmcnLFxuICAgIFBBR0VfQ1VSUkVOVCAgICAgICAgID0gJ3BhZ2UtY3VycmVudCcsXG4gICAgUEFHRV9QUkVWSU9VUyAgICAgICAgPSAncGFnZS1wcmV2aW91cycsXG4gICAgRU5URVJfRlJPTV9DTEFTUyAgICAgPSAnZW50ZXItZnJvbScsXG4gICAgRU5URVJfQUNUSVZFX0NMQVNTICAgPSAnZW50ZXItYWN0aXZlJyxcbiAgICBFTlRFUl9UT19DTEFTUyAgICAgICA9ICdlbnRlci10bycsXG4gICAgTEVBVkVfRlJPTV9DTEFTUyAgICAgPSAnbGVhdmUtZnJvbScsXG4gICAgTEVBVkVfQUNUSVZFX0NMQVNTICAgPSAnbGVhdmUtYWN0aXZlJyxcbiAgICBMRUFWRV9UT19DTEFTUyAgICAgICA9ICdsZWF2ZS10bycsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIERvbUNhY2hlIHtcbiAgICBEQVRBX05BTUUgICAgICAgICAgID0gJ2RvbS1jYWNoZScsXG4gICAgQ0FDSEVfTEVWRUxfTUVNT1JZICA9ICdtZW1vcnknLFxuICAgIENBQ0hFX0xFVkVMX0NPTk5FQ1QgPSAnY29ubmVjdCcsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIExpbmtEYXRhIHtcbiAgICBUUkFOU0lUSU9OICAgICAgID0gJ3RyYW5zaXRpb24nLFxuICAgIE5BVklBR0FURV9NRVRIT0QgPSAnbmF2aWdhdGUtbWV0aG9kJyxcbiAgICBQUkVWRU5UX1JPVVRFUiAgID0gJ3ByZXZlbnQtcm91dGVyJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ29uc3Qge1xuICAgIFdBSVRfVFJBTlNJVElPTl9NQVJHSU4gPSAxMDAsIC8vIG1zZWNcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgUGFnZUV2ZW50ID0gJ2luaXQnIHwgJ21vdW50ZWQnIHwgJ2Nsb25lZCcgfCAnYmVmb3JlLWVudGVyJyB8ICdhZnRlci1lbnRlcicgfCAnYmVmb3JlLWxlYXZlJyB8ICdhZnRlci1sZWF2ZScgfCAndW5tb3VudGVkJyB8ICdyZW1vdmVkJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZUNoYW5nZUluZm9Db250ZXh0IGV4dGVuZHMgUm91dGVDaGFuZ2VJbmZvIHtcbiAgICByZWFkb25seSBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0O1xuICAgIHNhbWVQYWdlSW5zdGFuY2U/OiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBmbGF0IFJvdXRlUGFyYW1ldGVycyAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IE9taXQ8Um91dGVQYXJhbWV0ZXJzLCAncm91dGVzJz4gJiB7XG4gICAgLyoqIHJlZ2V4cCBmcm9tIHBhdGggKi9cbiAgICByZWdleHA6IFJlZ0V4cDtcbiAgICAvKioga2V5cyBvZiBwYXJhbXMgKi9cbiAgICBwYXJhbUtleXM6IHN0cmluZ1tdO1xuICAgIC8qKiBET00gdGVtcGxhdGUgaW5zdGFuY2Ugd2l0aCBQYWdlIGVsZW1lbnQgKi9cbiAgICAkdGVtcGxhdGU/OiBET007XG4gICAgLyoqIHJvdXRlciBwYWdlIGluc3RhbmNlIGZyb20gYGNvbXBvbmVudGAgcHJvcGVydHkgKi9cbiAgICBwYWdlPzogUGFnZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgPSBSb3V0ZVN1YkZsb3dQYXJhbXMgJiBSZXF1aXJlZDxQYWdlVHJhbnNpdGlvblBhcmFtcz4gJiB7XG4gICAgb3JpZ2luOiBzdHJpbmc7XG59O1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0ID0gV3JpdGFibGU8Um91dGU+ICYgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyAmIHtcbiAgICAnQHBhcmFtcyc6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7XG4gICAgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQ7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHRvIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0ID0gKHVybDogc3RyaW5nLCByb3V0ZXI6IFJvdXRlciwgcGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCBuYXZPcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFJvdXRlQ29udGV4dCA9PiB7XG4gICAgLy8gb21pdCB1bmNsb25hYmxlIHByb3BzXG4gICAgY29uc3QgZnJvbU5hdmlnYXRlID0gISFuYXZPcHRpb25zO1xuICAgIGNvbnN0IGVuc3VyZUNsb25lID0gKGN0eDogdW5rbm93bik6IFJvdXRlQ29udGV4dCA9PiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN0eCkpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICB7XG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICByb3V0ZXI6IGZyb21OYXZpZ2F0ZSA/IHVuZGVmaW5lZCA6IHJvdXRlcixcbiAgICAgICAgfSxcbiAgICAgICAgbmF2T3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gZm9yY2Ugb3ZlcnJpZGVcbiAgICAgICAgICAgIHF1ZXJ5OiB7fSxcbiAgICAgICAgICAgIHBhcmFtczoge30sXG4gICAgICAgICAgICBwYXRoOiBwYXJhbXMucGF0aCxcbiAgICAgICAgICAgICdAcGFyYW1zJzogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcGFyYW1zLFxuICAgICAgICB9LFxuICAgICk7XG4gICAgcmV0dXJuIGZyb21OYXZpZ2F0ZSA/IGVuc3VyZUNsb25lKGNvbnRleHQpIDogY29udGV4dCBhcyBSb3V0ZUNvbnRleHQ7XG59O1xuXG4vKiogQGludGVybmFsIGNvbnZlcnQgY29udGV4dCBwYXJhbXMgKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSAocm91dGVzOiBSb3V0ZVBhcmFtZXRlcnMgfCBSb3V0ZVBhcmFtZXRlcnNbXSB8IHVuZGVmaW5lZCk6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9PiB7XG4gICAgY29uc3QgZmxhdHRlbiA9IChwYXJlbnRQYXRoOiBzdHJpbmcsIG5lc3RlZDogUm91dGVQYXJhbWV0ZXJzW10pOiBSb3V0ZVBhcmFtZXRlcnNbXSA9PiB7XG4gICAgICAgIGNvbnN0IHJldHZhbDogUm91dGVQYXJhbWV0ZXJzW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBuIG9mIG5lc3RlZCkge1xuICAgICAgICAgICAgbi5wYXRoID0gYCR7cGFyZW50UGF0aC5yZXBsYWNlKC9cXC8kLywgJycpfS8ke25vcm1hbGl6ZUlkKG4ucGF0aCl9YDtcbiAgICAgICAgICAgIHJldHZhbC5wdXNoKG4pO1xuICAgICAgICAgICAgaWYgKG4ucm91dGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goLi4uZmxhdHRlbihuLnBhdGgsIG4ucm91dGVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZsYXR0ZW4oJycsIGlzQXJyYXkocm91dGVzKSA/IHJvdXRlcyA6IHJvdXRlcyA/IFtyb3V0ZXNdIDogW10pXG4gICAgICAgIC5tYXAoKHNlZWQ6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleXM6IHBhdGgycmVnZXhwLktleVtdID0gW107XG4gICAgICAgICAgICBzZWVkLnJlZ2V4cCA9IHBhdGgycmVnZXhwLnBhdGhUb1JlZ2V4cChzZWVkLnBhdGgsIGtleXMpO1xuICAgICAgICAgICAgc2VlZC5wYXJhbUtleXMgPSBrZXlzLmZpbHRlcihrID0+IGlzU3RyaW5nKGsubmFtZSkpLm1hcChrID0+IGsubmFtZSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgICAgIH0pO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgcHJlcGFyZSBJSGlzdG9yeSBvYmplY3QgKi9cbmV4cG9ydCBjb25zdCBwcmVwYXJlSGlzdG9yeSA9IChzZWVkOiAnaGFzaCcgfCAnaGlzdG9yeScgfCAnbWVtb3J5JyB8IElIaXN0b3J5ID0gJ2hhc2gnLCBpbml0aWFsUGF0aD86IHN0cmluZywgY29udGV4dD86IFdpbmRvdyk6IElIaXN0b3J5PFJvdXRlQ29udGV4dD4gPT4ge1xuICAgIHJldHVybiAoaXNTdHJpbmcoc2VlZClcbiAgICAgICAgPyAnbWVtb3J5JyA9PT0gc2VlZCA/IGNyZWF0ZU1lbW9yeUhpc3RvcnkoaW5pdGlhbFBhdGggfHwgJycpIDogY3JlYXRlU2Vzc2lvbkhpc3RvcnkoaW5pdGlhbFBhdGgsIHVuZGVmaW5lZCwgeyBtb2RlOiBzZWVkLCBjb250ZXh0IH0pXG4gICAgICAgIDogc2VlZFxuICAgICkgYXMgSUhpc3Rvcnk8Um91dGVDb250ZXh0Pjtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBidWlsZE5hdmlnYXRlVXJsID0gKHBhdGg6IHN0cmluZywgb3B0aW9uczogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IHN0cmluZyA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcGF0aCA9IGAvJHtub3JtYWxpemVJZChwYXRoKX1gO1xuICAgICAgICBjb25zdCB7IHF1ZXJ5LCBwYXJhbXMgfSA9IG9wdGlvbnM7XG4gICAgICAgIGxldCB1cmwgPSBwYXRoMnJlZ2V4cC5jb21waWxlKHBhdGgpKHBhcmFtcyB8fCB7fSk7XG4gICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhxdWVyeSl9YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCxcbiAgICAgICAgICAgIGBDb25zdHJ1Y3Qgcm91dGUgZGVzdGluYXRpb24gZmFpbGVkLiBbcGF0aDogJHtwYXRofSwgZGV0YWlsOiAke2Vycm9yLnRvU3RyaW5nKCl9XWAsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgcGFyc2VVcmxQYXJhbXMgPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHsgdXJsIH0gPSByb3V0ZTtcbiAgICByb3V0ZS5xdWVyeSAgPSB1cmwuaW5jbHVkZXMoJz8nKSA/IHBhcnNlVXJsUXVlcnkobm9ybWFsaXplSWQodXJsKSkgOiB7fTtcbiAgICByb3V0ZS5wYXJhbXMgPSB7fTtcblxuICAgIGNvbnN0IHsgcmVnZXhwLCBwYXJhbUtleXMgfSA9IHJvdXRlWydAcGFyYW1zJ107XG4gICAgaWYgKHBhcmFtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gcmVnZXhwLmV4ZWModXJsKT8ubWFwKCh2YWx1ZSwgaW5kZXgpID0+IHsgcmV0dXJuIHsgdmFsdWUsIGtleTogcGFyYW1LZXlzW2luZGV4IC0gMV0gfTsgfSk7XG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zISkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIGlmIChudWxsICE9IHBhcmFtLmtleSAmJiBudWxsICE9IHBhcmFtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXNzaWduVmFsdWUocm91dGUucGFyYW1zLCBwYXJhbS5rZXksIGNvbnZlcnRVcmxQYXJhbVR5cGUocGFyYW0udmFsdWUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzI2luc3RhbmNlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlID0gYXN5bmMgKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCB7ICdAcGFyYW1zJzogcGFyYW1zIH0gPSByb3V0ZTtcblxuICAgIGlmIChwYXJhbXMucGFnZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IHsgY29tcG9uZW50LCBjb21wb25lbnRPcHRpb25zIH0gPSBwYXJhbXM7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29tcG9uZW50KSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9hd2FpdC10aGVuYWJsZVxuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBhd2FpdCBuZXcgKGNvbXBvbmVudCBhcyB1bmtub3duIGFzIENsYXNzKShyb3V0ZSwgY29tcG9uZW50T3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBhd2FpdCBjb21wb25lbnQocm91dGUsIGNvbXBvbmVudE9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChjb21wb25lbnQpKSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0gT2JqZWN0LmFzc2lnbih7ICdAcm91dGUnOiByb3V0ZSwgJ0BvcHRpb25zJzogY29tcG9uZW50T3B0aW9ucyB9LCBjb21wb25lbnQpIGFzIFBhZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLnBhZ2UgPSB7ICdAcm91dGUnOiByb3V0ZSwgJ0BvcHRpb25zJzogY29tcG9uZW50T3B0aW9ucyB9IGFzIFBhZ2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIG5ld2x5IGNyZWF0ZWRcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMjJHRlbXBsYXRlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlID0gYXN5bmMgKHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGlmIChwYXJhbXMuJHRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgZW5zdXJlSW5zdGFuY2UgPSAoZWw6IEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkKTogRE9NID0+IHtcbiAgICAgICAgcmV0dXJuIGVsIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/ICQoWy4uLmVsLmNvbnRlbnQuY2hpbGRyZW5dKSBhcyBET00gOiAkKGVsKTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyBjb250ZW50IH0gPSBwYXJhbXM7XG4gICAgaWYgKG51bGwgPT0gY29udGVudCkge1xuICAgICAgICAvLyBub29wIGVsZW1lbnRcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9ICQ8SFRNTEVsZW1lbnQ+KCk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZygoY29udGVudCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ3NlbGVjdG9yJ10pKSB7XG4gICAgICAgIC8vIGZyb20gYWpheFxuICAgICAgICBjb25zdCB7IHNlbGVjdG9yLCB1cmwgfSA9IGNvbnRlbnQgYXMgeyBzZWxlY3Rvcjogc3RyaW5nOyB1cmw/OiBzdHJpbmc7IH07XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdG9UZW1wbGF0ZUVsZW1lbnQoYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybDogdXJsICYmIHRvVXJsKHVybCkgfSkpO1xuICAgICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihgdGVtcGxhdGUgbG9hZCBmYWlsZWQuIFtzZWxlY3RvcjogJHtzZWxlY3Rvcn0sIHVybDogJHt1cmx9XWApO1xuICAgICAgICB9XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSBlbnN1cmVJbnN0YW5jZSh0ZW1wbGF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgJGVsID0gJChjb250ZW50IGFzIERPTVNlbGVjdG9yKTtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCRlbFswXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIG5ld2x5IGNyZWF0ZWRcbn07XG5cbi8qKiBAaW50ZXJuYWwgZGVjaWRlIHRyYW5zaXRpb24gZGlyZWN0aW9uICovXG5leHBvcnQgY29uc3QgZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbiA9IChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiBIaXN0b3J5RGlyZWN0aW9uID0+IHtcbiAgICBpZiAoY2hhbmdlSW5mby5yZXZlcnNlKSB7XG4gICAgICAgIHN3aXRjaCAoY2hhbmdlSW5mby5kaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2JhY2snOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZm9yd2FyZCc7XG4gICAgICAgICAgICBjYXNlICdmb3J3YXJkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2JhY2snO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2hhbmdlSW5mby5kaXJlY3Rpb247XG59O1xuXG4vKiogQGludGVybmFsICovXG50eXBlIEVmZmVjdFR5cGUgPSAnYW5pbWF0aW9uJyB8ICd0cmFuc2l0aW9uJztcblxuLyoqIEBpbnRlcm5hbCByZXRyaWV2ZSBlZmZlY3QgZHVyYXRpb24gcHJvcGVydHkgKi9cbmNvbnN0IGdldEVmZmVjdER1cmF0aW9uU2VjID0gKCRlbDogRE9NLCBlZmZlY3Q6IEVmZmVjdFR5cGUpOiBudW1iZXIgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KGdldENvbXB1dGVkU3R5bGUoJGVsWzBdKVtgJHtlZmZlY3R9RHVyYXRpb25gXSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHdhaXRGb3JFZmZlY3QgPSAoJGVsOiBET00sIGVmZmVjdDogRWZmZWN0VHlwZSwgZHVyYXRpb25TZWM6IG51bWJlcik6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgIHJldHVybiBQcm9taXNlLnJhY2UoW1xuICAgICAgICBuZXcgUHJvbWlzZShyZXNvbHZlID0+ICRlbFtgJHtlZmZlY3R9RW5kYF0ocmVzb2x2ZSkpLFxuICAgICAgICBzbGVlcChkdXJhdGlvblNlYyAqIDEwMDAgKyBDb25zdC5XQUlUX1RSQU5TSVRJT05fTUFSR0lOKSxcbiAgICBdKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBleGVjdXRpb24gKi9cbmV4cG9ydCBjb25zdCBwcm9jZXNzUGFnZVRyYW5zaXRpb24gPSBhc3luYygkZWw6IERPTSwgZnJvbUNsYXNzOiBzdHJpbmcsIGFjdGl2ZUNsYXNzOiBzdHJpbmcsIHRvQ2xhc3M6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICRlbC5yZW1vdmVDbGFzcyhmcm9tQ2xhc3MpO1xuICAgICRlbC5hZGRDbGFzcyh0b0NsYXNzKTtcblxuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBbJ2FuaW1hdGlvbicsICd0cmFuc2l0aW9uJ10gYXMgRWZmZWN0VHlwZVtdKSB7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gZ2V0RWZmZWN0RHVyYXRpb25TZWMoJGVsLCBlZmZlY3QpO1xuICAgICAgICBkdXJhdGlvbiAmJiBwcm9taXNlcy5wdXNoKHdhaXRGb3JFZmZlY3QoJGVsLCBlZmZlY3QsIGR1cmF0aW9uKSk7XG4gICAgfVxuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgICRlbC5yZW1vdmVDbGFzcyhbYWN0aXZlQ2xhc3MsIHRvQ2xhc3NdKTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFJvdXRlQXluY1Byb2Nlc3MgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIFJvdXRlQXluY1Byb2Nlc3MgaW1wbGVtZW50YXRpb24gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCBpbXBsZW1lbnRzIFJvdXRlQXluY1Byb2Nlc3Mge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Byb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlQXluY1Byb2Nlc3NcblxuICAgIHJlZ2lzdGVyKHByb21pc2U6IFByb21pc2U8dW5rbm93bj4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcHJvbWlzZXMucHVzaChwcm9taXNlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbCBtZXRob2RzOlxuXG4gICAgZ2V0IHByb21pc2VzKCk6IHJlYWRvbmx5IFByb21pc2U8dW5rbm93bj5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcm9taXNlcztcbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgY29tcGxldGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHRoaXMuX3Byb21pc2VzKTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZXMubGVuZ3RoID0gMDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2FtZWxpemUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgaXNSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUgeyBJSGlzdG9yeSwgSGlzdG9yeVN0YXRlIH0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlckV2ZW50LFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFRyYW5zaXRpb25TZXR0aW5ncyxcbiAgICBOYXZpZ2F0aW9uU2V0dGluZ3MsXG4gICAgUGFnZVN0YWNrLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgQ3NzTmFtZSxcbiAgICBEb21DYWNoZSxcbiAgICBMaW5rRGF0YSxcbiAgICBQYWdlRXZlbnQsXG4gICAgUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0LFxuICAgIFJvdXRlQ29udGV4dCxcbiAgICBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICB0b1JvdXRlQ29udGV4dCxcbiAgICBwcmVwYXJlSGlzdG9yeSxcbiAgICBidWlsZE5hdmlnYXRlVXJsLFxuICAgIHBhcnNlVXJsUGFyYW1zLFxuICAgIGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZSxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUsXG4gICAgZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbixcbiAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgfSBmcm9tICcuL2FzeW5jLXByb2Nlc3MnO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUm91dGVyIGltcGxpbWVudCBjbGFzcy5cbiAqIEBqYSBSb3V0ZXIg5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJvdXRlckNvbnRleHQgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSb3V0ZXJFdmVudD4gaW1wbGVtZW50cyBSb3V0ZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JvdXRlczogUmVjb3JkPHN0cmluZywgUm91dGVDb250ZXh0UGFyYW1ldGVycz4gPSB7fTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5OiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRlbDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JhZjogVW5rbm93bkZ1bmN0aW9uO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlDaGFuZ2luZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5UmVmcmVzaEhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlSZWZyZXNoO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Vycm9ySGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGFuZGxlRXJyb3I7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY3NzUHJlZml4OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdHJhbnNpdGlvblNldHRpbmdzOiBUcmFuc2l0aW9uU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBfbmF2aWdhdGlvblNldHRpbmdzOiBSZXF1aXJlZDxOYXZpZ2F0aW9uU2V0dGluZ3M+O1xuICAgIHByaXZhdGUgX2xhc3RSb3V0ZT86IFJvdXRlQ29udGV4dDtcbiAgICBwcml2YXRlIF9wcmV2Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfdGVtcFRyYW5zaXRpb25QYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcztcbiAgICBwcml2YXRlIF9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zOiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgcm91dGVzLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHdpbmRvdzogY29udGV4dCxcbiAgICAgICAgICAgIGhpc3RvcnksXG4gICAgICAgICAgICBpbml0aWFsUGF0aCxcbiAgICAgICAgICAgIGNzc1ByZWZpeCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICBuYXZpZ2F0aW9uLFxuICAgICAgICB9ID0gb3B0aW9ucztcblxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgIHRoaXMuX3JhZiA9IGNvbnRleHQ/LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgICAgIHRoaXMuXyRlbCA9ICQoc2VsZWN0b3IsIGVsKTtcbiAgICAgICAgaWYgKCF0aGlzLl8kZWwubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQsIGBSb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuIFtzZWxlY3RvcjogJHtzZWxlY3RvciBhcyBzdHJpbmd9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faGlzdG9yeSA9IHByZXBhcmVIaXN0b3J5KGhpc3RvcnksIGluaXRpYWxQYXRoLCBjb250ZXh0IGFzIFdpbmRvdyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIgPSB0aGlzLm9uSGlzdG9yeUNoYW5naW5nLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlciAgPSB0aGlzLm9uSGlzdG9yeVJlZnJlc2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fZXJyb3JIYW5kbGVyICAgICAgICAgICA9IHRoaXMub25IYW5kbGVFcnJvci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGZvbGxvdyBhbmNob3JcbiAgICAgICAgdGhpcy5fJGVsLm9uKCdjbGljaycsICdbaHJlZl0nLCB0aGlzLm9uQW5jaG9yQ2xpY2tlZC5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9jc3NQcmVmaXggPSBjc3NQcmVmaXggfHwgQ3NzTmFtZS5ERUZBVUxUX1BSRUZJWDtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7IGRlZmF1bHQ6ICdub25lJywgcmVsb2FkOiAnbm9uZScgfSwgdHJhbnNpdGlvbik7XG4gICAgICAgIHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBtZXRob2Q6ICdwdXNoJyB9LCBuYXZpZ2F0aW9uKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyKHJvdXRlcyBhcyBSb3V0ZVBhcmFtZXRlcnNbXSwgc3RhcnQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBzdGF0ZSBpcyBpbiBzdWItZmxvdyAqL1xuICAgIGdldCBpc0luU3ViRmxvdygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuQmFjaztcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5Gb3J3YXJkO1xuICAgIH1cblxuICAgIC8qKiBSb3V0ZSByZWdpc3RyYXRpb24gKi9cbiAgICByZWdpc3Rlcihyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdLCByZWZyZXNoID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyhyb3V0ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3V0ZXNbY29udGV4dC5wYXRoXSA9IGNvbnRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmVmcmVzaCAmJiB2b2lkIHRoaXMuZ28oKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIE5hdmlnYXRlIHRvIG5ldyBwYWdlLiAqL1xuICAgIGFzeW5jIG5hdmlnYXRlKHRvOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHRvKTtcbiAgICAgICAgICAgIGlmICghc2VlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsIGBSb3V0ZSBub3QgZm91bmQuIFt0bzogJHt0b31dYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG9wdHMgICA9IE9iamVjdC5hc3NpZ24oeyBpbnRlbnQ6IHVuZGVmaW5lZCB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHVybCAgICA9IGJ1aWxkTmF2aWdhdGVVcmwodG8sIG9wdHMpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGUgID0gdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBzZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IG9wdHMubWV0aG9kIHx8IHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncy5tZXRob2Q7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gZXhlYyBuYXZpZ2F0ZVxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnlbbWV0aG9kXSh1cmwsIHJvdXRlKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEFkZCBwYWdlIHN0YWNrIHN0YXJ0aW5nIGZyb20gdGhlIGN1cnJlbnQgaGlzdG9yeS4gKi9cbiAgICBhc3luYyBwdXNoUGFnZVN0YWNrKHN0YWNrOiBQYWdlU3RhY2sgfCBQYWdlU3RhY2tbXSwgbm9OYXZpZ2F0ZT86IGJvb2xlYW4pOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrcyA9IGlzQXJyYXkoc3RhY2spID8gc3RhY2sgOiBbc3RhY2tdO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVzID0gc3RhY2tzLmZpbHRlcihzID0+ICEhcy5yb3V0ZSkubWFwKHMgPT4gcy5yb3V0ZSBhcyBSb3V0ZVBhcmFtZXRlcnMpO1xuXG4gICAgICAgICAgICAvLyBlbnNydWUgUm91dGVcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXIocm91dGVzLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIHB1c2ggaGlzdG9yeVxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBzdGFja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB1cmwsIHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHBhZ2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFt1cmw6ICR7dXJsfV1gLCBwYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBzaWxlbnQgcmVnaXN0cnlcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHBhcmFtcywgeyBpbnRlbnQ6IHVuZGVmaW5lZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUudHJhbnNpdGlvbiA9IHRyYW5zaXRpb247XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLnJldmVyc2UgICAgPSByZXZlcnNlO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMuX2hpc3RvcnkucHVzaCh1cmwsIHJvdXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG5vTmF2aWdhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5nbygtMSAqIHN0YWNrcy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIW5vTmF2aWdhdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmdvKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkgYnkgc3RhY2sgSUQuICovXG4gICAgYXN5bmMgdHJhdmVyc2VUbyhpZDogc3RyaW5nKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkudHJhdmVyc2VUbyhpZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBCZWdpbiBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBiZWdpblN1YkZsb3codG86IHN0cmluZywgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtcywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MuZGVmYXVsdCBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvcmlnaW46IHRoaXMuY3VycmVudFJvdXRlLnVybCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN1YmZsb3csXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRlU3ViRmxvd1BhcmFtcyhwYXJhbXMpO1xuICAgICAgICAgICAgKHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dCkuc3ViZmxvdyA9IHBhcmFtcztcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubmF2aWdhdGUodG8sIG9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENvbW1pdCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjb21taXRTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGNvbnN0IHsgYWRkaXRpb25hbERpc3RhbmNlLCBhZGRpdGluYWxTdGFja3MgfSA9IHN1YmZsb3cucGFyYW1zO1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHN1YmZsb3cuZGlzdGFuY2UgKyBhZGRpdGlvbmFsRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGFkZGl0aW5hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKCgpID0+IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW5hbFN0YWNrcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogZGlzdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENhbmNlbCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjYW5jZWxTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBzdWJmbG93LmRpc3RhbmNlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogU2V0IGNvbW1vbiB0cmFuc2l0aW9uIHNldHRuaWdzLiAqL1xuICAgIHRyYW5zaXRpb25TZXR0aW5ncyhuZXdTZXR0aW5ncz86IFRyYW5zaXRpb25TZXR0aW5ncyk6IFRyYW5zaXRpb25TZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0gdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzO1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiAodGhpcy5fdHJhbnNpdGlvblNldHRpbmdzID0geyAuLi5uZXdTZXR0aW5ncyB9KTtcbiAgICAgICAgcmV0dXJuIG9sZFNldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIG5hdmlnYXRpb24gc2V0dG5pZ3MuICovXG4gICAgbmF2aWdhdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogTmF2aWdhdGlvblNldHRpbmdzKTogTmF2aWdhdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB0aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3M7XG4gICAgICAgIG5ld1NldHRpbmdzICYmICh0aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbWV0aG9kOiAncHVzaCcgfSwgbmV3U2V0dGluZ3MpKTtcbiAgICAgICAgcmV0dXJuIG9sZFNldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiBSZWZyZXNoIHJvdXRlciAoc3BlY2lmeSB1cGRhdGUgbGV2ZWwpLiAqL1xuICAgIGFzeW5jIHJlZnJlc2gobGV2ZWwgPSBSb3V0ZXJSZWZyZXNoTGV2ZWwuUkVMT0FEKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHN3aXRjaCAobGV2ZWwpIHtcbiAgICAgICAgICAgIGNhc2UgUm91dGVyUmVmcmVzaExldmVsLlJFTE9BRDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbygpO1xuICAgICAgICAgICAgY2FzZSBSb3V0ZXJSZWZyZXNoTGV2ZWwuRE9NX0NMRUFSOiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiB0aGlzLl9oaXN0b3J5LnN0YWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQocm91dGUuZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWdlID0gcm91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubW91bnRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygndW5tb3VudGVkJywgcGFnZSwgcm91dGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyb3V0ZS5lbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5sb2FkZWQnLCByb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3JlbW92ZWQnLCBwYWdlLCByb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlICYmICh0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsISk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bnN1cHBvcnRlZCBsZXZlbDogJHtsZXZlbH1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogc3ViLWZsb3dcblxuICAgIC8qKiBAaW50ZXJuYWwgZXZhbHVhdGUgc3ViLWZsb3cgcGFyYW1ldGVycyAqL1xuICAgIHByaXZhdGUgZXZhbHVhdGVTdWJGbG93UGFyYW1zKHN1YmZsb3c6IFJvdXRlU3ViRmxvd1BhcmFtcyk6IHZvaWQge1xuICAgICAgICBsZXQgYWRkaXRpb25hbERpc3RhbmNlID0gMDtcblxuICAgICAgICBpZiAoc3ViZmxvdy5iYXNlKSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlSWQgPSBub3JtYWxpemVJZChzdWJmbG93LmJhc2UpO1xuICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCB7IGluZGV4LCBzdGFjayB9ID0gdGhpcy5faGlzdG9yeTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBpbmRleDsgaSA+PSAwOyBpLS0sIGFkZGl0aW9uYWxEaXN0YW5jZSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YWNrW2ldWydAaWQnXSA9PT0gYmFzZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9JTlZBTElEX1NVQkZMT1dfQkFTRV9VUkwsIGBJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLiBbdXJsOiAke3N1YmZsb3cuYmFzZX1dYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdWJmbG93LmJhc2UgPSB0aGlzLmN1cnJlbnRSb3V0ZS51cmw7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuYXNzaWduKHN1YmZsb3csIHsgYWRkaXRpb25hbERpc3RhbmNlIH0pO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBmaW5kU3ViRmxvd1BhcmFtcyhkZXRhY2g6IGJvb2xlYW4pOiB7IGRpc3RhbmNlOiBudW1iZXI7IHBhcmFtczogUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07IH0gfCB2b2lkIHtcbiAgICAgICAgY29uc3Qgc3RhY2sgPSB0aGlzLl9oaXN0b3J5LnN0YWNrO1xuICAgICAgICBmb3IgKGxldCBpID0gc3RhY2subGVuZ3RoIC0gMSwgZGlzdGFuY2UgPSAwOyBpID49IDA7IGktLSwgZGlzdGFuY2UrKykge1xuICAgICAgICAgICAgaWYgKHN0YWNrW2ldLnN1YmZsb3cpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBzdGFja1tpXS5zdWJmbG93IGFzIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgJiB7IGFkZGl0aW9uYWxEaXN0YW5jZTogbnVtYmVyOyB9O1xuICAgICAgICAgICAgICAgIGRldGFjaCAmJiBkZWxldGUgc3RhY2tbaV0uc3ViZmxvdztcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkaXN0YW5jZSwgcGFyYW1zIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb25cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGBSb3V0ZXJFdmVudEFyZ2AgbWFrZXIgKi9cbiAgICBwcml2YXRlIG1ha2VSb3V0ZUNoYW5nZUluZm8obmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0IHtcbiAgICAgICAgY29uc3QgaW50ZW50ID0gbmV3U3RhdGUuaW50ZW50O1xuICAgICAgICBkZWxldGUgbmV3U3RhdGUuaW50ZW50OyAvLyBuYXZpZ2F0ZSDmmYLjgavmjIflrprjgZXjgozjgZ8gaW50ZW50IOOBryBvbmUgdGltZSDjga7jgb/mnInlirnjgavjgZnjgotcblxuICAgICAgICBjb25zdCBmcm9tID0gKG9sZFN0YXRlIHx8IHRoaXMuX2xhc3RSb3V0ZSkgYXMgUm91dGVDb250ZXh0ICYgUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gdGhpcy5faGlzdG9yeS5kaXJlY3QobmV3U3RhdGVbJ0BpZCddLCBmcm9tPy5bJ0BpZCddKS5kaXJlY3Rpb247XG4gICAgICAgIGNvbnN0IGFzeW5jUHJvY2VzcyA9IG5ldyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCgpO1xuICAgICAgICBjb25zdCByZWxvYWQgPSBuZXdTdGF0ZS51cmwgPT09IGZyb20/LnVybDtcbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH1cbiAgICAgICAgICAgID0gdGhpcy5fdGVtcFRyYW5zaXRpb25QYXJhbXMgfHwgKHJlbG9hZFxuICAgICAgICAgICAgICAgID8geyB0cmFuc2l0aW9uOiB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MucmVsb2FkLCByZXZlcnNlOiBmYWxzZSB9XG4gICAgICAgICAgICAgICAgOiAoJ2JhY2snICE9PSBkaXJlY3Rpb24gPyBuZXdTdGF0ZSA6IGZyb20gYXMgUm91dGVDb250ZXh0KSk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJvdXRlcjogdGhpcyxcbiAgICAgICAgICAgIGZyb20sXG4gICAgICAgICAgICB0bzogbmV3U3RhdGUsXG4gICAgICAgICAgICBkaXJlY3Rpb24sXG4gICAgICAgICAgICBhc3luY1Byb2Nlc3MsXG4gICAgICAgICAgICByZWxvYWQsXG4gICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgcmV2ZXJzZSxcbiAgICAgICAgICAgIGludGVudCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGZpbmQgcm91dGUgYnkgdXJsICovXG4gICAgcHJpdmF0ZSBmaW5kUm91dGVDb250ZXh0UGFyYW1zKHVybDogc3RyaW5nKTogUm91dGVDb250ZXh0UGFyYW1ldGVycyB8IHZvaWQge1xuICAgICAgICBjb25zdCBrZXkgPSBgLyR7bm9ybWFsaXplSWQodXJsLnNwbGl0KCc/JylbMF0pfWA7XG4gICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCB7IHJlZ2V4cCB9ID0gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgaWYgKHJlZ2V4cC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIHBhZ2UgZXZlbnQgKi9cbiAgICBwcml2YXRlIHRyaWdnZXJQYWdlQ2FsbGJhY2soZXZlbnQ6IFBhZ2VFdmVudCwgdGFyZ2V0OiBQYWdlIHwgdW5kZWZpbmVkLCBhcmc6IFJvdXRlIHwgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCk6IHZvaWQge1xuICAgICAgICBjb25zdCBtZXRob2QgPSBjYW1lbGl6ZShgcGFnZS0ke2V2ZW50fWApO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbigodGFyZ2V0IGFzIFBhZ2UgJiBSZWNvcmQ8c3RyaW5nLCBVbmtub3duRnVuY3Rpb24+IHwgdW5kZWZpbmVkKT8uW21ldGhvZF0pKSB7XG4gICAgICAgICAgICBjb25zdCByZXR2YWwgPSAodGFyZ2V0IGFzIFBhZ2UgJiBSZWNvcmQ8c3RyaW5nLCBVbmtub3duRnVuY3Rpb24+IHwgdW5kZWZpbmVkKT8uW21ldGhvZF0oYXJnKTtcbiAgICAgICAgICAgIGlmIChyZXR2YWwgaW5zdGFuY2VvZiBQcm9taXNlICYmIChhcmcgYXMgUm91dGUgJiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ2FzeW5jUHJvY2VzcyddKSB7XG4gICAgICAgICAgICAgICAgKGFyZyBhcyBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KS5hc3luY1Byb2Nlc3MucmVnaXN0ZXIocmV0dmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgd2FpdCBmcmFtZSAqL1xuICAgIHByaXZhdGUgd2FpdEZyYW1lKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gd2FpdEZyYW1lKDEsIHRoaXMuX3JhZik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjaGFuZ2UgcGFnZSBtYWluIHByb2NlZHVyZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2hhbmdlUGFnZShuZXh0Um91dGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBwcmV2Um91dGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9pbkNoYW5naW5nUGFnZSA9IHRydWU7XG5cbiAgICAgICAgICAgIHBhcnNlVXJsUGFyYW1zKG5leHRSb3V0ZSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0aGlzLm1ha2VSb3V0ZUNoYW5nZUluZm8obmV4dFJvdXRlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgdGhpcy5fdGVtcFRyYW5zaXRpb25QYXJhbXMgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIGNvbnN0IFtcbiAgICAgICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCxcbiAgICAgICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIF0gPSBhd2FpdCB0aGlzLnByZXBhcmVDaGFuZ2VDb250ZXh0KGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICAvLyB0cmFuc2l0aW9uIGNvcmVcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBhd2FpdCB0aGlzLnRyYW5zaXRpb25QYWdlKHBhZ2VOZXh0LCAkZWxOZXh0LCBwYWdlUHJldiwgJGVsUHJldiwgY2hhbmdlSW5mbyk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlQ29udGV4dCgkZWxOZXh0LCAkZWxQcmV2LCBjaGFuZ2VJbmZvLCB0cmFuc2l0aW9uKTtcblxuICAgICAgICAgICAgLy8g6YG356e75YWI44GMIHN1YmZsb3cg6ZaL5aeL54K544Gn44GC44KL5aC05ZCILCBzdWJmbG93IOino+mZpFxuICAgICAgICAgICAgaWYgKG5leHRSb3V0ZS51cmwgPT09IHRoaXMuZmluZFN1YkZsb3dQYXJhbXMoZmFsc2UpPy5wYXJhbXMub3JpZ2luKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maW5kU3ViRmxvd1BhcmFtcyh0cnVlKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmNsZWFyRm9yd2FyZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2luQ2hhbmdpbmdQYWdlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogUHJvbWlzZTxbUGFnZSwgRE9NLCBQYWdlLCBET01dPiB7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IGNoYW5nZUluZm8udG8gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGNoYW5nZUluZm8uZnJvbSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogbmV4dFBhcmFtcyB9ID0gbmV4dFJvdXRlO1xuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogcHJldlBhcmFtcyB9ID0gcHJldlJvdXRlIHx8IHt9O1xuXG4gICAgICAgIC8vIHBhZ2UgaW5zdGFuY2VcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKG5leHRSb3V0ZSk7XG4gICAgICAgIC8vIHBhZ2UgJHRlbXBsYXRlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShuZXh0UGFyYW1zKTtcblxuICAgICAgICBjaGFuZ2VJbmZvLnNhbWVQYWdlSW5zdGFuY2UgPSBwcmV2UGFyYW1zPy5wYWdlICYmIHByZXZQYXJhbXMucGFnZSA9PT0gbmV4dFBhcmFtcy5wYWdlO1xuICAgICAgICBjb25zdCB7IHJlbG9hZCwgc2FtZVBhZ2VJbnN0YW5jZSwgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuXG4gICAgICAgIC8vIHBhZ2UgJGVsXG4gICAgICAgIGlmICghbmV4dFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBpZiAoIXJlbG9hZCAmJiBzYW1lUGFnZUluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgbmV4dFJvdXRlLmVsICA9IHByZXZSb3V0ZSEuZWw7XG4gICAgICAgICAgICAgICAgcHJldlJvdXRlIS5lbCA9IG5leHRSb3V0ZS5lbD8uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgICQocHJldlJvdXRlIS5lbCkuaW5zZXJ0QmVmb3JlKG5leHRSb3V0ZS5lbCk7XG4gICAgICAgICAgICAgICAgJChuZXh0Um91dGUuZWwpLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSkucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWBdKTtcbiAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Nsb25lZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnY2xvbmVkJywgbmV4dFBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG5leHRQYXJhbXMuJHRlbXBsYXRlPy5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0Um91dGUuZWwgICAgICAgICA9IG5leHRQYXJhbXMuJHRlbXBsYXRlWzBdO1xuICAgICAgICAgICAgICAgICAgICBuZXh0UGFyYW1zLiR0ZW1wbGF0ZSA9IG5leHRQYXJhbXMuJHRlbXBsYXRlLmNsb25lKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFJvdXRlLmVsID0gbmV4dFBhcmFtcy4kdGVtcGxhdGUhLmNsb25lKClbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbG9hZGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdpbml0JywgbmV4dFBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRlbE5leHQgPSAkKG5leHRSb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2VOZXh0ID0gbmV4dFBhcmFtcy5wYWdlITtcblxuICAgICAgICAvLyBtb3VudFxuICAgICAgICBpZiAoISRlbE5leHQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICRlbE5leHQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuXyRlbC5hcHBlbmQoJGVsTmV4dCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ21vdW50ZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnbW91bnRlZCcsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5leHRcbiAgICAgICAgICAgIChyZWxvYWQgJiYge30gfHwgcHJldlBhcmFtcz8ucGFnZSB8fCB7fSksIChyZWxvYWQgJiYgJChudWxsKSB8fCAkKHByZXZSb3V0ZT8uZWwpKSwgIC8vIHByZXZcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmFuc2l0aW9uUGFnZShcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gY2hhbmdlSW5mby50cmFuc2l0aW9uIHx8IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0O1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICdlbnRlci1mcm9tLWNsYXNzJzogY3VzdG9tRW50ZXJGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItYWN0aXZlLWNsYXNzJzogY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdlbnRlci10by1jbGFzcyc6IGN1c3RvbUVudGVyVG9DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1mcm9tLWNsYXNzJzogY3VzdG9tTGVhdmVGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtYWN0aXZlLWNsYXNzJzogY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS10by1jbGFzcyc6IGN1c3RvbUxlYXZlVG9DbGFzcyxcbiAgICAgICAgfSA9IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncztcblxuICAgICAgICAvLyBlbnRlci1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgZW50ZXJGcm9tQ2xhc3MgICA9IGN1c3RvbUVudGVyRnJvbUNsYXNzICAgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJBY3RpdmVDbGFzcyA9IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlclRvQ2xhc3MgICAgID0gY3VzdG9tRW50ZXJUb0NsYXNzICAgICB8fCBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfVE9fQ0xBU1N9YDtcblxuICAgICAgICAvLyBsZWF2ZS1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgbGVhdmVGcm9tQ2xhc3MgICA9IGN1c3RvbUxlYXZlRnJvbUNsYXNzICAgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVBY3RpdmVDbGFzcyA9IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZVRvQ2xhc3MgICAgID0gY3VzdG9tTGVhdmVUb0NsYXNzICAgICB8fCBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfVE9fQ0xBU1N9YDtcblxuICAgICAgICBhd2FpdCB0aGlzLmJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAvLyB0cmFuc2lzaW9uIGV4ZWN1dGlvblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsIGVudGVyVG9DbGFzcyksXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGxlYXZlVG9DbGFzcyksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5lbmRUcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRyYW5zaXRpb247XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIHByb2MgOiBiZWdpbiAqL1xuICAgIHByaXZhdGUgYXN5bmMgYmVnaW5UcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLCBlbnRlckZyb21DbGFzczogc3RyaW5nLCBlbnRlckFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sIGxlYXZlRnJvbUNsYXNzOiBzdHJpbmcsIGxlYXZlQWN0aXZlQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fJGVsLmFkZENsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICAkZWxOZXh0XG4gICAgICAgICAgICAuYWRkQ2xhc3MoW2VudGVyRnJvbUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pXG4gICAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4nKVxuICAgICAgICAgICAgLnJlZmxvdygpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoZW50ZXJBY3RpdmVDbGFzcylcbiAgICAgICAgO1xuICAgICAgICAkZWxQcmV2LmFkZENsYXNzKFtsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcywgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcblxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JlZm9yZS10cmFuc2l0aW9uJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2JlZm9yZS1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyYW5zaXRpb24gcHJvYyA6IGVuZCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZW5kVHJhbnNpdGlvbihcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgKCRlbE5leHRbMF0gIT09ICRlbFByZXZbMF0pICYmICRlbFByZXYuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcbiAgICAgICAgJGVsTmV4dC5yZW1vdmVDbGFzcyhbYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcbiAgICAgICAgJGVsUHJldi5yZW1vdmVDbGFzcyhbYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcblxuICAgICAgICB0aGlzLl8kZWwucmVtb3ZlQ2xhc3MoW1xuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWAsXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX0RJUkVDVElPTn0tJHtkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uKGNoYW5nZUluZm8pfWAsXG4gICAgICAgIF0pO1xuXG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYWZ0ZXItbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYWZ0ZXItZW50ZXInLCBwYWdlTmV4dCwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnYWZ0ZXItdHJhbnNpdGlvbicsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBjaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlIHBhZ2Ugc3RhdHVzIGFmdGVyIHRyYW5zaXRpb24gKi9cbiAgICBwcml2YXRlIHVwZGF0ZUNoYW5nZUNvbnRleHQoXG4gICAgICAgICRlbE5leHQ6IERPTSxcbiAgICAgICAgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICB0cmFuc2l0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZnJvbSwgcmVsb2FkLCBzYW1lUGFnZUluc3RhbmNlLCBkaXJlY3Rpb24sIHRvIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICBjb25zdCBwcmV2Um91dGUgPSBmcm9tIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gdG8gYXMgUm91dGVDb250ZXh0O1xuICAgICAgICBjb25zdCB1cmxDaGFuZ2VkID0gIXJlbG9hZDtcblxuXG4gICAgICAgIGlmICgkZWxOZXh0WzBdICE9PSAkZWxQcmV2WzBdKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgY2xhc3NcbiAgICAgICAgICAgICRlbFByZXZcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YClcbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApO1xuXG4gICAgICAgICAgICBpZiAodXJsQ2hhbmdlZCAmJiB0aGlzLl9wcmV2Um91dGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKHRoaXMuX3ByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICAgICAgJGVsLnJlbW92ZUNsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3ByZXZSb3V0ZS5lbCAmJiB0aGlzLl9wcmV2Um91dGUuZWwgIT09IHRoaXMuY3VycmVudFJvdXRlLmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlTHYgPSAkZWwuZGF0YShEb21DYWNoZS5EQVRBX05BTUUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoRG9tQ2FjaGUuQ0FDSEVfTEVWRUxfQ09OTkVDVCAhPT0gY2FjaGVMdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnZSA9IHRoaXMuX3ByZXZSb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXJlRXZlbnRzID0gdGhpcy5fcHJldlJvdXRlWydAcGFyYW1zJ10ucGFnZSAhPT0gbmV4dFJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bm1vdW50ZWQnLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygndW5tb3VudGVkJywgcGFnZSwgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9NRU1PUlkgIT09IGNhY2hlTHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyZUV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubG9hZGVkJywgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdyZW1vdmVkJywgcGFnZSwgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXJsQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlID0gcHJldlJvdXRlO1xuICAgICAgICAgICAgaWYgKHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICAkZWxQcmV2LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xhc3RSb3V0ZSA9IHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgJ2ZvcndhcmQnID09PSBkaXJlY3Rpb24gJiYgdHJhbnNpdGlvbiAmJiAodGhpcy5fbGFzdFJvdXRlLnRyYW5zaXRpb24gPSB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGBjaGFuZ2luZ2AgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5Q2hhbmdpbmcobmV4dFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgY2FuY2VsOiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCwgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5faW5DaGFuZ2luZ1BhZ2UpIHtcbiAgICAgICAgICAgIGNhbmNlbChtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfQlVTWSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0aGlzLm1ha2VSb3V0ZUNoYW5nZUluZm8obmV4dFN0YXRlLCB1bmRlZmluZWQpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ3dpbGwtY2hhbmdlJywgY2hhbmdlSW5mbywgY2FuY2VsKTtcbiAgICAgICAgcHJvbWlzZXMucHVzaCguLi5jaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5wcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYHJlZnJlc2hgIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGlzdG9yeVJlZnJlc2gobmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQsIHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW5zdXJlID0gKHN0YXRlOiBIaXN0b3J5U3RhdGU8UGFydGlhbDxSb3V0ZUNvbnRleHQ+Pik6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVybCAgPSBgLyR7c3RhdGVbJ0BpZCddfWA7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXModXJsKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFt1cmw6ICR7dXJsfV1gLCBzdGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBzdGF0ZVsnQHBhcmFtcyddKSB7XG4gICAgICAgICAgICAgICAgLy8gUm91dGVDb250ZXh0UGFyYW1ldGVyIOOCkiBhc3NpZ25cbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHN0YXRlLCB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHBhcmFtcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdGF0ZS5lbCkge1xuICAgICAgICAgICAgICAgIC8vIGlkIOOBq+e0kOOBpeOBj+imgee0oOOBjOOBmeOBp+OBq+WtmOWcqOOBmeOCi+WgtOWQiOOBr+WJsuOCiuW9k+OBplxuICAgICAgICAgICAgICAgIHN0YXRlLmVsID0gdGhpcy5faGlzdG9yeS5kaXJlY3Qoc3RhdGVbJ0BpZCddKT8uc3RhdGU/LmVsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBzY2hlZHVsaW5nIGByZWZyZXNoYCBkb25lLlxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLmNoYW5nZVBhZ2UoZW5zdXJlKG5ld1N0YXRlKSwgb2xkU3RhdGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBlcnJvciBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhhbmRsZUVycm9yKGVycm9yOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaChcbiAgICAgICAgICAgICdlcnJvcicsXG4gICAgICAgICAgICBpc1Jlc3VsdChlcnJvcikgPyBlcnJvciA6IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJywgZXJyb3IpXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYW5jaG9yIGNsaWNrIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uQW5jaG9yQ2xpY2tlZChldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQgYXMgRWxlbWVudCkuY2xvc2VzdCgnW2hyZWZdJyk7XG4gICAgICAgIGlmICgkdGFyZ2V0LmRhdGEoTGlua0RhdGEuUFJFVkVOVF9ST1VURVIpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgPSAkdGFyZ2V0LmF0dHIoJ2hyZWYnKTtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9ICR0YXJnZXQuZGF0YShMaW5rRGF0YS5UUkFOU0lUSU9OKSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1ldGhvZCAgICAgPSAkdGFyZ2V0LmRhdGEoTGlua0RhdGEuTkFWSUFHQVRFX01FVEhPRCkgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBtZXRob2RPcHRzID0gKCdwdXNoJyA9PT0gbWV0aG9kIHx8ICdyZXBsYWNlJyA9PT0gbWV0aG9kID8geyBtZXRob2QgfSA6IHt9KSBhcyBOYXZpZ2F0aW9uU2V0dGluZ3M7XG5cbiAgICAgICAgaWYgKCcjJyA9PT0gdXJsKSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMuYmFjaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdm9pZCB0aGlzLm5hdmlnYXRlKHVybCBhcyBzdHJpbmcsIHsgdHJhbnNpdGlvbiwgLi4ubWV0aG9kT3B0cyB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbUm91dGVyXV0gb2JqZWN0LlxuICogQGphIFtbUm91dGVyXV0g44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW1JvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnNdXSBvYmplY3RcbiAqICAtIGBqYWAgW1tSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zXV0g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb3V0ZXIoc2VsZWN0b3I6IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50Piwgb3B0aW9ucz86IFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMpOiBSb3V0ZXIge1xuICAgIHJldHVybiBuZXcgUm91dGVyQ29udGV4dChzZWxlY3RvciwgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIHN0YXJ0OiB0cnVlLFxuICAgIH0sIG9wdGlvbnMpKTtcbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwiRGVmZXJyZWQiLCJhdCIsInNvcnQiLCJub29wIiwid2ViUm9vdCIsIiRjZHAiLCJpc09iamVjdCIsIiRzaWduYXR1cmUiLCJFdmVudFB1Ymxpc2hlciIsInRvVXJsIiwiQ2FuY2VsVG9rZW4iLCJwb3N0IiwiaXNBcnJheSIsInBhdGgycmVnZXhwIiwiaXNTdHJpbmciLCJ0b1F1ZXJ5U3RyaW5ncyIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInBhcnNlVXJsUXVlcnkiLCJhc3NpZ25WYWx1ZSIsImNvbnZlcnRVcmxQYXJhbVR5cGUiLCJpc0Z1bmN0aW9uIiwiJCIsInRvVGVtcGxhdGVFbGVtZW50IiwibG9hZFRlbXBsYXRlU291cmNlIiwi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