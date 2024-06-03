import {
    type UnknownObject,
    RESULT_CODE,
    makeResult,
    toHelpString,
} from '@cdp/runtime';
import type { ListEnsureVisibleOptions } from '../interfaces/base';
import type { IListItemViewConstructor } from '../interfaces/list-item-view';
import type { IExpandableListContext } from '../interfaces/expandable-context';
import { ItemProfile } from './item';

const enum LayoutKey {
    DEFAULT = 'layout-default',
}

/**
 * @en UI structure information storage class for group management of list items. <br>
 *     This class does not directly manipulate the DOM.
 * @ja リストアイテムをグループ管理する UI 構造情報格納クラス <br>
 *     本クラスは直接は DOM を操作しない
 */
export class GroupProfile {
    /** @internal profile id */
    private readonly _id: string;
    /** @internal {@link ExpandableListView} instance*/
    private readonly _owner: IExpandableListContext;
    /** @internal parent {@link GroupProfile} instance */
    private _parent?: GroupProfile;
    /** @internal child {@link GroupProfile} array */
    private readonly _children: GroupProfile[] = [];
    /** @internal expanded / collapsed status */
    private _expanded = false;
    /** @internal registration status for _owner */
    private _status: 'registered' | 'unregistered' = 'unregistered';
    /** @internal stored {@link ItemProfile} information */
    private readonly _mapItems: Record<string, ItemProfile[]> = {};

    /**
     * constructor
     *
     * @param owner
     *  - `en` {@link IExpandableListContext} instance
     *  - `ja` {@link IExpandableListContext} インスタンス
     * @param id
     *  - `en` id of the instance. specified by the framework.
     *  - `ja` インスタンスの ID. フレームワークが指定
     */
    constructor(owner: IExpandableListContext, id: string) {
        this._id    = id;
        this._owner = owner;
        this._mapItems[LayoutKey.DEFAULT] = [];
    }

///////////////////////////////////////////////////////////////////////
// accessors:

    /**
     * @en Get ID.
     * @ja ID を取得
     */
    get id(): string {
        return this._id;
    }

    /**
     * 
     * @en Get status. 'registered' | 'unregistered'
     * @ja ステータスを取得 'registered' | 'unregistered'
     */
    get status(): 'registered' | 'unregistered' {
        return this._status;
    }

    /**
     * @en Check expanded / collapsed status.
     * @ja 展開状態を判定
     *
     * @returns
     *  - `en` true: expanded, collapsed: close
     *  - `ja` true: 展開, false: 収束
     */
    get isExpanded(): boolean {
        return this._expanded;
    }

    /**
     * @en Get parent {@link GroupProfile}.
     * @ja 親 {@link GroupProfile} を取得
     */
    get parent(): GroupProfile | undefined {
        return this._parent;
    }

    /**
     * @en Get children {@link GroupProfile}.
     * @ja 子 {@link GroupProfile} を取得
     */
    get children(): GroupProfile[] {
        return this._children;
    }

///////////////////////////////////////////////////////////////////////
// public methods:

    /**
     * @en Get the next available index of the last item element.
     * @ja 最後の item 要素の次に使用できる index を取得
     *
     * @param withActiveChildren 
     *  - `en` specify true to search including registered child elements
     *  - `ja` 登録済みの子要素を含めて検索する場合は true を指定
     */
    public getNextItemIndex(withActiveChildren = false): number {
        let items: ItemProfile[] = [];
        if (withActiveChildren) {
            items = this.queryOperationTarget('active');
        }
        if (null == items || items.length <= 0) {
            items = this._items;
        }
        return (items[items.length - 1]?.index ?? 0) + 1;
    }

    /**
     * @en Item registration.
     * @ja 本 GroupProfile が管理する item を作成して登録
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
     * @param layoutKey
     *  - `en` identifier for each layout
     *  - `ja` レイアウト毎の識別子
     */
    public addItem(
        height: number,
        initializer: IListItemViewConstructor,
        info: UnknownObject,
        layoutKey?: string,
    ): GroupProfile {
        layoutKey = layoutKey ?? LayoutKey.DEFAULT;
        const options = Object.assign({ groupProfile: this }, info);

        if (null == this._mapItems[layoutKey]) {
            this._mapItems[layoutKey] = [];
        }

        const item = new ItemProfile(this._owner.context, Math.trunc(height), initializer, options);

        // _owner の管理下にあるときは速やかに追加
        if (('registered' === this._status) && (null == this._owner.layoutKey || layoutKey === this._owner.layoutKey)) {
            this._owner._addItem(item, this.getNextItemIndex());
            this._owner.update();
        }
        this._mapItems[layoutKey].push(item);

        return this;
    }

    /**
     * @en Add {@link GroupProfile} as child element.
     * @ja 子要素として {@link GroupProfile} を追加
     *
     * @param target {@link GroupProfile} instance / instance array
     */
    public addChildren(target: GroupProfile | GroupProfile[]): this {
        const children: GroupProfile[] = Array.isArray(target) ? target : [target];
        for (const child of children) {
            child.setParent(this);
        }
        this._children.push(...children);
        return this;
    }

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
    public hasChildren(layoutKey?: string): boolean {
        if (this._children.length <= 0) {
            return false;
        } else if (null != layoutKey) {
            return this._children.some(child => child.hasLayoutKeyOf(layoutKey));
        } else {
            return true;
        }
    }

    /**
     * @en Determine if the specified `layoutKey` exists.
     * @ja 指定された `layoutKey` が存在するか判定
     *
     * @param layoutKey
     *  - `en` identifier for each layout
     *  - `ja` レイアウト毎の識別子
     * @returns
     *  - `en` true: exists, false: unexists
     *  - `ja` true: 有, false: 無
     */
    public hasLayoutKeyOf(layoutKey: string): boolean {
        return (null != this._mapItems[layoutKey]);
    }

    /**
     * @en Group expansion.
     * @ja グループ展開
     */
    public async expand(): Promise<void> {
        if (!this.isExpanded) {
            const items = this.queryOperationTarget('registered');
            if (0 < items.length) {
                await this._owner.statusScope('expanding', () => {
                    // 自身を更新
                    for (const item of this._items) {
                        item.refresh();
                    }
                    // 配下を更新
                    this._owner._addItem(items, this.getNextItemIndex());
                    this._owner.update();
                });
            }
        }
        // 子要素がなくても展開状態にする
        this._expanded = true;
    }

    /**
     * @en Group collapse.
     * @ja グループ収束
     *
     * @param delay
     *  - `en` delay time spent removing elements. [default: `animationDuration` value]
     *  - `ja` 要素削除に費やす遅延時間. [default: `animationDuration` value]
     */
    public async collapse(delay?: number): Promise<void> {
        if (this.isExpanded) {
            const items = this.queryOperationTarget('unregistered');
            if (0 < items.length) {
                delay = delay ?? this._owner.context.options.animationDuration;
                await this._owner.statusScope('collapsing', () => {
                    // 自身を更新
                    for (const item of this._items) {
                        item.refresh();
                    }
                    // 配下を更新
                    this._owner.removeItem(items[0].index, items.length, delay);
                    this._owner.update();
                });
            }
        }
        // 子要素がなくても収束状態にする
        this._expanded = false;
    }

    /**
     * @en Show self in visible area of list.
     * @ja 自身をリストの可視領域に表示
     *
     * @param options
     *  - `en` {@link ListEnsureVisibleOptions} option's object
     *  - `ja` {@link ListEnsureVisibleOptions} オプション
     */
    async ensureVisible(options?: ListEnsureVisibleOptions): Promise<void> {
        if (0 < this._items.length) {
            await this._owner.ensureVisible(this._items[0].index, options);
        } else {
            options?.callback?.();
        }
    }

    /**
     * @en Toggle expand / collapse.
     * @ja 開閉のトグル
     *
     * @param delay
     *  - `en` delay time spent removing elements. [default: `animationDuration` value]
     *  - `ja` 要素削除に費やす遅延時間. [default: `animationDuration` value]
     */
    public async toggle(delay?: number): Promise<void> {
        if (this._expanded) {
            await this.collapse(delay);
        } else {
            await this.expand();
        }
    }

    /**
     * @en Register to list view. Only 1st layer group can be registered.
     * @ja リストビューへ登録. 第1階層グループのみ登録可能.
     *
     * @param insertTo
     *  - `en` specify insertion position with index
     *  - `ja` 挿入位置を index で指定
     */
    public register(insertTo: number): this {
        if (this._parent) {
            throw makeResult(
                RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM,
                `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} 'GroupProfile#register' method is acceptable only 1st layer group.`
            );
        }
        this._owner._addItem(this.preprocess('registered'), insertTo);
        return this;
    }

    /**
     * @en Restore to list view. Only 1st layer group can be specified.
     * @ja リストビューへ復元. 第1階層グループのみ指示可能.
     */
    public restore(): this {
        if (this._parent) {
            throw makeResult(
                RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM,
                `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} 'GroupProfile#restore' method is acceptable only 1st layer group.`
            );
        }

        if (this._items) {
            const items = this._expanded ? this._items.concat(this.queryOperationTarget('active')) : this._items.slice();
            this._owner._addItem(items);
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// internal:

    /** @internal 自身の管理するアクティブな LineProfie を取得 */
    private get _items(): ItemProfile[] {
        const key = this._owner.layoutKey;
        if (null != key) {
            return this._mapItems[key];
        } else {
            return this._mapItems[LayoutKey.DEFAULT];
        }
    }

    /** @internal 親 Group 指定 */
    private setParent(parent: GroupProfile): void {
        this._parent = parent;
    }

    /** @internal  register / unregister の前処理 */
    private preprocess(newStatus: 'registered' | 'unregistered'): ItemProfile[] {
        const items: ItemProfile[] = [];
        if (newStatus !== this._status) {
            items.push(...this._items);
        }
        this._status = newStatus;
        return items;
    }

    /** @internal 操作対象の ItemProfile 配列を取得 */
    private queryOperationTarget(operation: 'registered' | 'unregistered' | 'active'): ItemProfile[] {
        const findTargets = (group: GroupProfile): ItemProfile[] => {
            const items: ItemProfile[] = [];
            for (const child of group._children) {
                switch (operation) {
                    case 'registered':
                    case 'unregistered':
                        items.push(...child.preprocess(operation));
                        break;
                    case 'active':
                        if (null != child._items) {
                            items.push(...child._items);
                        }
                        break;
                    default:
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        console.warn(`unknown operation: ${operation}`);
                        break;
                }
                if (child.isExpanded) {
                    items.push(...findTargets(child));
                }
            }
            return items;
        };
        return findTargets(this);
    }
}
