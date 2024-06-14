import type { Writable, UnknownObject } from '@cdp/runtime';
import type { IExpandableListView, IExpandOperation } from './interfaces';
import { ExpandCore } from './core';
import type { GroupProfile } from './profile';
import { type ListViewConstructOptions, ListView } from './list-view';

/** @internal */ const _properties = Symbol('properties');

/** @internal */
interface Property {
    readonly context: ExpandCore;
}

//__________________________________________________________________________________________________//

/**
 * @en Virtual list view class with expanding / collapsing functionality.
 * @ja 開閉機能を備えた仮想リストビュークラス
 */
export abstract class ExpandableListView<TElement extends Node = HTMLElement, TEvent extends object = object>
    extends ListView<TElement, TEvent> implements IExpandableListView {

    /** @internal */
    private readonly [_properties]!: Property;

    /** constructor */
    constructor(options?: ListViewConstructOptions<TElement>) {
        super(options);
        (this[_properties] as Writable<Property>) = {
            context: new ExpandCore(this),
        } as Property;
    }

    /** context accessor */
    get expandContext(): IExpandOperation {
        return this[_properties].context;
    }

///////////////////////////////////////////////////////////////////////
// implements: IExpandableListView

    /**
     * @en Create a new {@link GroupProfile}. Return the object if it is already registered.
     * @ja 新規 {@link GroupProfile} を作成. 登録済みの場合はそのオブジェクトを返却
     *
     * @param id
     *  - `en` specify the newly created group id. if not specified, automatic allocation will be performed.
     *  - `ja` 新規に作成する Group ID を指定. 指定しない場合は自動割り振り
     */
    newGroup(id?: string): GroupProfile {
        return this[_properties].context.newGroup(id);
    }

    /**
     * @en Get registered {@link GroupProfile}.
     * @ja 登録済み {@link GroupProfile} を取得
     *
     * @param id
     *  - `en` specify the Group ID to retrieve
     *  - `ja` 取得する Group ID を指定
     */
    getGroup(id: string): GroupProfile | undefined {
        return this[_properties].context.getGroup(id);
    }

    /**
     * @en 1st layer {@link GroupProfile} registration.
     * @ja 第1階層の {@link GroupProfile} 登録
     *
     * @param topGroup
     *  - `en` constructed {@link GroupProfile} instance
     *  - `ja` 構築済み {@link GroupProfile} インスタンス
     */
    registerTopGroup(topGroup: GroupProfile): void {
        this[_properties].context.registerTopGroup(topGroup);
    }

    /**
     * @en Get 1st layer {@link GroupProfile}. <br>
     *     A copy array is returned, so the client cannot cache it.
     * @ja 第1階層の {@link GroupProfile} を取得 <br>
     *     コピー配列が返されるため、クライアントはキャッシュ不可
     */
    getTopGroups(): GroupProfile[] {
        return this[_properties].context.getTopGroups();
    }

    /**
     * @en Expand all groups (1st layer)
     * @ja すべてのグループを展開 (1階層)
     */
    expandAll(): Promise<void> {
        return this[_properties].context.expandAll();
    }

    /**
     * @en Collapse all groups (1st layer)
     * @ja すべてのグループを収束 (1階層)
     */
    collapseAll(delay?: number): Promise<void> {
        return this[_properties].context.collapseAll(delay);
    }

    /**
     * @en Determine whether the list is during expanding.
     * @ja 展開中か判定
     */
    get isExpanding(): boolean {
        return this[_properties].context.isExpanding;
    }

    /**
     * @en Determine whether the list is during collapsing.
     * @ja 収束中か判定
     */
    get isCollapsing(): boolean {
        return this[_properties].context.isCollapsing;
    }

    /**
     * @en Determine whether the list is during expanding or collapsing.
     * @ja 開閉中か判定
     */
    get isSwitching(): boolean {
        return this[_properties].context.isSwitching;
    }

    /**
     * @en Increment reference count for status identifier.
     * @ja 状態変数の参照カウントのインクリメント
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @returns
     *  - `en` reference count value
     *  - `ja` 参照カウントの値
     */
    statusAddRef(status: string): number {
        return this[_properties].context.statusAddRef(status);
    }

    /**
     * @en Decrement reference count for status identifier.
     * @ja 状態変数の参照カウントのデクリメント
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @returns
     *  - `en` reference count value
     *  - `ja` 参照カウントの値
     */
    statusRelease(status: string): number {
        return this[_properties].context.statusRelease(status);
    }

    /**
     * @en State variable management scope
     * @ja 状態変数管理スコープ
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @param executor
     *  - `en` seed function.
     *  - `ja` 対象の関数
     * @returns
     *  - `en` retval of seed function.
     *  - `ja` 対象の関数の戻り値
     */
    statusScope<T>(status: string, executor: () => T | Promise<T>): Promise<T> {
        return this[_properties].context.statusScope(status, executor);
    }

    /**
     * @en Check if it's in the specified state.
     * @ja 指定した状態中であるか確認
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @return {Boolean} true: 状態内 / false: 状態外
     * @returns
     *  - `en` `true`: within the status / `false`: out of the status
     *  - `ja` `true`: 状態内 / `false`: 状態外
     */
    isStatusIn(status: string): boolean {
        return this[_properties].context.isStatusIn(status);
    }

///////////////////////////////////////////////////////////////////////
// override: ListView

    /**
     * @override
     * @en Destroy internal data.
     * @ja 管轄データを破棄
     */
    override release(): this {
        super.release();
        this[_properties].context.release();
        return this;
    }

    /**
     * @override
     * @en Execute a backup of internal data.
     * @ja 内部データのバックアップを実行
     *
     * @param key
     *  - `en` specify backup key (any identifier)
     *  - `ja` バックアップキー(任意の識別子)を指定
     * @returns
     *  - `en` true: success / false: failure
     *  - `ja` true: 成功 / false: 失敗
     */
    override backup(key: string): boolean {
        return this[_properties].context.backup(key);
    }

    /**
     * @override
     * @en Execute a backup of internal data.
     * @ja 内部データのバックアップを実行
     *
     * @param key
     *  - `en` specify backup key (the one used for `backup()`)
     *  - `ja` バックアップキーを指定 (`backup()` に使用したもの)
     * @param rebuild
     *  - `en` specify true to rebuild the list structure
     *  - `ja` リスト構造を再構築する場合は true を指定
     * @returns
     *  - `en` true: success / false: failure
     *  - `ja` true: 成功 / false: 失敗
     */
    override restore(key: string, rebuild = true): boolean {
        return this[_properties].context.restore(key, rebuild);
    }

    /**
     * @en Check whether backup data exists.
     * @ja バックアップデータの有無を確認
     *
     * @param key
     *  - `en` specify backup key (the one used for `backup()`)
     *  - `ja` バックアップキーを指定 (`backup()` に使用したもの)
     * @returns
     *  - `en` true: exists / false: not exists
     *  - `ja` true: 有 / false: 無
     */
    override hasBackup(key: string): boolean {
        return this[_properties].context.hasBackup(key);
    }

    /**
     * @en Discard backup data.
     * @ja バックアップデータの破棄
     *
     * @param key
     *  - `en` specify backup key (the one used for `backup()`)
     *  - `ja` バックアップキーを指定 (`backup()` に使用したもの)
     * @returns
     *  - `en` true: discard existing data / false: specified data does not exist
     *  - `ja` true: 存在したデータを破棄 / false: 指定されたデータは存在しない
     */
    override clearBackup(key?: string): boolean {
        return this[_properties].context.clearBackup(key);
    }

    /**
     * @en Access backup data.
     * @ja バックアップデータにアクセス
     *
     * @param key
     *  - `en` specify backup key (the one used for `backup()`)
     *  - `ja` バックアップキーを指定 (`backup()` に使用したもの)
     */
    override getBackupData(key: string): UnknownObject | undefined {
        return this[_properties].context.getBackupData(key);
    }


    /**
     * @en Backup data can be set externally.
     * @ja バックアップデータを外部より設定
     *
     * @param key
     *  - `en` specify backup key
     *  - `ja` バックアップキーを指定
     * @returns
     *  - `en` true: succeeded / false: schema invalid
     *  - `ja` true: 成功 / false: スキーマが不正
     */
    override setBackupData(key: string, data: UnknownObject): boolean {
        return this[_properties].context.setBackupData(key, data as { map: Record<string, GroupProfile>; tops: GroupProfile[]; });
    }
}
