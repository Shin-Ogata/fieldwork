import { type DOM, type ViewConstructionOptions, View } from '@cdp/runtime';
import type { IListView, ListItemUpdateHeightOptions, IListItemView } from './interfaces';
import type { ItemProfile } from './profile';
/**
 * @en Options to pass to {@link ListItemView} construction.
 * @ja {@link ListItemView} 構築に渡すオプション
 */
export interface ListItemViewConstructionOptions<TElement extends Node = HTMLElement, TFuncName = string> extends ViewConstructionOptions<TElement, TFuncName> {
    owner: IListView;
    $el?: DOM<TElement>;
    item: ItemProfile;
}
/**
 * @en List item container class handled by {@link ListView}.
 * @ja {@link ListView} が扱うリストアイテムコンテナクラス
 */
export declare abstract class ListItemView<TElement extends Node = HTMLElement, TEvent extends object = object> extends View<TElement, TEvent> implements IListItemView {
    /** constructor */
    constructor(options: ListItemViewConstructionOptions<TElement>);
    /** Owner 取得 */
    get owner(): IListView;
    /**
     * @override
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    remove(): this;
    /**
     * @en Get own item index.
     * @ja 自身の item インデックスを取得
     */
    get index(): number;
    /**
     * @en Get specified height.
     * @ja 指定された高さを取得
     */
    get height(): number;
    /**
     * @en Check if child node exists.
     * @ja child node が存在するか判定
     */
    get hasChildNode(): boolean;
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
}
