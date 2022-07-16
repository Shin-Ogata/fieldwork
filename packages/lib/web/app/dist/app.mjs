/*!
 * @cdp/app 0.9.13
 *   application context
 */

import { EventPublisher } from '@cdp/events';
import { Deferred } from '@cdp/promise';
import { makeResult, RESULT_CODE } from '@cdp/result';
import { i18n, initializeI18N, localize } from '@cdp/i18n';
import { createRouter } from '@cdp/router';
import { safe, getConfig, getGlobalNamespace } from '@cdp/core-utils';
import { View } from '@cdp/view';

/* eslint-disable
    max-len,
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["APP_DECLARE"] = 9007199254740991] = "APP_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 80 /* LOCAL_CODE_BASE.APP */ + 1, 'AppContext need to be initialized with options at least once.')] = "ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED";
    })();
})();

/** @internal */ const window = safe(globalThis.window);

/** @internal partial match class name */
const hasPartialClassName = (el, className) => {
    for (const name of el.classList) {
        if (name.includes(className)) {
            return true;
        }
    }
    return false;
};
//__________________________________________________________________________________________________//
/** @internal force clear i18n settings */
const clearI18NSettings = () => {
    const context = i18n;
    delete context['options'];
    delete context['language'];
    delete context['languages'];
    delete context['isInitialized'];
};
/** @internal */
const getAppConfig = (base) => {
    return Object.assign({}, getConfig(), // CDP.Config
    getGlobalNamespace('Config'), // global Config
    base);
};
/** @internal ensure DOMContentLoaded */
const waitDomContentLoaded = async (context) => {
    'loading' === context.readyState && await new Promise(resolve => {
        context.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
};

//__________________________________________________________________________________________________//
const _initialPages = [];
/**
 * @en Register concrete [[Page]] class. Registered with the main router when instantiating [[AppContext]]. <br>
 *     If constructor needs arguments, `options.componentOptions` is available.
 * @ja Page 具象化クラスの登録. [[AppContext]] のインスタンス化時にメインルーターに登録される. <br>
 *     constructor を指定する引数がある場合は, `options.componentOptions` を利用可能
 *
 * @param path
 *  - `en` route path
 *  - `ja` ルートのパス
 * @param component
 *  - `en` specify the constructor or built object of the page component
 *  - `ja` ページコンポーネントのコンストラクタもしくは構築済みオブジェクト
 * @param options
 *  - `en` route parameters
 *  - `ja` ルートパラメータ
 *
 * @example <br>
 *
 * ```ts
 * import { registerPage } from '@cdp/runtime';
 *
 * // TODO:
 * ```
 */
const registerPage = (path, component, options) => {
    _initialPages.push(Object.assign({}, options, { path, component }));
};
//__________________________________________________________________________________________________//
/** AppContext impl class */
class Application extends EventPublisher {
    _window;
    _router;
    _ready = new Deferred();
    _activePage;
    _extension;
    constructor(options) {
        super();
        const { main, window: win } = options;
        this._window = win || window;
        this._router = createRouter(main, options);
        void this.initialize(options);
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: AppContext
    get router() {
        return this._router;
    }
    get ready() {
        return this._ready;
    }
    get activePage() {
        return this._router.currentRoute['@params'].page || {};
    }
    get extension() {
        return this._extension;
    }
    set extension(val) {
        this._extension = val;
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    async initialize(options) {
        const { i18n, waitForReady } = getAppConfig(options);
        this._window.addEventListener('error', this.onGlobalError.bind(this));
        this._window.addEventListener('unhandledrejection', this.onGlobalUnhandledRejection.bind(this));
        await Promise.all([
            waitDomContentLoaded(this._window.document),
            initializeI18N(i18n),
            waitForReady,
        ]);
        this._router.on('loaded', this.onPageLoaded.bind(this));
        this._router.register(_initialPages, true);
        this._ready.resolve();
        this.publish('ready', this);
    }
    ///////////////////////////////////////////////////////////////////////
    // event handlers:
    onPageLoaded(info) {
        localize(info.to.el);
    }
    onGlobalError(event) {
        console.error(`[Global Error] ${event.message}, ${event.filename}, ${event.colno}, ${event.error}`);
    }
    onGlobalUnhandledRejection(event) {
        console.error(`[Global Unhandled Rejection] ${event.reason}`);
    }
}
/** context cache */
let _appContext;
/**
 * @en Application context access
 * @ja アプリケーションコンテキスト取得
 *
 * @param options
 *  - `en` init options
 *  - `ja` 初期化オプション
 *
 * @example <br>
 *
 * ```ts
 * import { AppContext } from '@cdp/runtime';
 *
 * // first access
 * const app = AppContext({ main: '#app' });
 * // TODO:
 * ```
 */
const AppContext = (options) => {
    if (null == options && null == _appContext) {
        throw makeResult(RESULT_CODE.ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED, 'AppContext should be initialized with options at least once.');
    }
    const opts = Object.assign({ main: '#app', start: false }, options);
    if (opts.reset) {
        _appContext = undefined;
        clearI18NSettings();
    }
    if (!_appContext) {
        _appContext = new Application(opts);
    }
    return _appContext;
};

/** @internal */ const _properties = Symbol('page-view:properties');
//__________________________________________________________________________________________________//
/**
 * @en Base class definition of [[View]] that can be specified in as [[Page]] of [[Router]].
 * @ja [[Router]] の [[Page]] に指定可能な [[View]] の基底クラス定義
 */
class PageView extends View {
    /** @internal */
    [_properties];
    /**
     * constructor
     *
     * @param router
     *  - `en` router instance
     *  - `ja` ルーターインスタンス
     * @param options
     *  - `en` [[View]] construction options.
     *  - `ja` [[View]] 構築オプション
     */
    constructor(router, options) {
        super(options);
        this[_properties] = { router };
    }
    ///////////////////////////////////////////////////////////////////////
    // accessor: public properties
    /**
     * @en Check the page is active.
     * @ja ページがアクティブであるか判定
     */
    get active() {
        const { el } = this;
        return el ? hasPartialClassName(el, "page-current" /* CssName.PAGE_CURRENT */) : false;
    }
    /**
     * @en Route data associated with the page.
     * @ja ページに紐づくルートデータ
     */
    get route() {
        return this[_properties].route;
    }
    ///////////////////////////////////////////////////////////////////////
    // event handlers: utilized page event
    /* eslint-disable @typescript-eslint/no-unused-vars */
    /**
     * @overridable
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    onPageInit(thisPage) { }
    /**
     * @overridable
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    onPageMounted(thisPage) { }
    /**
     * @overridable
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    onPageBeforeEnter(thisPage, prevPage, direction, intent) { }
    /**
     * @overridable
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    onPageAfterEnter(thisPage, prevPage, direction, intent) { }
    /**
     * @overridable
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    onPageBeforeLeave(thisPage, nextPage, direction, intent) { }
    /**
     * @overridable
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    onPageAfterLeave(thisPage, nextPage, direction, intent) { }
    /**
     * @overridable
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    onPageUnmounted(thisPage) { }
    /**
     * @overridable
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    onPageRemoved(thisPage) { }
    /* eslint-enable @typescript-eslint/no-unused-vars */
    ///////////////////////////////////////////////////////////////////////
    // implements: Page
    /**
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    pageInit(info) {
        const { to } = info;
        this[_properties].route = to;
        this.onPageInit(to);
    }
    /**
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    pageMounted(info) {
        const { to } = info;
        this[_properties].route = to;
        const { el } = to;
        if (el !== this.el) {
            this.setElement(el);
        }
        this.onPageMounted(to);
    }
    /**
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    pageBeforeEnter(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        this.onPageBeforeEnter(to, from, direction, intent);
    }
    /**
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    pageAfterEnter(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        this.onPageAfterEnter(to, from, direction, intent);
    }
    /**
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    pageBeforeLeave(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = from;
        this.onPageBeforeLeave(from, to, direction, intent);
    }
    /**
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    pageAfterLeave(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = from;
        this.onPageAfterLeave(from, to, direction, intent);
    }
    /**
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    pageUnmounted(info) {
        this.onPageUnmounted(info);
    }
    /**
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    pageRemoved(info) {
        this.release();
        this.onPageRemoved(info);
        this[_properties].route = undefined;
    }
}

export { AppContext, PageView, registerPage };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImludGVybmFsLnRzIiwiY29udGV4dC50cyIsInBhZ2Utdmlldy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxyXG4gICAgbWF4LWxlbixcclxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXHJcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXHJcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcclxuICovXHJcblxyXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xyXG5cclxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcclxuICAgICAgICBBUFAgPSBDRFBfS05PV05fTU9EVUxFLkFQUCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxyXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XHJcbiAgICAgICAgQVBQX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXHJcbiAgICAgICAgRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFQUCArIDEsICdBcHBDb250ZXh0IG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgd2l0aCBvcHRpb25zIGF0IGxlYXN0IG9uY2UuJyksXHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbiIsImltcG9ydCB7IGdldEdsb2JhbE5hbWVzcGFjZSwgZ2V0Q29uZmlnIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcclxuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvaTE4bic7XHJcblxyXG4vKiogQGludGVybmFsICovXHJcbmV4cG9ydCBjb25zdCBlbnVtIENzc05hbWUge1xyXG4gICAgUEFHRV9DVVJSRU5UICA9ICdwYWdlLWN1cnJlbnQnLFxyXG4gICAgUEFHRV9QUkVWSU9VUyA9ICdwYWdlLXByZXZpb3VzJyxcclxufVxyXG5cclxuLyoqIEBpbnRlcm5hbCBwYXJ0aWFsIG1hdGNoIGNsYXNzIG5hbWUgKi9cclxuZXhwb3J0IGNvbnN0IGhhc1BhcnRpYWxDbGFzc05hbWUgPSA8VCBleHRlbmRzIEVsZW1lbnQ+KGVsOiBULCBjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xyXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGVsLmNsYXNzTGlzdCkge1xyXG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKGNsYXNzTmFtZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXHJcblxyXG4vKiogQGludGVybmFsIGZvcmNlIGNsZWFyIGkxOG4gc2V0dGluZ3MgKi9cclxuZXhwb3J0IGNvbnN0IGNsZWFySTE4TlNldHRpbmdzID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgY29uc3QgY29udGV4dDogUGFydGlhbDx0eXBlb2YgaTE4bj4gPSBpMThuO1xyXG4gICAgZGVsZXRlIGNvbnRleHRbJ29wdGlvbnMnXTtcclxuICAgIGRlbGV0ZSBjb250ZXh0WydsYW5ndWFnZSddO1xyXG4gICAgZGVsZXRlIGNvbnRleHRbJ2xhbmd1YWdlcyddO1xyXG4gICAgZGVsZXRlIGNvbnRleHRbJ2lzSW5pdGlhbGl6ZWQnXTtcclxufTtcclxuXHJcbi8qKiBAaW50ZXJuYWwgKi9cclxuZXhwb3J0IGNvbnN0IGdldEFwcENvbmZpZyA9IDxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBUKTogVCA9PiB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihcclxuICAgICAgICB7fSxcclxuICAgICAgICBnZXRDb25maWc8VD4oKSwgICAgICAgICAgICAgICAgICAvLyBDRFAuQ29uZmlnXHJcbiAgICAgICAgZ2V0R2xvYmFsTmFtZXNwYWNlPFQ+KCdDb25maWcnKSwgLy8gZ2xvYmFsIENvbmZpZ1xyXG4gICAgICAgIGJhc2UsXHJcbiAgICApO1xyXG59O1xyXG5cclxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgRE9NQ29udGVudExvYWRlZCAqL1xyXG5leHBvcnQgY29uc3Qgd2FpdERvbUNvbnRlbnRMb2FkZWQgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcclxuICAgICdsb2FkaW5nJyA9PT0gY29udGV4dC5yZWFkeVN0YXRlICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xyXG4gICAgICAgIGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcclxuICAgIH0pO1xyXG59O1xyXG4iLCJpbXBvcnQgeyBTdWJzY3JpYmFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBET01TZWxlY3RvciB9IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgSTE4Tk9wdGlvbnMsXG4gICAgaW5pdGlhbGl6ZUkxOE4sXG4gICAgbG9jYWxpemUsXG59IGZyb20gJ0BjZHAvaTE4bic7XG5pbXBvcnQge1xuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBSb3V0ZUNvbXBvbmVudFNlZWQsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyLFxuICAgIFBhZ2UsXG4gICAgY3JlYXRlUm91dGVyLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIGNsZWFySTE4TlNldHRpbmdzLFxuICAgIGdldEFwcENvbmZpZyxcbiAgICB3YWl0RG9tQ29udGVudExvYWRlZCxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIFRoZSBldmVudCBkZWZpbml0aW9uIGZpcmVkIGluIFtbQXBwQ29udGV4dF1dLlxuICogQGphIFtbQXBwQ29udGV4dF1dIOWGheOBi+OCieeZuuihjOOBleOCjOOCi+OCpOODmeODs+ODiOWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRFdmVudCB7XG4gICAgLyoqXG4gICAgICogQGVuIEFwcGxpY2F0aW9uIHJlYWR5IG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG6YCa55+lXG4gICAgICogQGFyZ3MgW2NvbnRleHRdXG4gICAgICovXG4gICAgJ3JlYWR5JzogW0FwcENvbnRleHRdO1xufVxuXG4vKipcbiAqIEBlbiBbW0FwcENvbnRleHRdXSBjcmVhdGUgb3B0aW9ucy5cbiAqIEBqYSBbW0FwcENvbnRleHRdXSDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0T3B0aW9ucyBleHRlbmRzIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dIGZvciBtYWluIHJvdXRlci5cbiAgICAgKiBAamEg44Oh44Kk44Oz44Or44O844K/44O844GuIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQGRlZmF1bHQgYCNhcHBgXG4gICAgICovXG4gICAgbWFpbj86IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dIGFzc2lnbmVkIHRvIHRoZSBzcGxhc2ggc2NyZWVuLiA8YnI+XG4gICAgICogICAgIEl0IHdpbGwgYmUgcmVtb3ZlZCBqdXN0IGJlZm9yZSBhcHBsaWFjdGlvbiByZWFkeS5cbiAgICAgKiBAamEg44K544OX44Op44OD44K344Ol44K544Kv44Oq44O844Oz44Gr5Ymy44KK5b2T44Gm44KJ44KM44Gm44GE44KLIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXIDxicj5cbiAgICAgKiAgICAg5rqW5YKZ5a6M5LqG55u05YmN44Gr5YmK6Zmk44GV44KM44KLXG4gICAgICovXG4gICAgc3BsYXNoPzogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIExvY2FsaXphdGlvbiBtb2R1bGUgb3B0aW9ucy5cbiAgICAgKiBAamEg44Ot44O844Kr44Op44Kk44K644Oi44K444Ol44O844Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgaTE4bj86IEkxOE5PcHRpb25zO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1c3RvbSBzdGFuZC1ieSBmdW5jdGlvbiBmb3IgYXBwbGljYXRpb24gcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6huOBruOBn+OCgeOBruW+heOBoeWPl+OBkemWouaVsFxuICAgICAqL1xuICAgIHdhaXRGb3JSZWFkeT86ICgpID0+IFByb21pc2U8dm9pZD47XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gU3BlY2lmeSB0cnVlIHRvIGRlc3Ryb3kgdGhlIGluc3RhbmNlIGNhY2hlIGFuZCByZXNldC4gKGZvciBkZWJ1ZylcbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Kt44Oj44OD44K344Ol44KS56C05qOE44GX44Oq44K744OD44OI44GZ44KL5aC05ZCI44GrIHRydWUg44KS5oyH5a6aICjjg4fjg5Djg4PjgrDnlKgpXG4gICAgICovXG4gICAgcmVzZXQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGludGVyZmFjZVxuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHQgZXh0ZW5kcyBTdWJzY3JpYmFibGU8QXBwQ29udGV4dEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIG1haW4gcm91dGVyIGludGVyZmFjZVxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7xcbiAgICAgKi9cbiAgICByZWFkb25seSByb3V0ZXI6IFJvdXRlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgUHJvbWlzZWAgZm9yIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDmupblgpnlrozkuobnorroqo3nlKggYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJlYWR5OiBQcm9taXNlPHZvaWQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1cnJlbnQgYWN0aXZlIHBhZ2UgaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOOCouOCr+ODhuOCo+ODluOBquODmuODvOOCuOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGFjdGl2ZVBhZ2U6IFBhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlci1kZWZpbmFibGUgZXh0ZW5kZWQgcHJvcGVydHkuXG4gICAgICogQGphIOODpuODvOOCtuODvOWumue+qeWPr+iDveOBquaLoeW8teODl+ODreODkeODhuOCo1xuICAgICAqL1xuICAgIGV4dGVuc2lvbjogdW5rbm93bjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmNvbnN0IF9pbml0aWFsUGFnZXM6IFJvdXRlUGFyYW1ldGVyc1tdID0gW107XG5cbi8qKlxuICogQGVuIFJlZ2lzdGVyIGNvbmNyZXRlIFtbUGFnZV1dIGNsYXNzLiBSZWdpc3RlcmVkIHdpdGggdGhlIG1haW4gcm91dGVyIHdoZW4gaW5zdGFudGlhdGluZyBbW0FwcENvbnRleHRdXS4gPGJyPlxuICogICAgIElmIGNvbnN0cnVjdG9yIG5lZWRzIGFyZ3VtZW50cywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2AgaXMgYXZhaWxhYmxlLlxuICogQGphIFBhZ2Ug5YW36LGh5YyW44Kv44Op44K544Gu55m76YyyLiBbW0FwcENvbnRleHRdXSDjga7jgqTjg7Pjgrnjgr/jg7PjgrnljJbmmYLjgavjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjgavnmbvpjLLjgZXjgozjgosuIDxicj5cbiAqICAgICBjb25zdHJ1Y3RvciDjgpLmjIflrprjgZnjgovlvJXmlbDjgYzjgYLjgovloLTlkIjjga8sIGBvcHRpb25zLmNvbXBvbmVudE9wdGlvbnNgIOOCkuWIqeeUqOWPr+iDvVxuICpcbiAqIEBwYXJhbSBwYXRoXG4gKiAgLSBgZW5gIHJvdXRlIHBhdGhcbiAqICAtIGBqYWAg44Or44O844OI44Gu44OR44K5XG4gKiBAcGFyYW0gY29tcG9uZW50XG4gKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGNvbnN0cnVjdG9yIG9yIGJ1aWx0IG9iamVjdCBvZiB0aGUgcGFnZSBjb21wb25lbnRcbiAqICAtIGBqYWAg44Oa44O844K444Kz44Oz44Od44O844ON44Oz44OI44Gu44Kz44Oz44K544OI44Op44Kv44K/44KC44GX44GP44Gv5qeL56+J5riI44G/44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByb3V0ZSBwYXJhbWV0ZXJzXG4gKiAgLSBgamFgIOODq+ODvOODiOODkeODqeODoeODvOOCv1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgcmVnaXN0ZXJQYWdlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBUT0RPOlxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCByZWdpc3RlclBhZ2UgPSAocGF0aDogc3RyaW5nLCBjb21wb25lbnQ6IFJvdXRlQ29tcG9uZW50U2VlZCwgb3B0aW9ucz86IFJvdXRlUGFyYW1ldGVycyk6IHZvaWQgPT4ge1xuICAgIF9pbml0aWFsUGFnZXMucHVzaChPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7IHBhdGgsIGNvbXBvbmVudCB9KSk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEFwcENvbnRleHQgaW1wbCBjbGFzcyAqL1xuY2xhc3MgQXBwbGljYXRpb24gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxBcHBDb250ZXh0RXZlbnQ+IGltcGxlbWVudHMgQXBwQ29udGV4dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfd2luZG93OiBXaW5kb3c7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm91dGVyOiBSb3V0ZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcmVhZHkgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICBwcml2YXRlIF9hY3RpdmVQYWdlPzogUGFnZTtcbiAgICBwcml2YXRlIF9leHRlbnNpb246IHVua25vd247XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCB7IG1haW4sIHdpbmRvdzogd2luIH0gPSBvcHRpb25zO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW4gfHwgd2luZG93O1xuICAgICAgICB0aGlzLl9yb3V0ZXIgPSBjcmVhdGVSb3V0ZXIobWFpbiBhcyBzdHJpbmcsIG9wdGlvbnMpO1xuICAgICAgICB2b2lkIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBBcHBDb250ZXh0XG5cbiAgICBnZXQgcm91dGVyKCk6IFJvdXRlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXI7XG4gICAgfVxuXG4gICAgZ2V0IHJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHk7XG4gICAgfVxuXG4gICAgZ2V0IGFjdGl2ZVBhZ2UoKTogUGFnZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXIuY3VycmVudFJvdXRlWydAcGFyYW1zJ10ucGFnZSB8fCB7fTtcbiAgICB9XG5cbiAgICBnZXQgZXh0ZW5zaW9uKCk6IHVua25vd24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXh0ZW5zaW9uO1xuICAgIH1cblxuICAgIHNldCBleHRlbnNpb24odmFsOiB1bmtub3duKSB7XG4gICAgICAgIHRoaXMuX2V4dGVuc2lvbiA9IHZhbDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogQXBwQ29udGV4dE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBpMThuLCB3YWl0Rm9yUmVhZHkgfSA9IGdldEFwcENvbmZpZyhvcHRpb25zKTtcblxuICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLm9uR2xvYmFsRXJyb3IuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmhhbmRsZWRyZWplY3Rpb24nLCB0aGlzLm9uR2xvYmFsVW5oYW5kbGVkUmVqZWN0aW9uLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIHdhaXREb21Db250ZW50TG9hZGVkKHRoaXMuX3dpbmRvdy5kb2N1bWVudCksXG4gICAgICAgICAgICBpbml0aWFsaXplSTE4TihpMThuKSxcbiAgICAgICAgICAgIHdhaXRGb3JSZWFkeSxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgdGhpcy5fcm91dGVyLm9uKCdsb2FkZWQnLCB0aGlzLm9uUGFnZUxvYWRlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5fcm91dGVyLnJlZ2lzdGVyKF9pbml0aWFsUGFnZXMsIHRydWUpO1xuXG4gICAgICAgIHRoaXMuX3JlYWR5LnJlc29sdmUoKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdyZWFkeScsIHRoaXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgcHJpdmF0ZSBvblBhZ2VMb2FkZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGxvY2FsaXplKGluZm8udG8uZWwpO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25HbG9iYWxFcnJvcihldmVudDogRXJyb3JFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbR2xvYmFsIEVycm9yXSAke2V2ZW50Lm1lc3NhZ2V9LCAke2V2ZW50LmZpbGVuYW1lfSwgJHtldmVudC5jb2xub30sICR7ZXZlbnQuZXJyb3J9YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkdsb2JhbFVuaGFuZGxlZFJlamVjdGlvbihldmVudDogUHJvbWlzZVJlamVjdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtHbG9iYWwgVW5oYW5kbGVkIFJlamVjdGlvbl0gJHtldmVudC5yZWFzb259YCk7XG4gICAgfVxufVxuXG4vKiogY29udGV4dCBjYWNoZSAqL1xubGV0IF9hcHBDb250ZXh0OiBBcHBDb250ZXh0IHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGFjY2Vzc1xuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiOWPluW+l1xuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7NcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcENvbnRleHQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGZpcnN0IGFjY2Vzc1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCh7IG1haW46ICcjYXBwJyB9KTtcbiAqIC8vIFRPRE86XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IEFwcENvbnRleHQgPSAob3B0aW9ucz86IEFwcENvbnRleHRPcHRpb25zKTogQXBwQ29udGV4dCA9PiB7XG4gICAgaWYgKG51bGwgPT0gb3B0aW9ucyAmJiBudWxsID09IF9hcHBDb250ZXh0KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCwgJ0FwcENvbnRleHQgc2hvdWxkIGJlIGluaXRpYWxpemVkIHdpdGggb3B0aW9ucyBhdCBsZWFzdCBvbmNlLicpO1xuICAgIH1cblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbWFpbjogJyNhcHAnLCBzdGFydDogZmFsc2UgfSwgb3B0aW9ucyk7XG5cbiAgICBpZiAob3B0cy5yZXNldCkge1xuICAgICAgICBfYXBwQ29udGV4dCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY2xlYXJJMThOU2V0dGluZ3MoKTtcbiAgICB9XG5cbiAgICBpZiAoIV9hcHBDb250ZXh0KSB7XG4gICAgICAgIF9hcHBDb250ZXh0ID0gbmV3IEFwcGxpY2F0aW9uKG9wdHMpO1xuICAgIH1cbiAgICByZXR1cm4gX2FwcENvbnRleHQ7XG59O1xuIiwiaW1wb3J0IHsgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsIFZpZXcgfSBmcm9tICdAY2RwL3ZpZXcnO1xuaW1wb3J0IHtcbiAgICBSb3V0ZXIsXG4gICAgUm91dGUsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgUGFnZSxcbn0gZnJvbSAnQGNkcC9yb3V0ZXInO1xuaW1wb3J0IHsgQ3NzTmFtZSwgaGFzUGFydGlhbENsYXNzTmFtZSB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwYWdlLXZpZXc6cHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IHJvdXRlcjogUm91dGVyO1xuICAgIHJvdXRlPzogUm91dGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gb2YgW1tWaWV3XV0gdGhhdCBjYW4gYmUgc3BlY2lmaWVkIGluIGFzIFtbUGFnZV1dIG9mIFtbUm91dGVyXV0uXG4gKiBAamEgW1tSb3V0ZXJdXSDjga4gW1tQYWdlXV0g44Gr5oyH5a6a5Y+v6IO944GqIFtbVmlld11dIOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUGFnZVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50ID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBQYWdlIHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3V0ZXJcbiAgICAgKiAgLSBgZW5gIHJvdXRlciBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAg44Or44O844K/44O844Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFtbVmlld11dIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgW1tWaWV3XV0g5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIsIG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0geyByb3V0ZXIgfTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHVibGljIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgcGFnZSBpcyBhY3RpdmUuXG4gICAgICogQGphIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODluOBp+OBguOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBhY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHsgZWwgfSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBlbCA/IGhhc1BhcnRpYWxDbGFzc05hbWUoZWwsIENzc05hbWUuUEFHRV9DVVJSRU5UKSA6IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSb3V0ZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgcGFnZS5cbiAgICAgKiBAamEg44Oa44O844K444Gr57SQ44Gl44GP44Or44O844OI44OH44O844K/XG4gICAgICovXG4gICAgZ2V0IHJvdXRlKCk6IFJvdXRlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOiB1dGlsaXplZCBwYWdlIGV2ZW50XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIG5ld2x5IGNvbnN0cnVjdGVkIGJ5IHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuaWsOimj+OBq+ani+evieOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIG9uUGFnZUluaXQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIG9uUGFnZU1vdW50ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyByZWFkeSB0byBiZSBhY3RpdmF0ZWQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGphIOWIneacn+WMluW+jCwg44Oa44O844K444GM44Ki44Kv44OG44Kj44OZ44O844OI5Y+v6IO944Gq54q25oWL44Gr44Gq44KL44Go55m654GrXG4gICAgICovXG4gICAgb25QYWdlQmVmb3JlRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgZnVsbHkgZGlzcGxheWVkLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzlrozlhajjgavooajnpLrjgZXjgozjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBvblBhZ2VBZnRlckVudGVyKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlIHwgdW5kZWZpbmVkLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCBqdXN0IGJlZm9yZSB0aGUgcGFnZSBnb2VzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr56e76KGM44GZ44KL55u05YmN44Gr55m654GrXG4gICAgICovXG4gICAgb25QYWdlQmVmb3JlTGVhdmUodGhpc1BhZ2U6IFJvdXRlLCBuZXh0UGFnZTogUm91dGUsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgb25QYWdlQWZ0ZXJMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXRhY2hlZCBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBi+OCieWIh+OCiumbouOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIG9uUGFnZVVubW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGVzdHJveWVkIGJ5IHRoZSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabnoLTmo4TjgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBvblBhZ2VSZW1vdmVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUGFnZVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUluaXQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHRoaXMub25QYWdlSW5pdCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZU1vdW50ZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIGNvbnN0IHsgZWwgfSA9IHRvO1xuICAgICAgICBpZiAoZWwgIT09IHRoaXMuZWwgYXMgdW5rbm93bikge1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGVsIGFzIHVua25vd24gYXMgVEVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub25QYWdlTW91bnRlZCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIHJlYWR5IHRvIGJlIGFjdGl2YXRlZCBhZnRlciBpbml0aWFsaXphdGlvbi5cbiAgICAgKiBAamEg5Yid5pyf5YyW5b6MLCDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5njg7zjg4jlj6/og73jgarnirbmhYvjgavjgarjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICB0aGlzLm9uUGFnZUJlZm9yZUVudGVyKHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICB0aGlzLm9uUGFnZUFmdGVyRW50ZXIodG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBwYWdlIGdvZXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavnp7vooYzjgZnjgovnm7TliY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20gYXMgUm91dGU7XG4gICAgICAgIHRoaXMub25QYWdlQmVmb3JlTGVhdmUoZnJvbSBhcyBSb3V0ZSwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20gYXMgUm91dGU7XG4gICAgICAgIHRoaXMub25QYWdlQWZ0ZXJMZWF2ZShmcm9tIGFzIFJvdXRlLCB0bywgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXRhY2hlZCBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBi+OCieWIh+OCiumbouOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VVbm1vdW50ZWQoaW5mbzogUm91dGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5vblBhZ2VVbm1vdW50ZWQoaW5mbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGVzdHJveWVkIGJ5IHRoZSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabnoLTmo4TjgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlUmVtb3ZlZChpbmZvOiBSb3V0ZSk6IHZvaWQge1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpcy5vblBhZ2VSZW1vdmVkKGluZm8pO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBOzs7OztBQUtHO0FBRUgsQ0FBQSxZQUFxQjtBQU1qQjs7O0FBR0c7QUFDSCxJQUFBLElBR0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7QUFIRCxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxhQUFzQyxDQUFBO1FBQ3RDLFdBQTJDLENBQUEsV0FBQSxDQUFBLDBDQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw2QkFBc0IsQ0FBQyxFQUFFLCtEQUErRCxDQUFDLENBQUEsR0FBQSwwQ0FBQSxDQUFBO0FBQ2pMLEtBQUMsR0FBQSxDQUFBO0FBQ0wsQ0FBQyxHQUFBOztBQ3BCRCxpQkFBd0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7O0FDUTlEO0FBQ08sTUFBTSxtQkFBbUIsR0FBRyxDQUFvQixFQUFLLEVBQUUsU0FBaUIsS0FBYTtBQUN4RixJQUFBLEtBQUssTUFBTSxJQUFJLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRTtBQUM3QixRQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUMxQixZQUFBLE9BQU8sSUFBSSxDQUFDO0FBQ2YsU0FBQTtBQUNKLEtBQUE7QUFDRCxJQUFBLE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUMsQ0FBQztBQUVGO0FBRUE7QUFDTyxNQUFNLGlCQUFpQixHQUFHLE1BQVc7SUFDeEMsTUFBTSxPQUFPLEdBQXlCLElBQUksQ0FBQztBQUMzQyxJQUFBLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzFC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
