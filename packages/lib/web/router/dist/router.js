/*!
 * @cdp/router 0.9.10
 *   generic router scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/result')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/result'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, events) { 'use strict';

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
            RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_ERROR"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 75 /* ROUTER */ + 1, 'router error.')] = "ERROR_MVC_ROUTER_ERROR";
        })();
    })();

    /** @internal */ const window = coreUtils.safe(globalThis.window);

    /** @internal remove "#", "/" */
    const cleanHash = (src) => {
        return src.replace(/^[#/]|\s+$/g, '');
    };
    /** @internal remove url path section */
    const toHash = (url) => {
        const hash = /#.*$/.exec(url)?.[0];
        return hash ? cleanHash(hash) : url;
    };
    /** @internal */
    const { abs } = Math;
    /** @internal */
    const treatOriginMark = (state, options) => {
        coreUtils.isObject(state) && options.origin && (state['@origin'] = true);
        return state;
    };
    /** @internal */
    const dropOriginMark = (state) => {
        coreUtils.isObject(state) && delete state['@origin'];
        return state;
    };
    /** @internal instance signature */
    const $signature = Symbol('SessionHistory#signature');
    //__________________________________________________________________________________________________//
    /**
     * @en Browser session history management class.
     * @ja ブラウザセッション履歴管理クラス
     */
    class SessionHistory extends events.EventPublisher {
        /**
         * constructor
         */
        constructor(windowContxt, id, state) {
            super();
            this._stack = [];
            this._index = 0;
            this[$signature] = true;
            this._window = windowContxt;
            this._popStateHandler = this.onPopState.bind(this);
            this._hashChangeHandler = this.onHashChange.bind(this);
            this._window.addEventListener('popstate', this._popStateHandler);
            this._window.addEventListener('hashchange', this._hashChangeHandler);
            // initialize
            this.replace(id, state, { origin: true });
        }
        /**
         * dispose object
         */
        dispose() {
            this._window.removeEventListener('popstate', this._popStateHandler);
            this._window.removeEventListener('hashchange', this._hashChangeHandler);
            this._stack.length = 0;
            this._index = NaN;
        }
        /**
         * reset history
         */
        async reset(options) {
            if (Number.isNaN(this._index) || 1 === this._stack.length) {
                return;
            }
            const { silent } = options || {};
            this._prevState = this._stack[this._index];
            const oldURL = location.href;
            this._index = 0;
            this.clearForward();
            await this.backToSesssionOrigin();
            const newURL = location.href;
            if (!silent) {
                this.dispatchChangeInfo(this.state, newURL, oldURL);
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
            return this.seek(0);
        }
        /** current id */
        get id() {
            return this.state[coreUtils.$cdp];
        }
        /** current index */
        get index() {
            return this._index;
        }
        /** stack pool */
        get stack() {
            return this._stack;
        }
        /** get data by index. */
        at(index) {
            return coreUtils.at(this._stack, index);
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
        go(delta) {
            try {
                // if given 0, no reaction (not reload).
                if (!delta) {
                    return this._index;
                }
                this.seek(delta);
                this._window.history.go(delta);
                return this._index + delta;
            }
            catch (e) {
                console.warn(e);
                return this._index;
            }
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
            const { id: cleanId, data } = this.pushStack(id, state);
            return this.updateState('pushState', cleanId, data, options || {});
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
            id = cleanHash(id);
            const data = Object.assign({ [coreUtils.$cdp]: id }, state);
            this._prevState = this._stack[this._index];
            this._stack[this._index] = data;
            return this.updateState('replaceState', id, data, options || {});
        }
        /**
         * @en Clear forward history from current index.
         * @ja 現在の履歴のインデックスより前方の履歴を削除
         */
        clearForward() {
            this._stack = this._stack.slice(0, this._index + 1);
        }
        /**
         * @en Return closet index by ID.
         * @ja 指定された ID から最も近い index を返却
         */
        closest(id) {
            id = cleanHash(id);
            const { _index: base } = this;
            const candidates = this._stack
                .map((s, index) => { return { index, distance: abs(base - index), ...s }; })
                .filter(s => s[coreUtils.$cdp] === id);
            coreUtils.sort(candidates, (l, r) => (l.distance > r.distance ? 1 : -1), true);
            return candidates[0]?.index;
        }
        /**
         * @en Return closet stack information by ID.
         * @ja 指定された ID から最も近いスタック情報を返却
         */
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
        ///////////////////////////////////////////////////////////////////////
        // private methods:
        /** @internal previous state cache */
        set _prevState(val) {
            this._cache = val;
        }
        /** @internal previous state access */
        get _prevState() {
            const retval = this._cache;
            delete this._cache;
            return retval;
        }
        /** @internal get active data from current index origin */
        seek(delta) {
            const pos = this._index + delta;
            if (pos < 0) {
                throw new RangeError(`invalid array index. [length: ${this.length}, given: ${pos}]`);
            }
            return this.at(pos);
        }
        /** @internal push stack */
        pushStack(id, state) {
            id = cleanHash(id);
            const data = Object.assign({ [coreUtils.$cdp]: id }, state);
            this._prevState = this._stack[this._index];
            this._stack[++this._index] = data;
            return { id, data };
        }
        /** @internal update */
        updateState(method, id, state, options) {
            const { silent, title } = options;
            const { document, history, location } = this._window;
            const unused = null != title ? title : document.title;
            const oldURL = location.href;
            history[method](treatOriginMark(state, options), unused, id ? `#${id}` : '');
            const newURL = location.href;
            if (!silent) {
                this.dispatchChangeInfo(state, newURL, oldURL);
            }
            return this._index;
        }
        /** @internal dispatch `popstate` and `hashchange` events */
        dispatchChangeInfo(state, newURL, oldURL) {
            this._window.dispatchEvent(new PopStateEvent('popstate', { state }));
            if (newURL !== oldURL) {
                this._window.dispatchEvent(new HashChangeEvent('hashchange', { newURL, oldURL }));
            }
        }
        /** @internal receive `popstate` events */
        onPopState(ev) {
            this.publish('update', dropOriginMark(ev.state));
        }
        /** @internal receive `hasuchange` events */
        onHashChange(ev) {
            const newId = toHash(ev.newURL);
            const oldId = toHash(ev.oldURL);
            const next = this.closest(newId);
            if (null == next) {
                this.pushStack(newId, undefined);
            }
            else {
                this._index = next;
            }
            if (newId !== oldId) {
                const oldData = this._prevState || this.direct(oldId).state;
                const newData = this.state;
                this.publish('change', newData, oldData);
            }
        }
        /** @internal follow the session history until `origin` (in silent) */
        async backToSesssionOrigin() {
            try {
                this._window.removeEventListener('popstate', this._popStateHandler);
                this._window.removeEventListener('hashchange', this._hashChangeHandler);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const waitPopState = () => {
                    return new Promise(resolve => {
                        this._window.addEventListener('popstate', (ev) => {
                            resolve(ev.state);
                        });
                    });
                };
                const isOrigin = (st) => {
                    return st && st['@origin'];
                };
                let state = this._window.history.state;
                while (!isOrigin(state)) {
                    const promise = waitPopState();
                    this._window.history.back();
                    state = await promise;
                    console.log(`state: ${JSON.stringify(state, null, 4)}`);
                }
            }
            finally {
                this._window.addEventListener('popstate', this._popStateHandler);
                this._window.addEventListener('hashchange', this._hashChangeHandler);
            }
        }
    }
    //__________________________________________________________________________________________________//
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
     * @param windowContxt
     *  - `en` History owner window object
     *  - `ja` 履歴を所有しているウィンドウオブジェクト
     */
    function createSessionHistory(id, state, windowContxt = window) {
        return new SessionHistory(windowContxt, id, state);
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
        instance[$signature] && await instance.reset(options);
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
        instance[$signature] && instance.dispose();
    }

    const STATUS = 'TODO';
    // Framework7 Router Events
    // https://framework7.io/docs/view.html#router-events
    // Barba.js life cycle event
    // https://barba.js.org/docs/getstarted/lifecycle/
    // Onsen UI (swipable もあり)
    // https://onsen.io/v2/api/js/ons-navigator.html#events-summary

    exports.STATUS = STATUS;
    exports.createSessionHistory = createSessionHistory;
    exports.disposeSessionHistory = disposeSessionHistory;
    exports.resetSessionHistory = resetSessionHistory;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiaGlzdG9yeS9zc3IudHMiLCJoaXN0b3J5L3Nlc3Npb24udHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFJPVVRFUiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDE1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1JPVVRFUl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0VSUk9SID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMSwgJ3JvdXRlciBlcnJvci4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4iLCJpbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzT2JqZWN0LFxuICAgIGF0LFxuICAgIHNvcnQsXG4gICAgJGNkcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgZXh0ZW5kcyBkZWZpbml0aW9uICovXG5pbnRlcmZhY2UgU2Vzc2lvbkhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMgZXh0ZW5kcyBIaXN0b3J5U2V0U3RhdGVPcHRpb25zIHtcbiAgICBvcmlnaW4/OiBib29sZWFuO1xufVxuXG4vKiogQGludGVybmFsIHJlbW92ZSBcIiNcIiwgXCIvXCIgKi9cbmNvbnN0IGNsZWFuSGFzaCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9eWyMvXXxcXHMrJC9nLCAnJyk7XG59O1xuXG4vKiogQGludGVybmFsIHJlbW92ZSB1cmwgcGF0aCBzZWN0aW9uICovXG5jb25zdCB0b0hhc2ggPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IGhhc2ggPSAvIy4qJC8uZXhlYyh1cmwpPy5bMF07XG4gICAgcmV0dXJuIGhhc2ggPyBjbGVhbkhhc2goaGFzaCkgOiB1cmw7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCB7IGFicyB9ID0gTWF0aDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgdHJlYXRPcmlnaW5NYXJrID0gPFQ+KHN0YXRlOiBULCBvcHRpb25zOiBTZXNzaW9uSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFQgPT4ge1xuICAgIGlzT2JqZWN0KHN0YXRlKSAmJiBvcHRpb25zLm9yaWdpbiAmJiAoc3RhdGVbJ0BvcmlnaW4nXSA9IHRydWUpO1xuICAgIHJldHVybiBzdGF0ZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGRyb3BPcmlnaW5NYXJrID0gPFQ+KHN0YXRlOiBUKTogVCA9PiB7XG4gICAgaXNPYmplY3Qoc3RhdGUpICYmIGRlbGV0ZSBzdGF0ZVsnQG9yaWdpbiddO1xuICAgIHJldHVybiBzdGF0ZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdTZXNzaW9uSGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BvcFN0YXRlSGFuZGxlcjogdHlwZW9mIFNlc3Npb25IaXN0b3J5LnByb3RvdHlwZS5vblBvcFN0YXRlO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hhc2hDaGFuZ2VIYW5kbGVyOiB0eXBlb2YgU2Vzc2lvbkhpc3RvcnkucHJvdG90eXBlLm9uSGFzaENoYW5nZTtcbiAgICBwcml2YXRlIF9zdGFjazogSGlzdG9yeVN0YXRlPFQ+W10gPSBbXTtcbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG4gICAgcHJpdmF0ZSBfY2FjaGU/OiBIaXN0b3J5U3RhdGU8VD47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdpbmRvd0NvbnR4dDogV2luZG93LCBpZDogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpc1skc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbmRvd0NvbnR4dDtcblxuICAgICAgICB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIgICA9IHRoaXMub25Qb3BTdGF0ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9oYXNoQ2hhbmdlSGFuZGxlciA9IHRoaXMub25IYXNoQ2hhbmdlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdGhpcy5faGFzaENoYW5nZUhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdGhpcy5yZXBsYWNlKGlkLCBzdGF0ZSwgeyBvcmlnaW46IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGlzcG9zZSBvYmplY3RcbiAgICAgKi9cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIHRoaXMuX2hhc2hDaGFuZ2VIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc3RhY2subGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faW5kZXggPSBOYU47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5faW5kZXgpIHx8IDEgPT09IHRoaXMuX3N0YWNrLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB0aGlzLl9wcmV2U3RhdGUgPSB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF07XG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB0aGlzLmNsZWFyRm9yd2FyZCgpO1xuICAgICAgICBhd2FpdCB0aGlzLmJhY2tUb1Nlc3NzaW9uT3JpZ2luKCk7XG5cbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKHRoaXMuc3RhdGUsIG5ld1VSTCwgb2xkVVJMKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VlaygwKTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZVskY2RwXTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2s7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5fc3RhY2ssIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgZ28oZGVsdGE/OiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gaWYgZ2l2ZW4gMCwgbm8gcmVhY3Rpb24gKG5vdCByZWxvYWQpLlxuICAgICAgICAgICAgaWYgKCFkZWx0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2VlayhkZWx0YSk7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuaGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faW5kZXggKyBkZWx0YTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBudW1iZXIge1xuICAgICAgICBjb25zdCB7IGlkOiBjbGVhbklkLCBkYXRhIH0gPSB0aGlzLnB1c2hTdGFjayhpZCwgc3RhdGUpO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaFN0YXRlJywgY2xlYW5JZCwgZGF0YSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IFNlc3Npb25IaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogbnVtYmVyIHtcbiAgICAgICAgaWQgPSBjbGVhbkhhc2goaWQpO1xuICAgICAgICBjb25zdCBkYXRhID0gT2JqZWN0LmFzc2lnbih7IFskY2RwXTogaWQgfSwgc3RhdGUpO1xuICAgICAgICB0aGlzLl9wcmV2U3RhdGUgPSB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF07XG4gICAgICAgIHRoaXMuX3N0YWNrW3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlU3RhdGUnLCBpZCwgZGF0YSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5zbGljZSgwLCB0aGlzLl9pbmRleCArIDEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlkID0gY2xlYW5IYXNoKGlkKTtcbiAgICAgICAgY29uc3QgeyBfaW5kZXg6IGJhc2UgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLl9zdGFja1xuICAgICAgICAgICAgLm1hcCgocywgaW5kZXgpID0+IHsgcmV0dXJuIHsgaW5kZXgsIGRpc3RhbmNlOiBhYnMoYmFzZSAtIGluZGV4KSwgLi4ucyB9OyB9KVxuICAgICAgICAgICAgLmZpbHRlcihzID0+IHNbJGNkcF0gPT09IGlkKVxuICAgICAgICA7XG4gICAgICAgIHNvcnQoY2FuZGlkYXRlcywgKGwsIHIpID0+IChsLmRpc3RhbmNlID4gci5kaXN0YW5jZSA/IDEgOiAtMSksIHRydWUpO1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXT8uaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgc3RhY2sgaW5mb3JtYXRpb24gYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYTjgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QoaWQ6IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmNsb3Nlc3QoaWQpO1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uOiAnbWlzc2luZycgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gaW5kZXggLSB0aGlzLl9pbmRleDtcbiAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IDAgPT09IGRlbHRhXG4gICAgICAgICAgICAgICAgPyAnbm9uZSdcbiAgICAgICAgICAgICAgICA6IGRlbHRhIDwgMCA/ICdiYWNrJyA6ICdmb3J3YXJkJztcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbiwgaW5kZXgsIHN0YXRlOiB0aGlzLl9zdGFja1tpbmRleF0gfTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgcHJldmlvdXMgc3RhdGUgY2FjaGUgKi9cbiAgICBwcml2YXRlIHNldCBfcHJldlN0YXRlKHZhbDogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2NhY2hlID0gdmFsO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcHJldmlvdXMgc3RhdGUgYWNjZXNzICovXG4gICAgcHJpdmF0ZSBnZXQgX3ByZXZTdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCByZXR2YWwgPSB0aGlzLl9jYWNoZTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2NhY2hlO1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZ2V0IGFjdGl2ZSBkYXRhIGZyb20gY3VycmVudCBpbmRleCBvcmlnaW4gKi9cbiAgICBwcml2YXRlIHNlZWsoZGVsdGE6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMuX2luZGV4ICsgZGVsdGE7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHt0aGlzLmxlbmd0aH0sIGdpdmVuOiAke3Bvc31dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXQocG9zKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHB1c2ggc3RhY2sgKi9cbiAgICBwcml2YXRlIHB1c2hTdGFjayhpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiB7IGlkOiBzdHJpbmc7IGRhdGE6IEhpc3RvcnlTdGF0ZTxUPjsgfSB7XG4gICAgICAgIGlkID0gY2xlYW5IYXNoKGlkKTtcbiAgICAgICAgY29uc3QgZGF0YSA9IE9iamVjdC5hc3NpZ24oeyBbJGNkcF06IGlkIH0sIHN0YXRlKTtcbiAgICAgICAgdGhpcy5fcHJldlN0YXRlID0gdGhpcy5fc3RhY2tbdGhpcy5faW5kZXhdO1xuICAgICAgICB0aGlzLl9zdGFja1srK3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgICAgIHJldHVybiB7IGlkLCBkYXRhIH07XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2hTdGF0ZScgfCAncmVwbGFjZVN0YXRlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCBudWxsLCBvcHRpb25zOiBTZXNzaW9uSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IG51bWJlciB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCB0aXRsZSB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3QgeyBkb2N1bWVudCwgaGlzdG9yeSwgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgdW51c2VkID0gbnVsbCAhPSB0aXRsZSA/IHRpdGxlIDogZG9jdW1lbnQudGl0bGU7XG5cbiAgICAgICAgY29uc3Qgb2xkVVJMID0gbG9jYXRpb24uaHJlZjtcbiAgICAgICAgaGlzdG9yeVttZXRob2RdKHRyZWF0T3JpZ2luTWFyayhzdGF0ZSwgb3B0aW9ucyksIHVudXNlZCwgaWQgPyBgIyR7aWR9YCA6ICcnKTtcbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8oc3RhdGUsIG5ld1VSTCwgb2xkVVJMKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGRpc3BhdGNoIGBwb3BzdGF0ZWAgYW5kIGBoYXNoY2hhbmdlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGRpc3BhdGNoQ2hhbmdlSW5mbyhzdGF0ZTogVCB8IG51bGwsIG5ld1VSTDogc3RyaW5nLCBvbGRVUkw6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLl93aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgUG9wU3RhdGVFdmVudCgncG9wc3RhdGUnLCB7IHN0YXRlIH0pKTtcbiAgICAgICAgaWYgKG5ld1VSTCAhPT0gb2xkVVJMKSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgSGFzaENoYW5nZUV2ZW50KCdoYXNoY2hhbmdlJywgeyBuZXdVUkwsIG9sZFVSTCB9KSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHJlY2VpdmUgYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIG9uUG9wU3RhdGUoZXY6IFBvcFN0YXRlRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCd1cGRhdGUnLCBkcm9wT3JpZ2luTWFyayhldi5zdGF0ZSkpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcmVjZWl2ZSBgaGFzdWNoYW5nZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBvbkhhc2hDaGFuZ2UoZXY6IEhhc2hDaGFuZ2VFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zdCBuZXdJZCA9IHRvSGFzaChldi5uZXdVUkwpO1xuICAgICAgICBjb25zdCBvbGRJZCA9IHRvSGFzaChldi5vbGRVUkwpO1xuICAgICAgICBjb25zdCBuZXh0ICA9IHRoaXMuY2xvc2VzdChuZXdJZCk7XG4gICAgICAgIGlmIChudWxsID09IG5leHQpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YWNrKG5ld0lkLCB1bmRlZmluZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBuZXh0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdJZCAhPT0gb2xkSWQpIHtcbiAgICAgICAgICAgIGNvbnN0IG9sZERhdGEgPSB0aGlzLl9wcmV2U3RhdGUgfHwgdGhpcy5kaXJlY3Qob2xkSWQpLnN0YXRlO1xuICAgICAgICAgICAgY29uc3QgbmV3RGF0YSA9IHRoaXMuc3RhdGU7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsIG5ld0RhdGEsIG9sZERhdGEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmb2xsb3cgdGhlIHNlc3Npb24gaGlzdG9yeSB1bnRpbCBgb3JpZ2luYCAoaW4gc2lsZW50KSAqL1xuICAgIHByaXZhdGUgYXN5bmMgYmFja1RvU2Vzc3Npb25PcmlnaW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCB0aGlzLl9oYXNoQ2hhbmdlSGFuZGxlcik7XG5cbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgICBjb25zdCB3YWl0UG9wU3RhdGUgPSAoKTogUHJvbWlzZTxhbnk+ID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIChldjogUG9wU3RhdGVFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShldi5zdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgaXNPcmlnaW4gPSAoc3Q6IHVua25vd24pOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3QgJiYgKHN0IGFzIG9iamVjdClbJ0BvcmlnaW4nXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHRoaXMuX3dpbmRvdy5oaXN0b3J5LnN0YXRlO1xuICAgICAgICAgICAgd2hpbGUgKCFpc09yaWdpbihzdGF0ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdFBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuYmFjaygpO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3RhdGU6ICR7SlNPTi5zdHJpbmdpZnkoc3RhdGUsIG51bGwsIDQpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdGhpcy5faGFzaENoYW5nZUhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gd2luZG93Q29udHh0XG4gKiAgLSBgZW5gIEhpc3Rvcnkgb3duZXIgd2luZG93IG9iamVjdFxuICogIC0gYGphYCDlsaXmrbTjgpLmiYDmnInjgZfjgabjgYTjgovjgqbjgqPjg7Pjg4njgqbjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBULCB3aW5kb3dDb250eHQ6IFdpbmRvdyA9IHdpbmRvdyk6IElIaXN0b3J5PFQ+IHtcbiAgICByZXR1cm4gbmV3IFNlc3Npb25IaXN0b3J5KHdpbmRvd0NvbnR4dCwgaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc2V0U2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaW5zdGFuY2VbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIFNlc3Npb25IaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgaW5zdGFuY2VbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIFNlc3Npb25IaXN0b3J5PFQ+KS5kaXNwb3NlKCk7XG59XG4iLCJpbXBvcnQgJy4vcmVzdWx0LWNvZGUtZGVmcyc7XG5leHBvcnQgKiBmcm9tICcuL2hpc3RvcnknO1xuZXhwb3J0ICogZnJvbSAnLi9yb3V0ZXInO1xuXG4vLyBUT0RPOiByZW1vdmVcbmltcG9ydCAnQGNkcC9yZXN1bHQnO1xuZXhwb3J0IGNvbnN0IFNUQVRVUyA9ICdUT0RPJztcblxuLy8gRnJhbWV3b3JrNyBSb3V0ZXIgRXZlbnRzXG4vLyBodHRwczovL2ZyYW1ld29yazcuaW8vZG9jcy92aWV3Lmh0bWwjcm91dGVyLWV2ZW50c1xuXG4vLyBCYXJiYS5qcyBsaWZlIGN5Y2xlIGV2ZW50XG4vLyBodHRwczovL2JhcmJhLmpzLm9yZy9kb2NzL2dldHN0YXJ0ZWQvbGlmZWN5Y2xlL1xuXG4vLyBPbnNlbiBVSSAoc3dpcGFibGUg44KC44GC44KKKVxuLy8gaHR0cHM6Ly9vbnNlbi5pby92Mi9hcGkvanMvb25zLW5hdmlnYXRvci5odG1sI2V2ZW50cy1zdW1tYXJ5XG4iXSwibmFtZXMiOlsic2FmZSIsImlzT2JqZWN0IiwiRXZlbnRQdWJsaXNoZXIiLCIkY2RwIiwiYXQiLCJzb3J0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7OztJQU1BOzs7OztRQVVJO1FBQUE7WUFDSSx3RkFBNkMsQ0FBQTtZQUM3QyxvREFBeUIsWUFBQSxrQkFBa0IsZ0JBQXVCLGtCQUF5QixDQUFDLEVBQUUsZUFBZSxDQUFDLDRCQUFBLENBQUE7U0FDakgsSUFBQTtJQUNMLENBQUM7O0lDbEJELGlCQUF3QixNQUFNLE1BQU0sR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7O0lDb0I5RDtJQUNBLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBVztRQUMxQixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQztJQUVGO0lBQ0EsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFXO1FBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FB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O2lCQUNOLENBQUM7Z0JBRUYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFXO29CQUN6QixPQUFPLEVBQUUsSUFBSyxFQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQzFDLENBQUM7Z0JBRUYsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUN2QyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUNyQixNQUFNLE9BQU8sR0FBRyxZQUFZLEVBQUUsQ0FBQztvQkFDL0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzVCLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQztvQkFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQzNEO2FBQ0o7b0JBQVM7Z0JBQ04sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ2pFLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2FBQ3hFO1NBQ0o7S0FDSjtJQUVEO0lBRUE7Ozs7Ozs7Ozs7Ozs7O2FBY2dCLG9CQUFvQixDQUFrQixFQUFVLEVBQUUsS0FBUyxFQUFFLGVBQXVCLE1BQU07UUFDdEcsT0FBTyxJQUFJLGNBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRDs7Ozs7Ozs7SUFRTyxlQUFlLG1CQUFtQixDQUFrQixRQUFxQixFQUFFLE9BQWdDO1FBQzlHLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxNQUFPLFFBQThCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRDs7Ozs7Ozs7YUFRZ0IscUJBQXFCLENBQWtCLFFBQXFCO1FBQ3hFLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSyxRQUE4QixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3RFOztVQ2xaYSxNQUFNLEdBQUcsT0FBTztJQUU3QjtJQUNBO0lBRUE7SUFDQTtJQUVBO0lBQ0E7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3JvdXRlci8ifQ==
