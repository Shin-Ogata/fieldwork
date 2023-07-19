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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImludGVybmFsLnRzIiwiY29udGV4dC50cyIsInBhZ2Utdmlldy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG1heC1sZW4sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQVBQID0gQ0RQX0tOT1dOX01PRFVMRS5BUFAgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgQVBQX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0FQUF9DT05URVhUX05FRURfVE9fQkVfSU5JVElBTElaRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BUFAgKyAxLCAnQXBwQ29udGV4dCBuZWVkIHRvIGJlIGluaXRpYWxpemVkIHdpdGggb3B0aW9ucyBhdCBsZWFzdCBvbmNlLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4iLCJpbXBvcnQgeyBnZXRHbG9iYWxOYW1lc3BhY2UsIGdldENvbmZpZyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9pMThuJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgUEFHRV9DVVJSRU5UICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgPSAncGFnZS1wcmV2aW91cycsXG59XG5cbi8qKiBAaW50ZXJuYWwgcGFydGlhbCBtYXRjaCBjbGFzcyBuYW1lICovXG5leHBvcnQgY29uc3QgaGFzUGFydGlhbENsYXNzTmFtZSA9IDxUIGV4dGVuZHMgRWxlbWVudD4oZWw6IFQsIGNsYXNzTmFtZTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGVsLmNsYXNzTGlzdCkge1xuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcyhjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBmb3JjZSBjbGVhciBpMThuIHNldHRpbmdzICovXG5leHBvcnQgY29uc3QgY2xlYXJJMThOU2V0dGluZ3MgPSAoKTogdm9pZCA9PiB7XG4gICAgY29uc3QgY29udGV4dDogUGFydGlhbDx0eXBlb2YgaTE4bj4gPSBpMThuO1xuICAgIGRlbGV0ZSBjb250ZXh0Lm9wdGlvbnM7XG4gICAgZGVsZXRlIGNvbnRleHQubGFuZ3VhZ2U7XG4gICAgZGVsZXRlIGNvbnRleHQubGFuZ3VhZ2VzO1xuICAgIGRlbGV0ZSBjb250ZXh0LmlzSW5pdGlhbGl6ZWQ7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZ2V0QXBwQ29uZmlnID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQpOiBUID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihcbiAgICAgICAge30sXG4gICAgICAgIGdldENvbmZpZzxUPigpLCAgICAgICAgICAgICAgICAgIC8vIENEUC5Db25maWdcbiAgICAgICAgZ2V0R2xvYmFsTmFtZXNwYWNlPFQ+KCdDb25maWcnKSwgLy8gZ2xvYmFsIENvbmZpZ1xuICAgICAgICBiYXNlLFxuICAgICk7XG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBET01Db250ZW50TG9hZGVkICovXG5leHBvcnQgY29uc3Qgd2FpdERvbUNvbnRlbnRMb2FkZWQgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAnbG9hZGluZycgPT09IGNvbnRleHQucmVhZHlTdGF0ZSAmJiBhd2FpdCBuZXcgUHJvbWlzZTx1bmtub3duPihyZXNvbHZlID0+IHtcbiAgICAgICAgY29udGV4dC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgcmVzb2x2ZSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIH0pO1xufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgY3VzdG9tIGRvY3VtZW50IGV2ZW50IHJlYWR5ICovXG5leHBvcnQgY29uc3Qgd2FpdERvY3VtZW50RXZlbnRSZWFkeSA9IGFzeW5jIChjb250ZXh0OiBEb2N1bWVudCwgZXZlbnQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIG51bGwgIT0gZXZlbnQgJiYgYXdhaXQgbmV3IFByb21pc2U8dW5rbm93bj4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgcmVzb2x2ZSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIH0pO1xufTtcbiIsImltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaWJhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgd2FpdEZyYW1lIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBET01TZWxlY3RvcixcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHtcbiAgICBJMThOT3B0aW9ucyxcbiAgICBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIsXG4gICAgaW5pdGlhbGl6ZUkxOE4sXG4gICAgbG9jYWxpemUsXG4gICAgZ2V0TGFuZ3VhZ2UsXG4gICAgY2hhbmdlTGFuZ3VhZ2UsXG4gICAgaTE4bixcbn0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgUm91dGUsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFJvdXRlclJlZnJlc2hMZXZlbCxcbiAgICBSb3V0ZXIsXG4gICAgUGFnZSxcbiAgICBjcmVhdGVSb3V0ZXIsXG59IGZyb20gJ0BjZHAvcm91dGVyJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgY2xlYXJJMThOU2V0dGluZ3MsXG4gICAgZ2V0QXBwQ29uZmlnLFxuICAgIHdhaXREb21Db250ZW50TG9hZGVkLFxuICAgIHdhaXREb2N1bWVudEV2ZW50UmVhZHksXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBgb3JpZW50YXRpb25gIGlkZW50aWZpZXJcbiAqIEBqYSBgb3JpZW50YXRpb25gIOitmOWIpeWtkFxuICovXG5leHBvcnQgY29uc3QgZW51bSBPcmllbnRhdGlvbiB7XG4gICAgUE9SVFJBSVQgID0gJ3BvcnRyYWl0JyxcbiAgICBMQU5EU0NBUEUgPSAnbGFuZHNjYXBlJyxcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGV2ZW50IGRlZmluaXRpb24gZmlyZWQgaW4ge0BsaW5rIEFwcENvbnRleHR9LlxuICogQGphIHtAbGluayBBcHBDb250ZXh0fSDlhoXjgYvjgonnmbrooYzjgZXjgozjgovjgqTjg5njg7Pjg4jlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0RXZlbnQge1xuICAgIC8qKlxuICAgICAqIEBlbiBBcHBsaWNhdGlvbiByZWFkeSBub3RpZmljYXRpb24uXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6humAmuefpVxuICAgICAqIEBhcmdzIFtjb250ZXh0XVxuICAgICAqL1xuICAgICdyZWFkeSc6IFtBcHBDb250ZXh0XTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBIYXJkd2FyZSBiYWNrIGJ1dHRvbiBwcmVzcyBub3RpZmljYXRpb24uXG4gICAgICogQGphIOODj+ODvOODieOCpuOCp+OCouODkOODg+OCr+ODnOOCv+ODs+OBruaKvOS4i+mAmuefpVxuICAgICAqIEBhcmdzIFtFdmVudF1cbiAgICAgKi9cbiAgICAnYmFja2J1dHRvbic6IFtFdmVudF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV2aWNlIG9yaWVudGF0aW9uIGNoYW5nZSBub3RpZmljYXRpb24uXG4gICAgICogQGphIOODh+ODkOOCpOOCueOCquODquOCqOODs+ODhuODvOOCt+ODp+ODs+WkieabtOmAmuefpVxuICAgICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9XaW5kb3cvb3JpZW50YXRpb25jaGFuZ2VfZXZlbnRcbiAgICAgKiBAYXJncyBbT3JpZW50YWlvbiwgYW5nbGVdXG4gICAgICovXG4gICAgJ29yaWVudGF0aW9uY2hhbmdlJzogW09yaWVudGF0aW9uLCBudW1iZXJdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGxpY2F0aW9uIGxhbmd1Z2F0ZSBjaGFuZ2Ugbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PoqIDoqp7lpInmm7TpgJrnn6VcbiAgICAgKiBAYXJncyBbbGFuZ3VhZ2UsIGkxOG4uVEZ1bmN0aW9uXVxuICAgICAqL1xuICAgICdsYW5ndWFnZWNoYW5nZSc6IFtzdHJpbmcsIGkxOG4uVEZ1bmN0aW9uXTtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIEFwcENvbnRleHR9IGNyZWF0ZSBvcHRpb25zLlxuICogQGphIHtAbGluayBBcHBDb250ZXh0fSDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0T3B0aW9ucyBleHRlbmRzIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSBmb3IgbWFpbiByb3V0ZXIuXG4gICAgICogQGphIOODoeOCpOODs+ODq+ODvOOCv+ODvOOBriB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAZGVmYXVsdCBgI2FwcGBcbiAgICAgKi9cbiAgICBtYWluPzogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019IGFzc2lnbmVkIHRvIHRoZSBzcGxhc2ggc2NyZWVuLiA8YnI+XG4gICAgICogICAgIEl0IHdpbGwgYmUgcmVtb3ZlZCBqdXN0IGJlZm9yZSBhcHBsaWFjdGlvbiByZWFkeS5cbiAgICAgKiBAamEg44K544OX44Op44OD44K344Ol44K544Kv44Oq44O844Oz44Gr5Ymy44KK5b2T44Gm44KJ44KM44Gm44GE44KLIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlyA8YnI+XG4gICAgICogICAgIOa6luWCmeWujOS6huebtOWJjeOBq+WJiumZpOOBleOCjOOCi1xuICAgICAqL1xuICAgIHNwbGFzaD86IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBMb2NhbGl6YXRpb24gbW9kdWxlIG9wdGlvbnMuXG4gICAgICogQGphIOODreODvOOCq+ODqeOCpOOCuuODouOCuOODpeODvOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGkxOG4/OiBJMThOT3B0aW9ucztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gc3RhbmQtYnkgZnVuY3Rpb24gZm9yIGFwcGxpY2F0aW9uIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7Pmupblgpnlrozkuobjga7jgZ/jgoHjga7lvoXjgaHlj5fjgZHplqLmlbBcbiAgICAgKi9cbiAgICB3YWl0Rm9yUmVhZHk/OiBQcm9taXNlPHVua25vd24+IHwgKChjb250ZXh0OiBBcHBDb250ZXh0KSA9PiBQcm9taXNlPHVua25vd24+KTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gYGRvY3VtZW50YCBldmVudCBmb3IgYXBwbGljYXRpb24gcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6huOBruOBn+OCgeOBruOCq+OCueOCv+ODoCBgZG9jdW1lbnRgIOOCpOODmeODs+ODiFxuICAgICAqL1xuICAgIGRvY3VtZW50RXZlbnRSZWFkeT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gYGRvY3VtZW50YCBldmVudCBmb3IgaGFyZHdhcmUgYmFjayBidXR0b24uIGRlZmF1bHQ6IGBiYWNrYnV0dG9uYFxuICAgICAqIEBqYSDjg4/jg7zjg4njgqbjgqfjgqLjg5Djg4Pjgq/jg5zjgr/jg7Pjga7jgZ/jgoHjga7jgqvjgrnjgr/jg6AgYGRvY3VtZW50YCDjgqTjg5njg7Pjg4guIOaXouWumuWApCBgYmFja2J1dHRvbmBcbiAgICAgKi9cbiAgICBkb2N1bWVudEV2ZW50QmFja0J1dHRvbj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBTcGVjaWZ5IHRydWUgdG8gZGVzdHJveSB0aGUgaW5zdGFuY2UgY2FjaGUgYW5kIHJlc2V0LiAoZm9yIGRlYnVnKVxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4TjgZfjg6rjgrvjg4Pjg4jjgZnjgovloLTlkIjjgasgdHJ1ZSDjgpLmjIflrpogKOODh+ODkOODg+OCsOeUqClcbiAgICAgKi9cbiAgICByZXNldD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIEFwcGxpY2F0aW9uIGNvbnRleHQgaW50ZXJmYWNlXG4gKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz44Kz44Oz44OG44Kt44K544OIXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dCBleHRlbmRzIFN1YnNjcmliYWJsZTxBcHBDb250ZXh0RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbWFpbiByb3V0ZXIgaW50ZXJmYWNlXG4gICAgICogQGphIOODoeOCpOODs+ODq+ODvOOCv+ODvFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJvdXRlcjogUm91dGVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBQcm9taXNlYCBmb3IgcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOa6luWCmeWujOS6hueiuuiqjeeUqCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgcmVhZHk6IFByb21pc2U8dm9pZD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VycmVudCBhY3RpdmUgcGFnZSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo44Ki44Kv44OG44Kj44OW44Gq44Oa44O844K444Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgYWN0aXZlUGFnZTogUGFnZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXJyZW50IHtAbGluayBPcmllbnRhdGlvbn0gaWQuXG4gICAgICogQGphIOePvuWcqOOBriB7QGxpbmsgT3JpZW50YXRpb259IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IG9yaWVudGF0aW9uOiBPcmllbnRhdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVc2VyLWRlZmluYWJsZSBleHRlbmRlZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg44Om44O844K244O85a6a576p5Y+v6IO944Gq5ouh5by144OX44Ot44OR44OG44KjXG4gICAgICovXG4gICAgZXh0ZW5zaW9uOiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZXMgdGhlIGxhbmd1YWdlLlxuICAgICAqIEBqYSDoqIDoqp7jga7liIfjgormm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsbmdcbiAgICAgKiAgLSBgZW5gIGxvY2FsZSBzdHJpbmcgZXg6IGBlbmAsIGBlbi1VU2BcbiAgICAgKiAgLSBgamFgIOODreOCseODvOODq+aWh+WtlyBleDogYGVuYCwgYGVuLVVTYFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBlcnJvciBiZWhhdmlvdXJcbiAgICAgKiAgLSBgamFgIOOCqOODqeODvOaZguOBruaMr+OCi+iInuOBhOOCkuaMh+WumlxuICAgICAqL1xuICAgIGNoYW5nZUxhbmd1YWdlKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBfaW5pdGlhbFBhZ2VzOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuXG4vKipcbiAqIEBlbiBSb3V0ZSBwYXJhbWV0ZXJzIGZvciBwYWdlIHJlZ2lzdHJhdGlvbi4gTmVlZCB0byBkZXNjcmliZSBgcGF0aGAsIGBjb250ZW50YC5cbiAqIEBqYSDjg5rjg7zjgrjnmbvpjLLnlKjjg6vjg7zjg4jjg5Hjg6njg6Hjg7zjgr8uIGBwYXRoYCwgYGNvbnRlbnRgIOOBruiomOi/sOOBjOW/heimgVxuICovXG5leHBvcnQgdHlwZSBQYWdlUm91dGVQYXJhbWV0ZXJzID0gUmVxdWlyZWQ8UGljazxSb3V0ZVBhcmFtZXRlcnMsICdjb250ZW50Jz4+ICYgUm91dGVQYXJhbWV0ZXJzO1xuXG4vKipcbiAqIEBlbiBQcmUtcmVnaXN0ZXIgY29uY3JldGUge0BsaW5rIFBhZ2V9IGNsYXNzLiBSZWdpc3RlcmVkIHdpdGggdGhlIG1haW4gcm91dGVyIHdoZW4gaW5zdGFudGlhdGluZyB7QGxpbmsgQXBwQ29udGV4dH0uIDxicj5cbiAqICAgICBJZiBjb25zdHJ1Y3RvciBuZWVkcyBhcmd1bWVudHMsIGBvcHRpb25zLmNvbXBvbmVudE9wdGlvbnNgIGlzIGF2YWlsYWJsZS5cbiAqIEBqYSBQYWdlIOWFt+ixoeWMluOCr+ODqeOCueOBruS6i+WJjeeZu+mMsi4ge0BsaW5rIEFwcENvbnRleHR9IOOBruOCpOODs+OCueOCv+ODs+OCueWMluaZguOBq+ODoeOCpOODs+ODq+ODvOOCv+ODvOOBq+eZu+mMsuOBleOCjOOCiy4gPGJyPlxuICogICAgIGNvbnN0cnVjdG9yIOOCkuaMh+WumuOBmeOCi+W8leaVsOOBjOOBguOCi+WgtOWQiOOBrywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2Ag44KS5Yip55So5Y+v6IO9XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICAgIFBhZ2UsXG4gKiAgICAgUm91dGVyLFxuICogICAgIEFwcENvbnRleHQsXG4gKiAgICAgcmVnaXN0ZXJQYWdlLFxuICogfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGNvbnN0IHBhZ2VGYWN0b3J5ID0gKHJvdXRlcjogUm91dGVyLCAuLi5hcmdzOiBhbnlbXSk6IFBhZ2UgPT4ge1xuICogICA6XG4gKiB9O1xuICogXG4gKiAvLyBwcmUtcmVnaXN0cmF0aW9uXG4gKiByZWdpc3RlclBhZ2Uoe1xuICogICAgIHBhdGg6ICdwYWdlLXBhdGgnLFxuICogICAgIGNvbnBvbmVudDogcGFnZUZhY3RvcnksXG4gKiAgICAgY29udGVudDogJyNwYWdlLWlkJ1xuICogfSk7XG4gKlxuICogLy8gaW5pdGlhbCBhY2Nlc3NcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoeyBtYWluOiAnI2FwcCcgfSk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcGF0aFxuICogIC0gYGVuYCByb3V0ZSBwYXRoXG4gKiAgLSBgamFgIOODq+ODvOODiOOBruODkeOCuVxuICogQHBhcmFtIGNvbXBvbmVudFxuICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBjb25zdHJ1Y3RvciBvciBidWlsdCBvYmplY3Qgb2YgdGhlIHBhZ2UgY29tcG9uZW50XG4gKiAgLSBgamFgIOODmuODvOOCuOOCs+ODs+ODneODvOODjeODs+ODiOOBruOCs+ODs+OCueODiOODqeOCr+OCv+OCguOBl+OBj+OBr+ani+eviea4iOOBv+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcm91dGUgcGFyYW1ldGVyc1xuICogIC0gYGphYCDjg6vjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAqL1xuZXhwb3J0IGNvbnN0IHJlZ2lzdGVyUGFnZSA9IChwYXJhbXM6IFBhZ2VSb3V0ZVBhcmFtZXRlcnMpOiB2b2lkID0+IHtcbiAgICBfaW5pdGlhbFBhZ2VzLnB1c2gocGFyYW1zKTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQXBwQ29udGV4dCBpbXBsIGNsYXNzICovXG5jbGFzcyBBcHBsaWNhdGlvbiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEFwcENvbnRleHRFdmVudD4gaW1wbGVtZW50cyBBcHBDb250ZXh0IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXI6IFJvdXRlcjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yZWFkeSA9IG5ldyBEZWZlcnJlZCgpO1xuICAgIHByaXZhdGUgX2V4dGVuc2lvbjogdW5rbm93bjtcblxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFwcENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IHsgbWFpbiwgd2luZG93OiB3aW4gfSA9IG9wdGlvbnM7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbiA/PyB3aW5kb3c7XG4gICAgICAgIHRoaXMuX3JvdXRlciA9IGNyZWF0ZVJvdXRlcihtYWluIGFzIHN0cmluZywgb3B0aW9ucyk7XG4gICAgICAgIHZvaWQgdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEFwcENvbnRleHRcblxuICAgIGdldCByb3V0ZXIoKTogUm91dGVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JvdXRlcjtcbiAgICB9XG5cbiAgICBnZXQgcmVhZHkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkeTtcbiAgICB9XG5cbiAgICBnZXQgYWN0aXZlUGFnZSgpOiBQYWdlIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9yb3V0ZXIuY3VycmVudFJvdXRlIGFzIFJvdXRlICYgUmVjb3JkPHN0cmluZywgeyBwYWdlOiBQYWdlOyB9PilbJ0BwYXJhbXMnXT8ucGFnZSB8fCB7fTtcbiAgICB9XG5cbiAgICBnZXQgb3JpZW50YXRpb24oKTogT3JpZW50YXRpb24ge1xuICAgICAgICBjb25zdCAkd2luZG93ID0gJCh0aGlzLl93aW5kb3cpO1xuICAgICAgICByZXR1cm4gKCR3aW5kb3cud2lkdGgoKSA8ICR3aW5kb3cuaGVpZ2h0KCkpID8gT3JpZW50YXRpb24uUE9SVFJBSVQgOiBPcmllbnRhdGlvbi5MQU5EU0NBUEU7XG4gICAgfVxuXG4gICAgZ2V0IGV4dGVuc2lvbigpOiB1bmtub3duIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4dGVuc2lvbjtcbiAgICB9XG5cbiAgICBzZXQgZXh0ZW5zaW9uKHZhbDogdW5rbm93bikge1xuICAgICAgICB0aGlzLl9leHRlbnNpb24gPSB2YWw7XG4gICAgfVxuXG4gICAgYXN5bmMgY2hhbmdlTGFuZ3VhZ2UobG5nOiBzdHJpbmcsIG9wdGlvbnM/OiBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiB7XG4gICAgICAgIGNvbnN0IHQgPSBhd2FpdCBjaGFuZ2VMYW5ndWFnZShsbmcsIG9wdGlvbnMpO1xuICAgICAgICBhd2FpdCB0aGlzLl9yb3V0ZXIucmVmcmVzaChSb3V0ZXJSZWZyZXNoTGV2ZWwuRE9NX0NMRUFSKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdsYW5ndWFnZWNoYW5nZScsIGdldExhbmd1YWdlKCksIHQpO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogQXBwQ29udGV4dE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBzcGxhc2gsIGkxOG4sIHdhaXRGb3JSZWFkeSwgZG9jdW1lbnRFdmVudFJlYWR5LCBkb2N1bWVudEV2ZW50QmFja0J1dHRvbiB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3QgeyBfd2luZG93IH0gPSB0aGlzO1xuXG4gICAgICAgIF93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLm9uR2xvYmFsRXJyb3IuYmluZCh0aGlzKSk7XG4gICAgICAgIF93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndW5oYW5kbGVkcmVqZWN0aW9uJywgdGhpcy5vbkdsb2JhbFVuaGFuZGxlZFJlamVjdGlvbi5iaW5kKHRoaXMpKTtcblxuICAgICAgICBhd2FpdCB3YWl0RG9tQ29udGVudExvYWRlZChfd2luZG93LmRvY3VtZW50KTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgaW5pdGlhbGl6ZUkxOE4oaTE4biksXG4gICAgICAgICAgICBpc0Z1bmN0aW9uKHdhaXRGb3JSZWFkeSkgPyB3YWl0Rm9yUmVhZHkodGhpcykgOiB3YWl0Rm9yUmVhZHksXG4gICAgICAgICAgICB3YWl0RG9jdW1lbnRFdmVudFJlYWR5KF93aW5kb3cuZG9jdW1lbnQsIGRvY3VtZW50RXZlbnRSZWFkeSksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIF93aW5kb3cuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudEV2ZW50QmFja0J1dHRvbiEsIHRoaXMub25IYW5kbGVCYWNrS2V5LmJpbmQodGhpcykpO1xuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vbkhhbmRsZU9yaWVudGF0aW9uQ2hhbmdlZC5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9yb3V0ZXIub24oJ2xvYWRlZCcsIHRoaXMub25QYWdlTG9hZGVkLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLl9yb3V0ZXIucmVnaXN0ZXIoX2luaXRpYWxQYWdlcywgZmFsc2UpO1xuICAgICAgICBhd2FpdCB0aGlzLl9yb3V0ZXIuZ28oKTtcblxuICAgICAgICAvLyByZW1vdmUgc3BsYXNoIHNjcmVlblxuICAgICAgICAkKHNwbGFzaCwgX3dpbmRvdy5kb2N1bWVudCkucmVtb3ZlKCk7XG5cbiAgICAgICAgdGhpcy5fcmVhZHkucmVzb2x2ZSgpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ3JlYWR5JywgdGhpcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICBwcml2YXRlIG9uUGFnZUxvYWRlZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgbG9jYWxpemUoaW5mby50by5lbCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkdsb2JhbEVycm9yKGV2ZW50OiBFcnJvckV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtHbG9iYWwgRXJyb3JdICR7ZXZlbnQubWVzc2FnZX0sICR7ZXZlbnQuZmlsZW5hbWV9LCAke2V2ZW50LmNvbG5vfSwgJHtldmVudC5lcnJvcn1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uR2xvYmFsVW5oYW5kbGVkUmVqZWN0aW9uKGV2ZW50OiBQcm9taXNlUmVqZWN0aW9uRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0dsb2JhbCBVbmhhbmRsZWQgUmVqZWN0aW9uXSAke2V2ZW50LnJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uSGFuZGxlQmFja0tleShldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdiYWNrYnV0dG9uJywgZXZlbnQpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgb25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQoLypldmVudDogRXZlbnQqLyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHJlcXVlc3RBbmltYXRpb25GcmFtZSwgc2NyZWVuIH0gPSB0aGlzLl93aW5kb3c7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgIGF3YWl0IHdhaXRGcmFtZSgxLCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbiwgc2NyZWVuLm9yaWVudGF0aW9uLmFuZ2xlKTtcbiAgICB9XG59XG5cbi8qKiBjb250ZXh0IGNhY2hlICovXG5sZXQgX2FwcENvbnRleHQ6IEFwcENvbnRleHQgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIEFwcGxpY2F0aW9uIGNvbnRleHQgYWNjZXNzXG4gKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz44Kz44Oz44OG44Kt44K544OI5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBBcHBDb250ZXh0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGBgYFxuICpcbiAqIC0gaW5pdGlhbCBhY2Nlc3NcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCh7XG4gKiAgICAgbWFpbjogJyNhcHAnLFxuICogICAgIHJvdXRlczogW1xuICogICAgICAgICB7IHBhdGg6ICcvJyB9LFxuICogICAgICAgICB7IHBhdGg6ICcvb25lJyB9LFxuICogICAgICAgICB7IHBhdGg6ICcvdHdvJyB9XG4gKiAgICAgXSxcbiAqIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogLSBmcm9tIHRoZSBzZWNvbmQgdGltZSBvbndhcmRzXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoKTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IEFwcENvbnRleHQgPSAob3B0aW9ucz86IEFwcENvbnRleHRPcHRpb25zKTogQXBwQ29udGV4dCA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IGdldEFwcENvbmZpZyhPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWFpbjogJyNhcHAnLFxuICAgICAgICBzdGFydDogZmFsc2UsXG4gICAgICAgIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uOiAnYmFja2J1dHRvbicsXG4gICAgfSwgb3B0aW9ucykgYXMgQXBwQ29udGV4dE9wdGlvbnMpO1xuXG4gICAgaWYgKG51bGwgPT0gb3B0aW9ucyAmJiBudWxsID09IF9hcHBDb250ZXh0KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCwgJ0FwcENvbnRleHQgc2hvdWxkIGJlIGluaXRpYWxpemVkIHdpdGggb3B0aW9ucyBhdCBsZWFzdCBvbmNlLicpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLnJlc2V0KSB7XG4gICAgICAgIF9hcHBDb250ZXh0ID0gdW5kZWZpbmVkO1xuICAgICAgICBjbGVhckkxOE5TZXR0aW5ncygpO1xuICAgIH1cblxuICAgIGlmICghX2FwcENvbnRleHQpIHtcbiAgICAgICAgX2FwcENvbnRleHQgPSBuZXcgQXBwbGljYXRpb24ob3B0cyk7XG4gICAgfVxuICAgIHJldHVybiBfYXBwQ29udGV4dDtcbn07XG4iLCJpbXBvcnQgeyBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucywgVmlldyB9IGZyb20gJ0BjZHAvdmlldyc7XG5pbXBvcnQge1xuICAgIFJvdXRlcixcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBQYWdlLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyBDc3NOYW1lLCBoYXNQYXJ0aWFsQ2xhc3NOYW1lIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3BhZ2Utdmlldzpwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcm91dGU/OiBSb3V0ZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBvZiB7QGxpbmsgVmlld30gdGhhdCBjYW4gYmUgc3BlY2lmaWVkIGluIGFzIHtAbGluayBQYWdlfSBvZiB7QGxpbmsgUm91dGVyfS5cbiAqIEBqYSB7QGxpbmsgUm91dGVyfSDjga4ge0BsaW5rIFBhZ2V9IOOBq+aMh+WumuWPr+iDveOBqiB7QGxpbmsgVmlld30g44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQYWdlVmlldzxURWxlbWVudCBleHRlbmRzIEVsZW1lbnQgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIFBhZ2Uge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHJvdXRlXG4gICAgICogIC0gYGVuYCByb3V0ZSBjb250ZXh0XG4gICAgICogIC0gYGphYCDjg6vjg7zjg4jjgrPjg7Pjg4bjgq3jgrnjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAge0BsaW5rIFZpZXd9IGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAge0BsaW5rIFZpZXd9IOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJvdXRlPzogUm91dGUsIG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0geyByb3V0ZSB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIHBhZ2UgaXMgYWN0aXZlLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5bjgafjgYLjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgYWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gaGFzUGFydGlhbENsYXNzTmFtZSh0aGlzLmVsLCBDc3NOYW1lLlBBR0VfQ1VSUkVOVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJvdXRlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYWdlIChwdWJsaWMpLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgavntJDjgaXjgY/jg6vjg7zjg4jjg4fjg7zjgr8gKOWFrOmWi+eUqClcbiAgICAgKi9cbiAgICBnZXQgWydAcm91dGUnXSgpOiBSb3V0ZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIFJvdXRlcn0gaW5zdGFuY2VcbiAgICAgKiBAamEge0BsaW5rIFJvdXRlcn0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcm91dGUoKTogUm91dGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1snQHJvdXRlJ107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBSb3V0ZXJ9IGluc3RhbmNlXG4gICAgICogQGphIHtAbGluayBSb3V0ZXJ9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3JvdXRlcigpOiBSb3V0ZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucm91dGU/LnJvdXRlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczogdXRpbGl6ZWQgcGFnZSBldmVudFxuXG4gICAgLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBuZXdseSBjb25zdHJ1Y3RlZCBieSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabmlrDopo/jgavmp4vnr4njgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlSW5pdCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VNb3VudGVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGNsb25lZCBhbmQgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM6KSH6KO944GV44KMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQ2xvbmVkKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgcmVhZHkgdG8gYmUgYWN0aXZhdGVkIGFmdGVyIGluaXRpYWxpemF0aW9uLlxuICAgICAqIEBqYSDliJ3mnJ/ljJblvowsIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODmeODvOODiOWPr+iDveOBqueKtuaFi+OBq+OBquOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VCZWZvcmVFbnRlcih0aGlzUGFnZTogUm91dGUsIHByZXZQYWdlOiBSb3V0ZSB8IHVuZGVmaW5lZCwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgZnVsbHkgZGlzcGxheWVkLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzlrozlhajjgavooajnpLrjgZXjgozjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQWZ0ZXJFbnRlcih0aGlzUGFnZTogUm91dGUsIHByZXZQYWdlOiBSb3V0ZSB8IHVuZGVmaW5lZCwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBwYWdlIGdvZXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavnp7vooYzjgZnjgovnm7TliY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQmVmb3JlTGVhdmUodGhpc1BhZ2U6IFJvdXRlLCBuZXh0UGFnZTogUm91dGUsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSBpcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+OBquOBo+OBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VBZnRlckxlYXZlKHRoaXNQYWdlOiBSb3V0ZSwgbmV4dFBhZ2U6IFJvdXRlLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXRhY2hlZCBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBi+OCieWIh+OCiumbouOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VVbm1vdW50ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRlc3Ryb3llZCBieSB0aGUgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm56C05qOE44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZVJlbW92ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBQYWdlXG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBuZXdseSBjb25zdHJ1Y3RlZCBieSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabmlrDopo/jgavmp4vnr4njgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlSW5pdChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIGNvbnN0IHsgZWwgfSA9IHRvO1xuICAgICAgICBpZiAoZWwgIT09IHRoaXMuZWwgYXMgdW5rbm93bikge1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGVsIGFzIHVua25vd24gYXMgVEVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUluaXQodG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VNb3VudGVkKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0byB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlTW91bnRlZCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGNsb25lZCBhbmQgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM6KSH6KO944GV44KMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQ2xvbmVkKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQ2xvbmVkKHRvLCBmcm9tISk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIHJlYWR5IHRvIGJlIGFjdGl2YXRlZCBhZnRlciBpbml0aWFsaXphdGlvbi5cbiAgICAgKiBAamEg5Yid5pyf5YyW5b6MLCDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5njg7zjg4jlj6/og73jgarnirbmhYvjgavjgarjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQmVmb3JlRW50ZXIodG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgZnVsbHkgZGlzcGxheWVkLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzlrozlhajjgavooajnpLrjgZXjgozjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQWZ0ZXJFbnRlcihpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VBZnRlckVudGVyKHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBqdXN0IGJlZm9yZSB0aGUgcGFnZSBnb2VzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr56e76KGM44GZ44KL55u05YmN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUJlZm9yZUxlYXZlKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gZnJvbSE7XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUJlZm9yZUxlYXZlKGZyb20hLCB0bywgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UgaXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavjgarjgaPjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQWZ0ZXJMZWF2ZShpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20hO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VBZnRlckxlYXZlKGZyb20hLCB0bywgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXRhY2hlZCBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBi+OCieWIh+OCiumbouOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VVbm1vdW50ZWQoaW5mbzogUm91dGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5vblBhZ2VVbm1vdW50ZWQoaW5mbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGVzdHJveWVkIGJ5IHRoZSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabnoLTmo4TjgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlUmVtb3ZlZChpbmZvOiBSb3V0ZSk6IHZvaWQge1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMub25QYWdlUmVtb3ZlZChpbmZvKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7QUFJRztBQUVILENBQUEsWUFBcUI7QUFNakI7OztBQUdHO0FBQ0gsSUFBQSxJQUdDLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQSxDQUFBO0FBSEQsSUFBQSxDQUFBLFlBQXVCO0FBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsYUFBc0MsQ0FBQTtRQUN0QyxXQUEyQyxDQUFBLFdBQUEsQ0FBQSwwQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsNkJBQXNCLENBQUMsRUFBRSwrREFBK0QsQ0FBQyxDQUFBLEdBQUEsMENBQUEsQ0FBQTtBQUNqTCxLQUFDLEdBQUEsQ0FBQTtBQUNMLENBQUMsR0FBQTs7QUNuQkQsaUJBQXdCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDOztBQ1E5RDtBQUNPLE1BQU0sbUJBQW1CLEdBQUcsQ0FBb0IsRUFBSyxFQUFFLFNBQWlCLEtBQWE7QUFDeEYsSUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUU7QUFDN0IsUUFBQSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7QUFDMUIsWUFBQSxPQUFPLElBQUksQ0FBQztBQUNmLFNBQUE7QUFDSixLQUFBO0FBQ0QsSUFBQSxPQUFPLEtBQUssQ0FBQztBQUNqQixDQUFDLENBQUM7QUFFRjtBQUVBO0FBQ08sTUFBTSxpQkFBaUIsR0FBRyxNQUFXO0lBQ3hDLE1BQU0sT0FBTyxHQUF5QixJQUFJLENBQUM7SUFDM0MsT0FBTyxPQUFPLENBQUMsT0FB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