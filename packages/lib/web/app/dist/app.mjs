/*!
 * @cdp/app 0.9.17
 *   application context
 */

import { safe, getConfig, getGlobalNamespace, isFunction } from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import { Deferred } from '@cdp/promise';
import { makeResult, RESULT_CODE } from '@cdp/result';
import { waitFrame } from '@cdp/web-utils';
import { dom } from '@cdp/dom';
import { i18n, changeLanguage, getLanguage, initializeI18N, localize } from '@cdp/i18n';
import { createRouter } from '@cdp/router';
import { View } from '@cdp/view';

/* eslint-disable
    max-len,
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
    /* eslint-disable @typescript-eslint/dot-notation */
    delete context['options'];
    delete context['language'];
    delete context['languages'];
    delete context['isInitialized'];
    /* eslint-enable @typescript-eslint/dot-notation */
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
const _initialPages = [];
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
        this._window = win ?? window;
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
    async changeLanguage(lng, options) {
        const t = await changeLanguage(lng, options);
        await this._router.refresh(2 /* RouterRefreshLevel.DOM_CLEAR */);
        this.publish('languagechange', getLanguage(), t);
        return t;
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
        this._router.register(_initialPages, false);
        await this._router.go();
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
     * @en Triggered immediately after the page's HTMLElement is cloned and inserted into the DOM.
     * @ja ページの HTMLElement が複製され DOM に挿入された直後に発火
     */
    onPageCloned(thisPage, prevPage) { }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImludGVybmFsLnRzIiwiY29udGV4dC50cyIsInBhZ2Utdmlldy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG1heC1sZW4sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQVBQID0gQ0RQX0tOT1dOX01PRFVMRS5BUFAgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgQVBQX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0FQUF9DT05URVhUX05FRURfVE9fQkVfSU5JVElBTElaRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BUFAgKyAxLCAnQXBwQ29udGV4dCBuZWVkIHRvIGJlIGluaXRpYWxpemVkIHdpdGggb3B0aW9ucyBhdCBsZWFzdCBvbmNlLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4iLCJpbXBvcnQgeyBnZXRHbG9iYWxOYW1lc3BhY2UsIGdldENvbmZpZyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9pMThuJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgUEFHRV9DVVJSRU5UICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgPSAncGFnZS1wcmV2aW91cycsXG59XG5cbi8qKiBAaW50ZXJuYWwgcGFydGlhbCBtYXRjaCBjbGFzcyBuYW1lICovXG5leHBvcnQgY29uc3QgaGFzUGFydGlhbENsYXNzTmFtZSA9IDxUIGV4dGVuZHMgRWxlbWVudD4oZWw6IFQsIGNsYXNzTmFtZTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGVsLmNsYXNzTGlzdCkge1xuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcyhjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBmb3JjZSBjbGVhciBpMThuIHNldHRpbmdzICovXG5leHBvcnQgY29uc3QgY2xlYXJJMThOU2V0dGluZ3MgPSAoKTogdm9pZCA9PiB7XG4gICAgY29uc3QgY29udGV4dDogUGFydGlhbDx0eXBlb2YgaTE4bj4gPSBpMThuO1xuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9kb3Qtbm90YXRpb24gKi9cbiAgICBkZWxldGUgY29udGV4dFsnb3B0aW9ucyddO1xuICAgIGRlbGV0ZSBjb250ZXh0WydsYW5ndWFnZSddO1xuICAgIGRlbGV0ZSBjb250ZXh0WydsYW5ndWFnZXMnXTtcbiAgICBkZWxldGUgY29udGV4dFsnaXNJbml0aWFsaXplZCddO1xuICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvbiAqL1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGdldEFwcENvbmZpZyA9IDxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBUKTogVCA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHt9LFxuICAgICAgICBnZXRDb25maWc8VD4oKSwgICAgICAgICAgICAgICAgICAvLyBDRFAuQ29uZmlnXG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZTxUPignQ29uZmlnJyksIC8vIGdsb2JhbCBDb25maWdcbiAgICAgICAgYmFzZSxcbiAgICApO1xufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgRE9NQ29udGVudExvYWRlZCAqL1xuZXhwb3J0IGNvbnN0IHdhaXREb21Db250ZW50TG9hZGVkID0gYXN5bmMgKGNvbnRleHQ6IERvY3VtZW50KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgJ2xvYWRpbmcnID09PSBjb250ZXh0LnJlYWR5U3RhdGUgJiYgYXdhaXQgbmV3IFByb21pc2U8dW5rbm93bj4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIGN1c3RvbSBkb2N1bWVudCBldmVudCByZWFkeSAqL1xuZXhwb3J0IGNvbnN0IHdhaXREb2N1bWVudEV2ZW50UmVhZHkgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQsIGV2ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBudWxsICE9IGV2ZW50ICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgSTE4Tk9wdGlvbnMsXG4gICAgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyLFxuICAgIGluaXRpYWxpemVJMThOLFxuICAgIGxvY2FsaXplLFxuICAgIGdldExhbmd1YWdlLFxuICAgIGNoYW5nZUxhbmd1YWdlLFxuICAgIGkxOG4sXG59IGZyb20gJ0BjZHAvaTE4bic7XG5pbXBvcnQge1xuICAgIFJvdXRlLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXJSZWZyZXNoTGV2ZWwsXG4gICAgUm91dGVyLFxuICAgIFBhZ2UsXG4gICAgY3JlYXRlUm91dGVyLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIGNsZWFySTE4TlNldHRpbmdzLFxuICAgIGdldEFwcENvbmZpZyxcbiAgICB3YWl0RG9tQ29udGVudExvYWRlZCxcbiAgICB3YWl0RG9jdW1lbnRFdmVudFJlYWR5LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gYG9yaWVudGF0aW9uYCBpZGVudGlmaWVyXG4gKiBAamEgYG9yaWVudGF0aW9uYCDorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT3JpZW50YXRpb24ge1xuICAgIFBPUlRSQUlUICA9ICdwb3J0cmFpdCcsXG4gICAgTEFORFNDQVBFID0gJ2xhbmRzY2FwZScsXG59XG5cbi8qKlxuICogQGVuIFRoZSBldmVudCBkZWZpbml0aW9uIGZpcmVkIGluIHtAbGluayBBcHBDb250ZXh0fS5cbiAqIEBqYSB7QGxpbmsgQXBwQ29udGV4dH0g5YaF44GL44KJ55m66KGM44GV44KM44KL44Kk44OZ44Oz44OI5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dEV2ZW50IHtcbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbGljYXRpb24gcmVhZHkgbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PmupblgpnlrozkuobpgJrnn6VcbiAgICAgKiBAYXJncyBbY29udGV4dF1cbiAgICAgKi9cbiAgICAncmVhZHknOiBbQXBwQ29udGV4dF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSGFyZHdhcmUgYmFjayBidXR0b24gcHJlc3Mgbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjg4/jg7zjg4njgqbjgqfjgqLjg5Djg4Pjgq/jg5zjgr/jg7Pjga7mirzkuIvpgJrnn6VcbiAgICAgKiBAYXJncyBbRXZlbnRdXG4gICAgICovXG4gICAgJ2JhY2tidXR0b24nOiBbRXZlbnRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIERldmljZSBvcmllbnRhdGlvbiBjaGFuZ2Ugbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjg4fjg5DjgqTjgrnjgqrjg6rjgqjjg7Pjg4bjg7zjgrfjg6fjg7PlpInmm7TpgJrnn6VcbiAgICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvV2luZG93L29yaWVudGF0aW9uY2hhbmdlX2V2ZW50XG4gICAgICogQGFyZ3MgW09yaWVudGFpb24sIGFuZ2xlXVxuICAgICAqL1xuICAgICdvcmllbnRhdGlvbmNoYW5nZSc6IFtPcmllbnRhdGlvbiwgbnVtYmVyXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBsaWNhdGlvbiBsYW5ndWdhdGUgY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz6KiA6Kqe5aSJ5pu06YCa55+lXG4gICAgICogQGFyZ3MgW2xhbmd1YWdlLCBpMThuLlRGdW5jdGlvbl1cbiAgICAgKi9cbiAgICAnbGFuZ3VhZ2VjaGFuZ2UnOiBbc3RyaW5nLCBpMThuLlRGdW5jdGlvbl07XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBBcHBDb250ZXh0fSBjcmVhdGUgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgQXBwQ29udGV4dH0g5qeL56+J44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dE9wdGlvbnMgZXh0ZW5kcyBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0gZm9yIG1haW4gcm91dGVyLlxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjga4ge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQGRlZmF1bHQgYCNhcHBgXG4gICAgICovXG4gICAgbWFpbj86IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSBhc3NpZ25lZCB0byB0aGUgc3BsYXNoIHNjcmVlbi4gPGJyPlxuICAgICAqICAgICBJdCB3aWxsIGJlIHJlbW92ZWQganVzdCBiZWZvcmUgYXBwbGlhY3Rpb24gcmVhZHkuXG4gICAgICogQGphIOOCueODl+ODqeODg+OCt+ODpeOCueOCr+ODquODvOODs+OBq+WJsuOCiuW9k+OBpuOCieOCjOOBpuOBhOOCiyB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcgPGJyPlxuICAgICAqICAgICDmupblgpnlrozkuobnm7TliY3jgavliYrpmaTjgZXjgozjgotcbiAgICAgKi9cbiAgICBzcGxhc2g/OiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTG9jYWxpemF0aW9uIG1vZHVsZSBvcHRpb25zLlxuICAgICAqIEBqYSDjg63jg7zjgqvjg6njgqTjgrrjg6Ljgrjjg6Xjg7zjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBpMThuPzogSTE4Tk9wdGlvbnM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIHN0YW5kLWJ5IGZ1bmN0aW9uIGZvciBhcHBsaWNhdGlvbiByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG44Gu44Gf44KB44Gu5b6F44Gh5Y+X44GR6Zai5pWwXG4gICAgICovXG4gICAgd2FpdEZvclJlYWR5PzogUHJvbWlzZTx1bmtub3duPiB8ICgoY29udGV4dDogQXBwQ29udGV4dCkgPT4gUHJvbWlzZTx1bmtub3duPik7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIGBkb2N1bWVudGAgZXZlbnQgZm9yIGFwcGxpY2F0aW9uIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7Pmupblgpnlrozkuobjga7jgZ/jgoHjga7jgqvjgrnjgr/jg6AgYGRvY3VtZW50YCDjgqTjg5njg7Pjg4hcbiAgICAgKi9cbiAgICBkb2N1bWVudEV2ZW50UmVhZHk/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIGBkb2N1bWVudGAgZXZlbnQgZm9yIGhhcmR3YXJlIGJhY2sgYnV0dG9uLiBkZWZhdWx0OiBgYmFja2J1dHRvbmBcbiAgICAgKiBAamEg44OP44O844OJ44Km44Kn44Ki44OQ44OD44Kv44Oc44K/44Oz44Gu44Gf44KB44Gu44Kr44K544K/44OgIGBkb2N1bWVudGAg44Kk44OZ44Oz44OILiDml6LlrprlgKQgYGJhY2tidXR0b25gXG4gICAgICovXG4gICAgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gU3BlY2lmeSB0cnVlIHRvIGRlc3Ryb3kgdGhlIGluc3RhbmNlIGNhY2hlIGFuZCByZXNldC4gKGZvciBkZWJ1ZylcbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Kt44Oj44OD44K344Ol44KS56C05qOE44GX44Oq44K744OD44OI44GZ44KL5aC05ZCI44GrIHRydWUg44KS5oyH5a6aICjjg4fjg5Djg4PjgrDnlKgpXG4gICAgICovXG4gICAgcmVzZXQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGludGVyZmFjZVxuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHQgZXh0ZW5kcyBTdWJzY3JpYmFibGU8QXBwQ29udGV4dEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIG1haW4gcm91dGVyIGludGVyZmFjZVxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7xcbiAgICAgKi9cbiAgICByZWFkb25seSByb3V0ZXI6IFJvdXRlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgUHJvbWlzZWAgZm9yIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDmupblgpnlrozkuobnorroqo3nlKggYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJlYWR5OiBQcm9taXNlPHZvaWQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1cnJlbnQgYWN0aXZlIHBhZ2UgaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOOCouOCr+ODhuOCo+ODluOBquODmuODvOOCuOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGFjdGl2ZVBhZ2U6IFBhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VycmVudCB7QGxpbmsgT3JpZW50YXRpb259IGlkLlxuICAgICAqIEBqYSDnj77lnKjjga4ge0BsaW5rIE9yaWVudGF0aW9ufSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICByZWFkb25seSBvcmllbnRhdGlvbjogT3JpZW50YXRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlci1kZWZpbmFibGUgZXh0ZW5kZWQgcHJvcGVydHkuXG4gICAgICogQGphIOODpuODvOOCtuODvOWumue+qeWPr+iDveOBquaLoeW8teODl+ODreODkeODhuOCo1xuICAgICAqL1xuICAgIGV4dGVuc2lvbjogdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VzIHRoZSBsYW5ndWFnZS5cbiAgICAgKiBAamEg6KiA6Kqe44Gu5YiH44KK5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbG5nXG4gICAgICogIC0gYGVuYCBsb2NhbGUgc3RyaW5nIGV4OiBgZW5gLCBgZW4tVVNgXG4gICAgICogIC0gYGphYCDjg63jgrHjg7zjg6vmloflrZcgZXg6IGBlbmAsIGBlbi1VU2BcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZXJyb3IgYmVoYXZpb3VyXG4gICAgICogIC0gYGphYCDjgqjjg6njg7zmmYLjga7mjK/jgovoiJ7jgYTjgpLmjIflrppcbiAgICAgKi9cbiAgICBjaGFuZ2VMYW5ndWFnZShsbmc6IHN0cmluZywgb3B0aW9ucz86IEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cik6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuY29uc3QgX2luaXRpYWxQYWdlczogUm91dGVQYXJhbWV0ZXJzW10gPSBbXTtcblxuLyoqXG4gKiBAZW4gUm91dGUgcGFyYW1ldGVycyBmb3IgcGFnZSByZWdpc3RyYXRpb24uIE5lZWQgdG8gZGVzY3JpYmUgYHBhdGhgLCBgY29udGVudGAuXG4gKiBAamEg44Oa44O844K455m76Yyy55So44Or44O844OI44OR44Op44Oh44O844K/LiBgcGF0aGAsIGBjb250ZW50YCDjga7oqJjov7DjgYzlv4XopoFcbiAqL1xuZXhwb3J0IHR5cGUgUGFnZVJvdXRlUGFyYW1ldGVycyA9IFJlcXVpcmVkPFBpY2s8Um91dGVQYXJhbWV0ZXJzLCAnY29udGVudCc+PiAmIFJvdXRlUGFyYW1ldGVycztcblxuLyoqXG4gKiBAZW4gUHJlLXJlZ2lzdGVyIGNvbmNyZXRlIHtAbGluayBQYWdlfSBjbGFzcy4gUmVnaXN0ZXJlZCB3aXRoIHRoZSBtYWluIHJvdXRlciB3aGVuIGluc3RhbnRpYXRpbmcge0BsaW5rIEFwcENvbnRleHR9LiA8YnI+XG4gKiAgICAgSWYgY29uc3RydWN0b3IgbmVlZHMgYXJndW1lbnRzLCBgb3B0aW9ucy5jb21wb25lbnRPcHRpb25zYCBpcyBhdmFpbGFibGUuXG4gKiBAamEgUGFnZSDlhbfosaHljJbjgq/jg6njgrnjga7kuovliY3nmbvpjLIuIHtAbGluayBBcHBDb250ZXh0fSDjga7jgqTjg7Pjgrnjgr/jg7PjgrnljJbmmYLjgavjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjgavnmbvpjLLjgZXjgozjgosuIDxicj5cbiAqICAgICBjb25zdHJ1Y3RvciDjgpLmjIflrprjgZnjgovlvJXmlbDjgYzjgYLjgovloLTlkIjjga8sIGBvcHRpb25zLmNvbXBvbmVudE9wdGlvbnNgIOOCkuWIqeeUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgICBQYWdlLFxuICogICAgIFJvdXRlcixcbiAqICAgICBBcHBDb250ZXh0LFxuICogICAgIHJlZ2lzdGVyUGFnZSxcbiAqIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBjb25zdCBwYWdlRmFjdG9yeSA9IChyb3V0ZXI6IFJvdXRlciwgLi4uYXJnczogYW55W10pOiBQYWdlID0+IHtcbiAqICAgOlxuICogfTtcbiAqIFxuICogLy8gcHJlLXJlZ2lzdHJhdGlvblxuICogcmVnaXN0ZXJQYWdlKHtcbiAqICAgICBwYXRoOiAncGFnZS1wYXRoJyxcbiAqICAgICBjb25wb25lbnQ6IHBhZ2VGYWN0b3J5LFxuICogICAgIGNvbnRlbnQ6ICcjcGFnZS1pZCdcbiAqIH0pO1xuICpcbiAqIC8vIGluaXRpYWwgYWNjZXNzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KHsgbWFpbjogJyNhcHAnIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgcm91dGUgcGF0aFxuICogIC0gYGphYCDjg6vjg7zjg4jjga7jg5HjgrlcbiAqIEBwYXJhbSBjb21wb25lbnRcbiAqICAtIGBlbmAgc3BlY2lmeSB0aGUgY29uc3RydWN0b3Igb3IgYnVpbHQgb2JqZWN0IG9mIHRoZSBwYWdlIGNvbXBvbmVudFxuICogIC0gYGphYCDjg5rjg7zjgrjjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgoLjgZfjgY/jga/mp4vnr4nmuIjjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJvdXRlIHBhcmFtZXRlcnNcbiAqICAtIGBqYWAg44Or44O844OI44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCBjb25zdCByZWdpc3RlclBhZ2UgPSAocGFyYW1zOiBQYWdlUm91dGVQYXJhbWV0ZXJzKTogdm9pZCA9PiB7XG4gICAgX2luaXRpYWxQYWdlcy5wdXNoKHBhcmFtcyk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEFwcENvbnRleHQgaW1wbCBjbGFzcyAqL1xuY2xhc3MgQXBwbGljYXRpb24gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxBcHBDb250ZXh0RXZlbnQ+IGltcGxlbWVudHMgQXBwQ29udGV4dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfd2luZG93OiBXaW5kb3c7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm91dGVyOiBSb3V0ZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcmVhZHkgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICBwcml2YXRlIF9leHRlbnNpb246IHVua25vd247XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCB7IG1haW4sIHdpbmRvdzogd2luIH0gPSBvcHRpb25zO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW4gPz8gd2luZG93O1xuICAgICAgICB0aGlzLl9yb3V0ZXIgPSBjcmVhdGVSb3V0ZXIobWFpbiBhcyBzdHJpbmcsIG9wdGlvbnMpO1xuICAgICAgICB2b2lkIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBBcHBDb250ZXh0XG5cbiAgICBnZXQgcm91dGVyKCk6IFJvdXRlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXI7XG4gICAgfVxuXG4gICAgZ2V0IHJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHk7XG4gICAgfVxuXG4gICAgZ2V0IGFjdGl2ZVBhZ2UoKTogUGFnZSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fcm91dGVyLmN1cnJlbnRSb3V0ZSBhcyBSb3V0ZSAmIFJlY29yZDxzdHJpbmcsIHsgcGFnZTogUGFnZTsgfT4pWydAcGFyYW1zJ10/LnBhZ2UgfHwge307XG4gICAgfVxuXG4gICAgZ2V0IG9yaWVudGF0aW9uKCk6IE9yaWVudGF0aW9uIHtcbiAgICAgICAgY29uc3QgJHdpbmRvdyA9ICQodGhpcy5fd2luZG93KTtcbiAgICAgICAgcmV0dXJuICgkd2luZG93LndpZHRoKCkgPCAkd2luZG93LmhlaWdodCgpKSA/IE9yaWVudGF0aW9uLlBPUlRSQUlUIDogT3JpZW50YXRpb24uTEFORFNDQVBFO1xuICAgIH1cblxuICAgIGdldCBleHRlbnNpb24oKTogdW5rbm93biB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHRlbnNpb247XG4gICAgfVxuXG4gICAgc2V0IGV4dGVuc2lvbih2YWw6IHVua25vd24pIHtcbiAgICAgICAgdGhpcy5fZXh0ZW5zaW9uID0gdmFsO1xuICAgIH1cblxuICAgIGFzeW5jIGNoYW5nZUxhbmd1YWdlKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4ge1xuICAgICAgICBjb25zdCB0ID0gYXdhaXQgY2hhbmdlTGFuZ3VhZ2UobG5nLCBvcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fcm91dGVyLnJlZnJlc2goUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUik7XG4gICAgICAgIHRoaXMucHVibGlzaCgnbGFuZ3VhZ2VjaGFuZ2UnLCBnZXRMYW5ndWFnZSgpLCB0KTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFwcENvbnRleHRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgc3BsYXNoLCBpMThuLCB3YWl0Rm9yUmVhZHksIGRvY3VtZW50RXZlbnRSZWFkeSwgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24gfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgX3dpbmRvdyB9ID0gdGhpcztcblxuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5vbkdsb2JhbEVycm9yLmJpbmQodGhpcykpO1xuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VuaGFuZGxlZHJlamVjdGlvbicsIHRoaXMub25HbG9iYWxVbmhhbmRsZWRSZWplY3Rpb24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgYXdhaXQgd2FpdERvbUNvbnRlbnRMb2FkZWQoX3dpbmRvdy5kb2N1bWVudCk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIGluaXRpYWxpemVJMThOKGkxOG4pLFxuICAgICAgICAgICAgaXNGdW5jdGlvbih3YWl0Rm9yUmVhZHkpID8gd2FpdEZvclJlYWR5KHRoaXMpIDogd2FpdEZvclJlYWR5LFxuICAgICAgICAgICAgd2FpdERvY3VtZW50RXZlbnRSZWFkeShfd2luZG93LmRvY3VtZW50LCBkb2N1bWVudEV2ZW50UmVhZHkpLFxuICAgICAgICBdKTtcblxuICAgICAgICBfd2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnRFdmVudEJhY2tCdXR0b24hLCB0aGlzLm9uSGFuZGxlQmFja0tleS5iaW5kKHRoaXMpKTtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fcm91dGVyLm9uKCdsb2FkZWQnLCB0aGlzLm9uUGFnZUxvYWRlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5fcm91dGVyLnJlZ2lzdGVyKF9pbml0aWFsUGFnZXMsIGZhbHNlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fcm91dGVyLmdvKCk7XG5cbiAgICAgICAgLy8gcmVtb3ZlIHNwbGFzaCBzY3JlZW5cbiAgICAgICAgJChzcGxhc2gsIF93aW5kb3cuZG9jdW1lbnQpLnJlbW92ZSgpO1xuXG4gICAgICAgIHRoaXMuX3JlYWR5LnJlc29sdmUoKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdyZWFkeScsIHRoaXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgcHJpdmF0ZSBvblBhZ2VMb2FkZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGxvY2FsaXplKGluZm8udG8uZWwpO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25HbG9iYWxFcnJvcihldmVudDogRXJyb3JFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbR2xvYmFsIEVycm9yXSAke2V2ZW50Lm1lc3NhZ2V9LCAke2V2ZW50LmZpbGVuYW1lfSwgJHtldmVudC5jb2xub30sICR7ZXZlbnQuZXJyb3J9YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkdsb2JhbFVuaGFuZGxlZFJlamVjdGlvbihldmVudDogUHJvbWlzZVJlamVjdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtHbG9iYWwgVW5oYW5kbGVkIFJlamVjdGlvbl0gJHtldmVudC5yZWFzb259YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkhhbmRsZUJhY2tLZXkoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaCgnYmFja2J1dHRvbicsIGV2ZW50KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9uSGFuZGxlT3JpZW50YXRpb25DaGFuZ2VkKC8qZXZlbnQ6IEV2ZW50Ki8pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsIHNjcmVlbiB9ID0gdGhpcy5fd2luZG93OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICBhd2FpdCB3YWl0RnJhbWUoMSwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub3JpZW50YXRpb24sIHNjcmVlbi5vcmllbnRhdGlvbi5hbmdsZSk7XG4gICAgfVxufVxuXG4vKiogY29udGV4dCBjYWNoZSAqL1xubGV0IF9hcHBDb250ZXh0OiBBcHBDb250ZXh0IHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGFjY2Vzc1xuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiOWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQXBwQ29udGV4dCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKiBgYGBcbiAqXG4gKiAtIGluaXRpYWwgYWNjZXNzXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoe1xuICogICAgIG1haW46ICcjYXBwJyxcbiAqICAgICByb3V0ZXM6IFtcbiAqICAgICAgICAgeyBwYXRoOiAnLycgfSxcbiAqICAgICAgICAgeyBwYXRoOiAnL29uZScgfSxcbiAqICAgICAgICAgeyBwYXRoOiAnL3R3bycgfVxuICogICAgIF0sXG4gKiB9KTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIC0gZnJvbSB0aGUgc2Vjb25kIHRpbWUgb253YXJkc1xuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KCk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBpbml0IG9wdGlvbnNcbiAqICAtIGBqYWAg5Yid5pyf5YyW44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBBcHBDb250ZXh0ID0gKG9wdGlvbnM/OiBBcHBDb250ZXh0T3B0aW9ucyk6IEFwcENvbnRleHQgPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBnZXRBcHBDb25maWcoT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIG1haW46ICcjYXBwJyxcbiAgICAgICAgc3RhcnQ6IGZhbHNlLFxuICAgICAgICBkb2N1bWVudEV2ZW50QmFja0J1dHRvbjogJ2JhY2tidXR0b24nLFxuICAgIH0sIG9wdGlvbnMpIGFzIEFwcENvbnRleHRPcHRpb25zKTtcblxuICAgIGlmIChudWxsID09IG9wdGlvbnMgJiYgbnVsbCA9PSBfYXBwQ29udGV4dCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FQUF9DT05URVhUX05FRURfVE9fQkVfSU5JVElBTElaRUQsICdBcHBDb250ZXh0IHNob3VsZCBiZSBpbml0aWFsaXplZCB3aXRoIG9wdGlvbnMgYXQgbGVhc3Qgb25jZS4nKTtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5yZXNldCkge1xuICAgICAgICBfYXBwQ29udGV4dCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY2xlYXJJMThOU2V0dGluZ3MoKTtcbiAgICB9XG5cbiAgICBpZiAoIV9hcHBDb250ZXh0KSB7XG4gICAgICAgIF9hcHBDb250ZXh0ID0gbmV3IEFwcGxpY2F0aW9uKG9wdHMpO1xuICAgIH1cbiAgICByZXR1cm4gX2FwcENvbnRleHQ7XG59O1xuIiwiaW1wb3J0IHsgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsIFZpZXcgfSBmcm9tICdAY2RwL3ZpZXcnO1xuaW1wb3J0IHtcbiAgICBSb3V0ZXIsXG4gICAgUm91dGUsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgUGFnZSxcbn0gZnJvbSAnQGNkcC9yb3V0ZXInO1xuaW1wb3J0IHsgQ3NzTmFtZSwgaGFzUGFydGlhbENsYXNzTmFtZSB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwYWdlLXZpZXc6cHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJvdXRlPzogUm91dGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gb2Yge0BsaW5rIFZpZXd9IHRoYXQgY2FuIGJlIHNwZWNpZmllZCBpbiBhcyB7QGxpbmsgUGFnZX0gb2Yge0BsaW5rIFJvdXRlcn0uXG4gKiBAamEge0BsaW5rIFJvdXRlcn0g44GuIHtAbGluayBQYWdlfSDjgavmjIflrprlj6/og73jgaoge0BsaW5rIFZpZXd9IOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUGFnZVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50ID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBQYWdlIHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3V0ZVxuICAgICAqICAtIGBlbmAgcm91dGUgY29udGV4dFxuICAgICAqICAtIGBqYWAg44Or44O844OI44Kz44Oz44OG44Kt44K544OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBWaWV3fSBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIHtAbGluayBWaWV3fSDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihyb3V0ZT86IFJvdXRlLCBvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXSA9IHsgcm91dGUgfTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBwYWdlIGlzIGFjdGl2ZS5cbiAgICAgKiBAamEg44Oa44O844K444GM44Ki44Kv44OG44Kj44OW44Gn44GC44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGFjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGhhc1BhcnRpYWxDbGFzc05hbWUodGhpcy5lbCwgQ3NzTmFtZS5QQUdFX0NVUlJFTlQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSb3V0ZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgcGFnZSAocHVibGljKS5cbiAgICAgKiBAamEg44Oa44O844K444Gr57SQ44Gl44GP44Or44O844OI44OH44O844K/ICjlhazplovnlKgpXG4gICAgICovXG4gICAgZ2V0IFsnQHJvdXRlJ10oKTogUm91dGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucm91dGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBSb3V0ZXJ9IGluc3RhbmNlXG4gICAgICogQGphIHtAbGluayBSb3V0ZXJ9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3JvdXRlKCk6IFJvdXRlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbJ0Byb3V0ZSddO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgUm91dGVyfSBpbnN0YW5jZVxuICAgICAqIEBqYSB7QGxpbmsgUm91dGVyfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9yb3V0ZXIoKTogUm91dGVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlPy5yb3V0ZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6IHV0aWxpemVkIHBhZ2UgZXZlbnRcblxuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUluaXQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlTW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBjbG9uZWQgYW5kIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOikh+ijveOBleOCjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUNsb25lZCh0aGlzUGFnZTogUm91dGUsIHByZXZQYWdlOiBSb3V0ZSk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIHJlYWR5IHRvIGJlIGFjdGl2YXRlZCBhZnRlciBpbml0aWFsaXphdGlvbi5cbiAgICAgKiBAamEg5Yid5pyf5YyW5b6MLCDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5njg7zjg4jlj6/og73jgarnirbmhYvjgavjgarjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQmVmb3JlRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUFmdGVyRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCBqdXN0IGJlZm9yZSB0aGUgcGFnZSBnb2VzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr56e76KGM44GZ44KL55u05YmN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUJlZm9yZUxlYXZlKHRoaXNQYWdlOiBSb3V0ZSwgbmV4dFBhZ2U6IFJvdXRlLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UgaXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavjgarjgaPjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQWZ0ZXJMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgYvjgonliIfjgorpm6LjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlVW5tb3VudGVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXN0cm95ZWQgYnkgdGhlIHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuegtOajhOOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VSZW1vdmVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUGFnZVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUluaXQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvIH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICBjb25zdCB7IGVsIH0gPSB0bztcbiAgICAgICAgaWYgKGVsICE9PSB0aGlzLmVsIGFzIHVua25vd24pIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChlbCBhcyB1bmtub3duIGFzIFRFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VJbml0KHRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlTW91bnRlZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZU1vdW50ZWQodG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBjbG9uZWQgYW5kIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOikh+ijveOBleOCjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUNsb25lZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUNsb25lZCh0bywgZnJvbSEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyByZWFkeSB0byBiZSBhY3RpdmF0ZWQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGphIOWIneacn+WMluW+jCwg44Oa44O844K444GM44Ki44Kv44OG44Kj44OZ44O844OI5Y+v6IO944Gq54q25oWL44Gr44Gq44KL44Go55m654GrXG4gICAgICovXG4gICAgcGFnZUJlZm9yZUVudGVyKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUJlZm9yZUVudGVyKHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQWZ0ZXJFbnRlcih0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIHBhZ2UgZ29lcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+enu+ihjOOBmeOCi+ebtOWJjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VCZWZvcmVMZWF2ZShpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20hO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VCZWZvcmVMZWF2ZShmcm9tISwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSBmcm9tITtcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQWZ0ZXJMZWF2ZShmcm9tISwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgYvjgonliIfjgorpm6LjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlVW5tb3VudGVkKGluZm86IFJvdXRlKTogdm9pZCB7XG4gICAgICAgIHRoaXMub25QYWdlVW5tb3VudGVkKGluZm8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRlc3Ryb3llZCBieSB0aGUgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm56C05qOE44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZVJlbW92ZWQoaW5mbzogUm91dGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm9uUGFnZVJlbW92ZWQoaW5mbyk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbIiQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7O0FBSUc7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQUhELElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGFBQXNDLENBQUE7UUFDdEMsV0FBMkMsQ0FBQSxXQUFBLENBQUEsMENBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDZCQUFzQixDQUFDLEVBQUUsK0RBQStELENBQUMsQ0FBQSxHQUFBLDBDQUFBLENBQUE7QUFDakwsS0FBQyxHQUFBLENBQUE7QUFDTCxDQUFDLEdBQUE7O0FDbkJELGlCQUF3QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQzs7QUNROUQ7QUFDTyxNQUFNLG1CQUFtQixHQUFHLENBQW9CLEVBQUssRUFBRSxTQUFpQixLQUFhO0FBQ3hGLElBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFO0FBQzdCLFFBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQzFCLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFDZixTQUFBO0FBQ0osS0FBQTtBQUNELElB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