import type { GroupProfile } from '../profile/group';
/**
 * @en Expanding / collapsing management interface.
 * @ja 開閉管理インターフェイス
 */
export interface IExpandOperation {
    /**
     * @en Create a new {@link GroupProfile}. Return the object if it is already registered.
     * @ja 新規 {@link GroupProfile} を作成. 登録済みの場合はそのオブジェクトを返却
     *
     * @param id
     *  - `en` specify the newly created group id. if not specified, automatic allocation will be performed.
     *  - `ja` 新規に作成する Group ID を指定. 指定しない場合は自動割り振り
     */
    newGroup(id?: string): GroupProfile;
    /**
     * @en Get registered {@link GroupProfile}.
     * @ja 登録済み {@link GroupProfile} を取得
     *
     * @param id
     *  - `en` specify the Group ID to retrieve
     *  - `ja` 取得する Group ID を指定
     */
    getGroup(id: string): GroupProfile | undefined;
    /**
     * @en 1st layer {@link GroupProfile} registration.
     * @ja 第1階層の {@link GroupProfile} 登録
     *
     * @param topGroup
     *  - `en` constructed {@link GroupProfile} instance
     *  - `ja` 構築済み {@link GroupProfile} インスタンス
     */
    registerTopGroup(topGroup: GroupProfile): void;
    /**
     * @en Get 1st layer {@link GroupProfile}. <br>
     *     A copy array is returned, so the client cannot cache it.
     * @ja 第1階層の {@link GroupProfile} を取得 <br>
     *     コピー配列が返されるため、クライアントはキャッシュ不可
     */
    getTopGroups(): GroupProfile[];
    /**
     * @en Expand all groups (1st layer)
     * @ja すべてのグループを展開 (1階層)
     */
    expandAll(): Promise<void>;
    /**
     * @en Collapse all groups (1st layer)
     * @ja すべてのグループを収束 (1階層)
     */
    collapseAll(delay?: number): Promise<void>;
    /**
     * @en Determine whether the list is during expanding.
     * @ja 展開中か判定
     */
    isExpanding: boolean;
    /**
     * @en Determine whether the list is during collapsing.
     * @ja 収束中か判定
     */
    isCollapsing: boolean;
    /**
     * @en Determine whether the list is during expanding or collapsing.
     * @ja 開閉中か判定
     */
    isSwitching: boolean;
}
