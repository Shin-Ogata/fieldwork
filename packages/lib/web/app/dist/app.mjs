/*!
 * @cdp/app 0.9.15
 *   application context
 */

import { safe, getConfig, getGlobalNamespace, isFunction } from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import { Deferred } from '@cdp/promise';
import { makeResult, RESULT_CODE } from '@cdp/result';
import { waitFrame } from '@cdp/web-utils';
import { dom } from '@cdp/dom';
import { i18n, initializeI18N, localize } from '@cdp/i18n';
import { createRouter } from '@cdp/router';
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
/** @internal ensure custom document event ready*/
const waitDocumentEventReady = async (context, event) => {
    null != event && await new Promise(resolve => {
        context.addEventListener(event, resolve, { once: true });
    });
};

//__________________________________________________________________________________________________//
const _initialPages = [];
/**
 * @en Pre-register concrete [[Page]] class. Registered with the main router when instantiating [[AppContext]]. <br>
 *     If constructor needs arguments, `options.componentOptions` is available.
 * @ja Page 具象化クラスの事前登録. [[AppContext]] のインスタンス化時にメインルーターに登録される. <br>
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
    _initialPages.push(params);
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
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    async initialize(options) {
        const { splash, i18n, waitForReady, documentEventReady, documentEventBackButton } = options;
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
        this._router.register(_initialPages, true);
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
        start: false,
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
 * @en Base class definition of [[View]] that can be specified in as [[Page]] of [[Router]].
 * @ja [[Router]] の [[Page]] に指定可能な [[View]] の基底クラス定義
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
     *  - `en` [[View]] construction options.
     *  - `ja` [[View]] 構築オプション
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
     * @en [[Router]] instance
     * @ja [[Router]] インスタンス
     */
    get _route() {
        return this['@route'];
    }
    /**
     * @en [[Router]] instance
     * @ja [[Router]] インスタンス
     */
    get _router() {
        return this[_properties].route?.router;
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
     * @internal
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    pageInit(info) {
        const { to } = info;
        this[_properties].route = to;
        this.onPageInit(to);
    }
    /**
     * @internal
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
     * @internal
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    pageBeforeEnter(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        this.onPageBeforeEnter(to, from, direction, intent);
    }
    /**
     * @internal
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    pageAfterEnter(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        this.onPageAfterEnter(to, from, direction, intent);
    }
    /**
     * @internal
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    pageBeforeLeave(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = from;
        this.onPageBeforeLeave(from, to, direction, intent);
    }
    /**
     * @internal
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    pageAfterLeave(info) {
        const { to, from, direction, intent } = info;
        this[_properties].route = from;
        this.onPageAfterLeave(from, to, direction, intent);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImludGVybmFsLnRzIiwiY29udGV4dC50cyIsInBhZ2Utdmlldy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG1heC1sZW4sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQVBQID0gQ0RQX0tOT1dOX01PRFVMRS5BUFAgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgQVBQX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0FQUF9DT05URVhUX05FRURfVE9fQkVfSU5JVElBTElaRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BUFAgKyAxLCAnQXBwQ29udGV4dCBuZWVkIHRvIGJlIGluaXRpYWxpemVkIHdpdGggb3B0aW9ucyBhdCBsZWFzdCBvbmNlLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4iLCJpbXBvcnQgeyBnZXRHbG9iYWxOYW1lc3BhY2UsIGdldENvbmZpZyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9pMThuJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgUEFHRV9DVVJSRU5UICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgPSAncGFnZS1wcmV2aW91cycsXG59XG5cbi8qKiBAaW50ZXJuYWwgcGFydGlhbCBtYXRjaCBjbGFzcyBuYW1lICovXG5leHBvcnQgY29uc3QgaGFzUGFydGlhbENsYXNzTmFtZSA9IDxUIGV4dGVuZHMgRWxlbWVudD4oZWw6IFQsIGNsYXNzTmFtZTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGVsLmNsYXNzTGlzdCkge1xuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcyhjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBmb3JjZSBjbGVhciBpMThuIHNldHRpbmdzICovXG5leHBvcnQgY29uc3QgY2xlYXJJMThOU2V0dGluZ3MgPSAoKTogdm9pZCA9PiB7XG4gICAgY29uc3QgY29udGV4dDogUGFydGlhbDx0eXBlb2YgaTE4bj4gPSBpMThuO1xuICAgIGRlbGV0ZSBjb250ZXh0WydvcHRpb25zJ107XG4gICAgZGVsZXRlIGNvbnRleHRbJ2xhbmd1YWdlJ107XG4gICAgZGVsZXRlIGNvbnRleHRbJ2xhbmd1YWdlcyddO1xuICAgIGRlbGV0ZSBjb250ZXh0Wydpc0luaXRpYWxpemVkJ107XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZ2V0QXBwQ29uZmlnID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQpOiBUID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihcbiAgICAgICAge30sXG4gICAgICAgIGdldENvbmZpZzxUPigpLCAgICAgICAgICAgICAgICAgIC8vIENEUC5Db25maWdcbiAgICAgICAgZ2V0R2xvYmFsTmFtZXNwYWNlPFQ+KCdDb25maWcnKSwgLy8gZ2xvYmFsIENvbmZpZ1xuICAgICAgICBiYXNlLFxuICAgICk7XG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBET01Db250ZW50TG9hZGVkICovXG5leHBvcnQgY29uc3Qgd2FpdERvbUNvbnRlbnRMb2FkZWQgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAnbG9hZGluZycgPT09IGNvbnRleHQucmVhZHlTdGF0ZSAmJiBhd2FpdCBuZXcgUHJvbWlzZTx1bmtub3duPihyZXNvbHZlID0+IHtcbiAgICAgICAgY29udGV4dC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgcmVzb2x2ZSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIH0pO1xufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgY3VzdG9tIGRvY3VtZW50IGV2ZW50IHJlYWR5Ki9cbmV4cG9ydCBjb25zdCB3YWl0RG9jdW1lbnRFdmVudFJlYWR5ID0gYXN5bmMgKGNvbnRleHQ6IERvY3VtZW50LCBldmVudDogc3RyaW5nIHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgbnVsbCAhPSBldmVudCAmJiBhd2FpdCBuZXcgUHJvbWlzZTx1bmtub3duPihyZXNvbHZlID0+IHtcbiAgICAgICAgY29udGV4dC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCByZXNvbHZlLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfSk7XG59O1xuIiwiaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpYmFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyB3YWl0RnJhbWUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIEkxOE5PcHRpb25zLFxuICAgIGluaXRpYWxpemVJMThOLFxuICAgIGxvY2FsaXplLFxufSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyLFxuICAgIFBhZ2UsXG4gICAgY3JlYXRlUm91dGVyLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIGNsZWFySTE4TlNldHRpbmdzLFxuICAgIGdldEFwcENvbmZpZyxcbiAgICB3YWl0RG9tQ29udGVudExvYWRlZCxcbiAgICB3YWl0RG9jdW1lbnRFdmVudFJlYWR5LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gYG9yaWVudGF0aW9uYCBpZGVudGlmaWVyXG4gKiBAamEgYG9yaWVudGF0aW9uYCDorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT3JpZW50YXRpb24ge1xuICAgIFBPUlRSQUlUICA9ICdwb3J0cmFpdCcsXG4gICAgTEFORFNDQVBFID0gJ2xhbmRzY2FwZScsXG59XG5cbi8qKlxuICogQGVuIFRoZSBldmVudCBkZWZpbml0aW9uIGZpcmVkIGluIFtbQXBwQ29udGV4dF1dLlxuICogQGphIFtbQXBwQ29udGV4dF1dIOWGheOBi+OCieeZuuihjOOBleOCjOOCi+OCpOODmeODs+ODiOWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRFdmVudCB7XG4gICAgLyoqXG4gICAgICogQGVuIEFwcGxpY2F0aW9uIHJlYWR5IG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG6YCa55+lXG4gICAgICogQGFyZ3MgW2NvbnRleHRdXG4gICAgICovXG4gICAgJ3JlYWR5JzogW0FwcENvbnRleHRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEhhcmR3YXJlIGJhY2sgYnV0dG9uIHByZXNzIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44OP44O844OJ44Km44Kn44Ki44OQ44OD44Kv44Oc44K/44Oz44Gu5oq85LiL6YCa55+lXG4gICAgICogQGFyZ3MgW0V2ZW50XVxuICAgICAqL1xuICAgICdiYWNrYnV0dG9uJzogW0V2ZW50XTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXZpY2Ugb3JpZW50YXRpb24gY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44OH44OQ44Kk44K544Kq44Oq44Ko44Oz44OG44O844K344On44Oz5aSJ5pu06YCa55+lXG4gICAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9XZWIvQVBJL1dpbmRvdy9vcmllbnRhdGlvbmNoYW5nZV9ldmVudFxuICAgICAqIEBhcmdzIFtPcmllbnRhaW9uLCBhbmdsZV1cbiAgICAgKi9cbiAgICAnb3JpZW50YXRpb25jaGFuZ2UnOiBbT3JpZW50YXRpb24sIG51bWJlcl07XG59XG5cbi8qKlxuICogQGVuIFtbQXBwQ29udGV4dF1dIGNyZWF0ZSBvcHRpb25zLlxuICogQGphIFtbQXBwQ29udGV4dF1dIOani+evieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRPcHRpb25zIGV4dGVuZHMgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0gZm9yIG1haW4gcm91dGVyLlxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjga4gW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAZGVmYXVsdCBgI2FwcGBcbiAgICAgKi9cbiAgICBtYWluPzogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0gYXNzaWduZWQgdG8gdGhlIHNwbGFzaCBzY3JlZW4uIDxicj5cbiAgICAgKiAgICAgSXQgd2lsbCBiZSByZW1vdmVkIGp1c3QgYmVmb3JlIGFwcGxpYWN0aW9uIHJlYWR5LlxuICAgICAqIEBqYSDjgrnjg5fjg6njg4Pjgrfjg6Xjgrnjgq/jg6rjg7zjg7PjgavlibLjgorlvZPjgabjgonjgozjgabjgYTjgosgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcgPGJyPlxuICAgICAqICAgICDmupblgpnlrozkuobnm7TliY3jgavliYrpmaTjgZXjgozjgotcbiAgICAgKi9cbiAgICBzcGxhc2g/OiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTG9jYWxpemF0aW9uIG1vZHVsZSBvcHRpb25zLlxuICAgICAqIEBqYSDjg63jg7zjgqvjg6njgqTjgrrjg6Ljgrjjg6Xjg7zjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBpMThuPzogSTE4Tk9wdGlvbnM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIHN0YW5kLWJ5IGZ1bmN0aW9uIGZvciBhcHBsaWNhdGlvbiByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG44Gu44Gf44KB44Gu5b6F44Gh5Y+X44GR6Zai5pWwXG4gICAgICovXG4gICAgd2FpdEZvclJlYWR5PzogUHJvbWlzZTx1bmtub3duPiB8ICgoY29udGV4dDogQXBwQ29udGV4dCkgPT4gUHJvbWlzZTx1bmtub3duPik7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIGBkb2N1bWVudGAgZXZlbnQgZm9yIGFwcGxpY2F0aW9uIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7Pmupblgpnlrozkuobjga7jgZ/jgoHjga7jgqvjgrnjgr/jg6AgYGRvY3VtZW50YCDjgqTjg5njg7Pjg4hcbiAgICAgKi9cbiAgICBkb2N1bWVudEV2ZW50UmVhZHk/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIGBkb2N1bWVudGAgZXZlbnQgZm9yIGhhcmR3YXJlIGJhY2sgYnV0dG9uLiBkZWZhdWx0OiBgYmFja2J1dHRvbmBcbiAgICAgKiBAamEg44OP44O844OJ44Km44Kn44Ki44OQ44OD44Kv44Oc44K/44Oz44Gu44Gf44KB44Gu44Kr44K544K/44OgIGBkb2N1bWVudGAg44Kk44OZ44Oz44OILiDml6LlrprlgKQgYGJhY2tidXR0b25gXG4gICAgICovXG4gICAgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gU3BlY2lmeSB0cnVlIHRvIGRlc3Ryb3kgdGhlIGluc3RhbmNlIGNhY2hlIGFuZCByZXNldC4gKGZvciBkZWJ1ZylcbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Kt44Oj44OD44K344Ol44KS56C05qOE44GX44Oq44K744OD44OI44GZ44KL5aC05ZCI44GrIHRydWUg44KS5oyH5a6aICjjg4fjg5Djg4PjgrDnlKgpXG4gICAgICovXG4gICAgcmVzZXQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGludGVyZmFjZVxuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHQgZXh0ZW5kcyBTdWJzY3JpYmFibGU8QXBwQ29udGV4dEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIG1haW4gcm91dGVyIGludGVyZmFjZVxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7xcbiAgICAgKi9cbiAgICByZWFkb25seSByb3V0ZXI6IFJvdXRlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgUHJvbWlzZWAgZm9yIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDmupblgpnlrozkuobnorroqo3nlKggYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJlYWR5OiBQcm9taXNlPHZvaWQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1cnJlbnQgYWN0aXZlIHBhZ2UgaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOOCouOCr+ODhuOCo+ODluOBquODmuODvOOCuOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGFjdGl2ZVBhZ2U6IFBhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VycmVudCBbW09yaWVudGF0aW9uXV0gaWQuXG4gICAgICogQGphIOePvuWcqOOBriBbW09yaWVudGF0aW9uXV0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcmVhZG9ubHkgb3JpZW50YXRpb246IE9yaWVudGF0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVzZXItZGVmaW5hYmxlIGV4dGVuZGVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDjg6bjg7zjgrbjg7zlrprnvqnlj6/og73jgarmi6HlvLXjg5fjg63jg5Hjg4bjgqNcbiAgICAgKi9cbiAgICBleHRlbnNpb246IHVua25vd247XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBfaW5pdGlhbFBhZ2VzOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuXG4vKipcbiAqIEBlbiBSb3V0ZSBwYXJhbWV0ZXJzIGZvciBwYWdlIHJlZ2lzdHJhdGlvbi4gTmVlZCB0byBkZXNjcmliZSBgcGF0aGAsIGBjb21wb25lbnRgLCBgY29udGVudGAuXG4gKiBAamEg44Oa44O844K455m76Yyy55So44Or44O844OI44OR44Op44Oh44O844K/LiBgcGF0aGAsIGBjb21wb25lbnRgLCBgY29udGVudGAg44Gu6KiY6L+w44GM5b+F6KaBXG4gKi9cbmV4cG9ydCB0eXBlIFBhZ2VSb3V0ZVBhcmFtZXRlcnMgPSBSZXF1aXJlZDxQaWNrPFJvdXRlUGFyYW1ldGVycywgJ2NvbXBvbmVudCcgfCAnY29udGVudCc+PiAmIFJvdXRlUGFyYW1ldGVycztcblxuLyoqXG4gKiBAZW4gUHJlLXJlZ2lzdGVyIGNvbmNyZXRlIFtbUGFnZV1dIGNsYXNzLiBSZWdpc3RlcmVkIHdpdGggdGhlIG1haW4gcm91dGVyIHdoZW4gaW5zdGFudGlhdGluZyBbW0FwcENvbnRleHRdXS4gPGJyPlxuICogICAgIElmIGNvbnN0cnVjdG9yIG5lZWRzIGFyZ3VtZW50cywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2AgaXMgYXZhaWxhYmxlLlxuICogQGphIFBhZ2Ug5YW36LGh5YyW44Kv44Op44K544Gu5LqL5YmN55m76YyyLiBbW0FwcENvbnRleHRdXSDjga7jgqTjg7Pjgrnjgr/jg7PjgrnljJbmmYLjgavjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjgavnmbvpjLLjgZXjgozjgosuIDxicj5cbiAqICAgICBjb25zdHJ1Y3RvciDjgpLmjIflrprjgZnjgovlvJXmlbDjgYzjgYLjgovloLTlkIjjga8sIGBvcHRpb25zLmNvbXBvbmVudE9wdGlvbnNgIOOCkuWIqeeUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgICBQYWdlLFxuICogICAgIFJvdXRlcixcbiAqICAgICBBcHBDb250ZXh0LFxuICogICAgIHJlZ2lzdGVyUGFnZSxcbiAqIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBjb25zdCBwYWdlRmFjdG9yeSA9IChyb3V0ZXI6IFJvdXRlciwgLi4uYXJnczogYW55W10pOiBQYWdlID0+IHtcbiAqICAgOlxuICogfTtcbiAqIFxuICogLy8gcHJlLXJlZ2lzdHJhdGlvblxuICogcmVnaXN0ZXJQYWdlKHtcbiAqICAgICBwYXRoOiAncGFnZS1wYXRoJyxcbiAqICAgICBjb25wb25lbnQ6IHBhZ2VGYWN0b3J5LFxuICogICAgIGNvbnRlbnQ6ICcjcGFnZS1pZCdcbiAqIH0pO1xuICpcbiAqIC8vIGluaXRpYWwgYWNjZXNzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KHsgbWFpbjogJyNhcHAnIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgcm91dGUgcGF0aFxuICogIC0gYGphYCDjg6vjg7zjg4jjga7jg5HjgrlcbiAqIEBwYXJhbSBjb21wb25lbnRcbiAqICAtIGBlbmAgc3BlY2lmeSB0aGUgY29uc3RydWN0b3Igb3IgYnVpbHQgb2JqZWN0IG9mIHRoZSBwYWdlIGNvbXBvbmVudFxuICogIC0gYGphYCDjg5rjg7zjgrjjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgoLjgZfjgY/jga/mp4vnr4nmuIjjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJvdXRlIHBhcmFtZXRlcnNcbiAqICAtIGBqYWAg44Or44O844OI44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCBjb25zdCByZWdpc3RlclBhZ2UgPSAocGFyYW1zOiBQYWdlUm91dGVQYXJhbWV0ZXJzKTogdm9pZCA9PiB7XG4gICAgX2luaXRpYWxQYWdlcy5wdXNoKHBhcmFtcyk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEFwcENvbnRleHQgaW1wbCBjbGFzcyAqL1xuY2xhc3MgQXBwbGljYXRpb24gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxBcHBDb250ZXh0RXZlbnQ+IGltcGxlbWVudHMgQXBwQ29udGV4dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfd2luZG93OiBXaW5kb3c7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm91dGVyOiBSb3V0ZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcmVhZHkgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICBwcml2YXRlIF9leHRlbnNpb246IHVua25vd247XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCB7IG1haW4sIHdpbmRvdzogd2luIH0gPSBvcHRpb25zO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW4gfHwgd2luZG93O1xuICAgICAgICB0aGlzLl9yb3V0ZXIgPSBjcmVhdGVSb3V0ZXIobWFpbiBhcyBzdHJpbmcsIG9wdGlvbnMpO1xuICAgICAgICB2b2lkIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBBcHBDb250ZXh0XG5cbiAgICBnZXQgcm91dGVyKCk6IFJvdXRlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXI7XG4gICAgfVxuXG4gICAgZ2V0IHJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHk7XG4gICAgfVxuXG4gICAgZ2V0IGFjdGl2ZVBhZ2UoKTogUGFnZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXIuY3VycmVudFJvdXRlWydAcGFyYW1zJ10/LnBhZ2UgfHwge307XG4gICAgfVxuXG4gICAgZ2V0IG9yaWVudGF0aW9uKCk6IE9yaWVudGF0aW9uIHtcbiAgICAgICAgY29uc3QgJHdpbmRvdyA9ICQodGhpcy5fd2luZG93KTtcbiAgICAgICAgcmV0dXJuICgkd2luZG93LndpZHRoKCkgPCAkd2luZG93LmhlaWdodCgpKSA/IE9yaWVudGF0aW9uLlBPUlRSQUlUIDogT3JpZW50YXRpb24uTEFORFNDQVBFO1xuICAgIH1cblxuICAgIGdldCBleHRlbnNpb24oKTogdW5rbm93biB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHRlbnNpb247XG4gICAgfVxuXG4gICAgc2V0IGV4dGVuc2lvbih2YWw6IHVua25vd24pIHtcbiAgICAgICAgdGhpcy5fZXh0ZW5zaW9uID0gdmFsO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIHByaXZhdGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHNwbGFzaCwgaTE4biwgd2FpdEZvclJlYWR5LCBkb2N1bWVudEV2ZW50UmVhZHksIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uIH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCB7IF93aW5kb3cgfSA9IHRoaXM7XG5cbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMub25HbG9iYWxFcnJvci5iaW5kKHRoaXMpKTtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmhhbmRsZWRyZWplY3Rpb24nLCB0aGlzLm9uR2xvYmFsVW5oYW5kbGVkUmVqZWN0aW9uLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGF3YWl0IHdhaXREb21Db250ZW50TG9hZGVkKF93aW5kb3cuZG9jdW1lbnQpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBpbml0aWFsaXplSTE4TihpMThuKSxcbiAgICAgICAgICAgIGlzRnVuY3Rpb24od2FpdEZvclJlYWR5KSA/IHdhaXRGb3JSZWFkeSh0aGlzKSA6IHdhaXRGb3JSZWFkeSxcbiAgICAgICAgICAgIHdhaXREb2N1bWVudEV2ZW50UmVhZHkoX3dpbmRvdy5kb2N1bWVudCwgZG9jdW1lbnRFdmVudFJlYWR5KSxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgX3dpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uIGFzIHN0cmluZywgdGhpcy5vbkhhbmRsZUJhY2tLZXkuYmluZCh0aGlzKSk7XG4gICAgICAgIF93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9uSGFuZGxlT3JpZW50YXRpb25DaGFuZ2VkLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX3JvdXRlci5vbignbG9hZGVkJywgdGhpcy5vblBhZ2VMb2FkZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuX3JvdXRlci5yZWdpc3RlcihfaW5pdGlhbFBhZ2VzLCB0cnVlKTtcblxuICAgICAgICAvLyByZW1vdmUgc3BsYXNoIHNjcmVlblxuICAgICAgICAkKHNwbGFzaCwgX3dpbmRvdy5kb2N1bWVudCkucmVtb3ZlKCk7XG5cbiAgICAgICAgdGhpcy5fcmVhZHkucmVzb2x2ZSgpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ3JlYWR5JywgdGhpcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICBwcml2YXRlIG9uUGFnZUxvYWRlZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgbG9jYWxpemUoaW5mby50by5lbCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkdsb2JhbEVycm9yKGV2ZW50OiBFcnJvckV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtHbG9iYWwgRXJyb3JdICR7ZXZlbnQubWVzc2FnZX0sICR7ZXZlbnQuZmlsZW5hbWV9LCAke2V2ZW50LmNvbG5vfSwgJHtldmVudC5lcnJvcn1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uR2xvYmFsVW5oYW5kbGVkUmVqZWN0aW9uKGV2ZW50OiBQcm9taXNlUmVqZWN0aW9uRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0dsb2JhbCBVbmhhbmRsZWQgUmVqZWN0aW9uXSAke2V2ZW50LnJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uSGFuZGxlQmFja0tleShldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdiYWNrYnV0dG9uJywgZXZlbnQpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgb25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQoLypldmVudDogRXZlbnQqLyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHJlcXVlc3RBbmltYXRpb25GcmFtZSwgc2NyZWVuIH0gPSB0aGlzLl93aW5kb3c7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgIGF3YWl0IHdhaXRGcmFtZSgxLCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbiwgc2NyZWVuLm9yaWVudGF0aW9uLmFuZ2xlKTtcbiAgICB9XG59XG5cbi8qKiBjb250ZXh0IGNhY2hlICovXG5sZXQgX2FwcENvbnRleHQ6IEFwcENvbnRleHQgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIEFwcGxpY2F0aW9uIGNvbnRleHQgYWNjZXNzXG4gKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz44Kz44Oz44OG44Kt44K544OI5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBBcHBDb250ZXh0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGBgYFxuICpcbiAqIC0gaW5pdGlhbCBhY2Nlc3NcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCh7XG4gKiAgICAgbWFpbjogJyNhcHAnLFxuICogICAgIHJvdXRlczogW1xuICogICAgICAgICB7IHBhdGg6ICcvJyB9LFxuICogICAgICAgICB7IHBhdGg6ICcvb25lJyB9LFxuICogICAgICAgICB7IHBhdGg6ICcvdHdvJyB9XG4gKiAgICAgXSxcbiAqIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogLSBmcm9tIHRoZSBzZWNvbmQgdGltZSBvbndhcmRzXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoKTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IEFwcENvbnRleHQgPSAob3B0aW9ucz86IEFwcENvbnRleHRPcHRpb25zKTogQXBwQ29udGV4dCA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IGdldEFwcENvbmZpZyhPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWFpbjogJyNhcHAnLFxuICAgICAgICBzdGFydDogZmFsc2UsXG4gICAgICAgIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uOiAnYmFja2J1dHRvbicsXG4gICAgfSwgb3B0aW9ucykgYXMgQXBwQ29udGV4dE9wdGlvbnMpO1xuXG4gICAgaWYgKG51bGwgPT0gb3B0aW9ucyAmJiBudWxsID09IF9hcHBDb250ZXh0KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCwgJ0FwcENvbnRleHQgc2hvdWxkIGJlIGluaXRpYWxpemVkIHdpdGggb3B0aW9ucyBhdCBsZWFzdCBvbmNlLicpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLnJlc2V0KSB7XG4gICAgICAgIF9hcHBDb250ZXh0ID0gdW5kZWZpbmVkO1xuICAgICAgICBjbGVhckkxOE5TZXR0aW5ncygpO1xuICAgIH1cblxuICAgIGlmICghX2FwcENvbnRleHQpIHtcbiAgICAgICAgX2FwcENvbnRleHQgPSBuZXcgQXBwbGljYXRpb24ob3B0cyk7XG4gICAgfVxuICAgIHJldHVybiBfYXBwQ29udGV4dDtcbn07XG4iLCJpbXBvcnQgeyBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucywgVmlldyB9IGZyb20gJ0BjZHAvdmlldyc7XG5pbXBvcnQge1xuICAgIFJvdXRlcixcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBQYWdlLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyBDc3NOYW1lLCBoYXNQYXJ0aWFsQ2xhc3NOYW1lIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3BhZ2Utdmlldzpwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcm91dGU/OiBSb3V0ZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBvZiBbW1ZpZXddXSB0aGF0IGNhbiBiZSBzcGVjaWZpZWQgaW4gYXMgW1tQYWdlXV0gb2YgW1tSb3V0ZXJdXS5cbiAqIEBqYSBbW1JvdXRlcl1dIOOBriBbW1BhZ2VdXSDjgavmjIflrprlj6/og73jgaogW1tWaWV3XV0g44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQYWdlVmlldzxURWxlbWVudCBleHRlbmRzIEVsZW1lbnQgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIFBhZ2Uge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHJvdXRlXG4gICAgICogIC0gYGVuYCByb3V0ZSBjb250ZXh0XG4gICAgICogIC0gYGphYCDjg6vjg7zjg4jjgrPjg7Pjg4bjgq3jgrnjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgW1tWaWV3XV0gY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBbW1ZpZXddXSDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihyb3V0ZT86IFJvdXRlLCBvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXSA9IHsgcm91dGUgfTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBwYWdlIGlzIGFjdGl2ZS5cbiAgICAgKiBAamEg44Oa44O844K444GM44Ki44Kv44OG44Kj44OW44Gn44GC44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGFjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGhhc1BhcnRpYWxDbGFzc05hbWUodGhpcy5lbCwgQ3NzTmFtZS5QQUdFX0NVUlJFTlQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSb3V0ZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgcGFnZSAocHVibGljKS5cbiAgICAgKiBAamEg44Oa44O844K444Gr57SQ44Gl44GP44Or44O844OI44OH44O844K/ICjlhazplovnlKgpXG4gICAgICovXG4gICAgZ2V0IFsnQHJvdXRlJ10oKTogUm91dGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucm91dGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbUm91dGVyXV0gaW5zdGFuY2VcbiAgICAgKiBAamEgW1tSb3V0ZXJdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9yb3V0ZSgpOiBSb3V0ZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzWydAcm91dGUnXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tSb3V0ZXJdXSBpbnN0YW5jZVxuICAgICAqIEBqYSBbW1JvdXRlcl1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3JvdXRlcigpOiBSb3V0ZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucm91dGU/LnJvdXRlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczogdXRpbGl6ZWQgcGFnZSBldmVudFxuXG4gICAgLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBuZXdseSBjb25zdHJ1Y3RlZCBieSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabmlrDopo/jgavmp4vnr4njgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlSW5pdCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZU1vdW50ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyByZWFkeSB0byBiZSBhY3RpdmF0ZWQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGphIOWIneacn+WMluW+jCwg44Oa44O844K444GM44Ki44Kv44OG44Kj44OZ44O844OI5Y+v6IO944Gq54q25oWL44Gr44Gq44KL44Go55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUJlZm9yZUVudGVyKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlIHwgdW5kZWZpbmVkLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUFmdGVyRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBwYWdlIGdvZXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavnp7vooYzjgZnjgovnm7TliY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQmVmb3JlTGVhdmUodGhpc1BhZ2U6IFJvdXRlLCBuZXh0UGFnZTogUm91dGUsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUFmdGVyTGVhdmUodGhpc1BhZ2U6IFJvdXRlLCBuZXh0UGFnZTogUm91dGUsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgYvjgonliIfjgorpm6LjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlVW5tb3VudGVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXN0cm95ZWQgYnkgdGhlIHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuegtOajhOOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VSZW1vdmVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUGFnZVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUluaXQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHRoaXMub25QYWdlSW5pdCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZU1vdW50ZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIGNvbnN0IHsgZWwgfSA9IHRvO1xuICAgICAgICBpZiAoZWwgIT09IHRoaXMuZWwgYXMgdW5rbm93bikge1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGVsIGFzIHVua25vd24gYXMgVEVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub25QYWdlTW91bnRlZCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIHJlYWR5IHRvIGJlIGFjdGl2YXRlZCBhZnRlciBpbml0aWFsaXphdGlvbi5cbiAgICAgKiBAamEg5Yid5pyf5YyW5b6MLCDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5njg7zjg4jlj6/og73jgarnirbmhYvjgavjgarjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICB0aGlzLm9uUGFnZUJlZm9yZUVudGVyKHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICB0aGlzLm9uUGFnZUFmdGVyRW50ZXIodG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBwYWdlIGdvZXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavnp7vooYzjgZnjgovnm7TliY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20gYXMgUm91dGU7XG4gICAgICAgIHRoaXMub25QYWdlQmVmb3JlTGVhdmUoZnJvbSBhcyBSb3V0ZSwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20gYXMgUm91dGU7XG4gICAgICAgIHRoaXMub25QYWdlQWZ0ZXJMZWF2ZShmcm9tIGFzIFJvdXRlLCB0bywgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXRhY2hlZCBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBi+OCieWIh+OCiumbouOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VVbm1vdW50ZWQoaW5mbzogUm91dGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5vblBhZ2VVbm1vdW50ZWQoaW5mbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGVzdHJveWVkIGJ5IHRoZSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabnoLTmo4TjgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlUmVtb3ZlZChpbmZvOiBSb3V0ZSk6IHZvaWQge1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMub25QYWdlUmVtb3ZlZChpbmZvKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7O0FBS0c7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQUhELElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxD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