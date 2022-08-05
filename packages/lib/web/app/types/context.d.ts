import { Subscribable } from '@cdp/events';
import { DOMSelector } from '@cdp/dom';
import { I18NOptions } from '@cdp/i18n';
import { RouteComponentSeed, RouteParameters, RouterConstructionOptions, Router, Page } from '@cdp/router';
/**
 * @en `orientation` identifier
 * @ja `orientation` 識別子
 */
export declare const enum Orientation {
    PORTRAIT = "portrait",
    LANDSCAPE = "landscape"
}
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
    waitForReady?: Promise<void>;
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
     * @en Current [[Orientation]] id.
     * @ja 現在の [[Orientation]] を取得
     */
    readonly orientation: Orientation;
    /**
     * @en User-definable extended property.
     * @ja ユーザー定義可能な拡張プロパティ
     */
    extension: unknown;
}
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
 * registerPage('page-path', pageFactory);
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
export declare const registerPage: (path: string, component: RouteComponentSeed, options?: Omit<RouteParameters, 'path'>) => void;
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
export declare const AppContext: (options?: AppContextOptions) => AppContext;
