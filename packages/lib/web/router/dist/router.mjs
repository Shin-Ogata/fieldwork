/*!
 * @cdp/router 0.9.9
 *   generic router scheme
 */

import { safe, $cdp, at, sort, isObject } from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import '@cdp/result';

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

/** @internal */ const window = safe(globalThis.window);

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
    isObject(state) && options.origin && (state['@origin'] = true);
    return state;
};
/** @internal */
const dropOriginMark = (state) => {
    isObject(state) && delete state['@origin'];
    return state;
};
/** @internal instance signature */
const $signature = Symbol('SessionHistory#signature');
//__________________________________________________________________________________________________//
/**
 * @en Browser session history management class.
 * @ja ブラウザセッション履歴管理クラス
 */
class SessionHistory extends EventPublisher {
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
        return this.state[$cdp];
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
        return at(this._stack, index);
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
        const data = Object.assign({ [$cdp]: id }, state);
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
            .filter(s => s[$cdp] === id);
        sort(candidates, (l, r) => (l.distance > r.distance ? 1 : -1), true);
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
        const data = Object.assign({ [$cdp]: id }, state);
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

export { STATUS, createSessionHistory, disposeSessionHistory, resetSessionHistory };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsImhpc3Rvcnkvc3NyLnRzIiwiaGlzdG9yeS9zZXNzaW9uLnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBST1VURVIgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19ST1VURVJfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9FUlJPUiA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDEsICdyb3V0ZXIgZXJyb3IuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuIiwiaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc09iamVjdCxcbiAgICBhdCxcbiAgICBzb3J0LFxuICAgICRjZHAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGV4dGVuZHMgZGVmaW5pdGlvbiAqL1xuaW50ZXJmYWNlIFNlc3Npb25IaXN0b3J5U2V0U3RhdGVPcHRpb25zIGV4dGVuZHMgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyB7XG4gICAgb3JpZ2luPzogYm9vbGVhbjtcbn1cblxuLyoqIEBpbnRlcm5hbCByZW1vdmUgXCIjXCIsIFwiL1wiICovXG5jb25zdCBjbGVhbkhhc2ggPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBzcmMucmVwbGFjZSgvXlsjL118XFxzKyQvZywgJycpO1xufTtcblxuLyoqIEBpbnRlcm5hbCByZW1vdmUgdXJsIHBhdGggc2VjdGlvbiAqL1xuY29uc3QgdG9IYXNoID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBoYXNoID0gLyMuKiQvLmV4ZWModXJsKT8uWzBdO1xuICAgIHJldHVybiBoYXNoID8gY2xlYW5IYXNoKGhhc2gpIDogdXJsO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgeyBhYnMgfSA9IE1hdGg7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHRyZWF0T3JpZ2luTWFyayA9IDxUPihzdGF0ZTogVCwgb3B0aW9uczogU2Vzc2lvbkhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBUID0+IHtcbiAgICBpc09iamVjdChzdGF0ZSkgJiYgb3B0aW9ucy5vcmlnaW4gJiYgKHN0YXRlWydAb3JpZ2luJ10gPSB0cnVlKTtcbiAgICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBkcm9wT3JpZ2luTWFyayA9IDxUPihzdGF0ZTogVCk6IFQgPT4ge1xuICAgIGlzT2JqZWN0KHN0YXRlKSAmJiBkZWxldGUgc3RhdGVbJ0BvcmlnaW4nXTtcbiAgICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnU2Vzc2lvbkhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCcm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8SGlzdG9yeUV2ZW50PFQ+PiBpbXBsZW1lbnRzIElIaXN0b3J5PFQ+IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb3BTdGF0ZUhhbmRsZXI6IHR5cGVvZiBTZXNzaW9uSGlzdG9yeS5wcm90b3R5cGUub25Qb3BTdGF0ZTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oYXNoQ2hhbmdlSGFuZGxlcjogdHlwZW9mIFNlc3Npb25IaXN0b3J5LnByb3RvdHlwZS5vbkhhc2hDaGFuZ2U7XG4gICAgcHJpdmF0ZSBfc3RhY2s6IEhpc3RvcnlTdGF0ZTxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIHByaXZhdGUgX2NhY2hlPzogSGlzdG9yeVN0YXRlPFQ+O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3aW5kb3dDb250eHQ6IFdpbmRvdywgaWQ6IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXNbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW5kb3dDb250eHQ7XG5cbiAgICAgICAgdGhpcy5fcG9wU3RhdGVIYW5kbGVyICAgPSB0aGlzLm9uUG9wU3RhdGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5faGFzaENoYW5nZUhhbmRsZXIgPSB0aGlzLm9uSGFzaENoYW5nZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIHRoaXMuX2hhc2hDaGFuZ2VIYW5kbGVyKTtcblxuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIHRoaXMucmVwbGFjZShpZCwgc3RhdGUsIHsgb3JpZ2luOiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCB0aGlzLl9oYXNoQ2hhbmdlSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3N0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTmFOO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0IGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyByZXNldChvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuX2luZGV4KSB8fCAxID09PSB0aGlzLl9zdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5fcHJldlN0YXRlID0gdGhpcy5fc3RhY2tbdGhpcy5faW5kZXhdO1xuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgdGhpcy5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5iYWNrVG9TZXNzc2lvbk9yaWdpbigpO1xuXG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyh0aGlzLnN0YXRlLCBuZXdVUkwsIG9sZFVSTCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlZWsoMCk7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGVbJGNkcF07XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrO1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX3N0YWNrLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGdvKGRlbHRhPzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGlmIGdpdmVuIDAsIG5vIHJlYWN0aW9uIChub3QgcmVsb2FkKS5cbiAgICAgICAgICAgIGlmICghZGVsdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNlZWsoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4ICsgZGVsdGE7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciBuZXcgaGlzdG9yeS5cbiAgICAgKiBAamEg5paw6KaP5bGl5q2044Gu55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVzaChpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgeyBpZDogY2xlYW5JZCwgZGF0YSB9ID0gdGhpcy5wdXNoU3RhY2soaWQsIHN0YXRlKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3B1c2hTdGF0ZScsIGNsZWFuSWQsIGRhdGEsIG9wdGlvbnMgfHwge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGN1cnJlbnQgaGlzdG9yeS5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu572u5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcmVwbGFjZShpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBTZXNzaW9uSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IG51bWJlciB7XG4gICAgICAgIGlkID0gY2xlYW5IYXNoKGlkKTtcbiAgICAgICAgY29uc3QgZGF0YSA9IE9iamVjdC5hc3NpZ24oeyBbJGNkcF06IGlkIH0sIHN0YXRlKTtcbiAgICAgICAgdGhpcy5fcHJldlN0YXRlID0gdGhpcy5fc3RhY2tbdGhpcy5faW5kZXhdO1xuICAgICAgICB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZVN0YXRlJywgaWQsIGRhdGEsIG9wdGlvbnMgfHwge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBmb3J3YXJkIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgojjgorliY3mlrnjga7lsaXmrbTjgpLliYrpmaRcbiAgICAgKi9cbiAgICBjbGVhckZvcndhcmQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrID0gdGhpcy5fc3RhY2suc2xpY2UoMCwgdGhpcy5faW5kZXggKyAxKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZCA9IGNsZWFuSGFzaChpZCk7XG4gICAgICAgIGNvbnN0IHsgX2luZGV4OiBiYXNlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gdGhpcy5fc3RhY2tcbiAgICAgICAgICAgIC5tYXAoKHMsIGluZGV4KSA9PiB7IHJldHVybiB7IGluZGV4LCBkaXN0YW5jZTogYWJzKGJhc2UgLSBpbmRleCksIC4uLnMgfTsgfSlcbiAgICAgICAgICAgIC5maWx0ZXIocyA9PiBzWyRjZHBdID09PSBpZClcbiAgICAgICAgO1xuICAgICAgICBzb3J0KGNhbmRpZGF0ZXMsIChsLCByKSA9PiAobC5kaXN0YW5jZSA+IHIuZGlzdGFuY2UgPyAxIDogLTEpLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZXNbMF0/LmluZGV4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IHN0YWNrIGluZm9ybWF0aW9uIGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GE44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KGlkOiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jbG9zZXN0KGlkKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbjogJ21pc3NpbmcnIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IGluZGV4IC0gdGhpcy5faW5kZXg7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSAwID09PSBkZWx0YVxuICAgICAgICAgICAgICAgID8gJ25vbmUnXG4gICAgICAgICAgICAgICAgOiBkZWx0YSA8IDAgPyAnYmFjaycgOiAnZm9yd2FyZCc7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb24sIGluZGV4LCBzdGF0ZTogdGhpcy5fc3RhY2tbaW5kZXhdIH07XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHByZXZpb3VzIHN0YXRlIGNhY2hlICovXG4gICAgcHJpdmF0ZSBzZXQgX3ByZXZTdGF0ZSh2YWw6IEhpc3RvcnlTdGF0ZTxUPiB8IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9jYWNoZSA9IHZhbDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHByZXZpb3VzIHN0YXRlIGFjY2VzcyAqL1xuICAgIHByaXZhdGUgZ2V0IF9wcmV2U3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcmV0dmFsID0gdGhpcy5fY2FjaGU7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9jYWNoZTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGdldCBhY3RpdmUgZGF0YSBmcm9tIGN1cnJlbnQgaW5kZXggb3JpZ2luICovXG4gICAgcHJpdmF0ZSBzZWVrKGRlbHRhOiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICBjb25zdCBwb3MgPSB0aGlzLl9pbmRleCArIGRlbHRhO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGludmFsaWQgYXJyYXkgaW5kZXguIFtsZW5ndGg6ICR7dGhpcy5sZW5ndGh9LCBnaXZlbjogJHtwb3N9XWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmF0KHBvcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBwdXNoIHN0YWNrICovXG4gICAgcHJpdmF0ZSBwdXNoU3RhY2soaWQ6IHN0cmluZywgc3RhdGU/OiBUKTogeyBpZDogc3RyaW5nOyBkYXRhOiBIaXN0b3J5U3RhdGU8VD47IH0ge1xuICAgICAgICBpZCA9IGNsZWFuSGFzaChpZCk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBPYmplY3QuYXNzaWduKHsgWyRjZHBdOiBpZCB9LCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuX3ByZXZTdGF0ZSA9IHRoaXMuX3N0YWNrW3RoaXMuX2luZGV4XTtcbiAgICAgICAgdGhpcy5fc3RhY2tbKyt0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgICAgICByZXR1cm4geyBpZCwgZGF0YSB9O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoU3RhdGUnIHwgJ3JlcGxhY2VTdGF0ZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgbnVsbCwgb3B0aW9uczogU2Vzc2lvbkhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBudW1iZXIge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgdGl0bGUgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgZG9jdW1lbnQsIGhpc3RvcnksIGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IHVudXNlZCA9IG51bGwgIT0gdGl0bGUgPyB0aXRsZSA6IGRvY3VtZW50LnRpdGxlO1xuXG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgICAgIGhpc3RvcnlbbWV0aG9kXSh0cmVhdE9yaWdpbk1hcmsoc3RhdGUsIG9wdGlvbnMpLCB1bnVzZWQsIGlkID8gYCMke2lkfWAgOiAnJyk7XG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKHN0YXRlLCBuZXdVUkwsIG9sZFVSTCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBgcG9wc3RhdGVgIGFuZCBgaGFzaGNoYW5nZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBkaXNwYXRjaENoYW5nZUluZm8oc3RhdGU6IFQgfCBudWxsLCBuZXdVUkw6IHN0cmluZywgb2xkVVJMOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFBvcFN0YXRlRXZlbnQoJ3BvcHN0YXRlJywgeyBzdGF0ZSB9KSk7XG4gICAgICAgIGlmIChuZXdVUkwgIT09IG9sZFVSTCkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEhhc2hDaGFuZ2VFdmVudCgnaGFzaGNoYW5nZScsIHsgbmV3VVJMLCBvbGRVUkwgfSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCByZWNlaXZlIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBvblBvcFN0YXRlKGV2OiBQb3BTdGF0ZUV2ZW50KTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaCgndXBkYXRlJywgZHJvcE9yaWdpbk1hcmsoZXYuc3RhdGUpKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHJlY2VpdmUgYGhhc3VjaGFuZ2VgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgb25IYXNoQ2hhbmdlKGV2OiBIYXNoQ2hhbmdlRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbmV3SWQgPSB0b0hhc2goZXYubmV3VVJMKTtcbiAgICAgICAgY29uc3Qgb2xkSWQgPSB0b0hhc2goZXYub2xkVVJMKTtcbiAgICAgICAgY29uc3QgbmV4dCAgPSB0aGlzLmNsb3Nlc3QobmV3SWQpO1xuICAgICAgICBpZiAobnVsbCA9PSBuZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnB1c2hTdGFjayhuZXdJZCwgdW5kZWZpbmVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gbmV4dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3SWQgIT09IG9sZElkKSB7XG4gICAgICAgICAgICBjb25zdCBvbGREYXRhID0gdGhpcy5fcHJldlN0YXRlIHx8IHRoaXMuZGlyZWN0KG9sZElkKS5zdGF0ZTtcbiAgICAgICAgICAgIGNvbnN0IG5ld0RhdGEgPSB0aGlzLnN0YXRlO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdjaGFuZ2UnLCBuZXdEYXRhLCBvbGREYXRhKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZm9sbG93IHRoZSBzZXNzaW9uIGhpc3RvcnkgdW50aWwgYG9yaWdpbmAgKGluIHNpbGVudCkgKi9cbiAgICBwcml2YXRlIGFzeW5jIGJhY2tUb1Nlc3NzaW9uT3JpZ2luKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdGhpcy5faGFzaENoYW5nZUhhbmRsZXIpO1xuXG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgY29uc3Qgd2FpdFBvcFN0YXRlID0gKCk6IFByb21pc2U8YW55PiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXYuc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IGlzT3JpZ2luID0gKHN0OiB1bmtub3duKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0ICYmIChzdCBhcyBvYmplY3QpWydAb3JpZ2luJ107XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBsZXQgc3RhdGUgPSB0aGlzLl93aW5kb3cuaGlzdG9yeS5zdGF0ZTtcbiAgICAgICAgICAgIHdoaWxlICghaXNPcmlnaW4oc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXRQb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5oaXN0b3J5LmJhY2soKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHN0YXRlOiAke0pTT04uc3RyaW5naWZ5KHN0YXRlLCBudWxsLCA0KX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIHRoaXMuX2hhc2hDaGFuZ2VIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIHdpbmRvd0NvbnR4dFxuICogIC0gYGVuYCBIaXN0b3J5IG93bmVyIHdpbmRvdyBvYmplY3RcbiAqICAtIGBqYWAg5bGl5q2044KS5omA5pyJ44GX44Gm44GE44KL44Km44Kj44Oz44OJ44Km44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgd2luZG93Q29udHh0OiBXaW5kb3cgPSB3aW5kb3cpOiBJSGlzdG9yeTxUPiB7XG4gICAgcmV0dXJuIG5ldyBTZXNzaW9uSGlzdG9yeSh3aW5kb3dDb250eHQsIGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGluc3RhbmNlWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikucmVzZXQob3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIERpc3Bvc2UgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz566h55CG44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPik6IHZvaWQge1xuICAgIGluc3RhbmNlWyRzaWduYXR1cmVdICYmIChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiaW1wb3J0ICcuL3Jlc3VsdC1jb2RlLWRlZnMnO1xuZXhwb3J0ICogZnJvbSAnLi9oaXN0b3J5JztcbmV4cG9ydCAqIGZyb20gJy4vcm91dGVyJztcblxuLy8gVE9ETzogcmVtb3ZlXG5pbXBvcnQgJ0BjZHAvcmVzdWx0JztcbmV4cG9ydCBjb25zdCBTVEFUVVMgPSAnVE9ETyc7XG5cbi8vIEZyYW1ld29yazcgUm91dGVyIEV2ZW50c1xuLy8gaHR0cHM6Ly9mcmFtZXdvcms3LmlvL2RvY3Mvdmlldy5odG1sI3JvdXRlci1ldmVudHNcblxuLy8gQmFyYmEuanMgbGlmZSBjeWNsZSBldmVudFxuLy8gaHR0cHM6Ly9iYXJiYS5qcy5vcmcvZG9jcy9nZXRzdGFydGVkL2xpZmVjeWNsZS9cblxuLy8gT25zZW4gVUkgKHN3aXBhYmxlIOOCguOBguOCiilcbi8vIGh0dHBzOi8vb25zZW4uaW8vdjIvYXBpL2pzL29ucy1uYXZpZ2F0b3IuaHRtbCNldmVudHMtc3VtbWFyeVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7OztBQU1BOzs7OztJQVVJO0lBQUE7UUFDSSx3RkFBNkMsQ0FBQTtRQUM3QyxvREFBeUIsWUFBQSxrQkFBa0IsZ0JBQXVCLGtCQUF5QixDQUFDLEVBQUUsZUFBZSxDQUFDLDRCQUFBLENBQUE7S0FDakgsSUFBQTtBQUNMLENBQUM7O0FDbEJELGlCQUF3QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQzs7QUNvQjlEO0FBQ0EsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFXO0lBQzFCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDO0FBRUY7QUFDQSxNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQVc7SUFDdkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNuQyxPQUFPLElB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
