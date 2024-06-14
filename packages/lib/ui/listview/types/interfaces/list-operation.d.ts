import type { UnknownObject } from '@cdp/runtime';
import type { IListItemViewConstructor } from './list-item-view';
/**
 * @en List operation interface.
 * @ja リスト操作のインターフェイス
 */
export interface IListOperation {
    /**
     * @en Determine whether it has been initialized.
     * @ja 初期化済みか判定
     *
     * @returns
     *  - `en` true: initialized / false: uninitialized
     *  - `ja` true: 初期化済み / false: 未初期化
     */
    readonly isInitialized: boolean;
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
    addItem(height: number, initializer: IListItemViewConstructor, info: UnknownObject, insertTo?: number): void;
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
     * @en Destroy internal data.
     * @ja 管轄データを破棄
     */
    release(): this;
}
