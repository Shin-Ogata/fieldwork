import { type UnknownObject } from '@cdp/runtime';
import type { ListEnsureVisibleOptions } from '../interfaces/base';
import type { IListItemView } from '../interfaces/list-item-view';
import type { IExpandableListContext } from '../interfaces/expandable-context';
/**
 * @en UI structure information storage class for group management of list items. <br>
 *     This class does not directly manipulate the DOM.
 * @ja リストアイテムをグループ管理する UI 構造情報格納クラス <br>
 *     本クラスは直接は DOM を操作しない
 */
export declare class GroupProfile {
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
    constructor(owner: IExpandableListContext, id: string);
    /**
     * @en Get ID.
     * @ja ID を取得
     */
    get id(): string;
    /**
     *
     * @en Get status. 'registered' | 'unregistered'
     * @ja ステータスを取得 'registered' | 'unregistered'
     */
    get status(): 'registered' | 'unregistered';
    /**
     * @en Check expanded / collapsed status.
     * @ja 展開状態を判定
     *
     * @returns
     *  - `en` true: expanded, collapsed: close
     *  - `ja` true: 展開, false: 収束
     */
    get isExpanded(): boolean;
    /**
     * @en Get parent {@link GroupProfile}.
     * @ja 親 {@link GroupProfile} を取得
     */
    get parent(): GroupProfile | undefined;
    /**
     * @en Get children {@link GroupProfile}.
     * @ja 子 {@link GroupProfile} を取得
     */
    get children(): GroupProfile[];
    /**
     * @en Get the next available index of the last item element.
     * @ja 最後の item 要素の次に使用できる index を取得
     *
     * @param withActiveChildren
     *  - `en` specify true to search including registered child elements
     *  - `ja` 登録済みの子要素を含めて検索する場合は true を指定
     */
    getNextItemIndex(withActiveChildren?: boolean): number;
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
    addItem(height: number, initializer: new (options?: UnknownObject) => IListItemView, info: UnknownObject, layoutKey?: string): GroupProfile;
    /**
     * @en Add {@link GroupProfile} as child element.
     * @ja 子要素として {@link GroupProfile} を追加
     *
     * @param target {@link GroupProfile} instance / instance array
     */
    addChildren(target: GroupProfile | GroupProfile[]): this;
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
    hasChildren(layoutKey?: string): boolean;
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
    hasLayoutKeyOf(layoutKey: string): boolean;
    /**
     * @en Group expansion.
     * @ja グループ展開
     */
    expand(): Promise<void>;
    /**
     * @en Group collapse.
     * @ja グループ収束
     *
     * @param delay
     *  - `en` delay time spent removing elements. [default: `animationDuration` value]
     *  - `ja` 要素削除に費やす遅延時間. [default: `animationDuration` value]
     */
    collapse(delay?: number): Promise<void>;
    /**
     * @en Show self in visible area of list.
     * @ja 自身をリストの可視領域に表示
     *
     * @param options
     *  - `en` {@link ListEnsureVisibleOptions} option's object
     *  - `ja` {@link ListEnsureVisibleOptions} オプション
     */
    ensureVisible(options?: ListEnsureVisibleOptions): Promise<void>;
    /**
     * @en Toggle expand / collapse.
     * @ja 開閉のトグル
     *
     * @param delay
     *  - `en` delay time spent removing elements. [default: `animationDuration` value]
     *  - `ja` 要素削除に費やす遅延時間. [default: `animationDuration` value]
     */
    toggle(delay?: number): Promise<void>;
    /**
     * @en Register to list view. Only 1st layer group can be registered.
     * @ja リストビューへ登録. 第1階層グループのみ登録可能.
     *
     * @param insertTo
     *  - `en` specify insertion position with index
     *  - `ja` 挿入位置を index で指定
     */
    register(insertTo: number): this;
    /**
     * @en Restore to list view. Only 1st layer group can be specified.
     * @ja リストビューへ復元. 第1階層グループのみ指示可能.
     */
    restore(): this;
}
