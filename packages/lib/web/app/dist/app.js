/*!
 * @cdp/app 0.9.16
 *   application context
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/promise'), require('@cdp/result'), require('@cdp/web-utils'), require('@cdp/dom'), require('@cdp/i18n'), require('@cdp/router'), require('@cdp/view')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/promise', '@cdp/result', '@cdp/web-utils', '@cdp/dom', '@cdp/i18n', '@cdp/router', '@cdp/view'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, events, promise, result, webUtils, dom, i18n, router, view) { 'use strict';

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

    /** @internal */ const window = coreUtils.safe(globalThis.window);

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
        const context = i18n.i18n;
        delete context['options'];
        delete context['language'];
        delete context['languages'];
        delete context['isInitialized'];
    };
    /** @internal */
    const getAppConfig = (base) => {
        return Object.assign({}, coreUtils.getConfig(), // CDP.Config
        coreUtils.getGlobalNamespace('Config'), // global Config
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
    class Application extends events.EventPublisher {
        _window;
        _router;
        _ready = new promise.Deferred();
        _extension;
        constructor(options) {
            super();
            const { main, window: win } = options;
            this._window = win || window;
            this._router = router.createRouter(main, options);
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
            const $window = dom.dom(this._window);
            return ($window.width() < $window.height()) ? "portrait" /* Orientation.PORTRAIT */ : "landscape" /* Orientation.LANDSCAPE */;
        }
        get extension() {
            return this._extension;
        }
        set extension(val) {
            this._extension = val;
        }
        async changeLanguage(lng, options) {
            const t = await i18n.changeLanguage(lng, options);
            await this._router.refresh(2 /* RouterRefreshLevel.DOM_CLEAR */);
            this.publish('languagechange', i18n.getLanguage(), t);
            return t;
        }
        ///////////////////////////////////////////////////////////////////////
        // private methods:
        async initialize(options) {
            const { splash, i18n: i18n$1, waitForReady, documentEventReady, documentEventBackButton } = options;
            const { _window } = this;
            _window.addEventListener('error', this.onGlobalError.bind(this));
            _window.addEventListener('unhandledrejection', this.onGlobalUnhandledRejection.bind(this));
            await waitDomContentLoaded(_window.document);
            await Promise.all([
                i18n.initializeI18N(i18n$1),
                coreUtils.isFunction(waitForReady) ? waitForReady(this) : waitForReady,
                waitDocumentEventReady(_window.document, documentEventReady),
            ]);
            _window.document.addEventListener(documentEventBackButton, this.onHandleBackKey.bind(this));
            _window.addEventListener('orientationchange', this.onHandleOrientationChanged.bind(this));
            this._router.on('loaded', this.onPageLoaded.bind(this));
            this._router.register(_initialPages, false);
            await this._router.go();
            // remove splash screen
            dom.dom(splash, _window.document).remove();
            this._ready.resolve();
            this.publish('ready', this);
        }
        ///////////////////////////////////////////////////////////////////////
        // event handlers:
        onPageLoaded(info) {
            i18n.localize(info.to.el);
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
            await webUtils.waitFrame(1, requestAnimationFrame);
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
            throw result.makeResult(result.RESULT_CODE.ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED, 'AppContext should be initialized with options at least once.');
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
    class PageView extends view.View {
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
            const { el } = to;
            if (el !== this.el) {
                this.setElement(el);
            }
            return this.onPageMounted(to);
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

    exports.AppContext = AppContext;
    exports.PageView = PageView;
    exports.registerPage = registerPage;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaW50ZXJuYWwudHMiLCJjb250ZXh0LnRzIiwicGFnZS12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbWF4LWxlbixcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBUFAgPSBDRFBfS05PV05fTU9EVUxFLkFQUCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBUFBfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFQUCArIDEsICdBcHBDb250ZXh0IG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgd2l0aCBvcHRpb25zIGF0IGxlYXN0IG9uY2UuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbiIsImltcG9ydCB7IGdldEdsb2JhbE5hbWVzcGFjZSwgZ2V0Q29uZmlnIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2kxOG4nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDc3NOYW1lIHtcbiAgICBQQUdFX0NVUlJFTlQgID0gJ3BhZ2UtY3VycmVudCcsXG4gICAgUEFHRV9QUkVWSU9VUyA9ICdwYWdlLXByZXZpb3VzJyxcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJ0aWFsIG1hdGNoIGNsYXNzIG5hbWUgKi9cbmV4cG9ydCBjb25zdCBoYXNQYXJ0aWFsQ2xhc3NOYW1lID0gPFQgZXh0ZW5kcyBFbGVtZW50PihlbDogVCwgY2xhc3NOYW1lOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZWwuY2xhc3NMaXN0KSB7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGZvcmNlIGNsZWFyIGkxOG4gc2V0dGluZ3MgKi9cbmV4cG9ydCBjb25zdCBjbGVhckkxOE5TZXR0aW5ncyA9ICgpOiB2b2lkID0+IHtcbiAgICBjb25zdCBjb250ZXh0OiBQYXJ0aWFsPHR5cGVvZiBpMThuPiA9IGkxOG47XG4gICAgZGVsZXRlIGNvbnRleHRbJ29wdGlvbnMnXTtcbiAgICBkZWxldGUgY29udGV4dFsnbGFuZ3VhZ2UnXTtcbiAgICBkZWxldGUgY29udGV4dFsnbGFuZ3VhZ2VzJ107XG4gICAgZGVsZXRlIGNvbnRleHRbJ2lzSW5pdGlhbGl6ZWQnXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBnZXRBcHBDb25maWcgPSA8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCk6IFQgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgICAgICB7fSxcbiAgICAgICAgZ2V0Q29uZmlnPFQ+KCksICAgICAgICAgICAgICAgICAgLy8gQ0RQLkNvbmZpZ1xuICAgICAgICBnZXRHbG9iYWxOYW1lc3BhY2U8VD4oJ0NvbmZpZycpLCAvLyBnbG9iYWwgQ29uZmlnXG4gICAgICAgIGJhc2UsXG4gICAgKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIERPTUNvbnRlbnRMb2FkZWQgKi9cbmV4cG9ydCBjb25zdCB3YWl0RG9tQ29udGVudExvYWRlZCA9IGFzeW5jIChjb250ZXh0OiBEb2N1bWVudCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICdsb2FkaW5nJyA9PT0gY29udGV4dC5yZWFkeVN0YXRlICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCByZXNvbHZlLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfSk7XG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBjdXN0b20gZG9jdW1lbnQgZXZlbnQgcmVhZHkqL1xuZXhwb3J0IGNvbnN0IHdhaXREb2N1bWVudEV2ZW50UmVhZHkgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQsIGV2ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBudWxsICE9IGV2ZW50ICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgSTE4Tk9wdGlvbnMsXG4gICAgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyLFxuICAgIGluaXRpYWxpemVJMThOLFxuICAgIGxvY2FsaXplLFxuICAgIGdldExhbmd1YWdlLFxuICAgIGNoYW5nZUxhbmd1YWdlLFxuICAgIGkxOG4sXG59IGZyb20gJ0BjZHAvaTE4bic7XG5pbXBvcnQge1xuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXJSZWZyZXNoTGV2ZWwsXG4gICAgUm91dGVyLFxuICAgIFBhZ2UsXG4gICAgY3JlYXRlUm91dGVyLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIGNsZWFySTE4TlNldHRpbmdzLFxuICAgIGdldEFwcENvbmZpZyxcbiAgICB3YWl0RG9tQ29udGVudExvYWRlZCxcbiAgICB3YWl0RG9jdW1lbnRFdmVudFJlYWR5LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gYG9yaWVudGF0aW9uYCBpZGVudGlmaWVyXG4gKiBAamEgYG9yaWVudGF0aW9uYCDorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT3JpZW50YXRpb24ge1xuICAgIFBPUlRSQUlUICA9ICdwb3J0cmFpdCcsXG4gICAgTEFORFNDQVBFID0gJ2xhbmRzY2FwZScsXG59XG5cbi8qKlxuICogQGVuIFRoZSBldmVudCBkZWZpbml0aW9uIGZpcmVkIGluIFtbQXBwQ29udGV4dF1dLlxuICogQGphIFtbQXBwQ29udGV4dF1dIOWGheOBi+OCieeZuuihjOOBleOCjOOCi+OCpOODmeODs+ODiOWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRFdmVudCB7XG4gICAgLyoqXG4gICAgICogQGVuIEFwcGxpY2F0aW9uIHJlYWR5IG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG6YCa55+lXG4gICAgICogQGFyZ3MgW2NvbnRleHRdXG4gICAgICovXG4gICAgJ3JlYWR5JzogW0FwcENvbnRleHRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEhhcmR3YXJlIGJhY2sgYnV0dG9uIHByZXNzIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44OP44O844OJ44Km44Kn44Ki44OQ44OD44Kv44Oc44K/44Oz44Gu5oq85LiL6YCa55+lXG4gICAgICogQGFyZ3MgW0V2ZW50XVxuICAgICAqL1xuICAgICdiYWNrYnV0dG9uJzogW0V2ZW50XTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXZpY2Ugb3JpZW50YXRpb24gY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44OH44OQ44Kk44K544Kq44Oq44Ko44Oz44OG44O844K344On44Oz5aSJ5pu06YCa55+lXG4gICAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9XZWIvQVBJL1dpbmRvdy9vcmllbnRhdGlvbmNoYW5nZV9ldmVudFxuICAgICAqIEBhcmdzIFtPcmllbnRhaW9uLCBhbmdsZV1cbiAgICAgKi9cbiAgICAnb3JpZW50YXRpb25jaGFuZ2UnOiBbT3JpZW50YXRpb24sIG51bWJlcl07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbGljYXRpb24gbGFuZ3VnYXRlIGNoYW5nZSBub3RpZmljYXRpb24uXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+iogOiqnuWkieabtOmAmuefpVxuICAgICAqIEBhcmdzIFtsYW5ndWFnZSwgaTE4bi5URnVuY3Rpb25dXG4gICAgICovXG4gICAgJ2xhbmd1YWdlY2hhbmdlJzogW3N0cmluZywgaTE4bi5URnVuY3Rpb25dO1xufVxuXG4vKipcbiAqIEBlbiBbW0FwcENvbnRleHRdXSBjcmVhdGUgb3B0aW9ucy5cbiAqIEBqYSBbW0FwcENvbnRleHRdXSDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0T3B0aW9ucyBleHRlbmRzIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dIGZvciBtYWluIHJvdXRlci5cbiAgICAgKiBAamEg44Oh44Kk44Oz44Or44O844K/44O844GuIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQGRlZmF1bHQgYCNhcHBgXG4gICAgICovXG4gICAgbWFpbj86IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dIGFzc2lnbmVkIHRvIHRoZSBzcGxhc2ggc2NyZWVuLiA8YnI+XG4gICAgICogICAgIEl0IHdpbGwgYmUgcmVtb3ZlZCBqdXN0IGJlZm9yZSBhcHBsaWFjdGlvbiByZWFkeS5cbiAgICAgKiBAamEg44K544OX44Op44OD44K344Ol44K544Kv44Oq44O844Oz44Gr5Ymy44KK5b2T44Gm44KJ44KM44Gm44GE44KLIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXIDxicj5cbiAgICAgKiAgICAg5rqW5YKZ5a6M5LqG55u05YmN44Gr5YmK6Zmk44GV44KM44KLXG4gICAgICovXG4gICAgc3BsYXNoPzogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIExvY2FsaXphdGlvbiBtb2R1bGUgb3B0aW9ucy5cbiAgICAgKiBAamEg44Ot44O844Kr44Op44Kk44K644Oi44K444Ol44O844Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgaTE4bj86IEkxOE5PcHRpb25zO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1c3RvbSBzdGFuZC1ieSBmdW5jdGlvbiBmb3IgYXBwbGljYXRpb24gcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6huOBruOBn+OCgeOBruW+heOBoeWPl+OBkemWouaVsFxuICAgICAqL1xuICAgIHdhaXRGb3JSZWFkeT86IFByb21pc2U8dW5rbm93bj4gfCAoKGNvbnRleHQ6IEFwcENvbnRleHQpID0+IFByb21pc2U8dW5rbm93bj4pO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1c3RvbSBgZG9jdW1lbnRgIGV2ZW50IGZvciBhcHBsaWNhdGlvbiByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG44Gu44Gf44KB44Gu44Kr44K544K/44OgIGBkb2N1bWVudGAg44Kk44OZ44Oz44OIXG4gICAgICovXG4gICAgZG9jdW1lbnRFdmVudFJlYWR5Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1c3RvbSBgZG9jdW1lbnRgIGV2ZW50IGZvciBoYXJkd2FyZSBiYWNrIGJ1dHRvbi4gZGVmYXVsdDogYGJhY2tidXR0b25gXG4gICAgICogQGphIOODj+ODvOODieOCpuOCp+OCouODkOODg+OCr+ODnOOCv+ODs+OBruOBn+OCgeOBruOCq+OCueOCv+ODoCBgZG9jdW1lbnRgIOOCpOODmeODs+ODiC4g5pei5a6a5YCkIGBiYWNrYnV0dG9uYFxuICAgICAqL1xuICAgIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFNwZWNpZnkgdHJ1ZSB0byBkZXN0cm95IHRoZSBpbnN0YW5jZSBjYWNoZSBhbmQgcmVzZXQuIChmb3IgZGVidWcpXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCreODo+ODg+OCt+ODpeOCkuegtOajhOOBl+ODquOCu+ODg+ODiOOBmeOCi+WgtOWQiOOBqyB0cnVlIOOCkuaMh+WumiAo44OH44OQ44OD44Kw55SoKVxuICAgICAqL1xuICAgIHJlc2V0PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gQXBwbGljYXRpb24gY29udGV4dCBpbnRlcmZhY2VcbiAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0IGV4dGVuZHMgU3Vic2NyaWJhYmxlPEFwcENvbnRleHRFdmVudD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBtYWluIHJvdXRlciBpbnRlcmZhY2VcbiAgICAgKiBAamEg44Oh44Kk44Oz44Or44O844K/44O8XG4gICAgICovXG4gICAgcmVhZG9ubHkgcm91dGVyOiBSb3V0ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYFByb21pc2VgIGZvciByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg5rqW5YKZ5a6M5LqG56K66KqN55SoIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICByZWFkb25seSByZWFkeTogUHJvbWlzZTx2b2lkPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXJyZW50IGFjdGl2ZSBwYWdlIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjjgqLjgq/jg4bjgqPjg5bjgarjg5rjg7zjgrjjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWFkb25seSBhY3RpdmVQYWdlOiBQYWdlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1cnJlbnQgW1tPcmllbnRhdGlvbl1dIGlkLlxuICAgICAqIEBqYSDnj77lnKjjga4gW1tPcmllbnRhdGlvbl1dIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IG9yaWVudGF0aW9uOiBPcmllbnRhdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVc2VyLWRlZmluYWJsZSBleHRlbmRlZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg44Om44O844K244O85a6a576p5Y+v6IO944Gq5ouh5by144OX44Ot44OR44OG44KjXG4gICAgICovXG4gICAgZXh0ZW5zaW9uOiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZXMgdGhlIGxhbmd1YWdlLlxuICAgICAqIEBqYSDoqIDoqp7jga7liIfjgormm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsbmdcbiAgICAgKiAgLSBgZW5gIGxvY2FsZSBzdHJpbmcgZXg6IGBlbmAsIGBlbi1VU2BcbiAgICAgKiAgLSBgamFgIOODreOCseODvOODq+aWh+WtlyBleDogYGVuYCwgYGVuLVVTYFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBlcnJvciBiZWhhdmlvdXJcbiAgICAgKiAgLSBgamFgIOOCqOODqeODvOaZguOBruaMr+OCi+iInuOBhOOCkuaMh+WumlxuICAgICAqL1xuICAgIGNoYW5nZUxhbmd1YWdlKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBfaW5pdGlhbFBhZ2VzOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuXG4vKipcbiAqIEBlbiBSb3V0ZSBwYXJhbWV0ZXJzIGZvciBwYWdlIHJlZ2lzdHJhdGlvbi4gTmVlZCB0byBkZXNjcmliZSBgcGF0aGAsIGBjb21wb25lbnRgLCBgY29udGVudGAuXG4gKiBAamEg44Oa44O844K455m76Yyy55So44Or44O844OI44OR44Op44Oh44O844K/LiBgcGF0aGAsIGBjb21wb25lbnRgLCBgY29udGVudGAg44Gu6KiY6L+w44GM5b+F6KaBXG4gKi9cbmV4cG9ydCB0eXBlIFBhZ2VSb3V0ZVBhcmFtZXRlcnMgPSBSZXF1aXJlZDxQaWNrPFJvdXRlUGFyYW1ldGVycywgJ2NvbXBvbmVudCcgfCAnY29udGVudCc+PiAmIFJvdXRlUGFyYW1ldGVycztcblxuLyoqXG4gKiBAZW4gUHJlLXJlZ2lzdGVyIGNvbmNyZXRlIFtbUGFnZV1dIGNsYXNzLiBSZWdpc3RlcmVkIHdpdGggdGhlIG1haW4gcm91dGVyIHdoZW4gaW5zdGFudGlhdGluZyBbW0FwcENvbnRleHRdXS4gPGJyPlxuICogICAgIElmIGNvbnN0cnVjdG9yIG5lZWRzIGFyZ3VtZW50cywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2AgaXMgYXZhaWxhYmxlLlxuICogQGphIFBhZ2Ug5YW36LGh5YyW44Kv44Op44K544Gu5LqL5YmN55m76YyyLiBbW0FwcENvbnRleHRdXSDjga7jgqTjg7Pjgrnjgr/jg7PjgrnljJbmmYLjgavjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjgavnmbvpjLLjgZXjgozjgosuIDxicj5cbiAqICAgICBjb25zdHJ1Y3RvciDjgpLmjIflrprjgZnjgovlvJXmlbDjgYzjgYLjgovloLTlkIjjga8sIGBvcHRpb25zLmNvbXBvbmVudE9wdGlvbnNgIOOCkuWIqeeUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgICBQYWdlLFxuICogICAgIFJvdXRlcixcbiAqICAgICBBcHBDb250ZXh0LFxuICogICAgIHJlZ2lzdGVyUGFnZSxcbiAqIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBjb25zdCBwYWdlRmFjdG9yeSA9IChyb3V0ZXI6IFJvdXRlciwgLi4uYXJnczogYW55W10pOiBQYWdlID0+IHtcbiAqICAgOlxuICogfTtcbiAqIFxuICogLy8gcHJlLXJlZ2lzdHJhdGlvblxuICogcmVnaXN0ZXJQYWdlKHtcbiAqICAgICBwYXRoOiAncGFnZS1wYXRoJyxcbiAqICAgICBjb25wb25lbnQ6IHBhZ2VGYWN0b3J5LFxuICogICAgIGNvbnRlbnQ6ICcjcGFnZS1pZCdcbiAqIH0pO1xuICpcbiAqIC8vIGluaXRpYWwgYWNjZXNzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KHsgbWFpbjogJyNhcHAnIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgcm91dGUgcGF0aFxuICogIC0gYGphYCDjg6vjg7zjg4jjga7jg5HjgrlcbiAqIEBwYXJhbSBjb21wb25lbnRcbiAqICAtIGBlbmAgc3BlY2lmeSB0aGUgY29uc3RydWN0b3Igb3IgYnVpbHQgb2JqZWN0IG9mIHRoZSBwYWdlIGNvbXBvbmVudFxuICogIC0gYGphYCDjg5rjg7zjgrjjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgoLjgZfjgY/jga/mp4vnr4nmuIjjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJvdXRlIHBhcmFtZXRlcnNcbiAqICAtIGBqYWAg44Or44O844OI44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCBjb25zdCByZWdpc3RlclBhZ2UgPSAocGFyYW1zOiBQYWdlUm91dGVQYXJhbWV0ZXJzKTogdm9pZCA9PiB7XG4gICAgX2luaXRpYWxQYWdlcy5wdXNoKHBhcmFtcyk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEFwcENvbnRleHQgaW1wbCBjbGFzcyAqL1xuY2xhc3MgQXBwbGljYXRpb24gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxBcHBDb250ZXh0RXZlbnQ+IGltcGxlbWVudHMgQXBwQ29udGV4dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfd2luZG93OiBXaW5kb3c7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm91dGVyOiBSb3V0ZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcmVhZHkgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICBwcml2YXRlIF9leHRlbnNpb246IHVua25vd247XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCB7IG1haW4sIHdpbmRvdzogd2luIH0gPSBvcHRpb25zO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW4gfHwgd2luZG93O1xuICAgICAgICB0aGlzLl9yb3V0ZXIgPSBjcmVhdGVSb3V0ZXIobWFpbiBhcyBzdHJpbmcsIG9wdGlvbnMpO1xuICAgICAgICB2b2lkIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBBcHBDb250ZXh0XG5cbiAgICBnZXQgcm91dGVyKCk6IFJvdXRlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXI7XG4gICAgfVxuXG4gICAgZ2V0IHJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHk7XG4gICAgfVxuXG4gICAgZ2V0IGFjdGl2ZVBhZ2UoKTogUGFnZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXIuY3VycmVudFJvdXRlWydAcGFyYW1zJ10/LnBhZ2UgfHwge307XG4gICAgfVxuXG4gICAgZ2V0IG9yaWVudGF0aW9uKCk6IE9yaWVudGF0aW9uIHtcbiAgICAgICAgY29uc3QgJHdpbmRvdyA9ICQodGhpcy5fd2luZG93KTtcbiAgICAgICAgcmV0dXJuICgkd2luZG93LndpZHRoKCkgPCAkd2luZG93LmhlaWdodCgpKSA/IE9yaWVudGF0aW9uLlBPUlRSQUlUIDogT3JpZW50YXRpb24uTEFORFNDQVBFO1xuICAgIH1cblxuICAgIGdldCBleHRlbnNpb24oKTogdW5rbm93biB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHRlbnNpb247XG4gICAgfVxuXG4gICAgc2V0IGV4dGVuc2lvbih2YWw6IHVua25vd24pIHtcbiAgICAgICAgdGhpcy5fZXh0ZW5zaW9uID0gdmFsO1xuICAgIH1cblxuICAgIGFzeW5jIGNoYW5nZUxhbmd1YWdlKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4ge1xuICAgICAgICBjb25zdCB0ID0gYXdhaXQgY2hhbmdlTGFuZ3VhZ2UobG5nLCBvcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fcm91dGVyLnJlZnJlc2goUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUik7XG4gICAgICAgIHRoaXMucHVibGlzaCgnbGFuZ3VhZ2VjaGFuZ2UnLCBnZXRMYW5ndWFnZSgpLCB0KTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFwcENvbnRleHRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgc3BsYXNoLCBpMThuLCB3YWl0Rm9yUmVhZHksIGRvY3VtZW50RXZlbnRSZWFkeSwgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24gfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgX3dpbmRvdyB9ID0gdGhpcztcblxuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5vbkdsb2JhbEVycm9yLmJpbmQodGhpcykpO1xuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VuaGFuZGxlZHJlamVjdGlvbicsIHRoaXMub25HbG9iYWxVbmhhbmRsZWRSZWplY3Rpb24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgYXdhaXQgd2FpdERvbUNvbnRlbnRMb2FkZWQoX3dpbmRvdy5kb2N1bWVudCk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIGluaXRpYWxpemVJMThOKGkxOG4pLFxuICAgICAgICAgICAgaXNGdW5jdGlvbih3YWl0Rm9yUmVhZHkpID8gd2FpdEZvclJlYWR5KHRoaXMpIDogd2FpdEZvclJlYWR5LFxuICAgICAgICAgICAgd2FpdERvY3VtZW50RXZlbnRSZWFkeShfd2luZG93LmRvY3VtZW50LCBkb2N1bWVudEV2ZW50UmVhZHkpLFxuICAgICAgICBdKTtcblxuICAgICAgICBfd2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnRFdmVudEJhY2tCdXR0b24gYXMgc3RyaW5nLCB0aGlzLm9uSGFuZGxlQmFja0tleS5iaW5kKHRoaXMpKTtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fcm91dGVyLm9uKCdsb2FkZWQnLCB0aGlzLm9uUGFnZUxvYWRlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5fcm91dGVyLnJlZ2lzdGVyKF9pbml0aWFsUGFnZXMsIGZhbHNlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fcm91dGVyLmdvKCk7XG5cbiAgICAgICAgLy8gcmVtb3ZlIHNwbGFzaCBzY3JlZW5cbiAgICAgICAgJChzcGxhc2gsIF93aW5kb3cuZG9jdW1lbnQpLnJlbW92ZSgpO1xuXG4gICAgICAgIHRoaXMuX3JlYWR5LnJlc29sdmUoKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdyZWFkeScsIHRoaXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgcHJpdmF0ZSBvblBhZ2VMb2FkZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB7XG4gICAgICAgIGxvY2FsaXplKGluZm8udG8uZWwpO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25HbG9iYWxFcnJvcihldmVudDogRXJyb3JFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbR2xvYmFsIEVycm9yXSAke2V2ZW50Lm1lc3NhZ2V9LCAke2V2ZW50LmZpbGVuYW1lfSwgJHtldmVudC5jb2xub30sICR7ZXZlbnQuZXJyb3J9YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkdsb2JhbFVuaGFuZGxlZFJlamVjdGlvbihldmVudDogUHJvbWlzZVJlamVjdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtHbG9iYWwgVW5oYW5kbGVkIFJlamVjdGlvbl0gJHtldmVudC5yZWFzb259YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkhhbmRsZUJhY2tLZXkoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaCgnYmFja2J1dHRvbicsIGV2ZW50KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9uSGFuZGxlT3JpZW50YXRpb25DaGFuZ2VkKC8qZXZlbnQ6IEV2ZW50Ki8pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsIHNjcmVlbiB9ID0gdGhpcy5fd2luZG93OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICBhd2FpdCB3YWl0RnJhbWUoMSwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub3JpZW50YXRpb24sIHNjcmVlbi5vcmllbnRhdGlvbi5hbmdsZSk7XG4gICAgfVxufVxuXG4vKiogY29udGV4dCBjYWNoZSAqL1xubGV0IF9hcHBDb250ZXh0OiBBcHBDb250ZXh0IHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGFjY2Vzc1xuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiOWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQXBwQ29udGV4dCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKiBgYGBcbiAqXG4gKiAtIGluaXRpYWwgYWNjZXNzXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoe1xuICogICAgIG1haW46ICcjYXBwJyxcbiAqICAgICByb3V0ZXM6IFtcbiAqICAgICAgICAgeyBwYXRoOiAnLycgfSxcbiAqICAgICAgICAgeyBwYXRoOiAnL29uZScgfSxcbiAqICAgICAgICAgeyBwYXRoOiAnL3R3bycgfVxuICogICAgIF0sXG4gKiB9KTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIC0gZnJvbSB0aGUgc2Vjb25kIHRpbWUgb253YXJkc1xuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KCk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBpbml0IG9wdGlvbnNcbiAqICAtIGBqYWAg5Yid5pyf5YyW44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBBcHBDb250ZXh0ID0gKG9wdGlvbnM/OiBBcHBDb250ZXh0T3B0aW9ucyk6IEFwcENvbnRleHQgPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBnZXRBcHBDb25maWcoT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIG1haW46ICcjYXBwJyxcbiAgICAgICAgc3RhcnQ6IGZhbHNlLFxuICAgICAgICBkb2N1bWVudEV2ZW50QmFja0J1dHRvbjogJ2JhY2tidXR0b24nLFxuICAgIH0sIG9wdGlvbnMpIGFzIEFwcENvbnRleHRPcHRpb25zKTtcblxuICAgIGlmIChudWxsID09IG9wdGlvbnMgJiYgbnVsbCA9PSBfYXBwQ29udGV4dCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FQUF9DT05URVhUX05FRURfVE9fQkVfSU5JVElBTElaRUQsICdBcHBDb250ZXh0IHNob3VsZCBiZSBpbml0aWFsaXplZCB3aXRoIG9wdGlvbnMgYXQgbGVhc3Qgb25jZS4nKTtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5yZXNldCkge1xuICAgICAgICBfYXBwQ29udGV4dCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY2xlYXJJMThOU2V0dGluZ3MoKTtcbiAgICB9XG5cbiAgICBpZiAoIV9hcHBDb250ZXh0KSB7XG4gICAgICAgIF9hcHBDb250ZXh0ID0gbmV3IEFwcGxpY2F0aW9uKG9wdHMpO1xuICAgIH1cbiAgICByZXR1cm4gX2FwcENvbnRleHQ7XG59O1xuIiwiaW1wb3J0IHsgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsIFZpZXcgfSBmcm9tICdAY2RwL3ZpZXcnO1xuaW1wb3J0IHtcbiAgICBSb3V0ZXIsXG4gICAgUm91dGUsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgUGFnZSxcbn0gZnJvbSAnQGNkcC9yb3V0ZXInO1xuaW1wb3J0IHsgQ3NzTmFtZSwgaGFzUGFydGlhbENsYXNzTmFtZSB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwYWdlLXZpZXc6cHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJvdXRlPzogUm91dGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gb2YgW1tWaWV3XV0gdGhhdCBjYW4gYmUgc3BlY2lmaWVkIGluIGFzIFtbUGFnZV1dIG9mIFtbUm91dGVyXV0uXG4gKiBAamEgW1tSb3V0ZXJdXSDjga4gW1tQYWdlXV0g44Gr5oyH5a6a5Y+v6IO944GqIFtbVmlld11dIOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUGFnZVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50ID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBQYWdlIHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3V0ZVxuICAgICAqICAtIGBlbmAgcm91dGUgY29udGV4dFxuICAgICAqICAtIGBqYWAg44Or44O844OI44Kz44Oz44OG44Kt44K544OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFtbVmlld11dIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgW1tWaWV3XV0g5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iocm91dGU/OiBSb3V0ZSwgb3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7IHJvdXRlIH07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgcGFnZSBpcyBhY3RpdmUuXG4gICAgICogQGphIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODluOBp+OBguOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBhY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBoYXNQYXJ0aWFsQ2xhc3NOYW1lKHRoaXMuZWwsIENzc05hbWUuUEFHRV9DVVJSRU5UKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUm91dGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIHBhZ2UgKHB1YmxpYykuXG4gICAgICogQGphIOODmuODvOOCuOOBq+e0kOOBpeOBj+ODq+ODvOODiOODh+ODvOOCvyAo5YWs6ZaL55SoKVxuICAgICAqL1xuICAgIGdldCBbJ0Byb3V0ZSddKCk6IFJvdXRlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW1JvdXRlcl1dIGluc3RhbmNlXG4gICAgICogQGphIFtbUm91dGVyXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcm91dGUoKTogUm91dGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1snQHJvdXRlJ107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbUm91dGVyXV0gaW5zdGFuY2VcbiAgICAgKiBAamEgW1tSb3V0ZXJdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9yb3V0ZXIoKTogUm91dGVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlPy5yb3V0ZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6IHV0aWxpemVkIHBhZ2UgZXZlbnRcblxuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUluaXQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlTW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyByZWFkeSB0byBiZSBhY3RpdmF0ZWQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGphIOWIneacn+WMluW+jCwg44Oa44O844K444GM44Ki44Kv44OG44Kj44OZ44O844OI5Y+v6IO944Gq54q25oWL44Gr44Gq44KL44Go55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUJlZm9yZUVudGVyKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlIHwgdW5kZWZpbmVkLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyBmdWxseSBkaXNwbGF5ZWQuXG4gICAgICogQGphIOODmuODvOOCuOOBjOWujOWFqOOBq+ihqOekuuOBleOCjOOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VBZnRlckVudGVyKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlIHwgdW5kZWZpbmVkLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIHBhZ2UgZ29lcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+enu+ihjOOBmeOCi+ebtOWJjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VCZWZvcmVMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUFmdGVyTGVhdmUodGhpc1BhZ2U6IFJvdXRlLCBuZXh0UGFnZTogUm91dGUsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRldGFjaGVkIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44GL44KJ5YiH44KK6Zui44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZVVubW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGVzdHJveWVkIGJ5IHRoZSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabnoLTmo4TjgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlUmVtb3ZlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFBhZ2VcblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIG5ld2x5IGNvbnN0cnVjdGVkIGJ5IHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuaWsOimj+OBq+ani+evieOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VJbml0KGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0byB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlSW5pdCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZU1vdW50ZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvIH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICBjb25zdCB7IGVsIH0gPSB0bztcbiAgICAgICAgaWYgKGVsICE9PSB0aGlzLmVsIGFzIHVua25vd24pIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChlbCBhcyB1bmtub3duIGFzIFRFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VNb3VudGVkKHRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgcmVhZHkgdG8gYmUgYWN0aXZhdGVkIGFmdGVyIGluaXRpYWxpemF0aW9uLlxuICAgICAqIEBqYSDliJ3mnJ/ljJblvowsIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODmeODvOODiOWPr+iDveOBqueKtuaFi+OBq+OBquOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHBhZ2VCZWZvcmVFbnRlcihpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VCZWZvcmVFbnRlcih0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyBmdWxseSBkaXNwbGF5ZWQuXG4gICAgICogQGphIOODmuODvOOCuOOBjOWujOWFqOOBq+ihqOekuuOBleOCjOOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHBhZ2VBZnRlckVudGVyKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUFmdGVyRW50ZXIodG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBwYWdlIGdvZXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavnp7vooYzjgZnjgovnm7TliY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSBmcm9tIGFzIFJvdXRlO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VCZWZvcmVMZWF2ZShmcm9tIGFzIFJvdXRlLCB0bywgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UgaXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavjgarjgaPjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQWZ0ZXJMZWF2ZShpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20gYXMgUm91dGU7XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUFmdGVyTGVhdmUoZnJvbSBhcyBSb3V0ZSwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgYvjgonliIfjgorpm6LjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlVW5tb3VudGVkKGluZm86IFJvdXRlKTogdm9pZCB7XG4gICAgICAgIHRoaXMub25QYWdlVW5tb3VudGVkKGluZm8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRlc3Ryb3llZCBieSB0aGUgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm56C05qOE44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZVJlbW92ZWQoaW5mbzogUm91dGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm9uUGFnZVJlbW92ZWQoaW5mbyk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJpMThuIiwiZ2V0Q29uZmlnIiwiZ2V0R2xvYmFsTmFtZXNwYWNlIiwiRXZlbnRQdWJsaXNoZXIiLCJEZWZlcnJlZCIsImNyZWF0ZVJvdXRlciIsIiQiLCJjaGFuZ2VMYW5ndWFnZSIsImdldExhbmd1YWdlIiwiaW5pdGlhbGl6ZUkxOE4iLCJpc0Z1bmN0aW9uIiwibG9jYWxpemUiLCJ3YWl0RnJhbWUiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJWaWV3Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7OztJQUtHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBR0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFIRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxhQUFzQyxDQUFBO1lBQ3RDLFdBQTJDLENBQUEsV0FBQSxDQUFBLDBDQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw2QkFBc0IsQ0FBQyxFQUFFLCtEQUErRCxDQUFDLENBQUEsR0FBQSwwQ0FBQSxDQUFBO0lBQ2pMLEtBQUMsR0FBQSxDQUFBO0lBQ0wsQ0FBQyxHQUFBOztJQ3BCRCxpQkFBd0IsTUFBTSxNQUFNLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDOztJQ1E5RDtJ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