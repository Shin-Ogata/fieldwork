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
    enableTransformOffset: true,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktbGlzdHZpZXcubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiZ2xvYmFsLWNvbmZpZy50cyIsInByb2ZpbGUvaXRlbS50cyIsInByb2ZpbGUvcGFnZS50cyIsInByb2ZpbGUvZ3JvdXAudHMiLCJsaXN0LWl0ZW0tdmlldy50cyIsImNvcmUvZWxlbWVudC1zY3JvbGxlci50cyIsImNvcmUvbGlzdC50cyIsImxpc3Qtdmlldy50cyIsImV4cGFuZGFibGUtbGlzdC1pdGVtLXZpZXcudHMiLCJjb3JlL2V4cGFuZC50cyIsImV4cGFuZGFibGUtbGlzdC12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfTElTVFZJRVcgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLkxJU1RWSUVXKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9MSVNUVklFV19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAxLCAnbGlzdHZpZXcgaGFzIGludmFsaWQgaW5pdGlhbGl6YXRpb24uJyksXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0gICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDIsICdsaXN0dmlldyBnaXZlbiBhIGludmFsaWQgcGFyYW0uJyksXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfT1BFUkFUSU9OICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDMsICdsaXN0dmlldyBpbnZhbGlkIG9wZXJhdGlvbi4nKSxcbiAgICB9XG59XG4iLCIvKipcbiAqIEBlbiBHbG9iYWwgY29uZmlndXJhdGlvbiBkZWZpbml0aW9uIGZvciBsaXN0IHZpZXdzLlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICBOQU1FU1BBQ0U6IHN0cmluZztcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBzdHJpbmc7XG4gICAgSU5BQ1RJVkVfQ0xBU1M6IHN0cmluZztcbiAgICBSRUNZQ0xFX0NMQVNTOiBzdHJpbmc7XG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogc3RyaW5nO1xuICAgIERBVEFfUEFHRV9JTkRFWDogc3RyaW5nO1xuICAgIERBVEFfSVRFTV9JTkRFWDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHRWIHtcbiAgICBOQU1FU1BBQ0UgICAgICAgICAgICAgICAgICAgID0gJ2NkcC11aScsIC8vIFRPRE86IG5hbWVzcGFjZSDjga8gdXRpbHMg44Gr56e744GZXG4gICAgU0NST0xMX01BUF9DTEFTUyAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctc2Nyb2xsLW1hcGAsXG4gICAgSU5BQ1RJVkVfQ0xBU1MgICAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0taW5hY3RpdmVgLFxuICAgIFJFQ1lDTEVfQ0xBU1MgICAgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXJlY3ljbGVgLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LWl0ZW0tYmFzZWAsXG4gICAgREFUQV9QQUdFX0lOREVYICAgICAgICAgICAgICA9ICdkYXRhLXBhZ2UtaW5kZXgnLFxuICAgIERBVEFfSVRFTV9JTkRFWCAgICAgICAgICAgICAgPSAnZGF0YS1pdGVtLWluZGV4Jyxcbn1cblxuY29uc3QgX2NvbmZpZyA9IHtcbiAgICBOQU1FU1BBQ0U6IERlZmF1bHRWLk5BTUVTUEFDRSxcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBEZWZhdWx0Vi5TQ1JPTExfTUFQX0NMQVNTLFxuICAgIElOQUNUSVZFX0NMQVNTOiBEZWZhdWx0Vi5JTkFDVElWRV9DTEFTUyxcbiAgICBSRUNZQ0xFX0NMQVNTOiBEZWZhdWx0Vi5SRUNZQ0xFX0NMQVNTLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IERlZmF1bHRWLkxJU1RJVEVNX0JBU0VfQ0xBU1MsXG4gICAgREFUQV9QQUdFX0lOREVYOiBEZWZhdWx0Vi5EQVRBX1BBR0VfSU5ERVgsXG4gICAgREFUQV9JVEVNX0lOREVYOiBEZWZhdWx0Vi5EQVRBX0lURU1fSU5ERVgsXG59O1xuXG5leHBvcnQgdHlwZSBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyA9IFBhcnRpYWw8XG5QaWNrPExpc3RWaWV3R2xvYmFsQ29uZmlnXG4sICdOQU1FU1BBQ0UnXG58ICdTQ1JPTExfTUFQX0NMQVNTJ1xufCAnSU5BQ1RJVkVfQ0xBU1MnXG58ICdSRUNZQ0xFX0NMQVNTJ1xufCAnTElTVElURU1fQkFTRV9DTEFTUydcbnwgJ0RBVEFfUEFHRV9JTkRFWCdcbnwgJ0RBVEFfSVRFTV9JTkRFWCdcbj4+O1xuXG5jb25zdCBlbnN1cmVOZXdDb25maWcgPSAobmV3Q29uZmlnOiBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyk6IFBhcnRpYWw8TGlzdFZpZXdHbG9iYWxDb25maWc+ID0+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIE5BTUVTUEFDRTogbnMsXG4gICAgICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHNjcm9sbG1hcCxcbiAgICAgICAgSU5BQ1RJVkVfQ0xBU1M6IGluYWN0aXZlLFxuICAgICAgICBSRUNZQ0xFX0NMQVNTOiByZWN5Y2xlLFxuICAgICAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBpdGVtYmFzZSxcbiAgICAgICAgREFUQV9QQUdFX0lOREVYOiBkYXRhcGFnZSxcbiAgICAgICAgREFUQV9JVEVNX0lOREVYOiBkYXRhaXRlbSxcbiAgICB9ID0gbmV3Q29uZmlnO1xuXG4gICAgY29uc3QgTkFNRVNQQUNFID0gbnM7XG4gICAgY29uc3QgU0NST0xMX01BUF9DTEFTUyA9IHNjcm9sbG1hcCA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctc2Nyb2xsLW1hcGAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IElOQUNUSVZFX0NMQVNTID0gaW5hY3RpdmUgPz8gKG5zID8gYCR7bnN9LWluYWN0aXZlYCA6IHVuZGVmaW5lZCk7XG4gICAgY29uc3QgUkVDWUNMRV9DTEFTUyA9IHJlY3ljbGUgPz8gKG5zID8gYCR7bnN9LWxpc3R2aWV3LXJlY3ljbGVgIDogdW5kZWZpbmVkKTtcbiAgICBjb25zdCBMSVNUSVRFTV9CQVNFX0NMQVNTID0gaXRlbWJhc2UgPz8gKG5zID8gYCR7bnN9LWxpc3R2aWV3LWl0ZW0tYmFzZWAgOiB1bmRlZmluZWQpO1xuXG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obmV3Q29uZmlnLCB7XG4gICAgICAgIE5BTUVTUEFDRSxcbiAgICAgICAgU0NST0xMX01BUF9DTEFTUyxcbiAgICAgICAgSU5BQ1RJVkVfQ0xBU1MsXG4gICAgICAgIFJFQ1lDTEVfQ0xBU1MsXG4gICAgICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MsXG4gICAgICAgIERBVEFfUEFHRV9JTkRFWDogZGF0YXBhZ2UsXG4gICAgICAgIERBVEFfSVRFTV9JTkRFWDogZGF0YWl0ZW0sXG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQvVXBkYXRlIGdsb2JhbCBjb25maWd1cmF0aW9uIG9mIGxpc3Qgdmlldy5cbiAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjga7jgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjg6zjg7zjgrfjg6fjg7Pjga7lj5blvpcv5pu05pawXG4gKi9cbmV4cG9ydCBjb25zdCBMaXN0Vmlld0dsb2JhbENvbmZpZyA9IChuZXdDb25maWc/OiBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyk6IExpc3RWaWV3R2xvYmFsQ29uZmlnID0+IHtcbiAgICBpZiAobmV3Q29uZmlnKSB7XG4gICAgICAgIGVuc3VyZU5ld0NvbmZpZyhuZXdDb25maWcpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhuZXdDb25maWcpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgT2JqZWN0LmFzc2lnbihfY29uZmlnLCBuZXdDb25maWcpKTtcbn07XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25PYmplY3QsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHsgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzIH0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RJdGVtVmlldyxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB7IExpc3RWaWV3R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vZ2xvYmFsLWNvbmZpZyc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBsaXN0IGl0ZW1zLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEl0ZW1Qcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3I7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luZm86IFVua25vd25PYmplY3Q7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleD86IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsIGJlbG9uZ2luZyBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfcGFnZUluZGV4PzogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgZ2xvYmFsIG9mZnNldCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBiYXNlIGRvbSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgXyRiYXNlPzogRE9NO1xuICAgIC8qKiBAaW50ZXJuYWwgSUxpc3RJdGVtVmlldyBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX2luc3RhbmNlPzogSUxpc3RJdGVtVmlldztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJTGlzdFZpZXdDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7liJ3mnJ/jga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElMaXN0Q29udGV4dCwgaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIF9pbmZvOiBVbmtub3duT2JqZWN0KSB7XG4gICAgICAgIHRoaXMuX293bmVyICAgICAgID0gb3duZXI7XG4gICAgICAgIHRoaXMuX2hlaWdodCAgICAgID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplciA9IGluaXRpYWxpemVyO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgICA9IF9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBoZWlnaHQuICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBpdGVtJ3MgZ2xvYmFsIGluZGV4LiAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBnZXQgcGFnZUluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYWdlSW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCBiZWxvbmdpbmcgdGhlIHBhZ2UgaW5kZXguICovXG4gICAgc2V0IHBhZ2VJbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX3BhZ2VJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgZ2xvYmFsIG9mZnNldC4gKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIHNldCBvZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgaW5pdCBwYXJhbWV0ZXJzLiAqL1xuICAgIGdldCBpbmZvKCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5mbztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZSA9IHRoaXMucHJlcGFyZUJhc2VFbGVtZW50KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUluZGV4KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgICAgIGVsOiB0aGlzLl8kYmFzZSxcbiAgICAgICAgICAgICAgICBvd25lcjogdGhpcy5fb3duZXIsXG4gICAgICAgICAgICAgICAgaXRlbTogdGhpcyxcbiAgICAgICAgICAgIH0sIHRoaXMuX2luZm8pO1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSBuZXcgdGhpcy5faW5pdGlhbGl6ZXIob3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoJ25vbmUnID09PSB0aGlzLl8kYmFzZS5jc3MoJ2Rpc3BsYXknKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAndmlzaWJsZScgIT09IHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIGl0ZW0gaW52aXNpYmxlLlxuICAgICAqIEBqYSBpdGVtIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAnaGlkZGVuJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5hZGRDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZnJlc2ggdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5pu05pawXG4gICAgICovXG4gICAgcHVibGljIHJlZnJlc2goKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW5kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgYWN0aXZhdGlvbiBzdGF0dXMgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5rS75oCn54q25oWL5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9pbnN0YW5jZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGhlaWdodCBpbmZvcm1hdGlvbiBvZiB0aGUgaXRlbS4gQ2FsbGVkIGZyb20ge0BsaW5rIExpc3RJdGVtVmlld30uXG4gICAgICogQGphIGl0ZW0g44Gu6auY44GV5oOF5aCx44Gu5pu05pawLiB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gbmV3SGVpZ2h0IC0gdGhpcy5faGVpZ2h0O1xuICAgICAgICB0aGlzLl9oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YSk7XG4gICAgICAgIGlmIChvcHRpb25zPy5yZWZsZWN0QWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGVQcm9maWxlcyh0aGlzLl9pbmRleCA/PyAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXNldCB6LWluZGV4LiBDYWxsZWQgZnJvbSB7QGxpbmsgU2Nyb2xsTWFuYWdlcn1gLnJlbW92ZUl0ZW0oKWAuXG4gICAgICogQGphIHotaW5kZXgg44Gu44Oq44K744OD44OILiB7QGxpbmsgU2Nyb2xsTWFuYWdlcn1gLnJlbW92ZUl0ZW0oKWAg44GL44KJ44Kz44O844Or44GV44KM44KL44CCXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0RGVwdGgoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCd6LWluZGV4JywgdGhpcy5fb3duZXIub3B0aW9ucy5iYXNlRGVwdGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHByZXBhcmVCYXNlRWxlbWVudCgpOiBET00ge1xuICAgICAgICBsZXQgJGJhc2U6IERPTTtcbiAgICAgICAgY29uc3QgJHJlY3ljbGUgPSB0aGlzLl9vd25lci5maW5kUmVjeWNsZUVsZW1lbnRzKCkuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgaXRlbVRhZ05hbWUgPSB0aGlzLl9vd25lci5vcHRpb25zLml0ZW1UYWdOYW1lO1xuXG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ3RoaXMuXyRiYXNlIGlzIG5vdCBudWxsLicpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuXyRiYXNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCAkcmVjeWNsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICRiYXNlID0gJHJlY3ljbGU7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVBdHRyKCd6LWluZGV4Jyk7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUT0RPOiAg6KaB5qSc6KiOLiA8bGk+IOWFqOiIrOOBryA8c2xvdD4g44Go44Gp44Gu44KI44GG44Gr5Y2U6Kq/44GZ44KL44GLP1xuICAgICAgICAgICAgJGJhc2UgPSAkKGA8JHtpdGVtVGFnTmFtZX0gY2xhc3M9XCIke3RoaXMuX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTfVwiPjwvXCIke2l0ZW1UYWdOYW1lfVwiPmApO1xuICAgICAgICAgICAgJGJhc2UuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLiRzY3JvbGxNYXAuYXBwZW5kKCRiYXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOmrmOOBleOBruabtOaWsFxuICAgICAgICBpZiAoJGJhc2UuaGVpZ2h0KCkgIT09IHRoaXMuX2hlaWdodCkge1xuICAgICAgICAgICAgJGJhc2UuaGVpZ2h0KHRoaXMuX2hlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGJhc2U7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgpICE9PSBTdHJpbmcodGhpcy5faW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgsIHRoaXMuX2luZGV4ISk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVQYWdlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpICE9PSBTdHJpbmcodGhpcy5fcGFnZUluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9QQUdFX0lOREVYLCB0aGlzLl9wYWdlSW5kZXghKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZU9mZnNldCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl8kYmFzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX293bmVyLm9wdGlvbnMuZW5hYmxlVHJhbnNmb3JtT2Zmc2V0KSB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zbGF0ZVkgfSA9IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyh0aGlzLl8kYmFzZVswXSk7XG4gICAgICAgICAgICBpZiAodHJhbnNsYXRlWSAhPT0gdGhpcy5fb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlM2QoMCwke3RoaXMuX29mZnNldH1weCwwYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0b3AgPSBwYXJzZUludCh0aGlzLl8kYmFzZS5jc3MoJ3RvcCcpLCAxMCk7XG4gICAgICAgICAgICBpZiAodG9wICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RvcCcsIGAke3RoaXMuX29mZnNldH1weGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgYXQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vaXRlbSc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBvbmUgcGFnZSBvZiB0aGUgbGlzdC5cbiAqIEBqYSDjg6rjgrnjg4gx44Oa44O844K45YiG44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgUGFnZVByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcbiAgICAvKiogQGludGVybmFsIHBhZ2Ugb2Zmc2V0IGZyb20gdG9wICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIHBhZ2UncyBoZWlnaHQgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgaXRlbSdzIHByb2ZpbGUgbWFuYWdlZCB3aXRoIGluIHBhZ2UgKi9cbiAgICBwcml2YXRlIF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBzdGF0dXMgKi9cbiAgICBwcml2YXRlIF9zdGF0dXM6ICdhY3RpdmUnIHwgJ2luYWN0aXZlJyB8ICdoaWRkZW4nID0gJ2luYWN0aXZlJztcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIHBhZ2UgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIHBhZ2UgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2Ugb2Zmc2V0ICovXG4gICAgZ2V0IG9mZnNldCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIHBhZ2Ugb2Zmc2V0ICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBoZWlnaHQgKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBzdGF0dXMgKi9cbiAgICBnZXQgc3RhdHVzKCk6ICdhY3RpdmUnIHwgJ2luYWN0aXZlJyB8ICdoaWRkZW4nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnYWN0aXZlJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2FjdGl2ZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIHBhZ2UgaW52aXNpYmxlLlxuICAgICAqIEBqYSBwYWdlIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2hpZGRlbicgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2hpZGRlbic7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIHBhZ2UuXG4gICAgICogQGphIHBhZ2Ug44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaW5hY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdpbmFjdGl2ZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB7QGxpbmsgSXRlbVByb2ZpbGV9IHRvIHRoZSBwYWdlLlxuICAgICAqIEBqYSB7QGxpbmsgSXRlbVByb2ZpbGV9IOOBrui/veWKoFxuICAgICAqL1xuICAgIHB1YmxpYyBwdXNoKGl0ZW06IEl0ZW1Qcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2l0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIHRoaXMuX2hlaWdodCArPSBpdGVtLmhlaWdodDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSWYgYWxsIHtAbGluayBJdGVtUHJvZmlsZX0gdW5kZXIgdGhlIHBhZ2UgYXJlIG5vdCB2YWxpZCwgZGlzYWJsZSB0aGUgcGFnZSdzIHN0YXR1cy5cbiAgICAgKiBAamEg6YWN5LiL44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44GZ44G544Gm44GM5pyJ5Yq544Gn44Gq44GE5aC05ZCILCBwYWdlIOOCueODhuODvOOCv+OCueOCkueEoeWKueOBq+OBmeOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBub3JtYWxpemUoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuYWJsZUFsbCA9IHRoaXMuX2l0ZW1zLmV2ZXJ5KGl0ZW0gPT4gaXRlbS5pc0FjdGl2ZSgpKTtcbiAgICAgICAgaWYgKCFlbmFibGVBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXR1cyA9ICdpbmFjdGl2ZSc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBJdGVtUHJvZmlsZX0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumuOBl+OBpiB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtKGluZGV4OiBudW1iZXIpOiBJdGVtUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLl9pdGVtcywgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZmlyc3Qge0BsaW5rIEl0ZW1Qcm9maWxlfS5cbiAgICAgKiBAamEg5pyA5Yid44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW1GaXJzdCgpOiBJdGVtUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pdGVtc1swXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGxhc3Qge0BsaW5rIEl0ZW1Qcm9maWxlfS5cbiAgICAgKiBAamEg5pyA5b6M44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW1MYXN0KCk6IEl0ZW1Qcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zW3RoaXMuX2l0ZW1zLmxlbmd0aCAtIDFdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VSZXN1bHQsXG4gICAgdG9IZWxwU3RyaW5nLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2Jhc2UnO1xuaW1wb3J0IHR5cGUgeyBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvZXhwYW5kYWJsZS1jb250ZXh0JztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuLyoqXG4gKiBAZW4gVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIHN0b3JhZ2UgY2xhc3MgZm9yIGdyb3VwIG1hbmFnZW1lbnQgb2YgbGlzdCBpdGVtcy4gPGJyPlxuICogICAgIFRoaXMgY2xhc3MgZG9lcyBub3QgZGlyZWN0bHkgbWFuaXB1bGF0ZSB0aGUgRE9NLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOCkuOCsOODq+ODvOODl+euoeeQhuOBmeOCiyBVSSDmp4vpgKDmg4XloLHmoLzntI3jgq/jg6njgrkgPGJyPlxuICogICAgIOacrOOCr+ODqeOCueOBr+ebtOaOpeOBryBET00g44KS5pON5L2c44GX44Gq44GEXG4gKi9cbmV4cG9ydCBjbGFzcyBHcm91cFByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgcHJvZmlsZSBpZCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2lkOiBzdHJpbmc7XG4gICAgLyoqIEBpbnRlcm5hbCB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSBpbnN0YW5jZSovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQ7XG4gICAgLyoqIEBpbnRlcm5hbCBwYXJlbnQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgKi9cbiAgICBwcml2YXRlIF9wYXJlbnQ/OiBHcm91cFByb2ZpbGU7XG4gICAgLyoqIEBpbnRlcm5hbCBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBhcnJheSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2NoaWxkcmVuOiBHcm91cFByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiBAaW50ZXJuYWwgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzICovXG4gICAgcHJpdmF0ZSBfZXhwYW5kZWQgPSBmYWxzZTtcbiAgICAvKiogQGludGVybmFsIHJlZ2lzdHJhdGlvbiBzdGF0dXMgZm9yIF9vd25lciAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcgPSAndW5yZWdpc3RlcmVkJztcbiAgICAvKiogQGludGVybmFsIHN0b3JlZCB7QGxpbmsgSXRlbVByb2ZpbGV9IGluZm9ybWF0aW9uICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJRXhwYW5kYWJsZUxpc3RDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgaWQgb2YgdGhlIGluc3RhbmNlLiBzcGVjaWZpZWQgYnkgdGhlIGZyYW1ld29yay5cbiAgICAgKiAgLSBgamFgIOOCpOODs+OCueOCv+ODs+OCueOBriBJRC4g44OV44Os44O844Og44Ov44O844Kv44GM5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQsIGlkOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5faWQgICAgPSBpZDtcbiAgICAgICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IElELlxuICAgICAqIEBqYSBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBlbiBHZXQgc3RhdHVzLiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqIEBqYSDjgrnjg4bjg7zjgr/jgrnjgpLlj5blvpcgJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCdcbiAgICAgKi9cbiAgICBnZXQgc3RhdHVzKCk6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzLlxuICAgICAqIEBqYSDlsZXplovnirbmhYvjgpLliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleHBhbmRlZCwgY29sbGFwc2VkOiBjbG9zZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5bGV6ZaLLCBmYWxzZTog5Y+O5p2fXG4gICAgICovXG4gICAgZ2V0IGlzRXhwYW5kZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHBhbmRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg6KaqIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBwYXJlbnQoKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNoaWxkcmVuIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNoaWxkcmVuKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkcmVuO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbmV4dCBhdmFpbGFibGUgaW5kZXggb2YgdGhlIGxhc3QgaXRlbSBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDlvozjga4gaXRlbSDopoHntKDjga7mrKHjgavkvb/nlKjjgafjgY3jgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gd2l0aEFjdGl2ZUNoaWxkcmVuIFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHNlYXJjaCBpbmNsdWRpbmcgcmVnaXN0ZXJlZCBjaGlsZCBlbGVtZW50c1xuICAgICAqICAtIGBqYWAg55m76Yyy5riI44G/44Gu5a2Q6KaB57Sg44KS5ZCr44KB44Gm5qSc57Si44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGdldE5leHRJdGVtSW5kZXgod2l0aEFjdGl2ZUNoaWxkcmVuID0gZmFsc2UpOiBudW1iZXIge1xuICAgICAgICBsZXQgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgaWYgKHdpdGhBY3RpdmVDaGlsZHJlbikge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCA9PSBpdGVtcyB8fCBpdGVtcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLl9pdGVtcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGl0ZW1zW2l0ZW1zLmxlbmd0aCAtIDFdPy5pbmRleCA/PyAwKSArIDE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSDmnKwgR3JvdXBQcm9maWxlIOOBjOeuoeeQhuOBmeOCiyBpdGVtIOOCkuS9nOaIkOOBl+OBpueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkSXRlbShcbiAgICAgICAgaGVpZ2h0OiBudW1iZXIsXG4gICAgICAgIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG4gICAgICAgIGluZm86IFVua25vd25PYmplY3QsXG4gICAgKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBncm91cDogdGhpcyB9LCBpbmZvKTtcbiAgICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtUHJvZmlsZSh0aGlzLl9vd25lci5jb250ZXh0LCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBfb3duZXIg44Gu566h55CG5LiL44Gr44GC44KL44Go44GN44Gv6YCf44KE44GL44Gr6L+95YqgXG4gICAgICAgIGlmICgncmVnaXN0ZXJlZCcgPT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbSwgdGhpcy5nZXROZXh0SXRlbUluZGV4KCkpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faXRlbXMucHVzaChpdGVtKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBHcm91cFByb2ZpbGV9IGFzIGNoaWxkIGVsZW1lbnQuXG4gICAgICogQGphIOWtkOimgee0oOOBqOOBl+OBpiB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgLyBpbnN0YW5jZSBhcnJheVxuICAgICAqL1xuICAgIHB1YmxpYyBhZGRDaGlsZHJlbih0YXJnZXQ6IEdyb3VwUHJvZmlsZSB8IEdyb3VwUHJvZmlsZVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNoaWxkcmVuOiBHcm91cFByb2ZpbGVbXSA9IEFycmF5LmlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFt0YXJnZXRdO1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgICAgICBjaGlsZC5zZXRQYXJlbnQodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2hpbGRyZW4ucHVzaCguLi5jaGlsZHJlbik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgaXQgaGFzIGEgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgZ2V0IGhhc0NoaWxkcmVuKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9jaGlsZHJlbi5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwIGV4cGFuc2lvbi5cbiAgICAgKiBAamEg44Kw44Or44O844OX5bGV6ZaLXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGV4cGFuZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgncmVnaXN0ZXJlZCcpO1xuICAgICAgICAgICAgaWYgKDAgPCBpdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9vd25lci5zdGF0dXNTY29wZSgnZXhwYW5kaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbXMsIHRoaXMuZ2V0TmV4dEl0ZW1JbmRleCgpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5bGV6ZaL54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgY29sbGFwc2UuXG4gICAgICogQGphIOOCsOODq+ODvOODl+WPjuadn1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGNvbGxhcHNlKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgndW5yZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gdGhpcy5fb3duZXIuY29udGV4dC5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdjb2xsYXBzaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgaXRlbXNbMF0uaW5kZXggJiYgdGhpcy5fb3duZXIucmVtb3ZlSXRlbShpdGVtc1swXS5pbmRleCwgaXRlbXMubGVuZ3RoLCBkZWxheSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIOWtkOimgee0oOOBjOOBquOBj+OBpuOCguWPjuadn+eKtuaFi+OBq+OBmeOCi1xuICAgICAgICB0aGlzLl9leHBhbmRlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG93IHNlbGYgaW4gdmlzaWJsZSBhcmVhIG9mIGxpc3QuXG4gICAgICogQGphIOiHqui6q+OCkuODquOCueODiOOBruWPr+imlumgmOWfn+OBq+ihqOekulxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IG9wdGlvbidzIG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAobnVsbCAhPSB0aGlzLl9pdGVtc1swXS5pbmRleCkgJiYgYXdhaXQgdGhpcy5fb3duZXIuZW5zdXJlVmlzaWJsZSh0aGlzLl9pdGVtc1swXS5pbmRleCwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zPy5jYWxsYmFjaz8uKHRoaXMuX293bmVyLnNjcm9sbFBvcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVG9nZ2xlIGV4cGFuZCAvIGNvbGxhcHNlLlxuICAgICAqIEBqYSDplovplonjga7jg4jjgrDjg6tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSBzcGVudCByZW1vdmluZyBlbGVtZW50cy4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICogIC0gYGphYCDopoHntKDliYrpmaTjgavosrvjgoTjgZnpgYXlu7bmmYLplpMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyB0b2dnbGUoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2V4cGFuZGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNvbGxhcHNlKGRlbGF5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZXhwYW5kKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgdG8gbGlzdCB2aWV3LiBPbmx5IDFzdCBsYXllciBncm91cCBjYW4gYmUgcmVnaXN0ZXJlZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G455m76YyyLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/55m76Yyy5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIGluc2VydFRvXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGluc2VydGlvbiBwb3NpdGlvbiB3aXRoIGluZGV4XG4gICAgICogIC0gYGphYCDmjL/lhaXkvY3nva7jgpIgaW5kZXgg44Gn5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlZ2lzdGVyKGluc2VydFRvOiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gJ0dyb3VwUHJvZmlsZSNyZWdpc3RlcicgbWV0aG9kIGlzIGFjY2VwdGFibGUgb25seSAxc3QgbGF5ZXIgZ3JvdXAuYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbSh0aGlzLnByZXByb2Nlc3MoJ3JlZ2lzdGVyZWQnKSwgaW5zZXJ0VG8pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdG9yZSB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSBzcGVjaWZpZWQuXG4gICAgICogQGphIOODquOCueODiOODk+ODpeODvOOBuOW+qeWFgy4g56ysMemajuWxpOOCsOODq+ODvOODl+OBruOBv+aMh+ekuuWPr+iDvS5cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzdG9yZSgpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gJ0dyb3VwUHJvZmlsZSNyZXN0b3JlJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMuX2V4cGFuZGVkID8gdGhpcy5faXRlbXMuY29uY2F0KHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ2FjdGl2ZScpKSA6IHRoaXMuX2l0ZW1zLnNsaWNlKCk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsIOimqiBHcm91cCDmjIflrpogKi9cbiAgICBwcml2YXRlIHNldFBhcmVudChwYXJlbnQ6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAgcmVnaXN0ZXIgLyB1bnJlZ2lzdGVyIOOBruWJjeWHpueQhiAqL1xuICAgIHByaXZhdGUgcHJlcHJvY2VzcyhuZXdTdGF0dXM6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnKTogSXRlbVByb2ZpbGVbXSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGlmIChuZXdTdGF0dXMgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgaXRlbXMucHVzaCguLi50aGlzLl9pdGVtcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gbmV3U3RhdHVzO1xuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCDmk43kvZzlr77osaHjga4gSXRlbVByb2ZpbGUg6YWN5YiX44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBxdWVyeU9wZXJhdGlvblRhcmdldChvcGVyYXRpb246ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnIHwgJ2FjdGl2ZScpOiBJdGVtUHJvZmlsZVtdIHtcbiAgICAgICAgY29uc3QgZmluZFRhcmdldHMgPSAoZ3JvdXA6IEdyb3VwUHJvZmlsZSk6IEl0ZW1Qcm9maWxlW10gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZ3JvdXAuX2NoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVnaXN0ZXJlZCc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VucmVnaXN0ZXJlZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkLnByZXByb2Nlc3Mob3BlcmF0aW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWN0aXZlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNoaWxkLl9pdGVtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGQuX2l0ZW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIG9wZXJhdGlvbjogJHtvcGVyYXRpb259YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5maW5kVGFyZ2V0cyhjaGlsZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZpbmRUYXJnZXRzKHRoaXMpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFZpZXcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBvd25lcjogSUxpc3RWaWV3O1xuICAgIHJlYWRvbmx5IGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayBMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDmp4vnr4njgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgb3duZXI6IElMaXN0VmlldztcbiAgICBpdGVtOiBJdGVtUHJvZmlsZTtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBpdGVtIGNvbnRhaW5lciBjbGFzcyBoYW5kbGVkIGJ5IHtAbGluayBMaXN0Vmlld30uXG4gKiBAamEge0BsaW5rIExpc3RWaWV3fSDjgYzmibHjgYbjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgrPjg7Pjg4bjg4rjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpc3RJdGVtVmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElMaXN0SXRlbVZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgeyBvd25lciwgaXRlbSB9ID0gb3B0aW9ucztcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBvd25lcixcbiAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKiogT3duZXIg5Y+W5b6XICovXG4gICAgZ2V0IG93bmVyKCk6IElMaXN0VmlldyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5vd25lcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBWaWV3IGNvbXBvbmVudCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuJGVsLmNoaWxkcmVuKCkucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xuICAgICAgICAvLyB0aGlzLiRlbCDjga/lho3liKnnlKjjgZnjgovjgZ/jgoHlrozlhajjgarnoLTmo4Tjga/jgZfjgarjgYRcbiAgICAgICAgdGhpcy5zZXRFbGVtZW50KCdudWxsJyk7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEl0ZW1WaWV3XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IG93biBpdGVtIGluZGV4XG4gICAgICogQGphIOiHqui6q+OBriBpdGVtIOOCpOODs+ODh+ODg+OCr+OCueOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uaXRlbS5pbmRleCE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBzcGVjaWZpZWQgaGVpZ2h0LlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/pq5jjgZXjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLmhlaWdodDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgaWYgY2hpbGQgbm9kZSBleGlzdHMuXG4gICAgICogQGphIGNoaWxkIG5vZGUg44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGhhc0NoaWxkTm9kZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy4kZWw/LmNoaWxkcmVuKCkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaXRlbSdzIGhlaWdodC5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXjgpLmm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdIZWlnaHRcbiAgICAgKiAgLSBgZW5gIG5ldyBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaWsOOBl+OBhOmrmOOBlVxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB1cGRhdGUgb3B0aW9ucyBvYmplY3RcbiAgICAgKiAgLSBgamFgIOabtOaWsOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHVwZGF0ZUhlaWdodChuZXdIZWlnaHQ6IG51bWJlciwgb3B0aW9ucz86IExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy4kZWwgJiYgdGhpcy5oZWlnaHQgIT09IG5ld0hlaWdodCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uaXRlbS51cGRhdGVIZWlnaHQobmV3SGVpZ2h0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmhlaWdodChuZXdIZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBOdWxsYWJsZSxcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICB0eXBlIENvbm5lY3RFdmVudE1hcCxcbiAgICB0eXBlIFRpbWVySGFuZGxlLFxuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RTY3JvbGxlckZhY3RvcnksXG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0U2Nyb2xsZXIsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG50eXBlIFNjcm9sbGVyRXZlbnRNYXAgPSBIVE1MRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwICYgeyAnc2Nyb2xsc3RvcCc6IEV2ZW50OyB9O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBNSU5fU0NST0xMU1RPUF9EVVJBVElPTiA9IDUwLFxufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIHtAbGluayBJTGlzdFNjcm9sbGVyfSBpbXBsZW1lbnRhdGlvbiBjbGFzcyBmb3IgSFRNTEVsZW1lbnQuXG4gKiBAamEgSFRNTEVsZW1lbnQg44KS5a++6LGh44Go44GX44GfIHtAbGluayBJTGlzdFNjcm9sbGVyfSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEVsZW1lbnRTY3JvbGxlciBpbXBsZW1lbnRzIElMaXN0U2Nyb2xsZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyR0YXJnZXQ6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kc2Nyb2xsTWFwOiBET007XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbFN0b3BUcmlnZ2VyOiBET01FdmVudExpc3RlbmVyO1xuICAgIHByaXZhdGUgX3Njcm9sbER1cmF0aW9uPzogbnVtYmVyO1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodGFyZ2V0OiBET01TZWxlY3RvciwgbWFwOiBET01TZWxlY3Rvciwgb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQgPSAkKHRhcmdldCk7XG4gICAgICAgIHRoaXMuXyRzY3JvbGxNYXAgPSB0aGlzLl8kdGFyZ2V0LmNoaWxkcmVuKCkuZmlyc3QoKTtcbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICAgICAgLypcbiAgICAgICAgICogZmlyZSBjdXN0b20gZXZlbnQ6IGBzY3JvbGxzdG9wYFxuICAgICAgICAgKiBgc2Nyb2xsZW5kYCDjga4gU2FmYXJpIOWvvuW/nOW+heOBoVxuICAgICAgICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvRWxlbWVudC9zY3JvbGxlbmRfZXZlbnRcbiAgICAgICAgICovXG4gICAgICAgIGxldCB0aW1lcjogVGltZXJIYW5kbGU7XG4gICAgICAgIHRoaXMuX3Njcm9sbFN0b3BUcmlnZ2VyID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gdGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kdGFyZ2V0LnRyaWdnZXIobmV3IEN1c3RvbUV2ZW50KCdzY3JvbGxzdG9wJywgeyBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH0pKTtcbiAgICAgICAgICAgIH0sIHRoaXMuX3Njcm9sbER1cmF0aW9uID8/IENvbnN0Lk1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqIOOCv+OCpOODl+Wumue+qeitmOWIpeWtkCAqL1xuICAgIHN0YXRpYyBnZXQgVFlQRSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ2NkcDplbGVtZW50LW92ZXJmbG93LXNjcm9sbGVyJztcbiAgICB9XG5cbiAgICAvKiogZmFjdG9yeSDlj5blvpcgKi9cbiAgICBzdGF0aWMgZ2V0RmFjdG9yeSgpOiBMaXN0U2Nyb2xsZXJGYWN0b3J5IHtcbiAgICAgICAgY29uc3QgZmFjdG9yeSA9ICh0YXJnZXQ6IERPTVNlbGVjdG9yLCBtYXA6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpOiBJTGlzdFNjcm9sbGVyID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRWxlbWVudFNjcm9sbGVyKHRhcmdldCwgbWFwLCBvcHRpb25zKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gc2V0IHR5cGUgc2lnbmF0dXJlLlxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhmYWN0b3J5LCB7XG4gICAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogRWxlbWVudFNjcm9sbGVyLlRZUEUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhY3RvcnkgYXMgTGlzdFNjcm9sbGVyRmFjdG9yeTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGVyXG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu5Z6L5oOF5aCx44KS5Y+W5b6XICovXG4gICAgZ2V0IHR5cGUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIEVsZW1lbnRTY3JvbGxlci5UWVBFO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7lj5blvpcgKi9cbiAgICBnZXQgcG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kdGFyZ2V0LnNjcm9sbFRvcCgpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vmnIDlpKflgKTkvY3nva7jgpLlj5blvpcgKi9cbiAgICBnZXQgcG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLl8kc2Nyb2xsTWFwLmhlaWdodCgpIC0gdGhpcy5fJHRhcmdldC5oZWlnaHQoKSwgMCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOeZu+mMsiAqL1xuICAgIG9uKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uPFNjcm9sbGVyRXZlbnRNYXA+KHR5cGUsIGNhbGxiYWNrIGFzIFVua25vd25GdW5jdGlvbik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOeZu+mMsuino+mZpCAqL1xuICAgIG9mZih0eXBlOiAnc2Nyb2xsJyB8ICdzY3JvbGxzdG9wJywgY2FsbGJhY2s6IERPTUV2ZW50TGlzdGVuZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vZmY8U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChwb3MgPT09IHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxEdXJhdGlvbiA9IChhbmltYXRlID8/IHRoaXMuX29wdGlvbnMuZW5hYmxlQW5pbWF0aW9uKSA/IHRpbWUgPz8gdGhpcy5fb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbiA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKHBvcywgdGhpcy5fc2Nyb2xsRHVyYXRpb24sIHVuZGVmaW5lZCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu54q25oWL5pu05pawICovXG4gICAgdXBkYXRlKCk6IHZvaWQge1xuICAgICAgICAvLyBub29wXG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOOBruegtOajhCAqL1xuICAgIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQ/Lm9mZigpO1xuICAgICAgICAodGhpcy5fJHRhcmdldCBhcyBOdWxsYWJsZTxET00+KSA9ICh0aGlzLl8kc2Nyb2xsTWFwIGFzIE51bGxhYmxlPERPTT4pID0gbnVsbDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgcG9zdCxcbiAgICBub29wLFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VSZXN1bHQsXG4gICAgdG9IZWxwU3RyaW5nLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHtcbiAgICBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMsXG4gICAgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbixcbiAgICBjbGVhclRyYW5zaXRpb24sXG59IGZyb20gJ0BjZHAvdWktdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zLFxuICAgIElMaXN0U2Nyb2xsZXIsXG4gICAgSUxpc3RPcGVyYXRpb24sXG4gICAgSUxpc3RTY3JvbGxhYmxlLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgTGlzdFZpZXdHbG9iYWxDb25maWcgfSBmcm9tICcuLi9nbG9iYWwtY29uZmlnJztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlLCBQYWdlUHJvZmlsZSB9IGZyb20gJy4uL3Byb2ZpbGUnO1xuaW1wb3J0IHsgRWxlbWVudFNjcm9sbGVyIH0gZnJvbSAnLi9lbGVtZW50LXNjcm9sbGVyJztcblxuLyoqIExpc3RDb250ZXh0T3B0aW9ucyDml6LlrprlgKQgKi9cbmNvbnN0IF9kZWZhdWx0T3B0czogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPiA9IHtcbiAgICBzY3JvbGxlckZhY3Rvcnk6IEVsZW1lbnRTY3JvbGxlci5nZXRGYWN0b3J5KCksXG4gICAgZW5hYmxlSGlkZGVuUGFnZTogZmFsc2UsXG4gICAgZW5hYmxlVHJhbnNmb3JtT2Zmc2V0OiB0cnVlLFxuICAgIHNjcm9sbE1hcFJlZnJlc2hJbnRlcnZhbDogMjAwLFxuICAgIHNjcm9sbFJlZnJlc2hEaXN0YW5jZTogMjAwLFxuICAgIHBhZ2VQcmVwYXJlQ291bnQ6IDMsXG4gICAgcGFnZVByZWxvYWRDb3VudDogMSxcbiAgICBlbmFibGVBbmltYXRpb246IHRydWUsXG4gICAgYW5pbWF0aW9uRHVyYXRpb246IDAsXG4gICAgYmFzZURlcHRoOiAnYXV0bycsXG4gICAgaXRlbVRhZ05hbWU6ICdkaXYnLFxuICAgIHJlbW92ZUl0ZW1XaXRoVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICB1c2VEdW1teUluYWN0aXZlU2Nyb2xsTWFwOiBmYWxzZSxcbn07XG5cbi8qKiBpbnZhbGlkIGluc3RhbmNlICovXG5jb25zdCBfJGludmFsaWQgPSAkKCkgYXMgRE9NO1xuXG4vKiog5Yid5pyf5YyW5riI44G/44GL5qSc6Ki8ICovXG5mdW5jdGlvbiB2ZXJpZnk8VD4oeDogVCB8IHVuZGVmaW5lZCk6IGFzc2VydHMgeCBpcyBUIHtcbiAgICBpZiAobnVsbCA9PSB4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9JTklUSUFMSVpBVElPTik7XG4gICAgfVxufVxuXG4vKiogb3ZlcmZsb3cteSDjgpLkv53oqLwgKi9cbmZ1bmN0aW9uIGVuc3VyZU92ZXJmbG93WSgkZWw6IERPTSk6IERPTSB7XG4gICAgY29uc3Qgb3ZlcmZsb3dZID0gJGVsLmNzcygnb3ZlcmZsb3cteScpO1xuICAgIGlmICgnaGlkZGVuJyA9PT0gb3ZlcmZsb3dZIHx8ICd2aXNpYmxlJyA9PT0gb3ZlcmZsb3dZKSB7XG4gICAgICAgICRlbC5jc3MoJ292ZXJmbG93LXknLCAnYXV0bycpO1xuICAgIH1cbiAgICByZXR1cm4gJGVsO1xufVxuXG4vKiogc2Nyb2xsLW1hcCBlbGVtZW50IOOCkuS/neiovCAqL1xuZnVuY3Rpb24gZW5zdXJlU2Nyb2xsTWFwKCRyb290OiBET00sIG1hcENsYXNzOiBzdHJpbmcpOiBET00ge1xuICAgIGxldCAkbWFwID0gJHJvb3QuZmluZChgLiR7bWFwQ2xhc3N9YCk7XG4gICAgLy8gJG1hcCDjgYznhKHjgYTloLTlkIjjga/kvZzmiJDjgZnjgotcbiAgICBpZiAoJG1hcC5sZW5ndGggPD0gMCkge1xuICAgICAgICAkbWFwID0gJChgPGRpdiBjbGFzcz1cIiR7bWFwQ2xhc3N9XCI+PC9kaXY+YCk7XG4gICAgICAgICRyb290LmFwcGVuZCgkbWFwKTtcbiAgICB9XG4gICAgcmV0dXJuICRtYXA7XG59XG5cbi8qKiBAaW50ZXJuYWwg44Ki44Kk44OG44Og5YmK6Zmk5oOF5aCxICovXG5pbnRlcmZhY2UgUmVtb3ZlSXRlbXNDb250ZXh0IHtcbiAgICByZW1vdmVkOiBJdGVtUHJvZmlsZVtdO1xuICAgIGRlbHRhOiBudW1iZXI7XG4gICAgdHJhbnNpdGlvbjogYm9vbGVhbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4gQ29yZSBsb2dpYyBpbXBsZW1lbnRhdGlvbiBjbGFzcyBmb3Igc2Nyb2xsIHByb2Nlc3NpbmcgdGhhdCBtYW5hZ2VzIG1lbW9yeS4gQWNjZXNzZXMgdGhlIERPTS5cbiAqIEBqYSDjg6Hjg6Ljg6rnrqHnkIbjgpLooYzjgYbjgrnjgq/jg63jg7zjg6vlh6bnkIbjga7jgrPjgqLjg63jgrjjg4Pjgq/lrp/oo4Xjgq/jg6njgrkuIERPTSDjgavjgqLjgq/jgrvjgrnjgZnjgosuXG4gKi9cbmV4cG9ydCBjbGFzcyBMaXN0Q29yZSBpbXBsZW1lbnRzIElMaXN0Q29udGV4dCwgSUxpc3RPcGVyYXRpb24sIElMaXN0U2Nyb2xsYWJsZSwgSUxpc3RCYWNrdXBSZXN0b3JlIHtcbiAgICBwcml2YXRlIF8kcm9vdDogRE9NO1xuICAgIHByaXZhdGUgXyRtYXA6IERPTTtcbiAgICBwcml2YXRlIF9tYXBIZWlnaHQgPSAwO1xuICAgIHByaXZhdGUgX3Njcm9sbGVyOiBJTGlzdFNjcm9sbGVyIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqIFVJIOihqOekuuS4reOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfYWN0aXZlID0gdHJ1ZTtcblxuICAgIC8qKiDliJ3mnJ/jgqrjg5fjgrfjg6fjg7PjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zZXR0aW5nczogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPjtcbiAgICAvKiogU2Nyb2xsIEV2ZW50IEhhbmRsZXIgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxFdmVudEhhbmRsZXI6IChldj86IEV2ZW50KSA9PiB2b2lkO1xuICAgIC8qKiBTY3JvbGwgU3RvcCBFdmVudCBIYW5kbGVyICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcjogKGV2PzogRXZlbnQpID0+IHZvaWQ7XG4gICAgLyoqIDHjg5rjg7zjgrjliIbjga7pq5jjgZXjga7ln7rmupblgKQgKi9cbiAgICBwcml2YXRlIF9iYXNlSGVpZ2h0ID0gMDtcbiAgICAvKiog566h55CG5LiL44Gr44GC44KLIEl0ZW1Qcm9maWxlIOmFjeWIlyAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgLyoqIOeuoeeQhuS4i+OBq+OBguOCiyBQYWdlUHJvZmlsZSDphY3liJcgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wYWdlczogUGFnZVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgLyoqIOacgOaWsOOBruihqOekuumgmOWfn+aDheWgseOCkuagvOe0jSAoU2Nyb2xsIOS4reOBruabtOaWsOWHpueQhuOBq+S9v+eUqCkgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9sYXN0QWN0aXZlUGFnZUNvbnRleHQgPSB7XG4gICAgICAgIGluZGV4OiAwLFxuICAgICAgICBmcm9tOiAwLFxuICAgICAgICB0bzogMCxcbiAgICAgICAgcG9zOiAwLCAgICAvLyBzY3JvbGwgcG9zaXRpb25cbiAgICB9O1xuXG4gICAgLyoqIOODh+ODvOOCv+OBriBiYWNrdXAg6aCY5Z+fLiBrZXkg44GoIF9pdGVtcyDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9iYWNrdXA6IFJlY29yZDxzdHJpbmcsIHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0+ID0ge307XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogTGlzdENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHRoaXMuXyRyb290ID0gdGhpcy5fJG1hcCA9IF8kaW52YWxpZDtcbiAgICAgICAgdGhpcy5fc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBfZGVmYXVsdE9wdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgIHRoaXMuX3Njcm9sbEV2ZW50SGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TY3JvbGwodGhpcy5fc2Nyb2xsZXIhLnBvcyk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uU2Nyb2xsU3RvcCh0aGlzLl9zY3JvbGxlciEucG9zKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKiDlhoXpg6jjgqrjg5bjgrjjgqfjgq/jg4jjga7liJ3mnJ/ljJYgKi9cbiAgICBwdWJsaWMgaW5pdGlhbGl6ZSgkcm9vdDogRE9NLCBoZWlnaHQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvLyDml6Ljgavmp4vnr4njgZXjgozjgabjgYTjgZ/loLTlkIjjga/noLTmo4RcbiAgICAgICAgaWYgKHRoaXMuXyRyb290Lmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl8kcm9vdCA9IGVuc3VyZU92ZXJmbG93WSgkcm9vdCk7XG4gICAgICAgIHRoaXMuXyRtYXAgID0gZW5zdXJlU2Nyb2xsTWFwKHRoaXMuXyRyb290LCB0aGlzLl9jb25maWcuU0NST0xMX01BUF9DTEFTUyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsZXIgPSB0aGlzLmNyZWF0ZVNjcm9sbGVyKCk7XG4gICAgICAgIHRoaXMuc2V0QmFzZUhlaWdodChoZWlnaHQpO1xuICAgICAgICB0aGlzLnNldFNjcm9sbGVyQ29uZGl0aW9uKCk7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruegtOajhCAqL1xuICAgIHB1YmxpYyBkZXN0cm95KCk6IHZvaWQge1xuICAgICAgICB0aGlzLnJlc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLl8kcm9vdCA9IHRoaXMuXyRtYXAgPSBfJGludmFsaWQ7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOBruWfuua6luWApOOCkuWPluW+lyAqL1xuICAgIHB1YmxpYyBzZXRCYXNlSGVpZ2h0KGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChoZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW2Jhc2UgaGlnaHQ6ICR7aGVpZ2h0fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Jhc2VIZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiogYWN0aXZlIOeKtuaFi+ioreWumiAqL1xuICAgIHB1YmxpYyBhc3luYyBzZXRBY3RpdmVTdGF0ZShhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fYWN0aXZlID0gYWN0aXZlO1xuICAgICAgICBhd2FpdCB0aGlzLnRyZWF0U2Nyb2xsUG9zaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiogYWN0aXZlIOeKtuaFi+WIpOWumiAqL1xuICAgIGdldCBhY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOBruS/neWtmC/lvqnlhYMgKi9cbiAgICBwdWJsaWMgYXN5bmMgdHJlYXRTY3JvbGxQb3NpdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcblxuICAgICAgICBjb25zdCBvZmZzZXQgPSAodGhpcy5fc2Nyb2xsZXIucG9zIC0gdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyk7XG4gICAgICAgIGNvbnN0IHsgdXNlRHVtbXlJbmFjdGl2ZVNjcm9sbE1hcDogdXNlRHVtbXlNYXAgfSA9IHRoaXMuX3NldHRpbmdzO1xuXG4gICAgICAgIGNvbnN0IHVwZGF0ZU9mZnNldCA9ICgkdGFyZ2V0OiBET00pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKCR0YXJnZXRbMF0pO1xuICAgICAgICAgICAgaWYgKG9mZnNldCAhPT0gdHJhbnNsYXRlWSkge1xuICAgICAgICAgICAgICAgICR0YXJnZXQuY3NzKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlM2QoMCwke29mZnNldH1weCwwYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fc2Nyb2xsZXIuc2Nyb2xsVG8odGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcywgZmFsc2UsIDApO1xuICAgICAgICAgICAgdGhpcy5fJG1hcC5jc3MoeyAndHJhbnNmb3JtJzogJycsICdkaXNwbGF5JzogJ2Jsb2NrJyB9KTtcbiAgICAgICAgICAgIGlmICh1c2VEdW1teU1hcCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJlcGFyZUluYWN0aXZlTWFwKCkucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCAkbWFwID0gdXNlRHVtbXlNYXAgPyB0aGlzLnByZXBhcmVJbmFjdGl2ZU1hcCgpIDogdGhpcy5fJG1hcDtcbiAgICAgICAgICAgIHVwZGF0ZU9mZnNldCgkbWFwKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0Q29udGV4dFxuXG4gICAgLyoqIGdldCBzY3JvbGwtbWFwIGVsZW1lbnQgKi9cbiAgICBnZXQgJHNjcm9sbE1hcCgpOiBET00ge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IHNjcm9sbC1tYXAgaGVpZ2h0IFtweF0gKi9cbiAgICBnZXQgc2Nyb2xsTWFwSGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwLmxlbmd0aCA/IHRoaXMuX21hcEhlaWdodCA6IDA7XG4gICAgfVxuXG4gICAgLyoqIGdldCB7QGxpbmsgTGlzdENvbnRleHRPcHRpb25zfSAqL1xuICAgIGdldCBvcHRpb25zKCk6IFJlcXVpcmVkPExpc3RDb250ZXh0T3B0aW9ucz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIHVwZGF0ZSBzY3JvbGwtbWFwIGhlaWdodCAoZGVsdGEgW3B4XSkgKi9cbiAgICB1cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGE6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fJG1hcC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX21hcEhlaWdodCArPSBNYXRoLnRydW5jKGRlbHRhKTtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmUuXG4gICAgICAgICAgICBpZiAodGhpcy5fbWFwSGVpZ2h0IDwgMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21hcEhlaWdodCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl8kbWFwLmhlaWdodCh0aGlzLl9tYXBIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIHVwZGF0ZSBpbnRlcm5hbCBwcm9maWxlICovXG4gICAgdXBkYXRlUHJvZmlsZXMoZnJvbTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBmb3IgKGxldCBpID0gZnJvbSwgbiA9IF9pdGVtcy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICgwIDwgaSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3QgPSBfaXRlbXNbaSAtIDFdO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5pbmRleCA9IGxhc3QuaW5kZXghICsgMTtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0ub2Zmc2V0ID0gbGFzdC5vZmZzZXQgKyBsYXN0LmhlaWdodDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0ub2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBnZXQgcmVjeWNsYWJsZSBlbGVtZW50ICovXG4gICAgZmluZFJlY3ljbGVFbGVtZW50cygpOiBET00ge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcC5maW5kKGAuJHt0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTU31gKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFZpZXdcblxuICAgIC8qKiDliJ3mnJ/ljJbmuIjjgb/jgYvliKTlrpogKi9cbiAgICBnZXQgaXNJbml0aWFsaXplZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fc2Nyb2xsZXI7XG4gICAgfVxuXG4gICAgLyoqIGl0ZW0g55m76YyyICovXG4gICAgYWRkSXRlbShoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgaW5mbzogVW5rbm93bk9iamVjdCwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYWRkSXRlbShuZXcgSXRlbVByb2ZpbGUodGhpcywgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgaW5mbyksIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKOWGhemDqOeUqCkgKi9cbiAgICBfYWRkSXRlbShpdGVtOiBJdGVtUHJvZmlsZSB8IEl0ZW1Qcm9maWxlW10sIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gQXJyYXkuaXNBcnJheShpdGVtKSA/IGl0ZW0gOiBbaXRlbV07XG4gICAgICAgIGxldCBkZWx0YUhlaWdodCA9IDA7XG4gICAgICAgIGxldCBhZGRUYWlsID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKG51bGwgPT0gaW5zZXJ0VG8gfHwgdGhpcy5faXRlbXMubGVuZ3RoIDwgaW5zZXJ0VG8pIHtcbiAgICAgICAgICAgIGluc2VydFRvID0gdGhpcy5faXRlbXMubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluc2VydFRvID09PSB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFkZFRhaWwgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2Nyb2xsIG1hcCDjga7mm7TmlrBcbiAgICAgICAgZm9yIChjb25zdCBpdCBvZiBpdGVtcykge1xuICAgICAgICAgICAgZGVsdGFIZWlnaHQgKz0gaXQuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhSGVpZ2h0KTtcblxuICAgICAgICAvLyDmjL/lhaVcbiAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluc2VydFRvLCAwLCAuLi5pdGVtcyk7XG5cbiAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgaWYgKCFhZGRUYWlsKSB7XG4gICAgICAgICAgICBpZiAoMCA9PT0gaW5zZXJ0VG8pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luc2VydFRvIC0gMV0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyLCBzaXplPzogbnVtYmVyLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIgfCBudW1iZXJbXSwgYXJnMj86IG51bWJlciwgYXJnMz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShpbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1SYW5kb21seShpbmRleCwgYXJnMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVJdGVtQ29udGludW91c2x5KGluZGV4LCBhcmcyLCBhcmczKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBoZWxwZXI6IOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHuiAqL1xuICAgIHByaXZhdGUgX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXM6IG51bWJlcltdLCBkZWxheTogbnVtYmVyKTogUmVtb3ZlSXRlbXNDb250ZXh0IHtcbiAgICAgICAgY29uc3QgcmVtb3ZlZDogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBsZXQgZGVsdGEgPSAwO1xuICAgICAgICBsZXQgdHJhbnNpdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgIGZvciAoY29uc3QgaWR4IG9mIGluZGV4ZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLl9pdGVtc1tpZHhdO1xuICAgICAgICAgICAgZGVsdGEgKz0gaXRlbS5oZWlnaHQ7XG4gICAgICAgICAgICAvLyDliYrpmaTopoHntKDjga4gei1pbmRleCDjga7liJ3mnJ/ljJZcbiAgICAgICAgICAgIGl0ZW0ucmVzZXREZXB0aCgpO1xuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIOiHquWLleioreWumuODu+WJiumZpOmBheW7tuaZgumWk+OBjOioreWumuOBleOCjOOBi+OBpOOAgeOCueOCr+ODreODvOODq+ODneOCuOOCt+ODp+ODs+OBq+WkieabtOOBjOOBguOCi+WgtOWQiOOBryB0cmFuc2l0aW9uIOioreWumlxuICAgICAgICBpZiAodGhpcy5fc2V0dGluZ3MucmVtb3ZlSXRlbVdpdGhUcmFuc2l0aW9uICYmICgwIDwgZGVsYXkpKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5zY3JvbGxQb3M7XG4gICAgICAgICAgICBjb25zdCBwb3NNYXggPSB0aGlzLnNjcm9sbFBvc01heCAtIGRlbHRhO1xuICAgICAgICAgICAgdHJhbnNpdGlvbiA9IChwb3NNYXggPCBjdXJyZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH07XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5pmC44Gu5pu05pawICovXG4gICAgcHJpdmF0ZSBfdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0OiBSZW1vdmVJdGVtc0NvbnRleHQsIGRlbGF5OiBudW1iZXIsIHByb2ZpbGVVcGRhdGU6ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyByZW1vdmVkLCBkZWx0YSwgdHJhbnNpdGlvbiB9ID0gY29udGV4dDtcblxuICAgICAgICAvLyB0cmFuc2l0aW9uIOioreWumlxuICAgICAgICBpZiAodHJhbnNpdGlvbikge1xuICAgICAgICAgICAgdGhpcy5zZXR1cFNjcm9sbE1hcFRyYW5zaXRpb24oZGVsYXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY3VzdG9taXplIHBvaW50OiDjg5fjg63jg5XjgqHjgqTjg6vjga7mm7TmlrBcbiAgICAgICAgcHJvZmlsZVVwZGF0ZSgpO1xuXG4gICAgICAgIC8vIOOCueOCr+ODreODvOODq+mgmOWfn+OBruabtOaWsFxuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbE1hcEhlaWdodCgtZGVsdGEpO1xuICAgICAgICAvLyDpgYXlu7bliYrpmaRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcmVtb3ZlZCkge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBkZWxheSk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBJdGVtUHJvZmlsZSDjgpLliYrpmaQ6IOmAo+e2miBpbmRleCDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtQ29udGludW91c2x5KGluZGV4OiBudW1iZXIsIHNpemU6IG51bWJlciB8IHVuZGVmaW5lZCwgZGVsYXk6IG51bWJlciB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgICAgICBzaXplID0gc2l6ZSA/PyAxO1xuICAgICAgICBkZWxheSA9IGRlbGF5ID8/IDA7XG5cbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbmRleCArIHNpemUpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtyZW1vdmVJdGVtKCksIGludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7pcbiAgICAgICAgY29uc3QgaW5kZXhlcyA9IEFycmF5LmZyb20oeyBsZW5ndGg6IHNpemUgfSwgKF8sIGkpID0+IGluZGV4ICsgaSk7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9xdWVyeVJlbW92ZUl0ZW1zQ29udGV4dChpbmRleGVzLCBkZWxheSk7XG5cbiAgICAgICAgLy8g5pu05pawXG4gICAgICAgIHRoaXMuX3VwZGF0ZVdpdGhSZW1vdmVJdGVtc0NvbnRleHQoY29udGV4dCwgZGVsYXksICgpID0+IHtcbiAgICAgICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaW5kZXhdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDphY3liJfjgYvjgonliYrpmaRcbiAgICAgICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpbmRleCwgc2l6ZSk7XG4gICAgICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGluZGV4KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBJdGVtUHJvZmlsZSDjgpLliYrpmaQ6IHJhbmRvbSBhY2Nlc3Mg54mIICovXG4gICAgcHJpdmF0ZSBfcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4ZXM6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICBkZWxheSA9IGRlbGF5ID8/IDA7XG4gICAgICAgIGluZGV4ZXMuc29ydCgobGhzLCByaHMpID0+IHJocyAtIGxocyk7IC8vIOmZjemghuOCveODvOODiFxuXG4gICAgICAgIGZvciAoY29uc3QgaW5kZXggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbmRleCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3JlbW92ZUl0ZW0oKSwgaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7pcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaWR4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaWR4XS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyDphY3liJfjgYvjgonliYrpmaRcbiAgICAgICAgICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gaW5kZXhlc1tpbmRleGVzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9maWxlcyhmaXJzdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBzY3JvbGwgbWFwIOOBruODiOODqeODs+OCuOOCt+ODp+ODs+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0dXBTY3JvbGxNYXBUcmFuc2l0aW9uKGRlbGF5OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcbiAgICAgICAgY29uc3QgZWwgPSB0aGlzLl8kbWFwWzBdO1xuICAgICAgICB0aGlzLl8kbWFwLnRyYW5zaXRpb25FbmQoKCkgPT4ge1xuICAgICAgICAgICAgY2xlYXJUcmFuc2l0aW9uKGVsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFRyYW5zZm9ybVRyYW5zaXRpb24oZWwsICdoZWlnaHQnLCBkZWxheSwgJ2Vhc2UnKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XICovXG4gICAgZ2V0SXRlbUluZm8odGFyZ2V0OiBudW1iZXIgfCBFdmVudCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICBjb25zdCB7IF9pdGVtcywgX2NvbmZpZyB9ID0gdGhpcztcblxuICAgICAgICBjb25zdCBwYXJzZXIgPSAoJHRhcmdldDogRE9NKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKF9jb25maWcuTElTVElURU1fQkFTRV9DTEFTUykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKCR0YXJnZXQuYXR0cihfY29uZmlnLkRBVEFfSVRFTV9JTkRFWCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKF9jb25maWcuU0NST0xMX01BUF9DTEFTUykgfHwgJHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignY2Fubm90IGRpdGVjdCBpdGVtIGZyb20gZXZlbnQgb2JqZWN0LicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZXIoJHRhcmdldC5wYXJlbnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaW5kZXggPSB0YXJnZXQgaW5zdGFuY2VvZiBFdmVudCA/IHBhcnNlcigkKHRhcmdldC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpKSA6IE51bWJlcih0YXJnZXQpO1xuXG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbdW5zdXBwb3J0ZWQgdHlwZTogJHt0eXBlb2YgdGFyZ2V0fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKGluZGV4IDwgMCB8fCBfaXRlbXMubGVuZ3RoIDw9IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBnZXRJdGVtSW5mbygpIFtpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIF9pdGVtc1tpbmRleF0uaW5mbztcbiAgICB9XG5cbiAgICAvKiog44Ki44Kv44OG44Kj44OW44Oa44O844K444KS5pu05pawICovXG4gICAgcmVmcmVzaCgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBfcGFnZXMsIF9pdGVtcywgX3NldHRpbmdzLCBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0IH0gPSB0aGlzO1xuXG4gICAgICAgIGNvbnN0IHRhcmdldHM6IFJlY29yZDxudW1iZXIsICdhY3RpdmF0ZScgfCAnaGlkZScgfCAnZGVhY3RpdmF0ZSc+ID0ge307XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICBjb25zdCBoaWdoUHJpb3JpdHlJbmRleDogbnVtYmVyW10gPSBbXTtcblxuICAgICAgICBjb25zdCBzdG9yZU5leHRQYWdlU3RhdGUgPSAoaW5kZXg6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnYWN0aXZhdGUnO1xuICAgICAgICAgICAgICAgIGhpZ2hQcmlvcml0eUluZGV4LnB1c2goaW5kZXgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChNYXRoLmFicyhjdXJyZW50UGFnZUluZGV4IC0gaW5kZXgpIDw9IF9zZXR0aW5ncy5wYWdlUHJlcGFyZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnYWN0aXZhdGUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfc2V0dGluZ3MuZW5hYmxlSGlkZGVuUGFnZSkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2hpZGUnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdkZWFjdGl2YXRlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGN1cnJlbnQgcGFnZSDjga4g5YmN5b6M44GvIGhpZ2ggcHJpb3JpdHkg44Gr44GZ44KLXG4gICAgICAgICAgICBpZiAoY3VycmVudFBhZ2VJbmRleCArIDEgPT09IGluZGV4IHx8IGN1cnJlbnRQYWdlSW5kZXggLSAxID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgIGhpZ2hQcmlvcml0eUluZGV4LnB1c2goaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIOWvvuixoeeEoeOBl1xuICAgICAgICBpZiAoX2l0ZW1zLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaENvdW50ID0gX3NldHRpbmdzLnBhZ2VQcmVwYXJlQ291bnQgKyBfc2V0dGluZ3MucGFnZVByZWxvYWRDb3VudDtcbiAgICAgICAgICAgIGNvbnN0IGJlZ2luSW5kZXggPSBjdXJyZW50UGFnZUluZGV4IC0gc2VhcmNoQ291bnQ7XG4gICAgICAgICAgICBjb25zdCBlbmRJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggKyBzZWFyY2hDb3VudDtcblxuICAgICAgICAgICAgbGV0IG92ZXJmbG93UHJldiA9IDAsIG92ZXJmbG93TmV4dCA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBwYWdlSW5kZXggPSBiZWdpbkluZGV4OyBwYWdlSW5kZXggPD0gZW5kSW5kZXg7IHBhZ2VJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmZsb3dQcmV2Kys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoX3BhZ2VzLmxlbmd0aCA8PSBwYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmZsb3dOZXh0Kys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKDAgPCBvdmVyZmxvd1ByZXYpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgcGFnZUluZGV4ID0gY3VycmVudFBhZ2VJbmRleCArIHNlYXJjaENvdW50ICsgMTsgaSA8IG92ZXJmbG93UHJldjsgaSsrLCBwYWdlSW5kZXgrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoX3BhZ2VzLmxlbmd0aCA8PSBwYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKDAgPCBvdmVyZmxvd05leHQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgcGFnZUluZGV4ID0gY3VycmVudFBhZ2VJbmRleCAtIHNlYXJjaENvdW50IC0gMTsgaSA8IG92ZXJmbG93TmV4dDsgaSsrLCBwYWdlSW5kZXgtLSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFnZUluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5LiN6KaB44Gr44Gq44Gj44GfIHBhZ2Ug44GuIOmdnua0u+aAp+WMllxuICAgICAgICBmb3IgKGNvbnN0IHBhZ2Ugb2YgX3BhZ2VzLmZpbHRlcihwYWdlID0+ICdpbmFjdGl2ZScgIT09IHBhZ2Uuc3RhdHVzKSkge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdGFyZ2V0c1twYWdlLmluZGV4XSkge1xuICAgICAgICAgICAgICAgIHBhZ2UuZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YSq5YWIIHBhZ2Ug44GuIGFjdGl2YXRlXG4gICAgICAgIGZvciAoY29uc3QgaWR4IG9mIGhpZ2hQcmlvcml0eUluZGV4LnNvcnQoKGxocywgcmhzKSA9PiBsaHMgLSByaHMpKSB7IC8vIOaYh+mghuOCveODvOODiFxuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgX3BhZ2VzW2lkeF0/LmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOOBneOBruOBu+OBi+OBriBwYWdlIOOBriDnirbmhYvlpInmm7RcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0cykpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gTnVtYmVyKGtleSk7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSB0YXJnZXRzW2luZGV4XTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkICYmIF9wYWdlc1tpbmRleF0/LlthY3Rpb25dPy4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5pu05paw5b6M44Gr5L2/55So44GX44Gq44GL44Gj44GfIERPTSDjgpLliYrpmaRcbiAgICAgICAgdGhpcy5maW5kUmVjeWNsZUVsZW1lbnRzKCkucmVtb3ZlKCk7XG5cbiAgICAgICAgY29uc3QgcGFnZUN1cnJlbnQgPSBfcGFnZXNbY3VycmVudFBhZ2VJbmRleF07XG4gICAgICAgIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQuZnJvbSAgPSBwYWdlQ3VycmVudD8uZ2V0SXRlbUZpcnN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQudG8gICAgPSBwYWdlQ3VycmVudD8uZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCA9IGN1cnJlbnRQYWdlSW5kZXg7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOacquOCouOCteOCpOODs+ODmuODvOOCuOOCkuani+eviSAqL1xuICAgIHVwZGF0ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5hc3NpZ25QYWdlKE1hdGgubWF4KHRoaXMuX3BhZ2VzLmxlbmd0aCAtIDEsIDApKTtcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiDjg5rjg7zjgrjjgqLjgrXjgqTjg7PjgpLlho3mp4vmiJAgKi9cbiAgICByZWJ1aWxkKCk6IHRoaXMge1xuICAgICAgICB0aGlzLmNsZWFyUGFnZSgpO1xuICAgICAgICB0aGlzLmFzc2lnblBhZ2UoKTtcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4QgKi9cbiAgICByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BhZ2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2l0ZW1zLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX21hcEhlaWdodCA9IDA7XG4gICAgICAgIHRoaXMuXyRtYXAuaGVpZ2h0KDApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGFibGVcblxuICAgIC8qKiBzY3JvbGxlciDjga7nqK7poZ7jgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsZXJUeXBlKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8udHlwZTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbFBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnBvcyA/PyAwO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7mnIDlpKflgKTjgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8ucG9zTWF4ID8/IDA7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaQgKi9cbiAgICBzZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5bbWV0aG9kXSgnc2Nyb2xsJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaQgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uW21ldGhvZF0oJ3Njcm9sbHN0b3AnLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aICovXG4gICAgYXN5bmMgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgcG9zaXRpb24sIHRvbyBzbWFsbC4gW3BvczogJHtwb3N9XWApO1xuICAgICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9zY3JvbGxlci5wb3NNYXggPCBwb3MpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBwb3NpdGlvbiwgdG9vIGJpZy4gW3BvczogJHtwb3N9XWApO1xuICAgICAgICAgICAgcG9zID0gdGhpcy5fc2Nyb2xsZXIucG9zTWF4O1xuICAgICAgICB9XG4gICAgICAgIC8vIHBvcyDjga7jgb/lhYjpp4bjgZHjgabmm7TmlrBcbiAgICAgICAgdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyA9IHBvcztcbiAgICAgICAgaWYgKHBvcyAhPT0gdGhpcy5fc2Nyb2xsZXIucG9zKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9zY3JvbGxlci5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovCAqL1xuICAgIGFzeW5jIGVuc3VyZVZpc2libGUoaW5kZXg6IG51bWJlciwgb3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2l0ZW1zLCBfc2V0dGluZ3MsIF9iYXNlSGVpZ2h0IH0gPSB0aGlzO1xuXG4gICAgICAgIHZlcmlmeShfc2Nyb2xsZXIpO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IF9pdGVtcy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IGVuc3VyZVZpc2libGUoKSBbaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgcGFydGlhbE9LLCBzZXRUb3AsIGFuaW1hdGUsIHRpbWUsIGNhbGxiYWNrIH0gPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIHBhcnRpYWxPSzogdHJ1ZSxcbiAgICAgICAgICAgIHNldFRvcDogZmFsc2UsXG4gICAgICAgICAgICBhbmltYXRlOiBfc2V0dGluZ3MuZW5hYmxlQW5pbWF0aW9uLFxuICAgICAgICAgICAgdGltZTogX3NldHRpbmdzLmFuaW1hdGlvbkR1cmF0aW9uLFxuICAgICAgICAgICAgY2FsbGJhY2s6IG5vb3AsXG4gICAgICAgIH0sIG9wdGlvbnMpIGFzIFJlcXVpcmVkPExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucz47XG5cbiAgICAgICAgY29uc3QgY3VycmVudFNjb3BlID0ge1xuICAgICAgICAgICAgZnJvbTogX3Njcm9sbGVyLnBvcyxcbiAgICAgICAgICAgIHRvOiBfc2Nyb2xsZXIucG9zICsgX2Jhc2VIZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gX2l0ZW1zW2luZGV4XTtcblxuICAgICAgICBjb25zdCB0YXJnZXRTY29wZSA9IHtcbiAgICAgICAgICAgIGZyb206IHRhcmdldC5vZmZzZXQsXG4gICAgICAgICAgICB0bzogdGFyZ2V0Lm9mZnNldCArIHRhcmdldC5oZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXNJblNjb3BlID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgaWYgKHBhcnRpYWxPSykge1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRTY29wZS5mcm9tIDw9IGN1cnJlbnRTY29wZS5mcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50U2NvcGUuZnJvbSA8PSB0YXJnZXRTY29wZS50bztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0U2NvcGUuZnJvbSA8PSBjdXJyZW50U2NvcGUudG87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFNjb3BlLmZyb20gPD0gdGFyZ2V0U2NvcGUuZnJvbSAmJiB0YXJnZXRTY29wZS50byA8PSBjdXJyZW50U2NvcGUudG87XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZGV0ZWN0UG9zaXRpb24gPSAoKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRTY29wZS5mcm9tIDwgY3VycmVudFNjb3BlLmZyb21cbiAgICAgICAgICAgICAgICA/IHRhcmdldFNjb3BlLmZyb21cbiAgICAgICAgICAgICAgICA6IHRhcmdldC5vZmZzZXQgLSB0YXJnZXQuaGVpZ2h0IC8vIGJvdHRvbSDlkIjjgo/jgZvjga/mg4XloLHkuI3otrPjgavjgojjgorkuI3lj69cbiAgICAgICAgICAgIDtcbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgcG9zOiBudW1iZXI7XG4gICAgICAgIGlmIChzZXRUb3ApIHtcbiAgICAgICAgICAgIHBvcyA9IHRhcmdldFNjb3BlLmZyb207XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJblNjb3BlKCkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9zY3JvbGxlci5wb3MpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub29wXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3MgPSBkZXRlY3RQb3NpdGlvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgICAgICBjYWxsYmFjayhwb3MpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0QmFja3VwUmVzdG9yZVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjCAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IHsgaXRlbXM6IHRoaXMuX2l0ZW1zIH07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYwgKi9cbiAgICByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDAgPCB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fYWRkSXRlbSh0aGlzLl9iYWNrdXBba2V5XS5pdGVtcyk7XG5cbiAgICAgICAgaWYgKHJlYnVpbGQpIHtcbiAgICAgICAgICAgIHRoaXMucmVidWlsZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoeOCkueiuuiqjSAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5fYmFja3VwKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuSAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrpogKi9cbiAgICBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9KTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEuaXRlbXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IGRhdGE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDnlKjnkrDlooPoqK3lrpogKi9cbiAgICBwcml2YXRlIHNldFNjcm9sbGVyQ29uZGl0aW9uKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub24oJ3Njcm9sbCcsIHRoaXMuX3Njcm9sbEV2ZW50SGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDnlKjnkrDlooPnoLTmo4QgKi9cbiAgICBwcml2YXRlIHJlc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vZmYoJ3Njcm9sbHN0b3AnLCB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog5pei5a6a44GuIFNjcm9sbGVyIOOCquODluOCuOOCp+OCr+ODiOOBruS9nOaIkCAqL1xuICAgIHByaXZhdGUgY3JlYXRlU2Nyb2xsZXIoKTogSUxpc3RTY3JvbGxlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncy5zY3JvbGxlckZhY3RvcnkodGhpcy5fJHJvb3QsIHRoaXMuXyRtYXAsIHRoaXMuX3NldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKiog54++5Zyo44GuIFBhZ2UgSW5kZXgg44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBnZXRQYWdlSW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgeyBfc2Nyb2xsZXIsIF9iYXNlSGVpZ2h0LCBfcGFnZXMgfSA9IHRoaXM7XG4gICAgICAgIHZlcmlmeShfc2Nyb2xsZXIpO1xuXG4gICAgICAgIGNvbnN0IHsgcG9zOiBzY3JvbGxQb3MsIHBvc01heDogc2Nyb2xsUG9zTWF4IH0gPSBfc2Nyb2xsZXI7XG5cbiAgICAgICAgY29uc3Qgc2Nyb2xsTWFwU2l6ZSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsYXN0UGFnZSA9IHRoaXMuZ2V0TGFzdFBhZ2UoKTtcbiAgICAgICAgICAgIHJldHVybiBsYXN0UGFnZSA/IGxhc3RQYWdlLm9mZnNldCArIGxhc3RQYWdlLmhlaWdodCA6IF9iYXNlSGVpZ2h0O1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHBvcyA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoMCA9PT0gc2Nyb2xsUG9zTWF4IHx8IHNjcm9sbFBvc01heCA8PSBfYmFzZUhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsUG9zICogc2Nyb2xsTWFwU2l6ZSAvIHNjcm9sbFBvc01heDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICBjb25zdCB2YWxpZFJhbmdlID0gKHBhZ2U6IFBhZ2VQcm9maWxlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYWdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYWdlLm9mZnNldCA8PSBwb3MgJiYgcG9zIDw9IHBhZ2Uub2Zmc2V0ICsgcGFnZS5oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBjYW5kaWRhdGUgPSBNYXRoLmZsb29yKHBvcyAvIF9iYXNlSGVpZ2h0KTtcbiAgICAgICAgaWYgKDAgIT09IGNhbmRpZGF0ZSAmJiBfcGFnZXMubGVuZ3RoIDw9IGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgY2FuZGlkYXRlID0gX3BhZ2VzLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcGFnZSA9IF9wYWdlc1tjYW5kaWRhdGVdO1xuICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgIH0gZWxzZSBpZiAocG9zIDwgcGFnZT8ub2Zmc2V0KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FuZGlkYXRlIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBwYWdlID0gX3BhZ2VzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYW5kaWRhdGUgKyAxLCBuID0gX3BhZ2VzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHBhZ2UgPSBfcGFnZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgZGV0ZWN0IHBhZ2UgaW5kZXguIGZhbGxiYWNrOiAke19wYWdlcy5sZW5ndGggLSAxfWApO1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgX3BhZ2VzLmxlbmd0aCAtIDEpO1xuICAgIH1cblxuICAgIC8qKiDmnIDlvozjga7jg5rjg7zjgrjjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldExhc3RQYWdlKCk6IFBhZ2VQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYWdlc1t0aGlzLl9wYWdlcy5sZW5ndGggLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OIKi9cbiAgICBwcml2YXRlIG9uU2Nyb2xsKHBvczogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICAvLyBUT0RPOiBpbnRlcnNlY3Rpb25SZWN0IOOCkuS9v+eUqOOBmeOCi+WgtOWQiCwgU2Nyb2xsIOODj+ODs+ODieODqeODvOWFqOiIrOOBr+OBqeOBhuOBguOCi+OBueOBjeOBi+imgeaknOiojlxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHBvcyAtIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MpIDwgdGhpcy5fc2V0dGluZ3Muc2Nyb2xsUmVmcmVzaERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCAhPT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+WBnOatouOCpOODmeODs+ODiCAqL1xuICAgIHByaXZhdGUgb25TY3JvbGxTdG9wKHBvczogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOWMuuWIhuOBruOCouOCteOCpOODsyAqL1xuICAgIHByaXZhdGUgYXNzaWduUGFnZShmcm9tPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKGZyb20pO1xuXG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zLCBfcGFnZXMsIF9iYXNlSGVpZ2h0LCBfc2Nyb2xsZXIgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGJhc2VQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICBjb25zdCBuZXh0SXRlbUluZGV4ID0gYmFzZVBhZ2U/LmdldEl0ZW1MYXN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIGNvbnN0IGFzaWduZWVJdGVtcyAgPSBfaXRlbXMuc2xpY2UobmV4dEl0ZW1JbmRleCk7XG5cbiAgICAgICAgbGV0IHdvcmtQYWdlID0gYmFzZVBhZ2U7XG4gICAgICAgIGlmIChudWxsID09IHdvcmtQYWdlKSB7XG4gICAgICAgICAgICB3b3JrUGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgX3BhZ2VzLnB1c2god29ya1BhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGFzaWduZWVJdGVtcykge1xuICAgICAgICAgICAgaWYgKF9iYXNlSGVpZ2h0IDw9IHdvcmtQYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHdvcmtQYWdlLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhZ2UgPSBuZXcgUGFnZVByb2ZpbGUoKTtcbiAgICAgICAgICAgICAgICBuZXdQYWdlLmluZGV4ID0gd29ya1BhZ2UuaW5kZXggKyAxO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2Uub2Zmc2V0ID0gd29ya1BhZ2Uub2Zmc2V0ICsgd29ya1BhZ2UuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3UGFnZTtcbiAgICAgICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpdGVtLnBhZ2VJbmRleCA9IHdvcmtQYWdlLmluZGV4O1xuICAgICAgICAgICAgd29ya1BhZ2UucHVzaChpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmtQYWdlLm5vcm1hbGl6ZSgpO1xuXG4gICAgICAgIF9zY3JvbGxlcj8udXBkYXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOWMuuWIhuOBruino+mZpCAqL1xuICAgIHByaXZhdGUgY2xlYXJQYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGFnZXMuc3BsaWNlKGZyb20gPz8gMCk7XG4gICAgfVxuXG4gICAgLyoqIGluYWN0aXZlIOeUqCBNYXAg44Gu55Sf5oiQICovXG4gICAgcHJpdmF0ZSBwcmVwYXJlSW5hY3RpdmVNYXAoKTogRE9NIHtcbiAgICAgICAgY29uc3QgeyBfY29uZmlnLCBfJG1hcCwgX21hcEhlaWdodCB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgJHBhcmVudCA9IF8kbWFwLnBhcmVudCgpO1xuICAgICAgICBsZXQgJGluYWN0aXZlTWFwID0gJHBhcmVudC5maW5kKGAuJHtfY29uZmlnLklOQUNUSVZFX0NMQVNTfWApO1xuXG4gICAgICAgIGlmICgkaW5hY3RpdmVNYXAubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICAgICAgY29uc3QgJGxpc3RJdGVtVmlld3MgPSBfJG1hcC5jbG9uZSgpLmNoaWxkcmVuKCkuZmlsdGVyKChfLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmRleCA9IE51bWJlcigkKGVsZW1lbnQpLmF0dHIoX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFBhZ2VJbmRleCAtIDEgPD0gcGFnZUluZGV4ICYmIHBhZ2VJbmRleCA8PSBjdXJyZW50UGFnZUluZGV4ICsgMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkaW5hY3RpdmVNYXAgPSAkKGA8c2VjdGlvbiBjbGFzcz1cIiR7X2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTfSAke19jb25maWcuSU5BQ1RJVkVfQ0xBU1N9XCI+PC9zZWN0aW9uPmApXG4gICAgICAgICAgICAgICAgLmFwcGVuZCgkbGlzdEl0ZW1WaWV3cylcbiAgICAgICAgICAgICAgICAuaGVpZ2h0KF9tYXBIZWlnaHQpO1xuICAgICAgICAgICAgJHBhcmVudC5hcHBlbmQoJGluYWN0aXZlTWFwKTtcbiAgICAgICAgICAgIF8kbWFwLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGluYWN0aXZlTWFwO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgZG9tIGFzICQsXG4gICAgdHlwZSBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBWaWV3LFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Q29yZSB9IGZyb20gJy4vY29yZS9saXN0JztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IExpc3RDb3JlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGNsYXNzIHRoYXQgc3RvcmVzIHtAbGluayBMaXN0Vmlld30gaW5pdGlhbGl6YXRpb24gaW5mb3JtYXRpb24uXG4gKiBAamEge0BsaW5rIExpc3RWaWV3fSDjga7liJ3mnJ/ljJbmg4XloLHjgpLmoLzntI3jgZnjgovjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RDb250ZXh0T3B0aW9ucywgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIGluaXRpYWxIZWlnaHQ/OiBudW1iZXI7XG59XG5cbi8qKlxuICogQGVuIFZpcnR1YWwgbGlzdCB2aWV3IGNsYXNzIHRoYXQgcHJvdmlkZXMgbWVtb3J5IG1hbmFnZW1lbnQgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDjg6Hjg6Ljg6rnrqHnkIbmqZ/og73jgpLmj5DkvpvjgZnjgovku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpc3RWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgY29udGV4dDogbmV3IExpc3RDb3JlKG9wdGlvbnMpLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuXG4gICAgICAgIHRoaXMuc2V0RWxlbWVudCh0aGlzLiRlbCBhcyBET01TZWxlY3RvcjxURWxlbWVudD4pO1xuICAgIH1cblxuICAgIC8qKiBjb250ZXh0IGFjY2Vzc29yICovXG4gICAgZ2V0IGNvbnRleHQoKTogSUxpc3RDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqIGNvbnN0cnVjdCBvcHRpb24gYWNjZXNzb3IgKi9cbiAgICBnZXQgb3B0aW9ucygpOiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5vcHRpb25zO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFZpZXcgY29tcG9uZW50IG1ldGhvZHM6XG5cbiAgICAvKiogYHRoaXMuZWxgIOabtOaWsOaZguOBruaWsOOBl+OBhCBIVE1MIOOCkuODrOODs+ODgOODquODs+OCsOODreOCuOODg+OCr+OBruWun+ijhemWouaVsC4g44Oi44OH44Or5pu05paw44GoIFZpZXcg44OG44Oz44OX44Os44O844OI44KS6YCj5YuV44GV44Gb44KLLiAqL1xuICAgIGFic3RyYWN0IHJlbmRlciguLi5hcmdzOiB1bmtub3duW10pOiBhbnk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIENoYW5nZSB0aGUgdmlldydzIGVsZW1lbnQgKGB0aGlzLmVsYCBwcm9wZXJ0eSkgYW5kIHJlLWRlbGVnYXRlIHRoZSB2aWV3J3MgZXZlbnRzIG9uIHRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAamEgVmlldyDjgYznrqHovYTjgZnjgovopoHntKAgKGB0aGlzLmVsYCBwcm9wZXJ0eSkg44Gu5aSJ5pu0LiDjgqTjg5njg7Pjg4jlho3oqK3lrprjgoLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFxuICAgICAqICAtIGBlbmAgT2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiOOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHNldEVsZW1lbnQoZWw6IERPTVNlbGVjdG9yPFRFbGVtZW50IHwgc3RyaW5nPik6IHRoaXMge1xuICAgICAgICBpZiAodGhpc1tfcHJvcGVydGllc10pIHtcbiAgICAgICAgICAgIGNvbnN0IHsgY29udGV4dCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIGNvbnRleHQuZGVzdHJveSgpO1xuICAgICAgICAgICAgY29udGV4dC5pbml0aWFsaXplKCRlbCBhcyBET008Tm9kZT4gYXMgRE9NLCB0aGlzLm9wdGlvbnMuaW5pdGlhbEhlaWdodCA/PyAkZWwuaGVpZ2h0KCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci5zZXRFbGVtZW50KGVsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5kZXN0cm95KCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZW1vdmUoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdE9wZXJhdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGl0IGhhcyBiZWVuIGluaXRpYWxpemVkLlxuICAgICAqIEBqYSDliJ3mnJ/ljJbmuIjjgb/jgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBpbml0aWFsaXplZCAvIGZhbHNlOiB1bmluaXRpYWxpemVkXG4gICAgICogIC0gYGphYCB0cnVlOiDliJ3mnJ/ljJbmuIjjgb8gLyBmYWxzZTog5pyq5Yid5pyf5YyWXG4gICAgICovXG4gICAgZ2V0IGlzSW5pdGlhbGl6ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzSW5pdGlhbGl6ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSBpdGVtIOeZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIGFkZEl0ZW0oaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIGluZm86IFVua25vd25PYmplY3QsIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2FkZEl0ZW0obmV3IEl0ZW1Qcm9maWxlKHRoaXMuY29udGV4dCwgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgaW5mbyksIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24gKGludGVybmFsIHVzZSkuXG4gICAgICogQGphIGl0ZW0g55m76YyyICjlhoXpg6jnlKgpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAqICAtIGBlbmAge0BsaW5rIEl0ZW1Qcm9maWxlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5fYWRkSXRlbShpdGVtLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbmRleCB0byBzdGFydCByZWxlYXNpbmdcbiAgICAgKiAgLSBgamFgIOino+mZpOmWi+Wni+OBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzaXplXG4gICAgICogIC0gYGVuYCB0b3RhbCBudW1iZXIgb2YgaXRlbXMgdG8gcmVsZWFzZVxuICAgICAqICAtIGBqYWAg6Kej6Zmk44GZ44KLIGl0ZW0g44Gu57eP5pWwIFtkZWZhdWx0OiAxXVxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciwgc2l6ZT86IG51bWJlciwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRhcmdldCBpbmRleCBhcnJheS4gaXQgaXMgbW9yZSBlZmZpY2llbnQgdG8gc3BlY2lmeSByZXZlcnNlIGluZGV4LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Kk44Oz44OH44OD44Kv44K56YWN5YiX44KS5oyH5a6aLiByZXZlcnNlIGluZGV4IOOCkuaMh+WumuOBmeOCi+OBu+OBhuOBjOWKueeOh+eahFxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIgfCBudW1iZXJbXSwgYXJnMj86IG51bWJlciwgYXJnMz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbW92ZUl0ZW0oaW5kZXggYXMgbnVtYmVyLCBhcmcyLCBhcmczKTsgLy8gYXZvaWQgdHMoMjM0NSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbmZvcm1hdGlvbiBzZXQgZm9yIHRoZSBzcGVjaWZpZWQgaXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBpZGVudGlmaWVyIFtpbmRleCB8IGV2ZW50IG9iamVjdF1cbiAgICAgKiAgLSBgamFgIOitmOWIpeWtkC4gW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqL1xuICAgIGdldEl0ZW1JbmZvKHRhcmdldDogbnVtYmVyIHwgRXZlbnQpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0SXRlbUluZm8odGFyZ2V0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCBhY3RpdmUgcGFnZXMuXG4gICAgICogQGphIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsFxuICAgICAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQnVpbGQgdW5hc3NpZ25lZCBwYWdlcy5cbiAgICAgKiBAamEg5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JXG4gICAgICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVidWlsZCBwYWdlIGFzc2lnbm1lbnRzLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgqLjgrXjgqTjg7PjgpLlho3mp4vmiJBcbiAgICAgKi9cbiAgICByZWJ1aWxkKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIERlc3Ryb3kgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg566h6L2E44OH44O844K/44KS56C05qOEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZWxlYXNlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAgLyoqXG4gICAgICogQGVuIEdldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zO1xuICAgIH1cblxuICAgICAvKipcbiAgICAgICogQGVuIEdldCBtYXhpbXVtIHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+l1xuICAgICAgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFBvc01heDtcbiAgICB9XG5cbiAgICAgLyoqXG4gICAgICogQGVuIFNjcm9sbCBldmVudCBoYW5kbGVyIHNldHRpbmcvY2FuY2VsbGF0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44O86Zai5pWwXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb246IHNldHRpbmcgLyBvZmY6IGNhbmNlbGluZ1xuICAgICAqICAtIGBqYWAgb246IOioreWumiAvIG9mZjog6Kej6ZmkXG4gICAgICovXG4gICAgc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dGluZy9jYW5jZWxsaW5nIHNjcm9sbCBzdG9wIGV2ZW50IGhhbmRsZXIuXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXIsIG1ldGhvZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc1xuICAgICAqICAtIGBlbmAgbmV3IHNjcm9sbCBwb3NpdGlvbiB2YWx1ZSBbMCAtIHBvc01heF1cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiBbMCAtIHBvc01heF1cbiAgICAgKiBAcGFyYW0gYW5pbWF0ZVxuICAgICAqICAtIGBlbmAgZW5hYmxlL2Rpc2FibGUgYW5pbWF0aW9uXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7mnInnhKFcbiAgICAgKiBAcGFyYW0gdGltZVxuICAgICAqICAtIGBlbmAgdGltZSBzcGVudCBvbiBhbmltYXRpb24gW21zZWNdXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVuc3VyZSB2aXNpYmlsaXR5IG9mIGl0ZW0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGluZGV4IG9mIGl0ZW1cbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBlbnN1cmVWaXNpYmxlKGluZGV4OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZW5zdXJlVmlzaWJsZShpbmRleCwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlc3RvcmUoa2V5LCByZWJ1aWxkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciBiYWNrdXAgZGF0YSBleGlzdHMuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoeOCkueiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMgLyBmYWxzZTogbm90IGV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJIC8gZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5oYXNCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGlzY2FyZCBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGRpc2NhcmQgZXhpc3RpbmcgZGF0YSAvIGZhbHNlOiBzcGVjaWZpZWQgZGF0YSBkb2VzIG5vdCBleGlzdFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5a2Y5Zyo44GX44Gf44OH44O844K/44KS56C05qOEIC8gZmFsc2U6IOaMh+WumuOBleOCjOOBn+ODh+ODvOOCv+OBr+WtmOWcqOOBl+OBquOBhFxuICAgICAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5jbGVhckJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiBVbmtub3duT2JqZWN0IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0QmFja3VwRGF0YShrZXkpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQGVuIEJhY2t1cCBkYXRhIGNhbiBiZSBzZXQgZXh0ZXJuYWxseS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXlcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZWVkZWQgLyBmYWxzZTogc2NoZW1hIGludmFsaWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDjgrnjgq3jg7zjg57jgYzkuI3mraNcbiAgICAgKi9cbiAgICBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiBVbmtub3duT2JqZWN0KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldEJhY2t1cERhdGEoa2V5LCBkYXRhIGFzIHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0pO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgV3JpdGFibGUgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RWaWV3IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcbmltcG9ydCB7IHR5cGUgTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9ucywgTGlzdEl0ZW1WaWV3IH0gZnJvbSAnLi9saXN0LWl0ZW0tdmlldyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBncm91cDogR3JvdXBQcm9maWxlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3fSBjb25zdHJ1Y3Rpb24uXG4gKiBAamEge0BsaW5rIEV4cGFuZGFibGVMaXN0SXRlbVZpZXd9IOani+evieOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4cGFuZGFibGVMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBvd25lcjogSUV4cGFuZGFibGVMaXN0VmlldztcbiAgICAvKioge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgKi9cbiAgICBncm91cDogR3JvdXBQcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIEV4cGFuZGFibGVMaXN0Vmlld30uXG4gKiBAamEge0BsaW5rIEV4cGFuZGFibGVMaXN0Vmlld30g44GM5omx44GG44Oq44K544OI44Ki44Kk44OG44Og44Kz44Oz44OG44OK44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBMaXN0SXRlbVZpZXc8VEVsZW1lbnQsIFRFdmVudD4ge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogRXhwYW5kYWJsZUxpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICBjb25zdCB7IGdyb3VwIH0gPSBvcHRpb25zO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHsgZ3JvdXAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcm90ZWN0ZWQgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMuXG4gICAgICogQGphIOWxlemWi+eKtuaFi+OCkuWIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4cGFuZGVkLCBjb2xsYXBzZWQ6IGNsb3NlXG4gICAgICogIC0gYGphYCB0cnVlOiDlsZXplossIGZhbHNlOiDlj47mnZ9cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzRXhwYW5kZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5ncm91cC5pc0V4cGFuZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nLlxuICAgICAqIEBqYSDlsZXplovkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNFeHBhbmRpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDlj47mnZ/kuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzQ29sbGFwc2luZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZyBvciBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDplovplonkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNTd2l0Y2hpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSBpZiBpdCBoYXMgYSBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGhhc0NoaWxkcmVuKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uZ3JvdXAuaGFzQ2hpbGRyZW47XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBsdWlkLFxuICAgIHN0YXR1c0FkZFJlZixcbiAgICBzdGF0dXNSZWxlYXNlLFxuICAgIHN0YXR1c1Njb3BlLFxuICAgIGlzU3RhdHVzSW4sXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUV4cGFuZE9wZXJhdGlvbixcbiAgICBJTGlzdFN0YXR1c01hbmFnZXIsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElFeHBhbmRhYmxlTGlzdENvbnRleHQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4gQ29yZSBsb2dpYyBpbXBsZW1lbnRhdGlvbiBjbGFzcyB0aGF0IG1hbmFnZXMgZXhwYW5kaW5nIC8gY29sbGFwc2luZyBzdGF0ZS5cbiAqIEBqYSDplovplonnirbmhYvnrqHnkIbjgpLooYzjgYbjgrPjgqLjg63jgrjjg4Pjgq/lrp/oo4Xjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEV4cGFuZENvcmUgaW1wbGVtZW50c1xuICAgIElFeHBhbmRPcGVyYXRpb24sXG4gICAgSUxpc3RTdGF0dXNNYW5hZ2VyLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcblxuICAgIC8qKiB7IGlkOiBHcm91cFByb2ZpbGUgfSAqL1xuICAgIHByaXZhdGUgX21hcEdyb3VwczogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPiA9IHt9O1xuICAgIC8qKiDnrKwx6ZqO5bGkIEdyb3VwUHJvZmlsZSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIF9hcnlUb3BHcm91cHM6IEdyb3VwUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggeyBtYXAsIHRvcHMgfSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9iYWNrdXA6IFJlY29yZDxzdHJpbmcsIHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIG93bmVyIOimqiBWaWV3IOOBruOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG93bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX293bmVyID0gb3duZXI7XG4gICAgfVxuXG4gICAgLyoqIOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9tYXBHcm91cHMgPSB7fTtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gW107XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUV4cGFuZE9wZXJhdGlvblxuXG4gICAgLyoqIOaWsOimjyBHcm91cFByb2ZpbGUg44KS5L2c5oiQICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBpZCA9IGlkID8/IGx1aWQoJ2xpc3QtZ3JvdXAnLCA0KTtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fbWFwR3JvdXBzW2lkXSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21hcEdyb3Vwc1tpZF07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZ3JvdXAgPSBuZXcgR3JvdXBQcm9maWxlKHRoaXMuX293bmVyLCBpZCk7XG4gICAgICAgIHRoaXMuX21hcEdyb3Vwc1tpZF0gPSBncm91cDtcbiAgICAgICAgcmV0dXJuIGdyb3VwO1xuICAgIH1cblxuICAgIC8qKiDnmbvpjLLmuIjjgb8gR3JvdXAg44KS5Y+W5b6XICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXBHcm91cHNbaWRdO1xuICAgIH1cblxuICAgIC8qKiDnrKwx6ZqO5bGk44GuIEdyb3VwIOeZu+mMsiAqL1xuICAgIHJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXA6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICAvLyDjgZnjgafjgavnmbvpjLLmuIjjgb/jga7loLTlkIjjga8gcmVzdG9yZSDjgZfjgaYgbGF5b3V0IOOCreODvOOBlOOBqOOBq+W+qeWFg+OBmeOCi+OAglxuICAgICAgICBpZiAoJ3JlZ2lzdGVyZWQnID09PSB0b3BHcm91cC5zdGF0dXMpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IG9yaWVudGF0aW9uIGNoYW5nZWQg5pmC44GuIGxheW91dCDjgq3jg7zlpInmm7Tlr77lv5zjgaDjgYzjgIHjgq3jg7zjgavlpInmm7TjgYznhKHjgYTjgajjgY3jga/kuI3lhbflkIjjgajjgarjgovjgIJcbiAgICAgICAgICAgIC8vIOOBk+OBriBBUEkg44Gr5a6f6KOF44GM5b+F6KaB44GL44KC5ZCr44KB44Gm6KaL55u044GX44GM5b+F6KaBXG4gICAgICAgICAgICB0b3BHcm91cC5yZXN0b3JlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsYXN0R3JvdXAgPSB0aGlzLl9hcnlUb3BHcm91cHNbdGhpcy5fYXJ5VG9wR3JvdXBzLmxlbmd0aCAtIDFdO1xuICAgICAgICBjb25zdCBpbnNlcnRUbyA9IGxhc3RHcm91cD8uZ2V0TmV4dEl0ZW1JbmRleCh0cnVlKSA/PyAwO1xuXG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3Vwcy5wdXNoKHRvcEdyb3VwKTtcbiAgICAgICAgdG9wR3JvdXAucmVnaXN0ZXIoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDnrKwx6ZqO5bGk44GuIEdyb3VwIOOCkuWPluW+lyAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnlUb3BHcm91cHMuc2xpY2UoMCk7XG4gICAgfVxuXG4gICAgLyoqIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWxlemWiyAoMemajuWxpCkgKi9cbiAgICBhc3luYyBleHBhbmRBbGwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2llczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBwcm9taXNpZXMucHVzaChncm91cC5leHBhbmQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzaWVzKTtcbiAgICB9XG5cbiAgICAvKiog44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5Y+O5p2fICgx6ZqO5bGkKSAqL1xuICAgIGFzeW5jIGNvbGxhcHNlQWxsKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2llczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBwcm9taXNpZXMucHVzaChncm91cC5jb2xsYXBzZShkZWxheSkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2llcyk7XG4gICAgfVxuXG4gICAgLyoqIOWxlemWi+S4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNTdGF0dXNJbignZXhwYW5kaW5nJyk7XG4gICAgfVxuXG4gICAgLyoqIOWPjuadn+S4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzU3RhdHVzSW4oJ2NvbGxhcHNpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog6ZaL6ZaJ5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0V4cGFuZGluZyB8fCB0aGlzLmlzQ29sbGFwc2luZztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFN0YXR1c01hbmFnZXJcblxuICAgIC8qKiDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4ggKi9cbiAgICBzdGF0dXNBZGRSZWYoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gc3RhdHVzQWRkUmVmKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiCAqL1xuICAgIHN0YXR1c1JlbGVhc2Uoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gc3RhdHVzUmVsZWFzZShzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKiDlh6bnkIbjgrnjgrPjg7zjg5fmr47jgavnirbmhYvlpInmlbDjgpLoqK3lrpogKi9cbiAgICBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZywgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBzdGF0dXNTY29wZShzdGF0dXMsIGV4ZWN1dG9yKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44Gf54q25oWL5Lit44Gn44GC44KL44GL56K66KqNICovXG4gICAgaXNTdGF0dXNJbihzdGF0dXM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gaXNTdGF0dXNJbihzdGF0dXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0QmFja3VwUmVzdG9yZVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OCkuODkOODg+OCr+OCouODg+ODlyAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCB7IF9iYWNrdXAgfSA9IHRoaXM7XG4gICAgICAgIGlmIChudWxsID09IF9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgX2JhY2t1cFtrZXldID0ge1xuICAgICAgICAgICAgICAgIG1hcDogdGhpcy5fbWFwR3JvdXBzLFxuICAgICAgICAgICAgICAgIHRvcHM6IHRoaXMuX2FyeVRvcEdyb3VwcyxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OCkuODquOCueODiOOCoiAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYmFja3VwID0gdGhpcy5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgICAgIGlmIChudWxsID09IGJhY2t1cCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCB0aGlzLl9hcnlUb3BHcm91cHMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5fbWFwR3JvdXBzLCBiYWNrdXAubWFwKTtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gYmFja3VwLnRvcHMuc2xpY2UoKTtcblxuICAgICAgICAvLyDlsZXplovjgZfjgabjgYTjgovjgoLjga7jgpLnmbvpjLJcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIGdyb3VwLnJlc3RvcmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWGjeani+evieOBruS6iOe0hFxuICAgICAgICByZWJ1aWxkICYmIHRoaXMuX293bmVyLnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoSAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5fYmFja3VwKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuSAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumiAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfSk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoZGF0YS5tYXAgJiYgQXJyYXkuaXNBcnJheShkYXRhLnRvcHMpKSB7XG4gICAgICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IGRhdGE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSwgVW5rbm93bk9iamVjdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdFZpZXcsIElFeHBhbmRPcGVyYXRpb24gfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgRXhwYW5kQ29yZSB9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQgdHlwZSB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5pbXBvcnQgeyB0eXBlIExpc3RWaWV3Q29uc3RydWN0T3B0aW9ucywgTGlzdFZpZXcgfSBmcm9tICcuL2xpc3Qtdmlldyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBjb250ZXh0OiBFeHBhbmRDb3JlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVmlydHVhbCBsaXN0IHZpZXcgY2xhc3Mgd2l0aCBleHBhbmRpbmcgLyBjb2xsYXBzaW5nIGZ1bmN0aW9uYWxpdHkuXG4gKiBAamEg6ZaL6ZaJ5qmf6IO944KS5YKZ44GI44Gf5Luu5oOz44Oq44K544OI44OT44Ol44O844Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFeHBhbmRhYmxlTGlzdFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIExpc3RWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUV4cGFuZGFibGVMaXN0VmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiBuZXcgRXhwYW5kQ29yZSh0aGlzKSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbiAgICAvKiogY29udGV4dCBhY2Nlc3NvciAqL1xuICAgIGdldCBleHBhbmRDb250ZXh0KCk6IElFeHBhbmRPcGVyYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRXhwYW5kYWJsZUxpc3RWaWV3XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IHtAbGluayBHcm91cFByb2ZpbGV9LiBSZXR1cm4gdGhlIG9iamVjdCBpZiBpdCBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQuXG4gICAgICogQGphIOaWsOimjyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLkvZzmiJAuIOeZu+mMsua4iOOBv+OBruWgtOWQiOOBr+OBneOBruOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBuZXdseSBjcmVhdGVkIGdyb3VwIGlkLiBpZiBub3Qgc3BlY2lmaWVkLCBhdXRvbWF0aWMgYWxsb2NhdGlvbiB3aWxsIGJlIHBlcmZvcm1lZC5cbiAgICAgKiAgLSBgamFgIOaWsOimj+OBq+S9nOaIkOOBmeOCiyBHcm91cCBJRCDjgpLmjIflrpouIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+iHquWLleWJsuOCiuaMr+OCilxuICAgICAqL1xuICAgIG5ld0dyb3VwKGlkPzogc3RyaW5nKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQubmV3R3JvdXAoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcmVnaXN0ZXJlZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg55m76Yyy5riI44G/IHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBHcm91cCBJRCB0byByZXRyaWV2ZVxuICAgICAqICAtIGBqYWAg5Y+W5b6X44GZ44KLIEdyb3VwIElEIOOCkuaMh+WumlxuICAgICAqL1xuICAgIGdldEdyb3VwKGlkOiBzdHJpbmcpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRHcm91cChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIDFzdCBsYXllciB7QGxpbmsgR3JvdXBQcm9maWxlfSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIOesrDHpmo7lsaTjga4ge0BsaW5rIEdyb3VwUHJvZmlsZX0g55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9wR3JvdXBcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGVkIHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCDmp4vnr4nmuIjjgb8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCAxc3QgbGF5ZXIge0BsaW5rIEdyb3VwUHJvZmlsZX0uIDxicj5cbiAgICAgKiAgICAgQSBjb3B5IGFycmF5IGlzIHJldHVybmVkLCBzbyB0aGUgY2xpZW50IGNhbm5vdCBjYWNoZSBpdC5cbiAgICAgKiBAamEg56ysMemajuWxpOOBriB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpcgPGJyPlxuICAgICAqICAgICDjgrPjg5Tjg7zphY3liJfjgYzov5TjgZXjgozjgovjgZ/jgoHjgIHjgq/jg6njgqTjgqLjg7Pjg4jjga/jgq3jg6Pjg4Pjgrfjg6XkuI3lj69cbiAgICAgKi9cbiAgICBnZXRUb3BHcm91cHMoKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRUb3BHcm91cHMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhwYW5kIGFsbCBncm91cHMgKDFzdCBsYXllcilcbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5bGV6ZaLICgx6ZqO5bGkKVxuICAgICAqL1xuICAgIGV4cGFuZEFsbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZXhwYW5kQWxsKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbGxhcHNlIGFsbCBncm91cHMgKDFzdCBsYXllcilcbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5Y+O5p2fICgx6ZqO5bGkKVxuICAgICAqL1xuICAgIGNvbGxhcHNlQWxsKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNvbGxhcHNlQWxsKGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZy5cbiAgICAgKiBAamEg5bGV6ZaL5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0V4cGFuZGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOWPjuadn+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzQ29sbGFwc2luZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZyBvciBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDplovplonkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzU3dpdGNoaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbmNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAgICAgKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44Kk44Oz44Kv44Oq44Oh44Oz44OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gICAgICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAgICAgKi9cbiAgICBzdGF0dXNBZGRSZWYoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gICAgICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gICAgICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhdGUgdmFyaWFibGUgbWFuYWdlbWVudCBzY29wZVxuICAgICAqIEBqYSDnirbmhYvlpInmlbDnrqHnkIbjgrnjgrPjg7zjg5dcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR2YWwgb2Ygc2VlZCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBrumWouaVsOOBruaIu+OCiuWApFxuICAgICAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc3RhdHVzU2NvcGUoc3RhdHVzLCBleGVjdXRvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGlmIGl0J3MgaW4gdGhlIHNwZWNpZmllZCBzdGF0ZS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf54q25oWL5Lit44Gn44GC44KL44GL56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlOiDnirbmhYvlhoUgLyBmYWxzZTog54q25oWL5aSWXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogd2l0aGluIHRoZSBzdGF0dXMgLyBgZmFsc2VgOiBvdXQgb2YgdGhlIHN0YXR1c1xuICAgICAqICAtIGBqYWAgYHRydWVgOiDnirbmhYvlhoUgLyBgZmFsc2VgOiDnirbmhYvlpJZcbiAgICAgKi9cbiAgICBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzU3RhdHVzSW4oc3RhdHVzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBEZXN0cm95IGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOeuoei9hOODh+ODvOOCv+OCkuegtOajhFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHN1cGVyLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5IChhbnkgaWRlbnRpZmllcilcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvCjku7vmhI/jga7orZjliKXlrZAp44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5iYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcGFyYW0gcmVidWlsZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHJlYnVpbGQgdGhlIGxpc3Qgc3RydWN0dXJlXG4gICAgICogIC0gYGphYCDjg6rjgrnjg4jmp4vpgKDjgpLlho3mp4vnr4njgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZCA9IHRydWUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIGJhY2t1cCBkYXRhIGV4aXN0cy5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cyAvIGZhbHNlOiBub3QgZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIkgLyBmYWxzZTog54ShXG4gICAgICovXG4gICAgb3ZlcnJpZGUgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEaXNjYXJkIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZGlzY2FyZCBleGlzdGluZyBkYXRhIC8gZmFsc2U6IHNwZWNpZmllZCBkYXRhIGRvZXMgbm90IGV4aXN0XG4gICAgICogIC0gYGphYCB0cnVlOiDlrZjlnKjjgZfjgZ/jg4fjg7zjgr/jgpLnoLTmo4QgLyBmYWxzZTog5oyH5a6a44GV44KM44Gf44OH44O844K/44Gv5a2Y5Zyo44GX44Gq44GEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICovXG4gICAgb3ZlcnJpZGUgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IFVua25vd25PYmplY3QgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmFja3VwIGRhdGEgY2FuIGJlIHNldCBleHRlcm5hbGx5LlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2NlZWRlZCAvIGZhbHNlOiBzY2hlbWEgaW52YWxpZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOOCueOCreODvOODnuOBjOS4jeato1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IFVua25vd25PYmplY3QpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0QmFja3VwRGF0YShrZXksIGRhdGEgYXMgeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9KTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiJCIsIl9wcm9wZXJ0aWVzIiwic2V0VGltZW91dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7O0FBR0c7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQUxELElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEscUJBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxxQkFBOEMsQ0FBQTtRQUM5QyxXQUEyQyxDQUFBLFdBQUEsQ0FBQSwwQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEscUNBQThCLENBQUMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFBLEdBQUEsMENBQUEsQ0FBQTtRQUM1SixXQUEyQyxDQUFBLFdBQUEsQ0FBQSxpQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEscUNBQThCLENBQUMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFBLEdBQUEsaUNBQUEsQ0FBQTtRQUN2SixXQUEyQyxDQUFBLFdBQUEsQ0FBQSxxQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEscUNBQThCLENBQUMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFBLEdBQUEscUNBQUEsQ0FBQTtBQUN2SixLQUFDLEdBQUEsQ0FBQTtBQUNMLENBQUMsR0FBQTs7QUNJRCxNQUFNLE9BQU8sR0FBRztBQUNaLElBQUEsU0FBUyxFQUFvQixRQUFBO0FBQzdCLElBQUEsZ0JBQWdCLEVBQTJCLDRCQUFBO0FBQzNDLElBQUEsY0FBYyxFQUF5QixpQkFBQTtBQUN2QyxJQUFBLGFBQWEsRUFBd0IseUJBQUE7QUFDckMsSUFBQSxtQkFBbUIsRUFBOEIsMkJBQUE7QUFDakQsSUFBQSxlQUFlLEVBQTBCLGlCQUFBO0FBQ3pDLElBQUEsZUFBZSxFQUEwQixpQkFBQTtDQUM1QyxDQUFDO0FBYUYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxTQUFrQyxLQUFtQztBQUMxRixJQUFBLE1BQU0sRUFDRixTQUFTLEVBQUUsRUFBRSxFQUNiLGdCQUFnQixFQUFFLFNBQVMsRUFDM0IsY0FBYyxFQUFFLFFBQVEsRUFDeEIsYUFBYSxFQUFFLE9BQU8sRUFDdEIsbUJBQW1CLEVBQUUsUUFBUSxFQUM3QixlQUFlLEVBQUUsUUFBUSxFQUN6QixlQUFlLEVBQUUsUUFBUSxHQUM1QixHQUFHLFNBQVMsQ0FBQztJQUVkLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUNyQixJQUFBLE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxLQUFLLEVBQUUsR0FBRyxDQUFBLEVBQUcsRUFBRSxDQUFzQixvQkFBQSxDQUFBLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFDckYsSUFBQSxNQUFNLGNBQWMsR0FBRyxRQUFRLEtBQUssRUFBRSxHQUFHLENBQUEsRUFBRyxFQUFFLENBQVcsU0FBQSxDQUFBLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFDdkUsSUFBQSxNQUFNLGFBQWEsR0FBRyxPQUFPLEtBQUssRUFBRSxHQUFHLENBQUEsRUFBRyxFQUFFLENBQW1CLGlCQUFBLENBQUEsR0FBRyxTQUFTLENBQUMsQ0FBQztBQUM3RSxJQUFBLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxLQUFLLEVBQUUsR0FBRyxDQUFBLEVBQUcsRUFBRSxDQUFxQixtQkFBQSxDQUFBLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFFdEYsSUFBQSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO1FBQzVCLFNBQVM7UUFDVCxnQkFBZ0I7UUFDaEIsY0FBYztRQUNkLGFBQWE7UUFDYixtQkFBbUI7QUFDbkIsUUFBQSxlQUFlLEVBQUUsUUFBUTtBQUN6QixRQUFBLGVBQWUsRUFBRSxRQUFRO0FBQzVCLEtBQUEsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDO0FBRUY7OztBQUdHO0FBQ1UsTUFBQSxvQkFBb0IsR0FBRyxDQUFDLFNBQW1DLEtBQTBCO0lBQzlGLElBQUksU0FBUyxFQUFFO1FBQ1gsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUN0QyxZQUFBLElBQUksU0FBUyxLQUFLLFNBQVMsQ0FBQyxHQUFvQyxDQUFDLEVBQUU7QUFDL0QsZ0JBQUEsT0FBTyxTQUFTLENBQUMsR0FBb0MsQ0FBQyxDQUFDO2FBQzFEO1NBQ0o7S0FDSjtBQUNELElBQUEsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ2hFOztBQzFFQTs7O0FBR0c7TUFDVSxXQUFXLENBQUE7O0FBRUgsSUFBQSxNQUFNLENBQWU7O0FBRTlCLElBQUEsT0FBTyxDQUFTOztBQUVQLElBQUEsWUFBWSxDQUEyQjs7QUFFdkMsSUFBQSxLQUFLLENBQWdCOztBQUU5QixJQUFBLE1BQU0sQ0FBVTs7QUFFaEIsSUFBQSxVQUFVLENBQVU7O0lBRXBCLE9BQU8sR0FBRyxDQUFDLENBQUM7O0FBRVosSUFBQSxNQUFNLENBQU87O0FBRWIsSUFBQSxTQUFTLENBQWlCO0FBRWxDOzs7Ozs7Ozs7Ozs7Ozs7QUFlRztBQUNILElBQUEsV0FBQSxDQUFZLEtBQW1CLEVBQUUsTUFBYyxFQUFFLFdBQXFDLEVBQUUsS0FBb0IsRUFBQTtBQUN4RyxRQUFBLElBQUksQ0FBQyxNQUFNLEdBQVMsS0FBSyxDQUFDO0FBQzFCLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBUSxNQUFNLENBQUM7QUFDM0IsUUFBQSxJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQztBQUNoQyxRQUFBLElBQUksQ0FBQyxLQUFLLEdBQVUsS0FBSyxDQUFDO0tBQzdCOzs7O0FBTUQsSUFBQSxJQUFJLE1BQU0sR0FBQTtRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztLQUN2Qjs7QUFHRCxJQUFBLElBQUksS0FBSyxHQUFBO1FBQ0wsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0tBQ3RCOztJQUdELElBQUksS0FBSyxDQUFDLEtBQWEsRUFBQTtBQUNuQixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztLQUN0Qjs7QUFHRCxJQUFBLElBQUksU0FBUyxHQUFBO1FBQ1QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0tBQzFCOztJQUdELElBQUksU0FBUyxDQUFDLEtBQWEsRUFBQTtBQUN2QixRQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztLQUMxQjs7QUFHRCxJQUFBLElBQUksTUFBTSxHQUFBO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0tBQ3ZCOztJQUdELElBQUksTUFBTSxDQUFDLE1BQWMsRUFBQTtBQUNyQixRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztLQUN2Qjs7QUFHRCxJQUFBLElBQUksSUFBSSxHQUFBO1FBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0tBQ3JCOzs7QUFLRDs7O0FBR0c7SUFDSSxRQUFRLEdBQUE7QUFDWCxRQUFBLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDeEIsWUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDcEIsWUFBQSxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO2dCQUMxQixFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ2YsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNO0FBQ2xCLGdCQUFBLElBQUksRUFBRSxJQUFJO0FBQ2IsYUFBQSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hELElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7YUFDdkM7U0FDSjtRQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUN2QixRQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQzVDO0tBQ0o7QUFFRDs7O0FBR0c7SUFDSSxJQUFJLEdBQUE7QUFDUCxRQUFBLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDeEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ25CO0FBQ0QsUUFBQSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQzNELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztTQUMzQztLQUNKO0FBRUQ7OztBQUdHO0lBQ0ksVUFBVSxHQUFBO0FBQ2IsUUFBQSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ3hCLFlBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUN4QixZQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQzNCLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3BDLFlBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7U0FDM0I7S0FDSjtBQUVEOzs7QUFHRztJQUNJLE9BQU8sR0FBQTtBQUNWLFFBQUEsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtBQUN4QixZQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDM0I7S0FDSjtBQUVEOzs7QUFHRztJQUNJLFFBQVEsR0FBQTtBQUNYLFFBQUEsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUNqQztBQUVEOzs7QUFHRztJQUNJLFlBQVksQ0FBQyxTQUFpQixFQUFFLE9BQXFDLEVBQUE7QUFDeEUsUUFBQSxNQUFNLEtBQUssR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUN2QyxRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO0FBQ3pCLFFBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6QyxRQUFBLElBQUksT0FBTyxFQUFFLFVBQVUsRUFBRTtZQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ2hEO0tBQ0o7QUFFRDs7O0FBR0c7SUFDSSxVQUFVLEdBQUE7QUFDYixRQUFBLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDeEIsWUFBQSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDOUQ7S0FDSjs7OztBQU1ELElBQUEsSUFBWSxPQUFPLEdBQUE7UUFDZixPQUFPLG9CQUFvQixFQUFFLENBQUM7S0FDakM7O0lBR08sa0JBQWtCLEdBQUE7QUFDdEIsUUFBQSxJQUFJLEtBQVUsQ0FBQztRQUNmLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMzRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFFcEQsUUFBQSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQ3JCLFlBQUEsT0FBTyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3pDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUN0QjtBQUVELFFBQUEsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUNyQixLQUFLLEdBQUcsUUFBUSxDQUFDO0FBQ2pCLFlBQUEsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM1QixLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDakQ7YUFBTTs7QUFFSCxZQUFBLEtBQUssR0FBR0EsR0FBQyxDQUFDLENBQUEsQ0FBQSxFQUFJLFdBQVcsQ0FBVyxRQUFBLEVBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQSxLQUFBLEVBQVEsV0FBVyxDQUFBLEVBQUEsQ0FBSSxDQUFDLENBQUM7QUFDN0YsWUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEM7O1FBR0QsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNqQyxZQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQzlCO0FBRUQsUUFBQSxPQUFPLEtBQUssQ0FBQztLQUNoQjs7SUFHTyxXQUFXLEdBQUE7UUFDZixJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0FBQ3ZGLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU8sQ0FBQyxDQUFDO1NBQ2hFO0tBQ0o7O0lBR08sZUFBZSxHQUFBO1FBQ25CLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDM0YsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsVUFBVyxDQUFDLENBQUM7U0FDcEU7S0FDSjs7SUFHTyxZQUFZLEdBQUE7QUFDaEIsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNkLE9BQU87U0FDVjtRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUU7QUFDM0MsWUFBQSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLFlBQUEsSUFBSSxVQUFVLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUM3QixnQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQSxjQUFBLEVBQWlCLElBQUksQ0FBQyxPQUFPLENBQUEsSUFBQSxDQUFNLENBQUMsQ0FBQzthQUNyRTtTQUNKO2FBQU07QUFDSCxZQUFBLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNqRCxZQUFBLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDdEIsZ0JBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUEsRUFBRyxJQUFJLENBQUMsT0FBTyxDQUFBLEVBQUEsQ0FBSSxDQUFDLENBQUM7YUFDL0M7U0FDSjtLQUNKO0FBQ0o7O0FDOVFEOzs7QUFHRztNQUNVLFdBQVcsQ0FBQTs7SUFFWixNQUFNLEdBQUcsQ0FBQyxDQUFDOztJQUVYLE9BQU8sR0FBRyxDQUFDLENBQUM7O0lBRVosT0FBTyxHQUFHLENBQUMsQ0FBQzs7SUFFWixNQUFNLEdBQWtCLEVBQUUsQ0FBQzs7SUFFM0IsT0FBTyxHQUFxQyxVQUFVLENBQUM7Ozs7QUFNL0QsSUFBQSxJQUFJLEtBQUssR0FBQTtRQUNMLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztLQUN0Qjs7SUFHRCxJQUFJLEtBQUssQ0FBQyxLQUFhLEVBQUE7QUFDbkIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztLQUN2Qjs7QUFHRCxJQUFBLElBQUksTUFBTSxHQUFBO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0tBQ3ZCOztJQUdELElBQUksTUFBTSxDQUFDLE1BQWMsRUFBQTtBQUNyQixRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0tBQ3pCOztBQUdELElBQUEsSUFBSSxNQUFNLEdBQUE7UUFDTixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7S0FDdkI7O0FBR0QsSUFBQSxJQUFJLE1BQU0sR0FBQTtRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztLQUN2Qjs7O0FBS0Q7OztBQUdHO0lBQ0ksUUFBUSxHQUFBO0FBQ1gsUUFBQSxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQzNCLFlBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUM1QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDbkI7U0FDSjtBQUNELFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7S0FDM0I7QUFFRDs7O0FBR0c7SUFDSSxJQUFJLEdBQUE7QUFDUCxRQUFBLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDM0IsWUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNmO1NBQ0o7QUFDRCxRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDO0tBQzNCO0FBRUQ7OztBQUdHO0lBQ0ksVUFBVSxHQUFBO0FBQ2IsUUFBQSxJQUFJLFVBQVUsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQzdCLFlBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUM1QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7YUFDckI7U0FDSjtBQUNELFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7S0FDN0I7QUFFRDs7O0FBR0c7QUFDSSxJQUFBLElBQUksQ0FBQyxJQUFpQixFQUFBO0FBQ3pCLFFBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkIsUUFBQSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUM7S0FDL0I7QUFFRDs7O0FBR0c7SUFDSSxTQUFTLEdBQUE7QUFDWixRQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ1osWUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztTQUM3QjtLQUNKO0FBRUQ7OztBQUdHO0FBQ0ksSUFBQSxPQUFPLENBQUMsS0FBYSxFQUFBO1FBQ3hCLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDakM7QUFFRDs7O0FBR0c7SUFDSSxZQUFZLEdBQUE7QUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN6QjtBQUVEOzs7QUFHRztJQUNJLFdBQVcsR0FBQTtBQUNkLFFBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzlDO0FBQ0o7O0FDOUhEOzs7OztBQUtHO01BQ1UsWUFBWSxDQUFBOztBQUVKLElBQUEsR0FBRyxDQUFTOztBQUVaLElBQUEsTUFBTSxDQUF5Qjs7QUFFeEMsSUFBQSxPQUFPLENBQWdCOztJQUVkLFNBQVMsR0FBbUIsRUFBRSxDQUFDOztJQUV4QyxTQUFTLEdBQUcsS0FBSyxDQUFDOztJQUVsQixPQUFPLEdBQWtDLGNBQWMsQ0FBQzs7SUFFL0MsTUFBTSxHQUFrQixFQUFFLENBQUM7QUFFNUM7Ozs7Ozs7OztBQVNHO0lBQ0gsV0FBWSxDQUFBLEtBQTZCLEVBQUUsRUFBVSxFQUFBO0FBQ2pELFFBQUEsSUFBSSxDQUFDLEdBQUcsR0FBTSxFQUFFLENBQUM7QUFDakIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztLQUN2Qjs7O0FBS0Q7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLEVBQUUsR0FBQTtRQUNGLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztLQUNuQjtBQUVEOzs7O0FBSUc7QUFDSCxJQUFBLElBQUksTUFBTSxHQUFBO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0tBQ3ZCO0FBRUQ7Ozs7Ozs7QUFPRztBQUNILElBQUEsSUFBSSxVQUFVLEdBQUE7UUFDVixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7S0FDekI7QUFFRDs7O0FBR0c7QUFDSCxJQUFBLElBQUksTUFBTSxHQUFBO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0tBQ3ZCO0FBRUQ7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLFFBQVEsR0FBQTtRQUNSLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUN6Qjs7O0FBS0Q7Ozs7Ozs7QUFPRztJQUNJLGdCQUFnQixDQUFDLGtCQUFrQixHQUFHLEtBQUssRUFBQTtRQUM5QyxJQUFJLEtBQUssR0FBa0IsRUFBRSxDQUFDO1FBQzlCLElBQUksa0JBQWtCLEVBQUU7QUFDcEIsWUFBQSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQy9DO1FBQ0QsSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0FBQ3BDLFlBQUEsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7U0FDdkI7QUFDRCxRQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNwRDtBQUVEOzs7Ozs7Ozs7Ozs7O0FBYUc7QUFDSSxJQUFBLE9BQU8sQ0FDVixNQUFjLEVBQ2QsV0FBcUMsRUFDckMsSUFBbUIsRUFBQTtBQUVuQixRQUFBLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckQsTUFBTSxJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7O0FBRzVGLFFBQUEsSUFBSSxZQUFZLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUMvQixZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0FBQ3BELFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUN4QjtBQUNELFFBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdkIsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNmO0FBRUQ7Ozs7O0FBS0c7QUFDSSxJQUFBLFdBQVcsQ0FBQyxNQUFxQyxFQUFBO0FBQ3BELFFBQUEsTUFBTSxRQUFRLEdBQW1CLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0UsUUFBQSxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRTtBQUMxQixZQUFBLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekI7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjtBQUVEOzs7Ozs7O0FBT0c7QUFDSCxJQUFBLElBQUksV0FBVyxHQUFBO0FBQ1gsUUFBQSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztLQUNsQztBQUVEOzs7QUFHRztBQUNJLElBQUEsTUFBTSxNQUFNLEdBQUE7QUFDZixRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2xCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN0RCxZQUFBLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7Z0JBQ2xCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLE1BQUs7O0FBRTVDLG9CQUFBLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTt3QkFDNUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3FCQUNsQjs7QUFFRCxvQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztBQUNyRCxvQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3pCLGlCQUFDLENBQUMsQ0FBQzthQUNOO1NBQ0o7O0FBRUQsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztLQUN6QjtBQUVEOzs7Ozs7O0FBT0c7SUFDSSxNQUFNLFFBQVEsQ0FBQyxLQUFjLEVBQUE7QUFDaEMsUUFBQSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDakIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELFlBQUEsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtBQUNsQixnQkFBQSxLQUFLLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztnQkFDL0QsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsTUFBSzs7QUFFN0Msb0JBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO3dCQUM1QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7cUJBQ2xCOztvQkFFRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM5RSxvQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3pCLGlCQUFDLENBQUMsQ0FBQzthQUNOO1NBQ0o7O0FBRUQsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztLQUMxQjtBQUVEOzs7Ozs7O0FBT0c7SUFDSCxNQUFNLGFBQWEsQ0FBQyxPQUFrQyxFQUFBO1FBQ2xELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO0FBQ3hCLFlBQUEsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNwRzthQUFNO1lBQ0gsT0FBTyxFQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzlDO0tBQ0o7QUFFRDs7Ozs7OztBQU9HO0lBQ0ksTUFBTSxNQUFNLENBQUMsS0FBYyxFQUFBO0FBQzlCLFFBQUEsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ2hCLFlBQUEsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzlCO2FBQU07QUFDSCxZQUFBLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ3ZCO0tBQ0o7QUFFRDs7Ozs7OztBQU9HO0FBQ0ksSUFBQSxRQUFRLENBQUMsUUFBZ0IsRUFBQTtBQUM1QixRQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNkLFlBQUEsTUFBTSxVQUFVLENBQ1osV0FBVyxDQUFDLCtCQUErQixFQUMzQyxDQUFBLEVBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBLG1FQUFBLENBQXFFLENBQ3BJLENBQUM7U0FDTDtBQUNELFFBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM5RCxRQUFBLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFFRDs7O0FBR0c7SUFDSSxPQUFPLEdBQUE7QUFDVixRQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNkLFlBQUEsTUFBTSxVQUFVLENBQ1osV0FBVyxDQUFDLCtCQUErQixFQUMzQyxDQUFBLEVBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBLGtFQUFBLENBQW9FLENBQ25JLENBQUM7U0FDTDtBQUVELFFBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQ2IsWUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDN0csWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMvQjtBQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjs7OztBQU1PLElBQUEsU0FBUyxDQUFDLE1BQW9CLEVBQUE7QUFDbEMsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztLQUN6Qjs7QUFHTyxJQUFBLFVBQVUsQ0FBQyxTQUF3QyxFQUFBO1FBQ3ZELE1BQU0sS0FBSyxHQUFrQixFQUFFLENBQUM7QUFDaEMsUUFBQSxJQUFJLFNBQVMsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQzVCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDOUI7QUFDRCxRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO0FBQ3pCLFFBQUEsT0FBTyxLQUFLLENBQUM7S0FDaEI7O0FBR08sSUFBQSxvQkFBb0IsQ0FBQyxTQUFtRCxFQUFBO0FBQzVFLFFBQUEsTUFBTSxXQUFXLEdBQUcsQ0FBQyxLQUFtQixLQUFtQjtZQUN2RCxNQUFNLEtBQUssR0FBa0IsRUFBRSxDQUFDO0FBQ2hDLFlBQUEsS0FBSyxNQUFNLEtBQUssSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFO2dCQUNqQyxRQUFRLFNBQVM7QUFDYixvQkFBQSxLQUFLLFlBQVksQ0FBQztBQUNsQixvQkFBQSxLQUFLLGNBQWM7d0JBQ2YsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzt3QkFDM0MsTUFBTTtBQUNWLG9CQUFBLEtBQUssUUFBUTtBQUNULHdCQUFBLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUU7NEJBQ3RCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7eUJBQy9CO3dCQUNELE1BQU07QUFDVixvQkFBQTs7QUFFSSx3QkFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixTQUFTLENBQUEsQ0FBRSxDQUFDLENBQUM7d0JBQ2hELE1BQU07aUJBQ2I7QUFDRCxnQkFBQSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7b0JBQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztpQkFDckM7YUFDSjtBQUNELFlBQUEsT0FBTyxLQUFLLENBQUM7QUFDakIsU0FBQyxDQUFDO0FBQ0YsUUFBQSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUM1QjtBQUNKOztBQzVVRCxpQkFBaUIsTUFBTUMsYUFBVyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQW9CMUQ7OztBQUdHO0FBQ0csTUFBZ0IsWUFDbEIsU0FBUSxJQUFzQixDQUFBOztJQUdiLENBQUNBLGFBQVcsRUFBYTs7QUFHMUMsSUFBQSxXQUFBLENBQVksT0FBa0QsRUFBQTtRQUMxRCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFZixRQUFBLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQ0EsYUFBVyxDQUF3QixHQUFHO1lBQ3hDLEtBQUs7WUFDTCxJQUFJO1NBQ0ssQ0FBQztLQUNqQjs7OztBQU1ELElBQUEsSUFBSSxLQUFLLEdBQUE7QUFDTCxRQUFBLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDbEM7OztBQUtEOzs7O0FBSUc7SUFDTSxNQUFNLEdBQUE7UUFDWCxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQzdCLFFBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQzs7QUFFZixRQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0FBQ3JCLFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjs7O0FBS0Q7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLEtBQUssR0FBQTtRQUNMLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO0tBQ3hDO0FBRUQ7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLE1BQU0sR0FBQTtRQUNOLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0tBQ3hDO0FBRUQ7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLFlBQVksR0FBQTtRQUNaLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDO0tBQ3hDO0FBRUQ7Ozs7Ozs7Ozs7QUFVRztJQUNILFlBQVksQ0FBQyxTQUFpQixFQUFFLE9BQXFDLEVBQUE7UUFDakUsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUFFO0FBQ3ZDLFlBQUEsSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN4RCxZQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzlCO0FBQ0QsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNmO0FBQ0o7O0FDakdEOzs7O0FBSUc7TUFDVSxlQUFlLENBQUE7QUFDUCxJQUFBLFFBQVEsQ0FBTTtBQUNkLElBQUEsV0FBVyxDQUFNO0FBQ2pCLElBQUEsUUFBUSxDQUFxQjtBQUM3QixJQUFBLGtCQUFrQixDQUFtQjtBQUM5QyxJQUFBLGVBQWUsQ0FBVTs7QUFHakMsSUFBQSxXQUFBLENBQVksTUFBbUIsRUFBRSxHQUFnQixFQUFFLE9BQTJCLEVBQUE7QUFDMUUsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHRCxHQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUIsUUFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDcEQsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUV4Qjs7OztBQUlHO0FBQ0gsUUFBQSxJQUFJLEtBQWtCLENBQUM7QUFDdkIsUUFBQSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsTUFBVztBQUNqQyxZQUFBLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDZixZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDdkI7QUFDRCxZQUFBLEtBQUssR0FBR0UsWUFBVSxDQUFDLE1BQUs7Z0JBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksV0FBVyxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM5RixhQUFDLEVBQUUsSUFBSSxDQUFDLGVBQWUsSUFBQSxFQUFBLHFDQUFrQyxDQUFDO0FBQzlELFNBQUMsQ0FBQztRQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztLQUN2RDs7OztBQU1ELElBQUEsV0FBVyxJQUFJLEdBQUE7QUFDWCxRQUFBLE9BQU8sK0JBQStCLENBQUM7S0FDMUM7O0FBR0QsSUFBQSxPQUFPLFVBQVUsR0FBQTtRQUNiLE1BQU0sT0FBTyxHQUFHLENBQUMsTUFBbUIsRUFBRSxHQUFnQixFQUFFLE9BQTJCLEtBQW1CO1lBQ2xHLE9BQU8sSUFBSSxlQUFlLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNyRCxTQUFDLENBQUM7O0FBRUYsUUFBQSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFO0FBQzdCLFlBQUEsSUFBSSxFQUFFO0FBQ0YsZ0JBQUEsWUFBWSxFQUFFLEtBQUs7QUFDbkIsZ0JBQUEsUUFBUSxFQUFFLEtBQUs7QUFDZixnQkFBQSxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxJQUFJO0FBQzlCLGFBQUE7QUFDSixTQUFBLENBQUMsQ0FBQztBQUNILFFBQUEsT0FBTyxPQUE4QixDQUFDO0tBQ3pDOzs7O0FBTUQsSUFBQSxJQUFJLElBQUksR0FBQTtRQUNKLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQztLQUMvQjs7QUFHRCxJQUFBLElBQUksR0FBRyxHQUFBO0FBQ0gsUUFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7S0FDcEM7O0FBR0QsSUFBQSxJQUFJLE1BQU0sR0FBQTtRQUNOLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDMUU7O0lBR0QsRUFBRSxDQUFDLElBQTZCLEVBQUUsUUFBMEIsRUFBQTtRQUN4RCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBbUIsSUFBSSxFQUFFLFFBQTJCLENBQUMsQ0FBQztLQUN6RTs7SUFHRCxHQUFHLENBQUMsSUFBNkIsRUFBRSxRQUEwQixFQUFBO1FBQ3pELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFtQixJQUFJLEVBQUUsUUFBMkIsQ0FBQyxDQUFDO0tBQzFFOztBQUdELElBQUEsUUFBUSxDQUFDLEdBQVcsRUFBRSxPQUFpQixFQUFFLElBQWEsRUFBQTtRQUNsRCxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFO0FBQ25DLFlBQUEsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDNUI7QUFDRCxRQUFBLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFHO1lBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO0FBQ3hILFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsU0FBUyxFQUFFLE1BQUs7QUFDL0QsZ0JBQUEsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUM7QUFDakMsZ0JBQUEsT0FBTyxFQUFFLENBQUM7QUFDZCxhQUFDLENBQUMsQ0FBQztBQUNQLFNBQUMsQ0FBQyxDQUFDO0tBQ047O0lBR0QsTUFBTSxHQUFBOztLQUVMOztJQUdELE9BQU8sR0FBQTtBQUNILFFBQUEsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBMEIsR0FBSSxJQUFJLENBQUMsV0FBNkIsR0FBRyxJQUFJLENBQUM7S0FDakY7QUFDSjs7QUM1R0Q7QUFDQSxNQUFNLFlBQVksR0FBaUM7QUFDL0MsSUFBQSxlQUFlLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRTtBQUM3QyxJQUFBLGdCQUFnQixFQUFFLEtBQUs7QUFDdkIsSUFBQSxxQkFBcUIsRUFBRSxJQUFJO0FBQzNCLElBQUEsd0JBQXdCLEVBQUUsR0FBRztBQUM3QixJQUFBLHFCQUFxQixFQUFFLEdBQUc7QUFDMUIsSUFBQSxnQkFBZ0IsRUFBRSxDQUFDO0FBQ25CLElBQUEsZ0JBQWdCLEVBQUUsQ0FBQztBQUNuQixJQUFBLGVBQWUsRUFBRSxJQUFJO0FBQ3JCLElBQUEsaUJBQWlCLEVBQUUsQ0FBQztBQUNwQixJQUFBLFNBQVMsRUFBRSxNQUFNO0FBQ2pCLElBQUEsV0FBVyxFQUFFLEtBQUs7QUFDbEIsSUFBQSx3QkFBd0IsRUFBRSxJQUFJO0FBQzlCLElBQUEseUJBQXlCLEVBQUUsS0FBSztDQUNuQyxDQUFDO0FBRUY7QUFDQSxNQUFNLFNBQVMsR0FBR0YsR0FBQyxFQUFTLENBQUM7QUFFN0I7QUFDQSxTQUFTLE1BQU0sQ0FBSSxDQUFnQixFQUFBO0FBQy9CLElBQUEsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO0FBQ1gsUUFBQSxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsd0NBQXdDLENBQUMsQ0FBQztLQUMxRTtBQUNMLENBQUM7QUFFRDtBQUNBLFNBQVMsZUFBZSxDQUFDLEdBQVEsRUFBQTtJQUM3QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3hDLElBQUksUUFBUSxLQUFLLFNBQVMsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO0FBQ25ELFFBQUEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDakM7QUFDRCxJQUFBLE9BQU8sR0FBRyxDQUFDO0FBQ2YsQ0FBQztBQUVEO0FBQ0EsU0FBUyxlQUFlLENBQUMsS0FBVSxFQUFFLFFBQWdCLEVBQUE7SUFDakQsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFJLENBQUEsRUFBQSxRQUFRLENBQUUsQ0FBQSxDQUFDLENBQUM7O0FBRXRDLElBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtBQUNsQixRQUFBLElBQUksR0FBR0EsR0FBQyxDQUFDLGVBQWUsUUFBUSxDQUFBLFFBQUEsQ0FBVSxDQUFDLENBQUM7QUFDNUMsUUFBQSxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3RCO0FBQ0QsSUFBQSxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBU0Q7QUFFQTs7OztBQUlHO01BQ1UsUUFBUSxDQUFBO0FBQ1QsSUFBQSxNQUFNLENBQU07QUFDWixJQUFBLEtBQUssQ0FBTTtJQUNYLFVBQVUsR0FBRyxDQUFDLENBQUM7QUFDZixJQUFBLFNBQVMsQ0FBNEI7O0lBR3JDLE9BQU8sR0FBRyxJQUFJLENBQUM7O0FBR04sSUFBQSxTQUFTLENBQStCOztBQUV4QyxJQUFBLG1CQUFtQixDQUF1Qjs7QUFFMUMsSUFBQSx1QkFBdUIsQ0FBdUI7O0lBRXZELFdBQVcsR0FBRyxDQUFDLENBQUM7O0lBRVAsTUFBTSxHQUFrQixFQUFFLENBQUM7O0lBRTNCLE1BQU0sR0FBa0IsRUFBRSxDQUFDOztBQUczQixJQUFBLHNCQUFzQixHQUFHO0FBQ3RDLFFBQUEsS0FBSyxFQUFFLENBQUM7QUFDUixRQUFBLElBQUksRUFBRSxDQUFDO0FBQ1AsUUFBQSxFQUFFLEVBQUUsQ0FBQztRQUNMLEdBQUcsRUFBRSxDQUFDO0tBQ1QsQ0FBQzs7SUFHZSxPQUFPLEdBQThDLEVBQUUsQ0FBQzs7QUFHekUsSUFBQSxXQUFBLENBQVksT0FBNEIsRUFBQTtRQUNwQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0FBQ3JDLFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFFMUQsUUFBQSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsTUFBSztZQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkMsU0FBQyxDQUFDO0FBQ0YsUUFBQSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsTUFBVztZQUN0QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDM0MsU0FBQyxDQUFDO0tBQ0w7Ozs7SUFNTSxVQUFVLENBQUMsS0FBVSxFQUFFLE1BQWMsRUFBQTs7QUFFeEMsUUFBQSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNsQjtBQUVELFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDckMsUUFBQSxJQUFJLENBQUMsS0FBSyxHQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUUxRSxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQ3ZDLFFBQUEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztLQUMvQjs7SUFHTSxPQUFPLEdBQUE7UUFDVixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztBQUM5QixRQUFBLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUM7QUFDMUIsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hDOztBQUdNLElBQUEsYUFBYSxDQUFDLE1BQWMsRUFBQTtBQUMvQixRQUFBLElBQUksTUFBTSxJQUFJLENBQUMsRUFBRTtBQUNiLFlBQUEsTUFBTSxVQUFVLENBQ1osV0FBVyxDQUFDLCtCQUErQixFQUMzQyxDQUFHLEVBQUEsWUFBWSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsQ0FBQyxpQkFBaUIsTUFBTSxDQUFBLENBQUEsQ0FBRyxDQUN6RixDQUFDO1NBQ0w7QUFDRCxRQUFBLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDO0FBQzFCLFFBQUEsSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQztLQUM1Qjs7SUFHTSxNQUFNLGNBQWMsQ0FBQyxNQUFlLEVBQUE7QUFDdkMsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUN0QixRQUFBLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7S0FDcEM7O0FBR0QsSUFBQSxJQUFJLE1BQU0sR0FBQTtRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztLQUN2Qjs7QUFHTSxJQUFBLE1BQU0sbUJBQW1CLEdBQUE7QUFDNUIsUUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRXZCLFFBQUEsTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sRUFBRSx5QkFBeUIsRUFBRSxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBRWxFLFFBQUEsTUFBTSxZQUFZLEdBQUcsQ0FBQyxPQUFZLEtBQVU7WUFDeEMsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVELFlBQUEsSUFBSSxNQUFNLEtBQUssVUFBVSxFQUFFO2dCQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFpQixjQUFBLEVBQUEsTUFBTSxDQUFNLElBQUEsQ0FBQSxDQUFDLENBQUM7YUFDM0Q7QUFDTCxTQUFDLENBQUM7QUFFRixRQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNkLFlBQUEsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN6RSxZQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUN4RCxJQUFJLFdBQVcsRUFBRTtBQUNiLGdCQUFBLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3RDO1NBQ0o7YUFBTTtBQUNILFlBQUEsTUFBTSxJQUFJLEdBQUcsV0FBVyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDbEUsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3RCO0tBQ0o7Ozs7QUFNRCxJQUFBLElBQUksVUFBVSxHQUFBO1FBQ1YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0tBQ3JCOztBQUdELElBQUEsSUFBSSxlQUFlLEdBQUE7QUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7S0FDbEQ7O0FBR0QsSUFBQSxJQUFJLE9BQU8sR0FBQTtRQUNQLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUN6Qjs7QUFHRCxJQUFBLHFCQUFxQixDQUFDLEtBQWEsRUFBQTtBQUMvQixRQUFBLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDbkIsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDOztBQUVyQyxZQUFBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUU7QUFDckIsZ0JBQUEsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7YUFDdkI7WUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDdEM7S0FDSjs7QUFHRCxJQUFBLGNBQWMsQ0FBQyxJQUFZLEVBQUE7QUFDdkIsUUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQ3hCLFFBQUEsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM5QyxZQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDUCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ2xDLGdCQUFBLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2FBQ2hEO2lCQUFNO0FBQ0gsZ0JBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDcEIsZ0JBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7YUFDeEI7U0FDSjtLQUNKOztJQUdELG1CQUFtQixHQUFBO0FBQ2YsUUFBQSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQSxFQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFBLENBQUUsQ0FBQyxDQUFDO0tBQzVEOzs7O0FBTUQsSUFBQSxJQUFJLGFBQWEsR0FBQTtBQUNiLFFBQUEsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUMzQjs7QUFHRCxJQUFBLE9BQU8sQ0FBQyxNQUFjLEVBQUUsV0FBcUMsRUFBRSxJQUFtQixFQUFFLFFBQWlCLEVBQUE7UUFDakcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDekY7O0lBR0QsUUFBUSxDQUFDLElBQWlDLEVBQUUsUUFBaUIsRUFBQTtBQUN6RCxRQUFBLE1BQU0sS0FBSyxHQUFrQixLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pFLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztRQUNwQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFFcEIsUUFBQSxJQUFJLElBQUksSUFBSSxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsUUFBUSxFQUFFO0FBQ25ELFlBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1NBQ2pDO1FBRUQsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDakMsT0FBTyxHQUFHLElBQUksQ0FBQztTQUNsQjs7QUFHRCxRQUFBLEtBQUssTUFBTSxFQUFFLElBQUksS0FBSyxFQUFFO0FBQ3BCLFlBQUEsV0FBVyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7U0FDNUI7QUFDRCxRQUFBLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQzs7QUFHeEMsUUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7O1FBRzFDLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDVixZQUFBLElBQUksQ0FBQyxLQUFLLFFBQVEsRUFBRTtnQkFDaEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2FBQ3BCO0FBQU0saUJBQUEsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFO0FBQ3BELGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDdkQ7U0FDSjs7QUFHRCxRQUFBLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDakM7QUFLRCxJQUFBLFVBQVUsQ0FBQyxLQUF3QixFQUFFLElBQWEsRUFBRSxJQUFhLEVBQUE7QUFDN0QsUUFBQSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDdEIsWUFBQSxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3pDO2FBQU07WUFDSCxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNuRDtLQUNKOztJQUdPLHdCQUF3QixDQUFDLE9BQWlCLEVBQUUsS0FBYSxFQUFBO1FBQzdELE1BQU0sT0FBTyxHQUFrQixFQUFFLENBQUM7UUFDbEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBRXZCLFFBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7WUFDdkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM5QixZQUFBLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDOztZQUVyQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDbEIsWUFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3RCOztBQUVELFFBQUEsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QixLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsRUFBRTtBQUN4RCxZQUFBLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7QUFDL0IsWUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztBQUN6QyxZQUFBLFVBQVUsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUM7U0FDbkM7QUFFRCxRQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDO0tBQ3pDOztBQUdPLElBQUEsNkJBQTZCLENBQUMsT0FBMkIsRUFBRSxLQUFhLEVBQUUsYUFBeUIsRUFBQTtRQUN2RyxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsR0FBRyxPQUFPLENBQUM7O1FBRy9DLElBQUksVUFBVSxFQUFFO0FBQ1osWUFBQSxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEM7O0FBR0QsUUFBQSxhQUFhLEVBQUUsQ0FBQzs7QUFHaEIsUUFBQSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7UUFFbkMsVUFBVSxDQUFDLE1BQUs7QUFDWixZQUFBLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO2dCQUN4QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7YUFDckI7U0FDSixFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ2I7O0FBR08sSUFBQSx1QkFBdUIsQ0FBQyxLQUFhLEVBQUUsSUFBd0IsRUFBRSxLQUF5QixFQUFBO0FBQzlGLFFBQUEsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUM7QUFDakIsUUFBQSxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztBQUVuQixRQUFBLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxFQUFFO0FBQ2hELFlBQUEsTUFBTSxVQUFVLENBQ1osV0FBVyxDQUFDLCtCQUErQixFQUMzQyxDQUFHLEVBQUEsWUFBWSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsQ0FBQyxrQ0FBa0MsS0FBSyxDQUFBLENBQUEsQ0FBRyxDQUN6RyxDQUFDO1NBQ0w7O1FBR0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7O1FBRzlELElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQUs7O1lBRXBELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxFQUFFO0FBQ3RDLGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUNoRDs7WUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7O0FBRWhDLFlBQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvQixTQUFDLENBQUMsQ0FBQztLQUNOOztJQUdPLG1CQUFtQixDQUFDLE9BQWlCLEVBQUUsS0FBYyxFQUFBO0FBQ3pELFFBQUEsS0FBSyxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUM7QUFDbkIsUUFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFFdEMsUUFBQSxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRTtBQUN6QixZQUFBLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLEVBQUU7QUFDekMsZ0JBQUEsTUFBTSxVQUFVLENBQ1osV0FBVyxDQUFDLCtCQUErQixFQUMzQyxDQUFHLEVBQUEsWUFBWSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsQ0FBQyxrQ0FBa0MsS0FBSyxDQUFBLENBQUEsQ0FBRyxDQUN6RyxDQUFDO2FBQ0w7U0FDSjs7UUFHRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDOztRQUc5RCxJQUFJLENBQUMsNkJBQTZCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFLO0FBQ3BELFlBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7O2dCQUV2QixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRTtBQUNwQyxvQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQzlDOztnQkFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDOUI7O1lBRUQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDMUMsWUFBQSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQy9CLFNBQUMsQ0FBQyxDQUFDO0tBQ047O0FBR08sSUFBQSx3QkFBd0IsQ0FBQyxLQUFhLEVBQUE7QUFDMUMsUUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsUUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFLO1lBQzFCLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN4QixTQUFDLENBQUMsQ0FBQztRQUNILHNCQUFzQixDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0tBQ3ZEOztBQUdELElBQUEsV0FBVyxDQUFDLE1BQXNCLEVBQUE7QUFDOUIsUUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQztBQUVqQyxRQUFBLE1BQU0sTUFBTSxHQUFHLENBQUMsT0FBWSxLQUFZO1lBQ3BDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRTtnQkFDL0MsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQzthQUN4RDtBQUFNLGlCQUFBLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtBQUMxRSxnQkFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7QUFDdEQsZ0JBQUEsT0FBTyxHQUFHLENBQUM7YUFDZDtpQkFBTTtBQUNILGdCQUFBLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2FBQ25DO0FBQ0wsU0FBQyxDQUFDO1FBRUYsTUFBTSxLQUFLLEdBQUcsTUFBTSxZQUFZLEtBQUssR0FBRyxNQUFNLENBQUNBLEdBQUMsQ0FBQyxNQUFNLENBQUMsTUFBcUIsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRWpHLFFBQUEsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ3JCLFlBQUEsTUFBTSxVQUFVLENBQ1osV0FBVyxDQUFDLCtCQUErQixFQUMzQyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQSxvQkFBQSxFQUF1QixPQUFPLE1BQU0sQ0FBQSxDQUFBLENBQUcsQ0FDdEcsQ0FBQztTQUNMO2FBQU0sSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksS0FBSyxFQUFFO0FBQzVDLFlBQUEsTUFBTSxVQUFVLENBQ1osV0FBVyxDQUFDLCtCQUErQixFQUMzQyxDQUFHLEVBQUEsWUFBWSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsQ0FBQyxrQ0FBa0MsS0FBSyxDQUFBLENBQUEsQ0FBRyxDQUN6RyxDQUFDO1NBQ0w7QUFFRCxRQUFBLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQztLQUM3Qjs7SUFHRCxPQUFPLEdBQUE7UUFDSCxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsc0JBQXNCLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFbkUsTUFBTSxPQUFPLEdBQXVELEVBQUUsQ0FBQztBQUN2RSxRQUFBLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzdDLE1BQU0saUJBQWlCLEdBQWEsRUFBRSxDQUFDO0FBRXZDLFFBQUEsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEtBQWEsS0FBVTtBQUMvQyxZQUFBLElBQUksS0FBSyxLQUFLLGdCQUFnQixFQUFFO0FBQzVCLGdCQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxVQUFVLENBQUM7QUFDNUIsZ0JBQUEsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2pDO0FBQU0saUJBQUEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtBQUN6RSxnQkFBQSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsVUFBVSxDQUFDO2FBQy9CO0FBQU0saUJBQUEsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLEVBQUU7QUFDbkMsZ0JBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQzthQUMzQjtpQkFBTTtBQUNILGdCQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxZQUFZLENBQUM7YUFDakM7O0FBRUQsWUFBQSxJQUFJLGdCQUFnQixHQUFHLENBQUMsS0FBSyxLQUFLLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxLQUFLLEtBQUssRUFBRTtBQUNsRSxnQkFBQSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDakM7QUFDTCxTQUFDLENBQUM7O0FBR0YsUUFBQSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0FBQ3BCLFlBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUVEO1lBQ0ksTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQztBQUM1RSxZQUFBLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixHQUFHLFdBQVcsQ0FBQztBQUNsRCxZQUFBLE1BQU0sUUFBUSxHQUFHLGdCQUFnQixHQUFHLFdBQVcsQ0FBQztBQUVoRCxZQUFBLElBQUksWUFBWSxHQUFHLENBQUMsRUFBRSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZDLFlBQUEsS0FBSyxJQUFJLFNBQVMsR0FBRyxVQUFVLEVBQUUsU0FBUyxJQUFJLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRTtBQUNqRSxnQkFBQSxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUU7QUFDZixvQkFBQSxZQUFZLEVBQUUsQ0FBQztvQkFDZixTQUFTO2lCQUNaO0FBQ0QsZ0JBQUEsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLFNBQVMsRUFBRTtBQUM1QixvQkFBQSxZQUFZLEVBQUUsQ0FBQztvQkFDZixTQUFTO2lCQUNaO2dCQUNELGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ2pDO0FBRUQsWUFBQSxJQUFJLENBQUMsR0FBRyxZQUFZLEVBQUU7Z0JBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsR0FBRyxnQkFBZ0IsR0FBRyxXQUFXLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUU7QUFDaEcsb0JBQUEsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLFNBQVMsRUFBRTt3QkFDNUIsTUFBTTtxQkFDVDtvQkFDRCxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDakM7YUFDSjtBQUVELFlBQUEsSUFBSSxDQUFDLEdBQUcsWUFBWSxFQUFFO2dCQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxTQUFTLEdBQUcsZ0JBQWdCLEdBQUcsV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFO0FBQ2hHLG9CQUFBLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRTt3QkFDZixNQUFNO3FCQUNUO29CQUNELGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2lCQUNqQzthQUNKO1NBQ0o7O0FBR0QsUUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLFVBQVUsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbEUsSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2FBQ3JCO1NBQ0o7O1FBR0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLENBQUMsRUFBRTtZQUMvRCxLQUFLLElBQUksQ0FBQyxNQUFLO2dCQUNYLElBQUksQ0FBQyxhQUFhLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDO0FBQ2xELGFBQUMsQ0FBQyxDQUFDO1NBQ047O1FBR0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ3BDLFlBQUEsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzFCLFlBQUEsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzlCLEtBQUssSUFBSSxDQUFDLE1BQUs7QUFDWCxnQkFBQSxJQUFJLENBQUMsYUFBYSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ3RELGFBQUMsQ0FBQyxDQUFDO1NBQ047O0FBR0QsUUFBQSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVwQyxRQUFBLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzdDLHNCQUFzQixDQUFDLElBQUksR0FBSSxXQUFXLEVBQUUsWUFBWSxFQUFFLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQztRQUN2RSxzQkFBc0IsQ0FBQyxFQUFFLEdBQU0sV0FBVyxFQUFFLFdBQVcsRUFBRSxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUM7QUFDdEUsUUFBQSxzQkFBc0IsQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUM7QUFFaEQsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNmOztJQUdELE1BQU0sR0FBQTtBQUNGLFFBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNmLFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjs7SUFHRCxPQUFPLEdBQUE7UUFDSCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNmLFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjs7SUFHRCxPQUFPLEdBQUE7QUFDSCxRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM1QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7U0FDckI7QUFDRCxRQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUN2QixRQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUN2QixRQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLFFBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckIsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNmOzs7O0FBTUQsSUFBQSxJQUFJLFlBQVksR0FBQTtBQUNaLFFBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQztLQUMvQjs7QUFHRCxJQUFBLElBQUksU0FBUyxHQUFBO0FBQ1QsUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztLQUNuQzs7QUFHRCxJQUFBLElBQUksWUFBWSxHQUFBO0FBQ1osUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQztLQUN0Qzs7SUFHRCxnQkFBZ0IsQ0FBQyxPQUF5QixFQUFFLE1BQW9CLEVBQUE7UUFDNUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDL0M7O0lBR0Qsb0JBQW9CLENBQUMsT0FBeUIsRUFBRSxNQUFvQixFQUFBO1FBQ2hFLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ25EOztBQUdELElBQUEsTUFBTSxRQUFRLENBQUMsR0FBVyxFQUFFLE9BQWlCLEVBQUUsSUFBYSxFQUFBO0FBQ3hELFFBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN2QixRQUFBLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtBQUNULFlBQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsR0FBRyxDQUFBLENBQUEsQ0FBRyxDQUFDLENBQUM7WUFDM0QsR0FBRyxHQUFHLENBQUMsQ0FBQztTQUNYO2FBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUU7QUFDcEMsWUFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxHQUFHLENBQUEsQ0FBQSxDQUFHLENBQUMsQ0FBQztBQUN6RCxZQUFBLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztTQUMvQjs7QUFFRCxRQUFBLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ3RDLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO0FBQzVCLFlBQUEsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3JEO0tBQ0o7O0FBR0QsSUFBQSxNQUFNLGFBQWEsQ0FBQyxLQUFhLEVBQUUsT0FBa0MsRUFBQTtRQUNqRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTNELE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxLQUFLLEVBQUU7QUFDckMsWUFBQSxNQUFNLFVBQVUsQ0FDWixXQUFXLENBQUMsK0JBQStCLEVBQzNDLENBQUcsRUFBQSxZQUFZLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLG9DQUFvQyxLQUFLLENBQUEsQ0FBQSxDQUFHLENBQzNHLENBQUM7U0FDTDtBQUVELFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ2pFLFlBQUEsU0FBUyxFQUFFLElBQUk7QUFDZixZQUFBLE1BQU0sRUFBRSxLQUFLO1lBQ2IsT0FBTyxFQUFFLFNBQVMsQ0FBQyxlQUFlO1lBQ2xDLElBQUksRUFBRSxTQUFTLENBQUMsaUJBQWlCO0FBQ2pDLFlBQUEsUUFBUSxFQUFFLElBQUk7U0FDakIsRUFBRSxPQUFPLENBQXVDLENBQUM7QUFFbEQsUUFBQSxNQUFNLFlBQVksR0FBRztZQUNqQixJQUFJLEVBQUUsU0FBUyxDQUFDLEdBQUc7QUFDbkIsWUFBQSxFQUFFLEVBQUUsU0FBUyxDQUFDLEdBQUcsR0FBRyxXQUFXO1NBQ2xDLENBQUM7QUFFRixRQUFBLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUU3QixRQUFBLE1BQU0sV0FBVyxHQUFHO1lBQ2hCLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTTtBQUNuQixZQUFBLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNO1NBQ3BDLENBQUM7UUFFRixNQUFNLFNBQVMsR0FBRyxNQUFjO1lBQzVCLElBQUksU0FBUyxFQUFFO2dCQUNYLElBQUksV0FBVyxDQUFDLElBQUksSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFO0FBQ3ZDLG9CQUFBLE9BQU8sWUFBWSxDQUFDLElBQUksSUFBSSxXQUFXLENBQUMsRUFBRSxDQUFDO2lCQUM5QztxQkFBTTtBQUNILG9CQUFBLE9BQU8sV0FBVyxDQUFDLElBQUksSUFBSSxZQUFZLENBQUMsRUFBRSxDQUFDO2lCQUM5QzthQUNKO2lCQUFNO0FBQ0gsZ0JBQUEsT0FBTyxZQUFZLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFDLEVBQUUsSUFBSSxZQUFZLENBQUMsRUFBRSxDQUFDO2FBQ3JGO0FBQ0wsU0FBQyxDQUFDO1FBRUYsTUFBTSxjQUFjLEdBQUcsTUFBYTtBQUNoQyxZQUFBLE9BQU8sV0FBVyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsSUFBSTtrQkFDckMsV0FBVyxDQUFDLElBQUk7a0JBQ2hCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU07QUFDbEMsYUFBQTtBQUNMLFNBQUMsQ0FBQztBQUVGLFFBQUEsSUFBSSxHQUFXLENBQUM7UUFDaEIsSUFBSSxNQUFNLEVBQUU7QUFDUixZQUFBLEdBQUcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO1NBQzFCO2FBQU0sSUFBSSxTQUFTLEVBQUUsRUFBRTtBQUNwQixZQUFBLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDeEIsWUFBQSxPQUFPO1NBQ1Y7YUFBTTtZQUNILEdBQUcsR0FBRyxjQUFjLEVBQUUsQ0FBQztTQUMxQjtRQUVELE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNqQjs7OztBQU1ELElBQUEsTUFBTSxDQUFDLEdBQVcsRUFBQTtBQUNkLFFBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDM0MsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNmOztJQUdELE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBZ0IsRUFBQTtRQUNqQyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzNCLFlBQUEsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFDRCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUN4QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDbEI7QUFFRCxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2QyxJQUFJLE9BQU8sRUFBRTtZQUNULElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNsQjtBQUVELFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjs7QUFHRCxJQUFBLFNBQVMsQ0FBQyxHQUFXLEVBQUE7UUFDakIsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNwQzs7QUFHRCxJQUFBLFdBQVcsQ0FBQyxHQUFZLEVBQUE7QUFDcEIsUUFBQSxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUU7QUFDYixZQUFBLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDekMsZ0JBQUEsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzVCO0FBQ0QsWUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO2FBQU0sSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUNsQyxZQUFBLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QixZQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7YUFBTTtBQUNILFlBQUEsT0FBTyxLQUFLLENBQUM7U0FDaEI7S0FDSjs7QUFHRCxJQUFBLGFBQWEsQ0FBQyxHQUFXLEVBQUE7QUFDckIsUUFBQSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDNUI7O0lBR0QsYUFBYSxDQUFDLEdBQVcsRUFBRSxJQUErQixFQUFBO1FBQ3RELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDM0IsWUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUN6QixZQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7QUFDRCxRQUFBLE9BQU8sS0FBSyxDQUFDO0tBQ2hCOzs7O0FBTUQsSUFBQSxJQUFZLE9BQU8sR0FBQTtRQUNmLE9BQU8sb0JBQW9CLEVBQUUsQ0FBQztLQUNqQzs7SUFHTyxvQkFBb0IsR0FBQTtRQUN4QixJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0tBQ2xFOztJQUdPLHNCQUFzQixHQUFBO1FBQzFCLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7S0FDM0Q7O0lBR08sY0FBYyxHQUFBO0FBQ2xCLFFBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2xGOztJQUdPLFlBQVksR0FBQTtRQUNoQixNQUFNLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDaEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRWxCLE1BQU0sRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxTQUFTLENBQUM7QUFFM0QsUUFBQSxNQUFNLGFBQWEsR0FBRyxDQUFDLE1BQUs7QUFDeEIsWUFBQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDcEMsWUFBQSxPQUFPLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO1NBQ3JFLEdBQUcsQ0FBQztBQUVMLFFBQUEsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFLO1lBQ2QsSUFBSSxDQUFDLEtBQUssWUFBWSxJQUFJLFlBQVksSUFBSSxXQUFXLEVBQUU7QUFDbkQsZ0JBQUEsT0FBTyxDQUFDLENBQUM7YUFDWjtpQkFBTTtBQUNILGdCQUFBLE9BQU8sU0FBUyxHQUFHLGFBQWEsR0FBRyxZQUFZLENBQUM7YUFDbkQ7U0FDSixHQUFHLENBQUM7QUFFTCxRQUFBLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBNkIsS0FBYTtBQUMxRCxZQUFBLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtBQUNkLGdCQUFBLE9BQU8sS0FBSyxDQUFDO2FBQ2hCO0FBQU0saUJBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQy9ELGdCQUFBLE9BQU8sSUFBSSxDQUFDO2FBQ2Y7aUJBQU07QUFDSCxnQkFBQSxPQUFPLEtBQUssQ0FBQzthQUNoQjtBQUNMLFNBQUMsQ0FBQztRQUVGLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLFNBQVMsRUFBRTtBQUMvQyxZQUFBLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztTQUNqQztBQUVELFFBQUEsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdCLFFBQUEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ3JCO0FBQU0sYUFBQSxJQUFJLEdBQUcsR0FBRyxJQUFJLEVBQUUsTUFBTSxFQUFFO0FBQzNCLFlBQUEsS0FBSyxJQUFJLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDckMsZ0JBQUEsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQixnQkFBQSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDbEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO2lCQUNyQjthQUNKO1NBQ0o7YUFBTTtZQUNILEtBQUssSUFBSSxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3ZELGdCQUFBLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakIsZ0JBQUEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2xCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztpQkFDckI7YUFDSjtTQUNKO1FBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUF1QyxvQ0FBQSxFQUFBLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBQ3pFLFFBQUEsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ3pDOztJQUdPLFdBQVcsR0FBQTtRQUNmLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO0FBQ3hCLFlBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzlDO2FBQU07QUFDSCxZQUFBLE9BQU8sU0FBUyxDQUFDO1NBQ3BCO0tBQ0o7O0FBR08sSUFBQSxRQUFRLENBQUMsR0FBVyxFQUFBO0FBQ3hCLFFBQUEsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtBQUN4QyxZQUFBLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDOztBQUU3QyxZQUFBLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLEVBQUU7Z0JBQ3hGLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssS0FBSyxnQkFBZ0IsRUFBRTtvQkFDeEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2lCQUNsQjthQUNKO0FBQ0QsWUFBQSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztTQUN6QztLQUNKOztBQUdPLElBQUEsWUFBWSxDQUFDLEdBQVcsRUFBQTtBQUM1QixRQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7QUFDeEMsWUFBQSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3QyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEtBQUssZ0JBQWdCLEVBQUU7Z0JBQ3hELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUNsQjtBQUNELFlBQUEsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7U0FDekM7S0FDSjs7QUFHTyxJQUFBLFVBQVUsQ0FBQyxJQUFhLEVBQUE7QUFDNUIsUUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJCLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDeEQsUUFBQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDcEMsTUFBTSxhQUFhLEdBQUcsUUFBUSxFQUFFLFdBQVcsRUFBRSxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDMUQsTUFBTSxZQUFZLEdBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVsRCxJQUFJLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDeEIsUUFBQSxJQUFJLElBQUksSUFBSSxRQUFRLEVBQUU7QUFDbEIsWUFBQSxRQUFRLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztBQUM3QixZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDekI7QUFFRCxRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksWUFBWSxFQUFFO0FBQzdCLFlBQUEsSUFBSSxXQUFXLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDaEMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3JCLGdCQUFBLE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7Z0JBQ25DLE9BQU8sQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO2dCQUNuRCxRQUFRLEdBQUcsT0FBTyxDQUFDO0FBQ25CLGdCQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDekI7QUFDRCxZQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztBQUNoQyxZQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdkI7UUFFRCxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFckIsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDO0tBQ3ZCOztBQUdPLElBQUEsU0FBUyxDQUFDLElBQWEsRUFBQTtRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDakM7O0lBR08sa0JBQWtCLEdBQUE7UUFDdEIsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQzVDLFFBQUEsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQy9CLFFBQUEsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFJLENBQUEsRUFBQSxPQUFPLENBQUMsY0FBYyxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBRTlELFFBQUEsSUFBSSxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtBQUMxQixZQUFBLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQzdDLFlBQUEsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFvQixLQUFJO0FBQy9FLGdCQUFBLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQ0EsR0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztBQUNuRSxnQkFBQSxJQUFJLGdCQUFnQixHQUFHLENBQUMsSUFBSSxTQUFTLElBQUksU0FBUyxJQUFJLGdCQUFnQixHQUFHLENBQUMsRUFBRTtBQUN4RSxvQkFBQSxPQUFPLElBQUksQ0FBQztpQkFDZjtxQkFBTTtBQUNILG9CQUFBLE9BQU8sS0FBSyxDQUFDO2lCQUNoQjtBQUNMLGFBQUMsQ0FBQyxDQUFDO0FBQ0gsWUFBQSxZQUFZLEdBQUdBLEdBQUMsQ0FBQyxDQUFBLGdCQUFBLEVBQW1CLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQSxDQUFBLEVBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQSxZQUFBLENBQWMsQ0FBQztpQkFDaEcsTUFBTSxDQUFDLGNBQWMsQ0FBQztpQkFDdEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hCLFlBQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM3QixZQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ2hDO0FBRUQsUUFBQSxPQUFPLFlBQVksQ0FBQztLQUN2QjtBQUNKOztBQ242QkQsaUJBQWlCLE1BQU1DLGFBQVcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFrQjFEOzs7QUFHRztBQUNHLE1BQWdCLFFBQ2xCLFNBQVEsSUFBc0IsQ0FBQTs7SUFHYixDQUFDQSxhQUFXLEVBQWE7O0FBRzFDLElBQUEsV0FBQSxDQUFZLE9BQTRDLEVBQUE7UUFDcEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWQsSUFBSSxDQUFDQSxhQUFXLENBQXdCLEdBQUc7QUFDeEMsWUFBQSxPQUFPLEVBQUUsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDO1NBQ3JCLENBQUM7QUFFZCxRQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQTRCLENBQUMsQ0FBQztLQUN0RDs7QUFHRCxJQUFBLElBQUksT0FBTyxHQUFBO0FBQ1AsUUFBQSxPQUFPLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDO0tBQ3BDOztBQUdELElBQUEsSUFBSSxPQUFPLEdBQUE7QUFDUCxRQUFBLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7S0FDL0I7QUFRRDs7Ozs7Ozs7QUFRRztBQUNNLElBQUEsVUFBVSxDQUFDLEVBQWtDLEVBQUE7QUFDbEQsUUFBQSxJQUFJLElBQUksQ0FBQ0EsYUFBVyxDQUFDLEVBQUU7WUFDbkIsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUM7QUFDdEMsWUFBQSxNQUFNLEdBQUcsR0FBR0QsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNsQixZQUFBLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBdUIsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztTQUMzRjtBQUNELFFBQUEsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQy9CO0FBRUQ7Ozs7QUFJRztJQUNNLE1BQU0sR0FBQTtRQUNYLElBQUksQ0FBQ0MsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3BDLFFBQUEsT0FBTyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDekI7OztBQUtEOzs7Ozs7O0FBT0c7QUFDSCxJQUFBLElBQUksYUFBYSxHQUFBO1FBQ2IsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7S0FDbEQ7QUFFRDs7Ozs7Ozs7Ozs7Ozs7OztBQWdCRztBQUNILElBQUEsT0FBTyxDQUFDLE1BQWMsRUFBRSxXQUFxQyxFQUFFLElBQW1CLEVBQUUsUUFBaUIsRUFBQTtRQUNqRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDakc7QUFFRDs7Ozs7Ozs7Ozs7QUFXRztJQUNILFFBQVEsQ0FBQyxJQUFpQyxFQUFFLFFBQWlCLEVBQUE7QUFDekQsUUFBQSxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQ3REO0FBK0JELElBQUEsVUFBVSxDQUFDLEtBQXdCLEVBQUUsSUFBYSxFQUFFLElBQWEsRUFBQTtBQUM3RCxRQUFBLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFlLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3JFO0FBRUQ7Ozs7Ozs7QUFPRztBQUNILElBQUEsV0FBVyxDQUFDLE1BQXNCLEVBQUE7UUFDOUIsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDeEQ7QUFFRDs7O0FBR0c7SUFDSCxPQUFPLEdBQUE7UUFDSCxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNwQyxRQUFBLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFFRDs7O0FBR0c7SUFDSCxNQUFNLEdBQUE7UUFDRixJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNuQyxRQUFBLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFFRDs7O0FBR0c7SUFDSCxPQUFPLEdBQUE7UUFDSCxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNwQyxRQUFBLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFFRDs7OztBQUlHO0lBQ00sT0FBTyxHQUFBO1FBQ1osSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDcEMsUUFBQSxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUMxQjs7O0FBS0E7OztBQUdFO0FBQ0gsSUFBQSxJQUFJLFNBQVMsR0FBQTtRQUNULE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0tBQzlDO0FBRUE7OztBQUdHO0FBQ0osSUFBQSxJQUFJLFlBQVksR0FBQTtRQUNaLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO0tBQ2pEO0FBRUE7Ozs7Ozs7Ozs7QUFVRTtJQUNILGdCQUFnQixDQUFDLE9BQXlCLEVBQUUsTUFBb0IsRUFBQTtBQUM1RCxRQUFBLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztLQUMvRDtBQUVEOzs7Ozs7Ozs7O0FBVUc7SUFDSCxvQkFBb0IsQ0FBQyxPQUF5QixFQUFFLE1BQW9CLEVBQUE7QUFDaEUsUUFBQSxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDbkU7QUFFRDs7Ozs7Ozs7Ozs7OztBQWFHO0FBQ0gsSUFBQSxRQUFRLENBQUMsR0FBVyxFQUFFLE9BQWlCLEVBQUUsSUFBYSxFQUFBO0FBQ2xELFFBQUEsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNqRTtBQUVEOzs7Ozs7Ozs7O0FBVUc7SUFDSCxhQUFhLENBQUMsS0FBYSxFQUFFLE9BQWtDLEVBQUE7QUFDM0QsUUFBQSxPQUFPLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDbEU7OztBQUtEOzs7Ozs7Ozs7O0FBVUc7QUFDSCxJQUFBLE1BQU0sQ0FBQyxHQUFXLEVBQUE7UUFDZCxPQUFPLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNoRDtBQUVEOzs7Ozs7Ozs7Ozs7O0FBYUc7QUFDSCxJQUFBLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBTyxHQUFHLElBQUksRUFBQTtBQUMvQixRQUFBLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztLQUMxRDtBQUVEOzs7Ozs7Ozs7O0FBVUc7QUFDSCxJQUFBLFNBQVMsQ0FBQyxHQUFXLEVBQUE7UUFDakIsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDbkQ7QUFFRDs7Ozs7Ozs7OztBQVVHO0FBQ0gsSUFBQSxXQUFXLENBQUMsR0FBWSxFQUFBO1FBQ3BCLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JEO0FBRUQ7Ozs7Ozs7QUFPRztBQUNILElBQUEsYUFBYSxDQUFDLEdBQVcsRUFBQTtRQUNyQixPQUFPLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN2RDtBQUdEOzs7Ozs7Ozs7O0FBVUc7SUFDSCxhQUFhLENBQUMsR0FBVyxFQUFFLElBQW1CLEVBQUE7QUFDMUMsUUFBQSxPQUFPLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBaUMsQ0FBQyxDQUFDO0tBQzFGO0FBQ0o7O0FDeFpELGlCQUFpQixNQUFNQSxhQUFXLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBb0IxRDs7O0FBR0c7QUFDRyxNQUFnQixzQkFDbEIsU0FBUSxZQUE4QixDQUFBOztJQUdyQixDQUFDQSxhQUFXLEVBQWE7O0FBRzFDLElBQUEsV0FBQSxDQUFZLE9BQTRELEVBQUE7UUFDcEUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2YsUUFBQSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDO0FBQ3pCLFFBQUEsSUFBSSxDQUFDQSxhQUFXLENBQXdCLEdBQUcsRUFBRSxLQUFLLEVBQWMsQ0FBQztLQUNyRTs7O0FBS0Q7Ozs7Ozs7QUFPRztBQUNILElBQUEsSUFBYyxVQUFVLEdBQUE7UUFDcEIsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7S0FDN0M7QUFFRDs7O0FBR0c7QUFDSCxJQUFBLElBQWMsV0FBVyxHQUFBO0FBQ3JCLFFBQUEsT0FBUSxJQUFJLENBQUMsS0FBNkIsQ0FBQyxXQUFXLENBQUM7S0FDMUQ7QUFFRDs7O0FBR0c7QUFDSCxJQUFBLElBQWMsWUFBWSxHQUFBO0FBQ3RCLFFBQUEsT0FBUSxJQUFJLENBQUMsS0FBNkIsQ0FBQyxZQUFZLENBQUM7S0FDM0Q7QUFFRDs7O0FBR0c7QUFDSCxJQUFBLElBQWMsV0FBVyxHQUFBO0FBQ3JCLFFBQUEsT0FBUSxJQUFJLENBQUMsS0FBNkIsQ0FBQyxXQUFXLENBQUM7S0FDMUQ7QUFFRDs7Ozs7OztBQU9HO0FBQ0gsSUFBQSxJQUFjLFdBQVcsR0FBQTtRQUNyQixPQUFPLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztLQUM5QztBQUNKOztBQzdFRDs7OztBQUlHO01BQ1UsVUFBVSxDQUFBO0FBS0YsSUFBQSxNQUFNLENBQXlCOztJQUd4QyxVQUFVLEdBQWlDLEVBQUUsQ0FBQzs7SUFFOUMsYUFBYSxHQUFtQixFQUFFLENBQUM7O0lBRzFCLE9BQU8sR0FBaUYsRUFBRSxDQUFDO0FBRTVHOzs7QUFHRztBQUNILElBQUEsV0FBQSxDQUFZLEtBQTZCLEVBQUE7QUFDckMsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztLQUN2Qjs7SUFHTSxPQUFPLEdBQUE7QUFDVixRQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLFFBQUEsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7S0FDM0I7Ozs7QUFNRCxJQUFBLFFBQVEsQ0FBQyxFQUFXLEVBQUE7UUFDaEIsRUFBRSxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDN0IsWUFBQSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDOUI7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ2hELFFBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDNUIsUUFBQSxPQUFPLEtBQUssQ0FBQztLQUNoQjs7QUFHRCxJQUFBLFFBQVEsQ0FBQyxFQUFVLEVBQUE7QUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUM5Qjs7QUFHRCxJQUFBLGdCQUFnQixDQUFDLFFBQXNCLEVBQUE7O0FBRW5DLFFBQUEsSUFBSSxZQUFZLEtBQUssUUFBUSxDQUFDLE1BQU0sRUFBRTs7O1lBR2xDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFPO1NBQ1Y7QUFFRCxRQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDcEUsTUFBTSxRQUFRLEdBQUcsU0FBUyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUV4RCxRQUFBLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2xDLFFBQUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUMvQjs7SUFHRCxZQUFZLEdBQUE7UUFDUixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RDOztBQUdELElBQUEsTUFBTSxTQUFTLEdBQUE7UUFDWCxNQUFNLFNBQVMsR0FBb0IsRUFBRSxDQUFDO0FBQ3RDLFFBQUEsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3BDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7U0FDbEM7QUFDRCxRQUFBLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNoQzs7SUFHRCxNQUFNLFdBQVcsQ0FBQyxLQUFjLEVBQUE7UUFDNUIsTUFBTSxTQUFTLEdBQW9CLEVBQUUsQ0FBQztBQUN0QyxRQUFBLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUNwQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUN6QztBQUNELFFBQUEsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2hDOztBQUdELElBQUEsSUFBSSxXQUFXLEdBQUE7QUFDWCxRQUFBLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUN2Qzs7QUFHRCxJQUFBLElBQUksWUFBWSxHQUFBO0FBQ1osUUFBQSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7S0FDeEM7O0FBR0QsSUFBQSxJQUFJLFdBQVcsR0FBQTtBQUNYLFFBQUEsT0FBTyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUM7S0FDaEQ7Ozs7QUFNRCxJQUFBLFlBQVksQ0FBQyxNQUFjLEVBQUE7QUFDdkIsUUFBQSxPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUMvQjs7QUFHRCxJQUFBLGFBQWEsQ0FBQyxNQUFjLEVBQUE7QUFDeEIsUUFBQSxPQUFPLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUNoQzs7SUFHRCxXQUFXLENBQUksTUFBYyxFQUFFLFFBQThCLEVBQUE7QUFDekQsUUFBQSxPQUFPLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDeEM7O0FBR0QsSUFBQSxVQUFVLENBQUMsTUFBYyxFQUFBO0FBQ3JCLFFBQUEsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDN0I7Ozs7QUFNRCxJQUFBLE1BQU0sQ0FBQyxHQUFXLEVBQUE7QUFDZCxRQUFBLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDekIsUUFBQSxJQUFJLElBQUksSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHO2dCQUNYLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhO2FBQzNCLENBQUM7U0FDTDtBQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjs7SUFHRCxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQWdCLEVBQUE7UUFDakMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN2QyxRQUFBLElBQUksSUFBSSxJQUFJLE1BQU0sRUFBRTtBQUNoQixZQUFBLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBRUQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDL0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ2xCO1FBRUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBR3pDLFFBQUEsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3BDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNuQjs7QUFHRCxRQUFBLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ2pDLFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjs7QUFHRCxJQUFBLFNBQVMsQ0FBQyxHQUFXLEVBQUE7UUFDakIsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNwQzs7QUFHRCxJQUFBLFdBQVcsQ0FBQyxHQUFZLEVBQUE7QUFDcEIsUUFBQSxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUU7QUFDYixZQUFBLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDekMsZ0JBQUEsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzVCO0FBQ0QsWUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO2FBQU0sSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUNsQyxZQUFBLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QixZQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7YUFBTTtBQUNILFlBQUEsT0FBTyxLQUFLLENBQUM7U0FDaEI7S0FDSjs7QUFHRCxJQUFBLGFBQWEsQ0FBQyxHQUFXLEVBQUE7QUFDckIsUUFBQSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDNUI7O0lBR0QsYUFBYSxDQUFDLEdBQVcsRUFBRSxJQUFrRSxFQUFBO0FBQ3pGLFFBQUEsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3RDLFlBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDekIsWUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0FBQ0QsUUFBQSxPQUFPLEtBQUssQ0FBQztLQUNoQjtBQUNKOztBQ3BORCxpQkFBaUIsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBTzFEO0FBRUE7OztBQUdHO0FBQ0csTUFBZ0Isa0JBQ2xCLFNBQVEsUUFBMEIsQ0FBQTs7SUFHakIsQ0FBQyxXQUFXLEVBQWE7O0FBRzFDLElBQUEsV0FBQSxDQUFZLE9BQTRDLEVBQUE7UUFDcEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2QsSUFBSSxDQUFDLFdBQVcsQ0FBd0IsR0FBRztBQUN4QyxZQUFBLE9BQU8sRUFBRSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUM7U0FDcEIsQ0FBQztLQUNqQjs7QUFHRCxJQUFBLElBQUksYUFBYSxHQUFBO0FBQ2IsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUM7S0FDcEM7OztBQUtEOzs7Ozs7O0FBT0c7QUFDSCxJQUFBLFFBQVEsQ0FBQyxFQUFXLEVBQUE7UUFDaEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNqRDtBQUVEOzs7Ozs7O0FBT0c7QUFDSCxJQUFBLFFBQVEsQ0FBQyxFQUFVLEVBQUE7UUFDZixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ2pEO0FBRUQ7Ozs7Ozs7QUFPRztBQUNILElBQUEsZ0JBQWdCLENBQUMsUUFBc0IsRUFBQTtRQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3hEO0FBRUQ7Ozs7O0FBS0c7SUFDSCxZQUFZLEdBQUE7UUFDUixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7S0FDbkQ7QUFFRDs7O0FBR0c7SUFDSCxTQUFTLEdBQUE7UUFDTCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7S0FDaEQ7QUFFRDs7O0FBR0c7QUFDSCxJQUFBLFdBQVcsQ0FBQyxLQUFjLEVBQUE7UUFDdEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN2RDtBQUVEOzs7QUFHRztBQUNILElBQUEsSUFBSSxXQUFXLEdBQUE7UUFDWCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0tBQ2hEO0FBRUQ7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLFlBQVksR0FBQTtRQUNaLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7S0FDakQ7QUFFRDs7O0FBR0c7QUFDSCxJQUFBLElBQUksV0FBVyxHQUFBO1FBQ1gsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztLQUNoRDtBQUVEOzs7Ozs7Ozs7O0FBVUc7QUFDSCxJQUFBLFlBQVksQ0FBQyxNQUFjLEVBQUE7UUFDdkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUN6RDtBQUVEOzs7Ozs7Ozs7O0FBVUc7QUFDSCxJQUFBLGFBQWEsQ0FBQyxNQUFjLEVBQUE7UUFDeEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUMxRDtBQUVEOzs7Ozs7Ozs7Ozs7O0FBYUc7SUFDSCxXQUFXLENBQUksTUFBYyxFQUFFLFFBQThCLEVBQUE7QUFDekQsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztLQUNsRTtBQUVEOzs7Ozs7Ozs7OztBQVdHO0FBQ0gsSUFBQSxVQUFVLENBQUMsTUFBYyxFQUFBO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDdkQ7OztBQUtEOzs7O0FBSUc7SUFDTSxPQUFPLEdBQUE7UUFDWixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNwQyxRQUFBLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFFRDs7Ozs7Ozs7Ozs7QUFXRztBQUNNLElBQUEsTUFBTSxDQUFDLEdBQVcsRUFBQTtRQUN2QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ2hEO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0FBY0c7QUFDTSxJQUFBLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBTyxHQUFHLElBQUksRUFBQTtBQUN4QyxRQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQzFEO0FBRUQ7Ozs7Ozs7Ozs7QUFVRztBQUNNLElBQUEsU0FBUyxDQUFDLEdBQVcsRUFBQTtRQUMxQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ25EO0FBRUQ7Ozs7Ozs7Ozs7QUFVRztBQUNNLElBQUEsV0FBVyxDQUFDLEdBQVksRUFBQTtRQUM3QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JEO0FBRUQ7Ozs7Ozs7QUFPRztBQUNNLElBQUEsYUFBYSxDQUFDLEdBQVcsRUFBQTtRQUM5QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3ZEO0FBR0Q7Ozs7Ozs7Ozs7QUFVRztJQUNNLGFBQWEsQ0FBQyxHQUFXLEVBQUUsSUFBbUIsRUFBQTtBQUNuRCxRQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQW9FLENBQUMsQ0FBQztLQUM3SDtBQUNKOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC91aS1saXN0dmlldy8ifQ==