import { type UnknownObject, type DOM, type DOMSelector, type DOMEventListener, type ViewConstructionOptions, View } from '@cdp/runtime';
import type { ListContextOptions, IListContext, IListView, ListEnsureVisibleOptions, IListItemView } from './interfaces';
/**
 * @en Interface class that stores {@link ListView} initialization information.
 * @ja {@link ListView} の初期化情報を格納するインターフェイスクラス
 */
export interface ListViewConstructOptions<TElement extends Node = HTMLElement, TFuncName = string> extends ListContextOptions, ViewConstructionOptions<TElement, TFuncName> {
    $el?: DOM<TElement>;
    initialHeight?: number;
}
/**
 * @en Virtual list view class that provides memory management functionality.
 * @ja メモリ管理機能を提供する仮想リストビュークラス
 */
export declare abstract class ListView<TElement extends Node = HTMLElement, TEvent extends object = object> extends View<TElement, TEvent> implements IListView {
    /** constructor */
    constructor(options?: ListViewConstructOptions<TElement>);
    /** context accessor */
    get context(): IListContext;
    /** `this.el` 更新時の新しい HTML をレンダリングロジックの実装関数. モデル更新と View テンプレートを連動させる. */
    abstract render(...args: unknown[]): any;
    /**
     * @override
     * @en Change the view's element (`this.el` property) and re-delegate the view's events on the new element.
     * @ja View が管轄する要素 (`this.el` property) の変更. イベント再設定も実行
     *
     * @param el
     *  - `en` Object or the selector string which becomes origin of element.
     *  - `ja` 要素のもとになるオブジェクトまたはセレクタ文字列
     */
    setElement(el: DOMSelector<TElement | string>): this;
    /**
     * @override
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    remove(): this;
    /**
     * @en Determine whether it has been initialized.
     * @ja 初期化済みか判定
     *
     * @returns
     *  - `en` true: initialized / false: uninitialized
     *  - `ja` true: 初期化済み / false: 未初期化
     */
    isInitialized(): boolean;
    /**
     * @en Item registration.
     * @ja item 登録
     *
     * @param height
     *  - `en` initial item's height
     *  - `ja` item の高さ
     * @param initializer
     *  - `en` constructor for {@link IListItemView}'s subclass
     *  - `ja` {@link IListItemView} のサブクラスのコンストラクタ
     * @param info
     *  - `en` init parameters for {@link IListItemView}'s subclass
     *  - `ja` {@link IListItemView} のサブクラスの初期化パラメータ
     * @param insertTo
     *  - `en` specify the insertion position of item by index
     *  - `ja` item の挿入位置をインデックスで指定
     */
    addItem(height: number, initializer: new (options?: UnknownObject) => IListItemView, info: UnknownObject, insertTo?: number): void;
    /**
     * @en Delete the specified Item.
     * @ja 指定した Item を削除
     *
     * @param index
     *  - `en` specify the index to start releasing
     *  - `ja` 解除開始のインデックスを指定
     * @param size
     *  - `en` total number of items to release
     *  - `ja` 解除する item の総数 [default: 1]
     * @param delay
     *  - `en` delay time to actually delete the element [default: 0 (immediate deletion)
     *  - `ja` 実際に要素を削除する delay time [default: 0 (即時削除)]
     */
    removeItem(index: number, size?: number, delay?: number): void;
    /**
     * @en Delete the specified Item.
     * @ja 指定した Item を削除
     *
     * @param index
     *  - `en` specify target index array. it is more efficient to specify reverse index.
     *  - `ja` 対象インデックス配列を指定. reverse index を指定するほうが効率的
     * @param delay
     *  - `en` delay time to actually delete the element [default: 0 (immediate deletion)
     *  - `ja` 実際に要素を削除する delay time [default: 0 (即時削除)]
     */
    removeItem(index: number[], delay?: number): void;
    /**
     * @en Get the information set for the specified item.
     * @ja 指定した item に設定した情報を取得
     *
     * @param target
     *  - `en` identifier [index | event object]
     *  - `ja` 識別子. [index | event object]
     */
    getItemInfo(target: number | Event): UnknownObject;
    /**
     * @en Refresh active pages.
     * @ja アクティブページを更新
     */
    refresh(): this;
    /**
     * @en Build unassigned pages.
     * @ja 未アサインページを構築
     */
    update(): this;
    /**
     * @en Rebuild page assignments.
     * @ja ページアサインを再構成
     */
    rebuild(): this;
    /**
     * @override
     * @en Destroy internal data.
     * @ja 管轄データを破棄
     */
    release(): this;
    /**
    * @en Get scroll position.
    * @ja スクロール位置を取得
    */
    get scrollPos(): number;
    /**
     * @en Get maximum scroll position.
     * @ja スクロール位置の最大値を取得
     */
    get scrollPosMax(): number;
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
    get backupData(): UnknownObject;
}
