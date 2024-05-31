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
    class Application extends events.EventPublisher {
        _window;
        _router;
        _ready = new promise.Deferred();
        _extension;
        constructor(options) {
            super();
            const { main, window: win, routes: _routes } = options;
            const routerOpts = Object.assign({}, options, { routes: _routes.concat(..._initialRoutes), start: false });
            this._window = win ?? window;
            this._router = router.createRouter(main, routerOpts);
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
        isCurrentPath(url) {
            const srcPath = router.toRouterPath(url);
            const curPath = router.toRouterPath(this._router.currentRoute['@id']);
            return srcPath === curPath;
        }
        ///////////////////////////////////////////////////////////////////////
        // private methods:
        async initialize(options) {
            const { splash, i18n: i18n$1, waitForReady, documentEventReady, documentEventBackButton, start } = options;
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
            start && await this._router.refresh();
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
            start: true,
            routes: [],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaW50ZXJuYWwudHMiLCJjb250ZXh0LnRzIiwicGFnZS12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHN0eWxpc3RpYzpqcy9tYXgtbGVuLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIEFQUCA9IENEUF9LTk9XTl9NT0RVTEUuQVBQICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEFQUF9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9BUFBfQ09OVEVYVF9ORUVEX1RPX0JFX0lOSVRJQUxJWkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQVBQICsgMSwgJ0FwcENvbnRleHQgbmVlZCB0byBiZSBpbml0aWFsaXplZCB3aXRoIG9wdGlvbnMgYXQgbGVhc3Qgb25jZS4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuIiwiaW1wb3J0IHsgZ2V0R2xvYmFsTmFtZXNwYWNlLCBnZXRDb25maWcgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvaTE4bic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENzc05hbWUge1xuICAgIFBBR0VfQ1VSUkVOVCAgPSAncGFnZS1jdXJyZW50JyxcbiAgICBQQUdFX1BSRVZJT1VTID0gJ3BhZ2UtcHJldmlvdXMnLFxufVxuXG4vKiogQGludGVybmFsIHBhcnRpYWwgbWF0Y2ggY2xhc3MgbmFtZSAqL1xuZXhwb3J0IGNvbnN0IGhhc1BhcnRpYWxDbGFzc05hbWUgPSA8VCBleHRlbmRzIEVsZW1lbnQ+KGVsOiBULCBjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBlbC5jbGFzc0xpc3QpIHtcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZm9yY2UgY2xlYXIgaTE4biBzZXR0aW5ncyAqL1xuZXhwb3J0IGNvbnN0IGNsZWFySTE4TlNldHRpbmdzID0gKCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGNvbnRleHQ6IFBhcnRpYWw8dHlwZW9mIGkxOG4+ID0gaTE4bjtcbiAgICBkZWxldGUgY29udGV4dC5vcHRpb25zO1xuICAgIGRlbGV0ZSBjb250ZXh0Lmxhbmd1YWdlO1xuICAgIGRlbGV0ZSBjb250ZXh0Lmxhbmd1YWdlcztcbiAgICBkZWxldGUgY29udGV4dC5pc0luaXRpYWxpemVkO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGdldEFwcENvbmZpZyA9IDxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBUKTogVCA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHt9LFxuICAgICAgICBnZXRDb25maWc8VD4oKSwgICAgICAgICAgICAgICAgICAvLyBDRFAuQ29uZmlnXG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZTxUPignQ29uZmlnJyksIC8vIGdsb2JhbCBDb25maWdcbiAgICAgICAgYmFzZSxcbiAgICApO1xufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgRE9NQ29udGVudExvYWRlZCAqL1xuZXhwb3J0IGNvbnN0IHdhaXREb21Db250ZW50TG9hZGVkID0gYXN5bmMgKGNvbnRleHQ6IERvY3VtZW50KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgJ2xvYWRpbmcnID09PSBjb250ZXh0LnJlYWR5U3RhdGUgJiYgYXdhaXQgbmV3IFByb21pc2U8dW5rbm93bj4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIGN1c3RvbSBkb2N1bWVudCBldmVudCByZWFkeSAqL1xuZXhwb3J0IGNvbnN0IHdhaXREb2N1bWVudEV2ZW50UmVhZHkgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQsIGV2ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBudWxsICE9IGV2ZW50ICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgSTE4Tk9wdGlvbnMsXG4gICAgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyLFxuICAgIGluaXRpYWxpemVJMThOLFxuICAgIGxvY2FsaXplLFxuICAgIGdldExhbmd1YWdlLFxuICAgIGNoYW5nZUxhbmd1YWdlLFxuICAgIGkxOG4sXG59IGZyb20gJ0BjZHAvaTE4bic7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxuICAgIFJvdXRlcixcbiAgICBQYWdlLFxuICAgIGNyZWF0ZVJvdXRlcixcbiAgICB0b1JvdXRlclBhdGgsXG59IGZyb20gJ0BjZHAvcm91dGVyJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgY2xlYXJJMThOU2V0dGluZ3MsXG4gICAgZ2V0QXBwQ29uZmlnLFxuICAgIHdhaXREb21Db250ZW50TG9hZGVkLFxuICAgIHdhaXREb2N1bWVudEV2ZW50UmVhZHksXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBgb3JpZW50YXRpb25gIGlkZW50aWZpZXJcbiAqIEBqYSBgb3JpZW50YXRpb25gIOitmOWIpeWtkFxuICovXG5leHBvcnQgY29uc3QgZW51bSBPcmllbnRhdGlvbiB7XG4gICAgUE9SVFJBSVQgID0gJ3BvcnRyYWl0JyxcbiAgICBMQU5EU0NBUEUgPSAnbGFuZHNjYXBlJyxcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGV2ZW50IGRlZmluaXRpb24gZmlyZWQgaW4ge0BsaW5rIEFwcENvbnRleHR9LlxuICogQGphIHtAbGluayBBcHBDb250ZXh0fSDlhoXjgYvjgonnmbrooYzjgZXjgozjgovjgqTjg5njg7Pjg4jlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0RXZlbnQge1xuICAgIC8qKlxuICAgICAqIEBlbiBBcHBsaWNhdGlvbiByZWFkeSBub3RpZmljYXRpb24uXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6humAmuefpVxuICAgICAqIEBhcmdzIFtjb250ZXh0XVxuICAgICAqL1xuICAgICdyZWFkeSc6IFtBcHBDb250ZXh0XTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBIYXJkd2FyZSBiYWNrIGJ1dHRvbiBwcmVzcyBub3RpZmljYXRpb24uXG4gICAgICogQGphIOODj+ODvOODieOCpuOCp+OCouODkOODg+OCr+ODnOOCv+ODs+OBruaKvOS4i+mAmuefpVxuICAgICAqIEBhcmdzIFtFdmVudF1cbiAgICAgKi9cbiAgICAnYmFja2J1dHRvbic6IFtFdmVudF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV2aWNlIG9yaWVudGF0aW9uIGNoYW5nZSBub3RpZmljYXRpb24uXG4gICAgICogQGphIOODh+ODkOOCpOOCueOCquODquOCqOODs+ODhuODvOOCt+ODp+ODs+WkieabtOmAmuefpVxuICAgICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9XaW5kb3cvb3JpZW50YXRpb25jaGFuZ2VfZXZlbnRcbiAgICAgKiBAYXJncyBbT3JpZW50YWlvbiwgYW5nbGVdXG4gICAgICovXG4gICAgJ29yaWVudGF0aW9uY2hhbmdlJzogW09yaWVudGF0aW9uLCBudW1iZXJdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGxpY2F0aW9uIGxhbmd1Z2F0ZSBjaGFuZ2Ugbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PoqIDoqp7lpInmm7TpgJrnn6VcbiAgICAgKiBAYXJncyBbbGFuZ3VhZ2UsIGkxOG4uVEZ1bmN0aW9uXVxuICAgICAqL1xuICAgICdsYW5ndWFnZWNoYW5nZSc6IFtzdHJpbmcsIGkxOG4uVEZ1bmN0aW9uXTtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIEFwcENvbnRleHR9IGNyZWF0ZSBvcHRpb25zLlxuICogQGphIHtAbGluayBBcHBDb250ZXh0fSDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0T3B0aW9ucyBleHRlbmRzIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSBmb3IgbWFpbiByb3V0ZXIuXG4gICAgICogQGphIOODoeOCpOODs+ODq+ODvOOCv+ODvOOBriB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAZGVmYXVsdCBgI2FwcGBcbiAgICAgKi9cbiAgICBtYWluPzogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019IGFzc2lnbmVkIHRvIHRoZSBzcGxhc2ggc2NyZWVuLiA8YnI+XG4gICAgICogICAgIEl0IHdpbGwgYmUgcmVtb3ZlZCBqdXN0IGJlZm9yZSBhcHBsaWFjdGlvbiByZWFkeS5cbiAgICAgKiBAamEg44K544OX44Op44OD44K344Ol44K544Kv44Oq44O844Oz44Gr5Ymy44KK5b2T44Gm44KJ44KM44Gm44GE44KLIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlyA8YnI+XG4gICAgICogICAgIOa6luWCmeWujOS6huebtOWJjeOBq+WJiumZpOOBleOCjOOCi1xuICAgICAqL1xuICAgIHNwbGFzaD86IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBMb2NhbGl6YXRpb24gbW9kdWxlIG9wdGlvbnMuXG4gICAgICogQGphIOODreODvOOCq+ODqeOCpOOCuuODouOCuOODpeODvOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGkxOG4/OiBJMThOT3B0aW9ucztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gc3RhbmQtYnkgZnVuY3Rpb24gZm9yIGFwcGxpY2F0aW9uIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7Pmupblgpnlrozkuobjga7jgZ/jgoHjga7lvoXjgaHlj5fjgZHplqLmlbBcbiAgICAgKi9cbiAgICB3YWl0Rm9yUmVhZHk/OiBQcm9taXNlPHVua25vd24+IHwgKChjb250ZXh0OiBBcHBDb250ZXh0KSA9PiBQcm9taXNlPHVua25vd24+KTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gYGRvY3VtZW50YCBldmVudCBmb3IgYXBwbGljYXRpb24gcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6huOBruOBn+OCgeOBruOCq+OCueOCv+ODoCBgZG9jdW1lbnRgIOOCpOODmeODs+ODiFxuICAgICAqL1xuICAgIGRvY3VtZW50RXZlbnRSZWFkeT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gYGRvY3VtZW50YCBldmVudCBmb3IgaGFyZHdhcmUgYmFjayBidXR0b24uIGRlZmF1bHQ6IGBiYWNrYnV0dG9uYFxuICAgICAqIEBqYSDjg4/jg7zjg4njgqbjgqfjgqLjg5Djg4Pjgq/jg5zjgr/jg7Pjga7jgZ/jgoHjga7jgqvjgrnjgr/jg6AgYGRvY3VtZW50YCDjgqTjg5njg7Pjg4guIOaXouWumuWApCBgYmFja2J1dHRvbmBcbiAgICAgKi9cbiAgICBkb2N1bWVudEV2ZW50QmFja0J1dHRvbj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBTcGVjaWZ5IHRydWUgdG8gZGVzdHJveSB0aGUgaW5zdGFuY2UgY2FjaGUgYW5kIHJlc2V0LiAoZm9yIGRlYnVnKVxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4TjgZfjg6rjgrvjg4Pjg4jjgZnjgovloLTlkIjjgasgdHJ1ZSDjgpLmjIflrpogKOODh+ODkOODg+OCsOeUqClcbiAgICAgKi9cbiAgICByZXNldD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIEFwcGxpY2F0aW9uIGNvbnRleHQgaW50ZXJmYWNlXG4gKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz44Kz44Oz44OG44Kt44K544OIXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dCBleHRlbmRzIFN1YnNjcmliYWJsZTxBcHBDb250ZXh0RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbWFpbiByb3V0ZXIgaW50ZXJmYWNlXG4gICAgICogQGphIOODoeOCpOODs+ODq+ODvOOCv+ODvFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJvdXRlcjogUm91dGVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBQcm9taXNlYCBmb3IgcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOa6luWCmeWujOS6hueiuuiqjeeUqCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgcmVhZHk6IFByb21pc2U8dm9pZD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VycmVudCBhY3RpdmUgcGFnZSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo44Ki44Kv44OG44Kj44OW44Gq44Oa44O844K444Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgYWN0aXZlUGFnZTogUGFnZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXJyZW50IHtAbGluayBPcmllbnRhdGlvbn0gaWQuXG4gICAgICogQGphIOePvuWcqOOBriB7QGxpbmsgT3JpZW50YXRpb259IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IG9yaWVudGF0aW9uOiBPcmllbnRhdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVc2VyLWRlZmluYWJsZSBleHRlbmRlZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg44Om44O844K244O85a6a576p5Y+v6IO944Gq5ouh5by144OX44Ot44OR44OG44KjXG4gICAgICovXG4gICAgZXh0ZW5zaW9uOiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZXMgdGhlIGxhbmd1YWdlLlxuICAgICAqIEBqYSDoqIDoqp7jga7liIfjgormm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsbmdcbiAgICAgKiAgLSBgZW5gIGxvY2FsZSBzdHJpbmcgZXg6IGBlbmAsIGBlbi1VU2BcbiAgICAgKiAgLSBgamFgIOODreOCseODvOODq+aWh+WtlyBleDogYGVuYCwgYGVuLVVTYFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBlcnJvciBiZWhhdmlvdXJcbiAgICAgKiAgLSBgamFgIOOCqOODqeODvOaZguOBruaMr+OCi+iInuOBhOOCkuaMh+WumlxuICAgICAqL1xuICAgIGNoYW5nZUxhbmd1YWdlKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lcyBpZiBhIGdpdmVuIFVSTCBpcyB0aGUgcm91dGVyJ3MgY3VycmVudCBwYXRoLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gVVJMIOOBjOODq+ODvOOCv+ODvOOBruePvuWcqOOBruODkeOCueOBp+OBguOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgVVJMIHlvdSB3YW50IHRvIGlkZW50aWZ5XG4gICAgICogIC0gYGphYCDliKTliKXjgZfjgZ/jgYQgVVJMIOOCkuaMh+WumlxuICAgICAqL1xuICAgIGlzQ3VycmVudFBhdGgodXJsOiBzdHJpbmcpOiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuY29uc3QgX2luaXRpYWxSb3V0ZXM6IFJvdXRlUGFyYW1ldGVyc1tdID0gW107XG5cbi8qKlxuICogQGVuIFJvdXRlIHBhcmFtZXRlcnMgZm9yIHBhZ2UgcmVnaXN0cmF0aW9uLiBOZWVkIHRvIGRlc2NyaWJlIGBwYXRoYCwgYGNvbnRlbnRgLlxuICogQGphIOODmuODvOOCuOeZu+mMsueUqOODq+ODvOODiOODkeODqeODoeODvOOCvy4gYHBhdGhgLCBgY29udGVudGAg44Gu6KiY6L+w44GM5b+F6KaBXG4gKi9cbmV4cG9ydCB0eXBlIFBhZ2VSb3V0ZVBhcmFtZXRlcnMgPSBSZXF1aXJlZDxQaWNrPFJvdXRlUGFyYW1ldGVycywgJ2NvbnRlbnQnPj4gJiBSb3V0ZVBhcmFtZXRlcnM7XG5cbi8qKlxuICogQGVuIFByZS1yZWdpc3RlciBjb25jcmV0ZSB7QGxpbmsgUGFnZX0gY2xhc3MuIFJlZ2lzdGVyZWQgd2l0aCB0aGUgbWFpbiByb3V0ZXIgd2hlbiBpbnN0YW50aWF0aW5nIHtAbGluayBBcHBDb250ZXh0fS4gPGJyPlxuICogICAgIElmIGNvbnN0cnVjdG9yIG5lZWRzIGFyZ3VtZW50cywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2AgaXMgYXZhaWxhYmxlLlxuICogQGphIFBhZ2Ug5YW36LGh5YyW44Kv44Op44K544Gu5LqL5YmN55m76YyyLiB7QGxpbmsgQXBwQ29udGV4dH0g44Gu44Kk44Oz44K544K/44Oz44K55YyW5pmC44Gr44Oh44Kk44Oz44Or44O844K/44O844Gr55m76Yyy44GV44KM44KLLiA8YnI+XG4gKiAgICAgY29uc3RydWN0b3Ig44KS5oyH5a6a44GZ44KL5byV5pWw44GM44GC44KL5aC05ZCI44GvLCBgb3B0aW9ucy5jb21wb25lbnRPcHRpb25zYCDjgpLliKnnlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgICAgUGFnZSxcbiAqICAgICBSb3V0ZXIsXG4gKiAgICAgQXBwQ29udGV4dCxcbiAqICAgICByZWdpc3RlclBhZ2UsXG4gKiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogY29uc3QgcGFnZUZhY3RvcnkgPSAocm91dGVyOiBSb3V0ZXIsIC4uLmFyZ3M6IGFueVtdKTogUGFnZSA9PiB7XG4gKiAgIDpcbiAqIH07XG4gKiBcbiAqIC8vIHByZS1yZWdpc3RyYXRpb25cbiAqIHJlZ2lzdGVyUGFnZSh7XG4gKiAgICAgcGF0aDogJ3BhZ2UtcGF0aCcsXG4gKiAgICAgY29ucG9uZW50OiBwYWdlRmFjdG9yeSxcbiAqICAgICBjb250ZW50OiAnI3BhZ2UtaWQnXG4gKiB9KTtcbiAqXG4gKiAvLyBpbml0aWFsIGFjY2Vzc1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCh7IG1haW46ICcjYXBwJyB9KTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoXG4gKiAgLSBgZW5gIHJvdXRlIHBhdGhcbiAqICAtIGBqYWAg44Or44O844OI44Gu44OR44K5XG4gKiBAcGFyYW0gY29tcG9uZW50XG4gKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGNvbnN0cnVjdG9yIG9yIGJ1aWx0IG9iamVjdCBvZiB0aGUgcGFnZSBjb21wb25lbnRcbiAqICAtIGBqYWAg44Oa44O844K444Kz44Oz44Od44O844ON44Oz44OI44Gu44Kz44Oz44K544OI44Op44Kv44K/44KC44GX44GP44Gv5qeL56+J5riI44G/44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByb3V0ZSBwYXJhbWV0ZXJzXG4gKiAgLSBgamFgIOODq+ODvOODiOODkeODqeODoeODvOOCv1xuICovXG5leHBvcnQgY29uc3QgcmVnaXN0ZXJQYWdlID0gKHBhcmFtczogUGFnZVJvdXRlUGFyYW1ldGVycyk6IHZvaWQgPT4ge1xuICAgIF9pbml0aWFsUm91dGVzLnB1c2gocGFyYW1zKTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQXBwQ29udGV4dCBpbXBsIGNsYXNzICovXG5jbGFzcyBBcHBsaWNhdGlvbiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEFwcENvbnRleHRFdmVudD4gaW1wbGVtZW50cyBBcHBDb250ZXh0IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXI6IFJvdXRlcjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yZWFkeSA9IG5ldyBEZWZlcnJlZCgpO1xuICAgIHByaXZhdGUgX2V4dGVuc2lvbjogdW5rbm93bjtcblxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFwcENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IHsgbWFpbiwgd2luZG93OiB3aW4sIHJvdXRlczogX3JvdXRlcyB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3Qgcm91dGVyT3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHsgcm91dGVzOiBfcm91dGVzIS5jb25jYXQoLi4uX2luaXRpYWxSb3V0ZXMpLCBzdGFydDogZmFsc2UgfSk7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbiA/PyB3aW5kb3c7XG4gICAgICAgIHRoaXMuX3JvdXRlciA9IGNyZWF0ZVJvdXRlcihtYWluIGFzIHN0cmluZywgcm91dGVyT3B0cyk7XG4gICAgICAgIHZvaWQgdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEFwcENvbnRleHRcblxuICAgIGdldCByb3V0ZXIoKTogUm91dGVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JvdXRlcjtcbiAgICB9XG5cbiAgICBnZXQgcmVhZHkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkeTtcbiAgICB9XG5cbiAgICBnZXQgYWN0aXZlUGFnZSgpOiBQYWdlIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9yb3V0ZXIuY3VycmVudFJvdXRlIGFzIFJvdXRlICYgUmVjb3JkPHN0cmluZywgeyBwYWdlOiBQYWdlOyB9PilbJ0BwYXJhbXMnXT8ucGFnZSB8fCB7fTtcbiAgICB9XG5cbiAgICBnZXQgb3JpZW50YXRpb24oKTogT3JpZW50YXRpb24ge1xuICAgICAgICBjb25zdCAkd2luZG93ID0gJCh0aGlzLl93aW5kb3cpO1xuICAgICAgICByZXR1cm4gKCR3aW5kb3cud2lkdGgoKSA8ICR3aW5kb3cuaGVpZ2h0KCkpID8gT3JpZW50YXRpb24uUE9SVFJBSVQgOiBPcmllbnRhdGlvbi5MQU5EU0NBUEU7XG4gICAgfVxuXG4gICAgZ2V0IGV4dGVuc2lvbigpOiB1bmtub3duIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4dGVuc2lvbjtcbiAgICB9XG5cbiAgICBzZXQgZXh0ZW5zaW9uKHZhbDogdW5rbm93bikge1xuICAgICAgICB0aGlzLl9leHRlbnNpb24gPSB2YWw7XG4gICAgfVxuXG4gICAgYXN5bmMgY2hhbmdlTGFuZ3VhZ2UobG5nOiBzdHJpbmcsIG9wdGlvbnM/OiBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiB7XG4gICAgICAgIGNvbnN0IHQgPSBhd2FpdCBjaGFuZ2VMYW5ndWFnZShsbmcsIG9wdGlvbnMpO1xuICAgICAgICBhd2FpdCB0aGlzLl9yb3V0ZXIucmVmcmVzaChSb3V0ZXJSZWZyZXNoTGV2ZWwuRE9NX0NMRUFSKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdsYW5ndWFnZWNoYW5nZScsIGdldExhbmd1YWdlKCksIHQpO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG5cbiAgICBpc0N1cnJlbnRQYXRoKHVybDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHNyY1BhdGggPSB0b1JvdXRlclBhdGgodXJsKTtcbiAgICAgICAgY29uc3QgY3VyUGF0aCA9IHRvUm91dGVyUGF0aCgodGhpcy5fcm91dGVyLmN1cnJlbnRSb3V0ZSBhcyBIaXN0b3J5U3RhdGU8Um91dGU+KVsnQGlkJ10pO1xuICAgICAgICByZXR1cm4gc3JjUGF0aCA9PT0gY3VyUGF0aDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogQXBwQ29udGV4dE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBzcGxhc2gsIGkxOG4sIHdhaXRGb3JSZWFkeSwgZG9jdW1lbnRFdmVudFJlYWR5LCBkb2N1bWVudEV2ZW50QmFja0J1dHRvbiwgc3RhcnQgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgX3dpbmRvdyB9ID0gdGhpcztcblxuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5vbkdsb2JhbEVycm9yLmJpbmQodGhpcykpO1xuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VuaGFuZGxlZHJlamVjdGlvbicsIHRoaXMub25HbG9iYWxVbmhhbmRsZWRSZWplY3Rpb24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgYXdhaXQgd2FpdERvbUNvbnRlbnRMb2FkZWQoX3dpbmRvdy5kb2N1bWVudCk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIGluaXRpYWxpemVJMThOKGkxOG4pLFxuICAgICAgICAgICAgaXNGdW5jdGlvbih3YWl0Rm9yUmVhZHkpID8gd2FpdEZvclJlYWR5KHRoaXMpIDogd2FpdEZvclJlYWR5LFxuICAgICAgICAgICAgd2FpdERvY3VtZW50RXZlbnRSZWFkeShfd2luZG93LmRvY3VtZW50LCBkb2N1bWVudEV2ZW50UmVhZHkpLFxuICAgICAgICBdKTtcblxuICAgICAgICBfd2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnRFdmVudEJhY2tCdXR0b24hLCB0aGlzLm9uSGFuZGxlQmFja0tleS5iaW5kKHRoaXMpKTtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fcm91dGVyLm9uKCdsb2FkZWQnLCB0aGlzLm9uUGFnZUxvYWRlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgc3RhcnQgJiYgYXdhaXQgdGhpcy5fcm91dGVyLnJlZnJlc2goKTtcblxuICAgICAgICAvLyByZW1vdmUgc3BsYXNoIHNjcmVlblxuICAgICAgICAkKHNwbGFzaCwgX3dpbmRvdy5kb2N1bWVudCkucmVtb3ZlKCk7XG5cbiAgICAgICAgdGhpcy5fcmVhZHkucmVzb2x2ZSgpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ3JlYWR5JywgdGhpcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICBwcml2YXRlIG9uUGFnZUxvYWRlZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgbG9jYWxpemUoaW5mby50by5lbCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkdsb2JhbEVycm9yKGV2ZW50OiBFcnJvckV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtHbG9iYWwgRXJyb3JdICR7ZXZlbnQubWVzc2FnZX0sICR7ZXZlbnQuZmlsZW5hbWV9LCAke2V2ZW50LmNvbG5vfSwgJHtldmVudC5lcnJvcn1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uR2xvYmFsVW5oYW5kbGVkUmVqZWN0aW9uKGV2ZW50OiBQcm9taXNlUmVqZWN0aW9uRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0dsb2JhbCBVbmhhbmRsZWQgUmVqZWN0aW9uXSAke2V2ZW50LnJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uSGFuZGxlQmFja0tleShldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdiYWNrYnV0dG9uJywgZXZlbnQpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgb25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQoLypldmVudDogRXZlbnQqLyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHJlcXVlc3RBbmltYXRpb25GcmFtZSwgc2NyZWVuIH0gPSB0aGlzLl93aW5kb3c7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgIGF3YWl0IHdhaXRGcmFtZSgxLCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbiwgc2NyZWVuLm9yaWVudGF0aW9uLmFuZ2xlKTtcbiAgICB9XG59XG5cbi8qKiBjb250ZXh0IGNhY2hlICovXG5sZXQgX2FwcENvbnRleHQ6IEFwcENvbnRleHQgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIEFwcGxpY2F0aW9uIGNvbnRleHQgYWNjZXNzXG4gKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz44Kz44Oz44OG44Kt44K544OI5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBBcHBDb250ZXh0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGBgYFxuICpcbiAqIC0gaW5pdGlhbCBhY2Nlc3NcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCh7XG4gKiAgICAgbWFpbjogJyNhcHAnLFxuICogICAgIHJvdXRlczogW1xuICogICAgICAgICB7IHBhdGg6ICcvJyB9LFxuICogICAgICAgICB7IHBhdGg6ICcvb25lJyB9LFxuICogICAgICAgICB7IHBhdGg6ICcvdHdvJyB9XG4gKiAgICAgXSxcbiAqIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogLSBmcm9tIHRoZSBzZWNvbmQgdGltZSBvbndhcmRzXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFwcCA9IEFwcENvbnRleHQoKTtcbiAqIDpcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IEFwcENvbnRleHQgPSAob3B0aW9ucz86IEFwcENvbnRleHRPcHRpb25zKTogQXBwQ29udGV4dCA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IGdldEFwcENvbmZpZyhPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWFpbjogJyNhcHAnLFxuICAgICAgICBzdGFydDogdHJ1ZSxcbiAgICAgICAgcm91dGVzOiBbXSxcbiAgICAgICAgZG9jdW1lbnRFdmVudEJhY2tCdXR0b246ICdiYWNrYnV0dG9uJyxcbiAgICB9LCBvcHRpb25zKSBhcyBBcHBDb250ZXh0T3B0aW9ucyk7XG5cbiAgICBpZiAobnVsbCA9PSBvcHRpb25zICYmIG51bGwgPT0gX2FwcENvbnRleHQpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BUFBfQ09OVEVYVF9ORUVEX1RPX0JFX0lOSVRJQUxJWkVELCAnQXBwQ29udGV4dCBzaG91bGQgYmUgaW5pdGlhbGl6ZWQgd2l0aCBvcHRpb25zIGF0IGxlYXN0IG9uY2UuJyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdHMucmVzZXQpIHtcbiAgICAgICAgX2FwcENvbnRleHQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNsZWFySTE4TlNldHRpbmdzKCk7XG4gICAgfVxuXG4gICAgaWYgKCFfYXBwQ29udGV4dCkge1xuICAgICAgICBfYXBwQ29udGV4dCA9IG5ldyBBcHBsaWNhdGlvbihvcHRzKTtcbiAgICB9XG4gICAgcmV0dXJuIF9hcHBDb250ZXh0O1xufTtcbiIsImltcG9ydCB7IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBWaWV3IH0gZnJvbSAnQGNkcC92aWV3JztcbmltcG9ydCB7XG4gICAgUm91dGVyLFxuICAgIFJvdXRlLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBIaXN0b3J5RGlyZWN0aW9uLFxuICAgIFBhZ2UsXG59IGZyb20gJ0BjZHAvcm91dGVyJztcbmltcG9ydCB7IENzc05hbWUsIGhhc1BhcnRpYWxDbGFzc05hbWUgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncGFnZS12aWV3OnByb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByb3V0ZT86IFJvdXRlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQmFzZSBjbGFzcyBkZWZpbml0aW9uIG9mIHtAbGluayBWaWV3fSB0aGF0IGNhbiBiZSBzcGVjaWZpZWQgaW4gYXMge0BsaW5rIFBhZ2V9IG9mIHtAbGluayBSb3V0ZXJ9LlxuICogQGphIHtAbGluayBSb3V0ZXJ9IOOBriB7QGxpbmsgUGFnZX0g44Gr5oyH5a6a5Y+v6IO944GqIHtAbGluayBWaWV3fSDjga7ln7rlupXjgq/jg6njgrnlrprnvqlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBhZ2VWaWV3PFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudCA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgUGFnZSB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm91dGVcbiAgICAgKiAgLSBgZW5gIHJvdXRlIGNvbnRleHRcbiAgICAgKiAgLSBgamFgIOODq+ODvOODiOOCs+ODs+ODhuOCreOCueODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB7QGxpbmsgVmlld30gY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCB7QGxpbmsgVmlld30g5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iocm91dGU/OiBSb3V0ZSwgb3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7IHJvdXRlIH07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgcGFnZSBpcyBhY3RpdmUuXG4gICAgICogQGphIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODluOBp+OBguOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBhY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBoYXNQYXJ0aWFsQ2xhc3NOYW1lKHRoaXMuZWwsIENzc05hbWUuUEFHRV9DVVJSRU5UKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUm91dGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIHBhZ2UgKHB1YmxpYykuXG4gICAgICogQGphIOODmuODvOOCuOOBq+e0kOOBpeOBj+ODq+ODvOODiOODh+ODvOOCvyAo5YWs6ZaL55SoKVxuICAgICAqL1xuICAgIGdldCBbJ0Byb3V0ZSddKCk6IFJvdXRlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgUm91dGVyfSBpbnN0YW5jZVxuICAgICAqIEBqYSB7QGxpbmsgUm91dGVyfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9yb3V0ZSgpOiBSb3V0ZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzWydAcm91dGUnXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIFJvdXRlcn0gaW5zdGFuY2VcbiAgICAgKiBAamEge0BsaW5rIFJvdXRlcn0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcm91dGVyKCk6IFJvdXRlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZT8ucm91dGVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFZpZXdcblxuICAgIC8qKiBAb3ZlcnJpZGUgKi9cbiAgICByZW5kZXIoLi4uYXJnczogdW5rbm93bltdKTogYW55IHsgLyogb3ZlcnJpZGFibGUgKi8gfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6IHV0aWxpemVkIHBhZ2UgZXZlbnRcblxuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUluaXQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlTW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBjbG9uZWQgYW5kIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOikh+ijveOBleOCjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUNsb25lZCh0aGlzUGFnZTogUm91dGUsIHByZXZQYWdlOiBSb3V0ZSk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIHJlYWR5IHRvIGJlIGFjdGl2YXRlZCBhZnRlciBpbml0aWFsaXphdGlvbi5cbiAgICAgKiBAamEg5Yid5pyf5YyW5b6MLCDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5njg7zjg4jlj6/og73jgarnirbmhYvjgavjgarjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQmVmb3JlRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUFmdGVyRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCBqdXN0IGJlZm9yZSB0aGUgcGFnZSBnb2VzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr56e76KGM44GZ44KL55u05YmN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUJlZm9yZUxlYXZlKHRoaXNQYWdlOiBSb3V0ZSwgbmV4dFBhZ2U6IFJvdXRlLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UgaXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavjgarjgaPjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQWZ0ZXJMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgYvjgonliIfjgorpm6LjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlVW5tb3VudGVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXN0cm95ZWQgYnkgdGhlIHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuegtOajhOOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VSZW1vdmVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUGFnZVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUluaXQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvIH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICBjb25zdCB7IGVsIH0gPSB0bztcbiAgICAgICAgaWYgKGVsICE9PSB0aGlzLmVsIGFzIHVua25vd24pIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChlbCBhcyB1bmtub3duIGFzIFRFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VJbml0KHRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlTW91bnRlZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZU1vdW50ZWQodG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBjbG9uZWQgYW5kIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOikh+ijveOBleOCjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUNsb25lZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUNsb25lZCh0bywgZnJvbSEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyByZWFkeSB0byBiZSBhY3RpdmF0ZWQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGphIOWIneacn+WMluW+jCwg44Oa44O844K444GM44Ki44Kv44OG44Kj44OZ44O844OI5Y+v6IO944Gq54q25oWL44Gr44Gq44KL44Go55m654GrXG4gICAgICovXG4gICAgcGFnZUJlZm9yZUVudGVyKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUJlZm9yZUVudGVyKHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQWZ0ZXJFbnRlcih0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIHBhZ2UgZ29lcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+enu+ihjOOBmeOCi+ebtOWJjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VCZWZvcmVMZWF2ZShpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20hO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VCZWZvcmVMZWF2ZShmcm9tISwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSBmcm9tITtcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQWZ0ZXJMZWF2ZShmcm9tISwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgYvjgonliIfjgorpm6LjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlVW5tb3VudGVkKGluZm86IFJvdXRlKTogdm9pZCB7XG4gICAgICAgIHRoaXMub25QYWdlVW5tb3VudGVkKGluZm8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRlc3Ryb3llZCBieSB0aGUgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm56C05qOE44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZVJlbW92ZWQoaW5mbzogUm91dGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm9uUGFnZVJlbW92ZWQoaW5mbyk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJpMThuIiwiZ2V0Q29uZmlnIiwiZ2V0R2xvYmFsTmFtZXNwYWNlIiwiRXZlbnRQdWJsaXNoZXIiLCJEZWZlcnJlZCIsImNyZWF0ZVJvdXRlciIsIiQiLCJjaGFuZ2VMYW5ndWFnZSIsImdldExhbmd1YWdlIiwidG9Sb3V0ZXJQYXRoIiwiaW5pdGlhbGl6ZUkxOE4iLCJpc0Z1bmN0aW9uIiwibG9jYWxpemUiLCJ3YWl0RnJhbWUiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJWaWV3Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7O0lBSUc7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUhELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGFBQXNDLENBQUE7WUFDdEMsV0FBMkMsQ0FBQSxXQUFBLENBQUEsMENBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDZCQUFzQixDQUFDLEVBQUUsK0RBQStELENBQUMsQ0FBQSxHQUFBLDBDQUFBLENBQUE7SUFDakwsS0FBQyxHQUFBLENBQUE7SUFDTCxDQUFDLEdBQUE7O0lDbkJELGlCQUF3QixNQUFNLE1BQU0sR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7O0lDUTlEO0lBQ08sTUFBTSxtQkFBbUIsR0FB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