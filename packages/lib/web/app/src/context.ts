import { isFunction } from '@cdp/core-utils';
import { type Subscribable, EventPublisher } from '@cdp/events';
import { Deferred } from '@cdp/promise';
import { RESULT_CODE, makeResult } from '@cdp/result';
import { waitFrame } from '@cdp/web-utils';
import {
    type DOMSelector,
    dom as $,
} from '@cdp/dom';
import {
    type I18NOptions,
    type I18NDetectErrorBehaviour,
    type i18n,
    initializeI18N,
    localize,
    getLanguage,
    changeLanguage,
} from '@cdp/i18n';
import {
    type HistoryState,
    type Route,
    type RouteChangeInfo,
    type RouteParameters,
    type RouterConstructionOptions,
    type Router,
    type Page,
    RouterRefreshLevel,
    createRouter,
    toRouterPath,
} from '@cdp/router';
import { window } from './ssr';
import {
    clearI18NSettings,
    getAppConfig,
    waitDomContentLoaded,
    waitDocumentEventReady,
} from './internal';

/**
 * @en `orientation` identifier
 * @ja `orientation` 識別子
 */
export const enum Orientation {
    PORTRAIT  = 'portrait',
    LANDSCAPE = 'landscape',
}

/**
 * @en The event definition fired in {@link AppContext}.
 * @ja {@link AppContext} 内から発行されるイベント定義
 */
export interface AppContextEvent {
    /**
     * @en Application ready notification.
     * @ja アプリケーション準備完了通知
     * @args [context]
     */
    'ready': [AppContext];

    /**
     * @en Hardware back button press notification.
     * @ja ハードウェアバックボタンの押下通知
     * @args [Event]
     */
    'backbutton': [Event];

    /**
     * @en Device orientation change notification.
     * @ja デバイスオリエンテーション変更通知
     * https://developer.mozilla.org/ja/docs/Web/API/Window/orientationchange_event
     * @args [Orientaion, angle]
     */
    'orientationchange': [Orientation, number];

    /**
     * @en Application langugate change notification.
     * @ja アプリケーション言語変更通知
     * @args [language, i18n.TFunction]
     */
    'languagechange': [string, i18n.TFunction];
}

/**
 * @en {@link AppContext} create options.
 * @ja {@link AppContext} 構築オプション
 */
export interface AppContextOptions extends RouterConstructionOptions {
    /**
     * @en An object or the selector string which becomes origin of {@link DOM} for main router.
     * @ja メインルーターの {@link DOM} のもとになるインスタンスまたはセレクタ文字列
     * @default `#app`
     */
    main?: DOMSelector<string | HTMLElement>;

    /**
     * @en An object or the selector string which becomes origin of {@link DOM} assigned to the splash screen. <br>
     *     It will be removed just before appliaction ready.
     * @ja スプラッシュスクリーンに割り当てられている {@link DOM} のもとになるインスタンスまたはセレクタ文字列 <br>
     *     準備完了直前に削除される
     */
    splash?: DOMSelector<string | HTMLElement>;

    /**
     * @en Localization module options.
     * @ja ローカライズモジュールオプション
     */
    i18n?: I18NOptions;

    /**
     * @en Custom stand-by function for application ready state.
     * @ja アプリケーション準備完了のための待ち受け関数
     */
    waitForReady?: Promise<unknown> | ((context: AppContext) => Promise<unknown>);

    /**
     * @en Custom `document` event for application ready state.
     * @ja アプリケーション準備完了のためのカスタム `document` イベント
     */
    documentEventReady?: string;

    /**
     * @en Custom `document` event for hardware back button. default: `backbutton`
     * @ja ハードウェアバックボタンのためのカスタム `document` イベント. 既定値 `backbutton`
     */
    documentEventBackButton?: string;

    /**
     * @internal
     * @en Specify true to destroy the instance cache and reset. (for debug)
     * @ja インスタンスキャッシュを破棄しリセットする場合に true を指定 (デバッグ用)
     */
    reset?: boolean;
}

/**
 * @en Application context interface
 * @ja アプリケーションコンテキスト
 */
export interface AppContext extends Subscribable<AppContextEvent> {
    /**
     * @en main router interface
     * @ja メインルーター
     */
    readonly router: Router;

    /**
     * @en `Promise` for ready state.
     * @ja 準備完了確認用 `Promise` オブジェクト
     */
    readonly ready: Promise<void>;

    /**
     * @en Current active page instance.
     * @ja 現在アクティブなページインスタンス
     */
    readonly activePage: Page;

    /**
     * @en Current {@link Orientation} id.
     * @ja 現在の {@link Orientation} を取得
     */
    readonly orientation: Orientation;

    /**
     * @en User-definable extended property.
     * @ja ユーザー定義可能な拡張プロパティ
     */
    extension: unknown;

    /**
     * @en Changes the language.
     * @ja 言語の切り替え
     *
     * @param lng
     *  - `en` locale string ex: `en`, `en-US`
     *  - `ja` ロケール文字 ex: `en`, `en-US`
     * @param options
     *  - `en` error behaviour
     *  - `ja` エラー時の振る舞いを指定
     */
    changeLanguage(lng: string, options?: I18NDetectErrorBehaviour): Promise<i18n.TFunction>;

    /**
     * @en Determines if a given URL is the router's current path.
     * @ja 指定した URL がルーターの現在のパスであるか判定
     *
     * @param url
     *  - `en` specify the URL you want to identify
     *  - `ja` 判別したい URL を指定
     */
    isCurrentPath(url: string): boolean;
}

//__________________________________________________________________________________________________//

const _initialRoutes: RouteParameters[] = [];

/**
 * @en Route parameters for page registration. Need to describe `path`, `content`.
 * @ja ページ登録用ルートパラメータ. `path`, `content` の記述が必要
 */
export type PageRouteParameters = Required<Pick<RouteParameters, 'content'>> & RouteParameters;

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
export const registerPage = (params: PageRouteParameters): void => {
    _initialRoutes.push(params);
};

//__________________________________________________________________________________________________//

/** AppContext impl class */
class Application extends EventPublisher<AppContextEvent> implements AppContext {
    private readonly _window: Window;
    private readonly _router: Router;
    private readonly _ready = new Deferred();
    private _extension: unknown;

    constructor(options: AppContextOptions) {
        super();
        const { main, window: win, routes: _routes } = options;
        const routerOpts = Object.assign({}, options, { routes: _routes!.concat(..._initialRoutes), start: false });
        this._window = win ?? window;
        this._router = createRouter(main as string, routerOpts);
        void this.initialize(options);
    }

///////////////////////////////////////////////////////////////////////
// implements: AppContext

    get router(): Router {
        return this._router;
    }

    get ready(): Promise<void> {
        return this._ready;
    }

    get activePage(): Page {
        return (this._router.currentRoute as Route & Record<string, { page: Page; }>)['@params']?.page || {};
    }

    get orientation(): Orientation {
        const $window = $(this._window);
        return ($window.width() < $window.height()) ? Orientation.PORTRAIT : Orientation.LANDSCAPE;
    }

    get extension(): unknown {
        return this._extension;
    }

    set extension(val: unknown) {
        this._extension = val;
    }

    async changeLanguage(lng: string, options?: I18NDetectErrorBehaviour): Promise<i18n.TFunction> {
        const t = await changeLanguage(lng, options);
        await this._router.refresh(RouterRefreshLevel.DOM_CLEAR);
        this.publish('languagechange', getLanguage(), t);
        return t;
    }

    isCurrentPath(url: string): boolean {
        const srcPath = toRouterPath(url);
        const curPath = toRouterPath((this._router.currentRoute as HistoryState<Route>)['@id']);
        return srcPath === curPath;
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    private async initialize(options: AppContextOptions): Promise<void> {
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

        _window.document.addEventListener(documentEventBackButton!, this.onHandleBackKey.bind(this));
        _window.addEventListener('orientationchange', this.onHandleOrientationChanged.bind(this));

        this._router.on('loaded', this.onPageLoaded.bind(this));
        start && await this._router.refresh();

        // remove splash screen
        $(splash, _window.document).remove();

        this._ready.resolve();
        this.publish('ready', this);
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onPageLoaded(info: RouteChangeInfo): void {
        localize(info.to.el);
    }

    private onGlobalError(event: ErrorEvent): void {
        console.error(`[Global Error] ${event.message}, ${event.filename}, ${event.colno}, ${event.error}`);
    }

    private onGlobalUnhandledRejection(event: PromiseRejectionEvent): void {
        console.error(`[Global Unhandled Rejection] ${event.reason}`);
    }

    private onHandleBackKey(event: Event): void {
        this.publish('backbutton', event);
    }

    private async onHandleOrientationChanged(/*event: Event*/): Promise<void> {
        const { requestAnimationFrame, screen } = this._window; // eslint-disable-line @typescript-eslint/unbound-method
        await waitFrame(1, requestAnimationFrame);
        this.publish('orientationchange', this.orientation, screen.orientation.angle);
    }
}

/** context cache */
let _appContext: AppContext | undefined;

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
export const AppContext = (options?: AppContextOptions): AppContext => {
    const opts = getAppConfig(Object.assign({
        main: '#app',
        start: true,
        routes: [],
        documentEventBackButton: 'backbutton',
    }, options) as AppContextOptions);

    if (null == options && null == _appContext) {
        throw makeResult(RESULT_CODE.ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED, 'AppContext should be initialized with options at least once.');
    }

    if (opts.reset) {
        _appContext = undefined;
        clearI18NSettings();
    }

    _appContext ??= new Application(opts);
    return _appContext;
};
