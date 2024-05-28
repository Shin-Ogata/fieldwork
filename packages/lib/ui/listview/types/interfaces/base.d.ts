import type { UnknownObject, DOM, DOMEventListener, DOMSelector } from '@cdp/runtime';
/**
 * @en Factory interface for {@link IListScroller}.
 * @ja {@link IListScroller} のファクトリインターフェイス
 */
export interface ListScrollerFactory {
    /**
     * @en Factory function.
     * @ja ファクトリ関数
     */
    (element: DOMSelector, options: ListContextOptions): IListScroller;
    /**
     * @en {@link IListScroller} identifier.
     * @ja {@link IListScroller} の識別子
     */
    readonly type: string;
}
/**
 * @en List context option definition.
 * @ja リストコンテキストオプション定義
 */
export interface ListContextOptions {
    /**
     * @en Specify factory method if you want to use custom {@link IListScroller}.
     * @ja カスタム {@link IListScroller} を使用したい場合にファクトリメソッドを指定
     */
    scrollerFactory?: ListScrollerFactory;
    /**
     * @en Specify true to set the preload target to visibility: "hidden". [default: false]
     * @ja preload 対象を visibility: "hidden" にする場合は true を指定 [default: false]
     */
    enableHiddenPage?: boolean;
    /**
     * @en Set offset of list item with transform property. (not very good) [default: false]
     * @ja list item の offset を transform で設定する (あまりよくない) [default: false]
     */
    enableTransformOffset?: boolean;
    /**
     * @en Update check interval for scroll-map area. Used during non-DOM operations such as iscroll. [default: 200]
     * @ja scroll-map 領域の更新確認間隔. iscroll 等, 非 DOM 操作時に使用 [default: 200]
     */
    scrollMapRefreshInterval?: number;
    /**
     * @en list view scroll movement amount for update processing (TODO: intersctionRect) [default: 200]
     * @ja list view 更新処理を行う scroll 移動量 (TODO: intersctionRect) [default: 200]
     */
    scrollRefreshDistance?: number;
    /**
     * @en Number of pages added completely outside the display area (twice the number of pages forward and backward) [default: 3]
     * @ja 表示領域外で完全な状態で追加される page 数 (前方・後方合わせて 2倍) [default: 3]
     */
    pagePrepareCount?: number;
    /**
     * @en Number of pages added in hidden state outside the display area (twice the total of forward and backward) [default: 1]
     * @ja 表示領域外で hidden 状態で追加される page 数 (前方・後方合わせて 2倍) [default: 1]
     */
    pagePreloadCount?: number;
    /**
     * @en Specify true to enable animation. [default: true]
     * @ja アニメーションを有効にする場合は true を指定 [default: true]
     */
    enableAnimation?: boolean;
    /**
     * @en Animation time [msec, default: 0]
     * @ja アニメーションの費やす時間 [msec, default: 0]
     */
    animationDuration?: number;
    /**
     * @en Reference z-index. Used during "collapse" animation. [default: auto]
     * @ja 基準とする z-index. "collapse" 時のアニメーション時に使用 [default: auto]
     */
    baseDepth?: string;
    /**
     * @en Tag name used by {@link ListItemView} (TODO: need to review) [default: li]
     * @ja {@link ListItemView} が使用するタグ名 (TODO: 見直し予定) [default: li]
     */
    itemTagName?: string;
    /**
     * @en Specify true if you want to automatically apply a transition as necessary during removeItem(). [default: true]
     * @ja removeItem() 時に必要に応じて自動で transition をかける場合は true を指定 [default: true]
     */
    removeItemWithTransition?: boolean;
    /**
     * @en Specify true if you want to use Dummy for an inactive scroll map. (When switching flipsnap, etc. There is not much effect.) [default: false]
     * @ja 非アクティブな scroll map に対して Dummy を使用する場合は true を指定. (flipsnap 切り替え時等. 効果はあまりなし) [default: false]
     */
    useDummyInactiveScrollMap?: boolean;
}
/**
 * @en List core context interface.
 * @ja リストのコンテキストインターフェイス定義
 */
export interface IListContext {
    /** get scroll-map element */
    readonly $scrollMap: DOM;
    /** get scroll-map height [px] */
    readonly scrollMapHeight: number;
    /** get {@link ListContextOptions} */
    readonly options: Required<ListContextOptions>;
    /** update scroll-map height (delta [px]) */
    updateScrollMapHeight(delta: number): void;
    /**
     * update internal profile
     * @param from specify update start index
     */
    updateProfiles(from: number): void;
    /** get recyclable element */
    findRecycleElements(): DOM;
}
/**
 * @en Context accessible interface definition.
 * @ja コンテキストアクセス可能なインターフェイス定義
 */
export interface IListContextHolder {
    /** context accessor */
    readonly context: IListContext;
}
/**
 * @en Interface definition for list scroll component.
 * @ja リストのスクロールコンポーネントのインターフェイス定義
 */
export interface IListScroller {
    /**
     * @en Get scroller type information.
     * @ja Scroller の型情報を取得
     *
     * @returns
     *  - `en` type identification string
     *  - `ja` タイプ識別文字
     */
    readonly type: string;
    /**
     * @en Get scroll position value.
     * @ja スクロール位置取得
     */
    readonly pos: number;
    /**
     * @en Get maximum scroll position.
     * @ja スクロール最大値位置を取得
     */
    readonly posMax: number;
    /**
     * @en Register scroll event.
     * @ja スクロールイベント登録
     *
     * @param type
     *  - `en` event type ('scroll' | 'scrollstop')
     *  - `ja` イベント型 ('scroll' | 'scrollstop')
     * @param callback
     *  - `en` event handler
     *  - `ja` イベントハンドラー
     */
    on(type: 'scroll' | 'scrollstop', callback: DOMEventListener): void;
    /**
     * @en Unregister scroll event.
     * @ja スクロールイベント登録解除
     *
     * @param type
     *  - `en` event type ('scroll' | 'scrollstop')
     *  - `ja` イベント型 ('scroll' | 'scrollstop')
     * @param callback
     *  - `en` event handler
     *  - `ja` イベントハンドラー
     */
    off(type: 'scroll' | 'scrollstop', callback: DOMEventListener): void;
    /**
     * @en Set scroll position.
     * @ja スクロール位置を指定
     *
     * @param pos
     *  - `en` new scroll position value [0 - posMax]
     *  - `ja` 新しいスクロール位置を指定 [0 - posMax]
     * @param animate
     *  - `en` enable/disable animation
     *  - `ja` アニメーションの有無
     * @param time
     *  - `en` time spent on animation [msec]
     *  - `ja` アニメーションに費やす時間 [msec]
     */
    scrollTo(pos: number, animate?: boolean, time?: number): Promise<void>;
    /**
     * @en Scroller state update.
     * @ja Scroller の状態更新
     */
    update(): void;
    /**
     * @en Destroy a Scroller.
     * @ja Scroller の破棄
     */
    destroy(): void;
}
/**
 * @en Option definition to pass to `ensureVisible()` method.
 * @ja `ensureVisible()` メソッドに渡すオプション定義
 */
export interface ListEnsureVisibleOptions {
    /**
     * @en Specify true to allow partial display. [default: true]
     * @ja 部分的表示を許可する場合 true を指定 [default: true]
     */
    partialOK?: boolean;
    /**
     * @en Specify true to forcibly move to the top of the scroll area. [default: false]
     * @ja 強制的にスクロール領域の上部に移動する場合 true を指定 [default: false]
     */
    setTop?: boolean;
    /**
     * @en Specify true to animate. [default: setting and synchronizing {@link ListContextOptions}`.enableAnimation`]
     * @ja アニメーションする場合 true を指定 [default: {@link ListContextOptions}`.enableAnimation` の設定と同期]
     */
    animate?: boolean;
    /**
     * @en time spent on animation. [msec]
     * @ja アニメーションに費やす時間 [msec]
     */
    time?: number;
    /**
     * @en Called when the animation stops. (pseudo)
     * @ja アニメーション終了のタイミングでコールされる (疑似的)
     */
    callback?: () => void;
}
/**
 * @en Interface definition for list scrollable area.
 * @ja リストのスクロール可能領域のインターフェイス定義
 */
export interface IListScrollable {
    /**
    * @en Get scroll position.
    * @ja スクロール位置を取得
    */
    readonly scrollPos: number;
    /**
     * @en Get maximum scroll position.
     * @ja スクロール位置の最大値を取得
     */
    readonly scrollPosMax: number;
    /**
    * @en Scroll event handler setting/cancellation.
    * @ja スクロールイベントハンドラ設定/解除
    *
    * @param handler
    *  - `en` event handler function
    *  - `ja` イベントハンドラー関数
    * @param method
    *  - `en` on: setting / off: canceling
    *  - `ja` on: 設定 / off: 解除
    */
    setScrollHandler(handler: DOMEventListener, method: 'on' | 'off'): void;
    /**
     * @en Setting/cancelling scroll stop event handler.
     * @ja スクロール終了イベントハンドラ設定/解除
     *
     * @param handler
     *  - `en` event handler function
     *  - `ja` イベントハンドラー関数
     * @param method
     *  - `en` on: setting / off: canceling
     *  - `ja` on: 設定 / off: 解除
     */
    setScrollStopHandler(handler: DOMEventListener, method: 'on' | 'off'): void;
    /**
     * @en Set scroll position.
     * @ja スクロール位置を指定
     *
     * @param pos
     *  - `en` new scroll position value [0 - posMax]
     *  - `ja` 新しいスクロール位置を指定 [0 - posMax]
     * @param animate
     *  - `en` enable/disable animation
     *  - `ja` アニメーションの有無
     * @param time
     *  - `en` time spent on animation [msec]
     *  - `ja` アニメーションに費やす時間 [msec]
     */
    scrollTo(pos: number, animate?: boolean, time?: number): Promise<void>;
    /**
     * @en Ensure visibility of item by index.
     * @ja インデックス指定された item の表示を保証
     *
     * @param index
     *  - `en` specify index of item
     *  - `ja` item のインデックスを指定
     * @param options
     *  - `en` specify {@link ListEnsureVisibleOptions} object
     *  - `ja` {@link ListEnsureVisibleOptions} オブジェクトを指定
     */
    ensureVisible(index: number, options?: ListEnsureVisibleOptions): Promise<void>;
}
/**
 * @en Interface definition for list internal data backup/restore function.
 * @ja リスト内部データのバックアップ・リストア機能のインターフェイス定義
 */
export interface IListBackupRestore {
    /**
     * @en Execute a backup of internal data.
     * @ja 内部データのバックアップを実行
     *
     * @param key
     *  - `en` specify backup key (any identifier)
     *  - `ja` バックアップキー(任意の識別子)を指定
     * @returns
     *  - `en` true: success / false: failure
     *  - `ja` true: 成功 / false: 失敗
     */
    backup(key: string): boolean;
    /**
     * @en Execute a backup of internal data.
     * @ja 内部データのバックアップを実行
     *
     * @param key
     *  - `en` specify backup key (the one used for `backup()`)
     *  - `ja` バックアップキーを指定 (`backup()` に使用したもの)
     * @param rebuild
     *  - `en` specify true to rebuild the list structure
     *  - `ja` リスト構造を再構築する場合は true を指定
     * @returns
     *  - `en` true: success / false: failure
     *  - `ja` true: 成功 / false: 失敗
     */
    restore(key: string, rebuild: boolean): boolean;
    /**
     * @en Check whether backup data exists.
     * @ja バックアップデータの有無を確認
     *
     * @param key
     *  - `en` specify backup key (the one used for `backup()`)
     *  - `ja` バックアップキーを指定 (`backup()` に使用したもの)
     * @returns
     *  - `en` true: exists / false: not exists
     *  - `ja` true: 有 / false: 無
     */
    hasBackup(key: string): boolean;
    /**
     * @en Discard backup data.
     * @ja バックアップデータの破棄
     *
     * @param key
     *  - `en` specify backup key (the one used for `backup()`)
     *  - `ja` バックアップキーを指定 (`backup()` に使用したもの)
     * @returns
     *  - `en` true: discard existing data / false: specified data does not exist
     *  - `ja` true: 存在したデータを破棄 / false: 指定されたデータは存在しない
     */
    clearBackup(key?: string): boolean;
    /**
     * @en Access backup data.
     * @ja バックアップデータにアクセス
     */
    readonly backupData: UnknownObject;
}
/**
 * @en List state management interface.
 * @ja リスト状態管理インターフェイス
 */
export interface IListStatusManager {
    /**
     * @en Increment reference count for status identifier.
     * @ja 状態変数の参照カウントのインクリメント
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @returns
     *  - `en` reference count value
     *  - `ja` 参照カウントの値
     */
    statusAddRef(status: string): number;
    /**
     * @en Decrement reference count for status identifier.
     * @ja 状態変数の参照カウントのデクリメント
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @returns
     *  - `en` reference count value
     *  - `ja` 参照カウントの値
     */
    statusRelease(status: string): number;
    /**
     * @en State variable management scope
     * @ja 状態変数管理スコープ
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @param executor
     *  - `en` seed function.
     *  - `ja` 対象の関数
     * @returns
     *  - `en` retval of seed function.
     *  - `ja` 対象の関数の戻り値
     */
    statusScope<T>(status: string | symbol, executor: () => T | Promise<T>): Promise<T>;
    /**
     * @en Check if it's in the specified state.
     * @ja 指定した状態中であるか確認
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @return {Boolean} true: 状態内 / false: 状態外
     * @returns
     *  - `en` `true`: within the status / `false`: out of the status
     *  - `ja` `true`: 状態内 / `false`: 状態外
     */
    isStatusIn(status: string): boolean;
}
/**
 * @en Interface that provides layout information accessors. (for internal use)
 * @ja レイアウト情報アクセッサを提供するインターフェイス (内部用)
 */
export interface IListLayoutKeyHolder {
}
