import { UnknownObject } from '@cdp/runtime';
import type { IListContext } from '../interfaces/base';
import type { IListItemViewConstructor, ListItemUpdateHeightOptions } from '../interfaces/list-item-view';
/**
 * @en A class that stores UI structure information for list items.
 * @ja リストアイテムの UI 構造情報を格納するクラス
 */
export declare class ItemProfile {
    /**
     * constructor
     *
     * @param owner
     *  - `en` {@link IListViewContext} instance
     *  - `ja` {@link IListViewContext} インスタンス
     * @param height
     *  - `en` initial item's height
     *  - `ja` item の初期の高さ
     * @param initializer
     *  - `en` constructor for {@link IListItemView}'s subclass
     *  - `ja` {@link IListItemView} のサブクラスのコンストラクタ
     * @param info
     *  - `en` init parameters for {@link IListItemView}'s subclass
     *  - `ja` {@link IListItemView} のサブクラスの初期化パラメータ
     */
    constructor(owner: IListContext, height: number, initializer: IListItemViewConstructor, _info: UnknownObject);
    /** Get the item's height. */
    get height(): number;
    /** Get the item's global index. */
    get index(): number | undefined;
    /** Set the item's global index. */
    set index(index: number);
    /** Get belonging the page index. */
    get pageIndex(): number | undefined;
    /** Set belonging the page index. */
    set pageIndex(index: number);
    /** Get global offset. */
    get offset(): number;
    /** Set global offset. */
    set offset(offset: number);
    /** Get init parameters. */
    get info(): UnknownObject;
    /**
     * @en Activate of the item.
     * @ja item の活性化
     */
    activate(): void;
    /**
     * @en Make the item invisible.
     * @ja item の不可視化
     */
    hide(): void;
    /**
     * @en Deactivate of the item.
     * @ja item の非活性化
     */
    deactivate(): void;
    /**
     * @en Refresh the item.
     * @ja item の更新
     */
    refresh(): void;
    /**
     * @en Check the activation status of the item.
     * @ja item の活性状態判定
     */
    isActive(): boolean;
    /**
     * @en Update height information of the item. Called from {@link ListItemView}.
     * @ja item の高さ情報の更新. {@link ListItemView} からコールされる。
     */
    updateHeight(newHeight: number, options?: ListItemUpdateHeightOptions): void;
    /**
     * @en Reset z-index. Called from {@link ScrollManager}`.removeItem()`.
     * @ja z-index のリセット. {@link ScrollManager}`.removeItem()` からコールされる。
     */
    resetDepth(): void;
}
