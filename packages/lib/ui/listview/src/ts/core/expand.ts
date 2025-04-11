import {
    luid,
    statusAddRef,
    statusRelease,
    statusScope,
    isStatusIn,
} from '@cdp/runtime';
import type {
    IExpandOperation,
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
    IListStatusManager,
    IListBackupRestore {

    private readonly _owner: IExpandableListContext;

    /** { id: GroupProfile } */
    private _mapGroups: Record<string, GroupProfile> = {};
    /** 第1階層 GroupProfile を格納 */
    private _aryTopGroups: GroupProfile[] = [];

    /** データの backup 領域. key と { map, tops } を格納 */
    private readonly _backup: Record<string, { map: Record<string, GroupProfile>; tops: GroupProfile[]; }> = {};

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
        return this.isStatusIn('expanding');
    }

    /** 収束中か判定 */
    get isCollapsing(): boolean {
        return this.isStatusIn('collapsing');
    }

    /** 開閉中か判定 */
    get isSwitching(): boolean {
        return this.isExpanding || this.isCollapsing;
    }

///////////////////////////////////////////////////////////////////////
// implements: IListStatusManager

    /** 状態変数の参照カウントのインクリメント */
    statusAddRef(status: string): number {
        return statusAddRef(status);
    }

    /** 状態変数の参照カウントのデクリメント */
    statusRelease(status: string): number {
        return statusRelease(status);
    }

    /** 処理スコープ毎に状態変数を設定 */
    statusScope<T>(status: string, executor: () => T | Promise<T>): Promise<T> {
        return statusScope(status, executor);
    }

    /** 指定した状態中であるか確認 */
    isStatusIn(status: string): boolean {
        return isStatusIn(status);
    }

///////////////////////////////////////////////////////////////////////
// implements: IListBackupRestore

    /** 内部データをバックアップ */
    backup(key: string): boolean {
        const { _backup } = this;
        _backup[key] ??= {
            map: this._mapGroups,
            tops: this._aryTopGroups,
        };
        return true;
    }

    /** 内部データをリストア */
    restore(key: string, rebuild: boolean): boolean {
        const backup = this.getBackupData(key);
        if (null == backup) {
            return false;
        }

        if (0 < this._aryTopGroups.length) {
            this.release();
        }

        Object.assign(this._mapGroups, backup.map);
        this._aryTopGroups = backup.tops.slice();

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
        return null != this._backup[key];
    }

    /** バックアップデータの破棄 */
    clearBackup(key?: string): boolean {
        if (null == key) {
            for (const key of Object.keys(this._backup)) {
                delete this._backup[key];
            }
            return true;
        } else if (null != this._backup[key]) {
            delete this._backup[key];
            return true;
        } else {
            return false;
        }
    }

    /** バックアップデータにアクセス */
    getBackupData(key: string): { map: Record<string, GroupProfile>; tops: GroupProfile[]; } {
        return this._backup[key];
    }

    /** バックアップデータを外部より設定 */
    setBackupData(key: string, data: { map: Record<string, GroupProfile>; tops: GroupProfile[]; }): boolean {
        if (data.map && Array.isArray(data.tops)) {
            this._backup[key] = data;
            return true;
        }
        return false;
    }
}
