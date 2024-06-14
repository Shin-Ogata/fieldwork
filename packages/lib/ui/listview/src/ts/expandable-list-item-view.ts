import type { Writable } from '@cdp/runtime';
import type { IExpandableListView } from './interfaces';
import type { GroupProfile } from './profile';
import { type ListItemViewConstructionOptions, ListItemView } from './list-item-view';

/** @internal */ const _properties = Symbol('properties');

/** @internal */
interface Property {
    readonly group: GroupProfile;
}

//__________________________________________________________________________________________________//

/**
 * @en Options to pass to {@link ExpandableListItemView} construction.
 * @ja {@link ExpandableListItemView} 構築に渡すオプション
 */
export interface ExpandableListItemViewConstructionOptions<TElement extends Node = HTMLElement, TFuncName = string>
    extends ListItemViewConstructionOptions<TElement, TFuncName> {
    owner: IExpandableListView;
    /** {@link GroupProfile} instance */
    group: GroupProfile;
}

/**
 * @en List item container class handled by {@link ExpandableListView}.
 * @ja {@link ExpandableListView} が扱うリストアイテムコンテナクラス
 */
export abstract class ExpandableListItemView<TElement extends Node = HTMLElement, TEvent extends object = object>
    extends ListItemView<TElement, TEvent> {

    /** @internal */
    private readonly [_properties]!: Property;

    /** constructor */
    constructor(options: ExpandableListItemViewConstructionOptions<TElement>) {
        super(options);
        const { group } = options;
        (this[_properties] as Writable<Property>) = { group } as Property;
    }

///////////////////////////////////////////////////////////////////////
// protected methods:

    /**
     * @en Check expanded / collapsed status.
     * @ja 展開状態を判定
     *
     * @returns
     *  - `en` true: expanded, collapsed: close
     *  - `ja` true: 展開, false: 収束
     */
    protected get isExpanded(): boolean {
        return this[_properties].group.isExpanded;
    }

    /**
     * @en Determine whether the list is during expanding.
     * @ja 展開中か判定
     */
    protected get isExpanding(): boolean {
        return (this.owner as IExpandableListView).isExpanding;
    }

    /**
     * @en Determine whether the list is during collapsing.
     * @ja 収束中か判定
     */
    protected get isCollapsing(): boolean {
        return (this.owner as IExpandableListView).isCollapsing;
    }

    /**
     * @en Determine whether the list is during expanding or collapsing.
     * @ja 開閉中か判定
     */
    protected get isSwitching(): boolean {
        return (this.owner as IExpandableListView).isSwitching;
    }

    /**
     * @en Determine if it has a child {@link GroupProfile}.
     * @ja 子 {@link GroupProfile} を持っているか判定
     *
     * @returns
     *  - `en` true: exists, false: unexists
     *  - `ja` true: 有, false: 無
     */
    protected get hasChildren(): boolean {
        return this[_properties].group.hasChildren;
    }
}
