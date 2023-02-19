import { Constructor } from '@cdp/core-utils';
import { Subscribable } from '@cdp/events';
import type { Result } from '@cdp/result';
import type { DOM } from '@cdp/dom';
import type { IHistory, HistoryDirection } from '../history';
/**
 * @en Page transition parameters definition.
 * @ja ページトランジションに指定するパラメータ定義
 */
export interface PageTransitionParams {
    /**
     * @en Custom page transition name
     * @ja カスタムページトランジション名
     */
    transition?: string;
    /**
     * @en If specify true, the transition direction set to the reverse.
     * @ja トランジションを逆方向に指定したい場合にtrueを指定
     */
    reverse?: boolean;
}
/**
 * @en Interface to manage asynchronous processing during router events.
 * @ja ルーターイベント中の非同期処理を管理するインターフェイス
 */
export interface RouteAyncProcess {
    /** Registering an asynchronous process */
    register(promise: Promise<unknown>): void;
}
/**
 * @en Argument given to the router event callback.
 * @ja ルーターイベントに渡される引数
 */
export interface RouteChangeInfo extends Readonly<PageTransitionParams> {
    /** router instance */
    readonly router: Router;
    /** from state */
    readonly from?: Route;
    /** to state */
    readonly to: Route;
    /** navigate history direction */
    readonly direction: HistoryDirection;
    /** client async process */
    readonly asyncProcess: RouteAyncProcess;
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
    'will-change': [RouteChangeInfo, (reason?: unknown) => void];
    /**
     * @en New DOM content loaded notification.
     * @ja 新しいDOM コンテンツのロード通知
     * @args [[RouteChangeInfo]]
     */
    'loaded': [RouteChangeInfo];
    /**
     * @en Next page just inserted to DOM notification.
     * @ja 次のページの DOM 挿入通知
     * @args [[RouteChangeInfo]]
     */
    'mounted': [RouteChangeInfo];
    /**
     * @en Before transition notification.
     * @ja トランジション開始通知
     * @args [[RouteChangeInfo]]
     */
    'before-transition': [RouteChangeInfo];
    /**
     * @en After transition notification.
     * @ja トランジション終了通知
     * @args [[RouteChangeInfo]]
     */
    'after-transition': [RouteChangeInfo];
    /**
     * @en Previous page just detached from DOM notification.
     * @ja 前のページの DOM 切除通知
     * @args [[Route]]
     */
    'unmounted': [Route];
    /**
     * @en Old DOM content unloaded notification.
     * @ja 古い DOM コンテンツの破棄通知
     * @args [Route]
     */
    'unloaded': [Route];
    /**
     * @en Route changed notification.
     * @ja ルート変更完了通知
     * @args [event]
     */
    'changed': [RouteChangeInfo];
    /**
     * @en Notified when an error is occured.
     * @ja エラーが発生したときに発行
     *
     * @args [error]
     */
    'error': [Result];
}
/**
 * @en Page definition to be routed.
 * @ja ルーティング対象のページインターフェイス定義
 */
export interface Page {
    /**
     * @en Route data associated with the page.
     * @ja ページに紐づくルートデータ
     */
    '@route'?: Route;
    /**
     * @en Construction options
     * @ja コンストラクションオプション
     */
    '@options'?: unknown;
    /**
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    pageInit?(info: RouteChangeInfo): void | Promise<void>;
    /**
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    pageMounted?(info: RouteChangeInfo): void | Promise<void>;
    /**
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    pageBeforeEnter?(info: RouteChangeInfo): void | Promise<void>;
    /**
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    pageAfterEnter?(info: RouteChangeInfo): void | Promise<void>;
    /**
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    pageBeforeLeave?(info: RouteChangeInfo): void | Promise<void>;
    /**
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    pageAfterLeave?(info: RouteChangeInfo): void | Promise<void>;
    /**
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    pageUnmounted?(info: Route): void;
    /**
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    pageRemoved?(info: Route): void;
}
/**
 * @en [[Page]] factory function.
 * @ja [[Page]] 構築関数
 */
export type PageFactory = (route: Route, options?: unknown) => Page | Promise<Page>;
export type RouteComponentSeed = Constructor<Page> | PageFactory | Page | string;
export type RouteContentSeed = {
    selector: string;
    url?: string;
} | HTMLElement | HTMLTemplateElement | DOM | string;
/**
 * @en Route parameters interface. It is also a construction option.
 * @ja ルートパラメータ. 構築オプションとしても使用.
 */
export interface RouteParameters {
    /**
     * @en Route path. Dynamic segments are represented using a colon `:`.
     * @ja ルートのパス. 動的セグメントはコロン `:` を使って表される.
     */
    path: string;
    /**
     * @en Array with nested routes
     * @ja ネストされたルート
     */
    routes?: RouteParameters[];
    /**
     * @en Specify the constructor or built object of the page component. <br>
     *     In case of functional type, [[Route]] instance is passed as an argument.
     * @ja ページコンポーネントのコンストラクタもしくは構築済みオブジェクト <br>
     *     関数型の場合は引数に [[Route]] インスタンスが渡される
     *
     * @reserved `string` type: load pages as a component via Ajax
     */
    component?: RouteComponentSeed;
    /**
     * @en Options passed to the page component constructor. <br>
     *     In case of functional type, it is passed to the second argument.
     * @ja ページコンポーネントのコンストラクタに渡されるオプション <br>
     *     関数型の場合は第2引数に渡される
     */
    componentOptions?: unknown;
    /**
     * @en Creates dynamic page from specified content string
     * @ja DOM コンテント構築のシードパラメータ
     */
    content?: RouteContentSeed;
}
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
     * @en Page's URL.
     * @ja ページの URL
     */
    readonly url: string;
    /**
     * @en Route path. Dynamic segments are represented using a colon `:`.
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
     * @en Page main HTML element
     * @ja ページの主要 HTML 要素
     */
    readonly el: HTMLElement;
}
/**
 * @en Global transition settings.
 * @ja グローバルトランジション設定
 */
export interface TransitionSettings {
    /** default transition name */
    default?: string;
    /** custom enter-from css class name */
    'enter-from-class'?: string;
    /** custom enter-active css class name */
    'enter-active-class'?: string;
    /** custom enter-to css class name */
    'enter-to-class'?: string;
    /** custom leave-from css class name */
    'leave-from-class'?: string;
    /** custom leave-active css class name */
    'leave-active-class'?: string;
    /** custom leave-to css class name */
    'leave-to-class'?: string;
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
    /**
     * @en CSS class prefix to use. default: `cdp`.
     * @ja 使用する CSS クラスプリフィックス. default: `cdp`
     */
    cssPrefix?: string;
    /**
     * @en Common transition settings.
     * @ja 共通トランジション設定
     */
    transition?: TransitionSettings;
}
/**
 * @en Interface to specify for page stack operations.
 * @ja ページスタック操作に指定するインターフェイス
 */
export interface PageStack extends PageTransitionParams {
    /**
     * @en Page's URL.
     * @ja ページの URL
     */
    url: string;
    /**
     * @en The route parameter used when registering a new route.
     * @ja 新規ルート登録を行うときに使用するルートパラメータ.
     */
    route?: RouteParameters;
}
/**
 * @en Router's sub-flow parameters.
 * @ja ルーターの sub-flow に指定するパラメータ
 */
export interface RouteSubFlowParams {
    /**
     * @en Specify the page root path that is the base point of sub-flow. <br>
     *     If not specified, the path of the starting point of sub-flow is assigned.
     * @ja sub-flow の基点となるページルートパスを指定 <br>
     *     指定がない場合は sub-flow を開始地点の path がアサインされる。
     */
    base?: string;
    /**
     * @en Specify [[PageStack]] to add from `base` that transitions at the end of sub-flow. If not specified, transition to `base`.
     * @ja sub-flow 終了時に遷移する `base` からの追加 [[PageStack]] を指定。指定がない場合は、`base` に遷移する。
     */
    additinalStacks?: PageStack[];
}
/**
 * @en Route navigation options definition.
 * @ja ルートナビゲーションオプション定義
 */
export interface RouteNavigationOptions extends PageTransitionParams {
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
     * @en Check state is in sub-flow
     * @ja sub-flow 中であるか判定
     */
    readonly isInSubFlow: boolean;
    /**
     * @en Check it can go back in history
     * @ja 履歴を戻るが可能か判定
     */
    readonly canBack: boolean;
    /**
     * @en Check it can go forward in history
     * @ja 履歴を進むが可能か判定
     */
    readonly canForward: boolean;
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
     * @en Navigate to new page.
     * @ja 新たなページに移動
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
     * @en Add page stack starting from the current history.
     * @ja 現在の履歴を起点にページスタックを追加
     *
     * @param stack
     *  - `en` Specify [[PageStack]] object / object array
     *  - `ja` [[PageStack]] オブジェクト / オブジェクト配列を指定
     * @param noNavigate
     *  - `en` Specify [[RouteNavigationOptions]]
     *  - `ja` false: `default` スタック登録後, 最後のスタックに対してページ遷移する / true: スタック登録のみ行いページ遷移しない.
     */
    pushPageStack(stack: PageStack | PageStack[], noNavigate?: boolean): Promise<this>;
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
    /**
     * @en To move a specific point in history by stack ID.
     * @ja スタックIDを指定して履歴内の特定のポイントへ移動
     *
     * @param id
     *  - `en` Specified stack ID
     *  - `ja` スタックIDを指定
     */
    traverseTo(id: string): Promise<this>;
    /**
     * @en Begin sub-flow transaction. <br>
     *     Syntactic sugar for `navigate ()`.
     * @ja sub-flow トランザクションの開始 <br>
     *     `navigate()` の糖衣構文
     *
     * @param to
     *  - `en` Set a navigate destination (url / path)
     *  - `ja` ナビゲート先の設定（url / path）
     * @param params
     *  - `en` Specify [[RouteSubFlowParam]]
     *  - `ja` [[RouteSubFlowParam]] を指定
     * @param options
     *  - `en` Specify [[RouteSubFlowParams]]
     *  - `ja` [[RouteSubFlowParams]] を指定
     */
    beginSubFlow(to: string, subflow?: RouteSubFlowParams, options?: RouteNavigationOptions): Promise<this>;
    /**
     * @en Commit sub-flow transaction.
     * @ja sub-flow トランザクションの終了
     *
     * @param params
     *  - `en` Specify [[PageTransitionParams]]. default: { reverse: false }
     *  - `ja` [[PageTransitionParams]] を指定. default: { reverse: false }
     */
    commitSubFlow(params?: PageTransitionParams): Promise<this>;
    /**
     * @en Cancel sub-flow transaction.
     * @ja sub-flow トランザクションのキャンセル
     *
     * @param params
     *  - `en` Specify [[PageTransitionParams]]. default: { reverse: true }
     *  - `ja` [[PageTransitionParams]] を指定. default: { reverse: true }
     */
    cancelSubFlow(params?: PageTransitionParams): Promise<this>;
    /**
     * @en Set common transition settnigs.
     * @ja 共通トランジション設定
     *
     * @param newSettings
     *  - `en` new settings object
     *  - `ja` 新規の設定オブジェクト
     * @returns
     *  - `en` previous settings object
     *  - `ja` 以前の設定オブジェクト
     */
    setTransitionSettings(newSettings: TransitionSettings): TransitionSettings;
}
