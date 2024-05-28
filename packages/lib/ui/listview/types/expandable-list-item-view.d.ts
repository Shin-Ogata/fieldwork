import type { IExpandableListView } from './interfaces';
import type { GroupProfile } from './profile';
import { type ListItemViewConstructionOptions, ListItemView } from './list-item-view';
/**
 * @en Options to pass to {@link ExpandableListItemView} construction.
 * @ja {@link ExpandableListItemView} 構築に渡すオプション
 */
export interface ExpandableListItemViewConstructionOptions<TElement extends Node = HTMLElement, TFuncName = string> extends ListItemViewConstructionOptions<TElement, TFuncName> {
    owner: IExpandableListView;
    /** {@link GroupProfile} instance */
    group: GroupProfile;
}
/**
 * @en List item container class handled by {@link ExpandableListView}.
 * @ja {@link ExpandableListView} が扱うリストアイテムコンテナクラス
 */
export declare abstract class ExpandableListItemView<TElement extends Node = HTMLElement, TEvent extends object = object> extends ListItemView<TElement, TEvent> {
    /** constructor */
    constructor(options: ExpandableListItemViewConstructionOptions<TElement>);
    /**
     * @en Check expanded / collapsed status.
     * @ja 展開状態を判定
     *
     * @returns
     *  - `en` true: expanded, collapsed: close
     *  - `ja` true: 展開, false: 収束
     */
    protected get isExpanded(): boolean;
    /**
     * @en Determine whether the list is during expanding.
     * @ja 展開中か判定
     */
    protected get isExpanding(): boolean;
    /**
     * @en Determine whether the list is during collapsing.
     * @ja 収束中か判定
     */
    protected get isCollapsing(): boolean;
    /**
     * @en Determine whether the list is during expanding or collapsing.
     * @ja 開閉中か判定
     */
    protected get isSwitching(): boolean;
    /**
     * @en Determine if it has a child {@link GroupProfile}. <br>
     *     If `layoutKey` is specified, whether the layout information matches is also added to the judgment condition.
     * @ja 子 {@link GroupProfile} を持っているか判定 <br>
     *     `layoutKey` が指定されれば、layout 情報が一致しているかも判定条件に加える
     *
     * @param layoutKey
     *  - `en` identifier for each layout
     *  - `ja` レイアウト毎の識別子
     * @returns
     *  - `en` true: exists, false: unexists
     *  - `ja` true: 有, false: 無
     */
    protected hasChildren(layoutKey?: string): boolean;
}
