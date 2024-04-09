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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaW50ZXJuYWwudHMiLCJjb250ZXh0LnRzIiwicGFnZS12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHN0eWxpc3RpYzpqcy9tYXgtbGVuLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIEFQUCA9IENEUF9LTk9XTl9NT0RVTEUuQVBQICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEFQUF9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9BUFBfQ09OVEVYVF9ORUVEX1RPX0JFX0lOSVRJQUxJWkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQVBQICsgMSwgJ0FwcENvbnRleHQgbmVlZCB0byBiZSBpbml0aWFsaXplZCB3aXRoIG9wdGlvbnMgYXQgbGVhc3Qgb25jZS4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuIiwiaW1wb3J0IHsgZ2V0R2xvYmFsTmFtZXNwYWNlLCBnZXRDb25maWcgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvaTE4bic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENzc05hbWUge1xuICAgIFBBR0VfQ1VSUkVOVCAgPSAncGFnZS1jdXJyZW50JyxcbiAgICBQQUdFX1BSRVZJT1VTID0gJ3BhZ2UtcHJldmlvdXMnLFxufVxuXG4vKiogQGludGVybmFsIHBhcnRpYWwgbWF0Y2ggY2xhc3MgbmFtZSAqL1xuZXhwb3J0IGNvbnN0IGhhc1BhcnRpYWxDbGFzc05hbWUgPSA8VCBleHRlbmRzIEVsZW1lbnQ+KGVsOiBULCBjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBlbC5jbGFzc0xpc3QpIHtcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZm9yY2UgY2xlYXIgaTE4biBzZXR0aW5ncyAqL1xuZXhwb3J0IGNvbnN0IGNsZWFySTE4TlNldHRpbmdzID0gKCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGNvbnRleHQ6IFBhcnRpYWw8dHlwZW9mIGkxOG4+ID0gaTE4bjtcbiAgICBkZWxldGUgY29udGV4dC5vcHRpb25zO1xuICAgIGRlbGV0ZSBjb250ZXh0Lmxhbmd1YWdlO1xuICAgIGRlbGV0ZSBjb250ZXh0Lmxhbmd1YWdlcztcbiAgICBkZWxldGUgY29udGV4dC5pc0luaXRpYWxpemVkO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGdldEFwcENvbmZpZyA9IDxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBUKTogVCA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHt9LFxuICAgICAgICBnZXRDb25maWc8VD4oKSwgICAgICAgICAgICAgICAgICAvLyBDRFAuQ29uZmlnXG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZTxUPignQ29uZmlnJyksIC8vIGdsb2JhbCBDb25maWdcbiAgICAgICAgYmFzZSxcbiAgICApO1xufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgRE9NQ29udGVudExvYWRlZCAqL1xuZXhwb3J0IGNvbnN0IHdhaXREb21Db250ZW50TG9hZGVkID0gYXN5bmMgKGNvbnRleHQ6IERvY3VtZW50KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgJ2xvYWRpbmcnID09PSBjb250ZXh0LnJlYWR5U3RhdGUgJiYgYXdhaXQgbmV3IFByb21pc2U8dW5rbm93bj4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIGN1c3RvbSBkb2N1bWVudCBldmVudCByZWFkeSAqL1xuZXhwb3J0IGNvbnN0IHdhaXREb2N1bWVudEV2ZW50UmVhZHkgPSBhc3luYyAoY29udGV4dDogRG9jdW1lbnQsIGV2ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBudWxsICE9IGV2ZW50ICYmIGF3YWl0IG5ldyBQcm9taXNlPHVua25vd24+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHJlc29sdmUsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgSTE4Tk9wdGlvbnMsXG4gICAgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyLFxuICAgIGluaXRpYWxpemVJMThOLFxuICAgIGxvY2FsaXplLFxuICAgIGdldExhbmd1YWdlLFxuICAgIGNoYW5nZUxhbmd1YWdlLFxuICAgIGkxOG4sXG59IGZyb20gJ0BjZHAvaTE4bic7XG5pbXBvcnQge1xuICAgIFJvdXRlLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXJSZWZyZXNoTGV2ZWwsXG4gICAgUm91dGVyLFxuICAgIFBhZ2UsXG4gICAgY3JlYXRlUm91dGVyLFxufSBmcm9tICdAY2RwL3JvdXRlcic7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIGNsZWFySTE4TlNldHRpbmdzLFxuICAgIGdldEFwcENvbmZpZyxcbiAgICB3YWl0RG9tQ29udGVudExvYWRlZCxcbiAgICB3YWl0RG9jdW1lbnRFdmVudFJlYWR5LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gYG9yaWVudGF0aW9uYCBpZGVudGlmaWVyXG4gKiBAamEgYG9yaWVudGF0aW9uYCDorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT3JpZW50YXRpb24ge1xuICAgIFBPUlRSQUlUICA9ICdwb3J0cmFpdCcsXG4gICAgTEFORFNDQVBFID0gJ2xhbmRzY2FwZScsXG59XG5cbi8qKlxuICogQGVuIFRoZSBldmVudCBkZWZpbml0aW9uIGZpcmVkIGluIHtAbGluayBBcHBDb250ZXh0fS5cbiAqIEBqYSB7QGxpbmsgQXBwQ29udGV4dH0g5YaF44GL44KJ55m66KGM44GV44KM44KL44Kk44OZ44Oz44OI5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dEV2ZW50IHtcbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbGljYXRpb24gcmVhZHkgbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PmupblgpnlrozkuobpgJrnn6VcbiAgICAgKiBAYXJncyBbY29udGV4dF1cbiAgICAgKi9cbiAgICAncmVhZHknOiBbQXBwQ29udGV4dF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSGFyZHdhcmUgYmFjayBidXR0b24gcHJlc3Mgbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjg4/jg7zjg4njgqbjgqfjgqLjg5Djg4Pjgq/jg5zjgr/jg7Pjga7mirzkuIvpgJrnn6VcbiAgICAgKiBAYXJncyBbRXZlbnRdXG4gICAgICovXG4gICAgJ2JhY2tidXR0b24nOiBbRXZlbnRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIERldmljZSBvcmllbnRhdGlvbiBjaGFuZ2Ugbm90aWZpY2F0aW9uLlxuICAgICAqIEBqYSDjg4fjg5DjgqTjgrnjgqrjg6rjgqjjg7Pjg4bjg7zjgrfjg6fjg7PlpInmm7TpgJrnn6VcbiAgICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvV2luZG93L29yaWVudGF0aW9uY2hhbmdlX2V2ZW50XG4gICAgICogQGFyZ3MgW09yaWVudGFpb24sIGFuZ2xlXVxuICAgICAqL1xuICAgICdvcmllbnRhdGlvbmNoYW5nZSc6IFtPcmllbnRhdGlvbiwgbnVtYmVyXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBsaWNhdGlvbiBsYW5ndWdhdGUgY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz6KiA6Kqe5aSJ5pu06YCa55+lXG4gICAgICogQGFyZ3MgW2xhbmd1YWdlLCBpMThuLlRGdW5jdGlvbl1cbiAgICAgKi9cbiAgICAnbGFuZ3VhZ2VjaGFuZ2UnOiBbc3RyaW5nLCBpMThuLlRGdW5jdGlvbl07XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBBcHBDb250ZXh0fSBjcmVhdGUgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgQXBwQ29udGV4dH0g5qeL56+J44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dE9wdGlvbnMgZXh0ZW5kcyBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0gZm9yIG1haW4gcm91dGVyLlxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjga4ge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQGRlZmF1bHQgYCNhcHBgXG4gICAgICovXG4gICAgbWFpbj86IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSBhc3NpZ25lZCB0byB0aGUgc3BsYXNoIHNjcmVlbi4gPGJyPlxuICAgICAqICAgICBJdCB3aWxsIGJlIHJlbW92ZWQganVzdCBiZWZvcmUgYXBwbGlhY3Rpb24gcmVhZHkuXG4gICAgICogQGphIOOCueODl+ODqeODg+OCt+ODpeOCueOCr+ODquODvOODs+OBq+WJsuOCiuW9k+OBpuOCieOCjOOBpuOBhOOCiyB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcgPGJyPlxuICAgICAqICAgICDmupblgpnlrozkuobnm7TliY3jgavliYrpmaTjgZXjgozjgotcbiAgICAgKi9cbiAgICBzcGxhc2g/OiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTG9jYWxpemF0aW9uIG1vZHVsZSBvcHRpb25zLlxuICAgICAqIEBqYSDjg63jg7zjgqvjg6njgqTjgrrjg6Ljgrjjg6Xjg7zjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBpMThuPzogSTE4Tk9wdGlvbnM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIHN0YW5kLWJ5IGZ1bmN0aW9uIGZvciBhcHBsaWNhdGlvbiByZWFkeSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5rqW5YKZ5a6M5LqG44Gu44Gf44KB44Gu5b6F44Gh5Y+X44GR6Zai5pWwXG4gICAgICovXG4gICAgd2FpdEZvclJlYWR5PzogUHJvbWlzZTx1bmtub3duPiB8ICgoY29udGV4dDogQXBwQ29udGV4dCkgPT4gUHJvbWlzZTx1bmtub3duPik7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIGBkb2N1bWVudGAgZXZlbnQgZm9yIGFwcGxpY2F0aW9uIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7Pmupblgpnlrozkuobjga7jgZ/jgoHjga7jgqvjgrnjgr/jg6AgYGRvY3VtZW50YCDjgqTjg5njg7Pjg4hcbiAgICAgKi9cbiAgICBkb2N1bWVudEV2ZW50UmVhZHk/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VzdG9tIGBkb2N1bWVudGAgZXZlbnQgZm9yIGhhcmR3YXJlIGJhY2sgYnV0dG9uLiBkZWZhdWx0OiBgYmFja2J1dHRvbmBcbiAgICAgKiBAamEg44OP44O844OJ44Km44Kn44Ki44OQ44OD44Kv44Oc44K/44Oz44Gu44Gf44KB44Gu44Kr44K544K/44OgIGBkb2N1bWVudGAg44Kk44OZ44Oz44OILiDml6LlrprlgKQgYGJhY2tidXR0b25gXG4gICAgICovXG4gICAgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gU3BlY2lmeSB0cnVlIHRvIGRlc3Ryb3kgdGhlIGluc3RhbmNlIGNhY2hlIGFuZCByZXNldC4gKGZvciBkZWJ1ZylcbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Kt44Oj44OD44K344Ol44KS56C05qOE44GX44Oq44K744OD44OI44GZ44KL5aC05ZCI44GrIHRydWUg44KS5oyH5a6aICjjg4fjg5Djg4PjgrDnlKgpXG4gICAgICovXG4gICAgcmVzZXQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBBcHBsaWNhdGlvbiBjb250ZXh0IGludGVyZmFjZVxuICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+OCs+ODs+ODhuOCreOCueODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHQgZXh0ZW5kcyBTdWJzY3JpYmFibGU8QXBwQ29udGV4dEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIG1haW4gcm91dGVyIGludGVyZmFjZVxuICAgICAqIEBqYSDjg6HjgqTjg7Pjg6vjg7zjgr/jg7xcbiAgICAgKi9cbiAgICByZWFkb25seSByb3V0ZXI6IFJvdXRlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgUHJvbWlzZWAgZm9yIHJlYWR5IHN0YXRlLlxuICAgICAqIEBqYSDmupblgpnlrozkuobnorroqo3nlKggYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHJlYWR5OiBQcm9taXNlPHZvaWQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEN1cnJlbnQgYWN0aXZlIHBhZ2UgaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOOCouOCr+ODhuOCo+ODluOBquODmuODvOOCuOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGFjdGl2ZVBhZ2U6IFBhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3VycmVudCB7QGxpbmsgT3JpZW50YXRpb259IGlkLlxuICAgICAqIEBqYSDnj77lnKjjga4ge0BsaW5rIE9yaWVudGF0aW9ufSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICByZWFkb25seSBvcmllbnRhdGlvbjogT3JpZW50YXRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlci1kZWZpbmFibGUgZXh0ZW5kZWQgcHJvcGVydHkuXG4gICAgICogQGphIOODpuODvOOCtuODvOWumue+qeWPr+iDveOBquaLoeW8teODl+ODreODkeODhuOCo1xuICAgICAqL1xuICAgIGV4dGVuc2lvbjogdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VzIHRoZSBsYW5ndWFnZS5cbiAgICAgKiBAamEg6KiA6Kqe44Gu5YiH44KK5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbG5nXG4gICAgICogIC0gYGVuYCBsb2NhbGUgc3RyaW5nIGV4OiBgZW5gLCBgZW4tVVNgXG4gICAgICogIC0gYGphYCDjg63jgrHjg7zjg6vmloflrZcgZXg6IGBlbmAsIGBlbi1VU2BcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZXJyb3IgYmVoYXZpb3VyXG4gICAgICogIC0gYGphYCDjgqjjg6njg7zmmYLjga7mjK/jgovoiJ7jgYTjgpLmjIflrppcbiAgICAgKi9cbiAgICBjaGFuZ2VMYW5ndWFnZShsbmc6IHN0cmluZywgb3B0aW9ucz86IEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cik6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuY29uc3QgX2luaXRpYWxQYWdlczogUm91dGVQYXJhbWV0ZXJzW10gPSBbXTtcblxuLyoqXG4gKiBAZW4gUm91dGUgcGFyYW1ldGVycyBmb3IgcGFnZSByZWdpc3RyYXRpb24uIE5lZWQgdG8gZGVzY3JpYmUgYHBhdGhgLCBgY29udGVudGAuXG4gKiBAamEg44Oa44O844K455m76Yyy55So44Or44O844OI44OR44Op44Oh44O844K/LiBgcGF0aGAsIGBjb250ZW50YCDjga7oqJjov7DjgYzlv4XopoFcbiAqL1xuZXhwb3J0IHR5cGUgUGFnZVJvdXRlUGFyYW1ldGVycyA9IFJlcXVpcmVkPFBpY2s8Um91dGVQYXJhbWV0ZXJzLCAnY29udGVudCc+PiAmIFJvdXRlUGFyYW1ldGVycztcblxuLyoqXG4gKiBAZW4gUHJlLXJlZ2lzdGVyIGNvbmNyZXRlIHtAbGluayBQYWdlfSBjbGFzcy4gUmVnaXN0ZXJlZCB3aXRoIHRoZSBtYWluIHJvdXRlciB3aGVuIGluc3RhbnRpYXRpbmcge0BsaW5rIEFwcENvbnRleHR9LiA8YnI+XG4gKiAgICAgSWYgY29uc3RydWN0b3IgbmVlZHMgYXJndW1lbnRzLCBgb3B0aW9ucy5jb21wb25lbnRPcHRpb25zYCBpcyBhdmFpbGFibGUuXG4gKiBAamEgUGFnZSDlhbfosaHljJbjgq/jg6njgrnjga7kuovliY3nmbvpjLIuIHtAbGluayBBcHBDb250ZXh0fSDjga7jgqTjg7Pjgrnjgr/jg7PjgrnljJbmmYLjgavjg6HjgqTjg7Pjg6vjg7zjgr/jg7zjgavnmbvpjLLjgZXjgozjgosuIDxicj5cbiAqICAgICBjb25zdHJ1Y3RvciDjgpLmjIflrprjgZnjgovlvJXmlbDjgYzjgYLjgovloLTlkIjjga8sIGBvcHRpb25zLmNvbXBvbmVudE9wdGlvbnNgIOOCkuWIqeeUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgICBQYWdlLFxuICogICAgIFJvdXRlcixcbiAqICAgICBBcHBDb250ZXh0LFxuICogICAgIHJlZ2lzdGVyUGFnZSxcbiAqIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBjb25zdCBwYWdlRmFjdG9yeSA9IChyb3V0ZXI6IFJvdXRlciwgLi4uYXJnczogYW55W10pOiBQYWdlID0+IHtcbiAqICAgOlxuICogfTtcbiAqIFxuICogLy8gcHJlLXJlZ2lzdHJhdGlvblxuICogcmVnaXN0ZXJQYWdlKHtcbiAqICAgICBwYXRoOiAncGFnZS1wYXRoJyxcbiAqICAgICBjb25wb25lbnQ6IHBhZ2VGYWN0b3J5LFxuICogICAgIGNvbnRlbnQ6ICcjcGFnZS1pZCdcbiAqIH0pO1xuICpcbiAqIC8vIGluaXRpYWwgYWNjZXNzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KHsgbWFpbjogJyNhcHAnIH0pO1xuICogOlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgcm91dGUgcGF0aFxuICogIC0gYGphYCDjg6vjg7zjg4jjga7jg5HjgrlcbiAqIEBwYXJhbSBjb21wb25lbnRcbiAqICAtIGBlbmAgc3BlY2lmeSB0aGUgY29uc3RydWN0b3Igb3IgYnVpbHQgb2JqZWN0IG9mIHRoZSBwYWdlIGNvbXBvbmVudFxuICogIC0gYGphYCDjg5rjg7zjgrjjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgoLjgZfjgY/jga/mp4vnr4nmuIjjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJvdXRlIHBhcmFtZXRlcnNcbiAqICAtIGBqYWAg44Or44O844OI44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCBjb25zdCByZWdpc3RlclBhZ2UgPSAocGFyYW1zOiBQYWdlUm91dGVQYXJhbWV0ZXJzKTogdm9pZCA9PiB7XG4gICAgX2luaXRpYWxQYWdlcy5wdXNoKHBhcmFtcyk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEFwcENvbnRleHQgaW1wbCBjbGFzcyAqL1xuY2xhc3MgQXBwbGljYXRpb24gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxBcHBDb250ZXh0RXZlbnQ+IGltcGxlbWVudHMgQXBwQ29udGV4dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfd2luZG93OiBXaW5kb3c7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm91dGVyOiBSb3V0ZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcmVhZHkgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICBwcml2YXRlIF9leHRlbnNpb246IHVua25vd247XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcHBDb250ZXh0T3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCB7IG1haW4sIHdpbmRvdzogd2luIH0gPSBvcHRpb25zO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW4gPz8gd2luZG93O1xuICAgICAgICB0aGlzLl9yb3V0ZXIgPSBjcmVhdGVSb3V0ZXIobWFpbiBhcyBzdHJpbmcsIG9wdGlvbnMpO1xuICAgICAgICB2b2lkIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBBcHBDb250ZXh0XG5cbiAgICBnZXQgcm91dGVyKCk6IFJvdXRlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXI7XG4gICAgfVxuXG4gICAgZ2V0IHJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHk7XG4gICAgfVxuXG4gICAgZ2V0IGFjdGl2ZVBhZ2UoKTogUGFnZSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fcm91dGVyLmN1cnJlbnRSb3V0ZSBhcyBSb3V0ZSAmIFJlY29yZDxzdHJpbmcsIHsgcGFnZTogUGFnZTsgfT4pWydAcGFyYW1zJ10/LnBhZ2UgfHwge307XG4gICAgfVxuXG4gICAgZ2V0IG9yaWVudGF0aW9uKCk6IE9yaWVudGF0aW9uIHtcbiAgICAgICAgY29uc3QgJHdpbmRvdyA9ICQodGhpcy5fd2luZG93KTtcbiAgICAgICAgcmV0dXJuICgkd2luZG93LndpZHRoKCkgPCAkd2luZG93LmhlaWdodCgpKSA/IE9yaWVudGF0aW9uLlBPUlRSQUlUIDogT3JpZW50YXRpb24uTEFORFNDQVBFO1xuICAgIH1cblxuICAgIGdldCBleHRlbnNpb24oKTogdW5rbm93biB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHRlbnNpb247XG4gICAgfVxuXG4gICAgc2V0IGV4dGVuc2lvbih2YWw6IHVua25vd24pIHtcbiAgICAgICAgdGhpcy5fZXh0ZW5zaW9uID0gdmFsO1xuICAgIH1cblxuICAgIGFzeW5jIGNoYW5nZUxhbmd1YWdlKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4ge1xuICAgICAgICBjb25zdCB0ID0gYXdhaXQgY2hhbmdlTGFuZ3VhZ2UobG5nLCBvcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fcm91dGVyLnJlZnJlc2goUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUik7XG4gICAgICAgIHRoaXMucHVibGlzaCgnbGFuZ3VhZ2VjaGFuZ2UnLCBnZXRMYW5ndWFnZSgpLCB0KTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFwcENvbnRleHRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgc3BsYXNoLCBpMThuLCB3YWl0Rm9yUmVhZHksIGRvY3VtZW50RXZlbnRSZWFkeSwgZG9jdW1lbnRFdmVudEJhY2tCdXR0b24gfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgX3dpbmRvdyB9ID0gdGhpcztcblxuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5vbkdsb2JhbEVycm9yLmJpbmQodGhpcykpO1xuICAgICAgICBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VuaGFuZGxlZHJlamVjdGlvbicsIHRoaXMub25HbG9iYWxVbmhhbmRsZWRSZWplY3Rpb24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgYXdhaXQgd2FpdERvbUNvbnRlbnRMb2FkZWQoX3dpbmRvdy5kb2N1bWVudCk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIGluaXRpYWxpemVJMThOKGkxOG4pLFxuICAgICAgICAgICAgaXNGdW5jdGlvbih3YWl0Rm9yUmVhZHkpID8gd2FpdEZvclJlYWR5KHRoaXMpIDogd2FpdEZvclJlYWR5LFxuICAgICAgICAgICAgd2FpdERvY3VtZW50RXZlbnRSZWFkeShfd2luZG93LmRvY3VtZW50LCBkb2N1bWVudEV2ZW50UmVhZHkpLFxuICAgICAgICBdKTtcblxuICAgICAgICBfd2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnRFdmVudEJhY2tCdXR0b24hLCB0aGlzLm9uSGFuZGxlQmFja0tleS5iaW5kKHRoaXMpKTtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub25IYW5kbGVPcmllbnRhdGlvbkNoYW5nZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fcm91dGVyLm9uKCdsb2FkZWQnLCB0aGlzLm9uUGFnZUxvYWRlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fcm91dGVyLnJlZ2lzdGVyKF9pbml0aWFsUGFnZXMsIHRydWUpO1xuXG4gICAgICAgIC8vIHJlbW92ZSBzcGxhc2ggc2NyZWVuXG4gICAgICAgICQoc3BsYXNoLCBfd2luZG93LmRvY3VtZW50KS5yZW1vdmUoKTtcblxuICAgICAgICB0aGlzLl9yZWFkeS5yZXNvbHZlKCk7XG4gICAgICAgIHRoaXMucHVibGlzaCgncmVhZHknLCB0aGlzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIHByaXZhdGUgb25QYWdlTG9hZGVkKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQge1xuICAgICAgICBsb2NhbGl6ZShpbmZvLnRvLmVsKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uR2xvYmFsRXJyb3IoZXZlbnQ6IEVycm9yRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0dsb2JhbCBFcnJvcl0gJHtldmVudC5tZXNzYWdlfSwgJHtldmVudC5maWxlbmFtZX0sICR7ZXZlbnQuY29sbm99LCAke2V2ZW50LmVycm9yfWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25HbG9iYWxVbmhhbmRsZWRSZWplY3Rpb24oZXZlbnQ6IFByb21pc2VSZWplY3Rpb25FdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbR2xvYmFsIFVuaGFuZGxlZCBSZWplY3Rpb25dICR7ZXZlbnQucmVhc29ufWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25IYW5kbGVCYWNrS2V5KGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JhY2tidXR0b24nLCBldmVudCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBvbkhhbmRsZU9yaWVudGF0aW9uQ2hhbmdlZCgvKmV2ZW50OiBFdmVudCovKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLCBzY3JlZW4gfSA9IHRoaXMuX3dpbmRvdzsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICAgICAgYXdhaXQgd2FpdEZyYW1lKDEsIHJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uLCBzY3JlZW4ub3JpZW50YXRpb24uYW5nbGUpO1xuICAgIH1cbn1cblxuLyoqIGNvbnRleHQgY2FjaGUgKi9cbmxldCBfYXBwQ29udGV4dDogQXBwQ29udGV4dCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gQXBwbGljYXRpb24gY29udGV4dCBhY2Nlc3NcbiAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PjgrPjg7Pjg4bjgq3jgrnjg4jlj5blvpdcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcENvbnRleHQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICogYGBgXG4gKlxuICogLSBpbml0aWFsIGFjY2Vzc1xuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcHAgPSBBcHBDb250ZXh0KHtcbiAqICAgICBtYWluOiAnI2FwcCcsXG4gKiAgICAgcm91dGVzOiBbXG4gKiAgICAgICAgIHsgcGF0aDogJy8nIH0sXG4gKiAgICAgICAgIHsgcGF0aDogJy9vbmUnIH0sXG4gKiAgICAgICAgIHsgcGF0aDogJy90d28nIH1cbiAqICAgICBdLFxuICogfSk7XG4gKiA6XG4gKiBgYGBcbiAqXG4gKiAtIGZyb20gdGhlIHNlY29uZCB0aW1lIG9ud2FyZHNcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXBwID0gQXBwQ29udGV4dCgpO1xuICogOlxuICogYGBgXG4gKlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgaW5pdCBvcHRpb25zXG4gKiAgLSBgamFgIOWIneacn+WMluOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgQXBwQ29udGV4dCA9IChvcHRpb25zPzogQXBwQ29udGV4dE9wdGlvbnMpOiBBcHBDb250ZXh0ID0+IHtcbiAgICBjb25zdCBvcHRzID0gZ2V0QXBwQ29uZmlnKE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBtYWluOiAnI2FwcCcsXG4gICAgICAgIHN0YXJ0OiBmYWxzZSxcbiAgICAgICAgZG9jdW1lbnRFdmVudEJhY2tCdXR0b246ICdiYWNrYnV0dG9uJyxcbiAgICB9LCBvcHRpb25zKSBhcyBBcHBDb250ZXh0T3B0aW9ucyk7XG5cbiAgICBpZiAobnVsbCA9PSBvcHRpb25zICYmIG51bGwgPT0gX2FwcENvbnRleHQpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BUFBfQ09OVEVYVF9ORUVEX1RPX0JFX0lOSVRJQUxJWkVELCAnQXBwQ29udGV4dCBzaG91bGQgYmUgaW5pdGlhbGl6ZWQgd2l0aCBvcHRpb25zIGF0IGxlYXN0IG9uY2UuJyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdHMucmVzZXQpIHtcbiAgICAgICAgX2FwcENvbnRleHQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNsZWFySTE4TlNldHRpbmdzKCk7XG4gICAgfVxuXG4gICAgaWYgKCFfYXBwQ29udGV4dCkge1xuICAgICAgICBfYXBwQ29udGV4dCA9IG5ldyBBcHBsaWNhdGlvbihvcHRzKTtcbiAgICB9XG4gICAgcmV0dXJuIF9hcHBDb250ZXh0O1xufTtcbiIsImltcG9ydCB7IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBWaWV3IH0gZnJvbSAnQGNkcC92aWV3JztcbmltcG9ydCB7XG4gICAgUm91dGVyLFxuICAgIFJvdXRlLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBIaXN0b3J5RGlyZWN0aW9uLFxuICAgIFBhZ2UsXG59IGZyb20gJ0BjZHAvcm91dGVyJztcbmltcG9ydCB7IENzc05hbWUsIGhhc1BhcnRpYWxDbGFzc05hbWUgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncGFnZS12aWV3OnByb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByb3V0ZT86IFJvdXRlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQmFzZSBjbGFzcyBkZWZpbml0aW9uIG9mIHtAbGluayBWaWV3fSB0aGF0IGNhbiBiZSBzcGVjaWZpZWQgaW4gYXMge0BsaW5rIFBhZ2V9IG9mIHtAbGluayBSb3V0ZXJ9LlxuICogQGphIHtAbGluayBSb3V0ZXJ9IOOBriB7QGxpbmsgUGFnZX0g44Gr5oyH5a6a5Y+v6IO944GqIHtAbGluayBWaWV3fSDjga7ln7rlupXjgq/jg6njgrnlrprnvqlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBhZ2VWaWV3PFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudCA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgUGFnZSB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm91dGVcbiAgICAgKiAgLSBgZW5gIHJvdXRlIGNvbnRleHRcbiAgICAgKiAgLSBgamFgIOODq+ODvOODiOOCs+ODs+ODhuOCreOCueODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB7QGxpbmsgVmlld30gY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCB7QGxpbmsgVmlld30g5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iocm91dGU/OiBSb3V0ZSwgb3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7IHJvdXRlIH07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgcGFnZSBpcyBhY3RpdmUuXG4gICAgICogQGphIOODmuODvOOCuOOBjOOCouOCr+ODhuOCo+ODluOBp+OBguOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBhY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBoYXNQYXJ0aWFsQ2xhc3NOYW1lKHRoaXMuZWwsIENzc05hbWUuUEFHRV9DVVJSRU5UKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUm91dGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIHBhZ2UgKHB1YmxpYykuXG4gICAgICogQGphIOODmuODvOOCuOOBq+e0kOOBpeOBj+ODq+ODvOODiOODh+ODvOOCvyAo5YWs6ZaL55SoKVxuICAgICAqL1xuICAgIGdldCBbJ0Byb3V0ZSddKCk6IFJvdXRlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgUm91dGVyfSBpbnN0YW5jZVxuICAgICAqIEBqYSB7QGxpbmsgUm91dGVyfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9yb3V0ZSgpOiBSb3V0ZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzWydAcm91dGUnXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIFJvdXRlcn0gaW5zdGFuY2VcbiAgICAgKiBAamEge0BsaW5rIFJvdXRlcn0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcm91dGVyKCk6IFJvdXRlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZT8ucm91dGVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFZpZXdcblxuICAgIC8qKiBAb3ZlcnJpZGUgKi9cbiAgICByZW5kZXIoLi4uYXJnczogdW5rbm93bltdKTogYW55IHsgLyogb3ZlcnJpZGFibGUgKi8gfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6IHV0aWxpemVkIHBhZ2UgZXZlbnRcblxuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUluaXQodGhpc1BhZ2U6IFJvdXRlKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlTW91bnRlZCh0aGlzUGFnZTogUm91dGUpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBjbG9uZWQgYW5kIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOikh+ijveOBleOCjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUNsb25lZCh0aGlzUGFnZTogUm91dGUsIHByZXZQYWdlOiBSb3V0ZSk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIHJlYWR5IHRvIGJlIGFjdGl2YXRlZCBhZnRlciBpbml0aWFsaXphdGlvbi5cbiAgICAgKiBAamEg5Yid5pyf5YyW5b6MLCDjg5rjg7zjgrjjgYzjgqLjgq/jg4bjgqPjg5njg7zjg4jlj6/og73jgarnirbmhYvjgavjgarjgovjgajnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQmVmb3JlRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUFmdGVyRW50ZXIodGhpc1BhZ2U6IFJvdXRlLCBwcmV2UGFnZTogUm91dGUgfCB1bmRlZmluZWQsIGRpcmVjdGlvbjogSGlzdG9yeURpcmVjdGlvbiwgaW50ZW50PzogdW5rbm93bik6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHsgLyogb3ZlcnJpZGFibGUgKi8gfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFRyaWdnZXJlZCBqdXN0IGJlZm9yZSB0aGUgcGFnZSBnb2VzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr56e76KGM44GZ44KL55u05YmN44Gr55m654GrXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG9uUGFnZUJlZm9yZUxlYXZlKHRoaXNQYWdlOiBSb3V0ZSwgbmV4dFBhZ2U6IFJvdXRlLCBkaXJlY3Rpb246IEhpc3RvcnlEaXJlY3Rpb24sIGludGVudD86IHVua25vd24pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7IC8qIG92ZXJyaWRhYmxlICovIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UgaXMgaGlkZGVuLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgYzpnZ7ooajnpLrjgavjgarjgaPjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlQWZ0ZXJMZWF2ZSh0aGlzUGFnZTogUm91dGUsIG5leHRQYWdlOiBSb3V0ZSwgZGlyZWN0aW9uOiBIaXN0b3J5RGlyZWN0aW9uLCBpbnRlbnQ/OiB1bmtub3duKTogdm9pZCB8IFByb21pc2U8dm9pZD4geyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgYvjgonliIfjgorpm6LjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgb25QYWdlVW5tb3VudGVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIHdoZW4gdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBkZXN0cm95ZWQgYnkgdGhlIHJvdXRlci5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOODq+ODvOOCv+ODvOOBq+OCiOOBo+OBpuegtOajhOOBleOCjOOBn+OBqOOBjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBvblBhZ2VSZW1vdmVkKHRoaXNQYWdlOiBSb3V0ZSk6IHZvaWQgeyAvKiBvdmVycmlkYWJsZSAqLyB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUGFnZVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgbmV3bHkgY29uc3RydWN0ZWQgYnkgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm5paw6KaP44Gr5qeL56+J44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUluaXQoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvIH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IHRvO1xuICAgICAgICBjb25zdCB7IGVsIH0gPSB0bztcbiAgICAgICAgaWYgKGVsICE9PSB0aGlzLmVsIGFzIHVua25vd24pIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChlbCBhcyB1bmtub3duIGFzIFRFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VJbml0KHRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgavmjL/lhaXjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlTW91bnRlZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZU1vdW50ZWQodG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIHBhZ2UncyBIVE1MRWxlbWVudCBpcyBjbG9uZWQgYW5kIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgKiBAamEg44Oa44O844K444GuIEhUTUxFbGVtZW50IOOBjOikh+ijveOBleOCjCBET00g44Gr5oy/5YWl44GV44KM44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUNsb25lZChpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20gfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUNsb25lZCh0bywgZnJvbSEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSBpcyByZWFkeSB0byBiZSBhY3RpdmF0ZWQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGphIOWIneacn+WMluW+jCwg44Oa44O844K444GM44Ki44Kv44OG44Kj44OZ44O844OI5Y+v6IO944Gq54q25oWL44Gr44Gq44KL44Go55m654GrXG4gICAgICovXG4gICAgcGFnZUJlZm9yZUVudGVyKGluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyB0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQgfSA9IGluZm87XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdG87XG4gICAgICAgIHJldHVybiB0aGlzLm9uUGFnZUJlZm9yZUVudGVyKHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIFRyaWdnZXJlZCB3aGVuIHRoZSBwYWdlIGlzIGZ1bGx5IGRpc3BsYXllZC5cbiAgICAgKiBAamEg44Oa44O844K444GM5a6M5YWo44Gr6KGo56S644GV44KM44KL44Go55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyRW50ZXIoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSB0bztcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQWZ0ZXJFbnRlcih0bywgZnJvbSwgZGlyZWN0aW9uLCBpbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIHBhZ2UgZ29lcyBoaWRkZW4uXG4gICAgICogQGphIOODmuODvOOCuOOBjOmdnuihqOekuuOBq+enu+ihjOOBmeOCi+ebtOWJjeOBq+eZuueBq1xuICAgICAqL1xuICAgIHBhZ2VCZWZvcmVMZWF2ZShpbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdG8sIGZyb20sIGRpcmVjdGlvbiwgaW50ZW50IH0gPSBpbmZvO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5yb3V0ZSA9IGZyb20hO1xuICAgICAgICByZXR1cm4gdGhpcy5vblBhZ2VCZWZvcmVMZWF2ZShmcm9tISwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlIGlzIGhpZGRlbi5cbiAgICAgKiBAamEg44Oa44O844K444GM6Z2e6KGo56S644Gr44Gq44Gj44Gf55u05b6M44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZUFmdGVyTGVhdmUoaW5mbzogUm91dGVDaGFuZ2VJbmZvKTogdm9pZCB8IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHRvLCBmcm9tLCBkaXJlY3Rpb24sIGludGVudCB9ID0gaW5mbztcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucm91dGUgPSBmcm9tITtcbiAgICAgICAgcmV0dXJuIHRoaXMub25QYWdlQWZ0ZXJMZWF2ZShmcm9tISwgdG8sIGRpcmVjdGlvbiwgaW50ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gVHJpZ2dlcmVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBwYWdlJ3MgSFRNTEVsZW1lbnQgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GMIERPTSDjgYvjgonliIfjgorpm6LjgZXjgozjgZ/nm7TlvozjgavnmbrngatcbiAgICAgKi9cbiAgICBwYWdlVW5tb3VudGVkKGluZm86IFJvdXRlKTogdm9pZCB7XG4gICAgICAgIHRoaXMub25QYWdlVW5tb3VudGVkKGluZm8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBUcmlnZ2VyZWQgd2hlbiB0aGUgcGFnZSdzIEhUTUxFbGVtZW50IGlzIGRlc3Ryb3llZCBieSB0aGUgcm91dGVyLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjga4gSFRNTEVsZW1lbnQg44GM44Or44O844K/44O844Gr44KI44Gj44Gm56C05qOE44GV44KM44Gf44Go44GN44Gr55m654GrXG4gICAgICovXG4gICAgcGFnZVJlbW92ZWQoaW5mbzogUm91dGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnJvdXRlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm9uUGFnZVJlbW92ZWQoaW5mbyk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJpMThuIiwiZ2V0Q29uZmlnIiwiZ2V0R2xvYmFsTmFtZXNwYWNlIiwiRXZlbnRQdWJsaXNoZXIiLCJEZWZlcnJlZCIsImNyZWF0ZVJvdXRlciIsIiQiLCJjaGFuZ2VMYW5ndWFnZSIsImdldExhbmd1YWdlIiwiaW5pdGlhbGl6ZUkxOE4iLCJpc0Z1bmN0aW9uIiwibG9jYWxpemUiLCJ3YWl0RnJhbWUiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJWaWV3Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7O0lBSUc7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUhELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGFBQXNDLENBQUE7WUFDdEMsV0FBMkMsQ0FBQSxXQUFBLENBQUEsMENBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDZCQUFzQixDQUFDLEVBQUUsK0RBQStELENBQUMsQ0FBQSxHQUFBLDBDQUFBLENBQUE7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RUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDN0MsUUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUM3QixRQUFBLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzlEO0lBRUQ7Ozs7SUFJRztJQUNILElBQUEsY0FBYyxDQUFDLElBQXFCLEVBQUE7WUFDaEMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztJQUM3QyxRQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQzdCLFFBQUEsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDN0Q7SUFFRDs7OztJQUlHO0lBQ0gsSUFBQSxlQUFlLENBQUMsSUFBcUIsRUFBQTtZQUNqQyxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQzdDLFFBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFLLENBQUM7SUFDaEMsUUFBQSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFLLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUMvRDtJQUVEOzs7O0lBSUc7SUFDSCxJQUFBLGNBQWMsQ0FBQyxJQUFxQixFQUFBO1lBQ2hDLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDN0MsUUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUssQ0FBQztJQUNoQyxRQUFBLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUssRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzlEO0lBRUQ7Ozs7SUFJRztJQUNILElBQUEsYUFBYSxDQUFDLElBQVcsRUFBQTtJQUNyQixRQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDOUI7SUFFRDs7OztJQUlHO0lBQ0gsSUFBQSxXQUFXLENBQUMsSUFBVyxFQUFBO1lBQ25CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNmLFFBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7SUFDcEMsUUFBQSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzVCO0lBQ0o7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvYXBwLyJ9