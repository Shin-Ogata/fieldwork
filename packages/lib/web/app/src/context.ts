import { Subscribable, EventPublisher } from '@cdp/events';
import { Deferred } from '@cdp/promise';
import { RESULT_CODE, makeResult } from '@cdp/result';
import { DOMSelector } from '@cdp/dom';
import {
    I18NOptions,
    initializeI18N,
    localize,
} from '@cdp/i18n';
import {
    RouteChangeInfo,
    RouteComponentSeed,
    RouteParameters,
    RouterConstructionOptions,
    Router,
    Page,
    createRouter,
} from '@cdp/router';
import { window } from './ssr';
import {
    clearI18NSettings,
    getAppConfig,
    waitDomContentLoaded,
} from './internal';

/**
 * @en The event definition fired in [[AppContext]].
 * @ja [[AppContext]] 内から発行されるイベント定義
 */
export interface AppContextEvent {
    /**
     * @en Application ready notification.
     * @ja アプリケーション準備完了通知
     * @args [context]
     */
    'ready': [AppContext];
}

/**
 * @en [[AppContext]] create options.
 * @ja [[AppContext]] 構築オプション
 */
export interface AppContextOptions extends RouterConstructionOptions {
    /**
     * @en An object or the selector string which becomes origin of [[DOM]] for main router.
     * @ja メインルーターの [[DOM]] のもとになるインスタンスまたはセレクタ文字列
     * @default `#app`
     */
    main?: DOMSelector<string | HTMLElement>;

    /**
     * @en An object or the selector string which becomes origin of [[DOM]] assigned to the splash screen. <br>
     *     It will be removed just before appliaction ready.
     * @ja スプラッシュスクリーンに割り当てられている [[DOM]] のもとになるインスタンスまたはセレクタ文字列 <br>
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
    waitForReady?: () => Promise<void>;

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
     * @en User-definable extended property.
     * @ja ユーザー定義可能な拡張プロパティ
     */
    extension: unknown;
}

//__________________________________________________________________________________________________//

const _initialPages: RouteParameters[] = [];

/**
 * @en Register concrete [[Page]] class. Registered with the main router when instantiating [[AppContext]]. <br>
 *     If constructor needs arguments, `options.componentOptions` is available.
 * @ja Page 具象化クラスの登録. [[AppContext]] のインスタンス化時にメインルーターに登録される. <br>
 *     constructor を指定する引数がある場合は, `options.componentOptions` を利用可能
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
 *
 * @example <br>
 *
 * ```ts
 * import { registerPage } from '@cdp/runtime';
 *
 * // TODO:
 * ```
 */
export const registerPage = (path: string, component: RouteComponentSeed, options?: RouteParameters): void => {
    _initialPages.push(Object.assign({}, options, { path, component }));
};

//__________________________________________________________________________________________________//

/** AppContext impl class */
class Application extends EventPublisher<AppContextEvent> implements AppContext {
    private readonly _window: Window;
    private readonly _router: Router;
    private readonly _ready = new Deferred();
    private _activePage?: Page;
    private _extension: unknown;

    constructor(options: AppContextOptions) {
        super();
        const { main, window: win } = options;
        this._window = win || window;
        this._router = createRouter(main as string, options);
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
        return this._router.currentRoute['@params'].page || {};
    }

    get extension(): unknown {
        return this._extension;
    }

    set extension(val: unknown) {
        this._extension = val;
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    private async initialize(options: AppContextOptions): Promise<void> {
        const { i18n, waitForReady } = getAppConfig(options);

        this._window.addEventListener('error', this.onGlobalError.bind(this));
        this._window.addEventListener('unhandledrejection', this.onGlobalUnhandledRejection.bind(this));

        await Promise.all([
            waitDomContentLoaded(this._window.document),
            initializeI18N(i18n),
            waitForReady,
        ]);

        this._router.on('loaded', this.onPageLoaded.bind(this));
        this._router.register(_initialPages, true);

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
}

/** context cache */
let _appContext: AppContext | undefined;

/**
 * @en Application context access
 * @ja アプリケーションコンテキスト取得
 *
 * @param options
 *  - `en` init options
 *  - `ja` 初期化オプション
 *
 * @example <br>
 *
 * ```ts
 * import { AppContext } from '@cdp/runtime';
 *
 * // first access
 * const app = AppContext({ main: '#app' });
 * // TODO:
 * ```
 */
export const AppContext = (options?: AppContextOptions): AppContext => {
    if (null == options && null == _appContext) {
        throw makeResult(RESULT_CODE.ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED, 'AppContext should be initialized with options at least once.');
    }

    const opts = Object.assign({ main: '#app', start: false }, options);

    if (opts.reset) {
        _appContext = undefined;
        clearI18NSettings();
    }

    if (!_appContext) {
        _appContext = new Application(opts);
    }
    return _appContext;
};
