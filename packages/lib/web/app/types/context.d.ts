import { Subscribable } from '@cdp/events';
import { DOMSelector } from '@cdp/dom';
import { I18NOptions } from '@cdp/i18n';
import { RouteComponentSeed, RouteParameters, RouterConstructionOptions, Router, Page } from '@cdp/router';
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
export declare const registerPage: (path: string, component: RouteComponentSeed, options?: RouteParameters) => void;
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
export declare const AppContext: (options?: AppContextOptions) => AppContext;
