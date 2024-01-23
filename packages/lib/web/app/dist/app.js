/*!
 * @cdp/app 0.9.18
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
        delete context.options;
        delete context.language;
        delete context.languages;
        delete context.isInitialized;
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
    class Application extends events.EventPublisher {
        _window;
        _router;
        _ready = new promise.Deferred();
        _extension;
        constructor(options) {
            super();
            const { main, window: win } = options;
            this._window = win ?? window;
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
            await this._router.register(_initialPages, true);
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
     * @en Base class definition of {@link View} that can be specified in as {@link Page} of {@link Router}.
     * @ja {@link Router} の {@link Page} に指定可能な {@link View} の基底クラス定義
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

    exports.AppContext = AppContext;
    exports.PageView = PageView;
    exports.registerPage = registerPage;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaW50ZXJuYWwudHMiLCJjb250ZXh0LnRzIiwicGFnZS12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbWF4LWxlbixcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBUFAgPSBDRFBfS05PV05fTU9EVUxFLkFQUCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBUFBfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFQUCArIDEsICdBcHBDb250ZXh0IG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgd2l0aCBvcHRpb25zIGF0IGxlYXN0IG9uY2UuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbiIsImltcG9ydCB7IGdldEdsb2JhbE5hbWVzcGFjZSwgZ2V0Q29uZmlnIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2kxOG4nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDc3NOYW1lIHtcbiAgICBQQUdFX0NVUlJFTlQgID0gJ3BhZ2UtY3VycmVudCcsXG4gICAgUEFHRV9QUkVWSU9VUyA9ICdwYWdlLXByZXZpb3VzJyxcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJ0aWFsIG1hdGNoIGNsYXNzIG5hbWUgKi9cbmV4cG9ydCBjb25zdCBoYXNQYXJ0aWFsQ2xhc3NOYW1lID0gPFQgZXh0ZW5kcyBFbGVtZW50PihlbDogVCwgY2xhc3NOYW1lOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZWwuY2xhc3NMaXN0KSB7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGZvcmNlIGNsZWFyIGkxOG4gc2V0dGluZ3MgKi9cbmV4cG9ydCBjb25zdCBjbGVhckkxOE5TZXR0aW5ncyA9ICgpOiB2b2lkID0+IHtcbiAgICBjb25zdCBjb250ZXh0OiBQYXJ0aWFsPHR5cGVvZiBpMThuPiA9IGkxOG47XG4gICAgZGVsZXRlIGNvbnRleHQub3B0aW9ucztcbiAgICBkZWxldGUgY29udGV4dC5sYW5ndWFnZTtcbiAgICBkZWxldGUgY29udGV4dC5sYW5ndWFnZXM7XG4gICAgZGVsZXRlIGNvbnRleHQuaXNJbml0aWFsaXplZDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBnZXRBcHBDb25maWcgPSA8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCk6IFQgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgICAgICB7fSxcbiAgICAgICAgZ2V0Q29uZmlnPFQ+KCksICAgICAgICAgICAgICAgICAgLy8gQ0RQLkNvbmZpZ1xuICAgICAgICBnZXRHbG9iYWxOYW1lc3BhY2U8VD4oJ0NvbmZpZycpLCAvLyBnbG9iYWwgQ29uZmlnXG4gICAgICAgIGJhc2UsXG4gICAgKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIERPTUNvbnRlbnRMb2FkZWQgKi9cbmV4cG9ydCBjb25zdCB3YWl0RG9tQ29udGVudExvYWRlZCA9IGFzeW5jIChjb250ZXh0OiBEb2N1bWVudCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICdsb2FkaW5nJyA9PT0gY29udGV4dC5yZWFkeVN0YXRlICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCByZXNvbHZlLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfSk7XG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBjdXN0b20gZG9jdW1lbnQgZXZlbnQgcmVhZHkgKi9cbmV4cG9ydCBjb25zdCB3YWl0RG9jdW1lbnRFdmVudFJlYWR5ID0gYXN5bmMgKGNvbnRleHQ6IERvY3VtZW50LCBldmVudDogc3RyaW5nIHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgbnVsbCAhPSBldmVudCAmJiBhd2FpdCBuZXcgUHJvbWlzZTx1bmtub3duPihyZXNvbHZlID0+IHtcbiAgICAgICAgY29udGV4dC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCByZXNvbHZlLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfSk7XG59O1xuIiwiaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpYmFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyB3YWl0RnJhbWUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIEkxOE5PcHRpb25zLFxuICAgIEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cixcbiAgICBpbml0aWFsaXplSTE4TixcbiAgICBsb2NhbGl6ZSxcbiAgICBnZXRMYW5ndWFnZSxcbiAgICBjaGFuZ2VMYW5ndWFnZSxcbiAgICBpMThuLFxufSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxuICAgIFJvdXRlcixcbiAgICBQYWdlLFxuICAgIGNyZWF0ZVJvdXRlcixcbn0gZnJvbSAnQGNkcC9yb3V0ZXInO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBjbGVhckkxOE5TZXR0aW5ncyxcbiAgICBnZXRBcHBDb25maWcsXG4gICAgd2FpdERvbUNvbnRlbnRMb2FkZWQsXG4gICAgd2FpdERvY3VtZW50RXZlbnRSZWFkeSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIGBvcmllbnRhdGlvbmAgaWRlbnRpZmllclxuICogQGphIGBvcmllbnRhdGlvbmAg6K2Y5Yil5a2QXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIE9yaWVudGF0aW9uIHtcbiAgICBQT1JUUkFJVCAgPSAncG9ydHJhaXQnLFxuICAgIExBTkRTQ0FQRSA9ICdsYW5kc2NhcGUnLFxufVxuXG4vKipcbiAqIEBlbiBUaGUgZXZlbnQgZGVmaW5pdGlvbiBmaXJlZCBpbiB7QGxpbmsgQXBwQ29udGV4dH0uXG4gKiBAamEge0BsaW5rIEFwcENvbnRleHR9IOWGheOBi+OCieeZuuihjOOBleOCjOOCi+OCpOODmeODs+ODiOWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRFdmVudCB7XG4gICAgLyoqXG4gICAgICogQGVuIEFwcGxpY2F0aW9uIHJlYWR5IG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG6YCa55+lXG4gICAgICogQGFyZ3MgW2NvbnRleHRdXG4gICAgICovXG4gICAgJ3JlYWR5JzogW0FwcENvbnRleHRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEhhcmR3YXJlIGJhY2sgYnV0dG9uIHByZXNzIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44OP44O844OJ44Km44Kn44Ki44OQ44OD44Kv44Oc44K/44Oz44Gu5oq85LiL6YCa55+lXG4gICAgICogQGFyZ3MgW0V2ZW50XVxuICAgICAqL1xuICAgICdiYWNrYnV0dG9uJzogW0V2ZW50XTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXZpY2Ugb3JpZW50YXRpb24gY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44OH44OQ44Kk44K544Kq44Oq44Ko44Oz44OG44O844K344On44Oz5aSJ5pu06YCa55+lXG4gICAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9XZWIvQVBJL1dpbmRvdy9vcmllbnRhdGlvbmNoYW5nZV9ldmVudFxuICAgICAqIEBhcmdzIFtPcmllbnRhaW9uLCBhbmdsZV1cbiAgICAgKi9cbiAgICAnb3JpZW50YXRpb25jaGFuZ2UnOiBbT3JpZW50YXRpb24sIG51bWJlcl07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbGljYXRpb24gbGFuZ3VnYXRlIGNoYW5nZSBub3RpZmljYXRpb24uXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+iogOiqnuWkieabtOmAmuefpVxuICAgICAqIEBhcmdzIFtsYW5ndWFnZSwgaTE4bi5URnVuY3Rpb25dXG4gICAgICovXG4gICAgJ2xhbmd1YWdlY2hhbmdlJzogW3N0cmluZywgaTE4bi5URnVuY3Rpb25dO1xufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgQXBwQ29udGV4dH0gY3JlYXRlIG9wdGlvbnMuXG4gKiBAamEge0BsaW5rIEFwcENvbnRleHR9IOani+evieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRPcHRpb25zIGV4dGVuZHMgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019IGZvciBtYWluIHJvdXRlci5cbiAgICAgKiBAamEg44Oh44Kk44Oz44Or44O844K/44O844GuIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBkZWZhdWx0IGAjYXBwYFxuICAgICAqL1xuICAgIG1haW4/OiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0gYXNzaWduZWQgdG8gdGhlIHNwbGFzaCBzY3JlZW4uIDxicj5cbiAgICAgKiAgICAgSXQgd2lsbCBiZSByZW1vdmVkIGp1c3QgYmVmb3JlIGFwcGxpYWN0aW9uIHJlYWR5LlxuICAgICAqIEBqYSDjgrnjg5fjg6njg4Pjgrfjg6Xjgrnjgq/jg6rjg7zjg7PjgavlibLjgorlvZPjgabjgonjgozjgabjgYTjgosge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXIDxicj5cbiAgICAgKiAgICAg5rqW5YKZ5a6M5LqG55u05YmN44Gr5YmK6Zmk44GV44KM44KLXG4gICAgICovXG4gICAgc3BsYXNoPzogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIExvY2FsaXphdGlvbiBtb2R1bGUgb3B0aW9ucy5cbiAgICAgKiBAamEg44Ot44O844Kr44Op44Kk44K644Oi44K444Ol44O844Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgaTE4bj86IEkxOE5PcHRpb25zO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1c3RvbSBzdGFuZC1ieSBmdW5jdGlvbiBmb3IgYXBwbGljYXRpb24gcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6huOBruOBn+OCgeOBruW+heOBoeWPl+OBkemWouaVsFxuICAgICAqL1xuICAgIHdhaXRGb3JSZWFkeT86IFByb21pc2U8dW5rbm93bj4gfCAoKGNvbnRleHQ6IEFwcENvbnRleHQpID0+IFByb21pc2U8dW5rbm93bj4pO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1c3RvbSBgZG9jdW1lbnRgIGV2ZW50IGZvciBhcHBsaWNhdGlvbiByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG44Gu44Gf44KB44Gu44Kr44K544K/44OgIGBkb2N1bWVudGAg44Kk44OZ44Oz44OIXG4gICAgICovXG4gICAgZG9jdW1lbnRFdmVudFJlYWR5Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1c3RvbSBgZG9jdW1lbnRgIGV2ZW50IGZvciBoYXJkd2FyZSBiYWNrIGJ1dHRvbi4gZGVmYXVsdDogYGJhY2tidXR0b25gXG4gICAgICogQGphIOODj+ODvOODieOCpuOCp+OCouODkOODg+OCr+ODnOOCv+ODs+OBruOBn+OCgeOBruOCq+OCueOCv+ODoCBgZG9jdW1lbnRgIOOCpOODmeODs+ODiC4g5pei5a6a5YCkIGBiYWNrYnV0dG9uYFxuICAgICAqL1xuICAgIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFNwZWNpZnkgdHJ1ZSB0byBkZXN0cm95IHRoZSBpbnN0YW5jZSBjYWNoZSBhbmQgcmVzZXQuIChmb3IgZGVidWcpXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCreODo+ODg+OCt+ODpeOCkuegtOajhOOBl+ODquOCu+ODg+ODiOOBmeOCi+WgtOWQiOOBqyB0cnVlIOOCkuaMh+WumiAo44OH44OQ44OD44Kw55SoKVxuICAgICAqL1xuICAgIHJlc2V0PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gQXBwbGljYXRpb24gY29udGV4dCBpbnRlcmZhY2VcbiAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0IGV4dGVuZHMgU3Vic2NyaWJhYmxlPEFwcENvbnRleHRFdmVudD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBtYWluIHJvdXRlciBpbnRlcmZhY2VcbiAgICAgKiBAamEg44Oh44Kk44Oz44Or44O844K/44O8XG4gICAgICovXG4gICAgcmVhZG9ubHkgcm91dGVyOiBSb3V0ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYFByb21pc2VgIGZvciByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg5rqW5YKZ5a6M5LqG56K66KqN55SoIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICByZWFkb25seSByZWFkeTogUHJvbWlzZTx2b2lkPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXJyZW50IGFjdGl2ZSBwYWdlIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjjgqLjgq/jg4bjgqPjg5bjgarjg5rjg7zjgrjjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWFkb25seSBhY3RpdmVQYWdlOiBQYWdlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1cnJlbnQge0BsaW5rIE9yaWVudGF0aW9ufSBpZC5cbiAgICAgKiBAamEg54++5Zyo44GuIHtAbGluayBPcmllbnRhdGlvbn0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcmVhZG9ubHkgb3JpZW50YXRpb246IE9yaWVudGF0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVzZXItZGVmaW5hYmxlIGV4dGVuZGVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDjg6bjg7zjgrbjg7zlrprnvqnlj6/og73jgarmi6HlvLXjg5fjg63jg5Hjg4bjgqNcbiAgICAgKi9cbiAgICBleHRlbnNpb246IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlcyB0aGUgbGFuZ3VhZ2UuXG4gICAgICogQGphIOiogOiqnuOBruWIh+OCiuabv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIGxuZ1xuICAgICAqICAtIGBlbmAgbG9jYWxlIHN0cmluZyBleDogYGVuYCwgYGVuLVVTYFxuICAgICAqICAtIGBqYWAg44Ot44Kx44O844Or5paH5a2XIGV4OiBgZW5gLCBgZW4tVVNgXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGVycm9yIGJlaGF2aW91clxuICAgICAqICAtIGBqYWAg44Ko44Op44O85pmC44Gu5oyv44KL6Iie44GE44KS5oyH5a6aXG4gICAgICovXG4gICAgY2hhbmdlTGFuZ3VhZ2UobG5nOiBzdHJpbmcsIG9wdGlvbnM/OiBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmNvbnN0IF9pbml0aWFsUGFnZXM6IFJvdXRlUGFyYW1ldGVyc1tdID0gW107XG5cbi8qKlxuICogQGVuIFJvdXRlIHBhcmFtZXRlcnMgZm9yIHBhZ2UgcmVnaXN0cmF0aW9uLiBOZWVkIHRvIGRlc2NyaWJlIGBwYXRoYCwgYGNvbnRlbnRgLlxuICogQGphIOODmuODvOOCuOeZu+mMsueUqOODq+ODvOODiOODkeODqeODoeODvOOCvy4gYHBhdGhgLCBgY29udGVudGAg44Gu6KiY6L+w44GM5b+F6KaBXG4gKi9cbmV4cG9ydCB0eXBlIFBhZ2VSb3V0ZVBhcmFtZXRlcnMgPSBSZXF1aXJlZDxQaWNrPFJvdXRlUGFyYW1ldGVycywgJ2NvbnRlbnQnPj4gJiBSb3V0ZVBhcmFtZXRlcnM7XG5cbi8qKlxuICogQGVuIFByZS1yZWdpc3RlciBjb25jcmV0ZSB7QGxpbmsgUGFnZX0gY2xhc3MuIFJlZ2lzdGVyZWQgd2l0aCB0aGUgbWFpbiByb3V0ZXIgd2hlbiBpbnN0YW50aWF0aW5nIHtAbGluayBBcHBDb250ZXh0fS4gPGJyPlxuICogICAgIElmIGNvbnN0cnVjdG9yIG5lZWRzIGFyZ3VtZW50cywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2AgaXMgYXZhaWxhYmxlLlxuICogQGphIFBhZ2Ug5YW36LGh5YyW44Kv44Op44K544Gu5LqL5YmN55m76YyyLiB7QGxpbmsgQXBwQ29udGV4dH0g44Gu44Kk44Oz44K544K/44Oz44K55YyW5pmC44Gr44Oh44Kk44Oz44Or44O844K/44O844Gr55m76Yyy44GV44KM44KLLiA8YnI+XG4gKiAgICAgY29uc3RydWN0b3Ig44KS5oyH5a6a44GZ44KL5byV5pWw44GM44GC44KL5aC05ZCI44GvLCBgb3B0aW9ucy5jb21wb25lbnRPcHRpb25zYCDjgpLliKnnlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgICAgUGFnZSxcbiAqICAgICBSb3V0ZXIsXG4gKiAgICAgQXBwQ29udGV4dCxcbiAqICAgICByZWdpc3RlclBhZ2UsXG4gKiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogY29uc3QgcGFnZUZhY3RvcnkgPSAocm91dGVyOiBSb3V0ZXIsIC4uLmFyZ3M6IGFueVtdKTogUGFnZSA9PiB7XG4gKiAgIDpcbiAqIH07XG4gKiBcbiAqIC8vIHByZS1yZWdpc3RyYXRpb25cbiAqIHJlZ2lzdGVyUGFnZSh7XG4gKiAgICAgcGF0aDogJ3BhZ2UtcGF0aCcsXG4gKiAgICAgY29ucG9uZW50OiBwYWdlRmFjdG9yeSxcbiAqICAgICBjb250ZW50OiAnI3BhZ2UtaWQnXG4gKiB9KTtcbiAqXG4gKiAvLyBpbml0aWFsIGFjY2Vzc1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCh7IG1haW46ICcjYXBwJyB9KTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoXG4gKiAgLSBgZW5gIHJvdXRlIHBhdGhcbiAqICAtIGBqYWAg44Or44O844OI44Gu44OR44K5XG4gKiBAcGFyYW0gY29tcG9uZW50XG4gKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGNvbnN0cnVjdG9yIG9yIGJ1aWx0IG9iamVjdCBvZiB0aGUgcGFnZSBjb21wb25lbnRcbiAqICAtIGBqYWAg44Oa44O844K444Kz44Oz44Od44O844ON44Oz44OI44Gu44Kz44Oz44K544OI44Op44Kv44K/44KC44GX44GP44Gv5qeL56+J5riI44G/44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByb3V0ZSBwYXJhbWV0ZXJzXG4gKiAgLSBgamFgIOODq+ODvOODiOODkeODqeODoeODvOOCv1xuICovXG5leHBvcnQgY29uc3QgcmVnaXN0ZXJQYWdlID0gKHBhcmFtczogUGFnZVJvdXRlUGFyYW1ldGVycyk6IHZvaWQgPT4ge1xuICAgIF9pbml0aWFsUGFnZXMucHVzaChwYXJhbXMpO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBBcHBDb250ZXh0IGltcGwgY2xhc3MgKi9cbmNsYXNzIEFwcGxpY2F0aW9uIGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8QXBwQ29udGV4dEV2ZW50PiBpbXBsZW1lbnRzIEFwcENvbnRleHQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JvdXRlcjogUm91dGVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JlYWR5ID0gbmV3IERlZmVycmVkKCk7XG4gICAgcHJpdmF0ZSBfZXh0ZW5zaW9uOiB1bmtub3duO1xuXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQXBwQ29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3QgeyBtYWluLCB3aW5kb3c6IHdpbiB9ID0gb3B0aW9ucztcbiAgICAgICAgdGhpcy5fd2luZG93ID0gd2luID8/IHdpbmRvdztcbiAgICAgICAgdGhpcy5fcm91dGVyID0gY3JlYXRlUm91dGVyKG1haW4gYXMgc3RyaW5nLCBvcHRpb25zKTtcbiAgICAgICAgdm9pZCB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogQXBwQ29udGV4dFxuXG4gICAgZ2V0IHJvdXRlcigpOiBSb3V0ZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm91dGVyO1xuICAgIH1cblxuICAgIGdldCByZWFkeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWR5O1xuICAgIH1cblxuICAgIGdldCBhY3RpdmVQYWdlKCk6IFBhZ2Uge1xuICAgICAgICByZXR1cm4gKHRoaXMuX3JvdXRlci5jdXJyZW50Um91dGUgYXMgUm91dGUgJiBSZWNvcmQ8c3RyaW5nLCB7IHBhZ2U6IFBhZ2U7IH0+KVsnQHBhcmFtcyddPy5wYWdlIHx8IHt9O1xuICAgIH1cblxuICAgIGdldCBvcmllbnRhdGlvbigpOiBPcmllbnRhdGlvbiB7XG4gICAgICAgIGNvbnN0ICR3aW5kb3cgPSAkKHRoaXMuX3dpbmRvdyk7XG4gICAgICAgIHJldHVybiAoJHdpbmRvdy53aWR0aCgpIDwgJHdpbmRvdy5oZWlnaHQoKSkgPyBPcmllbnRhdGlvbi5QT1JUUkFJVCA6IE9yaWVudGF0aW9uLkxBTkRTQ0FQRTtcbiAgICB9XG5cbiAgICBnZXQgZXh0ZW5zaW9uKCk6IHVua25vd24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXh0ZW5zaW9uO1xuICAgIH1cblxuICAgIHNldCBleHRlbnNpb24odmFsOiB1bmtub3duKSB7XG4gICAgICAgIHRoaXMuX2V4dGVuc2lvbiA9IHZhbDtcbiAgICB9XG5cbiAgICBhc3luYyBjaGFuZ2VMYW5ndWFnZShsbmc6IHN0cmluZywgb3B0aW9ucz86IEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cik6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+IHtcbiAgICAgICAgY29uc3QgdCA9IGF3YWl0IGNoYW5nZUxhbmd1YWdlKGxuZywgb3B0aW9ucyk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3JvdXRlci5yZWZyZXNoKFJvdXRlclJlZnJlc2hMZXZlbC5ET01fQ0xFQVIpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2xhbmd1YWdlY2hhbmdlJywgZ2V0TGFuZ3VhZ2UoKSwgdCk7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIHByaXZhdGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHNwbGFzaCwgaTE4biwgd2FpdEZvclJlYWR5LCBkb2N1bWVudEV2ZW50UmVhZHksIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uIH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCB7IF93aW5kb3cgfSA9IHRoaXM7XG5cbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMub25HbG9iYWxFcnJvci5iaW5kKHRoaXMpKTtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmhhbmRsZWRyZWplY3Rpb24nLCB0aGlzLm9uR2xvYmFsVW5oYW5kbGVkUmVqZWN0aW9uLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGF3YWl0IHdhaXREb21Db250ZW50TG9hZGVkKF93aW5kb3cuZG9jdW1lbnQpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBpbml0aWFsaXplSTE4TihpMThuKSxcbiAgICAgICAgICAgIGlzRnVuY3Rpb24od2FpdEZvclJlYWR5KSA/IHdhaXRGb3JSZWFkeSh0aGlzKSA6IHdhaXRGb3JSZWFkeSxcbiAgICAgICAgICAgIHdhaXREb2N1bWVudEV2ZW50UmVhZHkoX3dpbmRvdy5kb2N1bWVudCwgZG9jdW1lbnRFdmVudFJlYWR5KSxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgX3dpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uISwgdGhpcy5vbkhhbmRsZUJhY2tLZXkuYmluZCh0aGlzKSk7XG4gICAgICAgIF93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9uSGFuZGxlT3JpZW50YXRpb25DaGFuZ2VkLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX3JvdXRlci5vbignbG9hZGVkJywgdGhpcy5vblBhZ2VMb2FkZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3JvdXRlci5yZWdpc3RlcihfaW5pdGlhbFBhZ2VzLCB0cnVlKTtcblxuICAgICAgICAvLyByZW1vdmUgc3BsYXNoIHNjcmVlblxuICAgICAgICAkKHNwbGFzaCwgX3dpbmRvdy5kb2N1bWVudCkucmVtb3ZlKCk7XG5cbiAgICAgICAgdGhpcy5fcmVhZHkucmVzb2x2ZSgpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ3JlYWR5JywgdGhpcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICBwcml2YXRlIG9uUGFnZUxvYWRlZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgbG9jYWxpemUoaW5mby50by5lbCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkdsb2JhbEVycm9yKGV2ZW50OiBFcnJvckV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtHbG9iYWwgRXJyb3JdICR7ZXZlbnQubWVzc2FnZX0sICR7ZXZlbnQuZmlsZW5hbWV9LCAke2V2ZW50LmNvbG5vfSwgJHtldmVudC5lcnJvcn1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uR2xvYmFsVW5oYW5kbGVkUmVqZWN0aW9uKGV2ZW50OiBQcm9taXNlUmVqZWN0aW9uRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0dsb2JhbCBVbmhhbmRsZWQgUmVqZWN0aW9uXSAke2V2ZW50LnJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uSGFuZGxlQmFja0tleShldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdiYWNrYnV0dG9uJywgZXZlbnQpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgb25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQoLypldmVudDogRXZlbnQqLyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHJlcXVlc3RBbmltYXRpb25GcmFtZSwgc2NyZWVuIH0gPSB0aGlzLl93aW5kb3c7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgIGF3YWl0IHdhaXRGcmFtZSgxLCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbiwgc2NyZWVuLm9yaWVudGF0aW9uLmFuZ2xlKTtcbiAgICB9XG59XG5cbi8qKiBjb250ZXh0IGNhY2hlICovXG5sZXQgX2FwcENvbnRleHQ6IEFwcENvbnRleHQgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIEFwcGxpY2F0aW9uIGNvbnRleHQgYWNjZXNzXG4gKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz44Kz44Oz44OG44Kt44K544OI5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBBcHBDb250ZXh0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGBgYFxuICpcbiAqIC0gaW5pdGlhbCBhY2Nlc3NcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCh7XG4gKiAgICAgbWFpbjogJyNhcHAnLFxuICogICAgIHJvdXRlczogW1xuICogICAgICAgICB7IHBhdGg6ICcvJyB9LFxuICogICAgICAgICB7IHBhdGg6ICcvb25lJyB9LFxuICogICAgICAgICB7IHBhdGg6ICcvdHdvJyB9XG4gKiAgICAgXSxcbiAqIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogLSBmcm9tIHRoZSBzZWNvbmQgdGltZSBvbndhcmRzXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoKTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IEFwcENvbnRleHQgPSAob3B0aW9ucz86IEFwcENvbnRleHRPcHRpb25zKTogQXBwQ29udGV4dCA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IGdldEFwcENvbmZpZyhPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWFpbjogJyNhcHAnLFxuICAgICAgICBzdGFydDogZmFsc2UsXG4gICAgICAgIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uOiAnYmFja2J1dHRvbicsXG4gICAgfSwgb3B0aW9ucykgYXMgQXBwQ29udGV4dE9wdGlvbnMpO1xuXG4gICAgaWYgKG51bGwgPT0gb3B0aW9ucyAmJiBudWxsID09IF9hcHBDb250ZXh0KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQVBQX0NPTlRFWFRfTkVFRF9UT19CRV9JTklUSUFMSVpFRCwgJ0FwcENvbnRleHQgc2hvdWxkIGJlIGluaXRpYWxpemVkIHdpdGggb3B0aW9ucyBhdCBsZWFzdCBvbmNlLicpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLnJlc2V0KSB7XG4gICAgICAgIF9hcHBDb250ZXh0ID0gdW5kZWZpbmVkO1xuICAgICAgICBjbGVhckkxOE5TZXR0aW5ncygpO1xuICAgIH1cblxuICAgIGlmICghX2FwcENvbnRleHQpIHtcbiAgICAgICAgX2FwcENvbnRleHQgPSBuZXcgQXBwbGljYXRpb24ob3B0cyk7XG4gICAgfVxuICAgIHJldHVybiBfYXBwQ29udGV4dDtcbn07XG4iLCJpbXBvcnQgeyBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucywgVmlldyB9IGZyb20gJ0BjZHAvdmlldyc7XG5pbXBvcnQge1xuICAgIFJvdXRlcixcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBQYWdlLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyBDc3NOYW1lLCBoYXNQYXJ0aWFsQ2xhc3NOYW1lIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3BhZ2Utdmlldzpwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcm91dGU/OiBSb3V0ZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBvZiB7QGxpbmsgVmlld30gdGhhdCBjYW4gYmUgc3BlY2lmaWVkIGluIGFzIHtAbGluayBQYWdlfSBvZiB7QGxpbmsgUm91dGVyfS5cbiAqIEBqYSB7QGxpbmsgUm91dGVyfSDjga4ge0BsaW5rIFBhZ2V9IOOBq+aMh+WumuWPr+iDveOBqiB7QGxpbmsgVmlld30g44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQYWdlVmlldzxURWxlbWVudCBleHRlbmRzIEVsZW1lbnQgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIFBhZ2Uge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHJvdXRlXG4gICAgICogIC0gYGVuYCByb3V0ZSBjb250ZXh0XG4gICAgICogIC0gYGphYCDjg6vjg7zjg4jjgrPjg7Pjg4bjgq3jgrnjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAge0BsaW5rIFZpZXd9IGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAge0BsaW5rIFZpZXd9IOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJvdXRlPzogUm91dGUsIG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0geyByb3V0ZSB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIHBhZ2UgaXMgYWN0aXZlLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5bjgafjgYLjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgYWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gaGFzUGFydGlhbENsYXNzTmFtZSh0aGlzLmVsLCBDc3NOYW1lLlBBR0VfQ1VSUkVOVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJvdXRlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYWdlIChwdWJsaWMpLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgavntJDjgaXjgY/jg6vjg7zjg4jjg4fjg7zjgr8gKOWFrOmWi+eUqClcbiAgICAgKi9cbiAgICBnZXQgWydAcm91dGUnXSgpOiBSb3V0ZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIFJvdXRlcn0gaW5zdGFuY2VcbiAgICAgKiBAamEge0BsaW5rIFJvdXRlcn0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcm91dGUoKTogUm91dGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1snQHJvdXRlJ107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBSb3V0ZXJ9IGluc3RhbmNlXG4gICAgICogQGphIHtAbGluayBSb3V0ZXJ9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3JvdXRlcigpOiBSb3V0ZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucm91dGU/LnJvdXRlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBWaWV3XG5cbiAgICAvKiogQG92ZXJyaWRlICovXG4gICAgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueSB7IC8qIG92ZXJyaWRhYmxlICovIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOiB1dGlsaXplZCBwYWdlIGV2ZW50XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIG5ld2x5IGNvbnN0cnVjdGVkIGJ5IHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuaWsOimj+OBq+ani+evieOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VJbml0KHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZU1vdW50ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgY2xvbmVkIGFuZCBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzopIfoo73jgZXjgowgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VDbG9uZWQodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyByZWFkeSB0byBiZSBhY3RpdmF0ZWQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGphIOWIneacn+WMluW+jCwg44Oa44O844K444GM44Ki44Kv44OG44Kj44OZ44O844OI5Y+v6IO944Gq54q25oWL44Gr44Gq44KL44Go55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUJlZm9yZUVudGVyKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlIHwgdW5kZWZpbmVkLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyBmdWxseSBkaXNwbGF5ZWQuXG4gICAgICogQGphIOODmuODvOOCuOOBjOWujOWFqOOBq+ihqOekuuOBleOCjOOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VBZnRlckVudGVyKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlIHwgdW5kZWZpbmVkLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIHBhZ2UgZ29lcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+enu+ihjOOBmeOCi+ebtOWJjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VCZWZvcmVMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUFmdGVyTGVhdmUodGhpc1BhZ2U6IFJvdXRlLCBuZXh0UGFnZTogUm91dGUsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRldGFjaGVkIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44GL44KJ5YiH44KK6Zui44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZVVubW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGVzdHJveWVkIGJ5IHRoZSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabnoLTmo4TjgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlUmVtb3ZlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFBhZ2VcblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIG5ld2x5IGNvbnN0cnVjdGVkIGJ5IHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuaWsOimj+OBq+ani+evieOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VJbml0KGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0byB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgY29uc3QgeyBlbCB9ID0gdG87XG4gICAgICAgIGlmIChlbCAhPT0gdGhpcy5lbCBhcyB1bmtub3duKSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoZWwgYXMgdW5rbm93biBhcyBURWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlSW5pdCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZU1vdW50ZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvIH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VNb3VudGVkKHRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgY2xvbmVkIGFuZCBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzopIfoo73jgZXjgowgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VDbG9uZWQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tIH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VDbG9uZWQodG8sIGZyb20hKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgcmVhZHkgdG8gYmUgYWN0aXZhdGVkIGFmdGVyIGluaXRpYWxpemF0aW9uLlxuICAgICAqIEBqYSDliJ3mnJ/ljJblvowsIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODmeODvOODiOWPr+iDveOBqueKtuaFi+OBq+OBquOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHBhZ2VCZWZvcmVFbnRlcihpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VCZWZvcmVFbnRlcih0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyBmdWxseSBkaXNwbGF5ZWQuXG4gICAgICogQGphIOODmuODvOOCuOOBjOWujOWFqOOBq+ihqOekuuOBleOCjOOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHBhZ2VBZnRlckVudGVyKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUFmdGVyRW50ZXIodG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBwYWdlIGdvZXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavnp7vooYzjgZnjgovnm7TliY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSBmcm9tITtcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQmVmb3JlTGVhdmUoZnJvbSEsIHRvLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSBpcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+OBquOBo+OBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VBZnRlckxlYXZlKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gZnJvbSE7XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUFmdGVyTGVhdmUoZnJvbSEsIHRvLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRldGFjaGVkIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjCBET00g44GL44KJ5YiH44KK6Zui44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZVVubW91bnRlZChpbmZvOiBSb3V0ZSk6IHZvaWQge1xuICAgICAgICB0aGlzLm9uUGFnZVVubW91bnRlZChpbmZvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXN0cm95ZWQgYnkgdGhlIHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuegtOajhOOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VSZW1vdmVkKGluZm86IFJvdXRlKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5vblBhZ2VSZW1vdmVkKGluZm8pO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwiaTE4biIsImdldENvbmZpZyIsImdldEdsb2JhbE5hbWVzcGFjZSIsIkV2ZW50UHVibGlzaGVyIiwiRGVmZXJyZWQiLCJjcmVhdGVSb3V0ZXIiLCIkIiwiY2hhbmdlTGFuZ3VhZ2UiLCJnZXRMYW5ndWFnZSIsImluaXRpYWxpemVJMThOIiwiaXNGdW5jdGlvbiIsImxvY2FsaXplIiwid2FpdEZyYW1lIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwiVmlldyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7OztJQUlHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBR0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFIRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxhQUFzQyxDQUFBO1lBQ3RDLFdBQTJDLENBQUEsV0FBQSxDQUFBLDBDQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw2QkFBc0IsQ0FBQyxFQUFFLCtEQUErRCxDQUFDLENBQUEsR0FBQSwwQ0FBQSxDQUFBO0lBQ2pMLEtBQUMsR0FB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LElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQzdDLFFBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDN0IsUUFBQSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM5RDtJQUVEOzs7O0lBSUc7SUFDSCxJQUFBLGNBQWMsQ0FBQyxJQUFxQixFQUFBO1lBQ2hDLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDN0MsUUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUM3QixRQUFBLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzdEO0lBRUQ7Ozs7SUFJRztJQUNILElBQUEsZUFBZSxDQUFDLElBQXFCLEVBQUE7WUFDakMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztJQUM3QyxRQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSyxDQUFDO0lBQ2hDLFFBQUEsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDL0Q7SUFFRDs7OztJQUlHO0lBQ0gsSUFBQSxjQUFjLENBQUMsSUFBcUIsRUFBQTtZQUNoQyxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQzdDLFFBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFLLENBQUM7SUFDaEMsUUFBQSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFLLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM5RDtJQUVEOzs7O0lBSUc7SUFDSCxJQUFBLGFBQWEsQ0FBQyxJQUFXLEVBQUE7SUFDckIsUUFBQSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlCO0lBRUQ7Ozs7SUFJRztJQUNILElBQUEsV0FBVyxDQUFDLElBQVcsRUFBQTtZQUNuQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDZixRQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0lBQ3BDLFFBQUEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM1QjtJQUNKOzs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2FwcC8ifQ==