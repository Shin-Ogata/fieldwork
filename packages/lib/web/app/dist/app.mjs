/*!
 * @cdp/app 0.9.18
 *   application context
 */

import { safe, getConfig, getGlobalNamespace, isFunction } from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import { Deferred } from '@cdp/promise';
import { makeResult, RESULT_CODE } from '@cdp/result';
import { waitFrame } from '@cdp/web-utils';
import { dom } from '@cdp/dom';
import { i18n, changeLanguage, getLanguage, initializeI18N, localize } from '@cdp/i18n';
import { createRouter, toRouterPath } from '@cdp/router';
import { View } from '@cdp/view';

/* eslint-disable
    @stylistic:js/max-len,
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
    delete context.options;
    delete context.language;
    delete context.languages;
    delete context.isInitialized;
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
/** @internal ensure custom document event ready */
const waitDocumentEventReady = async (context, event) => {
    null != event && await new Promise(resolve => {
        context.addEventListener(event, resolve, { once: true });
    });
};

//__________________________________________________________________________________________________//
const _initialRoutes = [];
/**
 * @en Pre-register concrete {@link Page} class. Registered with the main router when instantiating {@link AppContext}. <br>
 *     If constructor needs arguments, `options.componentOptions` is available.
 * @ja Page 具象化クラスの事前登録. {@link AppContext} のインスタンス化時にメインルーターに登録される. <br>
 *     constructor を指定する引数がある場合は, `options.componentOptions` を利用可能
 *
 * @example <br>
 *
 * ```ts
 * import {
 *     Page,
 *     Router,
 *     AppContext,
 *     registerPage,
 * } from '@cdp/runtime';
 *
 * const pageFactory = (router: Router, ...args: any[]): Page => {
 *   :
 * };
 *
 * // pre-registration
 * registerPage({
 *     path: 'page-path',
 *     conponent: pageFactory,
 *     content: '#page-id'
 * });
 *
 * // initial access
 * const app = AppContext({ main: '#app' });
 * :
 * ```
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
 */
const registerPage = (params) => {
    _initialRoutes.push(params);
};
//__________________________________________________________________________________________________//
/** AppContext impl class */
class Application extends EventPublisher {
    _window;
    _router;
    _ready = new Deferred();
    _extension;
    constructor(options) {
        super();
        const { main, window: win, routes: _routes } = options;
        const routerOpts = Object.assign({}, options, { routes: _routes.concat(..._initialRoutes), start: false });
        this._window = win ?? window;
        this._router = createRouter(main, routerOpts);
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
        return this._router.currentRoute['@params']?.page || {};
    }
    get orientation() {
        const $window = dom(this._window);
        return ($window.width() < $window.height()) ? "portrait" /* Orientation.PORTRAIT */ : "landscape" /* Orientation.LANDSCAPE */;
    }
    get extension() {
        return this._extension;
    }
    set extension(val) {
        this._extension = val;
    }
    async changeLanguage(lng, options) {
        const t = await changeLanguage(lng, options);
        await this._router.refresh(2 /* RouterRefreshLevel.DOM_CLEAR */);
        this.publish('languagechange', getLanguage(), t);
        return t;
    }
    isCurrentPath(url) {
        const srcPath = toRouterPath(url);
        const curPath = toRouterPath(this._router.currentRoute['@id']);
        return srcPath === curPath;
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    async initialize(options) {
        const { splash, i18n, waitForReady, documentEventReady, documentEventBackButton, start } = options;
        const { _window } = this;
        _window.addEventListener('error', this.onGlobalError.bind(this));
        _window.addEventListener('unhandledrejection', this.onGlobalUnhandledRejection.bind(this));
        await waitDomContentLoaded(_window.document);
        await Promise.all([
            initializeI18N(i18n),
            isFunction(waitForReady) ? waitForReady(this) : waitForReady,
            waitDocumentEventReady(_window.document, documentEventReady),
        ]);
        _window.document.addEventListener(documentEventBackButton, this.onHandleBackKey.bind(this));
        _window.addEventListener('orientationchange', this.onHandleOrientationChanged.bind(this));
        this._router.on('loaded', this.onPageLoaded.bind(this));
        start && await this._router.refresh();
        // remove splash screen
        dom(splash, _window.document).remove();
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
    onHandleBackKey(event) {
        this.publish('backbutton', event);
    }
    async onHandleOrientationChanged( /*event: Event*/) {
        const { requestAnimationFrame, screen } = this._window; // eslint-disable-line @typescript-eslint/unbound-method
        await waitFrame(1, requestAnimationFrame);
        this.publish('orientationchange', this.orientation, screen.orientation.angle);
    }
}
/** context cache */
let _appContext;
/**
 * @en Application context access
 * @ja アプリケーションコンテキスト取得
 *
 * @example <br>
 *
 * ```ts
 * import { AppContext } from '@cdp/runtime';
 * ```
 *
 * - initial access
 *
 * ```ts
 * const app = AppContext({
 *     main: '#app',
 *     routes: [
 *         { path: '/' },
 *         { path: '/one' },
 *         { path: '/two' }
 *     ],
 * });
 * :
 * ```
 *
 * - from the second time onwards
 *
 * ```ts
 * const app = AppContext();
 * :
 * ```
 *
 * @param options
 *  - `en` init options
 *  - `ja` 初期化オプション
 */
const AppContext = (options) => {
    const opts = getAppConfig(Object.assign({
        main: '#app',
        start: true,
        routes: [],
        documentEventBackButton: 'backbutton',
    }, options));
    if (null == options && null == _appContext) {
        throw makeResult(RESULT_CODE.ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED, 'AppContext should be initialized with options at least once.');
    }
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
 * @en Base class definition of {@link View} that can be specified in as {@link Page} of {@link Router}.
 * @ja {@link Router} の {@link Page} に指定可能な {@link View} の基底クラス定義
 */
class PageView extends View {
    /** @internal */
    [_properties];
    /**
     * constructor
     *
     * @param route
     *  - `en` route context
     *  - `ja` ルートコンテキスト
     * @param options
     *  - `en` {@link View} construction options.
     *  - `ja` {@link View} 構築オプション
     */
    constructor(route, options) {
        super(options);
        this[_properties] = { route };
    }
    ///////////////////////////////////////////////////////////////////////
    // accessor: properties
    /**
     * @en Check the page is active.
     * @ja ページがアクティブであるか判定
     */
    get active() {
        return hasPartialClassName(this.el, "page-current" /* CssName.PAGE_CURRENT */);
    }
    /**
     * @en Route data associated with the page (public).
     * @ja ページに紐づくルートデータ (公開用)
     */
    get ['@route']() {
        return this[_properties].route;
    }
    /**
     * @en {@link Router} instance
     * @ja {@link Router} インスタンス
     */
    get _route() {
        return this['@route'];
    }
    /**
     * @en {@link Router} instance
     * @ja {@link Router} インスタンス
     */
    get _router() {
        return this[_properties].route?.router;
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: View
    /** @override */
    render(...args) { } // eslint-disable-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    ///////////////////////////////////////////////////////////////////////
    // event handlers: utilized page event
    /* eslint-disable @typescript-eslint/no-unused-vars */
    /**
     * @override
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    onPageInit(thisPage) { }
    /**
     * @override
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    onPageMounted(thisPage) { }
    /**
     * @override
     * @en Triggered immediately after the page's HTMLElement is cloned and inserted into the DOM.
     * @ja ページの HTMLElement が複製され DOM に挿入された直後に発火
     */
    onPageCloned(thisPage, prevPage) { }
    /**
     * @override
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    onPageBeforeEnter(thisPage, prevPage, direction, intent) { }
    /**
     * @override
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    onPageAfterEnter(thisPage, prevPage, direction, intent) { }
    /**
     * @override
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    onPageBeforeLeave(thisPage, nextPage, direction, intent) { }
    /**
     * @override
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    onPageAfterLeave(thisPage, nextPage, direction, intent) { }
    /**
     * @override
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    onPageUnmounted(thisPage) { }
    /**
     * @override
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    onPageRemoved(thisPage) { }
    /* eslint-enable @typescript-eslint/no-unused-vars */
    ///////////////////////////////////////////////////////////////////////
    // implements: Page
    /**
     * @internal
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    pageInit(info) {
        const { to } = info;
        this[_properties].route = to;
        const { el } = to;
        if (el !== this.el) {
            this.setElement(el);
        }
        return this.onPageInit(to);
    }
    /**
     * @internal
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    pageMounted(info) {
        const { to } = info;
        this[_properties].route = to;
        return this.onPageMounted(to);
    }
    /**
     * @internal
     * @en Triggered immediately after the page's HTMLElement is cloned and inserted into the DOM.
     * @ja ページの HTMLElement が複製され DOM に挿入された直後に発火
     */
    pageCloned(info) {
        const { to, from } = info;
        this[_properties].route = to;
        return this.onPageCloned(to, from);
    }
    /**
     * @internal
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    pageBeforeEnter(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        return this.onPageBeforeEnter(to, from, direction, intent);
    }
    /**
     * @internal
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    pageAfterEnter(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        return this.onPageAfterEnter(to, from, direction, intent);
    }
    /**
     * @internal
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    pageBeforeLeave(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = from;
        return this.onPageBeforeLeave(from, to, direction, intent);
    }
    /**
     * @internal
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    pageAfterLeave(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = from;
        return this.onPageAfterLeave(from, to, direction, intent);
    }
    /**
     * @internal
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    pageUnmounted(info) {
        this.onPageUnmounted(info);
    }
    /**
     * @internal
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    pageRemoved(info) {
        this.release();
        this[_properties].route = undefined;
        this.onPageRemoved(info);
    }
}

export { AppContext, PageView, registerPage };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImludGVybmFsLnRzIiwiY29udGV4dC50cyIsInBhZ2Utdmlldy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEBzdHlsaXN0aWM6anMvbWF4LWxlbixcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBUFAgPSBDRFBfS05PV05fTU9EVUxFLkFQUCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBUFBfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFQUCArIDEsICdBcHBDb250ZXh0IG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgd2l0aCBvcHRpb25zIGF0IGxlYXN0IG9uY2UuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbiIsImltcG9ydCB7IGdldEdsb2JhbE5hbWVzcGFjZSwgZ2V0Q29uZmlnIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2kxOG4nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDc3NOYW1lIHtcbiAgICBQQUdFX0NVUlJFTlQgID0gJ3BhZ2UtY3VycmVudCcsXG4gICAgUEFHRV9QUkVWSU9VUyA9ICdwYWdlLXByZXZpb3VzJyxcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJ0aWFsIG1hdGNoIGNsYXNzIG5hbWUgKi9cbmV4cG9ydCBjb25zdCBoYXNQYXJ0aWFsQ2xhc3NOYW1lID0gPFQgZXh0ZW5kcyBFbGVtZW50PihlbDogVCwgY2xhc3NOYW1lOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZWwuY2xhc3NMaXN0KSB7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGZvcmNlIGNsZWFyIGkxOG4gc2V0dGluZ3MgKi9cbmV4cG9ydCBjb25zdCBjbGVhckkxOE5TZXR0aW5ncyA9ICgpOiB2b2lkID0+IHtcbiAgICBjb25zdCBjb250ZXh0OiBQYXJ0aWFsPHR5cGVvZiBpMThuPiA9IGkxOG47XG4gICAgZGVsZXRlIGNvbnRleHQub3B0aW9ucztcbiAgICBkZWxldGUgY29udGV4dC5sYW5ndWFnZTtcbiAgICBkZWxldGUgY29udGV4dC5sYW5ndWFnZXM7XG4gICAgZGVsZXRlIGNvbnRleHQuaXNJbml0aWFsaXplZDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBnZXRBcHBDb25maWcgPSA8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCk6IFQgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgICAgICB7fSxcbiAgICAgICAgZ2V0Q29uZmlnPFQ+KCksICAgICAgICAgICAgICAgICAgLy8gQ0RQLkNvbmZpZ1xuICAgICAgICBnZXRHbG9iYWxOYW1lc3BhY2U8VD4oJ0NvbmZpZycpLCAvLyBnbG9iYWwgQ29uZmlnXG4gICAgICAgIGJhc2UsXG4gICAgKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIERPTUNvbnRlbnRMb2FkZWQgKi9cbmV4cG9ydCBjb25zdCB3YWl0RG9tQ29udGVudExvYWRlZCA9IGFzeW5jIChjb250ZXh0OiBEb2N1bWVudCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICdsb2FkaW5nJyA9PT0gY29udGV4dC5yZWFkeVN0YXRlICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCByZXNvbHZlLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfSk7XG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBjdXN0b20gZG9jdW1lbnQgZXZlbnQgcmVhZHkgKi9cbmV4cG9ydCBjb25zdCB3YWl0RG9jdW1lbnRFdmVudFJlYWR5ID0gYXN5bmMgKGNvbnRleHQ6IERvY3VtZW50LCBldmVudDogc3RyaW5nIHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgbnVsbCAhPSBldmVudCAmJiBhd2FpdCBuZXcgUHJvbWlzZTx1bmtub3duPihyZXNvbHZlID0+IHtcbiAgICAgICAgY29udGV4dC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCByZXNvbHZlLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfSk7XG59O1xuIiwiaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpYmFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyB3YWl0RnJhbWUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIEkxOE5PcHRpb25zLFxuICAgIEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cixcbiAgICBpbml0aWFsaXplSTE4TixcbiAgICBsb2NhbGl6ZSxcbiAgICBnZXRMYW5ndWFnZSxcbiAgICBjaGFuZ2VMYW5ndWFnZSxcbiAgICBpMThuLFxufSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgUm91dGUsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFJvdXRlclJlZnJlc2hMZXZlbCxcbiAgICBSb3V0ZXIsXG4gICAgUGFnZSxcbiAgICBjcmVhdGVSb3V0ZXIsXG4gICAgdG9Sb3V0ZXJQYXRoLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIGNsZWFySTE4TlNldHRpbmdzLFxuICAgIGdldEFwcENvbmZpZyxcbiAgICB3YWl0RG9tQ29udGVudExvYWRlZCxcbiAgICB3YWl0RG9jdW1lbnRFdmVudFJlYWR5LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gYG9yaWVudGF0aW9uYCBpZGVudGlmaWVyXG4gKiBAamEgYG9yaWVudGF0aW9uYCDorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT3JpZW50YXRpb24ge1xuICAgIFBPUlRSQUlUICA9ICdwb3J0cmFpdCcsXG4gICAgTEFORFNDQVBFID0gJ2xhbmRzY2FwZScsXG59XG5cbi8qKlxuICogQGVuIFRoZSBldmVudCBkZWZpbml0aW9uIGZpcmVkIGluIHtAbGluayBBcHBDb250ZXh0fS5cbiAqIEBqYSB7QGxpbmsgQXBwQ29udGV4dH0g5YaF44GL44KJ55m66KGM44GV44KM44KL44Kk44OZ44Oz44OI5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dEV2ZW50IHtcbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbGljYXRpb24gcmVhZHkgbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PmupblgpnlrozkuobpgJrnn6VcbiAgICAgKiBAYXJncyBbY29udGV4dF1cbiAgICAgKi9cbiAgICAncmVhZHknOiBbQXBwQ29udGV4dF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSGFyZHdhcmUgYmFjayBidXR0b24gcHJlc3Mgbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjg4/jg7zjg4njgqbjgqfjgqLjg5Djg4Pjgq/jg5zjgr/jg7Pjga7mirzkuIvpgJrnn6VcbiAgICAgKiBAYXJncyBbRXZlbnRdXG4gICAgICovXG4gICAgJ2JhY2tidXR0b24nOiBbRXZlbnRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIERldmljZSBvcmllbnRhdGlvbiBjaGFuZ2Ugbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjg4fjg5DjgqTjgrnjgqrjg6rjgqjjg7Pjg4bjg7zjgrfjg6fjg7PlpInmm7TpgJrnn6VcbiAgICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvV2luZG93L29yaWVudGF0aW9uY2hhbmdlX2V2ZW50XG4gICAgICogQGFyZ3MgW09yaWVudGFpb24sIGFuZ2xlXVxuICAgICAqL1xuICAgICdvcmllbnRhdGlvbmNoYW5nZSc6IFtPcmllbnRhdGlvbiwgbnVtYmVyXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBsaWNhdGlvbiBsYW5ndWdhdGUgY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz6KiA6Kqe5aSJ5pu06YCa55+lXG4gICAgICogQGFyZ3MgW2xhbmd1YWdlLCBpMThuLlRGdW5jdGlvbl1cbiAgICAgKi9cbiAgICAnbGFuZ3VhZ2VjaGFuZ2UnOiBbc3RyaW5nLCBpMThuLlRGdW5jdGlvbl07XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBBcHBDb250ZXh0fSBjcmVhdGUgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgQXBwQ29udGV4dH0g5qeL56+J44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dE9wdGlvbnMgZXh0ZW5kcyBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0gZm9yIG1haW4gcm91dGVyLlxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjga4ge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQGRlZmF1bHQgYCNhcHBgXG4gICAgICovXG4gICAgbWFpbj86IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSBhc3NpZ25lZCB0byB0aGUgc3BsYXNoIHNjcmVlbi4gPGJyPlxuICAgICAqICAgICBJdCB3aWxsIGJlIHJlbW92ZWQganVzdCBiZWZvcmUgYXBwbGlhY3Rpb24gcmVhZHkuXG4gICAgICogQGphIOOCueODl+ODqeODg+OCt+ODpeOCueOCr+ODquODvOODs+OBq+WJsuOCiuW9k+OBpuOCieOCjOOBpuOBhOOCiyB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcgPGJyPlxuICAgICAqICAgICDmupblgpnlrozkuobnm7TliY3jgavliYrpmaTjgZXjgozjgotcbiAgICAgKi9cbiAgICBzcGxhc2g/OiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTG9jYWxpemF0aW9uIG1vZHVsZSBvcHRpb25zLlxuICAgICAqIEBqYSDjg63jg7zjgqvjg6njgqTjgrrjg6Ljgrjjg6Xjg7zjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBpMThuPzogSTE4Tk9wdGlvbnM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIHN0YW5kLWJ5IGZ1bmN0aW9uIGZvciBhcHBsaWNhdGlvbiByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG44Gu44Gf44KB44Gu5b6F44Gh5Y+X44GR6Zai5pWwXG4gICAgICovXG4gICAgd2FpdEZvclJlYWR5PzogUHJvbWlzZTx1bmtub3duPiB8ICgoY29udGV4dDogQXBwQ29udGV4dCkgPT4gUHJvbWlzZTx1bmtub3duPik7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIGBkb2N1bWVudGAgZXZlbnQgZm9yIGFwcGxpY2F0aW9uIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7Pmupblgpnlrozkuobjga7jgZ/jgoHjga7jgqvjgrnjgr/jg6AgYGRvY3VtZW50YCDjgqTjg5njg7Pjg4hcbiAgICAgKi9cbiAgICBkb2N1bWVudEV2ZW50UmVhZHk/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIGBkb2N1bWVudGAgZXZlbnQgZm9yIGhhcmR3YXJlIGJhY2sgYnV0dG9uLiBkZWZhdWx0OiBgYmFja2J1dHRvbmBcbiAgICAgKiBAamEg44OP44O844OJ44Km44Kn44Ki44OQ44OD44Kv44Oc44K/44Oz44Gu44Gf44KB44Gu44Kr44K544K/44OgIGBkb2N1bWVudGAg44Kk44OZ44Oz44OILiDml6LlrprlgKQgYGJhY2tidXR0b25gXG4gICAgICovXG4gICAgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gU3BlY2lmeSB0cnVlIHRvIGRlc3Ryb3kgdGhlIGluc3RhbmNlIGNhY2hlIGFuZCByZXNldC4gKGZvciBkZWJ1ZylcbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Kt44Oj44OD44K344Ol44KS56C05qOE44GX44Oq44K744OD44OI44GZ44KL5aC05ZCI44GrIHRydWUg44KS5oyH5a6aICjjg4fjg5Djg4PjgrDnlKgpXG4gICAgICovXG4gICAgcmVzZXQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGludGVyZmFjZVxuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHQgZXh0ZW5kcyBTdWJzY3JpYmFibGU8QXBwQ29udGV4dEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIG1haW4gcm91dGVyIGludGVyZmFjZVxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7xcbiAgICAgKi9cbiAgICByZWFkb25seSByb3V0ZXI6IFJvdXRlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgUHJvbWlzZWAgZm9yIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDmupblgpnlrozkuobnorroqo3nlKggYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJlYWR5OiBQcm9taXNlPHZvaWQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1cnJlbnQgYWN0aXZlIHBhZ2UgaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOOCouOCr+ODhuOCo+ODluOBquODmuODvOOCuOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGFjdGl2ZVBhZ2U6IFBhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VycmVudCB7QGxpbmsgT3JpZW50YXRpb259IGlkLlxuICAgICAqIEBqYSDnj77lnKjjga4ge0BsaW5rIE9yaWVudGF0aW9ufSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICByZWFkb25seSBvcmllbnRhdGlvbjogT3JpZW50YXRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlci1kZWZpbmFibGUgZXh0ZW5kZWQgcHJvcGVydHkuXG4gICAgICogQGphIOODpuODvOOCtuODvOWumue+qeWPr+iDveOBquaLoeW8teODl+ODreODkeODhuOCo1xuICAgICAqL1xuICAgIGV4dGVuc2lvbjogdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VzIHRoZSBsYW5ndWFnZS5cbiAgICAgKiBAamEg6KiA6Kqe44Gu5YiH44KK5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbG5nXG4gICAgICogIC0gYGVuYCBsb2NhbGUgc3RyaW5nIGV4OiBgZW5gLCBgZW4tVVNgXG4gICAgICogIC0gYGphYCDjg63jgrHjg7zjg6vmloflrZcgZXg6IGBlbmAsIGBlbi1VU2BcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZXJyb3IgYmVoYXZpb3VyXG4gICAgICogIC0gYGphYCDjgqjjg6njg7zmmYLjga7mjK/jgovoiJ7jgYTjgpLmjIflrppcbiAgICAgKi9cbiAgICBjaGFuZ2VMYW5ndWFnZShsbmc6IHN0cmluZywgb3B0aW9ucz86IEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cik6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZXMgaWYgYSBnaXZlbiBVUkwgaXMgdGhlIHJvdXRlcidzIGN1cnJlbnQgcGF0aC5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIFVSTCDjgYzjg6vjg7zjgr/jg7zjga7nj77lnKjjga7jg5HjgrnjgafjgYLjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIFVSTCB5b3Ugd2FudCB0byBpZGVudGlmeVxuICAgICAqICAtIGBqYWAg5Yik5Yil44GX44Gf44GEIFVSTCDjgpLmjIflrppcbiAgICAgKi9cbiAgICBpc0N1cnJlbnRQYXRoKHVybDogc3RyaW5nKTogYm9vbGVhbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmNvbnN0IF9pbml0aWFsUm91dGVzOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuXG4vKipcbiAqIEBlbiBSb3V0ZSBwYXJhbWV0ZXJzIGZvciBwYWdlIHJlZ2lzdHJhdGlvbi4gTmVlZCB0byBkZXNjcmliZSBgcGF0aGAsIGBjb250ZW50YC5cbiAqIEBqYSDjg5rjg7zjgrjnmbvpjLLnlKjjg6vjg7zjg4jjg5Hjg6njg6Hjg7zjgr8uIGBwYXRoYCwgYGNvbnRlbnRgIOOBruiomOi/sOOBjOW/heimgVxuICovXG5leHBvcnQgdHlwZSBQYWdlUm91dGVQYXJhbWV0ZXJzID0gUmVxdWlyZWQ8UGljazxSb3V0ZVBhcmFtZXRlcnMsICdjb250ZW50Jz4+ICYgUm91dGVQYXJhbWV0ZXJzO1xuXG4vKipcbiAqIEBlbiBQcmUtcmVnaXN0ZXIgY29uY3JldGUge0BsaW5rIFBhZ2V9IGNsYXNzLiBSZWdpc3RlcmVkIHdpdGggdGhlIG1haW4gcm91dGVyIHdoZW4gaW5zdGFudGlhdGluZyB7QGxpbmsgQXBwQ29udGV4dH0uIDxicj5cbiAqICAgICBJZiBjb25zdHJ1Y3RvciBuZWVkcyBhcmd1bWVudHMsIGBvcHRpb25zLmNvbXBvbmVudE9wdGlvbnNgIGlzIGF2YWlsYWJsZS5cbiAqIEBqYSBQYWdlIOWFt+ixoeWMluOCr+ODqeOCueOBruS6i+WJjeeZu+mMsi4ge0BsaW5rIEFwcENvbnRleHR9IOOBruOCpOODs+OCueOCv+ODs+OCueWMluaZguOBq+ODoeOCpOODs+ODq+ODvOOCv+ODvOOBq+eZu+mMsuOBleOCjOOCiy4gPGJyPlxuICogICAgIGNvbnN0cnVjdG9yIOOCkuaMh+WumuOBmeOCi+W8leaVsOOBjOOBguOCi+WgtOWQiOOBrywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2Ag44KS5Yip55So5Y+v6IO9XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICAgIFBhZ2UsXG4gKiAgICAgUm91dGVyLFxuICogICAgIEFwcENvbnRleHQsXG4gKiAgICAgcmVnaXN0ZXJQYWdlLFxuICogfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGNvbnN0IHBhZ2VGYWN0b3J5ID0gKHJvdXRlcjogUm91dGVyLCAuLi5hcmdzOiBhbnlbXSk6IFBhZ2UgPT4ge1xuICogICA6XG4gKiB9O1xuICogXG4gKiAvLyBwcmUtcmVnaXN0cmF0aW9uXG4gKiByZWdpc3RlclBhZ2Uoe1xuICogICAgIHBhdGg6ICdwYWdlLXBhdGgnLFxuICogICAgIGNvbnBvbmVudDogcGFnZUZhY3RvcnksXG4gKiAgICAgY29udGVudDogJyNwYWdlLWlkJ1xuICogfSk7XG4gKlxuICogLy8gaW5pdGlhbCBhY2Nlc3NcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoeyBtYWluOiAnI2FwcCcgfSk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcGF0aFxuICogIC0gYGVuYCByb3V0ZSBwYXRoXG4gKiAgLSBgamFgIOODq+ODvOODiOOBruODkeOCuVxuICogQHBhcmFtIGNvbXBvbmVudFxuICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBjb25zdHJ1Y3RvciBvciBidWlsdCBvYmplY3Qgb2YgdGhlIHBhZ2UgY29tcG9uZW50XG4gKiAgLSBgamFgIOODmuODvOOCuOOCs+ODs+ODneODvOODjeODs+ODiOOBruOCs+ODs+OCueODiOODqeOCr+OCv+OCguOBl+OBj+OBr+ani+eviea4iOOBv+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcm91dGUgcGFyYW1ldGVyc1xuICogIC0gYGphYCDjg6vjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAqL1xuZXhwb3J0IGNvbnN0IHJlZ2lzdGVyUGFnZSA9IChwYXJhbXM6IFBhZ2VSb3V0ZVBhcmFtZXRlcnMpOiB2b2lkID0+IHtcbiAgICBfaW5pdGlhbFJvdXRlcy5wdXNoKHBhcmFtcyk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEFwcENvbnRleHQgaW1wbCBjbGFzcyAqL1xuY2xhc3MgQXBwbGljYXRpb24gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxBcHBDb250ZXh0RXZlbnQ+IGltcGxlbWVudHMgQXBwQ29udGV4dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfd2luZG93OiBXaW5kb3c7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm91dGVyOiBSb3V0ZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcmVhZHkgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICBwcml2YXRlIF9leHRlbnNpb246IHVua25vd247XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCB7IG1haW4sIHdpbmRvdzogd2luLCByb3V0ZXM6IF9yb3V0ZXMgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHJvdXRlck9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7IHJvdXRlczogX3JvdXRlcyEuY29uY2F0KC4uLl9pbml0aWFsUm91dGVzKSwgc3RhcnQ6IGZhbHNlIH0pO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW4gPz8gd2luZG93O1xuICAgICAgICB0aGlzLl9yb3V0ZXIgPSBjcmVhdGVSb3V0ZXIobWFpbiBhcyBzdHJpbmcsIHJvdXRlck9wdHMpO1xuICAgICAgICB2b2lkIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBBcHBDb250ZXh0XG5cbiAgICBnZXQgcm91dGVyKCk6IFJvdXRlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXI7XG4gICAgfVxuXG4gICAgZ2V0IHJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHk7XG4gICAgfVxuXG4gICAgZ2V0IGFjdGl2ZVBhZ2UoKTogUGFnZSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fcm91dGVyLmN1cnJlbnRSb3V0ZSBhcyBSb3V0ZSAmIFJlY29yZDxzdHJpbmcsIHsgcGFnZTogUGFnZTsgfT4pWydAcGFyYW1zJ10/LnBhZ2UgfHwge307XG4gICAgfVxuXG4gICAgZ2V0IG9yaWVudGF0aW9uKCk6IE9yaWVudGF0aW9uIHtcbiAgICAgICAgY29uc3QgJHdpbmRvdyA9ICQodGhpcy5fd2luZG93KTtcbiAgICAgICAgcmV0dXJuICgkd2luZG93LndpZHRoKCkgPCAkd2luZG93LmhlaWdodCgpKSA/IE9yaWVudGF0aW9uLlBPUlRSQUlUIDogT3JpZW50YXRpb24uTEFORFNDQVBFO1xuICAgIH1cblxuICAgIGdldCBleHRlbnNpb24oKTogdW5rbm93biB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHRlbnNpb247XG4gICAgfVxuXG4gICAgc2V0IGV4dGVuc2lvbih2YWw6IHVua25vd24pIHtcbiAgICAgICAgdGhpcy5fZXh0ZW5zaW9uID0gdmFsO1xuICAgIH1cblxuICAgIGFzeW5jIGNoYW5nZUxhbmd1YWdlKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4ge1xuICAgICAgICBjb25zdCB0ID0gYXdhaXQgY2hhbmdlTGFuZ3VhZ2UobG5nLCBvcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fcm91dGVyLnJlZnJlc2goUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUik7XG4gICAgICAgIHRoaXMucHVibGlzaCgnbGFuZ3VhZ2VjaGFuZ2UnLCBnZXRMYW5ndWFnZSgpLCB0KTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxuXG4gICAgaXNDdXJyZW50UGF0aCh1cmw6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBzcmNQYXRoID0gdG9Sb3V0ZXJQYXRoKHVybCk7XG4gICAgICAgIGNvbnN0IGN1clBhdGggPSB0b1JvdXRlclBhdGgoKHRoaXMuX3JvdXRlci5jdXJyZW50Um91dGUgYXMgSGlzdG9yeVN0YXRlPFJvdXRlPilbJ0BpZCddKTtcbiAgICAgICAgcmV0dXJuIHNyY1BhdGggPT09IGN1clBhdGg7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFwcENvbnRleHRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgc3BsYXNoLCBpMThuLCB3YWl0Rm9yUmVhZHksIGRvY3VtZW50RXZlbnRSZWFkeSwgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24sIHN0YXJ0IH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCB7IF93aW5kb3cgfSA9IHRoaXM7XG5cbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMub25HbG9iYWxFcnJvci5iaW5kKHRoaXMpKTtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmhhbmRsZWRyZWplY3Rpb24nLCB0aGlzLm9uR2xvYmFsVW5oYW5kbGVkUmVqZWN0aW9uLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGF3YWl0IHdhaXREb21Db250ZW50TG9hZGVkKF93aW5kb3cuZG9jdW1lbnQpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBpbml0aWFsaXplSTE4TihpMThuKSxcbiAgICAgICAgICAgIGlzRnVuY3Rpb24od2FpdEZvclJlYWR5KSA/IHdhaXRGb3JSZWFkeSh0aGlzKSA6IHdhaXRGb3JSZWFkeSxcbiAgICAgICAgICAgIHdhaXREb2N1bWVudEV2ZW50UmVhZHkoX3dpbmRvdy5kb2N1bWVudCwgZG9jdW1lbnRFdmVudFJlYWR5KSxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgX3dpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uISwgdGhpcy5vbkhhbmRsZUJhY2tLZXkuYmluZCh0aGlzKSk7XG4gICAgICAgIF93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9uSGFuZGxlT3JpZW50YXRpb25DaGFuZ2VkLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX3JvdXRlci5vbignbG9hZGVkJywgdGhpcy5vblBhZ2VMb2FkZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHN0YXJ0ICYmIGF3YWl0IHRoaXMuX3JvdXRlci5yZWZyZXNoKCk7XG5cbiAgICAgICAgLy8gcmVtb3ZlIHNwbGFzaCBzY3JlZW5cbiAgICAgICAgJChzcGxhc2gsIF93aW5kb3cuZG9jdW1lbnQpLnJlbW92ZSgpO1xuXG4gICAgICAgIHRoaXMuX3JlYWR5LnJlc29sdmUoKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdyZWFkeScsIHRoaXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgcHJpdmF0ZSBvblBhZ2VMb2FkZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGxvY2FsaXplKGluZm8udG8uZWwpO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25HbG9iYWxFcnJvcihldmVudDogRXJyb3JFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbR2xvYmFsIEVycm9yXSAke2V2ZW50Lm1lc3NhZ2V9LCAke2V2ZW50LmZpbGVuYW1lfSwgJHtldmVudC5jb2xub30sICR7ZXZlbnQuZXJyb3J9YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkdsb2JhbFVuaGFuZGxlZFJlamVjdGlvbihldmVudDogUHJvbWlzZVJlamVjdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtHbG9iYWwgVW5oYW5kbGVkIFJlamVjdGlvbl0gJHtldmVudC5yZWFzb259YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkhhbmRsZUJhY2tLZXkoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaCgnYmFja2J1dHRvbicsIGV2ZW50KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9uSGFuZGxlT3JpZW50YXRpb25DaGFuZ2VkKC8qZXZlbnQ6IEV2ZW50Ki8pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsIHNjcmVlbiB9ID0gdGhpcy5fd2luZG93OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICBhd2FpdCB3YWl0RnJhbWUoMSwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub3JpZW50YXRpb24sIHNjcmVlbi5vcmllbnRhdGlvbi5hbmdsZSk7XG4gICAgfVxufVxuXG4vKiogY29udGV4dCBjYWNoZSAqL1xubGV0IF9hcHBDb250ZXh0OiBBcHBDb250ZXh0IHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGFjY2Vzc1xuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiOWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQXBwQ29udGV4dCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKiBgYGBcbiAqXG4gKiAtIGluaXRpYWwgYWNjZXNzXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoe1xuICogICAgIG1haW46ICcjYXBwJyxcbiAqICAgICByb3V0ZXM6IFtcbiAqICAgICAgICAgeyBwYXRoOiAnLycgfSxcbiAqICAgICAgICAgeyBwYXRoOiAnL29uZScgfSxcbiAqICAgICAgICAgeyBwYXRoOiAnL3R3bycgfVxuICogICAgIF0sXG4gKiB9KTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIC0gZnJvbSB0aGUgc2Vjb25kIHRpbWUgb253YXJkc1xuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KCk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBpbml0IG9wdGlvbnNcbiAqICAtIGBqYWAg5Yid5pyf5YyW44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBBcHBDb250ZXh0ID0gKG9wdGlvbnM/OiBBcHBDb250ZXh0T3B0aW9ucyk6IEFwcENvbnRleHQgPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBnZXRBcHBDb25maWcoT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIG1haW46ICcjYXBwJyxcbiAgICAgICAgc3RhcnQ6IHRydWUsXG4gICAgICAgIHJvdXRlczogW10sXG4gICAgICAgIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uOiAnYmFja2J1dHRvbicsXG4gICAgfSwgb3B0aW9ucykgYXMgQXBwQ29udGV4dE9wdGlvbnMpO1xuXG4gICAgaWYgKG51bGwgPT0gb3B0aW9ucyAmJiBudWxsID09IF9hcHBDb250ZXh0KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCwgJ0FwcENvbnRleHQgc2hvdWxkIGJlIGluaXRpYWxpemVkIHdpdGggb3B0aW9ucyBhdCBsZWFzdCBvbmNlLicpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLnJlc2V0KSB7XG4gICAgICAgIF9hcHBDb250ZXh0ID0gdW5kZWZpbmVkO1xuICAgICAgICBjbGVhckkxOE5TZXR0aW5ncygpO1xuICAgIH1cblxuICAgIGlmICghX2FwcENvbnRleHQpIHtcbiAgICAgICAgX2FwcENvbnRleHQgPSBuZXcgQXBwbGljYXRpb24ob3B0cyk7XG4gICAgfVxuICAgIHJldHVybiBfYXBwQ29udGV4dDtcbn07XG4iLCJpbXBvcnQgeyBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucywgVmlldyB9IGZyb20gJ0BjZHAvdmlldyc7XG5pbXBvcnQge1xuICAgIFJvdXRlcixcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBQYWdlLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyBDc3NOYW1lLCBoYXNQYXJ0aWFsQ2xhc3NOYW1lIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3BhZ2Utdmlldzpwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcm91dGU/OiBSb3V0ZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBvZiB7QGxpbmsgVmlld30gdGhhdCBjYW4gYmUgc3BlY2lmaWVkIGluIGFzIHtAbGluayBQYWdlfSBvZiB7QGxpbmsgUm91dGVyfS5cbiAqIEBqYSB7QGxpbmsgUm91dGVyfSDjga4ge0BsaW5rIFBhZ2V9IOOBq+aMh+WumuWPr+iDveOBqiB7QGxpbmsgVmlld30g44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQYWdlVmlldzxURWxlbWVudCBleHRlbmRzIEVsZW1lbnQgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIFBhZ2Uge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHJvdXRlXG4gICAgICogIC0gYGVuYCByb3V0ZSBjb250ZXh0XG4gICAgICogIC0gYGphYCDjg6vjg7zjg4jjgrPjg7Pjg4bjgq3jgrnjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAge0BsaW5rIFZpZXd9IGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAge0BsaW5rIFZpZXd9IOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJvdXRlPzogUm91dGUsIG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0geyByb3V0ZSB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIHBhZ2UgaXMgYWN0aXZlLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5bjgafjgYLjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgYWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gaGFzUGFydGlhbENsYXNzTmFtZSh0aGlzLmVsLCBDc3NOYW1lLlBBR0VfQ1VSUkVOVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJvdXRlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYWdlIChwdWJsaWMpLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgavntJDjgaXjgY/jg6vjg7zjg4jjg4fjg7zjgr8gKOWFrOmWi+eUqClcbiAgICAgKi9cbiAgICBnZXQgWydAcm91dGUnXSgpOiBSb3V0ZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIFJvdXRlcn0gaW5zdGFuY2VcbiAgICAgKiBAamEge0BsaW5rIFJvdXRlcn0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcm91dGUoKTogUm91dGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1snQHJvdXRlJ107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBSb3V0ZXJ9IGluc3RhbmNlXG4gICAgICogQGphIHtAbGluayBSb3V0ZXJ9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3JvdXRlcigpOiBSb3V0ZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucm91dGU/LnJvdXRlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBWaWV3XG5cbiAgICAvKiogQG92ZXJyaWRlICovXG4gICAgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueSB7IC8qIG92ZXJyaWRhYmxlICovIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOiB1dGlsaXplZCBwYWdlIGV2ZW50XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIG5ld2x5IGNvbnN0cnVjdGVkIGJ5IHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuaWsOimj+OBq+ani+evieOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VJbml0KHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZU1vdW50ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgY2xvbmVkIGFuZCBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzopIfoo73jgZXjgowgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VDbG9uZWQodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyByZWFkeSB0byBiZSBhY3RpdmF0ZWQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGphIOWIneacn+WMluW+jCwg44Oa44O844K444GM44Ki44Kv44OG44Kj44OZ44O844OI5Y+v6IO944Gq54q25oWL44Gr44Gq44KL44Go55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUJlZm9yZUVudGVyKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlIHwgdW5kZWZpbmVkLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyBmdWxseSBkaXNwbGF5ZWQuXG4gICAgICogQGphIOODmuODvOOCuOOBjOWujOWFqOOBq+ihqOekuuOBleOCjOOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VBZnRlckVudGVyKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlIHwgdW5kZWZpbmVkLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIHBhZ2UgZ29lcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+enu+ihjOOBmeOCi+ebtOWJjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VCZWZvcmVMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUFmdGVyTGVhdmUodGhpc1BhZ2U6IFJvdXRlLCBuZXh0UGFnZTogUm91dGUsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRldGFjaGVkIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44GL44KJ5YiH44KK6Zui44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZVVubW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGVzdHJveWVkIGJ5IHRoZSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabnoLTmo4TjgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlUmVtb3ZlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFBhZ2VcblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIG5ld2x5IGNvbnN0cnVjdGVkIGJ5IHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuaWsOimj+OBq+ani+evieOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VJbml0KGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0byB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgY29uc3QgeyBlbCB9ID0gdG87XG4gICAgICAgIGlmIChlbCAhPT0gdGhpcy5lbCBhcyB1bmtub3duKSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoZWwgYXMgdW5rbm93biBhcyBURWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlSW5pdCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZU1vdW50ZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvIH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VNb3VudGVkKHRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgY2xvbmVkIGFuZCBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzopIfoo73jgZXjgowgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VDbG9uZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tIH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VDbG9uZWQodG8sIGZyb20hKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgcmVhZHkgdG8gYmUgYWN0aXZhdGVkIGFmdGVyIGluaXRpYWxpemF0aW9uLlxuICAgICAqIEBqYSDliJ3mnJ/ljJblvowsIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODmeODvOODiOWPr+iDveOBqueKtuaFi+OBq+OBquOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHBhZ2VCZWZvcmVFbnRlcihpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VCZWZvcmVFbnRlcih0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyBmdWxseSBkaXNwbGF5ZWQuXG4gICAgICogQGphIOODmuODvOOCuOOBjOWujOWFqOOBq+ihqOekuuOBleOCjOOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHBhZ2VBZnRlckVudGVyKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUFmdGVyRW50ZXIodG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBwYWdlIGdvZXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavnp7vooYzjgZnjgovnm7TliY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSBmcm9tITtcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQmVmb3JlTGVhdmUoZnJvbSEsIHRvLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSBpcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+OBquOBo+OBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VBZnRlckxlYXZlKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gZnJvbSE7XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUFmdGVyTGVhdmUoZnJvbSEsIHRvLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRldGFjaGVkIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44GL44KJ5YiH44KK6Zui44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZVVubW91bnRlZChpbmZvOiBSb3V0ZSk6IHZvaWQge1xuICAgICAgICB0aGlzLm9uUGFnZVVubW91bnRlZChpbmZvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXN0cm95ZWQgYnkgdGhlIHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuegtOajhOOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VSZW1vdmVkKGluZm86IFJvdXRlKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5vblBhZ2VSZW1vdmVkKGluZm8pO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyIkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7OztBQUlHO0FBRUgsQ0FBQSxZQUFxQjtBQU1qQjs7O0FBR0c7QUFDSCxJQUFBLElBR0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7QUFIRCxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxhQUFzQyxDQUFBO1FBQ3RDLFdBQTJDLENBQUEsV0FBQSxDQUFBLDBDQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw2QkFBc0IsQ0FBQyxFQUFFLCtEQUErRCxDQUFDLENBQUEsR0FBQSwwQ0FBQSxDQUFBO0FBQ2pMLEtBQUMsR0FBQSxDQUFBO0FBQ0wsQ0FBQyxHQUFBOztBQ25CRCxpQkFBd0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7O0FDUTlEO0FBQ08sTUFBTSxtQkFBbUIsR0FBRyxDQUFvQixFQUFLLEVBQUUsU0FBaUIsS0FBYTtBQUN4RixJQUFBLEtBQUssTUFBTSxJQUFJLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRTtBQUM3QixRQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUMxQixZQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7S0FDSjtBQUNELElBQUEsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQyxDQUFDO0FBRUY7QUFFQTtB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