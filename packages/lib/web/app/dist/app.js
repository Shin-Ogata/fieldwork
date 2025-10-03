/*!
 * @cdp/app 0.9.20
 *   application context
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/promise'), require('@cdp/result'), require('@cdp/web-utils'), require('@cdp/dom'), require('@cdp/i18n'), require('@cdp/router'), require('@cdp/view')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/promise', '@cdp/result', '@cdp/web-utils', '@cdp/dom', '@cdp/i18n', '@cdp/router', '@cdp/view'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, events, promise, result, webUtils, dom, i18n, router, view) { 'use strict';

    /* eslint-disable
        @stylistic/max-len,
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
        _appContext ??= new Application(opts);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaW50ZXJuYWwudHMiLCJjb250ZXh0LnRzIiwicGFnZS12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHN0eWxpc3RpYy9tYXgtbGVuLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIEFQUCA9IENEUF9LTk9XTl9NT0RVTEUuQVBQICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEFQUF9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9BUFBfQ09OVEVYVF9ORUVEX1RPX0JFX0lOSVRJQUxJWkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQVBQICsgMSwgJ0FwcENvbnRleHQgbmVlZCB0byBiZSBpbml0aWFsaXplZCB3aXRoIG9wdGlvbnMgYXQgbGVhc3Qgb25jZS4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuIiwiaW1wb3J0IHsgZ2V0R2xvYmFsTmFtZXNwYWNlLCBnZXRDb25maWcgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvaTE4bic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENzc05hbWUge1xuICAgIFBBR0VfQ1VSUkVOVCAgPSAncGFnZS1jdXJyZW50JyxcbiAgICBQQUdFX1BSRVZJT1VTID0gJ3BhZ2UtcHJldmlvdXMnLFxufVxuXG4vKiogQGludGVybmFsIHBhcnRpYWwgbWF0Y2ggY2xhc3MgbmFtZSAqL1xuZXhwb3J0IGNvbnN0IGhhc1BhcnRpYWxDbGFzc05hbWUgPSA8VCBleHRlbmRzIEVsZW1lbnQ+KGVsOiBULCBjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBlbC5jbGFzc0xpc3QpIHtcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZm9yY2UgY2xlYXIgaTE4biBzZXR0aW5ncyAqL1xuZXhwb3J0IGNvbnN0IGNsZWFySTE4TlNldHRpbmdzID0gKCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGNvbnRleHQ6IFBhcnRpYWw8dHlwZW9mIGkxOG4+ID0gaTE4bjtcbiAgICBkZWxldGUgY29udGV4dC5vcHRpb25zO1xuICAgIGRlbGV0ZSBjb250ZXh0Lmxhbmd1YWdlO1xuICAgIGRlbGV0ZSBjb250ZXh0Lmxhbmd1YWdlcztcbiAgICBkZWxldGUgY29udGV4dC5pc0luaXRpYWxpemVkO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGdldEFwcENvbmZpZyA9IDxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBUKTogVCA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHt9LFxuICAgICAgICBnZXRDb25maWc8VD4oKSwgICAgICAgICAgICAgICAgICAvLyBDRFAuQ29uZmlnXG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZTxUPignQ29uZmlnJyksIC8vIGdsb2JhbCBDb25maWdcbiAgICAgICAgYmFzZSxcbiAgICApO1xufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgRE9NQ29udGVudExvYWRlZCAqL1xuZXhwb3J0IGNvbnN0IHdhaXREb21Db250ZW50TG9hZGVkID0gYXN5bmMgKGNvbnRleHQ6IERvY3VtZW50KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgJ2xvYWRpbmcnID09PSBjb250ZXh0LnJlYWR5U3RhdGUgJiYgYXdhaXQgbmV3IFByb21pc2U8dW5rbm93bj4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIGN1c3RvbSBkb2N1bWVudCBldmVudCByZWFkeSAqL1xuZXhwb3J0IGNvbnN0IHdhaXREb2N1bWVudEV2ZW50UmVhZHkgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQsIGV2ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBudWxsICE9IGV2ZW50ICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHR5cGUgU3Vic2NyaWJhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgd2FpdEZyYW1lIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIHR5cGUgSTE4Tk9wdGlvbnMsXG4gICAgdHlwZSBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIsXG4gICAgdHlwZSBpMThuLFxuICAgIGluaXRpYWxpemVJMThOLFxuICAgIGxvY2FsaXplLFxuICAgIGdldExhbmd1YWdlLFxuICAgIGNoYW5nZUxhbmd1YWdlLFxufSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICB0eXBlIEhpc3RvcnlTdGF0ZSxcbiAgICB0eXBlIFJvdXRlLFxuICAgIHR5cGUgUm91dGVDaGFuZ2VJbmZvLFxuICAgIHR5cGUgUm91dGVQYXJhbWV0ZXJzLFxuICAgIHR5cGUgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICB0eXBlIFJvdXRlcixcbiAgICB0eXBlIFBhZ2UsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxuICAgIGNyZWF0ZVJvdXRlcixcbiAgICB0b1JvdXRlclBhdGgsXG59IGZyb20gJ0BjZHAvcm91dGVyJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgY2xlYXJJMThOU2V0dGluZ3MsXG4gICAgZ2V0QXBwQ29uZmlnLFxuICAgIHdhaXREb21Db250ZW50TG9hZGVkLFxuICAgIHdhaXREb2N1bWVudEV2ZW50UmVhZHksXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBgb3JpZW50YXRpb25gIGlkZW50aWZpZXJcbiAqIEBqYSBgb3JpZW50YXRpb25gIOitmOWIpeWtkFxuICovXG5leHBvcnQgY29uc3QgZW51bSBPcmllbnRhdGlvbiB7XG4gICAgUE9SVFJBSVQgID0gJ3BvcnRyYWl0JyxcbiAgICBMQU5EU0NBUEUgPSAnbGFuZHNjYXBlJyxcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGV2ZW50IGRlZmluaXRpb24gZmlyZWQgaW4ge0BsaW5rIEFwcENvbnRleHR9LlxuICogQGphIHtAbGluayBBcHBDb250ZXh0fSDlhoXjgYvjgonnmbrooYzjgZXjgozjgovjgqTjg5njg7Pjg4jlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0RXZlbnQge1xuICAgIC8qKlxuICAgICAqIEBlbiBBcHBsaWNhdGlvbiByZWFkeSBub3RpZmljYXRpb24uXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6humAmuefpVxuICAgICAqIEBhcmdzIFtjb250ZXh0XVxuICAgICAqL1xuICAgICdyZWFkeSc6IFtBcHBDb250ZXh0XTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBIYXJkd2FyZSBiYWNrIGJ1dHRvbiBwcmVzcyBub3RpZmljYXRpb24uXG4gICAgICogQGphIOODj+ODvOODieOCpuOCp+OCouODkOODg+OCr+ODnOOCv+ODs+OBruaKvOS4i+mAmuefpVxuICAgICAqIEBhcmdzIFtFdmVudF1cbiAgICAgKi9cbiAgICAnYmFja2J1dHRvbic6IFtFdmVudF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV2aWNlIG9yaWVudGF0aW9uIGNoYW5nZSBub3RpZmljYXRpb24uXG4gICAgICogQGphIOODh+ODkOOCpOOCueOCquODquOCqOODs+ODhuODvOOCt+ODp+ODs+WkieabtOmAmuefpVxuICAgICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9XaW5kb3cvb3JpZW50YXRpb25jaGFuZ2VfZXZlbnRcbiAgICAgKiBAYXJncyBbT3JpZW50YWlvbiwgYW5nbGVdXG4gICAgICovXG4gICAgJ29yaWVudGF0aW9uY2hhbmdlJzogW09yaWVudGF0aW9uLCBudW1iZXJdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGxpY2F0aW9uIGxhbmd1Z2F0ZSBjaGFuZ2Ugbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PoqIDoqp7lpInmm7TpgJrnn6VcbiAgICAgKiBAYXJncyBbbGFuZ3VhZ2UsIGkxOG4uVEZ1bmN0aW9uXVxuICAgICAqL1xuICAgICdsYW5ndWFnZWNoYW5nZSc6IFtzdHJpbmcsIGkxOG4uVEZ1bmN0aW9uXTtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIEFwcENvbnRleHR9IGNyZWF0ZSBvcHRpb25zLlxuICogQGphIHtAbGluayBBcHBDb250ZXh0fSDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0T3B0aW9ucyBleHRlbmRzIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSBmb3IgbWFpbiByb3V0ZXIuXG4gICAgICogQGphIOODoeOCpOODs+ODq+ODvOOCv+ODvOOBriB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAZGVmYXVsdCBgI2FwcGBcbiAgICAgKi9cbiAgICBtYWluPzogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019IGFzc2lnbmVkIHRvIHRoZSBzcGxhc2ggc2NyZWVuLiA8YnI+XG4gICAgICogICAgIEl0IHdpbGwgYmUgcmVtb3ZlZCBqdXN0IGJlZm9yZSBhcHBsaWFjdGlvbiByZWFkeS5cbiAgICAgKiBAamEg44K544OX44Op44OD44K344Ol44K544Kv44Oq44O844Oz44Gr5Ymy44KK5b2T44Gm44KJ44KM44Gm44GE44KLIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlyA8YnI+XG4gICAgICogICAgIOa6luWCmeWujOS6huebtOWJjeOBq+WJiumZpOOBleOCjOOCi1xuICAgICAqL1xuICAgIHNwbGFzaD86IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBMb2NhbGl6YXRpb24gbW9kdWxlIG9wdGlvbnMuXG4gICAgICogQGphIOODreODvOOCq+ODqeOCpOOCuuODouOCuOODpeODvOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGkxOG4/OiBJMThOT3B0aW9ucztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gc3RhbmQtYnkgZnVuY3Rpb24gZm9yIGFwcGxpY2F0aW9uIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7Pmupblgpnlrozkuobjga7jgZ/jgoHjga7lvoXjgaHlj5fjgZHplqLmlbBcbiAgICAgKi9cbiAgICB3YWl0Rm9yUmVhZHk/OiBQcm9taXNlPHVua25vd24+IHwgKChjb250ZXh0OiBBcHBDb250ZXh0KSA9PiBQcm9taXNlPHVua25vd24+KTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gYGRvY3VtZW50YCBldmVudCBmb3IgYXBwbGljYXRpb24gcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+a6luWCmeWujOS6huOBruOBn+OCgeOBruOCq+OCueOCv+ODoCBgZG9jdW1lbnRgIOOCpOODmeODs+ODiFxuICAgICAqL1xuICAgIGRvY3VtZW50RXZlbnRSZWFkeT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXN0b20gYGRvY3VtZW50YCBldmVudCBmb3IgaGFyZHdhcmUgYmFjayBidXR0b24uIGRlZmF1bHQ6IGBiYWNrYnV0dG9uYFxuICAgICAqIEBqYSDjg4/jg7zjg4njgqbjgqfjgqLjg5Djg4Pjgq/jg5zjgr/jg7Pjga7jgZ/jgoHjga7jgqvjgrnjgr/jg6AgYGRvY3VtZW50YCDjgqTjg5njg7Pjg4guIOaXouWumuWApCBgYmFja2J1dHRvbmBcbiAgICAgKi9cbiAgICBkb2N1bWVudEV2ZW50QmFja0J1dHRvbj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBTcGVjaWZ5IHRydWUgdG8gZGVzdHJveSB0aGUgaW5zdGFuY2UgY2FjaGUgYW5kIHJlc2V0LiAoZm9yIGRlYnVnKVxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4TjgZfjg6rjgrvjg4Pjg4jjgZnjgovloLTlkIjjgasgdHJ1ZSDjgpLmjIflrpogKOODh+ODkOODg+OCsOeUqClcbiAgICAgKi9cbiAgICByZXNldD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIEFwcGxpY2F0aW9uIGNvbnRleHQgaW50ZXJmYWNlXG4gKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz44Kz44Oz44OG44Kt44K544OIXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dCBleHRlbmRzIFN1YnNjcmliYWJsZTxBcHBDb250ZXh0RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbWFpbiByb3V0ZXIgaW50ZXJmYWNlXG4gICAgICogQGphIOODoeOCpOODs+ODq+ODvOOCv+ODvFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJvdXRlcjogUm91dGVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBQcm9taXNlYCBmb3IgcmVhZHkgc3RhdGUuXG4gICAgICogQGphIOa6luWCmeWujOS6hueiuuiqjeeUqCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgcmVhZHk6IFByb21pc2U8dm9pZD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VycmVudCBhY3RpdmUgcGFnZSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo44Ki44Kv44OG44Kj44OW44Gq44Oa44O844K444Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgYWN0aXZlUGFnZTogUGFnZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDdXJyZW50IHtAbGluayBPcmllbnRhdGlvbn0gaWQuXG4gICAgICogQGphIOePvuWcqOOBriB7QGxpbmsgT3JpZW50YXRpb259IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IG9yaWVudGF0aW9uOiBPcmllbnRhdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVc2VyLWRlZmluYWJsZSBleHRlbmRlZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg44Om44O844K244O85a6a576p5Y+v6IO944Gq5ouh5by144OX44Ot44OR44OG44KjXG4gICAgICovXG4gICAgZXh0ZW5zaW9uOiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZXMgdGhlIGxhbmd1YWdlLlxuICAgICAqIEBqYSDoqIDoqp7jga7liIfjgormm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsbmdcbiAgICAgKiAgLSBgZW5gIGxvY2FsZSBzdHJpbmcgZXg6IGBlbmAsIGBlbi1VU2BcbiAgICAgKiAgLSBgamFgIOODreOCseODvOODq+aWh+WtlyBleDogYGVuYCwgYGVuLVVTYFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBlcnJvciBiZWhhdmlvdXJcbiAgICAgKiAgLSBgamFgIOOCqOODqeODvOaZguOBruaMr+OCi+iInuOBhOOCkuaMh+WumlxuICAgICAqL1xuICAgIGNoYW5nZUxhbmd1YWdlKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lcyBpZiBhIGdpdmVuIFVSTCBpcyB0aGUgcm91dGVyJ3MgY3VycmVudCBwYXRoLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gVVJMIOOBjOODq+ODvOOCv+ODvOOBruePvuWcqOOBruODkeOCueOBp+OBguOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgVVJMIHlvdSB3YW50IHRvIGlkZW50aWZ5XG4gICAgICogIC0gYGphYCDliKTliKXjgZfjgZ/jgYQgVVJMIOOCkuaMh+WumlxuICAgICAqL1xuICAgIGlzQ3VycmVudFBhdGgodXJsOiBzdHJpbmcpOiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuY29uc3QgX2luaXRpYWxSb3V0ZXM6IFJvdXRlUGFyYW1ldGVyc1tdID0gW107XG5cbi8qKlxuICogQGVuIFJvdXRlIHBhcmFtZXRlcnMgZm9yIHBhZ2UgcmVnaXN0cmF0aW9uLiBOZWVkIHRvIGRlc2NyaWJlIGBwYXRoYCwgYGNvbnRlbnRgLlxuICogQGphIOODmuODvOOCuOeZu+mMsueUqOODq+ODvOODiOODkeODqeODoeODvOOCvy4gYHBhdGhgLCBgY29udGVudGAg44Gu6KiY6L+w44GM5b+F6KaBXG4gKi9cbmV4cG9ydCB0eXBlIFBhZ2VSb3V0ZVBhcmFtZXRlcnMgPSBSZXF1aXJlZDxQaWNrPFJvdXRlUGFyYW1ldGVycywgJ2NvbnRlbnQnPj4gJiBSb3V0ZVBhcmFtZXRlcnM7XG5cbi8qKlxuICogQGVuIFByZS1yZWdpc3RlciBjb25jcmV0ZSB7QGxpbmsgUGFnZX0gY2xhc3MuIFJlZ2lzdGVyZWQgd2l0aCB0aGUgbWFpbiByb3V0ZXIgd2hlbiBpbnN0YW50aWF0aW5nIHtAbGluayBBcHBDb250ZXh0fS4gPGJyPlxuICogICAgIElmIGNvbnN0cnVjdG9yIG5lZWRzIGFyZ3VtZW50cywgYG9wdGlvbnMuY29tcG9uZW50T3B0aW9uc2AgaXMgYXZhaWxhYmxlLlxuICogQGphIFBhZ2Ug5YW36LGh5YyW44Kv44Op44K544Gu5LqL5YmN55m76YyyLiB7QGxpbmsgQXBwQ29udGV4dH0g44Gu44Kk44Oz44K544K/44Oz44K55YyW5pmC44Gr44Oh44Kk44Oz44Or44O844K/44O844Gr55m76Yyy44GV44KM44KLLiA8YnI+XG4gKiAgICAgY29uc3RydWN0b3Ig44KS5oyH5a6a44GZ44KL5byV5pWw44GM44GC44KL5aC05ZCI44GvLCBgb3B0aW9ucy5jb21wb25lbnRPcHRpb25zYCDjgpLliKnnlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgICAgUGFnZSxcbiAqICAgICBSb3V0ZXIsXG4gKiAgICAgQXBwQ29udGV4dCxcbiAqICAgICByZWdpc3RlclBhZ2UsXG4gKiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogY29uc3QgcGFnZUZhY3RvcnkgPSAocm91dGVyOiBSb3V0ZXIsIC4uLmFyZ3M6IGFueVtdKTogUGFnZSA9PiB7XG4gKiAgIDpcbiAqIH07XG4gKlxuICogLy8gcHJlLXJlZ2lzdHJhdGlvblxuICogcmVnaXN0ZXJQYWdlKHtcbiAqICAgICBwYXRoOiAncGFnZS1wYXRoJyxcbiAqICAgICBjb25wb25lbnQ6IHBhZ2VGYWN0b3J5LFxuICogICAgIGNvbnRlbnQ6ICcjcGFnZS1pZCdcbiAqIH0pO1xuICpcbiAqIC8vIGluaXRpYWwgYWNjZXNzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KHsgbWFpbjogJyNhcHAnIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgcm91dGUgcGF0aFxuICogIC0gYGphYCDjg6vjg7zjg4jjga7jg5HjgrlcbiAqIEBwYXJhbSBjb21wb25lbnRcbiAqICAtIGBlbmAgc3BlY2lmeSB0aGUgY29uc3RydWN0b3Igb3IgYnVpbHQgb2JqZWN0IG9mIHRoZSBwYWdlIGNvbXBvbmVudFxuICogIC0gYGphYCDjg5rjg7zjgrjjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgoLjgZfjgY/jga/mp4vnr4nmuIjjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJvdXRlIHBhcmFtZXRlcnNcbiAqICAtIGBqYWAg44Or44O844OI44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCBjb25zdCByZWdpc3RlclBhZ2UgPSAocGFyYW1zOiBQYWdlUm91dGVQYXJhbWV0ZXJzKTogdm9pZCA9PiB7XG4gICAgX2luaXRpYWxSb3V0ZXMucHVzaChwYXJhbXMpO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBBcHBDb250ZXh0IGltcGwgY2xhc3MgKi9cbmNsYXNzIEFwcGxpY2F0aW9uIGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8QXBwQ29udGV4dEV2ZW50PiBpbXBsZW1lbnRzIEFwcENvbnRleHQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JvdXRlcjogUm91dGVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JlYWR5ID0gbmV3IERlZmVycmVkKCk7XG4gICAgcHJpdmF0ZSBfZXh0ZW5zaW9uOiB1bmtub3duO1xuXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQXBwQ29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3QgeyBtYWluLCB3aW5kb3c6IHdpbiwgcm91dGVzOiBfcm91dGVzIH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCByb3V0ZXJPcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywgeyByb3V0ZXM6IF9yb3V0ZXMhLmNvbmNhdCguLi5faW5pdGlhbFJvdXRlcyksIHN0YXJ0OiBmYWxzZSB9KTtcbiAgICAgICAgdGhpcy5fd2luZG93ID0gd2luID8/IHdpbmRvdztcbiAgICAgICAgdGhpcy5fcm91dGVyID0gY3JlYXRlUm91dGVyKG1haW4gYXMgc3RyaW5nLCByb3V0ZXJPcHRzKTtcbiAgICAgICAgdm9pZCB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogQXBwQ29udGV4dFxuXG4gICAgZ2V0IHJvdXRlcigpOiBSb3V0ZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm91dGVyO1xuICAgIH1cblxuICAgIGdldCByZWFkeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWR5O1xuICAgIH1cblxuICAgIGdldCBhY3RpdmVQYWdlKCk6IFBhZ2Uge1xuICAgICAgICByZXR1cm4gKHRoaXMuX3JvdXRlci5jdXJyZW50Um91dGUgYXMgUm91dGUgJiBSZWNvcmQ8c3RyaW5nLCB7IHBhZ2U6IFBhZ2U7IH0+KVsnQHBhcmFtcyddPy5wYWdlIHx8IHt9O1xuICAgIH1cblxuICAgIGdldCBvcmllbnRhdGlvbigpOiBPcmllbnRhdGlvbiB7XG4gICAgICAgIGNvbnN0ICR3aW5kb3cgPSAkKHRoaXMuX3dpbmRvdyk7XG4gICAgICAgIHJldHVybiAoJHdpbmRvdy53aWR0aCgpIDwgJHdpbmRvdy5oZWlnaHQoKSkgPyBPcmllbnRhdGlvbi5QT1JUUkFJVCA6IE9yaWVudGF0aW9uLkxBTkRTQ0FQRTtcbiAgICB9XG5cbiAgICBnZXQgZXh0ZW5zaW9uKCk6IHVua25vd24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXh0ZW5zaW9uO1xuICAgIH1cblxuICAgIHNldCBleHRlbnNpb24odmFsOiB1bmtub3duKSB7XG4gICAgICAgIHRoaXMuX2V4dGVuc2lvbiA9IHZhbDtcbiAgICB9XG5cbiAgICBhc3luYyBjaGFuZ2VMYW5ndWFnZShsbmc6IHN0cmluZywgb3B0aW9ucz86IEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cik6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+IHtcbiAgICAgICAgY29uc3QgdCA9IGF3YWl0IGNoYW5nZUxhbmd1YWdlKGxuZywgb3B0aW9ucyk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3JvdXRlci5yZWZyZXNoKFJvdXRlclJlZnJlc2hMZXZlbC5ET01fQ0xFQVIpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2xhbmd1YWdlY2hhbmdlJywgZ2V0TGFuZ3VhZ2UoKSwgdCk7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH1cblxuICAgIGlzQ3VycmVudFBhdGgodXJsOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3Qgc3JjUGF0aCA9IHRvUm91dGVyUGF0aCh1cmwpO1xuICAgICAgICBjb25zdCBjdXJQYXRoID0gdG9Sb3V0ZXJQYXRoKCh0aGlzLl9yb3V0ZXIuY3VycmVudFJvdXRlIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZT4pWydAaWQnXSk7XG4gICAgICAgIHJldHVybiBzcmNQYXRoID09PSBjdXJQYXRoO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIHByaXZhdGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHNwbGFzaCwgaTE4biwgd2FpdEZvclJlYWR5LCBkb2N1bWVudEV2ZW50UmVhZHksIGRvY3VtZW50RXZlbnRCYWNrQnV0dG9uLCBzdGFydCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3QgeyBfd2luZG93IH0gPSB0aGlzO1xuXG4gICAgICAgIF93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLm9uR2xvYmFsRXJyb3IuYmluZCh0aGlzKSk7XG4gICAgICAgIF93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndW5oYW5kbGVkcmVqZWN0aW9uJywgdGhpcy5vbkdsb2JhbFVuaGFuZGxlZFJlamVjdGlvbi5iaW5kKHRoaXMpKTtcblxuICAgICAgICBhd2FpdCB3YWl0RG9tQ29udGVudExvYWRlZChfd2luZG93LmRvY3VtZW50KTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgaW5pdGlhbGl6ZUkxOE4oaTE4biksXG4gICAgICAgICAgICBpc0Z1bmN0aW9uKHdhaXRGb3JSZWFkeSkgPyB3YWl0Rm9yUmVhZHkodGhpcykgOiB3YWl0Rm9yUmVhZHksXG4gICAgICAgICAgICB3YWl0RG9jdW1lbnRFdmVudFJlYWR5KF93aW5kb3cuZG9jdW1lbnQsIGRvY3VtZW50RXZlbnRSZWFkeSksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIF93aW5kb3cuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudEV2ZW50QmFja0J1dHRvbiEsIHRoaXMub25IYW5kbGVCYWNrS2V5LmJpbmQodGhpcykpO1xuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vbkhhbmRsZU9yaWVudGF0aW9uQ2hhbmdlZC5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9yb3V0ZXIub24oJ2xvYWRlZCcsIHRoaXMub25QYWdlTG9hZGVkLmJpbmQodGhpcykpO1xuICAgICAgICBzdGFydCAmJiBhd2FpdCB0aGlzLl9yb3V0ZXIucmVmcmVzaCgpO1xuXG4gICAgICAgIC8vIHJlbW92ZSBzcGxhc2ggc2NyZWVuXG4gICAgICAgICQoc3BsYXNoLCBfd2luZG93LmRvY3VtZW50KS5yZW1vdmUoKTtcblxuICAgICAgICB0aGlzLl9yZWFkeS5yZXNvbHZlKCk7XG4gICAgICAgIHRoaXMucHVibGlzaCgncmVhZHknLCB0aGlzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIHByaXZhdGUgb25QYWdlTG9hZGVkKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQge1xuICAgICAgICBsb2NhbGl6ZShpbmZvLnRvLmVsKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uR2xvYmFsRXJyb3IoZXZlbnQ6IEVycm9yRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0dsb2JhbCBFcnJvcl0gJHtldmVudC5tZXNzYWdlfSwgJHtldmVudC5maWxlbmFtZX0sICR7ZXZlbnQuY29sbm99LCAke2V2ZW50LmVycm9yfWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25HbG9iYWxVbmhhbmRsZWRSZWplY3Rpb24oZXZlbnQ6IFByb21pc2VSZWplY3Rpb25FdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbR2xvYmFsIFVuaGFuZGxlZCBSZWplY3Rpb25dICR7ZXZlbnQucmVhc29ufWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25IYW5kbGVCYWNrS2V5KGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JhY2tidXR0b24nLCBldmVudCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBvbkhhbmRsZU9yaWVudGF0aW9uQ2hhbmdlZCgvKmV2ZW50OiBFdmVudCovKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLCBzY3JlZW4gfSA9IHRoaXMuX3dpbmRvdzsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICAgICAgYXdhaXQgd2FpdEZyYW1lKDEsIHJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uLCBzY3JlZW4ub3JpZW50YXRpb24uYW5nbGUpO1xuICAgIH1cbn1cblxuLyoqIGNvbnRleHQgY2FjaGUgKi9cbmxldCBfYXBwQ29udGV4dDogQXBwQ29udGV4dCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gQXBwbGljYXRpb24gY29udGV4dCBhY2Nlc3NcbiAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PjgrPjg7Pjg4bjgq3jgrnjg4jlj5blvpdcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcENvbnRleHQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICogYGBgXG4gKlxuICogLSBpbml0aWFsIGFjY2Vzc1xuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KHtcbiAqICAgICBtYWluOiAnI2FwcCcsXG4gKiAgICAgcm91dGVzOiBbXG4gKiAgICAgICAgIHsgcGF0aDogJy8nIH0sXG4gKiAgICAgICAgIHsgcGF0aDogJy9vbmUnIH0sXG4gKiAgICAgICAgIHsgcGF0aDogJy90d28nIH1cbiAqICAgICBdLFxuICogfSk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiAtIGZyb20gdGhlIHNlY29uZCB0aW1lIG9ud2FyZHNcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCgpO1xuICogOlxuICogYGBgXG4gKlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgaW5pdCBvcHRpb25zXG4gKiAgLSBgamFgIOWIneacn+WMluOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgQXBwQ29udGV4dCA9IChvcHRpb25zPzogQXBwQ29udGV4dE9wdGlvbnMpOiBBcHBDb250ZXh0ID0+IHtcbiAgICBjb25zdCBvcHRzID0gZ2V0QXBwQ29uZmlnKE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBtYWluOiAnI2FwcCcsXG4gICAgICAgIHN0YXJ0OiB0cnVlLFxuICAgICAgICByb3V0ZXM6IFtdLFxuICAgICAgICBkb2N1bWVudEV2ZW50QmFja0J1dHRvbjogJ2JhY2tidXR0b24nLFxuICAgIH0sIG9wdGlvbnMpIGFzIEFwcENvbnRleHRPcHRpb25zKTtcblxuICAgIGlmIChudWxsID09IG9wdGlvbnMgJiYgbnVsbCA9PSBfYXBwQ29udGV4dCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FQUF9DT05URVhUX05FRURfVE9fQkVfSU5JVElBTElaRUQsICdBcHBDb250ZXh0IHNob3VsZCBiZSBpbml0aWFsaXplZCB3aXRoIG9wdGlvbnMgYXQgbGVhc3Qgb25jZS4nKTtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5yZXNldCkge1xuICAgICAgICBfYXBwQ29udGV4dCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY2xlYXJJMThOU2V0dGluZ3MoKTtcbiAgICB9XG5cbiAgICBfYXBwQ29udGV4dCA/Pz0gbmV3IEFwcGxpY2F0aW9uKG9wdHMpO1xuICAgIHJldHVybiBfYXBwQ29udGV4dDtcbn07XG4iLCJpbXBvcnQgeyB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBWaWV3IH0gZnJvbSAnQGNkcC92aWV3JztcbmltcG9ydCB0eXBlIHtcbiAgICBSb3V0ZXIsXG4gICAgUm91dGUsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgUGFnZSxcbn0gZnJvbSAnQGNkcC9yb3V0ZXInO1xuaW1wb3J0IHsgQ3NzTmFtZSwgaGFzUGFydGlhbENsYXNzTmFtZSB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwYWdlLXZpZXc6cHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJvdXRlPzogUm91dGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gb2Yge0BsaW5rIFZpZXd9IHRoYXQgY2FuIGJlIHNwZWNpZmllZCBpbiBhcyB7QGxpbmsgUGFnZX0gb2Yge0BsaW5rIFJvdXRlcn0uXG4gKiBAamEge0BsaW5rIFJvdXRlcn0g44GuIHtAbGluayBQYWdlfSDjgavmjIflrprlj6/og73jgaoge0BsaW5rIFZpZXd9IOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUGFnZVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50ID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBQYWdlIHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3V0ZVxuICAgICAqICAtIGBlbmAgcm91dGUgY29udGV4dFxuICAgICAqICAtIGBqYWAg44Or44O844OI44Kz44Oz44OG44Kt44K544OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBWaWV3fSBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIHtAbGluayBWaWV3fSDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihyb3V0ZT86IFJvdXRlLCBvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXSA9IHsgcm91dGUgfTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBwYWdlIGlzIGFjdGl2ZS5cbiAgICAgKiBAamEg44Oa44O844K444GM44Ki44Kv44OG44Kj44OW44Gn44GC44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGFjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGhhc1BhcnRpYWxDbGFzc05hbWUodGhpcy5lbCwgQ3NzTmFtZS5QQUdFX0NVUlJFTlQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSb3V0ZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgcGFnZSAocHVibGljKS5cbiAgICAgKiBAamEg44Oa44O844K444Gr57SQ44Gl44GP44Or44O844OI44OH44O844K/ICjlhazplovnlKgpXG4gICAgICovXG4gICAgZ2V0IFsnQHJvdXRlJ10oKTogUm91dGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucm91dGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBSb3V0ZXJ9IGluc3RhbmNlXG4gICAgICogQGphIHtAbGluayBSb3V0ZXJ9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3JvdXRlKCk6IFJvdXRlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbJ0Byb3V0ZSddO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgUm91dGVyfSBpbnN0YW5jZVxuICAgICAqIEBqYSB7QGxpbmsgUm91dGVyfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9yb3V0ZXIoKTogUm91dGVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlPy5yb3V0ZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogVmlld1xuXG4gICAgLyoqIEBvdmVycmlkZSAqL1xuICAgIHJlbmRlciguLi5hcmdzOiB1bmtub3duW10pOiBhbnkgeyAvKiBvdmVycmlkYWJsZSAqLyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczogdXRpbGl6ZWQgcGFnZSBldmVudFxuXG4gICAgLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBuZXdseSBjb25zdHJ1Y3RlZCBieSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabmlrDopo/jgavmp4vnr4njgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlSW5pdCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VNb3VudGVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGNsb25lZCBhbmQgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM6KSH6KO944GV44KMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQ2xvbmVkKHRoaXNQYWdlOiBSb3V0ZSwgcHJldlBhZ2U6IFJvdXRlKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgcmVhZHkgdG8gYmUgYWN0aXZhdGVkIGFmdGVyIGluaXRpYWxpemF0aW9uLlxuICAgICAqIEBqYSDliJ3mnJ/ljJblvowsIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODmeODvOODiOWPr+iDveOBqueKtuaFi+OBq+OBquOCi+OBqOeZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VCZWZvcmVFbnRlcih0aGlzUGFnZTogUm91dGUsIHByZXZQYWdlOiBSb3V0ZSB8IHVuZGVmaW5lZCwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgZnVsbHkgZGlzcGxheWVkLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzlrozlhajjgavooajnpLrjgZXjgozjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQWZ0ZXJFbnRlcih0aGlzUGFnZTogUm91dGUsIHByZXZQYWdlOiBSb3V0ZSB8IHVuZGVmaW5lZCwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBwYWdlIGdvZXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavnp7vooYzjgZnjgovnm7TliY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQmVmb3JlTGVhdmUodGhpc1BhZ2U6IFJvdXRlLCBuZXh0UGFnZTogUm91dGUsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSBpcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+OBquOBo+OBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VBZnRlckxlYXZlKHRoaXNQYWdlOiBSb3V0ZSwgbmV4dFBhZ2U6IFJvdXRlLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXRhY2hlZCBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBi+OCieWIh+OCiumbouOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VVbm1vdW50ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRlc3Ryb3llZCBieSB0aGUgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm56C05qOE44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZVJlbW92ZWQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBQYWdlXG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBuZXdseSBjb25zdHJ1Y3RlZCBieSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabmlrDopo/jgavmp4vnr4njgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlSW5pdChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIGNvbnN0IHsgZWwgfSA9IHRvO1xuICAgICAgICBpZiAoZWwgIT09IHRoaXMuZWwgYXMgdW5rbm93bikge1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGVsIGFzIHVua25vd24gYXMgVEVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUluaXQodG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBq+aMv+WFpeOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VNb3VudGVkKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0byB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlTW91bnRlZCh0byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGNsb25lZCBhbmQgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM6KSH6KO944GV44KMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQ2xvbmVkKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQ2xvbmVkKHRvLCBmcm9tISk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIHJlYWR5IHRvIGJlIGFjdGl2YXRlZCBhZnRlciBpbml0aWFsaXphdGlvbi5cbiAgICAgKiBAamEg5Yid5pyf5YyW5b6MLCDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5njg7zjg4jlj6/og73jgarnirbmhYvjgavjgarjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQmVmb3JlRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQmVmb3JlRW50ZXIodG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UgaXMgZnVsbHkgZGlzcGxheWVkLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzlrozlhajjgavooajnpLrjgZXjgozjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQWZ0ZXJFbnRlcihpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VBZnRlckVudGVyKHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCBqdXN0IGJlZm9yZSB0aGUgcGFnZSBnb2VzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr56e76KGM44GZ44KL55u05YmN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUJlZm9yZUxlYXZlKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gZnJvbSE7XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUJlZm9yZUxlYXZlKGZyb20hLCB0bywgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UgaXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavjgarjgaPjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlQWZ0ZXJMZWF2ZShpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20hO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VBZnRlckxlYXZlKGZyb20hLCB0bywgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXRhY2hlZCBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYwgRE9NIOOBi+OCieWIh+OCiumbouOBleOCjOOBn+ebtOW+jOOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VVbm1vdW50ZWQoaW5mbzogUm91dGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5vblBhZ2VVbm1vdW50ZWQoaW5mbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGVzdHJveWVkIGJ5IHRoZSByb3V0ZXIuXG4gICAgICogQGphIOODmuODvOOCuOOBriBIVE1MRWxlbWVudCDjgYzjg6vjg7zjgr/jg7zjgavjgojjgaPjgabnoLTmo4TjgZXjgozjgZ/jgajjgY3jgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlUmVtb3ZlZChpbmZvOiBSb3V0ZSk6IHZvaWQge1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMub25QYWdlUmVtb3ZlZChpbmZvKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsic2FmZSIsImkxOG4iLCJnZXRDb25maWciLCJnZXRHbG9iYWxOYW1lc3BhY2UiLCJFdmVudFB1Ymxpc2hlciIsIkRlZmVycmVkIiwiY3JlYXRlUm91dGVyIiwiJCIsImNoYW5nZUxhbmd1YWdlIiwiZ2V0TGFuZ3VhZ2UiLCJ0b1JvdXRlclBhdGgiLCJpbml0aWFsaXplSTE4TiIsImlzRnVuY3Rpb24iLCJsb2NhbGl6ZSIsIndhaXRGcmFtZSIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsIlZpZXciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7SUFJRztJQUVILENBQUEsWUFBcUI7SUFNakI7OztJQUdHO0lBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtJQUFBLElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGFBQXNDO1lBQ3RDLFdBQUEsQ0FBQSxXQUFBLENBQUEsMENBQUEsQ0FBQSxHQUEyQyxXQUFBLENBQUEsa0JBQWtCLENBQUEsR0FBQSw2QkFBdUIsRUFBQSw2QkFBc0IsQ0FBQyxFQUFFLCtEQUErRCxDQUFDLENBQUEsR0FBQSwwQ0FBQTtJQUNqTCxJQUFBLENBQUMsR0FIc0I7SUFJM0IsQ0FBQyxHQWRvQjs7SUNMckIsaUJBQXdCLE1BQU0sTUFBTSxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQzs7SUNROUQ7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LFNBQVMsRUFBRSxNQUFNLENBQUM7UUFDOUQ7SUFFQTs7OztJQUlHO0lBQ0gsSUFBQSxjQUFjLENBQUMsSUFBcUIsRUFBQTtZQUNoQyxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSTtJQUM1QyxRQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtJQUM1QixRQUFBLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQztRQUM3RDtJQUVBOzs7O0lBSUc7SUFDSCxJQUFBLGVBQWUsQ0FBQyxJQUFxQixFQUFBO1lBQ2pDLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJO0lBQzVDLFFBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFLO0lBQy9CLFFBQUEsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDO1FBQy9EO0lBRUE7Ozs7SUFJRztJQUNILElBQUEsY0FBYyxDQUFDLElBQXFCLEVBQUE7WUFDaEMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUk7SUFDNUMsUUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUs7SUFDL0IsUUFBQSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFLLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUM7UUFDOUQ7SUFFQTs7OztJQUlHO0lBQ0gsSUFBQSxhQUFhLENBQUMsSUFBVyxFQUFBO0lBQ3JCLFFBQUEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7UUFDOUI7SUFFQTs7OztJQUlHO0lBQ0gsSUFBQSxXQUFXLENBQUMsSUFBVyxFQUFBO1lBQ25CLElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDZCxRQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEdBQUcsU0FBUztJQUNuQyxRQUFBLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDO1FBQzVCO0lBQ0g7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvYXBwLyJ9