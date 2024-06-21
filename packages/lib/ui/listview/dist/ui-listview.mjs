/*!
 * @cdp/ui-listview 0.9.18
 *   web domain utilities
 */

import { dom, at, makeResult, RESULT_CODE, toHelpString, View, setTimeout as setTimeout$1, clearTimeout, post, noop, luid, statusAddRef, statusRelease, statusScope, isStatusIn } from '@cdp/runtime';
import { getTransformMatrixValues, clearTransition, setTransformTransition } from '@cdp/ui-utils';

/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["UI_LISTVIEW_DECLARE"] = 9007199254740991] = "UI_LISTVIEW_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_UI_LISTVIEW_INVALID_INITIALIZATION"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 140 /* LOCAL_CODE_BASE.UI_LISTVIEW */ + 1, 'listview has invalid initialization.')] = "ERROR_UI_LISTVIEW_INVALID_INITIALIZATION";
        RESULT_CODE[RESULT_CODE["ERROR_UI_LISTVIEW_INVALID_PARAM"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 140 /* LOCAL_CODE_BASE.UI_LISTVIEW */ + 2, 'listview given a invalid param.')] = "ERROR_UI_LISTVIEW_INVALID_PARAM";
        RESULT_CODE[RESULT_CODE["ERROR_UI_LISTVIEW_INVALID_OPERATION"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 140 /* LOCAL_CODE_BASE.UI_LISTVIEW */ + 3, 'listview invalid operation.')] = "ERROR_UI_LISTVIEW_INVALID_OPERATION";
    })();
})();

const _config = {
    NAMESPACE: "cdp-ui" /* DefaultV.NAMESPACE */,
    SCROLL_MAP_CLASS: "cdp-ui-listview-scroll-map" /* DefaultV.SCROLL_MAP_CLASS */,
    INACTIVE_CLASS: "cdp-ui-inactive" /* DefaultV.INACTIVE_CLASS */,
    RECYCLE_CLASS: "cdp-ui-listview-recycle" /* DefaultV.RECYCLE_CLASS */,
    LISTITEM_BASE_CLASS: "cdp-ui-listview-item-base" /* DefaultV.LISTITEM_BASE_CLASS */,
    DATA_PAGE_INDEX: "data-page-index" /* DefaultV.DATA_PAGE_INDEX */,
    DATA_ITEM_INDEX: "data-item-index" /* DefaultV.DATA_ITEM_INDEX */,
};
const ensureNewConfig = (newConfig) => {
    const { NAMESPACE: ns, SCROLL_MAP_CLASS: scrollmap, INACTIVE_CLASS: inactive, RECYCLE_CLASS: recycle, LISTITEM_BASE_CLASS: itembase, DATA_PAGE_INDEX: datapage, DATA_ITEM_INDEX: dataitem, } = newConfig;
    const NAMESPACE = ns;
    const SCROLL_MAP_CLASS = scrollmap ?? (ns ? `${ns}-listview-scroll-map` : undefined);
    const INACTIVE_CLASS = inactive ?? (ns ? `${ns}-inactive` : undefined);
    const RECYCLE_CLASS = recycle ?? (ns ? `${ns}-listview-recycle` : undefined);
    const LISTITEM_BASE_CLASS = itembase ?? (ns ? `${ns}-listview-item-base` : undefined);
    return Object.assign(newConfig, {
        NAMESPACE,
        SCROLL_MAP_CLASS,
        INACTIVE_CLASS,
        RECYCLE_CLASS,
        LISTITEM_BASE_CLASS,
        DATA_PAGE_INDEX: datapage,
        DATA_ITEM_INDEX: dataitem,
    });
};
/**
 * @en Get/Update global configuration of list view.
 * @ja リストビューのグローバルコンフィグレーションの取得/更新
 */
const ListViewGlobalConfig = (newConfig) => {
    if (newConfig) {
        ensureNewConfig(newConfig);
        for (const key of Object.keys(newConfig)) {
            if (undefined === newConfig[key]) {
                delete newConfig[key];
            }
        }
    }
    return Object.assign({}, Object.assign(_config, newConfig));
};

/**
 * @en A class that stores UI structure information for list items.
 * @ja リストアイテムの UI 構造情報を格納するクラス
 */
class ItemProfile {
    /** @internal */
    _owner;
    /** @internal */
    _height;
    /** @internal */
    _initializer;
    /** @internal */
    _info;
    /** @internal global index */
    _index;
    /** @internal belonging page index */
    _pageIndex;
    /** @internal global offset */
    _offset = 0;
    /** @internal base dom instance */
    _$base;
    /** @internal IListItemView instance */
    _instance;
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
    constructor(owner, height, initializer, _info) {
        this._owner = owner;
        this._height = height;
        this._initializer = initializer;
        this._info = _info;
    }
    ///////////////////////////////////////////////////////////////////////
    // accessors:
    /** Get the item's height. */
    get height() {
        return this._height;
    }
    /** Get the item's global index. */
    get index() {
        return this._index;
    }
    /** Set the item's global index. */
    set index(index) {
        this._index = index;
        this.updateIndex();
    }
    /** Get belonging the page index. */
    get pageIndex() {
        return this._pageIndex;
    }
    /** Set belonging the page index. */
    set pageIndex(index) {
        this._pageIndex = index;
        this.updatePageIndex();
    }
    /** Get global offset. */
    get offset() {
        return this._offset;
    }
    /** Set global offset. */
    set offset(offset) {
        this._offset = offset;
        this.updateOffset();
    }
    /** Get init parameters. */
    get info() {
        return this._info;
    }
    ///////////////////////////////////////////////////////////////////////
    // public methods:
    /**
     * @en Activate of the item.
     * @ja item の活性化
     */
    activate() {
        if (null == this._instance) {
            this._$base = this.prepareBaseElement();
            this.updateIndex();
            this.updateOffset();
            const options = Object.assign({
                el: this._$base,
                owner: this._owner,
                item: this,
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
    hide() {
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
    deactivate() {
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
    refresh() {
        if (null != this._instance) {
            this._instance.render();
        }
    }
    /**
     * @en Check the activation status of the item.
     * @ja item の活性状態判定
     */
    isActive() {
        return null != this._instance;
    }
    /**
     * @en Update height information of the item. Called from {@link ListItemView}.
     * @ja item の高さ情報の更新. {@link ListItemView} からコールされる。
     */
    updateHeight(newHeight, options) {
        const delta = newHeight - this._height;
        this._height = newHeight;
        this._owner.updateScrollMapHeight(delta);
        if (options?.reflectAll) {
            this._owner.updateProfiles(this._index ?? 0);
        }
    }
    /**
     * @en Reset z-index. Called from {@link ScrollManager}`.removeItem()`.
     * @ja z-index のリセット. {@link ScrollManager}`.removeItem()` からコールされる。
     */
    resetDepth() {
        if (null != this._instance) {
            this._$base?.css('z-index', this._owner.options.baseDepth);
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // internal:
    /** @internal */
    get _config() {
        return ListViewGlobalConfig();
    }
    /** @internal */
    prepareBaseElement() {
        let $base;
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
        }
        else {
            // TODO:  要検討. <li> 全般は <slot> とどのように協調するか?
            $base = dom(`<${itemTagName} class="${this._config.LISTITEM_BASE_CLASS}"></"${itemTagName}">`);
            $base.css('display', 'none');
            this._owner.$scrollMap.append($base);
        }
        // 高さの更新
        if ($base.height() !== this._height) {
            $base.height(this._height);
        }
        return $base;
    }
    /** @internal */
    updateIndex() {
        if (this._$base && this._$base.attr(this._config.DATA_ITEM_INDEX) !== String(this._index)) {
            this._$base.attr(this._config.DATA_ITEM_INDEX, this._index);
        }
    }
    /** @internal */
    updatePageIndex() {
        if (this._$base && this._$base.attr(this._config.DATA_PAGE_INDEX) !== String(this._pageIndex)) {
            this._$base.attr(this._config.DATA_PAGE_INDEX, this._pageIndex);
        }
    }
    /** @internal */
    updateOffset() {
        if (!this._$base) {
            return;
        }
        if (this._owner.options.enableTransformOffset) {
            const { translateY } = getTransformMatrixValues(this._$base[0]);
            if (translateY !== this._offset) {
                this._$base.css('transform', `translate3d(0,${this._offset}px,0`);
            }
        }
        else {
            const top = parseInt(this._$base.css('top'), 10);
            if (top !== this._offset) {
                this._$base.css('top', `${this._offset}px`);
            }
        }
    }
}

/**
 * @en A class that stores UI structure information for one page of the list.
 * @ja リスト1ページ分の UI 構造情報を格納するクラス
 */
class PageProfile {
    /** @internal page index */
    _index = 0;
    /** @internal page offset from top */
    _offset = 0;
    /** @internal page's height */
    _height = 0;
    /** @internal item's profile managed with in page */
    _items = [];
    /** @internal page status */
    _status = 'inactive';
    ///////////////////////////////////////////////////////////////////////
    // accessors:
    /** Get the page index */
    get index() {
        return this._index;
    }
    /** Set the page index */
    set index(index) {
        this._index = index;
    }
    /** Get the page offset */
    get offset() {
        return this._offset;
    }
    /** Set the page offset */
    set offset(offset) {
        this._offset = offset;
    }
    /** Get the page height */
    get height() {
        return this._height;
    }
    /** Get the page status */
    get status() {
        return this._status;
    }
    ///////////////////////////////////////////////////////////////////////
    // public methods:
    /**
     * @en Activate of the page.
     * @ja page の活性化
     */
    activate() {
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
    hide() {
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
    deactivate() {
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
    push(item) {
        this._items.push(item);
        this._height += item.height;
    }
    /**
     * @en If all {@link ItemProfile} under the page are not valid, disable the page's status.
     * @ja 配下の {@link ItemProfile} すべてが有効でない場合, page ステータスを無効にする
     */
    normalize() {
        const enableAll = this._items.every(item => item.isActive());
        if (!enableAll) {
            this._status = 'inactive';
        }
    }
    /**
     * @en Get {@link ItemProfile} by index.
     * @ja インデックスを指定して {@link ItemProfile} を取得
     */
    getItem(index) {
        return at(this._items, index);
    }
    /**
     * @en Get first {@link ItemProfile}.
     * @ja 最初の {@link ItemProfile} を取得
     */
    getItemFirst() {
        return this._items[0];
    }
    /**
     * @en Get last {@link ItemProfile}.
     * @ja 最後の {@link ItemProfile} を取得
     */
    getItemLast() {
        return this._items[this._items.length - 1];
    }
}

/**
 * @en UI structure information storage class for group management of list items. <br>
 *     This class does not directly manipulate the DOM.
 * @ja リストアイテムをグループ管理する UI 構造情報格納クラス <br>
 *     本クラスは直接は DOM を操作しない
 */
class GroupProfile {
    /** @internal profile id */
    _id;
    /** @internal {@link ExpandableListView} instance*/
    _owner;
    /** @internal parent {@link GroupProfile} instance */
    _parent;
    /** @internal child {@link GroupProfile} array */
    _children = [];
    /** @internal expanded / collapsed status */
    _expanded = false;
    /** @internal registration status for _owner */
    _status = 'unregistered';
    /** @internal stored {@link ItemProfile} information */
    _items = [];
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
    constructor(owner, id) {
        this._id = id;
        this._owner = owner;
    }
    ///////////////////////////////////////////////////////////////////////
    // accessors:
    /**
     * @en Get ID.
     * @ja ID を取得
     */
    get id() {
        return this._id;
    }
    /**
     *
     * @en Get status. 'registered' | 'unregistered'
     * @ja ステータスを取得 'registered' | 'unregistered'
     */
    get status() {
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
    get isExpanded() {
        return this._expanded;
    }
    /**
     * @en Get parent {@link GroupProfile}.
     * @ja 親 {@link GroupProfile} を取得
     */
    get parent() {
        return this._parent;
    }
    /**
     * @en Get children {@link GroupProfile}.
     * @ja 子 {@link GroupProfile} を取得
     */
    get children() {
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
    getNextItemIndex(withActiveChildren = false) {
        let items = [];
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
     */
    addItem(height, initializer, info) {
        const options = Object.assign({ group: this }, info);
        const item = new ItemProfile(this._owner.context, Math.trunc(height), initializer, options);
        // _owner の管理下にあるときは速やかに追加
        if ('registered' === this._status) {
            this._owner._addItem(item, this.getNextItemIndex());
            this._owner.update();
        }
        this._items.push(item);
        return this;
    }
    /**
     * @en Add {@link GroupProfile} as child element.
     * @ja 子要素として {@link GroupProfile} を追加
     *
     * @param target {@link GroupProfile} instance / instance array
     */
    addChildren(target) {
        const children = Array.isArray(target) ? target : [target];
        for (const child of children) {
            child.setParent(this);
        }
        this._children.push(...children);
        return this;
    }
    /**
     * @en Determine if it has a child {@link GroupProfile}.
     * @ja 子 {@link GroupProfile} を持っているか判定
     *
     * @returns
     *  - `en` true: exists, false: unexists
     *  - `ja` true: 有, false: 無
     */
    get hasChildren() {
        return !!this._children.length;
    }
    /**
     * @en Group expansion.
     * @ja グループ展開
     */
    async expand() {
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
    async collapse(delay) {
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
                    items[0].index && this._owner.removeItem(items[0].index, items.length, delay);
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
    async ensureVisible(options) {
        if (0 < this._items.length) {
            (null != this._items[0].index) && await this._owner.ensureVisible(this._items[0].index, options);
        }
        else {
            options?.callback?.(this._owner.scrollPos);
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
    async toggle(delay) {
        if (this._expanded) {
            await this.collapse(delay);
        }
        else {
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
    register(insertTo) {
        if (this._parent) {
            throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} 'GroupProfile#register' method is acceptable only 1st layer group.`);
        }
        this._owner._addItem(this.preprocess('registered'), insertTo);
        return this;
    }
    /**
     * @en Restore to list view. Only 1st layer group can be specified.
     * @ja リストビューへ復元. 第1階層グループのみ指示可能.
     */
    restore() {
        if (this._parent) {
            throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} 'GroupProfile#restore' method is acceptable only 1st layer group.`);
        }
        if (this._items) {
            const items = this._expanded ? this._items.concat(this.queryOperationTarget('active')) : this._items.slice();
            this._owner._addItem(items);
        }
        return this;
    }
    ///////////////////////////////////////////////////////////////////////
    // internal:
    /** @internal 親 Group 指定 */
    setParent(parent) {
        this._parent = parent;
    }
    /** @internal  register / unregister の前処理 */
    preprocess(newStatus) {
        const items = [];
        if (newStatus !== this._status) {
            items.push(...this._items);
        }
        this._status = newStatus;
        return items;
    }
    /** @internal 操作対象の ItemProfile 配列を取得 */
    queryOperationTarget(operation) {
        const findTargets = (group) => {
            const items = [];
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

/** @internal */ const _properties$3 = Symbol('properties');
/**
 * @en List item container class handled by {@link ListView}.
 * @ja {@link ListView} が扱うリストアイテムコンテナクラス
 */
class ListItemView extends View {
    /** @internal */
    [_properties$3];
    /** constructor */
    constructor(options) {
        super(options);
        const { owner, item } = options;
        this[_properties$3] = {
            owner,
            item,
        };
    }
    ///////////////////////////////////////////////////////////////////////
    // public methods:
    /** Owner 取得 */
    get owner() {
        return this[_properties$3].owner;
    }
    ///////////////////////////////////////////////////////////////////////
    // View component methods:
    /**
     * @override
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    remove() {
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
     * @en Get own item index
     * @ja 自身の item インデックスを取得
     */
    get index() {
        return this[_properties$3].item.index;
    }
    /**
     * @en Get specified height.
     * @ja 指定された高さを取得
     */
    get height() {
        return this[_properties$3].item.height;
    }
    /**
     * @en Check if child node exists.
     * @ja child node が存在するか判定
     */
    get hasChildNode() {
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
    updateHeight(newHeight, options) {
        if (this.$el && this.height !== newHeight) {
            this[_properties$3].item.updateHeight(newHeight, options);
            this.$el.height(newHeight);
        }
        return this;
    }
}

/**
 * @internal
 * @en {@link IListScroller} implementation class for HTMLElement.
 * @ja HTMLElement を対象とした {@link IListScroller} 実装クラス
 */
class ElementScroller {
    _$target;
    _$scrollMap;
    _options;
    _scrollStopTrigger;
    _scrollDuration;
    /** constructor */
    constructor(target, map, options) {
        this._$target = dom(target);
        this._$scrollMap = this._$target.children().first();
        this._options = options;
        /*
         * fire custom event: `scrollstop`
         * `scrollend` の Safari 対応待ち
         * https://developer.mozilla.org/ja/docs/Web/API/Element/scrollend_event
         */
        let timer;
        this._scrollStopTrigger = () => {
            if (null != timer) {
                clearTimeout(timer);
            }
            timer = setTimeout$1(() => {
                this._$target.trigger(new CustomEvent('scrollstop', { bubbles: true, cancelable: true }));
            }, this._scrollDuration ?? 50 /* Const.MIN_SCROLLSTOP_DURATION */);
        };
        this._$target.on('scroll', this._scrollStopTrigger);
    }
    ///////////////////////////////////////////////////////////////////////
    // static methods:
    /** タイプ定義識別子 */
    static get TYPE() {
        return 'cdp:element-overflow-scroller';
    }
    /** factory 取得 */
    static getFactory() {
        const factory = (target, map, options) => {
            return new ElementScroller(target, map, options);
        };
        // set type signature.
        Object.defineProperties(factory, {
            type: {
                configurable: false,
                writable: false,
                enumerable: true,
                value: ElementScroller.TYPE,
            },
        });
        return factory;
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListScroller
    /** Scroller の型情報を取得 */
    get type() {
        return ElementScroller.TYPE;
    }
    /** スクロール位置取得 */
    get pos() {
        return this._$target.scrollTop();
    }
    /** スクロール最大値位置を取得 */
    get posMax() {
        return Math.max(this._$scrollMap.height() - this._$target.height(), 0);
    }
    /** スクロールイベント登録 */
    on(type, callback) {
        this._$target.on(type, callback);
    }
    /** スクロールイベント登録解除 */
    off(type, callback) {
        this._$target.off(type, callback);
    }
    /** スクロール位置を指定 */
    scrollTo(pos, animate, time) {
        if (pos === this._$target.scrollTop()) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            this._scrollDuration = (animate ?? this._options.enableAnimation) ? time ?? this._options.animationDuration : undefined;
            this._$target.scrollTop(pos, this._scrollDuration, undefined, () => {
                this._scrollDuration = undefined;
                resolve();
            });
        });
    }
    /** Scroller の状態更新 */
    update() {
        // noop
    }
    /** Scroller の破棄 */
    destroy() {
        this._$target?.off();
        this._$target = this._$scrollMap = null;
    }
}

/** ListContextOptions 既定値 */
const _defaultOpts = {
    scrollerFactory: ElementScroller.getFactory(),
    enableHiddenPage: false,
    enableTransformOffset: false,
    scrollMapRefreshInterval: 200,
    scrollRefreshDistance: 200,
    pagePrepareCount: 3,
    pagePreloadCount: 1,
    enableAnimation: true,
    animationDuration: 0,
    baseDepth: 'auto',
    itemTagName: 'div',
    removeItemWithTransition: true,
    useDummyInactiveScrollMap: false,
};
/** invalid instance */
const _$invalid = dom();
/** 初期化済みか検証 */
function verify(x) {
    if (null == x) {
        throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_INITIALIZATION);
    }
}
/** overflow-y を保証 */
function ensureOverflowY($el) {
    const overflowY = $el.css('overflow-y');
    if ('hidden' === overflowY || 'visible' === overflowY) {
        $el.css('overflow-y', 'auto');
    }
    return $el;
}
/** scroll-map element を保証 */
function ensureScrollMap($root, mapClass) {
    let $map = $root.find(`.${mapClass}`);
    // $map が無い場合は作成する
    if ($map.length <= 0) {
        $map = dom(`<div class="${mapClass}"></div>`);
        $root.append($map);
    }
    return $map;
}
//__________________________________________________________________________________________________//
/**
 * @internal
 * @en Core logic implementation class for scroll processing that manages memory. Accesses the DOM.
 * @ja メモリ管理を行うスクロール処理のコアロジック実装クラス. DOM にアクセスする.
 */
class ListCore {
    _$root;
    _$map;
    _mapHeight = 0;
    _scroller;
    /** UI 表示中に true */
    _active = true;
    /** 初期オプションを格納 */
    _settings;
    /** Scroll Event Handler */
    _scrollEventHandler;
    /** Scroll Stop Event Handler */
    _scrollStopEventHandler;
    /** 1ページ分の高さの基準値 */
    _baseHeight = 0;
    /** 管理下にある ItemProfile 配列 */
    _items = [];
    /** 管理下にある PageProfile 配列 */
    _pages = [];
    /** 最新の表示領域情報を格納 (Scroll 中の更新処理に使用) */
    _lastActivePageContext = {
        index: 0,
        from: 0,
        to: 0,
        pos: 0, // scroll position
    };
    /** データの backup 領域. key と _items を格納 */
    _backup = {};
    /** constructor */
    constructor(options) {
        this._$root = this._$map = _$invalid;
        this._settings = Object.assign({}, _defaultOpts, options);
        this._scrollEventHandler = () => {
            this.onScroll(this._scroller.pos);
        };
        this._scrollStopEventHandler = () => {
            this.onScrollStop(this._scroller.pos);
        };
    }
    ///////////////////////////////////////////////////////////////////////
    // public methods:
    /** 内部オブジェクトの初期化 */
    initialize($root, height) {
        // 既に構築されていた場合は破棄
        if (this._$root.length) {
            this.destroy();
        }
        this._$root = ensureOverflowY($root);
        this._$map = ensureScrollMap(this._$root, this._config.SCROLL_MAP_CLASS);
        this._scroller = this.createScroller();
        this.setBaseHeight(height);
        this.setScrollerCondition();
    }
    /** 内部オブジェクトの破棄 */
    destroy() {
        this.resetScrollerCondition();
        this._scroller?.destroy();
        this._scroller = undefined;
        this.release();
        this._$root = this._$map = _$invalid;
    }
    /** ページの基準値を取得 */
    setBaseHeight(height) {
        if (height <= 0) {
            throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [base hight: ${height}]`);
        }
        this._baseHeight = height;
        this._scroller?.update();
    }
    /** active 状態設定 */
    async setActiveState(active) {
        this._active = active;
        await this.treatScrollPosition();
    }
    /** active 状態判定 */
    get active() {
        return this._active;
    }
    /** スクロール位置の保存/復元 */
    async treatScrollPosition() {
        verify(this._scroller);
        const offset = (this._scroller.pos - this._lastActivePageContext.pos);
        const { useDummyInactiveScrollMap: useDummyMap } = this._settings;
        const updateOffset = ($target) => {
            const { translateY } = getTransformMatrixValues($target[0]);
            if (offset !== translateY) {
                $target.css('transform', `translate3d(0,${offset}px,0`);
            }
        };
        if (this._active) {
            await this._scroller.scrollTo(this._lastActivePageContext.pos, false, 0);
            this._$map.css({ 'transform': '', 'display': 'block' });
            if (useDummyMap) {
                this.prepareInactiveMap().remove();
            }
        }
        else {
            const $map = useDummyMap ? this.prepareInactiveMap() : this._$map;
            updateOffset($map);
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListContext
    /** get scroll-map element */
    get $scrollMap() {
        return this._$map;
    }
    /** get scroll-map height [px] */
    get scrollMapHeight() {
        return this._$map.length ? this._mapHeight : 0;
    }
    /** get {@link ListContextOptions} */
    get options() {
        return this._settings;
    }
    /** update scroll-map height (delta [px]) */
    updateScrollMapHeight(delta) {
        if (this._$map.length) {
            this._mapHeight += Math.trunc(delta);
            // for fail safe.
            if (this._mapHeight < 0) {
                this._mapHeight = 0;
            }
            this._$map.height(this._mapHeight);
        }
    }
    /** update internal profile */
    updateProfiles(from) {
        const { _items } = this;
        for (let i = from, n = _items.length; i < n; i++) {
            if (0 < i) {
                const last = _items[i - 1];
                _items[i].index = last.index + 1;
                _items[i].offset = last.offset + last.height;
            }
            else {
                _items[i].index = 0;
                _items[i].offset = 0;
            }
        }
    }
    /** get recyclable element */
    findRecycleElements() {
        return this._$map.find(`.${this._config.RECYCLE_CLASS}`);
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListView
    /** 初期化済みか判定 */
    get isInitialized() {
        return !!this._scroller;
    }
    /** item 登録 */
    addItem(height, initializer, info, insertTo) {
        this._addItem(new ItemProfile(this, Math.trunc(height), initializer, info), insertTo);
    }
    /** item 登録 (内部用) */
    _addItem(item, insertTo) {
        const items = Array.isArray(item) ? item : [item];
        let deltaHeight = 0;
        let addTail = false;
        if (null == insertTo || this._items.length < insertTo) {
            insertTo = this._items.length;
        }
        if (insertTo === this._items.length) {
            addTail = true;
        }
        // scroll map の更新
        for (const it of items) {
            deltaHeight += it.height;
        }
        this.updateScrollMapHeight(deltaHeight);
        // 挿入
        this._items.splice(insertTo, 0, ...items);
        // page 設定の解除
        if (!addTail) {
            if (0 === insertTo) {
                this.clearPage();
            }
            else if (null != this._items[insertTo - 1].pageIndex) {
                this.clearPage(this._items[insertTo - 1].pageIndex);
            }
        }
        // offset の再計算
        this.updateProfiles(insertTo);
    }
    removeItem(index, arg2, arg3) {
        if (Array.isArray(index)) {
            this._removeItemRandomly(index, arg2);
        }
        else {
            this._removeItemContinuously(index, arg2, arg3);
        }
    }
    /** helper: 削除候補と変化量の算出 */
    _queryRemoveItemsContext(indexes, delay) {
        const removed = [];
        let delta = 0;
        let transition = false;
        for (const idx of indexes) {
            const item = this._items[idx];
            delta += item.height;
            // 削除要素の z-index の初期化
            item.resetDepth();
            removed.push(item);
        }
        // 自動設定・削除遅延時間が設定されかつ、スクロールポジションに変更がある場合は transition 設定
        if (this._settings.removeItemWithTransition && (0 < delay)) {
            const current = this.scrollPos;
            const posMax = this.scrollPosMax - delta;
            transition = (posMax < current);
        }
        return { removed, delta, transition };
    }
    /** helper: 削除時の更新 */
    _updateWithRemoveItemsContext(context, delay, profileUpdate) {
        const { removed, delta, transition } = context;
        // transition 設定
        if (transition) {
            this.setupScrollMapTransition(delay);
        }
        // customize point: プロファイルの更新
        profileUpdate();
        // スクロール領域の更新
        this.updateScrollMapHeight(-delta);
        // 遅延削除
        setTimeout(() => {
            for (const item of removed) {
                item.deactivate();
            }
        }, delay);
    }
    /** 指定した ItemProfile を削除: 連続 index 版 */
    _removeItemContinuously(index, size, delay) {
        size = size ?? 1;
        delay = delay ?? 0;
        if (index < 0 || this._items.length < index + size) {
            throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [removeItem(), invalid index: ${index}]`);
        }
        // 削除候補と変化量の算出
        const indexes = Array.from({ length: size }, (_, i) => index + i);
        const context = this._queryRemoveItemsContext(indexes, delay);
        // 更新
        this._updateWithRemoveItemsContext(context, delay, () => {
            // page 設定の解除
            if (null != this._items[index].pageIndex) {
                this.clearPage(this._items[index].pageIndex);
            }
            // 配列から削除
            this._items.splice(index, size);
            // offset の再計算
            this.updateProfiles(index);
        });
    }
    /** 指定した ItemProfile を削除: random access 版 */
    _removeItemRandomly(indexes, delay) {
        delay = delay ?? 0;
        indexes.sort((lhs, rhs) => rhs - lhs); // 降順ソート
        for (const index of indexes) {
            if (index < 0 || this._items.length < index) {
                throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [removeItem(), invalid index: ${index}]`);
            }
        }
        // 削除候補と変化量の算出
        const context = this._queryRemoveItemsContext(indexes, delay);
        // 更新
        this._updateWithRemoveItemsContext(context, delay, () => {
            for (const idx of indexes) {
                // page 設定の解除
                if (null != this._items[idx].pageIndex) {
                    this.clearPage(this._items[idx].pageIndex);
                }
                // 配列から削除
                this._items.splice(idx, 1);
            }
            // offset の再計算
            const first = indexes[indexes.length - 1];
            this.updateProfiles(first);
        });
    }
    /** scroll map のトランジション設定 */
    setupScrollMapTransition(delay) {
        verify(this._scroller);
        const el = this._$map[0];
        this._$map.transitionEnd(() => {
            clearTransition(el);
        });
        setTransformTransition(el, 'height', delay, 'ease');
    }
    /** 指定した item に設定した情報を取得 */
    getItemInfo(target) {
        const { _items, _config } = this;
        const parser = ($target) => {
            if ($target.hasClass(_config.LISTITEM_BASE_CLASS)) {
                return Number($target.attr(_config.DATA_ITEM_INDEX));
            }
            else if ($target.hasClass(_config.SCROLL_MAP_CLASS) || $target.length <= 0) {
                console.warn('cannot ditect item from event object.');
                return NaN;
            }
            else {
                return parser($target.parent());
            }
        };
        const index = target instanceof Event ? parser(dom(target.target)) : Number(target);
        if (Number.isNaN(index)) {
            throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [unsupported type: ${typeof target}]`);
        }
        else if (index < 0 || _items.length <= index) {
            throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} getItemInfo() [invalid index: ${index}]`);
        }
        return _items[index].info;
    }
    /** アクティブページを更新 */
    refresh() {
        const { _pages, _items, _settings, _lastActivePageContext } = this;
        const targets = {};
        const currentPageIndex = this.getPageIndex();
        const highPriorityIndex = [];
        const storeNextPageState = (index) => {
            if (index === currentPageIndex) {
                targets[index] = 'activate';
                highPriorityIndex.push(index);
            }
            else if (Math.abs(currentPageIndex - index) <= _settings.pagePrepareCount) {
                targets[index] = 'activate';
            }
            else if (_settings.enableHiddenPage) {
                targets[index] = 'hide';
            }
            else {
                targets[index] = 'deactivate';
            }
            // current page の 前後は high priority にする
            if (currentPageIndex + 1 === index || currentPageIndex - 1 === index) {
                highPriorityIndex.push(index);
            }
        };
        // 対象無し
        if (_items.length <= 0) {
            return this;
        }
        {
            const searchCount = _settings.pagePrepareCount + _settings.pagePreloadCount;
            const beginIndex = currentPageIndex - searchCount;
            const endIndex = currentPageIndex + searchCount;
            let overflowPrev = 0, overflowNext = 0;
            for (let pageIndex = beginIndex; pageIndex <= endIndex; pageIndex++) {
                if (pageIndex < 0) {
                    overflowPrev++;
                    continue;
                }
                if (_pages.length <= pageIndex) {
                    overflowNext++;
                    continue;
                }
                storeNextPageState(pageIndex);
            }
            if (0 < overflowPrev) {
                for (let i = 0, pageIndex = currentPageIndex + searchCount + 1; i < overflowPrev; i++, pageIndex++) {
                    if (_pages.length <= pageIndex) {
                        break;
                    }
                    storeNextPageState(pageIndex);
                }
            }
            if (0 < overflowNext) {
                for (let i = 0, pageIndex = currentPageIndex - searchCount - 1; i < overflowNext; i++, pageIndex--) {
                    if (pageIndex < 0) {
                        break;
                    }
                    storeNextPageState(pageIndex);
                }
            }
        }
        // 不要になった page の 非活性化
        for (const page of _pages.filter(page => 'inactive' !== page.status)) {
            if (null == targets[page.index]) {
                page.deactivate();
            }
        }
        // 優先 page の activate
        for (const idx of highPriorityIndex.sort((lhs, rhs) => lhs - rhs)) { // 昇順ソート
            void post(() => {
                this.isInitialized && _pages[idx]?.activate();
            });
        }
        // そのほかの page の 状態変更
        for (const key of Object.keys(targets)) {
            const index = Number(key);
            const action = targets[index];
            void post(() => {
                this.isInitialized && _pages[index]?.[action]?.();
            });
        }
        // 更新後に使用しなかった DOM を削除
        this.findRecycleElements().remove();
        const pageCurrent = _pages[currentPageIndex];
        _lastActivePageContext.from = pageCurrent?.getItemFirst()?.index ?? 0;
        _lastActivePageContext.to = pageCurrent?.getItemLast()?.index ?? 0;
        _lastActivePageContext.index = currentPageIndex;
        return this;
    }
    /** 未アサインページを構築 */
    update() {
        this.assignPage(Math.max(this._pages.length - 1, 0));
        this.refresh();
        return this;
    }
    /** ページアサインを再構成 */
    rebuild() {
        this.clearPage();
        this.assignPage();
        this.refresh();
        return this;
    }
    /** 管轄データを破棄 */
    release() {
        for (const item of this._items) {
            item.deactivate();
        }
        this._pages.length = 0;
        this._items.length = 0;
        this._mapHeight = 0;
        this._$map.height(0);
        return this;
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListScrollable
    /** scroller の種類を取得 */
    get scrollerType() {
        return this._scroller?.type;
    }
    /** スクロール位置を取得 */
    get scrollPos() {
        return this._scroller?.pos ?? 0;
    }
    /** スクロール位置の最大値を取得 */
    get scrollPosMax() {
        return this._scroller?.posMax ?? 0;
    }
    /** スクロールイベントハンドラ設定/解除 */
    setScrollHandler(handler, method) {
        this._scroller?.[method]('scroll', handler);
    }
    /** スクロール終了イベントハンドラ設定/解除 */
    setScrollStopHandler(handler, method) {
        this._scroller?.[method]('scrollstop', handler);
    }
    /** スクロール位置を指定 */
    async scrollTo(pos, animate, time) {
        verify(this._scroller);
        if (pos < 0) {
            console.warn(`invalid position, too small. [pos: ${pos}]`);
            pos = 0;
        }
        else if (this._scroller.posMax < pos) {
            console.warn(`invalid position, too big. [pos: ${pos}]`);
            pos = this._scroller.posMax;
        }
        // pos のみ先駆けて更新
        this._lastActivePageContext.pos = pos;
        if (pos !== this._scroller.pos) {
            await this._scroller.scrollTo(pos, animate, time);
        }
    }
    /** インデックス指定された item の表示を保証 */
    async ensureVisible(index, options) {
        const { _scroller, _items, _settings, _baseHeight } = this;
        verify(_scroller);
        if (index < 0 || _items.length <= index) {
            throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} ensureVisible() [invalid index: ${index}]`);
        }
        const { partialOK, setTop, animate, time, callback } = Object.assign({
            partialOK: true,
            setTop: false,
            animate: _settings.enableAnimation,
            time: _settings.animationDuration,
            callback: noop,
        }, options);
        const currentScope = {
            from: _scroller.pos,
            to: _scroller.pos + _baseHeight,
        };
        const target = _items[index];
        const targetScope = {
            from: target.offset,
            to: target.offset + target.height,
        };
        const isInScope = () => {
            if (partialOK) {
                if (targetScope.from <= currentScope.from) {
                    return currentScope.from <= targetScope.to;
                }
                else {
                    return targetScope.from <= currentScope.to;
                }
            }
            else {
                return currentScope.from <= targetScope.from && targetScope.to <= currentScope.to;
            }
        };
        const detectPosition = () => {
            return targetScope.from < currentScope.from
                ? targetScope.from
                : target.offset - target.height // bottom 合わせは情報不足により不可
            ;
        };
        let pos;
        if (setTop) {
            pos = targetScope.from;
        }
        else if (isInScope()) {
            callback(_scroller.pos);
            return; // noop
        }
        else {
            pos = detectPosition();
        }
        await this.scrollTo(pos, animate, time);
        callback(pos);
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListBackupRestore
    /** 内部データのバックアップを実行 */
    backup(key) {
        this._backup[key] = { items: this._items };
        return true;
    }
    /** 内部データのバックアップを実行 */
    restore(key, rebuild) {
        if (null == this._backup[key]) {
            return false;
        }
        if (0 < this._items.length) {
            this.release();
        }
        this._addItem(this._backup[key].items);
        if (rebuild) {
            this.rebuild();
        }
        return true;
    }
    /** バックアップデータの有無を確認 */
    hasBackup(key) {
        return null != this._backup[key];
    }
    /** バックアップデータの破棄 */
    clearBackup(key) {
        if (null == key) {
            for (const key of Object.keys(this._backup)) {
                delete this._backup[key];
            }
            return true;
        }
        else if (null != this._backup[key]) {
            delete this._backup[key];
            return true;
        }
        else {
            return false;
        }
    }
    /** バックアップデータにアクセス */
    getBackupData(key) {
        return this._backup[key];
    }
    /** バックアップデータを外部より設定 */
    setBackupData(key, data) {
        if (Array.isArray(data.items)) {
            this._backup[key] = data;
            return true;
        }
        return false;
    }
    ///////////////////////////////////////////////////////////////////////
    // internal:
    /** @internal */
    get _config() {
        return ListViewGlobalConfig();
    }
    /** Scroller 用環境設定 */
    setScrollerCondition() {
        this._scroller?.on('scroll', this._scrollEventHandler);
        this._scroller?.on('scrollstop', this._scrollStopEventHandler);
    }
    /** Scroller 用環境破棄 */
    resetScrollerCondition() {
        this._scroller?.off('scrollstop', this._scrollStopEventHandler);
        this._scroller?.off('scroll', this._scrollEventHandler);
    }
    /** 既定の Scroller オブジェクトの作成 */
    createScroller() {
        return this._settings.scrollerFactory(this._$root, this._$map, this._settings);
    }
    /** 現在の Page Index を取得 */
    getPageIndex() {
        const { _scroller, _baseHeight, _pages } = this;
        verify(_scroller);
        const { pos: scrollPos, posMax: scrollPosMax } = _scroller;
        const scrollMapSize = (() => {
            const lastPage = this.getLastPage();
            return lastPage ? lastPage.offset + lastPage.height : _baseHeight;
        })();
        const pos = (() => {
            if (0 === scrollPosMax || scrollPosMax <= _baseHeight) {
                return 0;
            }
            else {
                return scrollPos * scrollMapSize / scrollPosMax;
            }
        })();
        const validRange = (page) => {
            if (null == page) {
                return false;
            }
            else if (page.offset <= pos && pos <= page.offset + page.height) {
                return true;
            }
            else {
                return false;
            }
        };
        let candidate = Math.floor(pos / _baseHeight);
        if (0 !== candidate && _pages.length <= candidate) {
            candidate = _pages.length - 1;
        }
        let page = _pages[candidate];
        if (validRange(page)) {
            return page.index;
        }
        else if (pos < page?.offset) {
            for (let i = candidate - 1; i >= 0; i--) {
                page = _pages[i];
                if (validRange(page)) {
                    return page.index;
                }
            }
        }
        else {
            for (let i = candidate + 1, n = _pages.length; i < n; i++) {
                page = _pages[i];
                if (validRange(page)) {
                    return page.index;
                }
            }
        }
        console.warn(`cannot detect page index. fallback: ${_pages.length - 1}`);
        return Math.max(0, _pages.length - 1);
    }
    /** 最後のページを取得 */
    getLastPage() {
        if (0 < this._pages.length) {
            return this._pages[this._pages.length - 1];
        }
        else {
            return undefined;
        }
    }
    /** スクロールイベント*/
    onScroll(pos) {
        if (this._active && 0 < this._pages.length) {
            const currentPageIndex = this.getPageIndex();
            // TODO: intersectionRect を使用する場合, Scroll ハンドラー全般はどうあるべきか要検討
            if (Math.abs(pos - this._lastActivePageContext.pos) < this._settings.scrollRefreshDistance) {
                if (this._lastActivePageContext.index !== currentPageIndex) {
                    this.refresh();
                }
            }
            this._lastActivePageContext.pos = pos;
        }
    }
    /** スクロール停止イベント */
    onScrollStop(pos) {
        if (this._active && 0 < this._pages.length) {
            const currentPageIndex = this.getPageIndex();
            if (this._lastActivePageContext.index !== currentPageIndex) {
                this.refresh();
            }
            this._lastActivePageContext.pos = pos;
        }
    }
    /** ページ区分のアサイン */
    assignPage(from) {
        this.clearPage(from);
        const { _items, _pages, _baseHeight, _scroller } = this;
        const basePage = this.getLastPage();
        const nextItemIndex = basePage?.getItemLast()?.index ?? 0;
        const asigneeItems = _items.slice(nextItemIndex);
        let workPage = basePage;
        if (null == workPage) {
            workPage = new PageProfile();
            _pages.push(workPage);
        }
        for (const item of asigneeItems) {
            if (_baseHeight <= workPage.height) {
                workPage.normalize();
                const newPage = new PageProfile();
                newPage.index = workPage.index + 1;
                newPage.offset = workPage.offset + workPage.height;
                workPage = newPage;
                _pages.push(workPage);
            }
            item.pageIndex = workPage.index;
            workPage.push(item);
        }
        workPage.normalize();
        _scroller?.update();
    }
    /** ページ区分の解除 */
    clearPage(from) {
        this._pages.splice(from ?? 0);
    }
    /** inactive 用 Map の生成 */
    prepareInactiveMap() {
        const { _config, _$map, _mapHeight } = this;
        const $parent = _$map.parent();
        let $inactiveMap = $parent.find(`.${_config.INACTIVE_CLASS}`);
        if ($inactiveMap.length <= 0) {
            const currentPageIndex = this.getPageIndex();
            const $listItemViews = _$map.clone().children().filter((_, element) => {
                const pageIndex = Number(dom(element).attr(_config.DATA_PAGE_INDEX));
                if (currentPageIndex - 1 <= pageIndex && pageIndex <= currentPageIndex + 1) {
                    return true;
                }
                else {
                    return false;
                }
            });
            $inactiveMap = dom(`<section class="${_config.SCROLL_MAP_CLASS} ${_config.INACTIVE_CLASS}"></section>`)
                .append($listItemViews)
                .height(_mapHeight);
            $parent.append($inactiveMap);
            _$map.css('display', 'none');
        }
        return $inactiveMap;
    }
}

/** @internal */ const _properties$2 = Symbol('properties');
/**
 * @en Virtual list view class that provides memory management functionality.
 * @ja メモリ管理機能を提供する仮想リストビュークラス
 */
class ListView extends View {
    /** @internal */
    [_properties$2];
    /** constructor */
    constructor(options) {
        super(options);
        this[_properties$2] = {
            context: new ListCore(options),
        };
        this.setElement(this.$el);
    }
    /** context accessor */
    get context() {
        return this[_properties$2].context;
    }
    /** construct option accessor */
    get options() {
        return this.context.options;
    }
    /**
     * @override
     * @en Change the view's element (`this.el` property) and re-delegate the view's events on the new element.
     * @ja View が管轄する要素 (`this.el` property) の変更. イベント再設定も実行
     *
     * @param el
     *  - `en` Object or the selector string which becomes origin of element.
     *  - `ja` 要素のもとになるオブジェクトまたはセレクタ文字列
     */
    setElement(el) {
        if (this[_properties$2]) {
            const { context } = this[_properties$2];
            const $el = dom(el);
            context.destroy();
            context.initialize($el, this.options.initialHeight ?? $el.height());
        }
        return super.setElement(el);
    }
    /**
     * @override
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    remove() {
        this[_properties$2].context.destroy();
        return super.remove();
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListOperation
    /**
     * @en Determine whether it has been initialized.
     * @ja 初期化済みか判定
     *
     * @returns
     *  - `en` true: initialized / false: uninitialized
     *  - `ja` true: 初期化済み / false: 未初期化
     */
    get isInitialized() {
        return this[_properties$2].context.isInitialized;
    }
    /**
     * @en Item registration.
     * @ja item 登録
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
     * @param insertTo
     *  - `en` specify the insertion position of item by index
     *  - `ja` item の挿入位置をインデックスで指定
     */
    addItem(height, initializer, info, insertTo) {
        this._addItem(new ItemProfile(this.context, Math.trunc(height), initializer, info), insertTo);
    }
    /**
     * @internal
     * @en Item registration (internal use).
     * @ja item 登録 (内部用)
     *
     * @param item
     *  - `en` {@link ItemProfile} instance
     *  - `ja` {@link ItemProfile} インスタンス
     * @param insertTo
     *  - `en` specify the insertion position of item by index
     *  - `ja` item の挿入位置をインデックスで指定
     */
    _addItem(item, insertTo) {
        this[_properties$2].context._addItem(item, insertTo);
    }
    removeItem(index, arg2, arg3) {
        this[_properties$2].context.removeItem(index, arg2, arg3); // avoid ts(2345)
    }
    /**
     * @en Get the information set for the specified item.
     * @ja 指定した item に設定した情報を取得
     *
     * @param target
     *  - `en` identifier [index | event object]
     *  - `ja` 識別子. [index | event object]
     */
    getItemInfo(target) {
        return this[_properties$2].context.getItemInfo(target);
    }
    /**
     * @en Refresh active pages.
     * @ja アクティブページを更新
     */
    refresh() {
        this[_properties$2].context.refresh();
        return this;
    }
    /**
     * @en Build unassigned pages.
     * @ja 未アサインページを構築
     */
    update() {
        this[_properties$2].context.update();
        return this;
    }
    /**
     * @en Rebuild page assignments.
     * @ja ページアサインを再構成
     */
    rebuild() {
        this[_properties$2].context.rebuild();
        return this;
    }
    /**
     * @override
     * @en Destroy internal data.
     * @ja 管轄データを破棄
     */
    release() {
        this[_properties$2].context.release();
        return super.release();
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListScrollable
    /**
    * @en Get scroll position.
    * @ja スクロール位置を取得
    */
    get scrollPos() {
        return this[_properties$2].context.scrollPos;
    }
    /**
     * @en Get maximum scroll position.
     * @ja スクロール位置の最大値を取得
     */
    get scrollPosMax() {
        return this[_properties$2].context.scrollPosMax;
    }
    /**
    * @en Scroll event handler setting/cancellation.
    * @ja スクロールイベントハンドラ設定/解除
    *
    * @param handler
    *  - `en` event handler function
    *  - `ja` イベントハンドラー関数
    * @param method
    *  - `en` on: setting / off: canceling
    *  - `ja` on: 設定 / off: 解除
    */
    setScrollHandler(handler, method) {
        this[_properties$2].context.setScrollHandler(handler, method);
    }
    /**
     * @en Setting/cancelling scroll stop event handler.
     * @ja スクロール終了イベントハンドラ設定/解除
     *
     * @param handler
     *  - `en` event handler function
     *  - `ja` イベントハンドラー関数
     * @param method
     *  - `en` on: setting / off: canceling
     *  - `ja` on: 設定 / off: 解除
     */
    setScrollStopHandler(handler, method) {
        this[_properties$2].context.setScrollStopHandler(handler, method);
    }
    /**
     * @en Set scroll position.
     * @ja スクロール位置を指定
     *
     * @param pos
     *  - `en` new scroll position value [0 - posMax]
     *  - `ja` 新しいスクロール位置を指定 [0 - posMax]
     * @param animate
     *  - `en` enable/disable animation
     *  - `ja` アニメーションの有無
     * @param time
     *  - `en` time spent on animation [msec]
     *  - `ja` アニメーションに費やす時間 [msec]
     */
    scrollTo(pos, animate, time) {
        return this[_properties$2].context.scrollTo(pos, animate, time);
    }
    /**
     * @en Ensure visibility of item by index.
     * @ja インデックス指定された item の表示を保証
     *
     * @param index
     *  - `en` specify index of item
     *  - `ja` item のインデックスを指定
     * @param options
     *  - `en` specify {@link ListEnsureVisibleOptions} object
     *  - `ja` {@link ListEnsureVisibleOptions} オブジェクトを指定
     */
    ensureVisible(index, options) {
        return this[_properties$2].context.ensureVisible(index, options);
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListBackupRestore
    /**
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
    backup(key) {
        return this[_properties$2].context.backup(key);
    }
    /**
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
    restore(key, rebuild = true) {
        return this[_properties$2].context.restore(key, rebuild);
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
    hasBackup(key) {
        return this[_properties$2].context.hasBackup(key);
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
    clearBackup(key) {
        return this[_properties$2].context.clearBackup(key);
    }
    /**
     * @en Access backup data.
     * @ja バックアップデータにアクセス
     *
     * @param key
     *  - `en` specify backup key (the one used for `backup()`)
     *  - `ja` バックアップキーを指定 (`backup()` に使用したもの)
     */
    getBackupData(key) {
        return this[_properties$2].context.getBackupData(key);
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
    setBackupData(key, data) {
        return this[_properties$2].context.setBackupData(key, data);
    }
}

/** @internal */ const _properties$1 = Symbol('properties');
/**
 * @en List item container class handled by {@link ExpandableListView}.
 * @ja {@link ExpandableListView} が扱うリストアイテムコンテナクラス
 */
class ExpandableListItemView extends ListItemView {
    /** @internal */
    [_properties$1];
    /** constructor */
    constructor(options) {
        super(options);
        const { group } = options;
        this[_properties$1] = { group };
    }
    ///////////////////////////////////////////////////////////////////////
    // protected methods:
    /**
     * @en Check expanded / collapsed status.
     * @ja 展開状態を判定
     *
     * @returns
     *  - `en` true: expanded, collapsed: close
     *  - `ja` true: 展開, false: 収束
     */
    get isExpanded() {
        return this[_properties$1].group.isExpanded;
    }
    /**
     * @en Determine whether the list is during expanding.
     * @ja 展開中か判定
     */
    get isExpanding() {
        return this.owner.isExpanding;
    }
    /**
     * @en Determine whether the list is during collapsing.
     * @ja 収束中か判定
     */
    get isCollapsing() {
        return this.owner.isCollapsing;
    }
    /**
     * @en Determine whether the list is during expanding or collapsing.
     * @ja 開閉中か判定
     */
    get isSwitching() {
        return this.owner.isSwitching;
    }
    /**
     * @en Determine if it has a child {@link GroupProfile}.
     * @ja 子 {@link GroupProfile} を持っているか判定
     *
     * @returns
     *  - `en` true: exists, false: unexists
     *  - `ja` true: 有, false: 無
     */
    get hasChildren() {
        return this[_properties$1].group.hasChildren;
    }
}

/**
 * @internal
 * @en Core logic implementation class that manages expanding / collapsing state.
 * @ja 開閉状態管理を行うコアロジック実装クラス
 */
class ExpandCore {
    _owner;
    /** { id: GroupProfile } */
    _mapGroups = {};
    /** 第1階層 GroupProfile を格納 */
    _aryTopGroups = [];
    /** データの backup 領域. key と { map, tops } を格納 */
    _backup = {};
    /**
     * constructor
     * @param owner 親 View のインスタンス
     */
    constructor(owner) {
        this._owner = owner;
    }
    /** データを破棄 */
    release() {
        this._mapGroups = {};
        this._aryTopGroups = [];
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IExpandOperation
    /** 新規 GroupProfile を作成 */
    newGroup(id) {
        id = id ?? luid('list-group', 4);
        if (null != this._mapGroups[id]) {
            return this._mapGroups[id];
        }
        const group = new GroupProfile(this._owner, id);
        this._mapGroups[id] = group;
        return group;
    }
    /** 登録済み Group を取得 */
    getGroup(id) {
        return this._mapGroups[id];
    }
    /** 第1階層の Group 登録 */
    registerTopGroup(topGroup) {
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
    getTopGroups() {
        return this._aryTopGroups.slice(0);
    }
    /** すべてのグループを展開 (1階層) */
    async expandAll() {
        const promisies = [];
        for (const group of this._aryTopGroups) {
            promisies.push(group.expand());
        }
        await Promise.all(promisies);
    }
    /** すべてのグループを収束 (1階層) */
    async collapseAll(delay) {
        const promisies = [];
        for (const group of this._aryTopGroups) {
            promisies.push(group.collapse(delay));
        }
        await Promise.all(promisies);
    }
    /** 展開中か判定 */
    get isExpanding() {
        return this.isStatusIn('expanding');
    }
    /** 収束中か判定 */
    get isCollapsing() {
        return this.isStatusIn('collapsing');
    }
    /** 開閉中か判定 */
    get isSwitching() {
        return this.isExpanding || this.isCollapsing;
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListStatusManager
    /** 状態変数の参照カウントのインクリメント */
    statusAddRef(status) {
        return statusAddRef(status);
    }
    /** 状態変数の参照カウントのデクリメント */
    statusRelease(status) {
        return statusRelease(status);
    }
    /** 処理スコープ毎に状態変数を設定 */
    statusScope(status, executor) {
        return statusScope(status, executor);
    }
    /** 指定した状態中であるか確認 */
    isStatusIn(status) {
        return isStatusIn(status);
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IListBackupRestore
    /** 内部データをバックアップ */
    backup(key) {
        const { _backup } = this;
        if (null == _backup[key]) {
            _backup[key] = {
                map: this._mapGroups,
                tops: this._aryTopGroups,
            };
        }
        return true;
    }
    /** 内部データをリストア */
    restore(key, rebuild) {
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
    hasBackup(key) {
        return null != this._backup[key];
    }
    /** バックアップデータの破棄 */
    clearBackup(key) {
        if (null == key) {
            for (const key of Object.keys(this._backup)) {
                delete this._backup[key];
            }
            return true;
        }
        else if (null != this._backup[key]) {
            delete this._backup[key];
            return true;
        }
        else {
            return false;
        }
    }
    /** バックアップデータにアクセス */
    getBackupData(key) {
        return this._backup[key];
    }
    /** バックアップデータを外部より設定 */
    setBackupData(key, data) {
        if (data.map && Array.isArray(data.tops)) {
            this._backup[key] = data;
            return true;
        }
        return false;
    }
}

/** @internal */ const _properties = Symbol('properties');
//__________________________________________________________________________________________________//
/**
 * @en Virtual list view class with expanding / collapsing functionality.
 * @ja 開閉機能を備えた仮想リストビュークラス
 */
class ExpandableListView extends ListView {
    /** @internal */
    [_properties];
    /** constructor */
    constructor(options) {
        super(options);
        this[_properties] = {
            context: new ExpandCore(this),
        };
    }
    /** context accessor */
    get expandContext() {
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
    newGroup(id) {
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
    getGroup(id) {
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
    registerTopGroup(topGroup) {
        this[_properties].context.registerTopGroup(topGroup);
    }
    /**
     * @en Get 1st layer {@link GroupProfile}. <br>
     *     A copy array is returned, so the client cannot cache it.
     * @ja 第1階層の {@link GroupProfile} を取得 <br>
     *     コピー配列が返されるため、クライアントはキャッシュ不可
     */
    getTopGroups() {
        return this[_properties].context.getTopGroups();
    }
    /**
     * @en Expand all groups (1st layer)
     * @ja すべてのグループを展開 (1階層)
     */
    expandAll() {
        return this[_properties].context.expandAll();
    }
    /**
     * @en Collapse all groups (1st layer)
     * @ja すべてのグループを収束 (1階層)
     */
    collapseAll(delay) {
        return this[_properties].context.collapseAll(delay);
    }
    /**
     * @en Determine whether the list is during expanding.
     * @ja 展開中か判定
     */
    get isExpanding() {
        return this[_properties].context.isExpanding;
    }
    /**
     * @en Determine whether the list is during collapsing.
     * @ja 収束中か判定
     */
    get isCollapsing() {
        return this[_properties].context.isCollapsing;
    }
    /**
     * @en Determine whether the list is during expanding or collapsing.
     * @ja 開閉中か判定
     */
    get isSwitching() {
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
    statusAddRef(status) {
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
    statusRelease(status) {
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
    statusScope(status, executor) {
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
    isStatusIn(status) {
        return this[_properties].context.isStatusIn(status);
    }
    ///////////////////////////////////////////////////////////////////////
    // override: ListView
    /**
     * @override
     * @en Destroy internal data.
     * @ja 管轄データを破棄
     */
    release() {
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
    backup(key) {
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
    restore(key, rebuild = true) {
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
    hasBackup(key) {
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
    clearBackup(key) {
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
    getBackupData(key) {
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
    setBackupData(key, data) {
        return this[_properties].context.setBackupData(key, data);
    }
}

export { ExpandableListItemView, ExpandableListView, GroupProfile, ItemProfile, ListItemView, ListView, ListViewGlobalConfig, PageProfile };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktbGlzdHZpZXcubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiZ2xvYmFsLWNvbmZpZy50cyIsInByb2ZpbGUvaXRlbS50cyIsInByb2ZpbGUvcGFnZS50cyIsInByb2ZpbGUvZ3JvdXAudHMiLCJsaXN0LWl0ZW0tdmlldy50cyIsImNvcmUvZWxlbWVudC1zY3JvbGxlci50cyIsImNvcmUvbGlzdC50cyIsImxpc3Qtdmlldy50cyIsImV4cGFuZGFibGUtbGlzdC1pdGVtLXZpZXcudHMiLCJjb3JlL2V4cGFuZC50cyIsImV4cGFuZGFibGUtbGlzdC12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfTElTVFZJRVcgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLkxJU1RWSUVXKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9MSVNUVklFV19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAxLCAnbGlzdHZpZXcgaGFzIGludmFsaWQgaW5pdGlhbGl6YXRpb24uJyksXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0gICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDIsICdsaXN0dmlldyBnaXZlbiBhIGludmFsaWQgcGFyYW0uJyksXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfT1BFUkFUSU9OICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDMsICdsaXN0dmlldyBpbnZhbGlkIG9wZXJhdGlvbi4nKSxcbiAgICB9XG59XG4iLCIvKipcbiAqIEBlbiBHbG9iYWwgY29uZmlndXJhdGlvbiBkZWZpbml0aW9uIGZvciBsaXN0IHZpZXdzLlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICBOQU1FU1BBQ0U6IHN0cmluZztcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBzdHJpbmc7XG4gICAgSU5BQ1RJVkVfQ0xBU1M6IHN0cmluZztcbiAgICBSRUNZQ0xFX0NMQVNTOiBzdHJpbmc7XG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogc3RyaW5nO1xuICAgIERBVEFfUEFHRV9JTkRFWDogc3RyaW5nO1xuICAgIERBVEFfSVRFTV9JTkRFWDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHRWIHtcbiAgICBOQU1FU1BBQ0UgICAgICAgICAgICAgICAgICAgID0gJ2NkcC11aScsIC8vIFRPRE86IG5hbWVzcGFjZSDjga8gdXRpbHMg44Gr56e744GZXG4gICAgU0NST0xMX01BUF9DTEFTUyAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctc2Nyb2xsLW1hcGAsXG4gICAgSU5BQ1RJVkVfQ0xBU1MgICAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0taW5hY3RpdmVgLFxuICAgIFJFQ1lDTEVfQ0xBU1MgICAgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXJlY3ljbGVgLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LWl0ZW0tYmFzZWAsXG4gICAgREFUQV9QQUdFX0lOREVYICAgICAgICAgICAgICA9ICdkYXRhLXBhZ2UtaW5kZXgnLFxuICAgIERBVEFfSVRFTV9JTkRFWCAgICAgICAgICAgICAgPSAnZGF0YS1pdGVtLWluZGV4Jyxcbn1cblxuY29uc3QgX2NvbmZpZyA9IHtcbiAgICBOQU1FU1BBQ0U6IERlZmF1bHRWLk5BTUVTUEFDRSxcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBEZWZhdWx0Vi5TQ1JPTExfTUFQX0NMQVNTLFxuICAgIElOQUNUSVZFX0NMQVNTOiBEZWZhdWx0Vi5JTkFDVElWRV9DTEFTUyxcbiAgICBSRUNZQ0xFX0NMQVNTOiBEZWZhdWx0Vi5SRUNZQ0xFX0NMQVNTLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IERlZmF1bHRWLkxJU1RJVEVNX0JBU0VfQ0xBU1MsXG4gICAgREFUQV9QQUdFX0lOREVYOiBEZWZhdWx0Vi5EQVRBX1BBR0VfSU5ERVgsXG4gICAgREFUQV9JVEVNX0lOREVYOiBEZWZhdWx0Vi5EQVRBX0lURU1fSU5ERVgsXG59O1xuXG5leHBvcnQgdHlwZSBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyA9IFBhcnRpYWw8XG5QaWNrPExpc3RWaWV3R2xvYmFsQ29uZmlnXG4sICdOQU1FU1BBQ0UnXG58ICdTQ1JPTExfTUFQX0NMQVNTJ1xufCAnSU5BQ1RJVkVfQ0xBU1MnXG58ICdSRUNZQ0xFX0NMQVNTJ1xufCAnTElTVElURU1fQkFTRV9DTEFTUydcbnwgJ0RBVEFfUEFHRV9JTkRFWCdcbnwgJ0RBVEFfSVRFTV9JTkRFWCdcbj4+O1xuXG5jb25zdCBlbnN1cmVOZXdDb25maWcgPSAobmV3Q29uZmlnOiBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyk6IFBhcnRpYWw8TGlzdFZpZXdHbG9iYWxDb25maWc+ID0+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIE5BTUVTUEFDRTogbnMsXG4gICAgICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHNjcm9sbG1hcCxcbiAgICAgICAgSU5BQ1RJVkVfQ0xBU1M6IGluYWN0aXZlLFxuICAgICAgICBSRUNZQ0xFX0NMQVNTOiByZWN5Y2xlLFxuICAgICAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBpdGVtYmFzZSxcbiAgICAgICAgREFUQV9QQUdFX0lOREVYOiBkYXRhcGFnZSxcbiAgICAgICAgREFUQV9JVEVNX0lOREVYOiBkYXRhaXRlbSxcbiAgICB9ID0gbmV3Q29uZmlnO1xuXG4gICAgY29uc3QgTkFNRVNQQUNFID0gbnM7XG4gICAgY29uc3QgU0NST0xMX01BUF9DTEFTUyA9IHNjcm9sbG1hcCA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctc2Nyb2xsLW1hcGAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IElOQUNUSVZFX0NMQVNTID0gaW5hY3RpdmUgPz8gKG5zID8gYCR7bnN9LWluYWN0aXZlYCA6IHVuZGVmaW5lZCk7XG4gICAgY29uc3QgUkVDWUNMRV9DTEFTUyA9IHJlY3ljbGUgPz8gKG5zID8gYCR7bnN9LWxpc3R2aWV3LXJlY3ljbGVgIDogdW5kZWZpbmVkKTtcbiAgICBjb25zdCBMSVNUSVRFTV9CQVNFX0NMQVNTID0gaXRlbWJhc2UgPz8gKG5zID8gYCR7bnN9LWxpc3R2aWV3LWl0ZW0tYmFzZWAgOiB1bmRlZmluZWQpO1xuXG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obmV3Q29uZmlnLCB7XG4gICAgICAgIE5BTUVTUEFDRSxcbiAgICAgICAgU0NST0xMX01BUF9DTEFTUyxcbiAgICAgICAgSU5BQ1RJVkVfQ0xBU1MsXG4gICAgICAgIFJFQ1lDTEVfQ0xBU1MsXG4gICAgICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MsXG4gICAgICAgIERBVEFfUEFHRV9JTkRFWDogZGF0YXBhZ2UsXG4gICAgICAgIERBVEFfSVRFTV9JTkRFWDogZGF0YWl0ZW0sXG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQvVXBkYXRlIGdsb2JhbCBjb25maWd1cmF0aW9uIG9mIGxpc3Qgdmlldy5cbiAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjga7jgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjg6zjg7zjgrfjg6fjg7Pjga7lj5blvpcv5pu05pawXG4gKi9cbmV4cG9ydCBjb25zdCBMaXN0Vmlld0dsb2JhbENvbmZpZyA9IChuZXdDb25maWc/OiBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyk6IExpc3RWaWV3R2xvYmFsQ29uZmlnID0+IHtcbiAgICBpZiAobmV3Q29uZmlnKSB7XG4gICAgICAgIGVuc3VyZU5ld0NvbmZpZyhuZXdDb25maWcpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhuZXdDb25maWcpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgT2JqZWN0LmFzc2lnbihfY29uZmlnLCBuZXdDb25maWcpKTtcbn07XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25PYmplY3QsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHsgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzIH0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RJdGVtVmlldyxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB7IExpc3RWaWV3R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vZ2xvYmFsLWNvbmZpZyc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBsaXN0IGl0ZW1zLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEl0ZW1Qcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3I7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luZm86IFVua25vd25PYmplY3Q7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleD86IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsIGJlbG9uZ2luZyBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfcGFnZUluZGV4PzogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgZ2xvYmFsIG9mZnNldCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBiYXNlIGRvbSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgXyRiYXNlPzogRE9NO1xuICAgIC8qKiBAaW50ZXJuYWwgSUxpc3RJdGVtVmlldyBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX2luc3RhbmNlPzogSUxpc3RJdGVtVmlldztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJTGlzdFZpZXdDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7liJ3mnJ/jga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElMaXN0Q29udGV4dCwgaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIF9pbmZvOiBVbmtub3duT2JqZWN0KSB7XG4gICAgICAgIHRoaXMuX293bmVyICAgICAgID0gb3duZXI7XG4gICAgICAgIHRoaXMuX2hlaWdodCAgICAgID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplciA9IGluaXRpYWxpemVyO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgICA9IF9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBoZWlnaHQuICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBpdGVtJ3MgZ2xvYmFsIGluZGV4LiAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBnZXQgcGFnZUluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYWdlSW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCBiZWxvbmdpbmcgdGhlIHBhZ2UgaW5kZXguICovXG4gICAgc2V0IHBhZ2VJbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX3BhZ2VJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgZ2xvYmFsIG9mZnNldC4gKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIHNldCBvZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgaW5pdCBwYXJhbWV0ZXJzLiAqL1xuICAgIGdldCBpbmZvKCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5mbztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZSA9IHRoaXMucHJlcGFyZUJhc2VFbGVtZW50KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUluZGV4KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgICAgIGVsOiB0aGlzLl8kYmFzZSxcbiAgICAgICAgICAgICAgICBvd25lcjogdGhpcy5fb3duZXIsXG4gICAgICAgICAgICAgICAgaXRlbTogdGhpcyxcbiAgICAgICAgICAgIH0sIHRoaXMuX2luZm8pO1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSBuZXcgdGhpcy5faW5pdGlhbGl6ZXIob3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoJ25vbmUnID09PSB0aGlzLl8kYmFzZS5jc3MoJ2Rpc3BsYXknKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAndmlzaWJsZScgIT09IHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIGl0ZW0gaW52aXNpYmxlLlxuICAgICAqIEBqYSBpdGVtIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAnaGlkZGVuJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5hZGRDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZnJlc2ggdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5pu05pawXG4gICAgICovXG4gICAgcHVibGljIHJlZnJlc2goKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW5kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgYWN0aXZhdGlvbiBzdGF0dXMgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5rS75oCn54q25oWL5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9pbnN0YW5jZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGhlaWdodCBpbmZvcm1hdGlvbiBvZiB0aGUgaXRlbS4gQ2FsbGVkIGZyb20ge0BsaW5rIExpc3RJdGVtVmlld30uXG4gICAgICogQGphIGl0ZW0g44Gu6auY44GV5oOF5aCx44Gu5pu05pawLiB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gbmV3SGVpZ2h0IC0gdGhpcy5faGVpZ2h0O1xuICAgICAgICB0aGlzLl9oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YSk7XG4gICAgICAgIGlmIChvcHRpb25zPy5yZWZsZWN0QWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGVQcm9maWxlcyh0aGlzLl9pbmRleCA/PyAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXNldCB6LWluZGV4LiBDYWxsZWQgZnJvbSB7QGxpbmsgU2Nyb2xsTWFuYWdlcn1gLnJlbW92ZUl0ZW0oKWAuXG4gICAgICogQGphIHotaW5kZXgg44Gu44Oq44K744OD44OILiB7QGxpbmsgU2Nyb2xsTWFuYWdlcn1gLnJlbW92ZUl0ZW0oKWAg44GL44KJ44Kz44O844Or44GV44KM44KL44CCXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0RGVwdGgoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCd6LWluZGV4JywgdGhpcy5fb3duZXIub3B0aW9ucy5iYXNlRGVwdGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHByZXBhcmVCYXNlRWxlbWVudCgpOiBET00ge1xuICAgICAgICBsZXQgJGJhc2U6IERPTTtcbiAgICAgICAgY29uc3QgJHJlY3ljbGUgPSB0aGlzLl9vd25lci5maW5kUmVjeWNsZUVsZW1lbnRzKCkuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgaXRlbVRhZ05hbWUgPSB0aGlzLl9vd25lci5vcHRpb25zLml0ZW1UYWdOYW1lO1xuXG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ3RoaXMuXyRiYXNlIGlzIG5vdCBudWxsLicpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuXyRiYXNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCAkcmVjeWNsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICRiYXNlID0gJHJlY3ljbGU7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVBdHRyKCd6LWluZGV4Jyk7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUT0RPOiAg6KaB5qSc6KiOLiA8bGk+IOWFqOiIrOOBryA8c2xvdD4g44Go44Gp44Gu44KI44GG44Gr5Y2U6Kq/44GZ44KL44GLP1xuICAgICAgICAgICAgJGJhc2UgPSAkKGA8JHtpdGVtVGFnTmFtZX0gY2xhc3M9XCIke3RoaXMuX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTfVwiPjwvXCIke2l0ZW1UYWdOYW1lfVwiPmApO1xuICAgICAgICAgICAgJGJhc2UuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLiRzY3JvbGxNYXAuYXBwZW5kKCRiYXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOmrmOOBleOBruabtOaWsFxuICAgICAgICBpZiAoJGJhc2UuaGVpZ2h0KCkgIT09IHRoaXMuX2hlaWdodCkge1xuICAgICAgICAgICAgJGJhc2UuaGVpZ2h0KHRoaXMuX2hlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGJhc2U7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgpICE9PSBTdHJpbmcodGhpcy5faW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgsIHRoaXMuX2luZGV4ISk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVQYWdlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpICE9PSBTdHJpbmcodGhpcy5fcGFnZUluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9QQUdFX0lOREVYLCB0aGlzLl9wYWdlSW5kZXghKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZU9mZnNldCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl8kYmFzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX293bmVyLm9wdGlvbnMuZW5hYmxlVHJhbnNmb3JtT2Zmc2V0KSB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zbGF0ZVkgfSA9IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyh0aGlzLl8kYmFzZVswXSk7XG4gICAgICAgICAgICBpZiAodHJhbnNsYXRlWSAhPT0gdGhpcy5fb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlM2QoMCwke3RoaXMuX29mZnNldH1weCwwYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0b3AgPSBwYXJzZUludCh0aGlzLl8kYmFzZS5jc3MoJ3RvcCcpLCAxMCk7XG4gICAgICAgICAgICBpZiAodG9wICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RvcCcsIGAke3RoaXMuX29mZnNldH1weGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgYXQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vaXRlbSc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBvbmUgcGFnZSBvZiB0aGUgbGlzdC5cbiAqIEBqYSDjg6rjgrnjg4gx44Oa44O844K45YiG44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgUGFnZVByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcbiAgICAvKiogQGludGVybmFsIHBhZ2Ugb2Zmc2V0IGZyb20gdG9wICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIHBhZ2UncyBoZWlnaHQgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgaXRlbSdzIHByb2ZpbGUgbWFuYWdlZCB3aXRoIGluIHBhZ2UgKi9cbiAgICBwcml2YXRlIF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBzdGF0dXMgKi9cbiAgICBwcml2YXRlIF9zdGF0dXM6ICdhY3RpdmUnIHwgJ2luYWN0aXZlJyB8ICdoaWRkZW4nID0gJ2luYWN0aXZlJztcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIHBhZ2UgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIHBhZ2UgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2Ugb2Zmc2V0ICovXG4gICAgZ2V0IG9mZnNldCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIHBhZ2Ugb2Zmc2V0ICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBoZWlnaHQgKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBzdGF0dXMgKi9cbiAgICBnZXQgc3RhdHVzKCk6ICdhY3RpdmUnIHwgJ2luYWN0aXZlJyB8ICdoaWRkZW4nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnYWN0aXZlJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2FjdGl2ZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIHBhZ2UgaW52aXNpYmxlLlxuICAgICAqIEBqYSBwYWdlIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2hpZGRlbicgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2hpZGRlbic7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIHBhZ2UuXG4gICAgICogQGphIHBhZ2Ug44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaW5hY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdpbmFjdGl2ZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB7QGxpbmsgSXRlbVByb2ZpbGV9IHRvIHRoZSBwYWdlLlxuICAgICAqIEBqYSB7QGxpbmsgSXRlbVByb2ZpbGV9IOOBrui/veWKoFxuICAgICAqL1xuICAgIHB1YmxpYyBwdXNoKGl0ZW06IEl0ZW1Qcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2l0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIHRoaXMuX2hlaWdodCArPSBpdGVtLmhlaWdodDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSWYgYWxsIHtAbGluayBJdGVtUHJvZmlsZX0gdW5kZXIgdGhlIHBhZ2UgYXJlIG5vdCB2YWxpZCwgZGlzYWJsZSB0aGUgcGFnZSdzIHN0YXR1cy5cbiAgICAgKiBAamEg6YWN5LiL44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44GZ44G544Gm44GM5pyJ5Yq544Gn44Gq44GE5aC05ZCILCBwYWdlIOOCueODhuODvOOCv+OCueOCkueEoeWKueOBq+OBmeOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBub3JtYWxpemUoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuYWJsZUFsbCA9IHRoaXMuX2l0ZW1zLmV2ZXJ5KGl0ZW0gPT4gaXRlbS5pc0FjdGl2ZSgpKTtcbiAgICAgICAgaWYgKCFlbmFibGVBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXR1cyA9ICdpbmFjdGl2ZSc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBJdGVtUHJvZmlsZX0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumuOBl+OBpiB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtKGluZGV4OiBudW1iZXIpOiBJdGVtUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLl9pdGVtcywgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZmlyc3Qge0BsaW5rIEl0ZW1Qcm9maWxlfS5cbiAgICAgKiBAamEg5pyA5Yid44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW1GaXJzdCgpOiBJdGVtUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pdGVtc1swXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGxhc3Qge0BsaW5rIEl0ZW1Qcm9maWxlfS5cbiAgICAgKiBAamEg5pyA5b6M44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW1MYXN0KCk6IEl0ZW1Qcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zW3RoaXMuX2l0ZW1zLmxlbmd0aCAtIDFdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VSZXN1bHQsXG4gICAgdG9IZWxwU3RyaW5nLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2Jhc2UnO1xuaW1wb3J0IHR5cGUgeyBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvZXhwYW5kYWJsZS1jb250ZXh0JztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuLyoqXG4gKiBAZW4gVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIHN0b3JhZ2UgY2xhc3MgZm9yIGdyb3VwIG1hbmFnZW1lbnQgb2YgbGlzdCBpdGVtcy4gPGJyPlxuICogICAgIFRoaXMgY2xhc3MgZG9lcyBub3QgZGlyZWN0bHkgbWFuaXB1bGF0ZSB0aGUgRE9NLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOCkuOCsOODq+ODvOODl+euoeeQhuOBmeOCiyBVSSDmp4vpgKDmg4XloLHmoLzntI3jgq/jg6njgrkgPGJyPlxuICogICAgIOacrOOCr+ODqeOCueOBr+ebtOaOpeOBryBET00g44KS5pON5L2c44GX44Gq44GEXG4gKi9cbmV4cG9ydCBjbGFzcyBHcm91cFByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgcHJvZmlsZSBpZCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2lkOiBzdHJpbmc7XG4gICAgLyoqIEBpbnRlcm5hbCB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSBpbnN0YW5jZSovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQ7XG4gICAgLyoqIEBpbnRlcm5hbCBwYXJlbnQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgKi9cbiAgICBwcml2YXRlIF9wYXJlbnQ/OiBHcm91cFByb2ZpbGU7XG4gICAgLyoqIEBpbnRlcm5hbCBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBhcnJheSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2NoaWxkcmVuOiBHcm91cFByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiBAaW50ZXJuYWwgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzICovXG4gICAgcHJpdmF0ZSBfZXhwYW5kZWQgPSBmYWxzZTtcbiAgICAvKiogQGludGVybmFsIHJlZ2lzdHJhdGlvbiBzdGF0dXMgZm9yIF9vd25lciAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcgPSAndW5yZWdpc3RlcmVkJztcbiAgICAvKiogQGludGVybmFsIHN0b3JlZCB7QGxpbmsgSXRlbVByb2ZpbGV9IGluZm9ybWF0aW9uICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJRXhwYW5kYWJsZUxpc3RDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgaWQgb2YgdGhlIGluc3RhbmNlLiBzcGVjaWZpZWQgYnkgdGhlIGZyYW1ld29yay5cbiAgICAgKiAgLSBgamFgIOOCpOODs+OCueOCv+ODs+OCueOBriBJRC4g44OV44Os44O844Og44Ov44O844Kv44GM5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQsIGlkOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5faWQgICAgPSBpZDtcbiAgICAgICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IElELlxuICAgICAqIEBqYSBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBlbiBHZXQgc3RhdHVzLiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqIEBqYSDjgrnjg4bjg7zjgr/jgrnjgpLlj5blvpcgJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCdcbiAgICAgKi9cbiAgICBnZXQgc3RhdHVzKCk6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzLlxuICAgICAqIEBqYSDlsZXplovnirbmhYvjgpLliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleHBhbmRlZCwgY29sbGFwc2VkOiBjbG9zZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5bGV6ZaLLCBmYWxzZTog5Y+O5p2fXG4gICAgICovXG4gICAgZ2V0IGlzRXhwYW5kZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHBhbmRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg6KaqIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBwYXJlbnQoKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNoaWxkcmVuIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNoaWxkcmVuKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkcmVuO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbmV4dCBhdmFpbGFibGUgaW5kZXggb2YgdGhlIGxhc3QgaXRlbSBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDlvozjga4gaXRlbSDopoHntKDjga7mrKHjgavkvb/nlKjjgafjgY3jgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gd2l0aEFjdGl2ZUNoaWxkcmVuIFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHNlYXJjaCBpbmNsdWRpbmcgcmVnaXN0ZXJlZCBjaGlsZCBlbGVtZW50c1xuICAgICAqICAtIGBqYWAg55m76Yyy5riI44G/44Gu5a2Q6KaB57Sg44KS5ZCr44KB44Gm5qSc57Si44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGdldE5leHRJdGVtSW5kZXgod2l0aEFjdGl2ZUNoaWxkcmVuID0gZmFsc2UpOiBudW1iZXIge1xuICAgICAgICBsZXQgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgaWYgKHdpdGhBY3RpdmVDaGlsZHJlbikge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCA9PSBpdGVtcyB8fCBpdGVtcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLl9pdGVtcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGl0ZW1zW2l0ZW1zLmxlbmd0aCAtIDFdPy5pbmRleCA/PyAwKSArIDE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSDmnKwgR3JvdXBQcm9maWxlIOOBjOeuoeeQhuOBmeOCiyBpdGVtIOOCkuS9nOaIkOOBl+OBpueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkSXRlbShcbiAgICAgICAgaGVpZ2h0OiBudW1iZXIsXG4gICAgICAgIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG4gICAgICAgIGluZm86IFVua25vd25PYmplY3QsXG4gICAgKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBncm91cDogdGhpcyB9LCBpbmZvKTtcbiAgICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtUHJvZmlsZSh0aGlzLl9vd25lci5jb250ZXh0LCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBfb3duZXIg44Gu566h55CG5LiL44Gr44GC44KL44Go44GN44Gv6YCf44KE44GL44Gr6L+95YqgXG4gICAgICAgIGlmICgncmVnaXN0ZXJlZCcgPT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbSwgdGhpcy5nZXROZXh0SXRlbUluZGV4KCkpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faXRlbXMucHVzaChpdGVtKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBHcm91cFByb2ZpbGV9IGFzIGNoaWxkIGVsZW1lbnQuXG4gICAgICogQGphIOWtkOimgee0oOOBqOOBl+OBpiB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgLyBpbnN0YW5jZSBhcnJheVxuICAgICAqL1xuICAgIHB1YmxpYyBhZGRDaGlsZHJlbih0YXJnZXQ6IEdyb3VwUHJvZmlsZSB8IEdyb3VwUHJvZmlsZVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNoaWxkcmVuOiBHcm91cFByb2ZpbGVbXSA9IEFycmF5LmlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFt0YXJnZXRdO1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgICAgICBjaGlsZC5zZXRQYXJlbnQodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2hpbGRyZW4ucHVzaCguLi5jaGlsZHJlbik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgaXQgaGFzIGEgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgZ2V0IGhhc0NoaWxkcmVuKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9jaGlsZHJlbi5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwIGV4cGFuc2lvbi5cbiAgICAgKiBAamEg44Kw44Or44O844OX5bGV6ZaLXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGV4cGFuZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgncmVnaXN0ZXJlZCcpO1xuICAgICAgICAgICAgaWYgKDAgPCBpdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9vd25lci5zdGF0dXNTY29wZSgnZXhwYW5kaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbXMsIHRoaXMuZ2V0TmV4dEl0ZW1JbmRleCgpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5bGV6ZaL54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgY29sbGFwc2UuXG4gICAgICogQGphIOOCsOODq+ODvOODl+WPjuadn1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGNvbGxhcHNlKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgndW5yZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gdGhpcy5fb3duZXIuY29udGV4dC5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdjb2xsYXBzaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgaXRlbXNbMF0uaW5kZXggJiYgdGhpcy5fb3duZXIucmVtb3ZlSXRlbShpdGVtc1swXS5pbmRleCwgaXRlbXMubGVuZ3RoLCBkZWxheSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIOWtkOimgee0oOOBjOOBquOBj+OBpuOCguWPjuadn+eKtuaFi+OBq+OBmeOCi1xuICAgICAgICB0aGlzLl9leHBhbmRlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG93IHNlbGYgaW4gdmlzaWJsZSBhcmVhIG9mIGxpc3QuXG4gICAgICogQGphIOiHqui6q+OCkuODquOCueODiOOBruWPr+imlumgmOWfn+OBq+ihqOekulxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IG9wdGlvbidzIG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAobnVsbCAhPSB0aGlzLl9pdGVtc1swXS5pbmRleCkgJiYgYXdhaXQgdGhpcy5fb3duZXIuZW5zdXJlVmlzaWJsZSh0aGlzLl9pdGVtc1swXS5pbmRleCwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zPy5jYWxsYmFjaz8uKHRoaXMuX293bmVyLnNjcm9sbFBvcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVG9nZ2xlIGV4cGFuZCAvIGNvbGxhcHNlLlxuICAgICAqIEBqYSDplovplonjga7jg4jjgrDjg6tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSBzcGVudCByZW1vdmluZyBlbGVtZW50cy4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICogIC0gYGphYCDopoHntKDliYrpmaTjgavosrvjgoTjgZnpgYXlu7bmmYLplpMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyB0b2dnbGUoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2V4cGFuZGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNvbGxhcHNlKGRlbGF5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZXhwYW5kKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgdG8gbGlzdCB2aWV3LiBPbmx5IDFzdCBsYXllciBncm91cCBjYW4gYmUgcmVnaXN0ZXJlZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G455m76YyyLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/55m76Yyy5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIGluc2VydFRvXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGluc2VydGlvbiBwb3NpdGlvbiB3aXRoIGluZGV4XG4gICAgICogIC0gYGphYCDmjL/lhaXkvY3nva7jgpIgaW5kZXgg44Gn5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlZ2lzdGVyKGluc2VydFRvOiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gJ0dyb3VwUHJvZmlsZSNyZWdpc3RlcicgbWV0aG9kIGlzIGFjY2VwdGFibGUgb25seSAxc3QgbGF5ZXIgZ3JvdXAuYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbSh0aGlzLnByZXByb2Nlc3MoJ3JlZ2lzdGVyZWQnKSwgaW5zZXJ0VG8pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdG9yZSB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSBzcGVjaWZpZWQuXG4gICAgICogQGphIOODquOCueODiOODk+ODpeODvOOBuOW+qeWFgy4g56ysMemajuWxpOOCsOODq+ODvOODl+OBruOBv+aMh+ekuuWPr+iDvS5cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzdG9yZSgpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gJ0dyb3VwUHJvZmlsZSNyZXN0b3JlJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMuX2V4cGFuZGVkID8gdGhpcy5faXRlbXMuY29uY2F0KHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ2FjdGl2ZScpKSA6IHRoaXMuX2l0ZW1zLnNsaWNlKCk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsIOimqiBHcm91cCDmjIflrpogKi9cbiAgICBwcml2YXRlIHNldFBhcmVudChwYXJlbnQ6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAgcmVnaXN0ZXIgLyB1bnJlZ2lzdGVyIOOBruWJjeWHpueQhiAqL1xuICAgIHByaXZhdGUgcHJlcHJvY2VzcyhuZXdTdGF0dXM6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnKTogSXRlbVByb2ZpbGVbXSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGlmIChuZXdTdGF0dXMgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgaXRlbXMucHVzaCguLi50aGlzLl9pdGVtcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gbmV3U3RhdHVzO1xuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCDmk43kvZzlr77osaHjga4gSXRlbVByb2ZpbGUg6YWN5YiX44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBxdWVyeU9wZXJhdGlvblRhcmdldChvcGVyYXRpb246ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnIHwgJ2FjdGl2ZScpOiBJdGVtUHJvZmlsZVtdIHtcbiAgICAgICAgY29uc3QgZmluZFRhcmdldHMgPSAoZ3JvdXA6IEdyb3VwUHJvZmlsZSk6IEl0ZW1Qcm9maWxlW10gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZ3JvdXAuX2NoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVnaXN0ZXJlZCc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VucmVnaXN0ZXJlZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkLnByZXByb2Nlc3Mob3BlcmF0aW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWN0aXZlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNoaWxkLl9pdGVtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGQuX2l0ZW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIG9wZXJhdGlvbjogJHtvcGVyYXRpb259YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5maW5kVGFyZ2V0cyhjaGlsZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZpbmRUYXJnZXRzKHRoaXMpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFZpZXcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBvd25lcjogSUxpc3RWaWV3O1xuICAgIHJlYWRvbmx5IGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayBMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDmp4vnr4njgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgb3duZXI6IElMaXN0VmlldztcbiAgICBpdGVtOiBJdGVtUHJvZmlsZTtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBpdGVtIGNvbnRhaW5lciBjbGFzcyBoYW5kbGVkIGJ5IHtAbGluayBMaXN0Vmlld30uXG4gKiBAamEge0BsaW5rIExpc3RWaWV3fSDjgYzmibHjgYbjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgrPjg7Pjg4bjg4rjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpc3RJdGVtVmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElMaXN0SXRlbVZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgeyBvd25lciwgaXRlbSB9ID0gb3B0aW9ucztcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBvd25lcixcbiAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKiogT3duZXIg5Y+W5b6XICovXG4gICAgZ2V0IG93bmVyKCk6IElMaXN0VmlldyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5vd25lcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBWaWV3IGNvbXBvbmVudCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuJGVsLmNoaWxkcmVuKCkucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xuICAgICAgICAvLyB0aGlzLiRlbCDjga/lho3liKnnlKjjgZnjgovjgZ/jgoHlrozlhajjgarnoLTmo4Tjga/jgZfjgarjgYRcbiAgICAgICAgdGhpcy5zZXRFbGVtZW50KCdudWxsJyk7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEl0ZW1WaWV3XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IG93biBpdGVtIGluZGV4XG4gICAgICogQGphIOiHqui6q+OBriBpdGVtIOOCpOODs+ODh+ODg+OCr+OCueOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uaXRlbS5pbmRleCE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBzcGVjaWZpZWQgaGVpZ2h0LlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/pq5jjgZXjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLmhlaWdodDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgaWYgY2hpbGQgbm9kZSBleGlzdHMuXG4gICAgICogQGphIGNoaWxkIG5vZGUg44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGhhc0NoaWxkTm9kZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy4kZWw/LmNoaWxkcmVuKCkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaXRlbSdzIGhlaWdodC5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXjgpLmm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdIZWlnaHRcbiAgICAgKiAgLSBgZW5gIG5ldyBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaWsOOBl+OBhOmrmOOBlVxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB1cGRhdGUgb3B0aW9ucyBvYmplY3RcbiAgICAgKiAgLSBgamFgIOabtOaWsOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHVwZGF0ZUhlaWdodChuZXdIZWlnaHQ6IG51bWJlciwgb3B0aW9ucz86IExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy4kZWwgJiYgdGhpcy5oZWlnaHQgIT09IG5ld0hlaWdodCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uaXRlbS51cGRhdGVIZWlnaHQobmV3SGVpZ2h0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmhlaWdodChuZXdIZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBOdWxsYWJsZSxcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICB0eXBlIENvbm5lY3RFdmVudE1hcCxcbiAgICB0eXBlIFRpbWVySGFuZGxlLFxuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RTY3JvbGxlckZhY3RvcnksXG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0U2Nyb2xsZXIsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG50eXBlIFNjcm9sbGVyRXZlbnRNYXAgPSBIVE1MRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwICYgeyAnc2Nyb2xsc3RvcCc6IEV2ZW50OyB9O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBNSU5fU0NST0xMU1RPUF9EVVJBVElPTiA9IDUwLFxufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIHtAbGluayBJTGlzdFNjcm9sbGVyfSBpbXBsZW1lbnRhdGlvbiBjbGFzcyBmb3IgSFRNTEVsZW1lbnQuXG4gKiBAamEgSFRNTEVsZW1lbnQg44KS5a++6LGh44Go44GX44GfIHtAbGluayBJTGlzdFNjcm9sbGVyfSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEVsZW1lbnRTY3JvbGxlciBpbXBsZW1lbnRzIElMaXN0U2Nyb2xsZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyR0YXJnZXQ6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kc2Nyb2xsTWFwOiBET007XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbFN0b3BUcmlnZ2VyOiBET01FdmVudExpc3RlbmVyO1xuICAgIHByaXZhdGUgX3Njcm9sbER1cmF0aW9uPzogbnVtYmVyO1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodGFyZ2V0OiBET01TZWxlY3RvciwgbWFwOiBET01TZWxlY3Rvciwgb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQgPSAkKHRhcmdldCk7XG4gICAgICAgIHRoaXMuXyRzY3JvbGxNYXAgPSB0aGlzLl8kdGFyZ2V0LmNoaWxkcmVuKCkuZmlyc3QoKTtcbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICAgICAgLypcbiAgICAgICAgICogZmlyZSBjdXN0b20gZXZlbnQ6IGBzY3JvbGxzdG9wYFxuICAgICAgICAgKiBgc2Nyb2xsZW5kYCDjga4gU2FmYXJpIOWvvuW/nOW+heOBoVxuICAgICAgICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvRWxlbWVudC9zY3JvbGxlbmRfZXZlbnRcbiAgICAgICAgICovXG4gICAgICAgIGxldCB0aW1lcjogVGltZXJIYW5kbGU7XG4gICAgICAgIHRoaXMuX3Njcm9sbFN0b3BUcmlnZ2VyID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gdGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kdGFyZ2V0LnRyaWdnZXIobmV3IEN1c3RvbUV2ZW50KCdzY3JvbGxzdG9wJywgeyBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH0pKTtcbiAgICAgICAgICAgIH0sIHRoaXMuX3Njcm9sbER1cmF0aW9uID8/IENvbnN0Lk1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqIOOCv+OCpOODl+Wumue+qeitmOWIpeWtkCAqL1xuICAgIHN0YXRpYyBnZXQgVFlQRSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ2NkcDplbGVtZW50LW92ZXJmbG93LXNjcm9sbGVyJztcbiAgICB9XG5cbiAgICAvKiogZmFjdG9yeSDlj5blvpcgKi9cbiAgICBzdGF0aWMgZ2V0RmFjdG9yeSgpOiBMaXN0U2Nyb2xsZXJGYWN0b3J5IHtcbiAgICAgICAgY29uc3QgZmFjdG9yeSA9ICh0YXJnZXQ6IERPTVNlbGVjdG9yLCBtYXA6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpOiBJTGlzdFNjcm9sbGVyID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRWxlbWVudFNjcm9sbGVyKHRhcmdldCwgbWFwLCBvcHRpb25zKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gc2V0IHR5cGUgc2lnbmF0dXJlLlxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhmYWN0b3J5LCB7XG4gICAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogRWxlbWVudFNjcm9sbGVyLlRZUEUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhY3RvcnkgYXMgTGlzdFNjcm9sbGVyRmFjdG9yeTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGVyXG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu5Z6L5oOF5aCx44KS5Y+W5b6XICovXG4gICAgZ2V0IHR5cGUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIEVsZW1lbnRTY3JvbGxlci5UWVBFO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7lj5blvpcgKi9cbiAgICBnZXQgcG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kdGFyZ2V0LnNjcm9sbFRvcCgpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vmnIDlpKflgKTkvY3nva7jgpLlj5blvpcgKi9cbiAgICBnZXQgcG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLl8kc2Nyb2xsTWFwLmhlaWdodCgpIC0gdGhpcy5fJHRhcmdldC5oZWlnaHQoKSwgMCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOeZu+mMsiAqL1xuICAgIG9uKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uPFNjcm9sbGVyRXZlbnRNYXA+KHR5cGUsIGNhbGxiYWNrIGFzIFVua25vd25GdW5jdGlvbik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOeZu+mMsuino+mZpCAqL1xuICAgIG9mZih0eXBlOiAnc2Nyb2xsJyB8ICdzY3JvbGxzdG9wJywgY2FsbGJhY2s6IERPTUV2ZW50TGlzdGVuZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vZmY8U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChwb3MgPT09IHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxEdXJhdGlvbiA9IChhbmltYXRlID8/IHRoaXMuX29wdGlvbnMuZW5hYmxlQW5pbWF0aW9uKSA/IHRpbWUgPz8gdGhpcy5fb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbiA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKHBvcywgdGhpcy5fc2Nyb2xsRHVyYXRpb24sIHVuZGVmaW5lZCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu54q25oWL5pu05pawICovXG4gICAgdXBkYXRlKCk6IHZvaWQge1xuICAgICAgICAvLyBub29wXG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOOBruegtOajhCAqL1xuICAgIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQ/Lm9mZigpO1xuICAgICAgICAodGhpcy5fJHRhcmdldCBhcyBOdWxsYWJsZTxET00+KSA9ICh0aGlzLl8kc2Nyb2xsTWFwIGFzIE51bGxhYmxlPERPTT4pID0gbnVsbDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgcG9zdCxcbiAgICBub29wLFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VSZXN1bHQsXG4gICAgdG9IZWxwU3RyaW5nLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHtcbiAgICBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMsXG4gICAgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbixcbiAgICBjbGVhclRyYW5zaXRpb24sXG59IGZyb20gJ0BjZHAvdWktdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zLFxuICAgIElMaXN0U2Nyb2xsZXIsXG4gICAgSUxpc3RPcGVyYXRpb24sXG4gICAgSUxpc3RTY3JvbGxhYmxlLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgTGlzdFZpZXdHbG9iYWxDb25maWcgfSBmcm9tICcuLi9nbG9iYWwtY29uZmlnJztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlLCBQYWdlUHJvZmlsZSB9IGZyb20gJy4uL3Byb2ZpbGUnO1xuaW1wb3J0IHsgRWxlbWVudFNjcm9sbGVyIH0gZnJvbSAnLi9lbGVtZW50LXNjcm9sbGVyJztcblxuLyoqIExpc3RDb250ZXh0T3B0aW9ucyDml6LlrprlgKQgKi9cbmNvbnN0IF9kZWZhdWx0T3B0czogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPiA9IHtcbiAgICBzY3JvbGxlckZhY3Rvcnk6IEVsZW1lbnRTY3JvbGxlci5nZXRGYWN0b3J5KCksXG4gICAgZW5hYmxlSGlkZGVuUGFnZTogZmFsc2UsXG4gICAgZW5hYmxlVHJhbnNmb3JtT2Zmc2V0OiBmYWxzZSxcbiAgICBzY3JvbGxNYXBSZWZyZXNoSW50ZXJ2YWw6IDIwMCxcbiAgICBzY3JvbGxSZWZyZXNoRGlzdGFuY2U6IDIwMCxcbiAgICBwYWdlUHJlcGFyZUNvdW50OiAzLFxuICAgIHBhZ2VQcmVsb2FkQ291bnQ6IDEsXG4gICAgZW5hYmxlQW5pbWF0aW9uOiB0cnVlLFxuICAgIGFuaW1hdGlvbkR1cmF0aW9uOiAwLFxuICAgIGJhc2VEZXB0aDogJ2F1dG8nLFxuICAgIGl0ZW1UYWdOYW1lOiAnZGl2JyxcbiAgICByZW1vdmVJdGVtV2l0aFRyYW5zaXRpb246IHRydWUsXG4gICAgdXNlRHVtbXlJbmFjdGl2ZVNjcm9sbE1hcDogZmFsc2UsXG59O1xuXG4vKiogaW52YWxpZCBpbnN0YW5jZSAqL1xuY29uc3QgXyRpbnZhbGlkID0gJCgpIGFzIERPTTtcblxuLyoqIOWIneacn+WMlua4iOOBv+OBi+aknOiovCAqL1xuZnVuY3Rpb24gdmVyaWZ5PFQ+KHg6IFQgfCB1bmRlZmluZWQpOiBhc3NlcnRzIHggaXMgVCB7XG4gICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04pO1xuICAgIH1cbn1cblxuLyoqIG92ZXJmbG93LXkg44KS5L+d6Ki8ICovXG5mdW5jdGlvbiBlbnN1cmVPdmVyZmxvd1koJGVsOiBET00pOiBET00ge1xuICAgIGNvbnN0IG92ZXJmbG93WSA9ICRlbC5jc3MoJ292ZXJmbG93LXknKTtcbiAgICBpZiAoJ2hpZGRlbicgPT09IG92ZXJmbG93WSB8fCAndmlzaWJsZScgPT09IG92ZXJmbG93WSkge1xuICAgICAgICAkZWwuY3NzKCdvdmVyZmxvdy15JywgJ2F1dG8nKTtcbiAgICB9XG4gICAgcmV0dXJuICRlbDtcbn1cblxuLyoqIHNjcm9sbC1tYXAgZWxlbWVudCDjgpLkv53oqLwgKi9cbmZ1bmN0aW9uIGVuc3VyZVNjcm9sbE1hcCgkcm9vdDogRE9NLCBtYXBDbGFzczogc3RyaW5nKTogRE9NIHtcbiAgICBsZXQgJG1hcCA9ICRyb290LmZpbmQoYC4ke21hcENsYXNzfWApO1xuICAgIC8vICRtYXAg44GM54Sh44GE5aC05ZCI44Gv5L2c5oiQ44GZ44KLXG4gICAgaWYgKCRtYXAubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgJG1hcCA9ICQoYDxkaXYgY2xhc3M9XCIke21hcENsYXNzfVwiPjwvZGl2PmApO1xuICAgICAgICAkcm9vdC5hcHBlbmQoJG1hcCk7XG4gICAgfVxuICAgIHJldHVybiAkbWFwO1xufVxuXG4vKiogQGludGVybmFsIOOCouOCpOODhuODoOWJiumZpOaDheWgsSAqL1xuaW50ZXJmYWNlIFJlbW92ZUl0ZW1zQ29udGV4dCB7XG4gICAgcmVtb3ZlZDogSXRlbVByb2ZpbGVbXTtcbiAgICBkZWx0YTogbnVtYmVyO1xuICAgIHRyYW5zaXRpb246IGJvb2xlYW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIENvcmUgbG9naWMgaW1wbGVtZW50YXRpb24gY2xhc3MgZm9yIHNjcm9sbCBwcm9jZXNzaW5nIHRoYXQgbWFuYWdlcyBtZW1vcnkuIEFjY2Vzc2VzIHRoZSBET00uXG4gKiBAamEg44Oh44Oi44Oq566h55CG44KS6KGM44GG44K544Kv44Ot44O844Or5Yem55CG44Gu44Kz44Ki44Ot44K444OD44Kv5a6f6KOF44Kv44Op44K5LiBET00g44Gr44Ki44Kv44K744K544GZ44KLLlxuICovXG5leHBvcnQgY2xhc3MgTGlzdENvcmUgaW1wbGVtZW50cyBJTGlzdENvbnRleHQsIElMaXN0T3BlcmF0aW9uLCBJTGlzdFNjcm9sbGFibGUsIElMaXN0QmFja3VwUmVzdG9yZSB7XG4gICAgcHJpdmF0ZSBfJHJvb3Q6IERPTTtcbiAgICBwcml2YXRlIF8kbWFwOiBET007XG4gICAgcHJpdmF0ZSBfbWFwSGVpZ2h0ID0gMDtcbiAgICBwcml2YXRlIF9zY3JvbGxlcjogSUxpc3RTY3JvbGxlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKiBVSSDooajnpLrkuK3jgasgdHJ1ZSAqL1xuICAgIHByaXZhdGUgX2FjdGl2ZSA9IHRydWU7XG5cbiAgICAvKiog5Yid5pyf44Kq44OX44K344On44Oz44KS5qC857SNICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2V0dGluZ3M6IFJlcXVpcmVkPExpc3RDb250ZXh0T3B0aW9ucz47XG4gICAgLyoqIFNjcm9sbCBFdmVudCBIYW5kbGVyICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogU2Nyb2xsIFN0b3AgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbFN0b3BFdmVudEhhbmRsZXI6IChldj86IEV2ZW50KSA9PiB2b2lkO1xuICAgIC8qKiAx44Oa44O844K45YiG44Gu6auY44GV44Gu5Z+65rqW5YCkICovXG4gICAgcHJpdmF0ZSBfYmFzZUhlaWdodCA9IDA7XG4gICAgLyoqIOeuoeeQhuS4i+OBq+OBguOCiyBJdGVtUHJvZmlsZSDphY3liJcgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgUGFnZVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfcGFnZXM6IFBhZ2VQcm9maWxlW10gPSBbXTtcblxuICAgIC8qKiDmnIDmlrDjga7ooajnpLrpoJjln5/mg4XloLHjgpLmoLzntI0gKFNjcm9sbCDkuK3jga7mm7TmlrDlh6bnkIbjgavkvb/nlKgpICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0ID0ge1xuICAgICAgICBpbmRleDogMCxcbiAgICAgICAgZnJvbTogMCxcbiAgICAgICAgdG86IDAsXG4gICAgICAgIHBvczogMCwgICAgLy8gc2Nyb2xsIHBvc2l0aW9uXG4gICAgfTtcblxuICAgIC8qKiDjg4fjg7zjgr/jga4gYmFja3VwIOmgmOWfny4ga2V5IOOBqCBfaXRlbXMg44KS5qC857SNICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYmFja3VwOiBSZWNvcmQ8c3RyaW5nLCB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9PiA9IHt9O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RDb250ZXh0T3B0aW9ucykge1xuICAgICAgICB0aGlzLl8kcm9vdCA9IHRoaXMuXyRtYXAgPSBfJGludmFsaWQ7XG4gICAgICAgIHRoaXMuX3NldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgX2RlZmF1bHRPcHRzLCBvcHRpb25zKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uU2Nyb2xsKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbFN0b3AodGhpcy5fc2Nyb2xsZXIhLnBvcyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKiog5YaF6YOo44Kq44OW44K444Kn44Kv44OI44Gu5Yid5pyf5YyWICovXG4gICAgcHVibGljIGluaXRpYWxpemUoJHJvb3Q6IERPTSwgaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgLy8g5pei44Gr5qeL56+J44GV44KM44Gm44GE44Gf5aC05ZCI44Gv56C05qOEXG4gICAgICAgIGlmICh0aGlzLl8kcm9vdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fJHJvb3QgPSBlbnN1cmVPdmVyZmxvd1koJHJvb3QpO1xuICAgICAgICB0aGlzLl8kbWFwICA9IGVuc3VyZVNjcm9sbE1hcCh0aGlzLl8kcm9vdCwgdGhpcy5fY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1MpO1xuXG4gICAgICAgIHRoaXMuX3Njcm9sbGVyID0gdGhpcy5jcmVhdGVTY3JvbGxlcigpO1xuICAgICAgICB0aGlzLnNldEJhc2VIZWlnaHQoaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5zZXRTY3JvbGxlckNvbmRpdGlvbigpO1xuICAgIH1cblxuICAgIC8qKiDlhoXpg6jjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4QgKi9cbiAgICBwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5yZXNldFNjcm9sbGVyQ29uZGl0aW9uKCk7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5kZXN0cm95KCk7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSB0aGlzLl8kbWFwID0gXyRpbnZhbGlkO1xuICAgIH1cblxuICAgIC8qKiDjg5rjg7zjgrjjga7ln7rmupblgKTjgpLlj5blvpcgKi9cbiAgICBwdWJsaWMgc2V0QmFzZUhlaWdodChoZWlnaHQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAoaGVpZ2h0IDw9IDApIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtiYXNlIGhpZ2h0OiAke2hlaWdodH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9iYXNlSGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8udXBkYXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIGFjdGl2ZSDnirbmhYvoqK3lrpogKi9cbiAgICBwdWJsaWMgYXN5bmMgc2V0QWN0aXZlU3RhdGUoYWN0aXZlOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuX2FjdGl2ZSA9IGFjdGl2ZTtcbiAgICAgICAgYXdhaXQgdGhpcy50cmVhdFNjcm9sbFBvc2l0aW9uKCk7XG4gICAgfVxuXG4gICAgLyoqIGFjdGl2ZSDnirbmhYvliKTlrpogKi9cbiAgICBnZXQgYWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWN0aXZlO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7kv53lrZgv5b6p5YWDICovXG4gICAgcHVibGljIGFzeW5jIHRyZWF0U2Nyb2xsUG9zaXRpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gKHRoaXMuX3Njcm9sbGVyLnBvcyAtIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MpO1xuICAgICAgICBjb25zdCB7IHVzZUR1bW15SW5hY3RpdmVTY3JvbGxNYXA6IHVzZUR1bW15TWFwIH0gPSB0aGlzLl9zZXR0aW5ncztcblxuICAgICAgICBjb25zdCB1cGRhdGVPZmZzZXQgPSAoJHRhcmdldDogRE9NKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zbGF0ZVkgfSA9IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcygkdGFyZ2V0WzBdKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQgIT09IHRyYW5zbGF0ZVkpIHtcbiAgICAgICAgICAgICAgICAkdGFyZ2V0LmNzcygndHJhbnNmb3JtJywgYHRyYW5zbGF0ZTNkKDAsJHtvZmZzZXR9cHgsMGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Njcm9sbGVyLnNjcm9sbFRvKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MsIGZhbHNlLCAwKTtcbiAgICAgICAgICAgIHRoaXMuXyRtYXAuY3NzKHsgJ3RyYW5zZm9ybSc6ICcnLCAnZGlzcGxheSc6ICdibG9jaycgfSk7XG4gICAgICAgICAgICBpZiAodXNlRHVtbXlNYXApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXBhcmVJbmFjdGl2ZU1hcCgpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgJG1hcCA9IHVzZUR1bW15TWFwID8gdGhpcy5wcmVwYXJlSW5hY3RpdmVNYXAoKSA6IHRoaXMuXyRtYXA7XG4gICAgICAgICAgICB1cGRhdGVPZmZzZXQoJG1hcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdENvbnRleHRcblxuICAgIC8qKiBnZXQgc2Nyb2xsLW1hcCBlbGVtZW50ICovXG4gICAgZ2V0ICRzY3JvbGxNYXAoKTogRE9NIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXA7XG4gICAgfVxuXG4gICAgLyoqIGdldCBzY3JvbGwtbWFwIGhlaWdodCBbcHhdICovXG4gICAgZ2V0IHNjcm9sbE1hcEhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcC5sZW5ndGggPyB0aGlzLl9tYXBIZWlnaHQgOiAwO1xuICAgIH1cblxuICAgIC8qKiBnZXQge0BsaW5rIExpc3RDb250ZXh0T3B0aW9uc30gKi9cbiAgICBnZXQgb3B0aW9ucygpOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiB1cGRhdGUgc2Nyb2xsLW1hcCBoZWlnaHQgKGRlbHRhIFtweF0pICovXG4gICAgdXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRtYXAubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9tYXBIZWlnaHQgKz0gTWF0aC50cnVuYyhkZWx0YSk7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlLlxuICAgICAgICAgICAgaWYgKHRoaXMuX21hcEhlaWdodCA8IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tYXBIZWlnaHQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQodGhpcy5fbWFwSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiB1cGRhdGUgaW50ZXJuYWwgcHJvZmlsZSAqL1xuICAgIHVwZGF0ZVByb2ZpbGVzKGZyb206IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IF9pdGVtcyB9ID0gdGhpcztcbiAgICAgICAgZm9yIChsZXQgaSA9IGZyb20sIG4gPSBfaXRlbXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoMCA8IGkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gX2l0ZW1zW2kgLSAxXTtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSBsYXN0LmluZGV4ISArIDE7XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLm9mZnNldCA9IGxhc3Qub2Zmc2V0ICsgbGFzdC5oZWlnaHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLm9mZnNldCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZ2V0IHJlY3ljbGFibGUgZWxlbWVudCAqL1xuICAgIGZpbmRSZWN5Y2xlRWxlbWVudHMoKTogRE9NIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXAuZmluZChgLiR7dGhpcy5fY29uZmlnLlJFQ1lDTEVfQ0xBU1N9YCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RWaWV3XG5cbiAgICAvKiog5Yid5pyf5YyW5riI44G/44GL5Yik5a6aICovXG4gICAgZ2V0IGlzSW5pdGlhbGl6ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX3Njcm9sbGVyO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAqL1xuICAgIGFkZEl0ZW0oaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIGluZm86IFVua25vd25PYmplY3QsIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2FkZEl0ZW0obmV3IEl0ZW1Qcm9maWxlKHRoaXMsIE1hdGgudHJ1bmMoaGVpZ2h0KSwgaW5pdGlhbGl6ZXIsIGluZm8pLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqIGl0ZW0g55m76YyyICjlhoXpg6jnlKgpICovXG4gICAgX2FkZEl0ZW0oaXRlbTogSXRlbVByb2ZpbGUgfCBJdGVtUHJvZmlsZVtdLCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IEFycmF5LmlzQXJyYXkoaXRlbSkgPyBpdGVtIDogW2l0ZW1dO1xuICAgICAgICBsZXQgZGVsdGFIZWlnaHQgPSAwO1xuICAgICAgICBsZXQgYWRkVGFpbCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChudWxsID09IGluc2VydFRvIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluc2VydFRvKSB7XG4gICAgICAgICAgICBpbnNlcnRUbyA9IHRoaXMuX2l0ZW1zLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbnNlcnRUbyA9PT0gdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhZGRUYWlsID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNjcm9sbCBtYXAg44Gu5pu05pawXG4gICAgICAgIGZvciAoY29uc3QgaXQgb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGRlbHRhSGVpZ2h0ICs9IGl0LmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YUhlaWdodCk7XG5cbiAgICAgICAgLy8g5oy/5YWlXG4gICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpbnNlcnRUbywgMCwgLi4uaXRlbXMpO1xuXG4gICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgIGlmICghYWRkVGFpbCkge1xuICAgICAgICAgICAgaWYgKDAgPT09IGluc2VydFRvKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpbnNlcnRUbyAtIDFdLnBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKHRoaXMuX2l0ZW1zW2luc2VydFRvIC0gMV0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgdGhpcy51cGRhdGVQcm9maWxlcyhpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpCAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciwgc2l6ZT86IG51bWJlciwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyIHwgbnVtYmVyW10sIGFyZzI/OiBudW1iZXIsIGFyZzM/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVJdGVtUmFuZG9tbHkoaW5kZXgsIGFyZzIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSXRlbUNvbnRpbnVvdXNseShpbmRleCwgYXJnMiwgYXJnMyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogaGVscGVyOiDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7ogKi9cbiAgICBwcml2YXRlIF9xdWVyeVJlbW92ZUl0ZW1zQ29udGV4dChpbmRleGVzOiBudW1iZXJbXSwgZGVsYXk6IG51bWJlcik6IFJlbW92ZUl0ZW1zQ29udGV4dCB7XG4gICAgICAgIGNvbnN0IHJlbW92ZWQ6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgbGV0IGRlbHRhID0gMDtcbiAgICAgICAgbGV0IHRyYW5zaXRpb24gPSBmYWxzZTtcblxuICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5faXRlbXNbaWR4XTtcbiAgICAgICAgICAgIGRlbHRhICs9IGl0ZW0uaGVpZ2h0O1xuICAgICAgICAgICAgLy8g5YmK6Zmk6KaB57Sg44GuIHotaW5kZXgg44Gu5Yid5pyf5YyWXG4gICAgICAgICAgICBpdGVtLnJlc2V0RGVwdGgoKTtcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChpdGVtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyDoh6rli5XoqK3lrprjg7vliYrpmaTpgYXlu7bmmYLplpPjgYzoqK3lrprjgZXjgozjgYvjgaTjgIHjgrnjgq/jg63jg7zjg6vjg53jgrjjgrfjg6fjg7PjgavlpInmm7TjgYzjgYLjgovloLTlkIjjga8gdHJhbnNpdGlvbiDoqK3lrppcbiAgICAgICAgaWYgKHRoaXMuX3NldHRpbmdzLnJlbW92ZUl0ZW1XaXRoVHJhbnNpdGlvbiAmJiAoMCA8IGRlbGF5KSkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IHRoaXMuc2Nyb2xsUG9zO1xuICAgICAgICAgICAgY29uc3QgcG9zTWF4ID0gdGhpcy5zY3JvbGxQb3NNYXggLSBkZWx0YTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24gPSAocG9zTWF4IDwgY3VycmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyByZW1vdmVkLCBkZWx0YSwgdHJhbnNpdGlvbiB9O1xuICAgIH1cblxuICAgIC8qKiBoZWxwZXI6IOWJiumZpOaZguOBruabtOaWsCAqL1xuICAgIHByaXZhdGUgX3VwZGF0ZVdpdGhSZW1vdmVJdGVtc0NvbnRleHQoY29udGV4dDogUmVtb3ZlSXRlbXNDb250ZXh0LCBkZWxheTogbnVtYmVyLCBwcm9maWxlVXBkYXRlOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgcmVtb3ZlZCwgZGVsdGEsIHRyYW5zaXRpb24gfSA9IGNvbnRleHQ7XG5cbiAgICAgICAgLy8gdHJhbnNpdGlvbiDoqK3lrppcbiAgICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dXBTY3JvbGxNYXBUcmFuc2l0aW9uKGRlbGF5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGN1c3RvbWl6ZSBwb2ludDog44OX44Ot44OV44Kh44Kk44Or44Gu5pu05pawXG4gICAgICAgIHByb2ZpbGVVcGRhdGUoKTtcblxuICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vpoJjln5/jga7mm7TmlrBcbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxNYXBIZWlnaHQoLWRlbHRhKTtcbiAgICAgICAgLy8g6YGF5bu25YmK6ZmkXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHJlbW92ZWQpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZGVsYXkpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbVByb2ZpbGUg44KS5YmK6ZmkOiDpgKPntpogaW5kZXgg54mIICovXG4gICAgcHJpdmF0ZSBfcmVtb3ZlSXRlbUNvbnRpbnVvdXNseShpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIgfCB1bmRlZmluZWQsIGRlbGF5OiBudW1iZXIgfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICAgICAgc2l6ZSA9IHNpemUgPz8gMTtcbiAgICAgICAgZGVsYXkgPSBkZWxheSA/PyAwO1xuXG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5faXRlbXMubGVuZ3RoIDwgaW5kZXggKyBzaXplKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbcmVtb3ZlSXRlbSgpLCBpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6XG4gICAgICAgIGNvbnN0IGluZGV4ZXMgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiBzaXplIH0sIChfLCBpKSA9PiBpbmRleCArIGkpO1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlcywgZGVsYXkpO1xuXG4gICAgICAgIC8vIOabtOaWsFxuICAgICAgICB0aGlzLl91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQsIGRlbGF5LCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaW5kZXhdLnBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKHRoaXMuX2l0ZW1zW2luZGV4XS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g6YWN5YiX44GL44KJ5YmK6ZmkXG4gICAgICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaW5kZXgsIHNpemUpO1xuICAgICAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9maWxlcyhpbmRleCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbVByb2ZpbGUg44KS5YmK6ZmkOiByYW5kb20gYWNjZXNzIOeJiCAqL1xuICAgIHByaXZhdGUgX3JlbW92ZUl0ZW1SYW5kb21seShpbmRleGVzOiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgZGVsYXkgPSBkZWxheSA/PyAwO1xuICAgICAgICBpbmRleGVzLnNvcnQoKGxocywgcmhzKSA9PiByaHMgLSBsaHMpOyAvLyDpmY3poIbjgr3jg7zjg4hcblxuICAgICAgICBmb3IgKGNvbnN0IGluZGV4IG9mIGluZGV4ZXMpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5faXRlbXMubGVuZ3RoIDwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtyZW1vdmVJdGVtKCksIGludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9xdWVyeVJlbW92ZUl0ZW1zQ29udGV4dChpbmRleGVzLCBkZWxheSk7XG5cbiAgICAgICAgLy8g5pu05pawXG4gICAgICAgIHRoaXMuX3VwZGF0ZVdpdGhSZW1vdmVJdGVtc0NvbnRleHQoY29udGV4dCwgZGVsYXksICgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaWR4IG9mIGluZGV4ZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2lkeF0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKHRoaXMuX2l0ZW1zW2lkeF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8g6YWN5YiX44GL44KJ5YmK6ZmkXG4gICAgICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IGluZGV4ZXNbaW5kZXhlcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoZmlyc3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiogc2Nyb2xsIG1hcCDjga7jg4jjg6njg7Pjgrjjgrfjg6fjg7PoqK3lrpogKi9cbiAgICBwcml2YXRlIHNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG4gICAgICAgIGNvbnN0IGVsID0gdGhpcy5fJG1hcFswXTtcbiAgICAgICAgdGhpcy5fJG1hcC50cmFuc2l0aW9uRW5kKCgpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVHJhbnNpdGlvbihlbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uKGVsLCAnaGVpZ2h0JywgZGVsYXksICdlYXNlJyk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBpdGVtIOOBq+ioreWumuOBl+OBn+aDheWgseOCkuWPluW+lyAqL1xuICAgIGdldEl0ZW1JbmZvKHRhcmdldDogbnVtYmVyIHwgRXZlbnQpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgY29uc3QgeyBfaXRlbXMsIF9jb25maWcgfSA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgcGFyc2VyID0gKCR0YXJnZXQ6IERPTSk6IG51bWJlciA9PiB7XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5oYXNDbGFzcyhfY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlcigkdGFyZ2V0LmF0dHIoX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHRhcmdldC5oYXNDbGFzcyhfY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1MpIHx8ICR0YXJnZXQubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2Nhbm5vdCBkaXRlY3QgaXRlbSBmcm9tIGV2ZW50IG9iamVjdC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VyKCR0YXJnZXQucGFyZW50KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGFyZ2V0IGluc3RhbmNlb2YgRXZlbnQgPyBwYXJzZXIoJCh0YXJnZXQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KSkgOiBOdW1iZXIodGFyZ2V0KTtcblxuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKGluZGV4KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3Vuc3VwcG9ydGVkIHR5cGU6ICR7dHlwZW9mIHRhcmdldH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbmRleCA8IDAgfHwgX2l0ZW1zLmxlbmd0aCA8PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gZ2V0SXRlbUluZm8oKSBbaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBfaXRlbXNbaW5kZXhdLmluZm87XG4gICAgfVxuXG4gICAgLyoqIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsCAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgX3BhZ2VzLCBfaXRlbXMsIF9zZXR0aW5ncywgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCB9ID0gdGhpcztcblxuICAgICAgICBjb25zdCB0YXJnZXRzOiBSZWNvcmQ8bnVtYmVyLCAnYWN0aXZhdGUnIHwgJ2hpZGUnIHwgJ2RlYWN0aXZhdGUnPiA9IHt9O1xuICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgY29uc3QgaGlnaFByaW9yaXR5SW5kZXg6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgY29uc3Qgc3RvcmVOZXh0UGFnZVN0YXRlID0gKGluZGV4OiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2FjdGl2YXRlJztcbiAgICAgICAgICAgICAgICBoaWdoUHJpb3JpdHlJbmRleC5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoTWF0aC5hYnMoY3VycmVudFBhZ2VJbmRleCAtIGluZGV4KSA8PSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2FjdGl2YXRlJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoX3NldHRpbmdzLmVuYWJsZUhpZGRlblBhZ2UpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdoaWRlJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnZGVhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjdXJyZW50IHBhZ2Ug44GuIOWJjeW+jOOBryBoaWdoIHByaW9yaXR5IOOBq+OBmeOCi1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRQYWdlSW5kZXggKyAxID09PSBpbmRleCB8fCBjdXJyZW50UGFnZUluZGV4IC0gMSA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBoaWdoUHJpb3JpdHlJbmRleC5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyDlr77osaHnhKHjgZdcbiAgICAgICAgaWYgKF9pdGVtcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hDb3VudCA9IF9zZXR0aW5ncy5wYWdlUHJlcGFyZUNvdW50ICsgX3NldHRpbmdzLnBhZ2VQcmVsb2FkQ291bnQ7XG4gICAgICAgICAgICBjb25zdCBiZWdpbkluZGV4ID0gY3VycmVudFBhZ2VJbmRleCAtIHNlYXJjaENvdW50O1xuICAgICAgICAgICAgY29uc3QgZW5kSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQ7XG5cbiAgICAgICAgICAgIGxldCBvdmVyZmxvd1ByZXYgPSAwLCBvdmVyZmxvd05leHQgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgcGFnZUluZGV4ID0gYmVnaW5JbmRleDsgcGFnZUluZGV4IDw9IGVuZEluZGV4OyBwYWdlSW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJmbG93UHJldisrO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gcGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJmbG93TmV4dCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgwIDwgb3ZlcmZsb3dQcmV2KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHBhZ2VJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggKyBzZWFyY2hDb3VudCArIDE7IGkgPCBvdmVyZmxvd1ByZXY7IGkrKywgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gcGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgwIDwgb3ZlcmZsb3dOZXh0KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHBhZ2VJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudCAtIDE7IGkgPCBvdmVyZmxvd05leHQ7IGkrKywgcGFnZUluZGV4LS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhZ2VJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOS4jeimgeOBq+OBquOBo+OBnyBwYWdlIOOBriDpnZ7mtLvmgKfljJZcbiAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIF9wYWdlcy5maWx0ZXIocGFnZSA9PiAnaW5hY3RpdmUnICE9PSBwYWdlLnN0YXR1cykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHRhcmdldHNbcGFnZS5pbmRleF0pIHtcbiAgICAgICAgICAgICAgICBwYWdlLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWEquWFiCBwYWdlIOOBriBhY3RpdmF0ZVxuICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBoaWdoUHJpb3JpdHlJbmRleC5zb3J0KChsaHMsIHJocykgPT4gbGhzIC0gcmhzKSkgeyAvLyDmmIfpoIbjgr3jg7zjg4hcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkICYmIF9wYWdlc1tpZHhdPy5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDjgZ3jga7jgbvjgYvjga4gcGFnZSDjga4g54q25oWL5aSJ5pu0XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldHMpKSB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IE51bWJlcihrZXkpO1xuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gdGFyZ2V0c1tpbmRleF07XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCAmJiBfcGFnZXNbaW5kZXhdPy5bYWN0aW9uXT8uKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOabtOaWsOW+jOOBq+S9v+eUqOOBl+OBquOBi+OBo+OBnyBET00g44KS5YmK6ZmkXG4gICAgICAgIHRoaXMuZmluZFJlY3ljbGVFbGVtZW50cygpLnJlbW92ZSgpO1xuXG4gICAgICAgIGNvbnN0IHBhZ2VDdXJyZW50ID0gX3BhZ2VzW2N1cnJlbnRQYWdlSW5kZXhdO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmZyb20gID0gcGFnZUN1cnJlbnQ/LmdldEl0ZW1GaXJzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnRvICAgID0gcGFnZUN1cnJlbnQ/LmdldEl0ZW1MYXN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggPSBjdXJyZW50UGFnZUluZGV4O1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiDmnKrjgqLjgrXjgqTjg7Pjg5rjg7zjgrjjgpLmp4vnr4kgKi9cbiAgICB1cGRhdGUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuYXNzaWduUGFnZShNYXRoLm1heCh0aGlzLl9wYWdlcy5sZW5ndGggLSAxLCAwKSk7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Ki44K144Kk44Oz44KS5YaN5qeL5oiQICovXG4gICAgcmVidWlsZCgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoKTtcbiAgICAgICAgdGhpcy5hc3NpZ25QYWdlKCk7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog566h6L2E44OH44O844K/44KS56C05qOEICovXG4gICAgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wYWdlcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pdGVtcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9tYXBIZWlnaHQgPSAwO1xuICAgICAgICB0aGlzLl8kbWFwLmhlaWdodCgwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAvKiogc2Nyb2xsZXIg44Gu56iu6aGe44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbGVyVHlwZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnR5cGU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxQb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy5wb3MgPz8gMDtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44Gu5pyA5aSn5YCk44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbFBvc01heCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnBvc01heCA/PyAwO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkICovXG4gICAgc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uW21ldGhvZF0oJ3Njcm9sbCcsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vntYLkuobjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkICovXG4gICAgc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LlttZXRob2RdKCdzY3JvbGxzdG9wJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiAqL1xuICAgIGFzeW5jIHNjcm9sbFRvKHBvczogbnVtYmVyLCBhbmltYXRlPzogYm9vbGVhbiwgdGltZT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIHBvc2l0aW9uLCB0b28gc21hbGwuIFtwb3M6ICR7cG9zfV1gKTtcbiAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fc2Nyb2xsZXIucG9zTWF4IDwgcG9zKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgcG9zaXRpb24sIHRvbyBiaWcuIFtwb3M6ICR7cG9zfV1gKTtcbiAgICAgICAgICAgIHBvcyA9IHRoaXMuX3Njcm9sbGVyLnBvc01heDtcbiAgICAgICAgfVxuICAgICAgICAvLyBwb3Mg44Gu44G/5YWI6aeG44GR44Gm5pu05pawXG4gICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIGlmIChwb3MgIT09IHRoaXMuX3Njcm9sbGVyLnBvcykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fc2Nyb2xsZXIuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ8gaXRlbSDjga7ooajnpLrjgpLkv53oqLwgKi9cbiAgICBhc3luYyBlbnN1cmVWaXNpYmxlKGluZGV4OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBfc2Nyb2xsZXIsIF9pdGVtcywgX3NldHRpbmdzLCBfYmFzZUhlaWdodCB9ID0gdGhpcztcblxuICAgICAgICB2ZXJpZnkoX3Njcm9sbGVyKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBfaXRlbXMubGVuZ3RoIDw9IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBlbnN1cmVWaXNpYmxlKCkgW2ludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHBhcnRpYWxPSywgc2V0VG9wLCBhbmltYXRlLCB0aW1lLCBjYWxsYmFjayB9ID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBwYXJ0aWFsT0s6IHRydWUsXG4gICAgICAgICAgICBzZXRUb3A6IGZhbHNlLFxuICAgICAgICAgICAgYW5pbWF0ZTogX3NldHRpbmdzLmVuYWJsZUFuaW1hdGlvbixcbiAgICAgICAgICAgIHRpbWU6IF9zZXR0aW5ncy5hbmltYXRpb25EdXJhdGlvbixcbiAgICAgICAgICAgIGNhbGxiYWNrOiBub29wLFxuICAgICAgICB9LCBvcHRpb25zKSBhcyBSZXF1aXJlZDxMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnM+O1xuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRTY29wZSA9IHtcbiAgICAgICAgICAgIGZyb206IF9zY3JvbGxlci5wb3MsXG4gICAgICAgICAgICB0bzogX3Njcm9sbGVyLnBvcyArIF9iYXNlSGVpZ2h0LFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IF9pdGVtc1tpbmRleF07XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0U2NvcGUgPSB7XG4gICAgICAgICAgICBmcm9tOiB0YXJnZXQub2Zmc2V0LFxuICAgICAgICAgICAgdG86IHRhcmdldC5vZmZzZXQgKyB0YXJnZXQuaGVpZ2h0LFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGlzSW5TY29wZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWFsT0spIHtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0U2NvcGUuZnJvbSA8PSBjdXJyZW50U2NvcGUuZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFNjb3BlLmZyb20gPD0gdGFyZ2V0U2NvcGUudG87XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFNjb3BlLmZyb20gPD0gY3VycmVudFNjb3BlLnRvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRTY29wZS5mcm9tIDw9IHRhcmdldFNjb3BlLmZyb20gJiYgdGFyZ2V0U2NvcGUudG8gPD0gY3VycmVudFNjb3BlLnRvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRldGVjdFBvc2l0aW9uID0gKCk6IG51bWJlciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0U2NvcGUuZnJvbSA8IGN1cnJlbnRTY29wZS5mcm9tXG4gICAgICAgICAgICAgICAgPyB0YXJnZXRTY29wZS5mcm9tXG4gICAgICAgICAgICAgICAgOiB0YXJnZXQub2Zmc2V0IC0gdGFyZ2V0LmhlaWdodCAvLyBib3R0b20g5ZCI44KP44Gb44Gv5oOF5aCx5LiN6Laz44Gr44KI44KK5LiN5Y+vXG4gICAgICAgICAgICA7XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IHBvczogbnVtYmVyO1xuICAgICAgICBpZiAoc2V0VG9wKSB7XG4gICAgICAgICAgICBwb3MgPSB0YXJnZXRTY29wZS5mcm9tO1xuICAgICAgICB9IGVsc2UgaWYgKGlzSW5TY29wZSgpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfc2Nyb2xsZXIucG9zKTtcbiAgICAgICAgICAgIHJldHVybjsgLy8gbm9vcFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcG9zID0gZGV0ZWN0UG9zaXRpb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICAgICAgY2FsbGJhY2socG9zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYwgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgdGhpcy5fYmFja3VwW2tleV0gPSB7IGl0ZW1zOiB0aGlzLl9pdGVtcyB9O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FkZEl0ZW0odGhpcy5fYmFja3VwW2tleV0uaXRlbXMpO1xuXG4gICAgICAgIGlmIChyZWJ1aWxkKSB7XG4gICAgICAgICAgICB0aGlzLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo0gKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhCAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMuX2JhY2t1cCkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrkgKi9cbiAgICBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aICovXG4gICAgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfSk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhLml0ZW1zKSkge1xuICAgICAgICAgICAgdGhpcy5fYmFja3VwW2tleV0gPSBkYXRhO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZ2V0IF9jb25maWcoKTogTGlzdFZpZXdHbG9iYWxDb25maWcge1xuICAgICAgICByZXR1cm4gTGlzdFZpZXdHbG9iYWxDb25maWcoKTtcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg55So55Kw5aKD6Kit5a6aICovXG4gICAgcHJpdmF0ZSBzZXRTY3JvbGxlckNvbmRpdGlvbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9uKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub24oJ3Njcm9sbHN0b3AnLCB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg55So55Kw5aKD56C05qOEICovXG4gICAgcHJpdmF0ZSByZXNldFNjcm9sbGVyQ29uZGl0aW9uKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub2ZmKCdzY3JvbGxzdG9wJywgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vZmYoJ3Njcm9sbCcsIHRoaXMuX3Njcm9sbEV2ZW50SGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOaXouWumuOBriBTY3JvbGxlciDjgqrjg5bjgrjjgqfjgq/jg4jjga7kvZzmiJAgKi9cbiAgICBwcml2YXRlIGNyZWF0ZVNjcm9sbGVyKCk6IElMaXN0U2Nyb2xsZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2V0dGluZ3Muc2Nyb2xsZXJGYWN0b3J5KHRoaXMuXyRyb290LCB0aGlzLl8kbWFwLCB0aGlzLl9zZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLyoqIOePvuWcqOOBriBQYWdlIEluZGV4IOOCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgZ2V0UGFnZUluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIGNvbnN0IHsgX3Njcm9sbGVyLCBfYmFzZUhlaWdodCwgX3BhZ2VzIH0gPSB0aGlzO1xuICAgICAgICB2ZXJpZnkoX3Njcm9sbGVyKTtcblxuICAgICAgICBjb25zdCB7IHBvczogc2Nyb2xsUG9zLCBwb3NNYXg6IHNjcm9sbFBvc01heCB9ID0gX3Njcm9sbGVyO1xuXG4gICAgICAgIGNvbnN0IHNjcm9sbE1hcFNpemUgPSAoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbGFzdFBhZ2UgPSB0aGlzLmdldExhc3RQYWdlKCk7XG4gICAgICAgICAgICByZXR1cm4gbGFzdFBhZ2UgPyBsYXN0UGFnZS5vZmZzZXQgKyBsYXN0UGFnZS5oZWlnaHQgOiBfYmFzZUhlaWdodDtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBjb25zdCBwb3MgPSAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKDAgPT09IHNjcm9sbFBvc01heCB8fCBzY3JvbGxQb3NNYXggPD0gX2Jhc2VIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjcm9sbFBvcyAqIHNjcm9sbE1hcFNpemUgLyBzY3JvbGxQb3NNYXg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgY29uc3QgdmFsaWRSYW5nZSA9IChwYWdlOiBQYWdlUHJvZmlsZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFnZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFnZS5vZmZzZXQgPD0gcG9zICYmIHBvcyA8PSBwYWdlLm9mZnNldCArIHBhZ2UuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgY2FuZGlkYXRlID0gTWF0aC5mbG9vcihwb3MgLyBfYmFzZUhlaWdodCk7XG4gICAgICAgIGlmICgwICE9PSBjYW5kaWRhdGUgJiYgX3BhZ2VzLmxlbmd0aCA8PSBjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgIGNhbmRpZGF0ZSA9IF9wYWdlcy5sZW5ndGggLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBhZ2UgPSBfcGFnZXNbY2FuZGlkYXRlXTtcbiAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICB9IGVsc2UgaWYgKHBvcyA8IHBhZ2U/Lm9mZnNldCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNhbmRpZGF0ZSAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgcGFnZSA9IF9wYWdlc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FuZGlkYXRlICsgMSwgbiA9IF9wYWdlcy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYWdlID0gX3BhZ2VzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUud2FybihgY2Fubm90IGRldGVjdCBwYWdlIGluZGV4LiBmYWxsYmFjazogJHtfcGFnZXMubGVuZ3RoIC0gMX1gKTtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KDAsIF9wYWdlcy5sZW5ndGggLSAxKTtcbiAgICB9XG5cbiAgICAvKiog5pyA5b6M44Gu44Oa44O844K444KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBnZXRMYXN0UGFnZSgpOiBQYWdlUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICgwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGFnZXNbdGhpcy5fcGFnZXMubGVuZ3RoIC0gMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiCovXG4gICAgcHJpdmF0ZSBvblNjcm9sbChwb3M6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fYWN0aXZlICYmIDAgPCB0aGlzLl9wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICAgICAgLy8gVE9ETzogaW50ZXJzZWN0aW9uUmVjdCDjgpLkvb/nlKjjgZnjgovloLTlkIgsIFNjcm9sbCDjg4/jg7Pjg4njg6njg7zlhajoiKzjga/jganjgYbjgYLjgovjgbnjgY3jgYvopoHmpJzoqI5cbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhwb3MgLSB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zKSA8IHRoaXMuX3NldHRpbmdzLnNjcm9sbFJlZnJlc2hEaXN0YW5jZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggIT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyA9IHBvcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vlgZzmraLjgqTjg5njg7Pjg4ggKi9cbiAgICBwcml2YXRlIG9uU2Nyb2xsU3RvcChwb3M6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fYWN0aXZlICYmIDAgPCB0aGlzLl9wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCAhPT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyA9IHBvcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5rjg7zjgrjljLrliIbjga7jgqLjgrXjgqTjg7MgKi9cbiAgICBwcml2YXRlIGFzc2lnblBhZ2UoZnJvbT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLmNsZWFyUGFnZShmcm9tKTtcblxuICAgICAgICBjb25zdCB7IF9pdGVtcywgX3BhZ2VzLCBfYmFzZUhlaWdodCwgX3Njcm9sbGVyIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBiYXNlUGFnZSA9IHRoaXMuZ2V0TGFzdFBhZ2UoKTtcbiAgICAgICAgY29uc3QgbmV4dEl0ZW1JbmRleCA9IGJhc2VQYWdlPy5nZXRJdGVtTGFzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBjb25zdCBhc2lnbmVlSXRlbXMgID0gX2l0ZW1zLnNsaWNlKG5leHRJdGVtSW5kZXgpO1xuXG4gICAgICAgIGxldCB3b3JrUGFnZSA9IGJhc2VQYWdlO1xuICAgICAgICBpZiAobnVsbCA9PSB3b3JrUGFnZSkge1xuICAgICAgICAgICAgd29ya1BhZ2UgPSBuZXcgUGFnZVByb2ZpbGUoKTtcbiAgICAgICAgICAgIF9wYWdlcy5wdXNoKHdvcmtQYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBhc2lnbmVlSXRlbXMpIHtcbiAgICAgICAgICAgIGlmIChfYmFzZUhlaWdodCA8PSB3b3JrUGFnZS5oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICB3b3JrUGFnZS5ub3JtYWxpemUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdQYWdlID0gbmV3IFBhZ2VQcm9maWxlKCk7XG4gICAgICAgICAgICAgICAgbmV3UGFnZS5pbmRleCA9IHdvcmtQYWdlLmluZGV4ICsgMTtcbiAgICAgICAgICAgICAgICBuZXdQYWdlLm9mZnNldCA9IHdvcmtQYWdlLm9mZnNldCArIHdvcmtQYWdlLmhlaWdodDtcbiAgICAgICAgICAgICAgICB3b3JrUGFnZSA9IG5ld1BhZ2U7XG4gICAgICAgICAgICAgICAgX3BhZ2VzLnB1c2god29ya1BhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXRlbS5wYWdlSW5kZXggPSB3b3JrUGFnZS5pbmRleDtcbiAgICAgICAgICAgIHdvcmtQYWdlLnB1c2goaXRlbSk7XG4gICAgICAgIH1cblxuICAgICAgICB3b3JrUGFnZS5ub3JtYWxpemUoKTtcblxuICAgICAgICBfc2Nyb2xsZXI/LnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKiDjg5rjg7zjgrjljLrliIbjga7op6PpmaQgKi9cbiAgICBwcml2YXRlIGNsZWFyUGFnZShmcm9tPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3BhZ2VzLnNwbGljZShmcm9tID8/IDApO1xuICAgIH1cblxuICAgIC8qKiBpbmFjdGl2ZSDnlKggTWFwIOOBrueUn+aIkCAqL1xuICAgIHByaXZhdGUgcHJlcGFyZUluYWN0aXZlTWFwKCk6IERPTSB7XG4gICAgICAgIGNvbnN0IHsgX2NvbmZpZywgXyRtYXAsIF9tYXBIZWlnaHQgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0ICRwYXJlbnQgPSBfJG1hcC5wYXJlbnQoKTtcbiAgICAgICAgbGV0ICRpbmFjdGl2ZU1hcCA9ICRwYXJlbnQuZmluZChgLiR7X2NvbmZpZy5JTkFDVElWRV9DTEFTU31gKTtcblxuICAgICAgICBpZiAoJGluYWN0aXZlTWFwLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIGNvbnN0ICRsaXN0SXRlbVZpZXdzID0gXyRtYXAuY2xvbmUoKS5jaGlsZHJlbigpLmZpbHRlcigoXywgZWxlbWVudDogSFRNTEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlSW5kZXggPSBOdW1iZXIoJChlbGVtZW50KS5hdHRyKF9jb25maWcuREFUQV9QQUdFX0lOREVYKSk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRQYWdlSW5kZXggLSAxIDw9IHBhZ2VJbmRleCAmJiBwYWdlSW5kZXggPD0gY3VycmVudFBhZ2VJbmRleCArIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGluYWN0aXZlTWFwID0gJChgPHNlY3Rpb24gY2xhc3M9XCIke19jb25maWcuU0NST0xMX01BUF9DTEFTU30gJHtfY29uZmlnLklOQUNUSVZFX0NMQVNTfVwiPjwvc2VjdGlvbj5gKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoJGxpc3RJdGVtVmlld3MpXG4gICAgICAgICAgICAgICAgLmhlaWdodChfbWFwSGVpZ2h0KTtcbiAgICAgICAgICAgICRwYXJlbnQuYXBwZW5kKCRpbmFjdGl2ZU1hcCk7XG4gICAgICAgICAgICBfJG1hcC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICRpbmFjdGl2ZU1hcDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIGRvbSBhcyAkLFxuICAgIHR5cGUgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgVmlldyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RDb250ZXh0LFxuICAgIElMaXN0VmlldyxcbiAgICBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMsXG4gICAgSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgTGlzdENvcmUgfSBmcm9tICcuL2NvcmUvbGlzdCc7XG5pbXBvcnQgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBjb250ZXh0OiBMaXN0Q29yZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBjbGFzcyB0aGF0IHN0b3JlcyB7QGxpbmsgTGlzdFZpZXd9IGluaXRpYWxpemF0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIHtAbGluayBMaXN0Vmlld30g44Gu5Yid5pyf5YyW5oOF5aCx44KS5qC857SN44GZ44KL44Kk44Oz44K/44O844OV44Kn44Kk44K544Kv44Op44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBMaXN0Q29udGV4dE9wdGlvbnMsIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBpbml0aWFsSGVpZ2h0PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIEBlbiBWaXJ0dWFsIGxpc3QgdmlldyBjbGFzcyB0aGF0IHByb3ZpZGVzIG1lbW9yeSBtYW5hZ2VtZW50IGZ1bmN0aW9uYWxpdHkuXG4gKiBAamEg44Oh44Oi44Oq566h55CG5qmf6IO944KS5o+Q5L6b44GZ44KL5Luu5oOz44Oq44K544OI44OT44Ol44O844Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMaXN0VmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElMaXN0VmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBMaXN0Q29yZShvcHRpb25zKSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcblxuICAgICAgICB0aGlzLnNldEVsZW1lbnQodGhpcy4kZWwgYXMgRE9NU2VsZWN0b3I8VEVsZW1lbnQ+KTtcbiAgICB9XG5cbiAgICAvKiogY29udGV4dCBhY2Nlc3NvciAqL1xuICAgIGdldCBjb250ZXh0KCk6IElMaXN0Q29udGV4dCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0O1xuICAgIH1cblxuICAgIC8qKiBjb25zdHJ1Y3Qgb3B0aW9uIGFjY2Vzc29yICovXG4gICAgZ2V0IG9wdGlvbnMoKTogTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQub3B0aW9ucztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBWaWV3IGNvbXBvbmVudCBtZXRob2RzOlxuXG4gICAgLyoqIGB0aGlzLmVsYCDmm7TmlrDmmYLjga7mlrDjgZfjgYQgSFRNTCDjgpLjg6zjg7Pjg4Djg6rjg7PjgrDjg63jgrjjg4Pjgq/jga7lrp/oo4XplqLmlbAuIOODouODh+ODq+abtOaWsOOBqCBWaWV3IOODhuODs+ODl+ODrOODvOODiOOCkumAo+WLleOBleOBm+OCiy4gKi9cbiAgICBhYnN0cmFjdCByZW5kZXIoLi4uYXJnczogdW5rbm93bltdKTogYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBDaGFuZ2UgdGhlIHZpZXcncyBlbGVtZW50IChgdGhpcy5lbGAgcHJvcGVydHkpIGFuZCByZS1kZWxlZ2F0ZSB0aGUgdmlldydzIGV2ZW50cyBvbiB0aGUgbmV3IGVsZW1lbnQuXG4gICAgICogQGphIFZpZXcg44GM566h6L2E44GZ44KL6KaB57SgIChgdGhpcy5lbGAgcHJvcGVydHkpIOOBruWkieabtC4g44Kk44OZ44Oz44OI5YaN6Kit5a6a44KC5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIE9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4jjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBvdmVycmlkZSBzZXRFbGVtZW50KGVsOiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXNbX3Byb3BlcnRpZXNdKSB7XG4gICAgICAgICAgICBjb25zdCB7IGNvbnRleHQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICBjb250ZXh0LmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGNvbnRleHQuaW5pdGlhbGl6ZSgkZWwgYXMgRE9NPE5vZGU+IGFzIERPTSwgdGhpcy5vcHRpb25zLmluaXRpYWxIZWlnaHQgPz8gJGVsLmhlaWdodCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIuc2V0RWxlbWVudChlbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZGVzdHJveSgpO1xuICAgICAgICByZXR1cm4gc3VwZXIucmVtb3ZlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RPcGVyYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciBpdCBoYXMgYmVlbiBpbml0aWFsaXplZC5cbiAgICAgKiBAamEg5Yid5pyf5YyW5riI44G/44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogaW5pdGlhbGl6ZWQgLyBmYWxzZTogdW5pbml0aWFsaXplZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5Yid5pyf5YyW5riI44G/IC8gZmFsc2U6IOacquWIneacn+WMllxuICAgICAqL1xuICAgIGdldCBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0luaXRpYWxpemVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEgaXRlbSDnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICogQHBhcmFtIGluc2VydFRvXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbnNlcnRpb24gcG9zaXRpb24gb2YgaXRlbSBieSBpbmRleFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7mjL/lhaXkvY3nva7jgpLjgqTjg7Pjg4fjg4Pjgq/jgrnjgafmjIflrppcbiAgICAgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLCBpbmZvOiBVbmtub3duT2JqZWN0LCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hZGRJdGVtKG5ldyBJdGVtUHJvZmlsZSh0aGlzLmNvbnRleHQsIE1hdGgudHJ1bmMoaGVpZ2h0KSwgaW5pdGlhbGl6ZXIsIGluZm8pLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uIChpbnRlcm5hbCB1c2UpLlxuICAgICAqIEBqYSBpdGVtIOeZu+mMsiAo5YaF6YOo55SoKVxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZW1cbiAgICAgKiAgLSBgZW5gIHtAbGluayBJdGVtUHJvZmlsZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBJdGVtUHJvZmlsZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGluc2VydFRvXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbnNlcnRpb24gcG9zaXRpb24gb2YgaXRlbSBieSBpbmRleFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7mjL/lhaXkvY3nva7jgpLjgqTjg7Pjg4fjg4Pjgq/jgrnjgafmjIflrppcbiAgICAgKi9cbiAgICBfYWRkSXRlbShpdGVtOiBJdGVtUHJvZmlsZSB8IEl0ZW1Qcm9maWxlW10sIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuX2FkZEl0ZW0oaXRlbSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWxldGUgdGhlIHNwZWNpZmllZCBJdGVtLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5kZXggdG8gc3RhcnQgcmVsZWFzaW5nXG4gICAgICogIC0gYGphYCDop6PpmaTplovlp4vjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc2l6ZVxuICAgICAqICAtIGBlbmAgdG90YWwgbnVtYmVyIG9mIGl0ZW1zIHRvIHJlbGVhc2VcbiAgICAgKiAgLSBgamFgIOino+mZpOOBmeOCiyBpdGVtIOOBrue3j+aVsCBbZGVmYXVsdDogMV1cbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgdG8gYWN0dWFsbHkgZGVsZXRlIHRoZSBlbGVtZW50IFtkZWZhdWx0OiAwIChpbW1lZGlhdGUgZGVsZXRpb24pXG4gICAgICogIC0gYGphYCDlrp/pmpvjgavopoHntKDjgpLliYrpmaTjgZnjgosgZGVsYXkgdGltZSBbZGVmYXVsdDogMCAo5Y2z5pmC5YmK6ZmkKV1cbiAgICAgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIsIHNpemU/OiBudW1iZXIsIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWxldGUgdGhlIHNwZWNpZmllZCBJdGVtLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0YXJnZXQgaW5kZXggYXJyYXkuIGl0IGlzIG1vcmUgZWZmaWNpZW50IHRvIHNwZWNpZnkgcmV2ZXJzZSBpbmRleC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOCpOODs+ODh+ODg+OCr+OCuemFjeWIl+OCkuaMh+Wumi4gcmV2ZXJzZSBpbmRleCDjgpLmjIflrprjgZnjgovjgbvjgYbjgYzlirnnjofnmoRcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgdG8gYWN0dWFsbHkgZGVsZXRlIHRoZSBlbGVtZW50IFtkZWZhdWx0OiAwIChpbW1lZGlhdGUgZGVsZXRpb24pXG4gICAgICogIC0gYGphYCDlrp/pmpvjgavopoHntKDjgpLliYrpmaTjgZnjgosgZGVsYXkgdGltZSBbZGVmYXVsdDogMCAo5Y2z5pmC5YmK6ZmkKV1cbiAgICAgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyIHwgbnVtYmVyW10sIGFyZzI/OiBudW1iZXIsIGFyZzM/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZW1vdmVJdGVtKGluZGV4IGFzIG51bWJlciwgYXJnMiwgYXJnMyk7IC8vIGF2b2lkIHRzKDIzNDUpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW5mb3JtYXRpb24gc2V0IGZvciB0aGUgc3BlY2lmaWVkIGl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBpdGVtIOOBq+ioreWumuOBl+OBn+aDheWgseOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgaWRlbnRpZmllciBbaW5kZXggfCBldmVudCBvYmplY3RdXG4gICAgICogIC0gYGphYCDorZjliKXlrZAuIFtpbmRleCB8IGV2ZW50IG9iamVjdF1cbiAgICAgKi9cbiAgICBnZXRJdGVtSW5mbyh0YXJnZXQ6IG51bWJlciB8IEV2ZW50KTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEl0ZW1JbmZvKHRhcmdldCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZnJlc2ggYWN0aXZlIHBhZ2VzLlxuICAgICAqIEBqYSDjgqLjgq/jg4bjgqPjg5bjg5rjg7zjgrjjgpLmm7TmlrBcbiAgICAgKi9cbiAgICByZWZyZXNoKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEJ1aWxkIHVuYXNzaWduZWQgcGFnZXMuXG4gICAgICogQGphIOacquOCouOCteOCpOODs+ODmuODvOOCuOOCkuani+eviVxuICAgICAqL1xuICAgIHVwZGF0ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC51cGRhdGUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlYnVpbGQgcGFnZSBhc3NpZ25tZW50cy5cbiAgICAgKiBAamEg44Oa44O844K444Ki44K144Kk44Oz44KS5YaN5qeL5oiQXG4gICAgICovXG4gICAgcmVidWlsZCgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWJ1aWxkKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBEZXN0cm95IGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOeuoei9hOODh+ODvOOCv+OCkuegtOajhFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVsZWFzZSgpO1xuICAgICAgICByZXR1cm4gc3VwZXIucmVsZWFzZSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsYWJsZVxuXG4gICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgc2Nyb2xsUG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFBvcztcbiAgICB9XG5cbiAgICAgLyoqXG4gICAgICAqIEBlbiBHZXQgbWF4aW11bSBzY3JvbGwgcG9zaXRpb24uXG4gICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7mnIDlpKflgKTjgpLlj5blvpdcbiAgICAgICovXG4gICAgZ2V0IHNjcm9sbFBvc01heCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zY3JvbGxQb3NNYXg7XG4gICAgfVxuXG4gICAgIC8qKlxuICAgICAqIEBlbiBTY3JvbGwgZXZlbnQgaGFuZGxlciBzZXR0aW5nL2NhbmNlbGxhdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeODvOmWouaVsFxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9uOiBzZXR0aW5nIC8gb2ZmOiBjYW5jZWxpbmdcbiAgICAgKiAgLSBgamFgIG9uOiDoqK3lrpogLyBvZmY6IOino+mZpFxuICAgICAqL1xuICAgIHNldFNjcm9sbEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXIsIG1ldGhvZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHRpbmcvY2FuY2VsbGluZyBzY3JvbGwgc3RvcCBldmVudCBoYW5kbGVyLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vntYLkuobjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44O86Zai5pWwXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb246IHNldHRpbmcgLyBvZmY6IGNhbmNlbGluZ1xuICAgICAqICAtIGBqYWAgb246IOioreWumiAvIG9mZjog6Kej6ZmkXG4gICAgICovXG4gICAgc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyLCBtZXRob2QpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NcbiAgICAgKiAgLSBgZW5gIG5ldyBzY3JvbGwgcG9zaXRpb24gdmFsdWUgWzAgLSBwb3NNYXhdXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogWzAgLSBwb3NNYXhdXG4gICAgICogQHBhcmFtIGFuaW1hdGVcbiAgICAgKiAgLSBgZW5gIGVuYWJsZS9kaXNhYmxlIGFuaW1hdGlvblxuICAgICAqICAtIGBqYWAg44Ki44OL44Oh44O844K344On44Oz44Gu5pyJ54ShXG4gICAgICogQHBhcmFtIHRpbWVcbiAgICAgKiAgLSBgZW5gIHRpbWUgc3BlbnQgb24gYW5pbWF0aW9uIFttc2VjXVxuICAgICAqICAtIGBqYWAg44Ki44OL44Oh44O844K344On44Oz44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqL1xuICAgIHNjcm9sbFRvKHBvczogbnVtYmVyLCBhbmltYXRlPzogYm9vbGVhbiwgdGltZT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbnN1cmUgdmlzaWJpbGl0eSBvZiBpdGVtIGJ5IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ8gaXRlbSDjga7ooajnpLrjgpLkv53oqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBpbmRleCBvZiBpdGVtXG4gICAgICogIC0gYGphYCBpdGVtIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgZW5zdXJlVmlzaWJsZShpbmRleDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmVuc3VyZVZpc2libGUoaW5kZXgsIG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0QmFja3VwUmVzdG9yZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKGFueSBpZGVudGlmaWVyKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O8KOS7u+aEj+OBruitmOWIpeWtkCnjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEBwYXJhbSByZWJ1aWxkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gcmVidWlsZCB0aGUgbGlzdCBzdHJ1Y3R1cmVcbiAgICAgKiAgLSBgamFgIOODquOCueODiOani+mAoOOCkuWGjeani+evieOBmeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkID0gdHJ1ZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZXN0b3JlKGtleSwgcmVidWlsZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgYmFja3VwIGRhdGEgZXhpc3RzLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzIC8gZmFsc2U6IG5vdCBleGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSAvIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaGFzQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERpc2NhcmQgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBkaXNjYXJkIGV4aXN0aW5nIGRhdGEgLyBmYWxzZTogc3BlY2lmaWVkIGRhdGEgZG9lcyBub3QgZXhpc3RcbiAgICAgKiAgLSBgamFgIHRydWU6IOWtmOWcqOOBl+OBn+ODh+ODvOOCv+OCkuegtOajhCAvIGZhbHNlOiDmjIflrprjgZXjgozjgZ/jg4fjg7zjgr/jga/lrZjlnKjjgZfjgarjgYRcbiAgICAgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY2xlYXJCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKi9cbiAgICBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogVW5rbm93bk9iamVjdCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEJhY2t1cERhdGEoa2V5KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEBlbiBCYWNrdXAgZGF0YSBjYW4gYmUgc2V0IGV4dGVybmFsbHkuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5XG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VlZGVkIC8gZmFsc2U6IHNjaGVtYSBpbnZhbGlkXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog44K544Kt44O844Oe44GM5LiN5q2jXG4gICAgICovXG4gICAgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogVW5rbm93bk9iamVjdCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRCYWNrdXBEYXRhKGtleSwgZGF0YSBhcyB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0VmlldyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5pbXBvcnQgeyB0eXBlIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsIExpc3RJdGVtVmlldyB9IGZyb20gJy4vbGlzdC1pdGVtLXZpZXcnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgZ3JvdXA6IEdyb3VwUHJvZmlsZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE9wdGlvbnMgdG8gcGFzcyB0byB7QGxpbmsgRXhwYW5kYWJsZUxpc3RJdGVtVmlld30gY29uc3RydWN0aW9uLlxuICogQGphIHtAbGluayBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3fSDmp4vnr4njgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEZ1bmNOYW1lID0gc3RyaW5nPlxuICAgIGV4dGVuZHMgTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgb3duZXI6IElFeHBhbmRhYmxlTGlzdFZpZXc7XG4gICAgLyoqIHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlICovXG4gICAgZ3JvdXA6IEdyb3VwUHJvZmlsZTtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBpdGVtIGNvbnRhaW5lciBjbGFzcyBoYW5kbGVkIGJ5IHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9LlxuICogQGphIHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXhwYW5kYWJsZUxpc3RJdGVtVmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgTGlzdEl0ZW1WaWV3PFRFbGVtZW50LCBURXZlbnQ+IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEV4cGFuZGFibGVMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgY29uc3QgeyBncm91cCB9ID0gb3B0aW9ucztcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7IGdyb3VwIH0gYXMgUHJvcGVydHk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJvdGVjdGVkIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzLlxuICAgICAqIEBqYSDlsZXplovnirbmhYvjgpLliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleHBhbmRlZCwgY29sbGFwc2VkOiBjbG9zZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5bGV6ZaLLCBmYWxzZTog5Y+O5p2fXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0V4cGFuZGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uZ3JvdXAuaXNFeHBhbmRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZy5cbiAgICAgKiBAamEg5bGV6ZaL5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzRXhwYW5kaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgY29sbGFwc2luZy5cbiAgICAgKiBAamEg5Y+O5p2f5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc0NvbGxhcHNpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcgb3IgY29sbGFwc2luZy5cbiAgICAgKiBAamEg6ZaL6ZaJ5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzU3dpdGNoaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgaXQgaGFzIGEgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBoYXNDaGlsZHJlbigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmdyb3VwLmhhc0NoaWxkcmVuO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgbHVpZCxcbiAgICBzdGF0dXNBZGRSZWYsXG4gICAgc3RhdHVzUmVsZWFzZSxcbiAgICBzdGF0dXNTY29wZSxcbiAgICBpc1N0YXR1c0luLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIElFeHBhbmRPcGVyYXRpb24sXG4gICAgSUxpc3RTdGF0dXNNYW5hZ2VyLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSxcbiAgICBJRXhwYW5kYWJsZUxpc3RDb250ZXh0LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4uL3Byb2ZpbGUnO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIENvcmUgbG9naWMgaW1wbGVtZW50YXRpb24gY2xhc3MgdGhhdCBtYW5hZ2VzIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgc3RhdGUuXG4gKiBAamEg6ZaL6ZaJ54q25oWL566h55CG44KS6KGM44GG44Kz44Ki44Ot44K444OD44Kv5a6f6KOF44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBFeHBhbmRDb3JlIGltcGxlbWVudHNcbiAgICBJRXhwYW5kT3BlcmF0aW9uLFxuICAgIElMaXN0U3RhdHVzTWFuYWdlcixcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQ7XG5cbiAgICAvKiogeyBpZDogR3JvdXBQcm9maWxlIH0gKi9cbiAgICBwcml2YXRlIF9tYXBHcm91cHM6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT4gPSB7fTtcbiAgICAvKiog56ysMemajuWxpCBHcm91cFByb2ZpbGUg44KS5qC857SNICovXG4gICAgcHJpdmF0ZSBfYXJ5VG9wR3JvdXBzOiBHcm91cFByb2ZpbGVbXSA9IFtdO1xuXG4gICAgLyoqIOODh+ODvOOCv+OBriBiYWNrdXAg6aCY5Z+fLiBrZXkg44GoIHsgbWFwLCB0b3BzIH0g44KS5qC857SNICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYmFja3VwOiBSZWNvcmQ8c3RyaW5nLCB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0+ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSBvd25lciDopqogVmlldyDjga7jgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCkge1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgIH1cblxuICAgIC8qKiDjg4fjg7zjgr/jgpLnoLTmo4QgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fbWFwR3JvdXBzID0ge307XG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3VwcyA9IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRPcGVyYXRpb25cblxuICAgIC8qKiDmlrDopo8gR3JvdXBQcm9maWxlIOOCkuS9nOaIkCAqL1xuICAgIG5ld0dyb3VwKGlkPzogc3RyaW5nKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgaWQgPSBpZCA/PyBsdWlkKCdsaXN0LWdyb3VwJywgNCk7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX21hcEdyb3Vwc1tpZF0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tYXBHcm91cHNbaWRdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGdyb3VwID0gbmV3IEdyb3VwUHJvZmlsZSh0aGlzLl9vd25lciwgaWQpO1xuICAgICAgICB0aGlzLl9tYXBHcm91cHNbaWRdID0gZ3JvdXA7XG4gICAgICAgIHJldHVybiBncm91cDtcbiAgICB9XG5cbiAgICAvKiog55m76Yyy5riI44G/IEdyb3VwIOOCkuWPluW+lyAqL1xuICAgIGdldEdyb3VwKGlkOiBzdHJpbmcpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFwR3JvdXBzW2lkXTtcbiAgICB9XG5cbiAgICAvKiog56ysMemajuWxpOOBriBHcm91cCDnmbvpjLIgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgLy8g44GZ44Gn44Gr55m76Yyy5riI44G/44Gu5aC05ZCI44GvIHJlc3RvcmUg44GX44GmIGxheW91dCDjgq3jg7zjgZTjgajjgavlvqnlhYPjgZnjgovjgIJcbiAgICAgICAgaWYgKCdyZWdpc3RlcmVkJyA9PT0gdG9wR3JvdXAuc3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBvcmllbnRhdGlvbiBjaGFuZ2VkIOaZguOBriBsYXlvdXQg44Kt44O85aSJ5pu05a++5b+c44Gg44GM44CB44Kt44O844Gr5aSJ5pu044GM54Sh44GE44Go44GN44Gv5LiN5YW35ZCI44Go44Gq44KL44CCXG4gICAgICAgICAgICAvLyDjgZPjga4gQVBJIOOBq+Wun+ijheOBjOW/heimgeOBi+OCguWQq+OCgeOBpuimi+ebtOOBl+OBjOW/heimgVxuICAgICAgICAgICAgdG9wR3JvdXAucmVzdG9yZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGFzdEdyb3VwID0gdGhpcy5fYXJ5VG9wR3JvdXBzW3RoaXMuX2FyeVRvcEdyb3Vwcy5sZW5ndGggLSAxXTtcbiAgICAgICAgY29uc3QgaW5zZXJ0VG8gPSBsYXN0R3JvdXA/LmdldE5leHRJdGVtSW5kZXgodHJ1ZSkgPz8gMDtcblxuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMucHVzaCh0b3BHcm91cCk7XG4gICAgICAgIHRvcEdyb3VwLnJlZ2lzdGVyKGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiog56ysMemajuWxpOOBriBHcm91cCDjgpLlj5blvpcgKi9cbiAgICBnZXRUb3BHcm91cHMoKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJ5VG9wR3JvdXBzLnNsaWNlKDApO1xuICAgIH1cblxuICAgIC8qKiDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpICovXG4gICAgYXN5bmMgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNpZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgcHJvbWlzaWVzLnB1c2goZ3JvdXAuZXhwYW5kKCkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2llcyk7XG4gICAgfVxuXG4gICAgLyoqIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWPjuadnyAoMemajuWxpCkgKi9cbiAgICBhc3luYyBjb2xsYXBzZUFsbChkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNpZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgcHJvbWlzaWVzLnB1c2goZ3JvdXAuY29sbGFwc2UoZGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNpZXMpO1xuICAgIH1cblxuICAgIC8qKiDlsZXplovkuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzU3RhdHVzSW4oJ2V4cGFuZGluZycpO1xuICAgIH1cblxuICAgIC8qKiDlj47mnZ/kuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1N0YXR1c0luKCdjb2xsYXBzaW5nJyk7XG4gICAgfVxuXG4gICAgLyoqIOmWi+mWieS4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNFeHBhbmRpbmcgfHwgdGhpcy5pc0NvbGxhcHNpbmc7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTdGF0dXNNYW5hZ2VyXG5cbiAgICAvKiog54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44Kk44Oz44Kv44Oq44Oh44Oz44OIICovXG4gICAgc3RhdHVzQWRkUmVmKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c0FkZFJlZihzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKiDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jg4fjgq/jg6rjg6Hjg7Pjg4ggKi9cbiAgICBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiog5Yem55CG44K544Kz44O844OX5q+O44Gr54q25oWL5aSJ5pWw44KS6Kit5a6aICovXG4gICAgc3RhdHVzU2NvcGU8VD4oc3RhdHVzOiBzdHJpbmcsIGV4ZWN1dG9yOiAoKSA9PiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gc3RhdHVzU2NvcGUoc3RhdHVzLCBleGVjdXRvcik7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBn+eKtuaFi+S4reOBp+OBguOCi+OBi+eiuuiqjSAqL1xuICAgIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGlzU3RhdHVzSW4oc3RhdHVzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jgpLjg5Djg4Pjgq/jgqLjg4Pjg5cgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgeyBfYmFja3VwIH0gPSB0aGlzO1xuICAgICAgICBpZiAobnVsbCA9PSBfYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIF9iYWNrdXBba2V5XSA9IHtcbiAgICAgICAgICAgICAgICBtYXA6IHRoaXMuX21hcEdyb3VwcyxcbiAgICAgICAgICAgICAgICB0b3BzOiB0aGlzLl9hcnlUb3BHcm91cHMsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jgpLjg6rjgrnjg4jjgqIgKi9cbiAgICByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGJhY2t1cCA9IHRoaXMuZ2V0QmFja3VwRGF0YShrZXkpO1xuICAgICAgICBpZiAobnVsbCA9PSBiYWNrdXApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgwIDwgdGhpcy5fYXJ5VG9wR3JvdXBzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuX21hcEdyb3VwcywgYmFja3VwLm1hcCk7XG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3VwcyA9IGJhY2t1cC50b3BzLnNsaWNlKCk7XG5cbiAgICAgICAgLy8g5bGV6ZaL44GX44Gm44GE44KL44KC44Gu44KS55m76YyyXG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBncm91cC5yZXN0b3JlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlho3mp4vnr4njga7kuojntIRcbiAgICAgICAgcmVidWlsZCAmJiB0aGlzLl9vd25lci5yZWJ1aWxkKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKEgKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhCAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMuX2JhY2t1cCkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrkgKi9cbiAgICBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrpogKi9cbiAgICBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGRhdGEubWFwICYmIEFycmF5LmlzQXJyYXkoZGF0YS50b3BzKSkge1xuICAgICAgICAgICAgdGhpcy5fYmFja3VwW2tleV0gPSBkYXRhO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgV3JpdGFibGUsIFVua25vd25PYmplY3QgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RWaWV3LCBJRXhwYW5kT3BlcmF0aW9uIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEV4cGFuZENvcmUgfSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0IHR5cGUgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IHsgdHlwZSBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnMsIExpc3RWaWV3IH0gZnJvbSAnLi9saXN0LXZpZXcnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgY29udGV4dDogRXhwYW5kQ29yZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFZpcnR1YWwgbGlzdCB2aWV3IGNsYXNzIHdpdGggZXhwYW5kaW5nIC8gY29sbGFwc2luZyBmdW5jdGlvbmFsaXR5LlxuICogQGphIOmWi+mWieapn+iDveOCkuWCmeOBiOOBn+S7ruaDs+ODquOCueODiOODk+ODpeODvOOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXhwYW5kYWJsZUxpc3RWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBMaXN0VmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElFeHBhbmRhYmxlTGlzdFZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgY29udGV4dDogbmV3IEV4cGFuZENvcmUodGhpcyksXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG4gICAgfVxuXG4gICAgLyoqIGNvbnRleHQgYWNjZXNzb3IgKi9cbiAgICBnZXQgZXhwYW5kQ29udGV4dCgpOiBJRXhwYW5kT3BlcmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUV4cGFuZGFibGVMaXN0Vmlld1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyB7QGxpbmsgR3JvdXBQcm9maWxlfS4gUmV0dXJuIHRoZSBvYmplY3QgaWYgaXQgaXMgYWxyZWFkeSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDmlrDopo8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5L2c5oiQLiDnmbvpjLLmuIjjgb/jga7loLTlkIjjga/jgZ3jga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgbmV3bHkgY3JlYXRlZCBncm91cCBpZC4gaWYgbm90IHNwZWNpZmllZCwgYXV0b21hdGljIGFsbG9jYXRpb24gd2lsbCBiZSBwZXJmb3JtZWQuXG4gICAgICogIC0gYGphYCDmlrDopo/jgavkvZzmiJDjgZnjgosgR3JvdXAgSUQg44KS5oyH5a6aLiDmjIflrprjgZfjgarjgYTloLTlkIjjga/oh6rli5XlibLjgormjK/jgopcbiAgICAgKi9cbiAgICBuZXdHcm91cChpZD86IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lm5ld0dyb3VwKGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHJlZ2lzdGVyZWQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOeZu+mMsua4iOOBvyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgR3JvdXAgSUQgdG8gcmV0cmlldmVcbiAgICAgKiAgLSBgamFgIOWPluW+l+OBmeOCiyBHcm91cCBJRCDjgpLmjIflrppcbiAgICAgKi9cbiAgICBnZXRHcm91cChpZDogc3RyaW5nKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0R3JvdXAoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiAxc3QgbGF5ZXIge0BsaW5rIEdyb3VwUHJvZmlsZX0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSDnrKwx6ZqO5bGk44GuIHtAbGluayBHcm91cFByb2ZpbGV9IOeZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIHRvcEdyb3VwXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RlZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAg5qeL56+J5riI44G/IHtAbGluayBHcm91cFByb2ZpbGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXA6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgMXN0IGxheWVyIHtAbGluayBHcm91cFByb2ZpbGV9LiA8YnI+XG4gICAgICogICAgIEEgY29weSBhcnJheSBpcyByZXR1cm5lZCwgc28gdGhlIGNsaWVudCBjYW5ub3QgY2FjaGUgaXQuXG4gICAgICogQGphIOesrDHpmo7lsaTjga4ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg44Kz44OU44O86YWN5YiX44GM6L+U44GV44KM44KL44Gf44KB44CB44Kv44Op44Kk44Ki44Oz44OI44Gv44Kt44Oj44OD44K344Ol5LiN5Y+vXG4gICAgICovXG4gICAgZ2V0VG9wR3JvdXBzKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0VG9wR3JvdXBzKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4cGFuZCBhbGwgZ3JvdXBzICgxc3QgbGF5ZXIpXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWxlemWiyAoMemajuWxpClcbiAgICAgKi9cbiAgICBleHBhbmRBbGwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmV4cGFuZEFsbCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb2xsYXBzZSBhbGwgZ3JvdXBzICgxc3QgbGF5ZXIpXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWPjuadnyAoMemajuWxpClcbiAgICAgKi9cbiAgICBjb2xsYXBzZUFsbChkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5jb2xsYXBzZUFsbChkZWxheSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcuXG4gICAgICogQGphIOWxlemWi+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNFeHBhbmRpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDlj47mnZ/kuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0NvbGxhcHNpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcgb3IgY29sbGFwc2luZy5cbiAgICAgKiBAamEg6ZaL6ZaJ5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc1N3aXRjaGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5jcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gICAgICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gICAgICovXG4gICAgc3RhdHVzQWRkUmVmKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc3RhdHVzQWRkUmVmKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICAgICAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jg4fjgq/jg6rjg6Hjg7Pjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICAgICAqL1xuICAgIHN0YXR1c1JlbGVhc2Uoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN0YXRlIHZhcmlhYmxlIG1hbmFnZW1lbnQgc2NvcGVcbiAgICAgKiBAamEg54q25oWL5aSJ5pWw566h55CG44K544Kz44O844OXXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dmFsIG9mIHNlZWQgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDlr77osaHjga7plqLmlbDjga7miLvjgorlgKRcbiAgICAgKi9cbiAgICBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZywgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnN0YXR1c1Njb3BlKHN0YXR1cywgZXhlY3V0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBpZiBpdCdzIGluIHRoZSBzcGVjaWZpZWQgc3RhdGUuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+eKtuaFi+S4reOBp+OBguOCi+OBi+eiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZTog54q25oWL5YaFIC8gZmFsc2U6IOeKtuaFi+WkllxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IHdpdGhpbiB0aGUgc3RhdHVzIC8gYGZhbHNlYDogb3V0IG9mIHRoZSBzdGF0dXNcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog54q25oWL5YaFIC8gYGZhbHNlYDog54q25oWL5aSWXG4gICAgICovXG4gICAgaXNTdGF0dXNJbihzdGF0dXM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc1N0YXR1c0luKHN0YXR1cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IExpc3RWaWV3XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRGVzdHJveSBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4RcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICBzdXBlci5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVsZWFzZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBvdmVycmlkZSBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlc3RvcmUoa2V5LCByZWJ1aWxkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciBiYWNrdXAgZGF0YSBleGlzdHMuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoeOCkueiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMgLyBmYWxzZTogbm90IGV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJIC8gZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIG92ZXJyaWRlIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5oYXNCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGlzY2FyZCBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGRpc2NhcmQgZXhpc3RpbmcgZGF0YSAvIGZhbHNlOiBzcGVjaWZpZWQgZGF0YSBkb2VzIG5vdCBleGlzdFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5a2Y5Zyo44GX44Gf44OH44O844K/44KS56C05qOEIC8gZmFsc2U6IOaMh+WumuOBleOCjOOBn+ODh+ODvOOCv+OBr+WtmOWcqOOBl+OBquOBhFxuICAgICAqL1xuICAgIG92ZXJyaWRlIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5jbGVhckJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqL1xuICAgIG92ZXJyaWRlIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiBVbmtub3duT2JqZWN0IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0QmFja3VwRGF0YShrZXkpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQGVuIEJhY2t1cCBkYXRhIGNhbiBiZSBzZXQgZXh0ZXJuYWxseS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXlcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZWVkZWQgLyBmYWxzZTogc2NoZW1hIGludmFsaWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDjgrnjgq3jg7zjg57jgYzkuI3mraNcbiAgICAgKi9cbiAgICBvdmVycmlkZSBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiBVbmtub3duT2JqZWN0KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldEJhY2t1cERhdGEoa2V5LCBkYXRhIGFzIHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfSk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbIiQiLCJfcHJvcGVydGllcyIsInNldFRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7OztBQUdHO0FBRUgsQ0FBQSxZQUFxQjtBQU1qQjs7O0FBR0c7QUFDSCxJQUFBLElBS0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7QUFMRCxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLHFCQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEscUJBQThDLENBQUE7UUFDOUMsV0FBMkMsQ0FBQSxXQUFBLENBQUEsMENBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxHQUFBLHFDQUE4QixDQUFDLEVBQUUsc0NBQXNDLENBQUMsQ0FBQSxHQUFBLDBDQUFBLENBQUE7UUFDNUosV0FBMkMsQ0FBQSxXQUFBLENBQUEsaUNBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxHQUFBLHFDQUE4QixDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQSxHQUFBLGlDQUFBLENBQUE7UUFDdkosV0FBMkMsQ0FBQSxXQUFBLENBQUEscUNBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxH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