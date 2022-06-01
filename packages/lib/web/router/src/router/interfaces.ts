import { Constructor } from '@cdp/core-utils';
import { Subscribable } from '@cdp/events';
import type { Result } from '@cdp/result';
import type { IHistory } from '../history';

/**
 * @en Argument given to the router event callback.
 * @ja ルーターイベントに渡される引数
 */
export interface RouterEventArg {
    /** router instance */
    readonly router: Router;
    /** from state */
    readonly from?: Route;
    /** to state */
    readonly to: Route;
    /** navigate direction */
    readonly direction: 'back' | 'forward' | 'none' | 'missing';
    /** extension property for user land */
    intent?: unknown;
}

/**
 * @en The event definition fired in [[Router]].
 * @ja [[Router]] 内から発行されるイベント定義
 */
export interface RouterEvent {
    /**
     * @en Before route change notification. <br>
     *     It is the only timing when you can cancel the route change.
     * @ja ルート変更前通知 <br>
     *     ルート変更をキャンセルできる唯一のタイミング
     * @args [event, cancel]
     */
    'will-change': [RouterEventArg, (reason?: unknown) => void];

    /**
     * @en New DOM content loaded notification.
     * @ja 新しいDOM コンテンツのロード通知
     * @args [event]
     */
    'loaded': [RouterEventArg];

    /**
     * @en Next page just inserted to DOM notification.
     * @ja 次のページの DOM 挿入通知
     * @args [event]
     */
    'mounted': [RouterEventArg];

    /**
     * @en Before transition notification.
     * @ja トランジション開始通知
     * @args [event]
     */
    'before-transition': [RouterEventArg];

    /**
     * @en transitioning notification.
     * @ja トランジション中通知
     * @args [event]
     */
    'transition': [RouterEventArg];

    /**
     * @en After transition notification.
     * @ja トランジション終了通知
     * @args [event]
     */
    'after-transition': [RouterEventArg];

    /**
     * @en Previous page just detached from DOM notification.
     * @ja 前のページの DOM 切除通知
     * @args [event]
     */
    'unmounted': [RouterEventArg];

    /**
     * @en Old DOM content unloaded notification.
     * @ja 古い DOM コンテンツの破棄通知
     * @args [event]
     */
    'unloaded': [RouterEventArg];

    /**
     * @en Route changed notification.
     * @ja ルート変更完了通知
     * @args [event]
     */
    'changed': [RouterEventArg];

    /**
     * @en Notified when an error is occured.
     * @ja エラーが発生したときに発行
     *
     * @args [error]
     */
    'error': [Result];
}

//__________________________________________________________________________________________________//

/**
 * @en View definition to be routed.
 * @ja ルーティング対象のビューインターフェイス定義
 */
export interface RouterView {} // eslint-disable-line @typescript-eslint/no-empty-interface

/**
 * @en [[RouterView]] factory function.
 * @ja [[RouterView]] 構築関数
 */
export type ComponentFactory = (route: Route) => RouterView | Promise<RouterView>;

/**
 * @en Route parameters interface. It is also a construction option.
 * @ja ルートパラメータ. 構築オプションとしても使用.
 */
export interface RouteParameters {
    /**
     * @en Root path. Dynamic segments are represented using a colon `:`.
     * @ja ルートのパス. 動的セグメントはコロン `:` を使って表される.
     */
    path: string;

    /**
     * @en Array with nested routes
     * @ja ネストされたルート
     */
    routes?: RouteParameters[];

    /**
     * @en Creates dynamic page from specified content string
     * @ja DOM コンテント構築のシードパラメータ
     */
    content?: { selector: string; url?: string; } | HTMLElement | string;

    /**
     * @en Specify the constructor or built object of the View component. <br>
     *     In case of functional type, [[Route]] instance is passed as an argument.
     * @ja View コンポーネントのコンストラクタもしくは構築済みオブジェクト <br>
     *     関数型の場合は引数に [[Route]] インスタンスが渡される
     *
     * @reserved `string` type: load pages as a component via Ajax
     */
    component?: Constructor<RouterView> | ComponentFactory | RouterView | string;
}

//__________________________________________________________________________________________________//

/**
 * @en The type for the route parameter
 * @ja ルートパラメータに指定する型
 */
export type RoutePathParams = Record<string, string | number | boolean | null | undefined>;

/**
 * @en Route context property definition.
 * @ja ルートコンテキストプロパティ定義
 */
export interface Route {
    /**
     * @en View's URL.
     * @ja ビューの URL
     */
    readonly url: string;

    /**
     * @en Root path. Dynamic segments are represented using a colon `:`.
     * @ja ルートのパス. 動的セグメントはコロン `:` を使って表される.
     */
    readonly path: string;

    /**
     * @en Object with route query. <br>
     *     If the url is `/page/?id=5&foo=bar` then it will contain the following object `{ id: 5, foo: 'bar' }`
     * @ja ルートクエリに含まれたパラメータ <br>
     *     URL が `/page/?id=5&foo=bar`の場合, 次のオブジェクトが含まれる `{ id: 5, foo: 'bar' }`
     */
    readonly query: RoutePathParams;

    /**
     * @en Route params. <br>
     *     If we have matching route with `/page/user/:userId/post/:postId` path and url of the page is `/page/user/55/post/12` then it will be the following object `{ userId: 55, postId: 12 }`
     * @ja ルートパラメータ <br>
     *     `/page/user/:userId/post/:postId` パスと一致するルートがあり, ページの URL が /page/user/55/post/12` の場合, 次のオブジェクトが含まれる `{ userId: 55, postId: 12 }`
     */
    readonly params: RoutePathParams;

    /**
     * @en Router instance
     * @ja ルーターインスタンス
     */
    readonly router: Router;

    /**
     * @en View main HTML element
     * @ja ビューの主要 HTML 要素
     */
    readonly el: HTMLElement;
}

/**
 * @en Router construction option definition.
 * @ja ルーター構築オプション定義
 */
export interface RouterConstructionOptions {
    /**
     * @en Route construction parameters.
     * @ja ルート構築パラメータ
     */
    routes?: RouteParameters[];

    /**
     * @en Specify `true` when executing route detection at construction time. default: `true`
     * @ja 構築時にルート検知実行する場合に `true` を指定. default: `true`
     */
    start?: boolean;

    /**
     * @en Specify the [IHistory] instance or mode to use with the router. The default is to use the `hash` mode in the browser history.
     * @ja ルーターで使用する [[IHistory]] インスタンスまたはモードを指定. 既定は ブラウザ履歴の `hash` モードを使用.
     */
    history?: 'hash' | 'history' | 'memory' | IHistory;

    /**
     * @en Initialization route path. If [[IHistory]] object given to `history` property, this parameter is ignored.
     * @ja 初期ルートパス. `history` に [[IHistory]] が指定された場合は無視される
     */
    initialPath?: string;

    /**
     * @en Read the router element from the passed parent node.
     * @ja 渡された親ノードから ルーターエレメントを読み込む.
     */
    el?: ParentNode & NonElementParentNode | null;

    /**
     * @en Set using `Window` context. When being un-designating, a fixed value of the environment is used.
     * @ja 使用する `Window` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     */
    window?: Window | null;
}

/**
 * @en Route navigation options definition.
 * @ja ルートナビゲーションオプション定義
 */
export interface RouteNavigationOptions {
    /**
     * @en Custom page transition name
     * @ja カスタムページトランジション名
     */
    transition?: string;

    /**
     * @en Route query params. <br>
     *     If the url is `/page/?id=5&foo=bar` then it will contain the following object `{ id: 5, foo: 'bar' }`
     * @ja ルートクエリパラメータ <br>
     *     URL が `/page/?id=5&foo=bar`の場合, 次のオブジェクトを指定 `{ id: 5, foo: 'bar' }`
     */
    query?: RoutePathParams;

    /**
     * @en Route params. <br>
     *     If we have matching route with `/page/user/:userId/post/:postId` path and url of the page is `/page/user/55/post/12` then it will be the following object `{ userId: 55, postId: 12 }`
     * @ja ルートパラメータ <br>
     *     `/page/user/:userId/post/:postId` パスと一致するルートがあり, ページの URL が /page/user/55/post/12` の場合, 次のオブジェクトを指定 `{ userId: 55, postId: 12 }`
     */
    params?: RoutePathParams;

    /**
     * @en Extension property for user land
     * @ja ユーザー定義可能な拡張プロパティ
     */
    intent?: unknown;
}

/**
 * @en Router common interface.
 * @ja ルーター共通インターフェイス
 */
export interface Router extends Subscribable<RouterEvent> {
    /**
     * @en Router's view HTML element
     * @ja ルーターのビュー HTML 要素
     */
    readonly el: HTMLElement;

    /**
     * @en Object with current route data
     * @ja 現在のルートデータを持つオブジェクト
     */
    readonly currentRoute: Route;

    /**
     * @en Route registration.
     * @jp ルートの登録
     *
     * @param routes
     *  - `en` Specify [[RouteParameters]]
     *  - `ja` [[RouteParameters]] を指定
     * @param refersh
     *  - `en` Specify `true` to reload after registration. default: `false`
     *  - `ja` 登録後, 再読み込みを行う場合は `true` を指定. default: `false`
     */
    register(routes: RouteParameters | RouteParameters[], refersh?: boolean): this;

    /**
     * @en Navigate to new view.
     * @ja 新たなビューに移動
     *
     * @param to
     *  - `en` Set a navigate destination (url / path)
     *  - `ja` ナビゲート先の設定（url / path）
     * @param options
     *  - `en` Specify [[RouteNavigationOptions]]
     *  - `ja` [[RouteNavigationOptions]] を指定
     */
    navigate(to: string, options?: RouteNavigationOptions): Promise<this>;

    /**
     * @en To move backward through history.
     * @ja 履歴の前のページに戻る
     */
    back(): Promise<this>;

    /**
     * @en To move forward through history.
     * @ja 履歴の次のページへ進む
     */
    forward(): Promise<this>;

    /**
     * @en To move a specific point in history.
     * @ja 履歴内の特定のポイントを移動
     *
     * @param delta
     *  - `en` The position to move in the history, relative to the current page. <br>
     *         If omitted or 0 is specified, reload will be performed.
     *  - `ja` 履歴の中を移動したい先の位置で、現在のページからの相対位置 <br>
     *         省略または 0 が指定された場合は, 再読み込みを実行
     */
    go(delta?: number): Promise<this>;
}
