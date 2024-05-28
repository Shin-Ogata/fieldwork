import { type UnknownObject, luid } from '@cdp/runtime';
import type {
    IExpandOperation,
    IListLayoutKeyHolder,
    IListStatusManager,
    IListBackupRestore,
    IExpandableListContext,
} from '../interfaces';
import { GroupProfile } from '../profile';

/**
 * @internal
 * @en Core logic implementation class that manages expanding / collapsing state.
 * @ja 開閉状態管理を行うコアロジック実装クラス
 */
export class ExpandCore implements
    IExpandOperation,
    IListLayoutKeyHolder,
    IListStatusManager,
    IListBackupRestore {

    private readonly _owner: IExpandableListContext;

    // TODO: owner との各データの所有権の見直し (backupData?)
    /** { id: GroupProfile } */
    private _mapGroups: Record<string, GroupProfile> = {};
    /** 第1階層 GroupProfile を格納 */
    private _aryTopGroups: GroupProfile[] = [];
    /** layoutKey を格納 */
    private _layoutKey?: string;

    /**
     * constructor
     * @param owner 親 View のインスタンス
     */
    constructor(owner: IExpandableListContext) {
        this._owner = owner;
    }

    /** データを破棄 */
    public release(): void {
        this._mapGroups = {};
        this._aryTopGroups = [];
    }

///////////////////////////////////////////////////////////////////////
// implements: IExpandOperation

    /** 新規 GroupProfile を作成 */
    newGroup(id?: string): GroupProfile {
        id = id ?? luid('list-group', 4);
        if (null != this._mapGroups[id]) {
            return this._mapGroups[id];
        }
        const group = new GroupProfile(this._owner, id);
        this._mapGroups[id] = group;
        return group;
    }

    /** 登録済み Group を取得 */
    getGroup(id: string): GroupProfile | undefined {
        return this._mapGroups[id];
    }

    /** 第1階層の Group 登録 */
    registerTopGroup(topGroup: GroupProfile): void {
        // すでに登録済みの場合は restore して layout キーごとに復元する。
        if ('registered' === topGroup.status) {
            // TODO: orientation changed 時の layout キー変更対応だが、キーに変更が無いときは不具合となる。
            // この API に実装が必要かも含めて見直しが必要
            topGroup.restore();
            return;
        }

        const lastGroup = this._aryTopGroups[this._aryTopGroups.length - 1];
        const insertTo = lastGroup?.getNextItemIndex(true) ?? 0;

        this._aryTopGroups.push(topGroup);
        topGroup.register(insertTo);
    }

    /** 第1階層の Group を取得 */
    getTopGroups(): GroupProfile[] {
        return this._aryTopGroups.slice(0);
    }

    /** すべてのグループを展開 (1階層) */
    async expandAll(): Promise<void> {
        const promisies: Promise<void>[] = [];
        for (const group of this._aryTopGroups) {
            promisies.push(group.expand());
        }
        await Promise.all(promisies);
    }

    /** すべてのグループを収束 (1階層) */
    async collapseAll(delay?: number): Promise<void> {
        const promisies: Promise<void>[] = [];
        for (const group of this._aryTopGroups) {
            promisies.push(group.collapse(delay));
        }
        await Promise.all(promisies);
    }

    /** 展開中か判定 */
    get isExpanding(): boolean {
        return this._owner.isStatusIn('expanding');
    }

    /** 収束中か判定 */
    get isCollapsing(): boolean {
        return this._owner.isStatusIn('collapsing');
    }

    /** 開閉中か判定 */
    get isSwitching(): boolean {
        return this.isExpanding || this.isCollapsing;
    }

///////////////////////////////////////////////////////////////////////
// implements: IListLayoutKeyHolder

    /** layout key を取得 */
    get layoutKey(): string | undefined {
        return this._layoutKey;
    }

    /** layout key を設定 */
    set layoutKey(key: string) {
        this._layoutKey = key;
    }

///////////////////////////////////////////////////////////////////////
// implements: IListStatusManager

    /** 状態変数の参照カウントのインクリメント */
    statusAddRef(status: string): number {
        return this._owner.statusAddRef(status);
    }

    /** 状態変数の参照カウントのデクリメント */
    statusRelease(status: string): number {
        return this._owner.statusRelease(status);
    }

    /** 処理スコープ毎に状態変数を設定 */
    statusScope<T>(status: string, executor: () => T | Promise<T>): Promise<T> {
        return this._owner.statusScope(status, executor);
    }

    /** 指定した状態中であるか確認 */
    isStatusIn(status: string): boolean {
        return this._owner.isStatusIn(status);
    }

///////////////////////////////////////////////////////////////////////
// implements: IListBackupRestore

    /** 内部データをバックアップ */
    backup(key: string): boolean {
        const _backup = this.backupData;
        if (null == _backup[key]) {
            _backup[key] = {
                map: this._mapGroups,
                tops: this._aryTopGroups,
            };
        }
        return true;
    }

    /** 内部データをリストア */
    restore(key: string, rebuild = true): boolean {
        const backup = this.backupData[key] as UnknownObject;
        if (null == backup) {
            return false;
        }

        if (0 < this._aryTopGroups.length) {
            this.release();
        }

        this._mapGroups = backup.map as Record<string, GroupProfile>;
        this._aryTopGroups = backup.tops as GroupProfile[];

        // layout 情報の確認
        if (!this._aryTopGroups[0]?.hasLayoutKeyOf(this.layoutKey!)) {
            return false;
        }

        // 展開しているものを登録
        for (const group of this._aryTopGroups) {
            group.restore();
        }

        // 再構築の予約
        rebuild && this._owner.rebuild();
        return true;
    }

    /** バックアップデータの有無 */
    hasBackup(key: string): boolean {
        return this._owner.hasBackup(key);
    }

    /** バックアップデータの破棄 */
    clearBackup(key?: string): boolean {
        return this._owner.clearBackup(key);
    }

    /** バックアップデータにアクセス */
    get backupData(): UnknownObject {
        return this._owner.backupData;
    }
}
