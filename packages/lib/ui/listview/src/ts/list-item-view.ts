import {
    type Writable,
    type DOM,
    type DOMSelector,
    type ViewConstructionOptions,
    View,
} from '@cdp/runtime';
import type {
    IListView,
    ListItemUpdateHeightOptions,
    IListItemView,
} from './interfaces';
import type { ItemProfile } from './profile';

/** @internal */ const _properties = Symbol('properties');

/** @internal */
interface Property {
    readonly owner: IListView;
    readonly item: ItemProfile;
}

//__________________________________________________________________________________________________//

/**
 * @en Options to pass to {@link ListItemView} construction.
 * @ja {@link ListItemView} 構築に渡すオプション
 */
export interface ListItemViewConstructionOptions<TElement extends Node = HTMLElement, TFuncName = string>
    extends ViewConstructionOptions<TElement, TFuncName> {
    owner: IListView;
    $el?: DOM<TElement>;
    item: ItemProfile;
}

/**
 * @en List item container class handled by {@link ListView}.
 * @ja {@link ListView} が扱うリストアイテムコンテナクラス
 */
export abstract class ListItemView<TElement extends Node = HTMLElement, TEvent extends object = object>
    extends View<TElement, TEvent> implements IListItemView {

    /** @internal */
    private readonly [_properties]!: Property;

    /** constructor */
    constructor(options: ListItemViewConstructionOptions<TElement>) {
        super(options);

        const { owner, $el, item } = options;
        (this[_properties] as Writable<Property>) = {
            owner,
            item,
        } as Property;

        if ($el) {
            this.setElement($el as DOMSelector<TElement>);
        }
    }

///////////////////////////////////////////////////////////////////////
// public methods:

    /** Owner 取得 */
    get owner(): IListView {
        return this[_properties].owner;
    }

///////////////////////////////////////////////////////////////////////
// View component methods:

    /**
     * @override
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    override remove(): this {
        this.$el.children().remove();
        this.$el.off();
        // this.$el は再利用するため完全な破棄はしない
        this.setElement('null');
        this.stopListening();
        return this;
    }

///////////////////////////////////////////////////////////////////////
// implements: IListItemView

    /**
     * @en Get own item index.
     * @ja 自身の item インデックスを取得
     */
    get index(): number {
        return this[_properties].item.index;
    }

    /**
     * @en Get specified height.
     * @ja 指定された高さを取得
     */
    get height(): number {
        return this[_properties].item.height;
    }

    /**
     * @en Check if child node exists.
     * @ja child node が存在するか判定
     */
    get hasChildNode(): boolean {
        return !!this.$el?.children().length;
    }

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
    updateHeight(newHeight: number, options?: ListItemUpdateHeightOptions): this {
        if (this.$el && this.height !== newHeight) {
            this[_properties].item.updateHeight(newHeight, options);
            this.$el.height(newHeight);
        }
        return this;
    }
}
