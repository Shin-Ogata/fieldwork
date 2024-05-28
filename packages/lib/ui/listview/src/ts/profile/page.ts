import { at } from '@cdp/runtime';
import type { ItemProfile } from './item';

/**
 * @en A class that stores UI structure information for one page of the list.
 * @ja リスト1ページ分の UI 構造情報を格納するクラス
 */
export class PageProfile {
    /** @internal page index */
    private _index = 0;
    /** @internal page offset from top */
    private _offset = 0;
    /** @internal page's height */
    private _height = 0;
    /** @internal item's profile managed with in page */
    private _items: ItemProfile[] = [];
    /** @internal page status */
    private _status: 'active' | 'inactive' | 'hidden' = 'inactive';

///////////////////////////////////////////////////////////////////////
// accessors:

    /** Get the page index */
    get index(): number {
        return this._index;
    }

    /** Set the page index */
    set index(index: number) {
        this._index = index;
    }

    /** Get the page offset */
    get offset(): number {
        return this._offset;
    }

    /** Set the page offset */
    set offset(offset: number) {
        this._offset = offset;
    }

    /** Get the page height */
    get height(): number {
        return this._height;
    }

    /** Get the page status */
    get status(): 'active' | 'inactive' | 'hidden' {
        return this._status;
    }

///////////////////////////////////////////////////////////////////////
// public methods:

    /**
     * @en Activate of the page.
     * @ja page の活性化
     */
    public activate(): void {
        if ('active' !== this._status) {
            for (const item of this._items) {
                item.activate();
            }
        }
        this._status = 'active';
    }

    /**
     * @en Make the page invisible.
     * @ja page の不可視化
     */
    public hide(): void {
        if ('hidden' !== this._status) {
            for (const item of this._items) {
                item.hide();
            }
        }
        this._status = 'hidden';
    }

    /**
     * @en Deactivate of the page.
     * @ja page の非活性化
     */
    public deactivate(): void {
        if ('inactive' !== this._status) {
            for (const item of this._items) {
                item.deactivate();
            }
        }
        this._status = 'inactive';
    }

    /**
     * @en Add {@link ItemProfile} to the page.
     * @ja {@link ItemProfile} の追加
     */
    public push(item: ItemProfile): void {
        this._items.push(item);
        this._height += item.height;
    }

    /**
     * @en If all {@link ItemProfile} under the page are not valid, disable the page's status.
     * @ja 配下の {@link ItemProfile} すべてが有効でない場合, page ステータスを無効にする
     */
    public normalize(): void {
        const enableAll = this._items.every(item => item.isActive());
        if (!enableAll) {
            this._status = 'inactive';
        }
    }

    /**
     * @en Get {@link ItemProfile} by index.
     * @ja インデックスを指定して {@link ItemProfile} を取得
     */
    public getItem(index: number): ItemProfile {
        return at(this._items, index);
    }

    /**
     * @en Get first {@link ItemProfile}.
     * @ja 最初の {@link ItemProfile} を取得
     */
    public getItemFirst(): ItemProfile | undefined {
        return this._items[0];
    }

    /**
     * @en Get last {@link ItemProfile}.
     * @ja 最後の {@link ItemProfile} を取得
     */
    public getItemLast(): ItemProfile | undefined {
        return this._items[this._items.length - 1];
    }
}
