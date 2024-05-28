import type { ItemProfile } from './item';
/**
 * @en A class that stores UI structure information for one page of the list.
 * @ja リスト1ページ分の UI 構造情報を格納するクラス
 */
export declare class PageProfile {
    /** Get the page index */
    get index(): number;
    /** Set the page index */
    set index(index: number);
    /** Get the page offset */
    get offset(): number;
    /** Set the page offset */
    set offset(offset: number);
    /** Get the page height */
    get height(): number;
    /** Get the page status */
    get status(): 'active' | 'inactive' | 'hidden';
    /**
     * @en Activate of the page.
     * @ja page の活性化
     */
    activate(): void;
    /**
     * @en Make the page invisible.
     * @ja page の不可視化
     */
    hide(): void;
    /**
     * @en Deactivate of the page.
     * @ja page の非活性化
     */
    deactivate(): void;
    /**
     * @en Add {@link ItemProfile} to the page.
     * @ja {@link ItemProfile} の追加
     */
    push(item: ItemProfile): void;
    /**
     * @en If all {@link ItemProfile} under the page are not valid, disable the page's status.
     * @ja 配下の {@link ItemProfile} すべてが有効でない場合, page ステータスを無効にする
     */
    normalize(): void;
    /**
     * @en Get {@link ItemProfile} by index.
     * @ja インデックスを指定して {@link ItemProfile} を取得
     */
    getItem(index: number): ItemProfile;
    /**
     * @en Get first {@link ItemProfile}.
     * @ja 最初の {@link ItemProfile} を取得
     */
    getItemFirst(): ItemProfile | undefined;
    /**
     * @en Get last {@link ItemProfile}.
     * @ja 最後の {@link ItemProfile} を取得
     */
    getItemLast(): ItemProfile | undefined;
}
