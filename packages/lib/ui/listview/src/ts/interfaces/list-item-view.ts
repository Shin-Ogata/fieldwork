import type { AnyObject } from '@cdp/runtime';

/**
 * @en Options to pass to {@link IListItemView}`.updateHeight()`.
 * @ja {@link IListItemView}`.updateHeight()` に渡すオプション
 */
export interface ListItemUpdateHeightOptions {
    /**
     * @en Specify true to recalculate all items affected when updating the height of {@link IListItemView}.
     * @ja {@link IListItemView} の高さ更新時に影響するすべての item の再計算を行う場合は true を指定
     */
    reflectAll?: boolean;
}

/**
 * @en Child view interface that configures the elements of the list view.
 * @ja リストビューの要素を構成する Child View インターフェイス
 */
export interface IListItemView {
    /**
     * @en Get own item index.
     * @ja 自身の item インデックスを取得
     */
    readonly index: number;

    /**
     * @en Get specified height.
     * @ja 指定された高さを取得
     */
    readonly height: number;

    /**
     * @en Check if child node exists.
     * @ja child node が存在するか判定
     */
    readonly hasChildNode: boolean;

    /**
     * @en Update item's height.
     * @ja item の高さを更新
     *
     * @param newHeight
     *  - `en` new item's height
     *  - `ja` item の新しい高さ
     * @param options
     *  - `en` update options object
     *  - `ja` 更新オプション
     */
    updateHeight(newHeight: number, options?: ListItemUpdateHeightOptions): this;

///////////////////////////////////////////////////////////////////////
// View component methods:

    /**
     * @en Implement this function with your code that renders the view template from model data, and updates `this.el` with the new HTML.
     * @ja `this.el` 更新時の新しい HTML をレンダリングロジックの実装関数. モデル更新と View テンプレートを連動させる.
     */
    render(...args: unknown[]): any; // eslint-disable-line @typescript-eslint/no-explicit-any

    /**
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    remove(): this;
}

/**
 * {@link IListItemView} constructor alias.
 */
export type IListItemViewConstructor = new (options?: AnyObject) => IListItemView;
