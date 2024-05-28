import {
    UnknownObject,
    DOM,
    dom as $,
} from '@cdp/runtime';
import { getTransformMatrixValues } from '@cdp/ui-utils';
import type { IListContext } from '../interfaces/base';
import type { IListItemView, ListItemUpdateHeightOptions } from '../interfaces/list-item-view';
import { ListViewGlobalConfig } from '../global-config';

/**
 * @en A class that stores UI structure information for list items.
 * @ja リストアイテムの UI 構造情報を格納するクラス
 */
export class ItemProfile {
    /** @internal */
    private readonly _owner: IListContext;
    /** @internal */
    private _height: number;
    /** @internal */
    private readonly _initializer: new (options?: UnknownObject) => IListItemView;
    /** @internal */
    private readonly _info: UnknownObject;
    /** @internal global index */
    private _index = 0;
    /** @internal belonging page index */
    private _pageIndex = 0;
    /** @internal global offset */
    private _offset = 0;
    /** @internal base dom instance */
    private _$base?: DOM;
    /** @internal IListItemView instance */
    private _instance?: IListItemView;

    /**
     * constructor
     *
     * @param owner
     *  - `en` {@link IListViewContext} instance
     *  - `ja` {@link IListViewContext} インスタンス
     * @param height
     *  - `en` initial item's height
     *  - `ja` item の初期の高さ
     * @param initializer
     *  - `en` constructor for {@link IListItemView}'s subclass
     *  - `ja` {@link IListItemView} のサブクラスのコンストラクタ
     * @param info
     *  - `en` init parameters for {@link IListItemView}'s subclass
     *  - `ja` {@link IListItemView} のサブクラスの初期化パラメータ
     */
    constructor(owner: IListContext, height: number, initializer: new (options?: UnknownObject) => IListItemView, _info: UnknownObject) {
        this._owner       = owner;
        this._height      = height;
        this._initializer = initializer;
        this._info        = _info;
    }

///////////////////////////////////////////////////////////////////////
// accessors:

    /** Get the item's height. */
    get height(): number {
        return this._height;
    }

    /** Get the item's global index. */
    get index(): number {
        return this._index;
    }

    /** Set the item's global index. */
    set index(index: number) {
        this._index = index;
        this.updateIndex();
    }

    /** Get belonging the page index. */
    get pageIndex(): number {
        return this._pageIndex;
    }

    /** Set belonging the page index. */
    set pageIndex(index: number) {
        this._pageIndex = index;
        this.updatePageIndex();
    }

    /** Get global offset. */
    get offset(): number {
        return this._offset;
    }

    /** Set global offset. */
    set offset(offset: number) {
        this._offset = offset;
        this.updateOffset();
    }

    /** Get init parameters. */
    get info(): UnknownObject {
        return this._info;
    }

///////////////////////////////////////////////////////////////////////
// public methods:

    /**
     * @en Activate of the item.
     * @ja item の活性化
     */
    public activate(): void {
        if (null == this._instance) {
            this._$base = this.prepareBaseElement();
            const options = Object.assign({
                el: this._$base,
                owner: this._owner,
                lineProfile: this,
            }, this._info);
            this._instance = new this._initializer(options);
            if ('none' === this._$base.css('display')) {
                this._$base.css('display', 'block');
            }
        }
        this.updatePageIndex();
        if (this._$base && 'visible' !== this._$base.css('visibility')) {
            this._$base.css('visibility', 'visible');
        }
    }

    /**
     * @en Make the item invisible.
     * @ja item の不可視化
     */
    public hide(): void {
        if (null == this._instance) {
            this.activate();
        }
        if (this._$base && 'hidden' !== this._$base.css('visibility')) {
            this._$base.css('visibility', 'hidden');
        }
    }

    /**
     * @en Deactivate of the item.
     * @ja item の非活性化
     */
    public deactivate(): void {
        if (null != this._instance) {
            this._instance.remove();
            this._instance = undefined;
            this._$base?.addClass(this._config.RECYCLE_CLASS);
            this._$base?.css('display', 'none');
            this._$base = undefined;
        }
    }

    /**
     * @en Refresh the item.
     * @ja item の更新
     */
    public refresh(): void {
        if (null != this._instance) {
            this._instance.render();
        }
    }

    /**
     * @en Check the activation status of the item.
     * @ja item の活性状態判定
     */
    public isActive(): boolean {
        return null != this._instance;
    }

    /**
     * @en Update height information of the item. Called from {@link ListItemView}.
     * @ja item の高さ情報の更新. {@link ListItemView} からコールされる。
     */
    public updateHeight(newHeight: number, options?: ListItemUpdateHeightOptions): void {
        const delta = newHeight - this._height;
        this._height = newHeight;
        this._owner.updateScrollMapHeight(delta);
        if (options?.reflectAll) {
            this._owner.updateProfiles(this._index);
        }
    }

    /**
     * @en Reset z-index. Called from {@link ScrollManager}`.removeItem()`.
     * @ja z-index のリセット. {@link ScrollManager}`.removeItem()` からコールされる。
     */
    public resetDepth(): void {
        if (null != this._instance) {
            this._$base?.css('z-index', this._owner.options.baseDepth);
        }
    }

///////////////////////////////////////////////////////////////////////
// internal:

    /** @internal */
    private get _config(): ListViewGlobalConfig {
        return ListViewGlobalConfig();
    }

    /** @internal */
    private prepareBaseElement(): DOM {
        let $base: DOM;
        const $recycle = this._owner.findRecycleElements().first();
        const itemTagName = this._owner.options.itemTagName;

        if (null != this._$base) {
            console.warn('this._$base is not null.');
            return this._$base;
        }

        if (0 < $recycle.length) {
            $base = $recycle;
            $base.removeAttr('z-index');
            $base.removeClass(this._config.RECYCLE_CLASS);
        } else {
            // TODO:  要件等. <li> 全般は <slot> と同強調するか?
            $base = $(`<${itemTagName} class="${this._config.LISTITEM_BASE_CLASS}"></"${itemTagName}">`);
            $base.css('display', 'none');
            this._owner.$scrollMap.append($base);
        }

        // 高さの更新
        if ($base.height() !== this._height) {
            $base.height(this._height);
        }

        // index の設定
        this.updateIndex();
        // offset の更新
        this.updateOffset();

        return $base;
    }

    /** @internal */
    private updateIndex(): void {
        if (this._$base && this._$base.attr(this._config.DATA_CONTAINER_INDEX) !== String(this._index)) {
            this._$base.attr(this._config.DATA_CONTAINER_INDEX, this._index);
        }
    }

    /** @internal */
    private updatePageIndex(): void {
        if (this._$base && this._$base.attr(this._config.DATA_PAGE_INDEX) !== String(this._pageIndex)) {
            this._$base.attr(this._config.DATA_PAGE_INDEX, this._pageIndex);
        }
    }

    /** @internal */
    private updateOffset(): void {
        if (!this._$base) {
            return;
        }

        if (this._owner.options.enableTransformOffset) {
            const { translateY } = getTransformMatrixValues(this._$base[0]);
            if (translateY !== this._offset) {
                this._$base.css('transform', `translate3d(0,${this._offset}px,0`);
            }
        } else {
            const top = parseInt(this._$base.css('top'), 10);
            if (top !== this._offset) {
                this._$base.css('top', `${this._offset}px`);
            }
        }
    }
}
