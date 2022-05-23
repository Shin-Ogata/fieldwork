import { Class, UnknownFunction, UnknownObject } from '@cdp/core-utils';
import { Subscribable } from '@cdp/events';
import { DOM, QueryContext } from '@cdp/dom';
import type { IHistory } from '../history';
/**
 * @en Argument given to the router event callback.
 * @ja ルーターイベントに渡される引数
 */
export interface RouterEventArg {
    /** router instance */
    readonly router: Router;
    /** from state */
    readonly from: Route;
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
    'error': [Error];
}
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
     * @en Specify the constructor or built object of the View component. <br>
     *     In case of functional type, [[Router]] instance is passed as an argument.
     * @ja View コンポーネントのコンストラクタもしくは構築済みオブジェクト <br>
     *     関数型の場合は引数に [[Router]] インスタンスが渡される
     */
    component?: Class | UnknownFunction | UnknownObject;
}
/**
 * @en Route navigation options definition.
 * @ja ルートナビゲーションオプション定義
 */
export interface RouteNavigationOptions {
    /** extension property for user land */
    intent?: unknown;
}
/**
 * @en Route context property definition.
 * @ja ルートコンテキストプロパティ定義
 */
export declare type Route = Pick<RouteParameters, 'path' | 'component'> & {
    /**
     * object with route query. If the url is `/page/?id=5&foo=bar` then it will contain the following object `{ id: '5', foo: 'bar' }`
     */
    query: {
        [queryParameter: string]: string | undefined;
    };
    /**
     * route params. If we have matching route with `/page/user/:userId/post/:postId/` path and url of the page is `/page/user/55/post/12/` then it will be the following object `{ userId: '55', postId: '12' }`
     */
    params: {
        [routeParameter: string]: string | undefined;
    };
};
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
     * @en Specify the [IHistory] instance or mode to use with the router. The default is to use the `hash` mode in the browser history.
     * @ja ルーターで使用する [[IHistory]] インスタンスまたはモードを指定. 既定は ブラウザ履歴の `hash` モードを使用.
     */
    history?: 'hash' | 'history' | 'memory' | IHistory;
    /**
     * @en Read the router element from the passed QueryContext.
     * @ja 渡された QueryContext から ルーターエレメントを読み込む.
     */
    el?: QueryContext | null;
    /**
     * @en Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     * @ja 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     */
    document?: Document | null;
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
     * @en `DOM` instance with router's view HTML element
     * @ja ルーターのビュー HTML 要素を持つ `DOM` インスタンス
     */
    readonly $el: DOM;
    /**
     * @en Object with current route data
     * @ja 現在のルートデータを持つオブジェクト
     */
    readonly currentRoute: Route;
    /**
     * @en Route registration
     * @jp ルートの登録
     */
    register(routes: RouteParameters | RouteParameters[]): this;
    /** To move backward through history. */
    back(): this;
    /** To move forward through history. */
    forward(): this;
    /** To move a specific point in history. */
    go(delta?: number): this;
}
