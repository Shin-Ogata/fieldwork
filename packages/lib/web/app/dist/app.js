/*!
 * @cdp/app 0.9.15
 *   application context
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/events'), require('@cdp/promise'), require('@cdp/result'), require('@cdp/web-utils'), require('@cdp/dom'), require('@cdp/i18n'), require('@cdp/router'), require('@cdp/core-utils'), require('@cdp/view')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/events', '@cdp/promise', '@cdp/result', '@cdp/web-utils', '@cdp/dom', '@cdp/i18n', '@cdp/router', '@cdp/core-utils', '@cdp/view'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, events, promise, result, webUtils, dom, i18n, router, coreUtils, view) { 'use strict';

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
                waitForReady,
                waitDocumentEventReady(_window.document, documentEventReady),
            ]);
            _window.document.addEventListener(documentEventBackButton, this.onHandleBackKey.bind(this));
            _window.addEventListener('orientationchange', this.onHandleOrientationChanged.bind(this));
            this._router.on('loaded', this.onPageLoaded.bind(this));
            this._router.register(_initialPages, true);
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

    exports.AppContext = AppContext;
    exports.PageView = PageView;
    exports.registerPage = registerPage;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaW50ZXJuYWwudHMiLCJjb250ZXh0LnRzIiwicGFnZS12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbWF4LWxlbixcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBUFAgPSBDRFBfS05PV05fTU9EVUxFLkFQUCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBUFBfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFQUCArIDEsICdBcHBDb250ZXh0IG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgd2l0aCBvcHRpb25zIGF0IGxlYXN0IG9uY2UuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbiIsImltcG9ydCB7IGdldEdsb2JhbE5hbWVzcGFjZSwgZ2V0Q29uZmlnIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2kxOG4nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDc3NOYW1lIHtcbiAgICBQQUdFX0NVUlJFTlQgID0gJ3BhZ2UtY3VycmVudCcsXG4gICAgUEFHRV9QUkVWSU9VUyA9ICdwYWdlLXByZXZpb3VzJyxcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJ0aWFsIG1hdGNoIGNsYXNzIG5hbWUgKi9cbmV4cG9ydCBjb25zdCBoYXNQYXJ0aWFsQ2xhc3NOYW1lID0gPFQgZXh0ZW5kcyBFbGVtZW50PihlbDogVCwgY2xhc3NOYW1lOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZWwuY2xhc3NMaXN0KSB7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGZvcmNlIGNsZWFyIGkxOG4gc2V0dGluZ3MgKi9cbmV4cG9ydCBjb25zdCBjbGVhckkxOE5TZXR0aW5ncyA9ICgpOiB2b2lkID0+IHtcbiAgICBjb25zdCBjb250ZXh0OiBQYXJ0aWFsPHR5cGVvZiBpMThuPiA9IGkxOG47XG4gICAgZGVsZXRlIGNvbnRleHRbJ29wdGlvbnMnXTtcbiAgICBkZWxldGUgY29udGV4dFsnbGFuZ3VhZ2UnXTtcbiAgICBkZWxldGUgY29udGV4dFsnbGFuZ3VhZ2VzJ107XG4gICAgZGVsZXRlIGNvbnRleHRbJ2lzSW5pdGlhbGl6ZWQnXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBnZXRBcHBDb25maWcgPSA8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCk6IFQgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgICAgICB7fSxcbiAgICAgICAgZ2V0Q29uZmlnPFQ+KCksICAgICAgICAgICAgICAgICAgLy8gQ0RQLkNvbmZpZ1xuICAgICAgICBnZXRHbG9iYWxOYW1lc3BhY2U8VD4oJ0NvbmZpZycpLCAvLyBnbG9iYWwgQ29uZmlnXG4gICAgICAgIGJhc2UsXG4gICAgKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIERPTUNvbnRlbnRMb2FkZWQgKi9cbmV4cG9ydCBjb25zdCB3YWl0RG9tQ29udGVudExvYWRlZCA9IGFzeW5jIChjb250ZXh0OiBEb2N1bWVudCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICdsb2FkaW5nJyA9PT0gY29udGV4dC5yZWFkeVN0YXRlICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCByZXNvbHZlLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfSk7XG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBjdXN0b20gZG9jdW1lbnQgZXZlbnQgcmVhZHkqL1xuZXhwb3J0IGNvbnN0IHdhaXREb2N1bWVudEV2ZW50UmVhZHkgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQsIGV2ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBudWxsICE9IGV2ZW50ICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgeyBTdWJzY3JpYmFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyB3YWl0RnJhbWUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIEkxOE5PcHRpb25zLFxuICAgIGluaXRpYWxpemVJMThOLFxuICAgIGxvY2FsaXplLFxufSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyLFxuICAgIFBhZ2UsXG4gICAgY3JlYXRlUm91dGVyLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIGNsZWFySTE4TlNldHRpbmdzLFxuICAgIGdldEFwcENvbmZpZyxcbiAgICB3YWl0RG9tQ29udGVudExvYWRlZCxcbiAgICB3YWl0RG9jdW1lbnRFdmVudFJlYWR5LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gYG9yaWVudGF0aW9uYCBpZGVudGlmaWVyXG4gKiBAamEgYG9yaWVudGF0aW9uYCDorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT3JpZW50YXRpb24ge1xuICAgIFBPUlRSQUlUICA9ICdwb3J0cmFpdCcsXG4gICAgTEFORFNDQVBFID0gJ2xhbmRzY2FwZScsXG59XG5cbi8qKlxuICogQGVuIFRoZSBldmVudCBkZWZpbml0aW9uIGZpcmVkIGluIFtbQXBwQ29udGV4dF1dLlxuICogQGphIFtbQXBwQ29udGV4dF1dIOWGheOBi+OCieeZuuihjOOBleOCjOOCi+OCpOODmeODs+ODiOWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRFdmVudCB7XG4gICAgLyoqXG4gICAgICogQGVuIEFwcGxpY2F0aW9uIHJlYWR5IG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG6YCa55+lXG4gICAgICogQGFyZ3MgW2NvbnRleHRdXG4gICAgICovXG4gICAgJ3JlYWR5JzogW0FwcENvbnRleHRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEhhcmR3YXJlIGJhY2sgYnV0dG9uIHByZXNzIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44OP44O844OJ44Km44Kn44Ki44OQ44OD44Kv44Oc44K/44Oz44Gu5oq85LiL6YCa55+lXG4gICAgICogQGFyZ3MgW0V2ZW50XVxuICAgICAqL1xuICAgICdiYWNrYnV0dG9uJzogW0V2ZW50XTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXZpY2Ugb3JpZW50YXRpb24gY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44OH44OQ44Kk44K544Kq44Oq44Ko44Oz44OG44O844K344On44Oz5aSJ5pu06YCa55+lXG4gICAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9XZWIvQVBJL1dpbmRvdy9vcmllbnRhdGlvbmNoYW5nZV9ldmVudFxuICAgICAqIEBhcmdzIFtPcmllbnRhaW9uLCBhbmdsZV1cbiAgICAgKi9cbiAgICAnb3JpZW50YXRpb25jaGFuZ2UnOiBbT3JpZW50YXRpb24sIG51bWJlcl07XG59XG5cbi8qKlxuICogQGVuIFtbQXBwQ29udGV4dF1dIGNyZWF0ZSBvcHRpb25zLlxuICogQGphIFtbQXBwQ29udGV4dF1dIOani+evieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRPcHRpb25zIGV4dGVuZHMgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0gZm9yIG1haW4gcm91dGVyLlxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjga4gW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAZGVmYXVsdCBgI2FwcGBcbiAgICAgKi9cbiAgICBtYWluPzogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0gYXNzaWduZWQgdG8gdGhlIHNwbGFzaCBzY3JlZW4uIDxicj5cbiAgICAgKiAgICAgSXQgd2lsbCBiZSByZW1vdmVkIGp1c3QgYmVmb3JlIGFwcGxpYWN0aW9uIHJlYWR5LlxuICAgICAqIEBqYSDjgrnjg5fjg6njg4Pjgrfjg6Xjgrnjgq/jg6rjg7zjg7PjgavlibLjgorlvZPjgabjgonjgozjgabjgYTjgosgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcgPGJyPlxuICAgICAqICAgICDmupblgpnlrozkuobnm7TliY3jgavliYrpmaTjgZXjgozjgotcbiAgICAgKi9cbiAgICBzcGxhc2g/OiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTG9jYWxpemF0aW9uIG1vZHVsZSBvcHRpb25zLlxuICAgICAqIEBqYSDjg63jg7zjgqvjg6njgqTjgrrjg6Ljgrjjg6Xjg7zjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBpMThuPzogSTE4Tk9wdGlvbnM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIHN0YW5kLWJ5IGZ1bmN0aW9uIGZvciBhcHBsaWNhdGlvbiByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG44Gu44Gf44KB44Gu5b6F44Gh5Y+X44GR6Zai5pWwXG4gICAgICovXG4gICAgd2FpdEZvclJlYWR5PzogUHJvbWlzZTx2b2lkPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gYGRvY3VtZW50YCBldmVudCBmb3IgYXBwbGljYXRpb24gcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6huOBruOBn+OCgeOBruOCq+OCueOCv+ODoCBgZG9jdW1lbnRgIOOCpOODmeODs+ODiFxuICAgICAqL1xuICAgIGRvY3VtZW50RXZlbnRSZWFkeT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gYGRvY3VtZW50YCBldmVudCBmb3IgaGFyZHdhcmUgYmFjayBidXR0b24uIGRlZmF1bHQ6IGBiYWNrYnV0dG9uYFxuICAgICAqIEBqYSDjg4/jg7zjg4njgqbjgqfjgqLjg5Djg4Pjgq/jg5zjgr/jg7Pjga7jgZ/jgoHjga7jgqvjgrnjgr/jg6AgYGRvY3VtZW50YCDjgqTjg5njg7Pjg4guIOaXouWumuWApCBgYmFja2J1dHRvbmBcbiAgICAgKi9cbiAgICBkb2N1bWVudEV2ZW50QmFja0J1dHRvbj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBTcGVjaWZ5IHRydWUgdG8gZGVzdHJveSB0aGUgaW5zdGFuY2UgY2FjaGUgYW5kIHJlc2V0LiAoZm9yIGRlYnVnKVxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4TjgZfjg6rjgrvjg4Pjg4jjgZnjgovloLTlkIjjgasgdHJ1ZSDjgpLmjIflrpogKOODh+ODkOODg+OCsOeUqClcbiAgICAgKi9cbiAgICByZXNldD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIEFwcGxpY2F0aW9uIGNvbnRleHQgaW50ZXJmYWNlXG4gKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz44Kz44Oz44OG44Kt44K544OIXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dCBleHRlbmRzIFN1YnNjcmliYWJsZTxBcHBDb250ZXh0RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbWFpbiByb3V0ZXIgaW50ZXJmYWNlXG4gICAgICogQGphIOODoeOCpOODs+ODq+ODvOOCv+ODvFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJvdXRlcjogUm91dGVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBQcm9taXNlYCBmb3IgcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOa6luWCmeWujOS6hueiuuiqjeeUqCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgcmVhZHk6IFByb21pc2U8dm9pZD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VycmVudCBhY3RpdmUgcGFnZSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo44Ki44Kv44OG44Kj44OW44Gq44Oa44O844K444Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgYWN0aXZlUGFnZTogUGFnZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXJyZW50IFtbT3JpZW50YXRpb25dXSBpZC5cbiAgICAgKiBAamEg54++5Zyo44GuIFtbT3JpZW50YXRpb25dXSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICByZWFkb25seSBvcmllbnRhdGlvbjogT3JpZW50YXRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlci1kZWZpbmFibGUgZXh0ZW5kZWQgcHJvcGVydHkuXG4gICAgICogQGphIOODpuODvOOCtuODvOWumue+qeWPr+iDveOBquaLoeW8teODl+ODreODkeODhuOCo1xuICAgICAqL1xuICAgIGV4dGVuc2lvbjogdW5rbm93bjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmNvbnN0IF9pbml0aWFsUGFnZXM6IFJvdXRlUGFyYW1ldGVyc1tdID0gW107XG5cbi8qKlxuICogQGVuIFJvdXRlIHBhcmFtZXRlcnMgZm9yIHBhZ2UgcmVnaXN0cmF0aW9uLiBOZWVkIHRvIGRlc2NyaWJlIGBwYXRoYCwgYGNvbXBvbmVudGAsIGBjb250ZW50YC5cbiAqIEBqYSDjg5rjg7zjgrjnmbvpjLLnlKjjg6vjg7zjg4jjg5Hjg6njg6Hjg7zjgr8uIGBwYXRoYCwgYGNvbXBvbmVudGAsIGBjb250ZW50YCDjga7oqJjov7DjgYzlv4XopoFcbiAqL1xuZXhwb3J0IHR5cGUgUGFnZVJvdXRlUGFyYW1ldGVycyA9IFJlcXVpcmVkPFBpY2s8Um91dGVQYXJhbWV0ZXJzLCAnY29tcG9uZW50JyB8ICdjb250ZW50Jz4+ICYgUm91dGVQYXJhbWV0ZXJzO1xuXG4vKipcbiAqIEBlbiBQcmUtcmVnaXN0ZXIgY29uY3JldGUgW1tQYWdlXV0gY2xhc3MuIFJlZ2lzdGVyZWQgd2l0aCB0aGUgbWFpbiByb3V0ZXIgd2hlbiBpbnN0YW50aWF0aW5nIFtbQXBwQ29udGV4dF1dLiA8YnI+XG4gKiAgICAgSWYgY29uc3RydWN0b3IgbmVlZHMgYXJndW1lbnRzLCBgb3B0aW9ucy5jb21wb25lbnRPcHRpb25zYCBpcyBhdmFpbGFibGUuXG4gKiBAamEgUGFnZSDlhbfosaHljJbjgq/jg6njgrnjga7kuovliY3nmbvpjLIuIFtbQXBwQ29udGV4dF1dIOOBruOCpOODs+OCueOCv+ODs+OCueWMluaZguOBq+ODoeOCpOODs+ODq+ODvOOCv+ODvOOBq+eZu+mMsuOBleOCjOOCiy4gPGJyPlxuICogICAgIGNvbnN0cnVjdG9yIOOCkuaMh+WumuOBmeOCi+W8leaVsOOBjOOBguOCi+WgtOWQiOOBrywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2Ag44KS5Yip55So5Y+v6IO9XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICAgIFBhZ2UsXG4gKiAgICAgUm91dGVyLFxuICogICAgIEFwcENvbnRleHQsXG4gKiAgICAgcmVnaXN0ZXJQYWdlLFxuICogfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGNvbnN0IHBhZ2VGYWN0b3J5ID0gKHJvdXRlcjogUm91dGVyLCAuLi5hcmdzOiBhbnlbXSk6IFBhZ2UgPT4ge1xuICogICA6XG4gKiB9O1xuICogXG4gKiAvLyBwcmUtcmVnaXN0cmF0aW9uXG4gKiByZWdpc3RlclBhZ2Uoe1xuICogICAgIHBhdGg6ICdwYWdlLXBhdGgnLFxuICogICAgIGNvbnBvbmVudDogcGFnZUZhY3RvcnksXG4gKiAgICAgY29udGVudDogJyNwYWdlLWlkJ1xuICogfSk7XG4gKlxuICogLy8gaW5pdGlhbCBhY2Nlc3NcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoeyBtYWluOiAnI2FwcCcgfSk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcGF0aFxuICogIC0gYGVuYCByb3V0ZSBwYXRoXG4gKiAgLSBgamFgIOODq+ODvOODiOOBruODkeOCuVxuICogQHBhcmFtIGNvbXBvbmVudFxuICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBjb25zdHJ1Y3RvciBvciBidWlsdCBvYmplY3Qgb2YgdGhlIHBhZ2UgY29tcG9uZW50XG4gKiAgLSBgamFgIOODmuODvOOCuOOCs+ODs+ODneODvOODjeODs+ODiOOBruOCs+ODs+OCueODiOODqeOCr+OCv+OCguOBl+OBj+OBr+ani+eviea4iOOBv+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcm91dGUgcGFyYW1ldGVyc1xuICogIC0gYGphYCDjg6vjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAqL1xuZXhwb3J0IGNvbnN0IHJlZ2lzdGVyUGFnZSA9IChwYXJhbXM6IFBhZ2VSb3V0ZVBhcmFtZXRlcnMpOiB2b2lkID0+IHtcbiAgICBfaW5pdGlhbFBhZ2VzLnB1c2gocGFyYW1zKTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQXBwQ29udGV4dCBpbXBsIGNsYXNzICovXG5jbGFzcyBBcHBsaWNhdGlvbiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEFwcENvbnRleHRFdmVudD4gaW1wbGVtZW50cyBBcHBDb250ZXh0IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXI6IFJvdXRlcjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yZWFkeSA9IG5ldyBEZWZlcnJlZCgpO1xuICAgIHByaXZhdGUgX2V4dGVuc2lvbjogdW5rbm93bjtcblxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFwcENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IHsgbWFpbiwgd2luZG93OiB3aW4gfSA9IG9wdGlvbnM7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbiB8fCB3aW5kb3c7XG4gICAgICAgIHRoaXMuX3JvdXRlciA9IGNyZWF0ZVJvdXRlcihtYWluIGFzIHN0cmluZywgb3B0aW9ucyk7XG4gICAgICAgIHZvaWQgdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEFwcENvbnRleHRcblxuICAgIGdldCByb3V0ZXIoKTogUm91dGVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JvdXRlcjtcbiAgICB9XG5cbiAgICBnZXQgcmVhZHkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkeTtcbiAgICB9XG5cbiAgICBnZXQgYWN0aXZlUGFnZSgpOiBQYWdlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JvdXRlci5jdXJyZW50Um91dGVbJ0BwYXJhbXMnXT8ucGFnZSB8fCB7fTtcbiAgICB9XG5cbiAgICBnZXQgb3JpZW50YXRpb24oKTogT3JpZW50YXRpb24ge1xuICAgICAgICBjb25zdCAkd2luZG93ID0gJCh0aGlzLl93aW5kb3cpO1xuICAgICAgICByZXR1cm4gKCR3aW5kb3cud2lkdGgoKSA8ICR3aW5kb3cuaGVpZ2h0KCkpID8gT3JpZW50YXRpb24uUE9SVFJBSVQgOiBPcmllbnRhdGlvbi5MQU5EU0NBUEU7XG4gICAgfVxuXG4gICAgZ2V0IGV4dGVuc2lvbigpOiB1bmtub3duIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4dGVuc2lvbjtcbiAgICB9XG5cbiAgICBzZXQgZXh0ZW5zaW9uKHZhbDogdW5rbm93bikge1xuICAgICAgICB0aGlzLl9leHRlbnNpb24gPSB2YWw7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFwcENvbnRleHRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgc3BsYXNoLCBpMThuLCB3YWl0Rm9yUmVhZHksIGRvY3VtZW50RXZlbnRSZWFkeSwgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24gfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgX3dpbmRvdyB9ID0gdGhpcztcblxuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5vbkdsb2JhbEVycm9yLmJpbmQodGhpcykpO1xuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VuaGFuZGxlZHJlamVjdGlvbicsIHRoaXMub25HbG9iYWxVbmhhbmRsZWRSZWplY3Rpb24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgYXdhaXQgd2FpdERvbUNvbnRlbnRMb2FkZWQoX3dpbmRvdy5kb2N1bWVudCk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIGluaXRpYWxpemVJMThOKGkxOG4pLFxuICAgICAgICAgICAgd2FpdEZvclJlYWR5LFxuICAgICAgICAgICAgd2FpdERvY3VtZW50RXZlbnRSZWFkeShfd2luZG93LmRvY3VtZW50LCBkb2N1bWVudEV2ZW50UmVhZHkpLFxuICAgICAgICBdKTtcblxuICAgICAgICBfd2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnRFdmVudEJhY2tCdXR0b24gYXMgc3RyaW5nLCB0aGlzLm9uSGFuZGxlQmFja0tleS5iaW5kKHRoaXMpKTtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fcm91dGVyLm9uKCdsb2FkZWQnLCB0aGlzLm9uUGFnZUxvYWRlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5fcm91dGVyLnJlZ2lzdGVyKF9pbml0aWFsUGFnZXMsIHRydWUpO1xuXG4gICAgICAgIC8vIHJlbW92ZSBzcGxhc2ggc2NyZWVuXG4gICAgICAgICQoc3BsYXNoLCBfd2luZG93LmRvY3VtZW50KS5yZW1vdmUoKTtcblxuICAgICAgICB0aGlzLl9yZWFkeS5yZXNvbHZlKCk7XG4gICAgICAgIHRoaXMucHVibGlzaCgncmVhZHknLCB0aGlzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIHByaXZhdGUgb25QYWdlTG9hZGVkKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQge1xuICAgICAgICBsb2NhbGl6ZShpbmZvLnRvLmVsKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uR2xvYmFsRXJyb3IoZXZlbnQ6IEVycm9yRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0dsb2JhbCBFcnJvcl0gJHtldmVudC5tZXNzYWdlfSwgJHtldmVudC5maWxlbmFtZX0sICR7ZXZlbnQuY29sbm99LCAke2V2ZW50LmVycm9yfWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25HbG9iYWxVbmhhbmRsZWRSZWplY3Rpb24oZXZlbnQ6IFByb21pc2VSZWplY3Rpb25FdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbR2xvYmFsIFVuaGFuZGxlZCBSZWplY3Rpb25dICR7ZXZlbnQucmVhc29ufWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25IYW5kbGVCYWNrS2V5KGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JhY2tidXR0b24nLCBldmVudCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBvbkhhbmRsZU9yaWVudGF0aW9uQ2hhbmdlZCgvKmV2ZW50OiBFdmVudCovKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLCBzY3JlZW4gfSA9IHRoaXMuX3dpbmRvdzsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICAgICAgYXdhaXQgd2FpdEZyYW1lKDEsIHJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uLCBzY3JlZW4ub3JpZW50YXRpb24uYW5nbGUpO1xuICAgIH1cbn1cblxuLyoqIGNvbnRleHQgY2FjaGUgKi9cbmxldCBfYXBwQ29udGV4dDogQXBwQ29udGV4dCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gQXBwbGljYXRpb24gY29udGV4dCBhY2Nlc3NcbiAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PjgrPjg7Pjg4bjgq3jgrnjg4jlj5blvpdcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcENvbnRleHQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICogYGBgXG4gKlxuICogLSBpbml0aWFsIGFjY2Vzc1xuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KHtcbiAqICAgICBtYWluOiAnI2FwcCcsXG4gKiAgICAgcm91dGVzOiBbXG4gKiAgICAgICAgIHsgcGF0aDogJy8nIH0sXG4gKiAgICAgICAgIHsgcGF0aDogJy9vbmUnIH0sXG4gKiAgICAgICAgIHsgcGF0aDogJy90d28nIH1cbiAqICAgICBdLFxuICogfSk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiAtIGZyb20gdGhlIHNlY29uZCB0aW1lIG9ud2FyZHNcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCgpO1xuICogOlxuICogYGBgXG4gKlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgaW5pdCBvcHRpb25zXG4gKiAgLSBgamFgIOWIneacn+WMluOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgQXBwQ29udGV4dCA9IChvcHRpb25zPzogQXBwQ29udGV4dE9wdGlvbnMpOiBBcHBDb250ZXh0ID0+IHtcbiAgICBjb25zdCBvcHRzID0gZ2V0QXBwQ29uZmlnKE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBtYWluOiAnI2FwcCcsXG4gICAgICAgIHN0YXJ0OiBmYWxzZSxcbiAgICAgICAgZG9jdW1lbnRFdmVudEJhY2tCdXR0b246ICdiYWNrYnV0dG9uJyxcbiAgICB9LCBvcHRpb25zKSBhcyBBcHBDb250ZXh0T3B0aW9ucyk7XG5cbiAgICBpZiAobnVsbCA9PSBvcHRpb25zICYmIG51bGwgPT0gX2FwcENvbnRleHQpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BUFBfQ09OVEVYVF9ORUVEX1RPX0JFX0lOSVRJQUxJWkVELCAnQXBwQ29udGV4dCBzaG91bGQgYmUgaW5pdGlhbGl6ZWQgd2l0aCBvcHRpb25zIGF0IGxlYXN0IG9uY2UuJyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdHMucmVzZXQpIHtcbiAgICAgICAgX2FwcENvbnRleHQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNsZWFySTE4TlNldHRpbmdzKCk7XG4gICAgfVxuXG4gICAgaWYgKCFfYXBwQ29udGV4dCkge1xuICAgICAgICBfYXBwQ29udGV4dCA9IG5ldyBBcHBsaWNhdGlvbihvcHRzKTtcbiAgICB9XG4gICAgcmV0dXJuIF9hcHBDb250ZXh0O1xufTtcbiIsImltcG9ydCB7IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBWaWV3IH0gZnJvbSAnQGNkcC92aWV3JztcbmltcG9ydCB7XG4gICAgUm91dGVyLFxuICAgIFJvdXRlLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBIaXN0b3J5RGlyZWN0aW9uLFxuICAgIFBhZ2UsXG59IGZyb20gJ0BjZHAvcm91dGVyJztcbmltcG9ydCB7IENzc05hbWUsIGhhc1BhcnRpYWxDbGFzc05hbWUgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncGFnZS12aWV3OnByb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByb3V0ZT86IFJvdXRlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQmFzZSBjbGFzcyBkZWZpbml0aW9uIG9mIFtbVmlld11dIHRoYXQgY2FuIGJlIHNwZWNpZmllZCBpbiBhcyBbW1BhZ2VdXSBvZiBbW1JvdXRlcl1dLlxuICogQGphIFtbUm91dGVyXV0g44GuIFtbUGFnZV1dIOOBq+aMh+WumuWPr+iDveOBqiBbW1ZpZXddXSDjga7ln7rlupXjgq/jg6njgrnlrprnvqlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBhZ2VWaWV3PFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudCA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgUGFnZSB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm91dGVcbiAgICAgKiAgLSBgZW5gIHJvdXRlIGNvbnRleHRcbiAgICAgKiAgLSBgamFgIOODq+ODvOODiOOCs+ODs+ODhuOCreOCueODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBbW1ZpZXddXSBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFtbVmlld11dIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJvdXRlPzogUm91dGUsIG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0geyByb3V0ZSB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIHBhZ2UgaXMgYWN0aXZlLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5bjgafjgYLjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgYWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gaGFzUGFydGlhbENsYXNzTmFtZSh0aGlzLmVsLCBDc3NOYW1lLlBBR0VfQ1VSUkVOVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJvdXRlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYWdlIChwdWJsaWMpLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgavntJDjgaXjgY/jg6vjg7zjg4jjg4fjg7zjgr8gKOWFrOmWi+eUqClcbiAgICAgKi9cbiAgICBnZXQgWydAcm91dGUnXSgpOiBSb3V0ZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tSb3V0ZXJdXSBpbnN0YW5jZVxuICAgICAqIEBqYSBbW1JvdXRlcl1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3JvdXRlKCk6IFJvdXRlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbJ0Byb3V0ZSddO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW1JvdXRlcl1dIGluc3RhbmNlXG4gICAgICogQGphIFtbUm91dGVyXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcm91dGVyKCk6IFJvdXRlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZT8ucm91dGVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOiB1dGlsaXplZCBwYWdlIGV2ZW50XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIG5ld2x5IGNvbnN0cnVjdGVkIGJ5IHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuaWsOimj+OBq+ani+evieOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VJbml0KHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlTW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRhYmxlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIHJlYWR5IHRvIGJlIGFjdGl2YXRlZCBhZnRlciBpbml0aWFsaXphdGlvbi5cbiAgICAgKiBAamEg5Yid5pyf5YyW5b6MLCDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5njg7zjg4jlj6/og73jgarnirbmhYvjgavjgarjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQmVmb3JlRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGFibGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgZnVsbHkgZGlzcGxheWVkLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzlrozlhajjgavooajnpLrjgZXjgozjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQWZ0ZXJFbnRlcih0aGlzUGFnZTogUm91dGUsIHByZXZQYWdlOiBSb3V0ZSB8IHVuZGVmaW5lZCwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIHBhZ2UgZ29lcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+enu+ihjOOBmeOCi+ebtOWJjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VCZWZvcmVMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UgaXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavjgarjgaPjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQWZ0ZXJMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXRhY2hlZCBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBi+OCieWIh+OCiumbouOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VVbm1vdW50ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkYWJsZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRlc3Ryb3llZCBieSB0aGUgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm56C05qOE44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZVJlbW92ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBQYWdlXG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBuZXdseSBjb25zdHJ1Y3RlZCBieSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabmlrDopo/jgavmp4vnr4njgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlSW5pdChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyB0byB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgdGhpcy5vblBhZ2VJbml0KHRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlTW91bnRlZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyB0byB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgY29uc3QgeyBlbCB9ID0gdG87XG4gICAgICAgIGlmIChlbCAhPT0gdGhpcy5lbCBhcyB1bmtub3duKSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoZWwgYXMgdW5rbm93biBhcyBURWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vblBhZ2VNb3VudGVkKHRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgcmVhZHkgdG8gYmUgYWN0aXZhdGVkIGFmdGVyIGluaXRpYWxpemF0aW9uLlxuICAgICAqIEBqYSDliJ3mnJ/ljJblvowsIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODmeODvOODiOWPr+iDveOBqueKtuaFi+OBq+OBquOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHBhZ2VCZWZvcmVFbnRlcihpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHRoaXMub25QYWdlQmVmb3JlRW50ZXIodG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgZnVsbHkgZGlzcGxheWVkLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzlrozlhajjgavooajnpLrjgZXjgozjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQWZ0ZXJFbnRlcihpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHRoaXMub25QYWdlQWZ0ZXJFbnRlcih0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIHBhZ2UgZ29lcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+enu+ihjOOBmeOCi+ebtOWJjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VCZWZvcmVMZWF2ZShpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gZnJvbSBhcyBSb3V0ZTtcbiAgICAgICAgdGhpcy5vblBhZ2VCZWZvcmVMZWF2ZShmcm9tIGFzIFJvdXRlLCB0bywgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UgaXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavjgarjgaPjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQWZ0ZXJMZWF2ZShpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gZnJvbSBhcyBSb3V0ZTtcbiAgICAgICAgdGhpcy5vblBhZ2VBZnRlckxlYXZlKGZyb20gYXMgUm91dGUsIHRvLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRldGFjaGVkIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44GL44KJ5YiH44KK6Zui44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZVVubW91bnRlZChpbmZvOiBSb3V0ZSk6IHZvaWQge1xuICAgICAgICB0aGlzLm9uUGFnZVVubW91bnRlZChpbmZvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXN0cm95ZWQgYnkgdGhlIHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuegtOajhOOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VSZW1vdmVkKGluZm86IFJvdXRlKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5vblBhZ2VSZW1vdmVkKGluZm8pO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwiaTE4biIsImdldENvbmZpZyIsImdldEdsb2JhbE5hbWVzcGFjZSIsIkV2ZW50UHVibGlzaGVyIiwiRGVmZXJyZWQiLCJjcmVhdGVSb3V0ZXIiLCIkIiwiaW5pdGlhbGl6ZUkxOE4iLCJsb2NhbGl6ZSIsIndhaXRGcmFtZSIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsIlZpZXciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7O0lBS0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUhELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxX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