/*!
 * @cdp/ui-components 0.9.20
 *   ui-componets collection
 */

import { safe, post, noop, dom, makeResult, RESULT_CODE, toHelpString, View, at, luid, statusAddRef, statusRelease, statusScope, isStatusIn, setTimeout as setTimeout$1, clearTimeout } from '@cdp/runtime';

/*!
 * @cdp/ui-utils 0.9.20
 *   UI components common utilities
 */


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
        RESULT_CODE[RESULT_CODE["UI_UTILS_DECLARE"] = 9007199254740991] = "UI_UTILS_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_UI_UTILS_FATAL"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 120 /* LOCAL_CODE_BASE.UI_UTILS */ + 1, 'UI utils something wrong.')] = "ERROR_UI_UTILS_FATAL";
    })();
})();

/** @internal */ const getComputedStyle = safe(globalThis.getComputedStyle);

/**
 * @en CSS vendor prefix string definition.
 * @ja CSS ベンダープリフィックス文字列定義
 */
const cssPrefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
/**
 * @en Get the value of the transform matrix specified in `Element`.
 * @ja `Element` に指定された transform 行列の値を取得
 *
 * @param el
 *  - `en` target `Element` instance
 *  - `ja` 対象 `Element` インスタンス
 */
const getTransformMatrixValues = (el) => {
    const style = getComputedStyle(el);
    const { m11, m22, m33, m41, m42, m43 } = new DOMMatrixReadOnly(style.transform);
    return {
        translateX: m41,
        translateY: m42,
        translateZ: m43,
        scaleX: m11,
        scaleY: m22,
        scaleZ: m33,
    };
};
/**
 * @en Setting property conversion animation using css transition for specified element.
 * @ja 指定要素に対して css transition を用いたプロパティ変換アニメーションの設定
 *
 * @param el
 *  - `en` target `HTMLElement` instance
 *  - `ja` 対象 `HTMLElement` インスタンス
 * @param prop
 *  - `en` target property name [ex: height]
 *  - `ja` 対象プロパティ名 [ex: height]
 * @param msec
 *  - `en` animation duration [msec]
 *  - `ja` アニメーション時間 [msec]
 * @param el
 *  - `en` timing function name [default: ease]
 *  - `ja` タイミング関数名 [default: ease]
 */
const setTransformTransition = (el, prop, msec, timingFunction = 'ease') => {
    const animation = `${(msec / 1000)}s ${timingFunction}`;
    el.style.setProperty('transition', `${prop} ${animation}, transform ${animation}`);
};
/**
 * @en Clear css transition settings for specified element.
 * @ja 指定要素の css transition 設定を解除
 *
 * @param el
 *  - `en` target `HTMLElement` instance
 *  - `ja` 対象 `HTMLElement` インスタンス
 */
const clearTransition = (el) => {
    el.style.removeProperty('transition');
};

/*!
 * @cdp/ui-forms 0.9.20
 *   UI form components
 */


const sheet$1 = new CSSStyleSheet();sheet$1.replaceSync("div{display:block;-webkit-text-decoration-skip: ink;text-decoration-skip-ink: auto;}");

const sheet = new CSSStyleSheet();sheet.replaceSync("div{display:block;-webkit-text-decoration-skip: ink;text-decoration-skip-ink: auto;}");

const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
void post(noop(sheet$1, sheet));

/*!
 * @cdp/ui-listview 0.9.20
 *   web domain utilities
 */


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
        _backup[key] ??= {
            map: this._mapGroups,
            tops: this._aryTopGroups,
        };
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

export { ExpandableListItemView, ExpandableListView, GroupProfile, ItemProfile, ListItemView, ListView, ListViewGlobalConfig, PageProfile, UI_FORMS_STATUS, clearTransition, cssPrefixes, getTransformMatrixValues, setTransformTransition };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5tanMiLCJzb3VyY2VzIjpbInVpLXV0aWxzL3Jlc3VsdC1jb2RlLWRlZnMudHMiLCJ1aS11dGlscy9zc3IudHMiLCJ1aS11dGlscy9jc3MvbWlzYy50cyIsInNjc3Mvc3RydWN0dXJlLnNjc3MiLCJzY3NzL3N0cnVjdHVyZS1idXR0b24uc2NzcyIsInVpLWZvcm1zL2luZGV4LnRzIiwidWktbGlzdHZpZXcvcmVzdWx0LWNvZGUtZGVmcy50cyIsInVpLWxpc3R2aWV3L2dsb2JhbC1jb25maWcudHMiLCJ1aS1saXN0dmlldy9wcm9maWxlL2l0ZW0udHMiLCJ1aS1saXN0dmlldy9wcm9maWxlL3BhZ2UudHMiLCJ1aS1saXN0dmlldy9wcm9maWxlL2dyb3VwLnRzIiwidWktbGlzdHZpZXcvbGlzdC1pdGVtLXZpZXcudHMiLCJ1aS1saXN0dmlldy9jb3JlL2VsZW1lbnQtc2Nyb2xsZXIudHMiLCJ1aS1saXN0dmlldy9jb3JlL2xpc3QudHMiLCJ1aS1saXN0dmlldy9saXN0LXZpZXcudHMiLCJ1aS1saXN0dmlldy9leHBhbmRhYmxlLWxpc3QtaXRlbS12aWV3LnRzIiwidWktbGlzdHZpZXcvY29yZS9leHBhbmQudHMiLCJ1aS1saXN0dmlldy9leHBhbmRhYmxlLWxpc3Qtdmlldy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBleHBvcnQgY29uc3QgZW51bSBDRFBfS05PV05fVUlfTU9EVUxFIHtcbiAgICAgICAgLyoqIGBAY2RwL3VpLXV0aWxzYCAqL1xuICAgICAgICBVVElMUyAgICAgPSAxLFxuICAgICAgICAvKiogYEBjZHAvdWktbGlzdHZpZXdgICovXG4gICAgICAgIExJU1RWSUVXICA9IDIsXG4gICAgICAgIC8qKiBvZmZzZXQgZm9yIHVua25vd24gdWktbW9kdWxlICovXG4gICAgICAgIE9GRlNFVCxcbiAgICB9XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFVJX1VUSUxTID0gKENEUF9LTk9XTl9NT0RVTEUuT0ZGU0VUICsgQ0RQX0tOT1dOX1VJX01PRFVMRS5VVElMUykgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgVUlfVVRJTFNfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfVUlfVVRJTFNfRkFUQUwgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9VVElMUyArIDEsICdVSSB1dGlscyBzb21ldGhpbmcgd3JvbmcuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGdldENvbXB1dGVkU3R5bGUgPSBzYWZlKGdsb2JhbFRoaXMuZ2V0Q29tcHV0ZWRTdHlsZSk7XG4iLCJpbXBvcnQgeyBnZXRDb21wdXRlZFN0eWxlIH0gZnJvbSAnLi4vc3NyJztcblxuLyoqXG4gKiBAZW4gQ1NTIHZlbmRvciBwcmVmaXggc3RyaW5nIGRlZmluaXRpb24uXG4gKiBAamEgQ1NTIOODmeODs+ODgOODvOODl+ODquODleOCo+ODg+OCr+OCueaWh+Wtl+WIl+Wumue+qVxuICovXG5leHBvcnQgY29uc3QgY3NzUHJlZml4ZXMgPSBbJy13ZWJraXQtJywgJy1tb3otJywgJy1tcy0nLCAnLW8tJywgJyddO1xuXG4vKipcbiAqIEBlbiBTdG9yZXMgdGhlIHZhbHVlIHNwZWNpZmllZCBpbiBjc3MgYHRyYW5zZm9ybSgzZClgLlxuICogQGphIGNzcyBgdHJhbnNmb3JtKDNkKWAg44Gr5oyH5a6a44GV44KM44KL5YCk44KS5qC857SNXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNmb3JtTWF0cml4VmFsdWVzIHtcbiAgICB0cmFuc2xhdGVYOiBudW1iZXI7XG4gICAgdHJhbnNsYXRlWTogbnVtYmVyO1xuICAgIHRyYW5zbGF0ZVo6IG51bWJlcjtcbiAgICBzY2FsZVg6IG51bWJlcjtcbiAgICBzY2FsZVk6IG51bWJlcjtcbiAgICBzY2FsZVo6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiB0aGUgdHJhbnNmb3JtIG1hdHJpeCBzcGVjaWZpZWQgaW4gYEVsZW1lbnRgLlxuICogQGphIGBFbGVtZW50YCDjgavmjIflrprjgZXjgozjgZ8gdHJhbnNmb3JtIOihjOWIl+OBruWApOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBjb25zdCBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgPSAoZWw6IEVsZW1lbnQpOiBUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG4gICAgY29uc3QgeyBtMTEsIG0yMiwgbTMzLCBtNDEsIG00MiwgbTQzIH0gPSBuZXcgRE9NTWF0cml4UmVhZE9ubHkoc3R5bGUudHJhbnNmb3JtKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0cmFuc2xhdGVYOiBtNDEsXG4gICAgICAgIHRyYW5zbGF0ZVk6IG00MixcbiAgICAgICAgdHJhbnNsYXRlWjogbTQzLFxuICAgICAgICBzY2FsZVg6IG0xMSxcbiAgICAgICAgc2NhbGVZOiBtMjIsXG4gICAgICAgIHNjYWxlWjogbTMzLFxuICAgIH07XG59O1xuXG4vKipcbiAqIEBlbiBTZXR0aW5nIHByb3BlcnR5IGNvbnZlcnNpb24gYW5pbWF0aW9uIHVzaW5nIGNzcyB0cmFuc2l0aW9uIGZvciBzcGVjaWZpZWQgZWxlbWVudC5cbiAqIEBqYSDmjIflrpropoHntKDjgavlr77jgZfjgaYgY3NzIHRyYW5zaXRpb24g44KS55So44GE44Gf44OX44Ot44OR44OG44Kj5aSJ5o+b44Ki44OL44Oh44O844K344On44Oz44Gu6Kit5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgSFRNTEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgSFRNTEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWUgW2V4OiBoZWlnaHRdXG4gKiAgLSBgamFgIOWvvuixoeODl+ODreODkeODhuOCo+WQjSBbZXg6IGhlaWdodF1cbiAqIEBwYXJhbSBtc2VjXG4gKiAgLSBgZW5gIGFuaW1hdGlvbiBkdXJhdGlvbiBbbXNlY11cbiAqICAtIGBqYWAg44Ki44OL44Oh44O844K344On44Oz5pmC6ZaTIFttc2VjXVxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBuYW1lIFtkZWZhdWx0OiBlYXNlXVxuICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbDlkI0gW2RlZmF1bHQ6IGVhc2VdXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uID0gKGVsOiBIVE1MRWxlbWVudCwgcHJvcDogc3RyaW5nLCBtc2VjOiBudW1iZXIsIHRpbWluZ0Z1bmN0aW9uID0gJ2Vhc2UnKTogdm9pZCA9PiB7XG4gICAgY29uc3QgYW5pbWF0aW9uID0gYCR7KG1zZWMgLyAxMDAwKX1zICR7dGltaW5nRnVuY3Rpb259YDtcbiAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgndHJhbnNpdGlvbicsIGAke3Byb3B9ICR7YW5pbWF0aW9ufSwgdHJhbnNmb3JtICR7YW5pbWF0aW9ufWApO1xufTtcblxuXG4vKipcbiAqIEBlbiBDbGVhciBjc3MgdHJhbnNpdGlvbiBzZXR0aW5ncyBmb3Igc3BlY2lmaWVkIGVsZW1lbnQuXG4gKiBAamEg5oyH5a6a6KaB57Sg44GuIGNzcyB0cmFuc2l0aW9uIOioreWumuOCkuino+mZpFxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEhUTUxFbGVtZW50YCBpbnN0YW5jZVxuICogIC0gYGphYCDlr77osaEgYEhUTUxFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyVHJhbnNpdGlvbiA9IChlbDogSFRNTEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndHJhbnNpdGlvbicpO1xufTtcbiIsbnVsbCxudWxsLCJleHBvcnQgY29uc3QgVUlfRk9STVNfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG5cbmltcG9ydCB7IG5vb3AsIHBvc3QgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuXG5pbXBvcnQgc3R5bGVDb3JlIGZyb20gJ0Bjc3Mvc3RydWN0dXJlLmNzcycgd2l0aCB7IHR5cGU6ICdjc3MnIH07XG5pbXBvcnQgc3R5bGVCdXR0b24gZnJvbSAnQGNzcy9zdHJ1Y3R1cmUtYnV0dG9uLmNzcycgd2l0aCB7IHR5cGU6ICdjc3MnIH07XG5cbnZvaWQgcG9zdChub29wKHN0eWxlQ29yZSwgc3R5bGVCdXR0b24pKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfTElTVFZJRVcgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLkxJU1RWSUVXKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9MSVNUVklFV19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAxLCAnbGlzdHZpZXcgaGFzIGludmFsaWQgaW5pdGlhbGl6YXRpb24uJyksXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0gICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDIsICdsaXN0dmlldyBnaXZlbiBhIGludmFsaWQgcGFyYW0uJyksXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfT1BFUkFUSU9OICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDMsICdsaXN0dmlldyBpbnZhbGlkIG9wZXJhdGlvbi4nKSxcbiAgICB9XG59XG4iLCIvKipcbiAqIEBlbiBHbG9iYWwgY29uZmlndXJhdGlvbiBkZWZpbml0aW9uIGZvciBsaXN0IHZpZXdzLlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICBOQU1FU1BBQ0U6IHN0cmluZztcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBzdHJpbmc7XG4gICAgSU5BQ1RJVkVfQ0xBU1M6IHN0cmluZztcbiAgICBSRUNZQ0xFX0NMQVNTOiBzdHJpbmc7XG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogc3RyaW5nO1xuICAgIERBVEFfUEFHRV9JTkRFWDogc3RyaW5nO1xuICAgIERBVEFfSVRFTV9JTkRFWDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHRWIHtcbiAgICBOQU1FU1BBQ0UgICAgICAgICAgID0gJ2NkcC11aScsIC8vIFRPRE86IG5hbWVzcGFjZSDjga8gdXRpbHMg44Gr56e744GZXG4gICAgU0NST0xMX01BUF9DTEFTUyAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctc2Nyb2xsLW1hcGAsXG4gICAgSU5BQ1RJVkVfQ0xBU1MgICAgICA9IGAke05BTUVTUEFDRX0taW5hY3RpdmVgLFxuICAgIFJFQ1lDTEVfQ0xBU1MgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXJlY3ljbGVgLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LWl0ZW0tYmFzZWAsXG4gICAgREFUQV9QQUdFX0lOREVYICAgICA9ICdkYXRhLXBhZ2UtaW5kZXgnLFxuICAgIERBVEFfSVRFTV9JTkRFWCAgICAgPSAnZGF0YS1pdGVtLWluZGV4Jyxcbn1cblxuY29uc3QgX2NvbmZpZyA9IHtcbiAgICBOQU1FU1BBQ0U6IERlZmF1bHRWLk5BTUVTUEFDRSxcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBEZWZhdWx0Vi5TQ1JPTExfTUFQX0NMQVNTLFxuICAgIElOQUNUSVZFX0NMQVNTOiBEZWZhdWx0Vi5JTkFDVElWRV9DTEFTUyxcbiAgICBSRUNZQ0xFX0NMQVNTOiBEZWZhdWx0Vi5SRUNZQ0xFX0NMQVNTLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IERlZmF1bHRWLkxJU1RJVEVNX0JBU0VfQ0xBU1MsXG4gICAgREFUQV9QQUdFX0lOREVYOiBEZWZhdWx0Vi5EQVRBX1BBR0VfSU5ERVgsXG4gICAgREFUQV9JVEVNX0lOREVYOiBEZWZhdWx0Vi5EQVRBX0lURU1fSU5ERVgsXG59O1xuXG5leHBvcnQgdHlwZSBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyA9IFBhcnRpYWw8XG4gICAgUGljazxMaXN0Vmlld0dsb2JhbENvbmZpZ1xuICAgICAgICAsICdOQU1FU1BBQ0UnXG4gICAgICAgIHwgJ1NDUk9MTF9NQVBfQ0xBU1MnXG4gICAgICAgIHwgJ0lOQUNUSVZFX0NMQVNTJ1xuICAgICAgICB8ICdSRUNZQ0xFX0NMQVNTJ1xuICAgICAgICB8ICdMSVNUSVRFTV9CQVNFX0NMQVNTJ1xuICAgICAgICB8ICdEQVRBX1BBR0VfSU5ERVgnXG4gICAgICAgIHwgJ0RBVEFfSVRFTV9JTkRFWCdcbiAgICA+XG4+O1xuXG5jb25zdCBlbnN1cmVOZXdDb25maWcgPSAobmV3Q29uZmlnOiBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyk6IFBhcnRpYWw8TGlzdFZpZXdHbG9iYWxDb25maWc+ID0+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIE5BTUVTUEFDRTogbnMsXG4gICAgICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHNjcm9sbG1hcCxcbiAgICAgICAgSU5BQ1RJVkVfQ0xBU1M6IGluYWN0aXZlLFxuICAgICAgICBSRUNZQ0xFX0NMQVNTOiByZWN5Y2xlLFxuICAgICAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBpdGVtYmFzZSxcbiAgICAgICAgREFUQV9QQUdFX0lOREVYOiBkYXRhcGFnZSxcbiAgICAgICAgREFUQV9JVEVNX0lOREVYOiBkYXRhaXRlbSxcbiAgICB9ID0gbmV3Q29uZmlnO1xuXG4gICAgY29uc3QgTkFNRVNQQUNFID0gbnM7XG4gICAgY29uc3QgU0NST0xMX01BUF9DTEFTUyA9IHNjcm9sbG1hcCA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctc2Nyb2xsLW1hcGAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IElOQUNUSVZFX0NMQVNTID0gaW5hY3RpdmUgPz8gKG5zID8gYCR7bnN9LWluYWN0aXZlYCA6IHVuZGVmaW5lZCk7XG4gICAgY29uc3QgUkVDWUNMRV9DTEFTUyA9IHJlY3ljbGUgPz8gKG5zID8gYCR7bnN9LWxpc3R2aWV3LXJlY3ljbGVgIDogdW5kZWZpbmVkKTtcbiAgICBjb25zdCBMSVNUSVRFTV9CQVNFX0NMQVNTID0gaXRlbWJhc2UgPz8gKG5zID8gYCR7bnN9LWxpc3R2aWV3LWl0ZW0tYmFzZWAgOiB1bmRlZmluZWQpO1xuXG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obmV3Q29uZmlnLCB7XG4gICAgICAgIE5BTUVTUEFDRSxcbiAgICAgICAgU0NST0xMX01BUF9DTEFTUyxcbiAgICAgICAgSU5BQ1RJVkVfQ0xBU1MsXG4gICAgICAgIFJFQ1lDTEVfQ0xBU1MsXG4gICAgICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MsXG4gICAgICAgIERBVEFfUEFHRV9JTkRFWDogZGF0YXBhZ2UsXG4gICAgICAgIERBVEFfSVRFTV9JTkRFWDogZGF0YWl0ZW0sXG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQvVXBkYXRlIGdsb2JhbCBjb25maWd1cmF0aW9uIG9mIGxpc3Qgdmlldy5cbiAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjga7jgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjg6zjg7zjgrfjg6fjg7Pjga7lj5blvpcv5pu05pawXG4gKi9cbmV4cG9ydCBjb25zdCBMaXN0Vmlld0dsb2JhbENvbmZpZyA9IChuZXdDb25maWc/OiBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZyk6IExpc3RWaWV3R2xvYmFsQ29uZmlnID0+IHtcbiAgICBpZiAobmV3Q29uZmlnKSB7XG4gICAgICAgIGVuc3VyZU5ld0NvbmZpZyhuZXdDb25maWcpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhuZXdDb25maWcpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgT2JqZWN0LmFzc2lnbihfY29uZmlnLCBuZXdDb25maWcpKTtcbn07XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB7IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyB9IGZyb20gJ0BjZHAvdWktdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBJTGlzdENvbnRleHQgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2Jhc2UnO1xuaW1wb3J0IHR5cGUge1xuICAgIElMaXN0SXRlbVZpZXcsXG4gICAgSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLFxuICAgIExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcy9saXN0LWl0ZW0tdmlldyc7XG5pbXBvcnQgeyBMaXN0Vmlld0dsb2JhbENvbmZpZyB9IGZyb20gJy4uL2dsb2JhbC1jb25maWcnO1xuXG4vKipcbiAqIEBlbiBBIGNsYXNzIHRoYXQgc3RvcmVzIFVJIHN0cnVjdHVyZSBpbmZvcm1hdGlvbiBmb3IgbGlzdCBpdGVtcy5cbiAqIEBqYSDjg6rjgrnjg4jjgqLjgqTjg4bjg6Djga4gVUkg5qeL6YCg5oOF5aCx44KS5qC857SN44GZ44KL44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBJdGVtUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX293bmVyOiBJTGlzdENvbnRleHQ7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2hlaWdodDogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yO1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pbmZvOiBVbmtub3duT2JqZWN0O1xuICAgIC8qKiBAaW50ZXJuYWwgZ2xvYmFsIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXg/OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCBiZWxvbmdpbmcgcGFnZSBpbmRleCAqL1xuICAgIHByaXZhdGUgX3BhZ2VJbmRleD86IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsIGdsb2JhbCBvZmZzZXQgKi9cbiAgICBwcml2YXRlIF9vZmZzZXQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgYmFzZSBkb20gaW5zdGFuY2UgKi9cbiAgICBwcml2YXRlIF8kYmFzZT86IERPTTtcbiAgICAvKiogQGludGVybmFsIElMaXN0SXRlbVZpZXcgaW5zdGFuY2UgKi9cbiAgICBwcml2YXRlIF9pbnN0YW5jZT86IElMaXN0SXRlbVZpZXc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG93bmVyXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSUxpc3RWaWV3Q29udGV4dH0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdFZpZXdDb250ZXh0fSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5Yid5pyf44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG93bmVyOiBJTGlzdENvbnRleHQsIGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLCBfaW5mbzogVW5rbm93bk9iamVjdCkge1xuICAgICAgICB0aGlzLl9vd25lciAgICAgICA9IG93bmVyO1xuICAgICAgICB0aGlzLl9oZWlnaHQgICAgICA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZXIgPSBpbml0aWFsaXplcjtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgICAgPSBfaW5mbztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKiogR2V0IHRoZSBpdGVtJ3MgaGVpZ2h0LiAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBpdGVtJ3MgZ2xvYmFsIGluZGV4LiAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgaXRlbSdzIGdsb2JhbCBpbmRleC4gKi9cbiAgICBzZXQgaW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnVwZGF0ZUluZGV4KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBiZWxvbmdpbmcgdGhlIHBhZ2UgaW5kZXguICovXG4gICAgZ2V0IHBhZ2VJbmRleCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFnZUluZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgYmVsb25naW5nIHRoZSBwYWdlIGluZGV4LiAqL1xuICAgIHNldCBwYWdlSW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9wYWdlSW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSW5kZXgoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGdsb2JhbCBvZmZzZXQuICovXG4gICAgZ2V0IG9mZnNldCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBTZXQgZ2xvYmFsIG9mZnNldC4gKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICAgICAgdGhpcy51cGRhdGVPZmZzZXQoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGluaXQgcGFyYW1ldGVycy4gKi9cbiAgICBnZXQgaW5mbygpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWN0aXZhdGUgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UgPSB0aGlzLnByZXBhcmVCYXNlRWxlbWVudCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVJbmRleCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVPZmZzZXQoKTtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgICAgICBlbDogdGhpcy5fJGJhc2UsXG4gICAgICAgICAgICAgICAgb3duZXI6IHRoaXMuX293bmVyLFxuICAgICAgICAgICAgICAgIGl0ZW06IHRoaXMsXG4gICAgICAgICAgICB9LCB0aGlzLl9pbmZvKTtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlID0gbmV3IHRoaXMuX2luaXRpYWxpemVyKG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCdub25lJyA9PT0gdGhpcy5fJGJhc2UuY3NzKCdkaXNwbGF5JykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VJbmRleCgpO1xuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgJ3Zpc2libGUnICE9PSB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknKSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNYWtlIHRoZSBpdGVtIGludmlzaWJsZS5cbiAgICAgKiBAamEgaXRlbSDjga7kuI3lj6/oppbljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGlkZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgJ2hpZGRlbicgIT09IHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVhY3RpdmF0ZSBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7pnZ7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uYWRkQ2xhc3ModGhpcy5fY29uZmlnLlJFQ1lDTEVfQ0xBU1MpO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWZyZXNoIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBruabtOaWsFxuICAgICAqL1xuICAgIHB1YmxpYyByZWZyZXNoKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UucmVuZGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGFjdGl2YXRpb24gc3RhdHVzIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrua0u+aAp+eKtuaFi+WIpOWumlxuICAgICAqL1xuICAgIHB1YmxpYyBpc0FjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5faW5zdGFuY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBoZWlnaHQgaW5mb3JtYXRpb24gb2YgdGhlIGl0ZW0uIENhbGxlZCBmcm9tIHtAbGluayBMaXN0SXRlbVZpZXd9LlxuICAgICAqIEBqYSBpdGVtIOOBrumrmOOBleaDheWgseOBruabtOaWsC4ge0BsaW5rIExpc3RJdGVtVmlld30g44GL44KJ44Kz44O844Or44GV44KM44KL44CCXG4gICAgICovXG4gICAgcHVibGljIHVwZGF0ZUhlaWdodChuZXdIZWlnaHQ6IG51bWJlciwgb3B0aW9ucz86IExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyk6IHZvaWQge1xuICAgICAgICBjb25zdCBkZWx0YSA9IG5ld0hlaWdodCAtIHRoaXMuX2hlaWdodDtcbiAgICAgICAgdGhpcy5faGVpZ2h0ID0gbmV3SGVpZ2h0O1xuICAgICAgICB0aGlzLl9vd25lci51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGEpO1xuICAgICAgICBpZiAob3B0aW9ucz8ucmVmbGVjdEFsbCkge1xuICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlUHJvZmlsZXModGhpcy5faW5kZXggPz8gMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgei1pbmRleC4gQ2FsbGVkIGZyb20ge0BsaW5rIFNjcm9sbE1hbmFnZXJ9YC5yZW1vdmVJdGVtKClgLlxuICAgICAqIEBqYSB6LWluZGV4IOOBruODquOCu+ODg+ODiC4ge0BsaW5rIFNjcm9sbE1hbmFnZXJ9YC5yZW1vdmVJdGVtKClgIOOBi+OCieOCs+ODvOODq+OBleOCjOOCi+OAglxuICAgICAqL1xuICAgIHB1YmxpYyByZXNldERlcHRoKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmNzcygnei1pbmRleCcsIHRoaXMuX293bmVyLm9wdGlvbnMuYmFzZURlcHRoKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZ2V0IF9jb25maWcoKTogTGlzdFZpZXdHbG9iYWxDb25maWcge1xuICAgICAgICByZXR1cm4gTGlzdFZpZXdHbG9iYWxDb25maWcoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBwcmVwYXJlQmFzZUVsZW1lbnQoKTogRE9NIHtcbiAgICAgICAgbGV0ICRiYXNlOiBET007XG4gICAgICAgIGNvbnN0ICRyZWN5Y2xlID0gdGhpcy5fb3duZXIuZmluZFJlY3ljbGVFbGVtZW50cygpLmZpcnN0KCk7XG4gICAgICAgIGNvbnN0IGl0ZW1UYWdOYW1lID0gdGhpcy5fb3duZXIub3B0aW9ucy5pdGVtVGFnTmFtZTtcblxuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl8kYmFzZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCd0aGlzLl8kYmFzZSBpcyBub3QgbnVsbC4nKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl8kYmFzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgwIDwgJHJlY3ljbGUubGVuZ3RoKSB7XG4gICAgICAgICAgICAkYmFzZSA9ICRyZWN5Y2xlO1xuICAgICAgICAgICAgJGJhc2UucmVtb3ZlQXR0cignei1pbmRleCcpO1xuICAgICAgICAgICAgJGJhc2UucmVtb3ZlQ2xhc3ModGhpcy5fY29uZmlnLlJFQ1lDTEVfQ0xBU1MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVE9ETzogIOimgeaknOioji4gPGxpPiDlhajoiKzjga8gPHNsb3Q+IOOBqOOBqeOBruOCiOOBhuOBq+WNlOiqv+OBmeOCi+OBiz9cbiAgICAgICAgICAgICRiYXNlID0gJChgPCR7aXRlbVRhZ05hbWV9IGNsYXNzPVwiJHt0aGlzLl9jb25maWcuTElTVElURU1fQkFTRV9DTEFTU31cIj48L1wiJHtpdGVtVGFnTmFtZX1cIj5gKTtcbiAgICAgICAgICAgICRiYXNlLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci4kc2Nyb2xsTWFwLmFwcGVuZCgkYmFzZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDpq5jjgZXjga7mm7TmlrBcbiAgICAgICAgaWYgKCRiYXNlLmhlaWdodCgpICE9PSB0aGlzLl9oZWlnaHQpIHtcbiAgICAgICAgICAgICRiYXNlLmhlaWdodCh0aGlzLl9oZWlnaHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICRiYXNlO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZUluZGV4KCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9JVEVNX0lOREVYKSAhPT0gU3RyaW5nKHRoaXMuX2luZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9JVEVNX0lOREVYLCB0aGlzLl9pbmRleCEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlUGFnZUluZGV4KCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9QQUdFX0lOREVYKSAhPT0gU3RyaW5nKHRoaXMuX3BhZ2VJbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfUEFHRV9JTkRFWCwgdGhpcy5fcGFnZUluZGV4ISk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVPZmZzZXQoKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9vd25lci5vcHRpb25zLmVuYWJsZVRyYW5zZm9ybU9mZnNldCkge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2xhdGVZIH0gPSBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXModGhpcy5fJGJhc2VbMF0pO1xuICAgICAgICAgICAgaWYgKHRyYW5zbGF0ZVkgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndHJhbnNmb3JtJywgYHRyYW5zbGF0ZTNkKDAsJHt0aGlzLl9vZmZzZXR9cHgsMGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdG9wID0gcGFyc2VJbnQodGhpcy5fJGJhc2UuY3NzKCd0b3AnKSwgMTApO1xuICAgICAgICAgICAgaWYgKHRvcCAhPT0gdGhpcy5fb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd0b3AnLCBgJHt0aGlzLl9vZmZzZXR9cHhgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IGF0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG4vKipcbiAqIEBlbiBBIGNsYXNzIHRoYXQgc3RvcmVzIFVJIHN0cnVjdHVyZSBpbmZvcm1hdGlvbiBmb3Igb25lIHBhZ2Ugb2YgdGhlIGxpc3QuXG4gKiBAamEg44Oq44K544OIMeODmuODvOOCuOWIhuOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFBhZ2VQcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIG9mZnNldCBmcm9tIHRvcCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlJ3MgaGVpZ2h0ICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGl0ZW0ncyBwcm9maWxlIG1hbmFnZWQgd2l0aCBpbiBwYWdlICovXG4gICAgcHJpdmF0ZSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiogQGludGVybmFsIHBhZ2Ugc3RhdHVzICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAnYWN0aXZlJyB8ICdpbmFjdGl2ZScgfCAnaGlkZGVuJyA9ICdpbmFjdGl2ZSc7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBwYWdlIGluZGV4ICovXG4gICAgc2V0IGluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIG9mZnNldCAqL1xuICAgIGdldCBvZmZzZXQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBwYWdlIG9mZnNldCAqL1xuICAgIHNldCBvZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2UgaGVpZ2h0ICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2Ugc3RhdHVzICovXG4gICAgZ2V0IHN0YXR1cygpOiAnYWN0aXZlJyB8ICdpbmFjdGl2ZScgfCAnaGlkZGVuJyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWN0aXZhdGUgb2YgdGhlIHBhZ2UuXG4gICAgICogQGphIHBhZ2Ug44Gu5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2FjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdhY3RpdmUnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNYWtlIHRoZSBwYWdlIGludmlzaWJsZS5cbiAgICAgKiBAamEgcGFnZSDjga7kuI3lj6/oppbljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGlkZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdoaWRkZW4nICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdoaWRkZW4nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2luYWN0aXZlJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaW5hY3RpdmUnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQge0BsaW5rIEl0ZW1Qcm9maWxlfSB0byB0aGUgcGFnZS5cbiAgICAgKiBAamEge0BsaW5rIEl0ZW1Qcm9maWxlfSDjga7ov73liqBcbiAgICAgKi9cbiAgICBwdWJsaWMgcHVzaChpdGVtOiBJdGVtUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB0aGlzLl9oZWlnaHQgKz0gaXRlbS5oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIElmIGFsbCB7QGxpbmsgSXRlbVByb2ZpbGV9IHVuZGVyIHRoZSBwYWdlIGFyZSBub3QgdmFsaWQsIGRpc2FibGUgdGhlIHBhZ2UncyBzdGF0dXMuXG4gICAgICogQGphIOmFjeS4i+OBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOBmeOBueOBpuOBjOacieWKueOBp+OBquOBhOWgtOWQiCwgcGFnZSDjgrnjg4bjg7zjgr/jgrnjgpLnhKHlirnjgavjgZnjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgbm9ybWFsaXplKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbmFibGVBbGwgPSB0aGlzLl9pdGVtcy5ldmVyeShpdGVtID0+IGl0ZW0uaXNBY3RpdmUoKSk7XG4gICAgICAgIGlmICghZW5hYmxlQWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaW5hY3RpdmUnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgSXRlbVByb2ZpbGV9IGJ5IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgaYge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbShpbmRleDogbnVtYmVyKTogSXRlbVByb2ZpbGUge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5faXRlbXMsIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGZpcnN0IHtAbGluayBJdGVtUHJvZmlsZX0uXG4gICAgICogQGphIOacgOWIneOBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtRmlyc3QoKTogSXRlbVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlbXNbMF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBsYXN0IHtAbGluayBJdGVtUHJvZmlsZX0uXG4gICAgICogQGphIOacgOW+jOOBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtTGFzdCgpOiBJdGVtUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pdGVtc1t0aGlzLl9pdGVtcy5sZW5ndGggLSAxXTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvSGVscFN0cmluZyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zIH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9iYXNlJztcbmltcG9ydCB0eXBlIHsgSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yIH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9saXN0LWl0ZW0tdmlldyc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdENvbnRleHQgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2V4cGFuZGFibGUtY29udGV4dCc7XG5pbXBvcnQgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vaXRlbSc7XG5cbi8qKlxuICogQGVuIFVJIHN0cnVjdHVyZSBpbmZvcm1hdGlvbiBzdG9yYWdlIGNsYXNzIGZvciBncm91cCBtYW5hZ2VtZW50IG9mIGxpc3QgaXRlbXMuIDxicj5cbiAqICAgICBUaGlzIGNsYXNzIGRvZXMgbm90IGRpcmVjdGx5IG1hbmlwdWxhdGUgdGhlIERPTS5cbiAqIEBqYSDjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgpLjgrDjg6vjg7zjg5fnrqHnkIbjgZnjgosgVUkg5qeL6YCg5oOF5aCx5qC857SN44Kv44Op44K5IDxicj5cbiAqICAgICDmnKzjgq/jg6njgrnjga/nm7TmjqXjga8gRE9NIOOCkuaTjeS9nOOBl+OBquOBhFxuICovXG5leHBvcnQgY2xhc3MgR3JvdXBQcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsIHByb2ZpbGUgaWQgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pZDogc3RyaW5nO1xuICAgIC8qKiBAaW50ZXJuYWwge0BsaW5rIEV4cGFuZGFibGVMaXN0Vmlld30gaW5zdGFuY2UqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX293bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0O1xuICAgIC8qKiBAaW50ZXJuYWwgcGFyZW50IHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfcGFyZW50PzogR3JvdXBQcm9maWxlO1xuICAgIC8qKiBAaW50ZXJuYWwgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0gYXJyYXkgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9jaGlsZHJlbjogR3JvdXBQcm9maWxlW10gPSBbXTtcbiAgICAvKiogQGludGVybmFsIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cyAqL1xuICAgIHByaXZhdGUgX2V4cGFuZGVkID0gZmFsc2U7XG4gICAgLyoqIEBpbnRlcm5hbCByZWdpc3RyYXRpb24gc3RhdHVzIGZvciBfb3duZXIgKi9cbiAgICBwcml2YXRlIF9zdGF0dXM6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnID0gJ3VucmVnaXN0ZXJlZCc7XG4gICAgLyoqIEBpbnRlcm5hbCBzdG9yZWQge0BsaW5rIEl0ZW1Qcm9maWxlfSBpbmZvcm1hdGlvbiAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG93bmVyXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSUV4cGFuZGFibGVMaXN0Q29udGV4dH0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBJRXhwYW5kYWJsZUxpc3RDb250ZXh0fSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIGlkIG9mIHRoZSBpbnN0YW5jZS4gc3BlY2lmaWVkIGJ5IHRoZSBmcmFtZXdvcmsuXG4gICAgICogIC0gYGphYCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga4gSUQuIOODleODrOODvOODoOODr+ODvOOCr+OBjOaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG93bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0LCBpZDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX2lkICAgID0gaWQ7XG4gICAgICAgIHRoaXMuX293bmVyID0gb3duZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBJRC5cbiAgICAgKiBAamEgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAZW4gR2V0IHN0YXR1cy4gJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCdcbiAgICAgKiBAamEg44K544OG44O844K/44K544KS5Y+W5b6XICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnXG4gICAgICovXG4gICAgZ2V0IHN0YXR1cygpOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cy5cbiAgICAgKiBAamEg5bGV6ZaL54q25oWL44KS5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhwYW5kZWQsIGNvbGxhcHNlZDogY2xvc2VcbiAgICAgKiAgLSBgamFgIHRydWU6IOWxlemWiywgZmFsc2U6IOWPjuadn1xuICAgICAqL1xuICAgIGdldCBpc0V4cGFuZGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXhwYW5kZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBwYXJlbnQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOimqiB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgcGFyZW50KCk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjaGlsZHJlbiB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBjaGlsZHJlbigpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG5leHQgYXZhaWxhYmxlIGluZGV4IG9mIHRoZSBsYXN0IGl0ZW0gZWxlbWVudC5cbiAgICAgKiBAamEg5pyA5b6M44GuIGl0ZW0g6KaB57Sg44Gu5qyh44Gr5L2/55So44Gn44GN44KLIGluZGV4IOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHdpdGhBY3RpdmVDaGlsZHJlbiBcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byBzZWFyY2ggaW5jbHVkaW5nIHJlZ2lzdGVyZWQgY2hpbGQgZWxlbWVudHNcbiAgICAgKiAgLSBgamFgIOeZu+mMsua4iOOBv+OBruWtkOimgee0oOOCkuWQq+OCgeOBpuaknOe0ouOBmeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBnZXROZXh0SXRlbUluZGV4KHdpdGhBY3RpdmVDaGlsZHJlbiA9IGZhbHNlKTogbnVtYmVyIHtcbiAgICAgICAgbGV0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGlmICh3aXRoQWN0aXZlQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgPT0gaXRlbXMgfHwgaXRlbXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGl0ZW1zID0gdGhpcy5faXRlbXM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChpdGVtc1tpdGVtcy5sZW5ndGggLSAxXT8uaW5kZXggPz8gMCkgKyAxO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEg5pysIEdyb3VwUHJvZmlsZSDjgYznrqHnkIbjgZnjgosgaXRlbSDjgpLkvZzmiJDjgZfjgabnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgcHVibGljIGFkZEl0ZW0oXG4gICAgICAgIGhlaWdodDogbnVtYmVyLFxuICAgICAgICBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLFxuICAgICAgICBpbmZvOiBVbmtub3duT2JqZWN0LFxuICAgICk6IEdyb3VwUHJvZmlsZSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHsgZ3JvdXA6IHRoaXMgfSwgaW5mbyk7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBuZXcgSXRlbVByb2ZpbGUodGhpcy5fb3duZXIuY29udGV4dCwgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgb3B0aW9ucyk7XG5cbiAgICAgICAgLy8gX293bmVyIOOBrueuoeeQhuS4i+OBq+OBguOCi+OBqOOBjeOBr+mAn+OChOOBi+OBq+i/veWKoFxuICAgICAgICBpZiAoJ3JlZ2lzdGVyZWQnID09PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW0sIHRoaXMuZ2V0TmV4dEl0ZW1JbmRleCgpKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2l0ZW1zLnB1c2goaXRlbSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBhcyBjaGlsZCBlbGVtZW50LlxuICAgICAqIEBqYSDlrZDopoHntKDjgajjgZfjgaYge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlIC8gaW5zdGFuY2UgYXJyYXlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkQ2hpbGRyZW4odGFyZ2V0OiBHcm91cFByb2ZpbGUgfCBHcm91cFByb2ZpbGVbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBjaGlsZHJlbjogR3JvdXBQcm9maWxlW10gPSBBcnJheS5pc0FycmF5KHRhcmdldCkgPyB0YXJnZXQgOiBbdGFyZ2V0XTtcbiAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgICAgICAgY2hpbGQuc2V0UGFyZW50KHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuLnB1c2goLi4uY2hpbGRyZW4pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIGlmIGl0IGhhcyBhIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzLCBmYWxzZTogdW5leGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSwgZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIGdldCBoYXNDaGlsZHJlbigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fY2hpbGRyZW4ubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cCBleHBhbnNpb24uXG4gICAgICogQGphIOOCsOODq+ODvOODl+WxlemWi1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBleHBhbmQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICghdGhpcy5pc0V4cGFuZGVkKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ3JlZ2lzdGVyZWQnKTtcbiAgICAgICAgICAgIGlmICgwIDwgaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fb3duZXIuc3RhdHVzU2NvcGUoJ2V4cGFuZGluZycsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6Ieq6Lqr44KS5pu05pawXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8g6YWN5LiL44KS5pu05pawXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW1zLCB0aGlzLmdldE5leHRJdGVtSW5kZXgoKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIOWtkOimgee0oOOBjOOBquOBj+OBpuOCguWxlemWi+eKtuaFi+OBq+OBmeOCi1xuICAgICAgICB0aGlzLl9leHBhbmRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwIGNvbGxhcHNlLlxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5flj47mnZ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSBzcGVudCByZW1vdmluZyBlbGVtZW50cy4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICogIC0gYGphYCDopoHntKDliYrpmaTjgavosrvjgoTjgZnpgYXlu7bmmYLplpMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBjb2xsYXBzZShkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5pc0V4cGFuZGVkKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ3VucmVnaXN0ZXJlZCcpO1xuICAgICAgICAgICAgaWYgKDAgPCBpdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkZWxheSA9IGRlbGF5ID8/IHRoaXMuX293bmVyLmNvbnRleHQub3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbjtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9vd25lci5zdGF0dXNTY29wZSgnY29sbGFwc2luZycsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6Ieq6Lqr44KS5pu05pawXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8g6YWN5LiL44KS5pu05pawXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zWzBdLmluZGV4ICYmIHRoaXMuX293bmVyLnJlbW92ZUl0ZW0oaXRlbXNbMF0uaW5kZXgsIGl0ZW1zLmxlbmd0aCwgZGVsYXkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyDlrZDopoHntKDjgYzjgarjgY/jgabjgoLlj47mnZ/nirbmhYvjgavjgZnjgotcbiAgICAgICAgdGhpcy5fZXhwYW5kZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvdyBzZWxmIGluIHZpc2libGUgYXJlYSBvZiBsaXN0LlxuICAgICAqIEBqYSDoh6rouqvjgpLjg6rjgrnjg4jjga7lj6/oppbpoJjln5/jgavooajnpLpcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSBvcHRpb24ncyBvYmplY3RcbiAgICAgKiAgLSBgamFgIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGVuc3VyZVZpc2libGUob3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoMCA8IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgKG51bGwgIT0gdGhpcy5faXRlbXNbMF0uaW5kZXgpICYmIGF3YWl0IHRoaXMuX293bmVyLmVuc3VyZVZpc2libGUodGhpcy5faXRlbXNbMF0uaW5kZXgsIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0aW9ucz8uY2FsbGJhY2s/Lih0aGlzLl9vd25lci5zY3JvbGxQb3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRvZ2dsZSBleHBhbmQgLyBjb2xsYXBzZS5cbiAgICAgKiBAamEg6ZaL6ZaJ44Gu44OI44Kw44OrXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgc3BlbnQgcmVtb3ZpbmcgZWxlbWVudHMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqICAtIGBqYWAg6KaB57Sg5YmK6Zmk44Gr6LK744KE44GZ6YGF5bu25pmC6ZaTLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgdG9nZ2xlKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLl9leHBhbmRlZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb2xsYXBzZShkZWxheSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmV4cGFuZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIHRvIGxpc3Qgdmlldy4gT25seSAxc3QgbGF5ZXIgZ3JvdXAgY2FuIGJlIHJlZ2lzdGVyZWQuXG4gICAgICogQGphIOODquOCueODiOODk+ODpeODvOOBuOeZu+mMsi4g56ysMemajuWxpOOCsOODq+ODvOODl+OBruOBv+eZu+mMsuWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSBpbnNlcnRpb24gcG9zaXRpb24gd2l0aCBpbmRleFxuICAgICAqICAtIGBqYWAg5oy/5YWl5L2N572u44KSIGluZGV4IOOBp+aMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZWdpc3RlcihpbnNlcnRUbzogbnVtYmVyKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9ICdHcm91cFByb2ZpbGUjcmVnaXN0ZXInIG1ldGhvZCBpcyBhY2NlcHRhYmxlIG9ubHkgMXN0IGxheWVyIGdyb3VwLmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0odGhpcy5wcmVwcm9jZXNzKCdyZWdpc3RlcmVkJyksIGluc2VydFRvKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc3RvcmUgdG8gbGlzdCB2aWV3LiBPbmx5IDFzdCBsYXllciBncm91cCBjYW4gYmUgc3BlY2lmaWVkLlxuICAgICAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjgbjlvqnlhYMuIOesrDHpmo7lsaTjgrDjg6vjg7zjg5fjga7jgb/mjIfnpLrlj6/og70uXG4gICAgICovXG4gICAgcHVibGljIHJlc3RvcmUoKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9ICdHcm91cFByb2ZpbGUjcmVzdG9yZScgbWV0aG9kIGlzIGFjY2VwdGFibGUgb25seSAxc3QgbGF5ZXIgZ3JvdXAuYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLl9leHBhbmRlZCA/IHRoaXMuX2l0ZW1zLmNvbmNhdCh0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdhY3RpdmUnKSkgOiB0aGlzLl9pdGVtcy5zbGljZSgpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCDopqogR3JvdXAg5oyH5a6aICovXG4gICAgcHJpdmF0ZSBzZXRQYXJlbnQocGFyZW50OiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgIHJlZ2lzdGVyIC8gdW5yZWdpc3RlciDjga7liY3lh6bnkIYgKi9cbiAgICBwcml2YXRlIHByZXByb2Nlc3MobmV3U3RhdHVzOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBpZiAobmV3U3RhdHVzICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4udGhpcy5faXRlbXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9IG5ld1N0YXR1cztcbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwg5pON5L2c5a++6LGh44GuIEl0ZW1Qcm9maWxlIOmFjeWIl+OCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgcXVlcnlPcGVyYXRpb25UYXJnZXQob3BlcmF0aW9uOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyB8ICdhY3RpdmUnKTogSXRlbVByb2ZpbGVbXSB7XG4gICAgICAgIGNvbnN0IGZpbmRUYXJnZXRzID0gKGdyb3VwOiBHcm91cFByb2ZpbGUpOiBJdGVtUHJvZmlsZVtdID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGdyb3VwLl9jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JlZ2lzdGVyZWQnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICd1bnJlZ2lzdGVyZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZC5wcmVwcm9jZXNzKG9wZXJhdGlvbikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FjdGl2ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjaGlsZC5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkLl9pdGVtcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBvcGVyYXRpb246ICR7b3BlcmF0aW9ufWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjaGlsZC5pc0V4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uZmluZFRhcmdldHMoY2hpbGQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmaW5kVGFyZ2V0cyh0aGlzKTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBWaWV3LFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIElMaXN0VmlldyxcbiAgICBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMsXG4gICAgSUxpc3RJdGVtVmlldyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgb3duZXI6IElMaXN0VmlldztcbiAgICByZWFkb25seSBpdGVtOiBJdGVtUHJvZmlsZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE9wdGlvbnMgdG8gcGFzcyB0byB7QGxpbmsgTGlzdEl0ZW1WaWV3fSBjb25zdHJ1Y3Rpb24uXG4gKiBAamEge0BsaW5rIExpc3RJdGVtVmlld30g5qeL56+J44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEZ1bmNOYW1lID0gc3RyaW5nPlxuICAgIGV4dGVuZHMgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIG93bmVyOiBJTGlzdFZpZXc7XG4gICAgaXRlbTogSXRlbVByb2ZpbGU7XG59XG5cbi8qKlxuICogQGVuIExpc3QgaXRlbSBjb250YWluZXIgY2xhc3MgaGFuZGxlZCBieSB7QGxpbmsgTGlzdFZpZXd9LlxuICogQGphIHtAbGluayBMaXN0Vmlld30g44GM5omx44GG44Oq44K544OI44Ki44Kk44OG44Og44Kz44Oz44OG44OK44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMaXN0SXRlbVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJTGlzdEl0ZW1WaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHsgb3duZXIsIGl0ZW0gfSA9IG9wdGlvbnM7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgb3duZXIsXG4gICAgICAgICAgICBpdGVtLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIE93bmVyIOWPluW+lyAqL1xuICAgIGdldCBvd25lcigpOiBJTGlzdFZpZXcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ub3duZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gVmlldyBjb21wb25lbnQgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBSZW1vdmUgdGhpcyB2aWV3IGJ5IHRha2luZyB0aGUgZWxlbWVudCBvdXQgb2YgdGhlIERPTSB3aXRoIHJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEgVmlldyDjgYvjgokgRE9NIOOCkuWIh+OCiumbouOBlywg44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLiRlbC5jaGlsZHJlbigpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLiRlbC5vZmYoKTtcbiAgICAgICAgLy8gdGhpcy4kZWwg44Gv5YaN5Yip55So44GZ44KL44Gf44KB5a6M5YWo44Gq56C05qOE44Gv44GX44Gq44GEXG4gICAgICAgIHRoaXMuc2V0RWxlbWVudCgnbnVsbCcpO1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RJdGVtVmlld1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBvd24gaXRlbSBpbmRleFxuICAgICAqIEBqYSDoh6rouqvjga4gaXRlbSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0uaW5kZXghO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc3BlY2lmaWVkIGhlaWdodC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf6auY44GV44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uaXRlbS5oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGlmIGNoaWxkIG5vZGUgZXhpc3RzLlxuICAgICAqIEBqYSBjaGlsZCBub2RlIOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBoYXNDaGlsZE5vZGUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuJGVsPy5jaGlsZHJlbigpLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGl0ZW0ncyBoZWlnaHQuXG4gICAgICogQGphIGl0ZW0g44Gu6auY44GV44KS5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3SGVpZ2h0XG4gICAgICogIC0gYGVuYCBuZXcgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7mlrDjgZfjgYTpq5jjgZVcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIG9wdGlvbnMgb2JqZWN0XG4gICAgICogIC0gYGphYCDmm7TmlrDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICB1cGRhdGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuJGVsICYmIHRoaXMuaGVpZ2h0ICE9PSBuZXdIZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0udXBkYXRlSGVpZ2h0KG5ld0hlaWdodCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB0aGlzLiRlbC5oZWlnaHQobmV3SGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgTnVsbGFibGUsXG4gICAgdHlwZSBVbmtub3duRnVuY3Rpb24sXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgdHlwZSBDb25uZWN0RXZlbnRNYXAsXG4gICAgdHlwZSBUaW1lckhhbmRsZSxcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBMaXN0U2Nyb2xsZXJGYWN0b3J5LFxuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdFNjcm9sbGVyLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBTY3JvbGxlckV2ZW50TWFwID0gSFRNTEVsZW1lbnRFdmVudE1hcCAmIENvbm5lY3RFdmVudE1hcCAmIHsgJ3Njcm9sbHN0b3AnOiBFdmVudDsgfTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgTUlOX1NDUk9MTFNUT1BfRFVSQVRJT04gPSA1MCxcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiB7QGxpbmsgSUxpc3RTY3JvbGxlcn0gaW1wbGVtZW50YXRpb24gY2xhc3MgZm9yIEhUTUxFbGVtZW50LlxuICogQGphIEhUTUxFbGVtZW50IOOCkuWvvuixoeOBqOOBl+OBnyB7QGxpbmsgSUxpc3RTY3JvbGxlcn0g5a6f6KOF44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBFbGVtZW50U2Nyb2xsZXIgaW1wbGVtZW50cyBJTGlzdFNjcm9sbGVyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kdGFyZ2V0OiBET007XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJHNjcm9sbE1hcDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX29wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxTdG9wVHJpZ2dlcjogRE9NRXZlbnRMaXN0ZW5lcjtcbiAgICBwcml2YXRlIF9zY3JvbGxEdXJhdGlvbj86IG51bWJlcjtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKHRhcmdldDogRE9NU2VsZWN0b3IsIG1hcDogRE9NU2VsZWN0b3IsIG9wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucykge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0ID0gJCh0YXJnZXQpO1xuICAgICAgICB0aGlzLl8kc2Nyb2xsTWFwID0gdGhpcy5fJHRhcmdldC5jaGlsZHJlbigpLmZpcnN0KCk7XG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgICAgIC8qXG4gICAgICAgICAqIGZpcmUgY3VzdG9tIGV2ZW50OiBgc2Nyb2xsc3RvcGBcbiAgICAgICAgICogYHNjcm9sbGVuZGAg44GuIFNhZmFyaSDlr77lv5zlvoXjgaFcbiAgICAgICAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9XZWIvQVBJL0VsZW1lbnQvc2Nyb2xsZW5kX2V2ZW50XG4gICAgICAgICAqL1xuICAgICAgICBsZXQgdGltZXI6IFRpbWVySGFuZGxlO1xuICAgICAgICB0aGlzLl9zY3JvbGxTdG9wVHJpZ2dlciA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHRpbWVyKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJHRhcmdldC50cmlnZ2VyKG5ldyBDdXN0b21FdmVudCgnc2Nyb2xsc3RvcCcsIHsgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSB9KSk7XG4gICAgICAgICAgICB9LCB0aGlzLl9zY3JvbGxEdXJhdGlvbiA/PyBDb25zdC5NSU5fU0NST0xMU1RPUF9EVVJBVElPTik7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub24oJ3Njcm9sbCcsIHRoaXMuX3Njcm9sbFN0b3BUcmlnZ2VyKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKiDjgr/jgqTjg5flrprnvqnorZjliKXlrZAgKi9cbiAgICBzdGF0aWMgZ2V0IFRZUEUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdjZHA6ZWxlbWVudC1vdmVyZmxvdy1zY3JvbGxlcic7XG4gICAgfVxuXG4gICAgLyoqIGZhY3Rvcnkg5Y+W5b6XICovXG4gICAgc3RhdGljIGdldEZhY3RvcnkoKTogTGlzdFNjcm9sbGVyRmFjdG9yeSB7XG4gICAgICAgIGNvbnN0IGZhY3RvcnkgPSAodGFyZ2V0OiBET01TZWxlY3RvciwgbWFwOiBET01TZWxlY3Rvciwgb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zKTogSUxpc3RTY3JvbGxlciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEVsZW1lbnRTY3JvbGxlcih0YXJnZXQsIG1hcCwgb3B0aW9ucyk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIHNldCB0eXBlIHNpZ25hdHVyZS5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoZmFjdG9yeSwge1xuICAgICAgICAgICAgdHlwZToge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IEVsZW1lbnRTY3JvbGxlci5UWVBFLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWN0b3J5IGFzIExpc3RTY3JvbGxlckZhY3Rvcnk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxlclxuXG4gICAgLyoqIFNjcm9sbGVyIOOBruWei+aDheWgseOCkuWPluW+lyAqL1xuICAgIGdldCB0eXBlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBFbGVtZW50U2Nyb2xsZXIuVFlQRTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u5Y+W5b6XICovXG4gICAgZ2V0IHBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AoKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5pyA5aSn5YCk5L2N572u44KS5Y+W5b6XICovXG4gICAgZ2V0IHBvc01heCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5fJHNjcm9sbE1hcC5oZWlnaHQoKSAtIHRoaXMuXyR0YXJnZXQuaGVpZ2h0KCksIDApO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jnmbvpjLIgKi9cbiAgICBvbih0eXBlOiAnc2Nyb2xsJyB8ICdzY3JvbGxzdG9wJywgY2FsbGJhY2s6IERPTUV2ZW50TGlzdGVuZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vbjxTY3JvbGxlckV2ZW50TWFwPih0eXBlLCBjYWxsYmFjayBhcyBVbmtub3duRnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jnmbvpjLLop6PpmaQgKi9cbiAgICBvZmYodHlwZTogJ3Njcm9sbCcgfCAnc2Nyb2xsc3RvcCcsIGNhbGxiYWNrOiBET01FdmVudExpc3RlbmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub2ZmPFNjcm9sbGVyRXZlbnRNYXA+KHR5cGUsIGNhbGxiYWNrIGFzIFVua25vd25GdW5jdGlvbik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiAqL1xuICAgIHNjcm9sbFRvKHBvczogbnVtYmVyLCBhbmltYXRlPzogYm9vbGVhbiwgdGltZT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAocG9zID09PSB0aGlzLl8kdGFyZ2V0LnNjcm9sbFRvcCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPSAoYW5pbWF0ZSA/PyB0aGlzLl9vcHRpb25zLmVuYWJsZUFuaW1hdGlvbikgPyB0aW1lID8/IHRoaXMuX29wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl8kdGFyZ2V0LnNjcm9sbFRvcChwb3MsIHRoaXMuX3Njcm9sbER1cmF0aW9uLCB1bmRlZmluZWQsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY3JvbGxEdXJhdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOOBrueKtuaFi+abtOaWsCAqL1xuICAgIHVwZGF0ZSgpOiB2b2lkIHtcbiAgICAgICAgLy8gbm9vcFxuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDjga7noLTmo4QgKi9cbiAgICBkZXN0cm95KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Py5vZmYoKTtcbiAgICAgICAgKHRoaXMuXyR0YXJnZXQgYXMgTnVsbGFibGU8RE9NPikgPSAodGhpcy5fJHNjcm9sbE1hcCBhcyBOdWxsYWJsZTxET00+KSA9IG51bGw7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIHBvc3QsXG4gICAgbm9vcCxcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvSGVscFN0cmluZyxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB7XG4gICAgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzLFxuICAgIHNldFRyYW5zZm9ybVRyYW5zaXRpb24sXG4gICAgY2xlYXJUcmFuc2l0aW9uLFxufSBmcm9tICdAY2RwL3VpLXV0aWxzJztcbmltcG9ydCB0eXBlIHtcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RDb250ZXh0LFxuICAgIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyxcbiAgICBJTGlzdFNjcm9sbGVyLFxuICAgIElMaXN0T3BlcmF0aW9uLFxuICAgIElMaXN0U2Nyb2xsYWJsZSxcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUsXG4gICAgSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IExpc3RWaWV3R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vZ2xvYmFsLWNvbmZpZyc7XG5pbXBvcnQgeyBJdGVtUHJvZmlsZSwgUGFnZVByb2ZpbGUgfSBmcm9tICcuLi9wcm9maWxlJztcbmltcG9ydCB7IEVsZW1lbnRTY3JvbGxlciB9IGZyb20gJy4vZWxlbWVudC1zY3JvbGxlcic7XG5cbi8qKiBMaXN0Q29udGV4dE9wdGlvbnMg5pei5a6a5YCkICovXG5jb25zdCBfZGVmYXVsdE9wdHM6IFJlcXVpcmVkPExpc3RDb250ZXh0T3B0aW9ucz4gPSB7XG4gICAgc2Nyb2xsZXJGYWN0b3J5OiBFbGVtZW50U2Nyb2xsZXIuZ2V0RmFjdG9yeSgpLFxuICAgIGVuYWJsZUhpZGRlblBhZ2U6IGZhbHNlLFxuICAgIGVuYWJsZVRyYW5zZm9ybU9mZnNldDogdHJ1ZSxcbiAgICBzY3JvbGxNYXBSZWZyZXNoSW50ZXJ2YWw6IDIwMCxcbiAgICBzY3JvbGxSZWZyZXNoRGlzdGFuY2U6IDIwMCxcbiAgICBwYWdlUHJlcGFyZUNvdW50OiAzLFxuICAgIHBhZ2VQcmVsb2FkQ291bnQ6IDEsXG4gICAgZW5hYmxlQW5pbWF0aW9uOiB0cnVlLFxuICAgIGFuaW1hdGlvbkR1cmF0aW9uOiAwLFxuICAgIGJhc2VEZXB0aDogJ2F1dG8nLFxuICAgIGl0ZW1UYWdOYW1lOiAnZGl2JyxcbiAgICByZW1vdmVJdGVtV2l0aFRyYW5zaXRpb246IHRydWUsXG4gICAgdXNlRHVtbXlJbmFjdGl2ZVNjcm9sbE1hcDogZmFsc2UsXG59O1xuXG4vKiogaW52YWxpZCBpbnN0YW5jZSAqL1xuY29uc3QgXyRpbnZhbGlkID0gJCgpIGFzIERPTTtcblxuLyoqIOWIneacn+WMlua4iOOBv+OBi+aknOiovCAqL1xuZnVuY3Rpb24gdmVyaWZ5PFQ+KHg6IFQgfCB1bmRlZmluZWQpOiBhc3NlcnRzIHggaXMgVCB7XG4gICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04pO1xuICAgIH1cbn1cblxuLyoqIG92ZXJmbG93LXkg44KS5L+d6Ki8ICovXG5mdW5jdGlvbiBlbnN1cmVPdmVyZmxvd1koJGVsOiBET00pOiBET00ge1xuICAgIGNvbnN0IG92ZXJmbG93WSA9ICRlbC5jc3MoJ292ZXJmbG93LXknKTtcbiAgICBpZiAoJ2hpZGRlbicgPT09IG92ZXJmbG93WSB8fCAndmlzaWJsZScgPT09IG92ZXJmbG93WSkge1xuICAgICAgICAkZWwuY3NzKCdvdmVyZmxvdy15JywgJ2F1dG8nKTtcbiAgICB9XG4gICAgcmV0dXJuICRlbDtcbn1cblxuLyoqIHNjcm9sbC1tYXAgZWxlbWVudCDjgpLkv53oqLwgKi9cbmZ1bmN0aW9uIGVuc3VyZVNjcm9sbE1hcCgkcm9vdDogRE9NLCBtYXBDbGFzczogc3RyaW5nKTogRE9NIHtcbiAgICBsZXQgJG1hcCA9ICRyb290LmZpbmQoYC4ke21hcENsYXNzfWApO1xuICAgIC8vICRtYXAg44GM54Sh44GE5aC05ZCI44Gv5L2c5oiQ44GZ44KLXG4gICAgaWYgKCRtYXAubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgJG1hcCA9ICQoYDxkaXYgY2xhc3M9XCIke21hcENsYXNzfVwiPjwvZGl2PmApO1xuICAgICAgICAkcm9vdC5hcHBlbmQoJG1hcCk7XG4gICAgfVxuICAgIHJldHVybiAkbWFwO1xufVxuXG4vKiogQGludGVybmFsIOOCouOCpOODhuODoOWJiumZpOaDheWgsSAqL1xuaW50ZXJmYWNlIFJlbW92ZUl0ZW1zQ29udGV4dCB7XG4gICAgcmVtb3ZlZDogSXRlbVByb2ZpbGVbXTtcbiAgICBkZWx0YTogbnVtYmVyO1xuICAgIHRyYW5zaXRpb246IGJvb2xlYW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIENvcmUgbG9naWMgaW1wbGVtZW50YXRpb24gY2xhc3MgZm9yIHNjcm9sbCBwcm9jZXNzaW5nIHRoYXQgbWFuYWdlcyBtZW1vcnkuIEFjY2Vzc2VzIHRoZSBET00uXG4gKiBAamEg44Oh44Oi44Oq566h55CG44KS6KGM44GG44K544Kv44Ot44O844Or5Yem55CG44Gu44Kz44Ki44Ot44K444OD44Kv5a6f6KOF44Kv44Op44K5LiBET00g44Gr44Ki44Kv44K744K544GZ44KLLlxuICovXG5leHBvcnQgY2xhc3MgTGlzdENvcmUgaW1wbGVtZW50cyBJTGlzdENvbnRleHQsIElMaXN0T3BlcmF0aW9uLCBJTGlzdFNjcm9sbGFibGUsIElMaXN0QmFja3VwUmVzdG9yZSB7XG4gICAgcHJpdmF0ZSBfJHJvb3Q6IERPTTtcbiAgICBwcml2YXRlIF8kbWFwOiBET007XG4gICAgcHJpdmF0ZSBfbWFwSGVpZ2h0ID0gMDtcbiAgICBwcml2YXRlIF9zY3JvbGxlcjogSUxpc3RTY3JvbGxlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKiBVSSDooajnpLrkuK3jgasgdHJ1ZSAqL1xuICAgIHByaXZhdGUgX2FjdGl2ZSA9IHRydWU7XG5cbiAgICAvKiog5Yid5pyf44Kq44OX44K344On44Oz44KS5qC857SNICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2V0dGluZ3M6IFJlcXVpcmVkPExpc3RDb250ZXh0T3B0aW9ucz47XG4gICAgLyoqIFNjcm9sbCBFdmVudCBIYW5kbGVyICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogU2Nyb2xsIFN0b3AgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbFN0b3BFdmVudEhhbmRsZXI6IChldj86IEV2ZW50KSA9PiB2b2lkO1xuICAgIC8qKiAx44Oa44O844K45YiG44Gu6auY44GV44Gu5Z+65rqW5YCkICovXG4gICAgcHJpdmF0ZSBfYmFzZUhlaWdodCA9IDA7XG4gICAgLyoqIOeuoeeQhuS4i+OBq+OBguOCiyBJdGVtUHJvZmlsZSDphY3liJcgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgUGFnZVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfcGFnZXM6IFBhZ2VQcm9maWxlW10gPSBbXTtcblxuICAgIC8qKiDmnIDmlrDjga7ooajnpLrpoJjln5/mg4XloLHjgpLmoLzntI0gKFNjcm9sbCDkuK3jga7mm7TmlrDlh6bnkIbjgavkvb/nlKgpICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0ID0ge1xuICAgICAgICBpbmRleDogMCxcbiAgICAgICAgZnJvbTogMCxcbiAgICAgICAgdG86IDAsXG4gICAgICAgIHBvczogMCwgICAgLy8gc2Nyb2xsIHBvc2l0aW9uXG4gICAgfTtcblxuICAgIC8qKiDjg4fjg7zjgr/jga4gYmFja3VwIOmgmOWfny4ga2V5IOOBqCBfaXRlbXMg44KS5qC857SNICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYmFja3VwOiBSZWNvcmQ8c3RyaW5nLCB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9PiA9IHt9O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RDb250ZXh0T3B0aW9ucykge1xuICAgICAgICB0aGlzLl8kcm9vdCA9IHRoaXMuXyRtYXAgPSBfJGludmFsaWQ7XG4gICAgICAgIHRoaXMuX3NldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgX2RlZmF1bHRPcHRzLCBvcHRpb25zKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uU2Nyb2xsKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbFN0b3AodGhpcy5fc2Nyb2xsZXIhLnBvcyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKiog5YaF6YOo44Kq44OW44K444Kn44Kv44OI44Gu5Yid5pyf5YyWICovXG4gICAgcHVibGljIGluaXRpYWxpemUoJHJvb3Q6IERPTSwgaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgLy8g5pei44Gr5qeL56+J44GV44KM44Gm44GE44Gf5aC05ZCI44Gv56C05qOEXG4gICAgICAgIGlmICh0aGlzLl8kcm9vdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fJHJvb3QgPSBlbnN1cmVPdmVyZmxvd1koJHJvb3QpO1xuICAgICAgICB0aGlzLl8kbWFwICA9IGVuc3VyZVNjcm9sbE1hcCh0aGlzLl8kcm9vdCwgdGhpcy5fY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1MpO1xuXG4gICAgICAgIHRoaXMuX3Njcm9sbGVyID0gdGhpcy5jcmVhdGVTY3JvbGxlcigpO1xuICAgICAgICB0aGlzLnNldEJhc2VIZWlnaHQoaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5zZXRTY3JvbGxlckNvbmRpdGlvbigpO1xuICAgIH1cblxuICAgIC8qKiDlhoXpg6jjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4QgKi9cbiAgICBwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5yZXNldFNjcm9sbGVyQ29uZGl0aW9uKCk7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5kZXN0cm95KCk7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSB0aGlzLl8kbWFwID0gXyRpbnZhbGlkO1xuICAgIH1cblxuICAgIC8qKiDjg5rjg7zjgrjjga7ln7rmupblgKTjgpLlj5blvpcgKi9cbiAgICBwdWJsaWMgc2V0QmFzZUhlaWdodChoZWlnaHQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAoaGVpZ2h0IDw9IDApIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtiYXNlIGhpZ2h0OiAke2hlaWdodH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9iYXNlSGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8udXBkYXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIGFjdGl2ZSDnirbmhYvoqK3lrpogKi9cbiAgICBwdWJsaWMgYXN5bmMgc2V0QWN0aXZlU3RhdGUoYWN0aXZlOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuX2FjdGl2ZSA9IGFjdGl2ZTtcbiAgICAgICAgYXdhaXQgdGhpcy50cmVhdFNjcm9sbFBvc2l0aW9uKCk7XG4gICAgfVxuXG4gICAgLyoqIGFjdGl2ZSDnirbmhYvliKTlrpogKi9cbiAgICBnZXQgYWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWN0aXZlO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7kv53lrZgv5b6p5YWDICovXG4gICAgcHVibGljIGFzeW5jIHRyZWF0U2Nyb2xsUG9zaXRpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gKHRoaXMuX3Njcm9sbGVyLnBvcyAtIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MpO1xuICAgICAgICBjb25zdCB7IHVzZUR1bW15SW5hY3RpdmVTY3JvbGxNYXA6IHVzZUR1bW15TWFwIH0gPSB0aGlzLl9zZXR0aW5ncztcblxuICAgICAgICBjb25zdCB1cGRhdGVPZmZzZXQgPSAoJHRhcmdldDogRE9NKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zbGF0ZVkgfSA9IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcygkdGFyZ2V0WzBdKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQgIT09IHRyYW5zbGF0ZVkpIHtcbiAgICAgICAgICAgICAgICAkdGFyZ2V0LmNzcygndHJhbnNmb3JtJywgYHRyYW5zbGF0ZTNkKDAsJHtvZmZzZXR9cHgsMGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Njcm9sbGVyLnNjcm9sbFRvKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MsIGZhbHNlLCAwKTtcbiAgICAgICAgICAgIHRoaXMuXyRtYXAuY3NzKHsgJ3RyYW5zZm9ybSc6ICcnLCAnZGlzcGxheSc6ICdibG9jaycgfSk7XG4gICAgICAgICAgICBpZiAodXNlRHVtbXlNYXApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXBhcmVJbmFjdGl2ZU1hcCgpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgJG1hcCA9IHVzZUR1bW15TWFwID8gdGhpcy5wcmVwYXJlSW5hY3RpdmVNYXAoKSA6IHRoaXMuXyRtYXA7XG4gICAgICAgICAgICB1cGRhdGVPZmZzZXQoJG1hcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdENvbnRleHRcblxuICAgIC8qKiBnZXQgc2Nyb2xsLW1hcCBlbGVtZW50ICovXG4gICAgZ2V0ICRzY3JvbGxNYXAoKTogRE9NIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXA7XG4gICAgfVxuXG4gICAgLyoqIGdldCBzY3JvbGwtbWFwIGhlaWdodCBbcHhdICovXG4gICAgZ2V0IHNjcm9sbE1hcEhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcC5sZW5ndGggPyB0aGlzLl9tYXBIZWlnaHQgOiAwO1xuICAgIH1cblxuICAgIC8qKiBnZXQge0BsaW5rIExpc3RDb250ZXh0T3B0aW9uc30gKi9cbiAgICBnZXQgb3B0aW9ucygpOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiB1cGRhdGUgc2Nyb2xsLW1hcCBoZWlnaHQgKGRlbHRhIFtweF0pICovXG4gICAgdXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRtYXAubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9tYXBIZWlnaHQgKz0gTWF0aC50cnVuYyhkZWx0YSk7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlLlxuICAgICAgICAgICAgaWYgKHRoaXMuX21hcEhlaWdodCA8IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tYXBIZWlnaHQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQodGhpcy5fbWFwSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiB1cGRhdGUgaW50ZXJuYWwgcHJvZmlsZSAqL1xuICAgIHVwZGF0ZVByb2ZpbGVzKGZyb206IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IF9pdGVtcyB9ID0gdGhpcztcbiAgICAgICAgZm9yIChsZXQgaSA9IGZyb20sIG4gPSBfaXRlbXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoMCA8IGkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gX2l0ZW1zW2kgLSAxXTtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSBsYXN0LmluZGV4ISArIDE7XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLm9mZnNldCA9IGxhc3Qub2Zmc2V0ICsgbGFzdC5oZWlnaHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLm9mZnNldCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZ2V0IHJlY3ljbGFibGUgZWxlbWVudCAqL1xuICAgIGZpbmRSZWN5Y2xlRWxlbWVudHMoKTogRE9NIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXAuZmluZChgLiR7dGhpcy5fY29uZmlnLlJFQ1lDTEVfQ0xBU1N9YCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RWaWV3XG5cbiAgICAvKiog5Yid5pyf5YyW5riI44G/44GL5Yik5a6aICovXG4gICAgZ2V0IGlzSW5pdGlhbGl6ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX3Njcm9sbGVyO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAqL1xuICAgIGFkZEl0ZW0oaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIGluZm86IFVua25vd25PYmplY3QsIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2FkZEl0ZW0obmV3IEl0ZW1Qcm9maWxlKHRoaXMsIE1hdGgudHJ1bmMoaGVpZ2h0KSwgaW5pdGlhbGl6ZXIsIGluZm8pLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqIGl0ZW0g55m76YyyICjlhoXpg6jnlKgpICovXG4gICAgX2FkZEl0ZW0oaXRlbTogSXRlbVByb2ZpbGUgfCBJdGVtUHJvZmlsZVtdLCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IEFycmF5LmlzQXJyYXkoaXRlbSkgPyBpdGVtIDogW2l0ZW1dO1xuICAgICAgICBsZXQgZGVsdGFIZWlnaHQgPSAwO1xuICAgICAgICBsZXQgYWRkVGFpbCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChudWxsID09IGluc2VydFRvIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluc2VydFRvKSB7XG4gICAgICAgICAgICBpbnNlcnRUbyA9IHRoaXMuX2l0ZW1zLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbnNlcnRUbyA9PT0gdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhZGRUYWlsID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNjcm9sbCBtYXAg44Gu5pu05pawXG4gICAgICAgIGZvciAoY29uc3QgaXQgb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGRlbHRhSGVpZ2h0ICs9IGl0LmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YUhlaWdodCk7XG5cbiAgICAgICAgLy8g5oy/5YWlXG4gICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpbnNlcnRUbywgMCwgLi4uaXRlbXMpO1xuXG4gICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgIGlmICghYWRkVGFpbCkge1xuICAgICAgICAgICAgaWYgKDAgPT09IGluc2VydFRvKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpbnNlcnRUbyAtIDFdLnBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKHRoaXMuX2l0ZW1zW2luc2VydFRvIC0gMV0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgdGhpcy51cGRhdGVQcm9maWxlcyhpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpCAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciwgc2l6ZT86IG51bWJlciwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyIHwgbnVtYmVyW10sIGFyZzI/OiBudW1iZXIsIGFyZzM/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVJdGVtUmFuZG9tbHkoaW5kZXgsIGFyZzIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSXRlbUNvbnRpbnVvdXNseShpbmRleCwgYXJnMiwgYXJnMyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogaGVscGVyOiDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7ogKi9cbiAgICBwcml2YXRlIF9xdWVyeVJlbW92ZUl0ZW1zQ29udGV4dChpbmRleGVzOiBudW1iZXJbXSwgZGVsYXk6IG51bWJlcik6IFJlbW92ZUl0ZW1zQ29udGV4dCB7XG4gICAgICAgIGNvbnN0IHJlbW92ZWQ6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgbGV0IGRlbHRhID0gMDtcbiAgICAgICAgbGV0IHRyYW5zaXRpb24gPSBmYWxzZTtcblxuICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5faXRlbXNbaWR4XTtcbiAgICAgICAgICAgIGRlbHRhICs9IGl0ZW0uaGVpZ2h0O1xuICAgICAgICAgICAgLy8g5YmK6Zmk6KaB57Sg44GuIHotaW5kZXgg44Gu5Yid5pyf5YyWXG4gICAgICAgICAgICBpdGVtLnJlc2V0RGVwdGgoKTtcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChpdGVtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyDoh6rli5XoqK3lrprjg7vliYrpmaTpgYXlu7bmmYLplpPjgYzoqK3lrprjgZXjgozjgYvjgaTjgIHjgrnjgq/jg63jg7zjg6vjg53jgrjjgrfjg6fjg7PjgavlpInmm7TjgYzjgYLjgovloLTlkIjjga8gdHJhbnNpdGlvbiDoqK3lrppcbiAgICAgICAgaWYgKHRoaXMuX3NldHRpbmdzLnJlbW92ZUl0ZW1XaXRoVHJhbnNpdGlvbiAmJiAoMCA8IGRlbGF5KSkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IHRoaXMuc2Nyb2xsUG9zO1xuICAgICAgICAgICAgY29uc3QgcG9zTWF4ID0gdGhpcy5zY3JvbGxQb3NNYXggLSBkZWx0YTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24gPSAocG9zTWF4IDwgY3VycmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyByZW1vdmVkLCBkZWx0YSwgdHJhbnNpdGlvbiB9O1xuICAgIH1cblxuICAgIC8qKiBoZWxwZXI6IOWJiumZpOaZguOBruabtOaWsCAqL1xuICAgIHByaXZhdGUgX3VwZGF0ZVdpdGhSZW1vdmVJdGVtc0NvbnRleHQoY29udGV4dDogUmVtb3ZlSXRlbXNDb250ZXh0LCBkZWxheTogbnVtYmVyLCBwcm9maWxlVXBkYXRlOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgcmVtb3ZlZCwgZGVsdGEsIHRyYW5zaXRpb24gfSA9IGNvbnRleHQ7XG5cbiAgICAgICAgLy8gdHJhbnNpdGlvbiDoqK3lrppcbiAgICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dXBTY3JvbGxNYXBUcmFuc2l0aW9uKGRlbGF5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGN1c3RvbWl6ZSBwb2ludDog44OX44Ot44OV44Kh44Kk44Or44Gu5pu05pawXG4gICAgICAgIHByb2ZpbGVVcGRhdGUoKTtcblxuICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vpoJjln5/jga7mm7TmlrBcbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxNYXBIZWlnaHQoLWRlbHRhKTtcbiAgICAgICAgLy8g6YGF5bu25YmK6ZmkXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHJlbW92ZWQpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZGVsYXkpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbVByb2ZpbGUg44KS5YmK6ZmkOiDpgKPntpogaW5kZXgg54mIICovXG4gICAgcHJpdmF0ZSBfcmVtb3ZlSXRlbUNvbnRpbnVvdXNseShpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIgfCB1bmRlZmluZWQsIGRlbGF5OiBudW1iZXIgfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICAgICAgc2l6ZSA9IHNpemUgPz8gMTtcbiAgICAgICAgZGVsYXkgPSBkZWxheSA/PyAwO1xuXG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5faXRlbXMubGVuZ3RoIDwgaW5kZXggKyBzaXplKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbcmVtb3ZlSXRlbSgpLCBpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6XG4gICAgICAgIGNvbnN0IGluZGV4ZXMgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiBzaXplIH0sIChfLCBpKSA9PiBpbmRleCArIGkpO1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlcywgZGVsYXkpO1xuXG4gICAgICAgIC8vIOabtOaWsFxuICAgICAgICB0aGlzLl91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQsIGRlbGF5LCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaW5kZXhdLnBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKHRoaXMuX2l0ZW1zW2luZGV4XS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g6YWN5YiX44GL44KJ5YmK6ZmkXG4gICAgICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaW5kZXgsIHNpemUpO1xuICAgICAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9maWxlcyhpbmRleCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbVByb2ZpbGUg44KS5YmK6ZmkOiByYW5kb20gYWNjZXNzIOeJiCAqL1xuICAgIHByaXZhdGUgX3JlbW92ZUl0ZW1SYW5kb21seShpbmRleGVzOiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgZGVsYXkgPSBkZWxheSA/PyAwO1xuICAgICAgICBpbmRleGVzLnNvcnQoKGxocywgcmhzKSA9PiByaHMgLSBsaHMpOyAvLyDpmY3poIbjgr3jg7zjg4hcblxuICAgICAgICBmb3IgKGNvbnN0IGluZGV4IG9mIGluZGV4ZXMpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5faXRlbXMubGVuZ3RoIDwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtyZW1vdmVJdGVtKCksIGludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9xdWVyeVJlbW92ZUl0ZW1zQ29udGV4dChpbmRleGVzLCBkZWxheSk7XG5cbiAgICAgICAgLy8g5pu05pawXG4gICAgICAgIHRoaXMuX3VwZGF0ZVdpdGhSZW1vdmVJdGVtc0NvbnRleHQoY29udGV4dCwgZGVsYXksICgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaWR4IG9mIGluZGV4ZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2lkeF0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKHRoaXMuX2l0ZW1zW2lkeF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8g6YWN5YiX44GL44KJ5YmK6ZmkXG4gICAgICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IGluZGV4ZXNbaW5kZXhlcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoZmlyc3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiogc2Nyb2xsIG1hcCDjga7jg4jjg6njg7Pjgrjjgrfjg6fjg7PoqK3lrpogKi9cbiAgICBwcml2YXRlIHNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG4gICAgICAgIGNvbnN0IGVsID0gdGhpcy5fJG1hcFswXTtcbiAgICAgICAgdGhpcy5fJG1hcC50cmFuc2l0aW9uRW5kKCgpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVHJhbnNpdGlvbihlbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uKGVsLCAnaGVpZ2h0JywgZGVsYXksICdlYXNlJyk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBpdGVtIOOBq+ioreWumuOBl+OBn+aDheWgseOCkuWPluW+lyAqL1xuICAgIGdldEl0ZW1JbmZvKHRhcmdldDogbnVtYmVyIHwgRXZlbnQpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgY29uc3QgeyBfaXRlbXMsIF9jb25maWcgfSA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgcGFyc2VyID0gKCR0YXJnZXQ6IERPTSk6IG51bWJlciA9PiB7XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5oYXNDbGFzcyhfY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlcigkdGFyZ2V0LmF0dHIoX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHRhcmdldC5oYXNDbGFzcyhfY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1MpIHx8ICR0YXJnZXQubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2Nhbm5vdCBkaXRlY3QgaXRlbSBmcm9tIGV2ZW50IG9iamVjdC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VyKCR0YXJnZXQucGFyZW50KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGFyZ2V0IGluc3RhbmNlb2YgRXZlbnQgPyBwYXJzZXIoJCh0YXJnZXQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KSkgOiBOdW1iZXIodGFyZ2V0KTtcblxuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKGluZGV4KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3Vuc3VwcG9ydGVkIHR5cGU6ICR7dHlwZW9mIHRhcmdldH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbmRleCA8IDAgfHwgX2l0ZW1zLmxlbmd0aCA8PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gZ2V0SXRlbUluZm8oKSBbaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBfaXRlbXNbaW5kZXhdLmluZm87XG4gICAgfVxuXG4gICAgLyoqIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsCAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgX3BhZ2VzLCBfaXRlbXMsIF9zZXR0aW5ncywgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCB9ID0gdGhpcztcblxuICAgICAgICBjb25zdCB0YXJnZXRzOiBSZWNvcmQ8bnVtYmVyLCAnYWN0aXZhdGUnIHwgJ2hpZGUnIHwgJ2RlYWN0aXZhdGUnPiA9IHt9O1xuICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgY29uc3QgaGlnaFByaW9yaXR5SW5kZXg6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgY29uc3Qgc3RvcmVOZXh0UGFnZVN0YXRlID0gKGluZGV4OiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2FjdGl2YXRlJztcbiAgICAgICAgICAgICAgICBoaWdoUHJpb3JpdHlJbmRleC5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoTWF0aC5hYnMoY3VycmVudFBhZ2VJbmRleCAtIGluZGV4KSA8PSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2FjdGl2YXRlJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoX3NldHRpbmdzLmVuYWJsZUhpZGRlblBhZ2UpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdoaWRlJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnZGVhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjdXJyZW50IHBhZ2Ug44GuIOWJjeW+jOOBryBoaWdoIHByaW9yaXR5IOOBq+OBmeOCi1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRQYWdlSW5kZXggKyAxID09PSBpbmRleCB8fCBjdXJyZW50UGFnZUluZGV4IC0gMSA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBoaWdoUHJpb3JpdHlJbmRleC5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyDlr77osaHnhKHjgZdcbiAgICAgICAgaWYgKF9pdGVtcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hDb3VudCA9IF9zZXR0aW5ncy5wYWdlUHJlcGFyZUNvdW50ICsgX3NldHRpbmdzLnBhZ2VQcmVsb2FkQ291bnQ7XG4gICAgICAgICAgICBjb25zdCBiZWdpbkluZGV4ID0gY3VycmVudFBhZ2VJbmRleCAtIHNlYXJjaENvdW50O1xuICAgICAgICAgICAgY29uc3QgZW5kSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQ7XG5cbiAgICAgICAgICAgIGxldCBvdmVyZmxvd1ByZXYgPSAwLCBvdmVyZmxvd05leHQgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgcGFnZUluZGV4ID0gYmVnaW5JbmRleDsgcGFnZUluZGV4IDw9IGVuZEluZGV4OyBwYWdlSW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJmbG93UHJldisrO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gcGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJmbG93TmV4dCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgwIDwgb3ZlcmZsb3dQcmV2KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHBhZ2VJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggKyBzZWFyY2hDb3VudCArIDE7IGkgPCBvdmVyZmxvd1ByZXY7IGkrKywgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gcGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgwIDwgb3ZlcmZsb3dOZXh0KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHBhZ2VJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudCAtIDE7IGkgPCBvdmVyZmxvd05leHQ7IGkrKywgcGFnZUluZGV4LS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhZ2VJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOS4jeimgeOBq+OBquOBo+OBnyBwYWdlIOOBriDpnZ7mtLvmgKfljJZcbiAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIF9wYWdlcy5maWx0ZXIocGFnZSA9PiAnaW5hY3RpdmUnICE9PSBwYWdlLnN0YXR1cykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHRhcmdldHNbcGFnZS5pbmRleF0pIHtcbiAgICAgICAgICAgICAgICBwYWdlLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWEquWFiCBwYWdlIOOBriBhY3RpdmF0ZVxuICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBoaWdoUHJpb3JpdHlJbmRleC5zb3J0KChsaHMsIHJocykgPT4gbGhzIC0gcmhzKSkgeyAvLyDmmIfpoIbjgr3jg7zjg4hcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkICYmIF9wYWdlc1tpZHhdPy5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDjgZ3jga7jgbvjgYvjga4gcGFnZSDjga4g54q25oWL5aSJ5pu0XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldHMpKSB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IE51bWJlcihrZXkpO1xuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gdGFyZ2V0c1tpbmRleF07XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCAmJiBfcGFnZXNbaW5kZXhdPy5bYWN0aW9uXT8uKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOabtOaWsOW+jOOBq+S9v+eUqOOBl+OBquOBi+OBo+OBnyBET00g44KS5YmK6ZmkXG4gICAgICAgIHRoaXMuZmluZFJlY3ljbGVFbGVtZW50cygpLnJlbW92ZSgpO1xuXG4gICAgICAgIGNvbnN0IHBhZ2VDdXJyZW50ID0gX3BhZ2VzW2N1cnJlbnRQYWdlSW5kZXhdO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmZyb20gID0gcGFnZUN1cnJlbnQ/LmdldEl0ZW1GaXJzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnRvICAgID0gcGFnZUN1cnJlbnQ/LmdldEl0ZW1MYXN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggPSBjdXJyZW50UGFnZUluZGV4O1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiDmnKrjgqLjgrXjgqTjg7Pjg5rjg7zjgrjjgpLmp4vnr4kgKi9cbiAgICB1cGRhdGUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuYXNzaWduUGFnZShNYXRoLm1heCh0aGlzLl9wYWdlcy5sZW5ndGggLSAxLCAwKSk7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Ki44K144Kk44Oz44KS5YaN5qeL5oiQICovXG4gICAgcmVidWlsZCgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoKTtcbiAgICAgICAgdGhpcy5hc3NpZ25QYWdlKCk7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog566h6L2E44OH44O844K/44KS56C05qOEICovXG4gICAgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wYWdlcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pdGVtcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9tYXBIZWlnaHQgPSAwO1xuICAgICAgICB0aGlzLl8kbWFwLmhlaWdodCgwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAvKiogc2Nyb2xsZXIg44Gu56iu6aGe44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbGVyVHlwZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnR5cGU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxQb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy5wb3MgPz8gMDtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44Gu5pyA5aSn5YCk44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbFBvc01heCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnBvc01heCA/PyAwO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkICovXG4gICAgc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uW21ldGhvZF0oJ3Njcm9sbCcsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vntYLkuobjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkICovXG4gICAgc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LlttZXRob2RdKCdzY3JvbGxzdG9wJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiAqL1xuICAgIGFzeW5jIHNjcm9sbFRvKHBvczogbnVtYmVyLCBhbmltYXRlPzogYm9vbGVhbiwgdGltZT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIHBvc2l0aW9uLCB0b28gc21hbGwuIFtwb3M6ICR7cG9zfV1gKTtcbiAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fc2Nyb2xsZXIucG9zTWF4IDwgcG9zKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgcG9zaXRpb24sIHRvbyBiaWcuIFtwb3M6ICR7cG9zfV1gKTtcbiAgICAgICAgICAgIHBvcyA9IHRoaXMuX3Njcm9sbGVyLnBvc01heDtcbiAgICAgICAgfVxuICAgICAgICAvLyBwb3Mg44Gu44G/5YWI6aeG44GR44Gm5pu05pawXG4gICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIGlmIChwb3MgIT09IHRoaXMuX3Njcm9sbGVyLnBvcykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fc2Nyb2xsZXIuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ8gaXRlbSDjga7ooajnpLrjgpLkv53oqLwgKi9cbiAgICBhc3luYyBlbnN1cmVWaXNpYmxlKGluZGV4OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBfc2Nyb2xsZXIsIF9pdGVtcywgX3NldHRpbmdzLCBfYmFzZUhlaWdodCB9ID0gdGhpcztcblxuICAgICAgICB2ZXJpZnkoX3Njcm9sbGVyKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBfaXRlbXMubGVuZ3RoIDw9IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBlbnN1cmVWaXNpYmxlKCkgW2ludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHBhcnRpYWxPSywgc2V0VG9wLCBhbmltYXRlLCB0aW1lLCBjYWxsYmFjayB9ID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBwYXJ0aWFsT0s6IHRydWUsXG4gICAgICAgICAgICBzZXRUb3A6IGZhbHNlLFxuICAgICAgICAgICAgYW5pbWF0ZTogX3NldHRpbmdzLmVuYWJsZUFuaW1hdGlvbixcbiAgICAgICAgICAgIHRpbWU6IF9zZXR0aW5ncy5hbmltYXRpb25EdXJhdGlvbixcbiAgICAgICAgICAgIGNhbGxiYWNrOiBub29wLFxuICAgICAgICB9LCBvcHRpb25zKSBhcyBSZXF1aXJlZDxMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnM+O1xuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRTY29wZSA9IHtcbiAgICAgICAgICAgIGZyb206IF9zY3JvbGxlci5wb3MsXG4gICAgICAgICAgICB0bzogX3Njcm9sbGVyLnBvcyArIF9iYXNlSGVpZ2h0LFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IF9pdGVtc1tpbmRleF07XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0U2NvcGUgPSB7XG4gICAgICAgICAgICBmcm9tOiB0YXJnZXQub2Zmc2V0LFxuICAgICAgICAgICAgdG86IHRhcmdldC5vZmZzZXQgKyB0YXJnZXQuaGVpZ2h0LFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGlzSW5TY29wZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWFsT0spIHtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0U2NvcGUuZnJvbSA8PSBjdXJyZW50U2NvcGUuZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFNjb3BlLmZyb20gPD0gdGFyZ2V0U2NvcGUudG87XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFNjb3BlLmZyb20gPD0gY3VycmVudFNjb3BlLnRvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRTY29wZS5mcm9tIDw9IHRhcmdldFNjb3BlLmZyb20gJiYgdGFyZ2V0U2NvcGUudG8gPD0gY3VycmVudFNjb3BlLnRvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRldGVjdFBvc2l0aW9uID0gKCk6IG51bWJlciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0U2NvcGUuZnJvbSA8IGN1cnJlbnRTY29wZS5mcm9tXG4gICAgICAgICAgICAgICAgPyB0YXJnZXRTY29wZS5mcm9tXG4gICAgICAgICAgICAgICAgOiB0YXJnZXQub2Zmc2V0IC0gdGFyZ2V0LmhlaWdodCAvLyBib3R0b20g5ZCI44KP44Gb44Gv5oOF5aCx5LiN6Laz44Gr44KI44KK5LiN5Y+vXG4gICAgICAgICAgICA7XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IHBvczogbnVtYmVyO1xuICAgICAgICBpZiAoc2V0VG9wKSB7XG4gICAgICAgICAgICBwb3MgPSB0YXJnZXRTY29wZS5mcm9tO1xuICAgICAgICB9IGVsc2UgaWYgKGlzSW5TY29wZSgpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfc2Nyb2xsZXIucG9zKTtcbiAgICAgICAgICAgIHJldHVybjsgLy8gbm9vcFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcG9zID0gZGV0ZWN0UG9zaXRpb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICAgICAgY2FsbGJhY2socG9zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYwgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgdGhpcy5fYmFja3VwW2tleV0gPSB7IGl0ZW1zOiB0aGlzLl9pdGVtcyB9O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FkZEl0ZW0odGhpcy5fYmFja3VwW2tleV0uaXRlbXMpO1xuXG4gICAgICAgIGlmIChyZWJ1aWxkKSB7XG4gICAgICAgICAgICB0aGlzLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo0gKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhCAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMuX2JhY2t1cCkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrkgKi9cbiAgICBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aICovXG4gICAgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfSk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhLml0ZW1zKSkge1xuICAgICAgICAgICAgdGhpcy5fYmFja3VwW2tleV0gPSBkYXRhO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZ2V0IF9jb25maWcoKTogTGlzdFZpZXdHbG9iYWxDb25maWcge1xuICAgICAgICByZXR1cm4gTGlzdFZpZXdHbG9iYWxDb25maWcoKTtcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg55So55Kw5aKD6Kit5a6aICovXG4gICAgcHJpdmF0ZSBzZXRTY3JvbGxlckNvbmRpdGlvbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9uKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub24oJ3Njcm9sbHN0b3AnLCB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg55So55Kw5aKD56C05qOEICovXG4gICAgcHJpdmF0ZSByZXNldFNjcm9sbGVyQ29uZGl0aW9uKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub2ZmKCdzY3JvbGxzdG9wJywgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vZmYoJ3Njcm9sbCcsIHRoaXMuX3Njcm9sbEV2ZW50SGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOaXouWumuOBriBTY3JvbGxlciDjgqrjg5bjgrjjgqfjgq/jg4jjga7kvZzmiJAgKi9cbiAgICBwcml2YXRlIGNyZWF0ZVNjcm9sbGVyKCk6IElMaXN0U2Nyb2xsZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2V0dGluZ3Muc2Nyb2xsZXJGYWN0b3J5KHRoaXMuXyRyb290LCB0aGlzLl8kbWFwLCB0aGlzLl9zZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLyoqIOePvuWcqOOBriBQYWdlIEluZGV4IOOCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgZ2V0UGFnZUluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIGNvbnN0IHsgX3Njcm9sbGVyLCBfYmFzZUhlaWdodCwgX3BhZ2VzIH0gPSB0aGlzO1xuICAgICAgICB2ZXJpZnkoX3Njcm9sbGVyKTtcblxuICAgICAgICBjb25zdCB7IHBvczogc2Nyb2xsUG9zLCBwb3NNYXg6IHNjcm9sbFBvc01heCB9ID0gX3Njcm9sbGVyO1xuXG4gICAgICAgIGNvbnN0IHNjcm9sbE1hcFNpemUgPSAoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbGFzdFBhZ2UgPSB0aGlzLmdldExhc3RQYWdlKCk7XG4gICAgICAgICAgICByZXR1cm4gbGFzdFBhZ2UgPyBsYXN0UGFnZS5vZmZzZXQgKyBsYXN0UGFnZS5oZWlnaHQgOiBfYmFzZUhlaWdodDtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBjb25zdCBwb3MgPSAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKDAgPT09IHNjcm9sbFBvc01heCB8fCBzY3JvbGxQb3NNYXggPD0gX2Jhc2VIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjcm9sbFBvcyAqIHNjcm9sbE1hcFNpemUgLyBzY3JvbGxQb3NNYXg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgY29uc3QgdmFsaWRSYW5nZSA9IChwYWdlOiBQYWdlUHJvZmlsZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFnZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFnZS5vZmZzZXQgPD0gcG9zICYmIHBvcyA8PSBwYWdlLm9mZnNldCArIHBhZ2UuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgY2FuZGlkYXRlID0gTWF0aC5mbG9vcihwb3MgLyBfYmFzZUhlaWdodCk7XG4gICAgICAgIGlmICgwICE9PSBjYW5kaWRhdGUgJiYgX3BhZ2VzLmxlbmd0aCA8PSBjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgIGNhbmRpZGF0ZSA9IF9wYWdlcy5sZW5ndGggLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBhZ2UgPSBfcGFnZXNbY2FuZGlkYXRlXTtcbiAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICB9IGVsc2UgaWYgKHBvcyA8IHBhZ2U/Lm9mZnNldCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNhbmRpZGF0ZSAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgcGFnZSA9IF9wYWdlc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FuZGlkYXRlICsgMSwgbiA9IF9wYWdlcy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYWdlID0gX3BhZ2VzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUud2FybihgY2Fubm90IGRldGVjdCBwYWdlIGluZGV4LiBmYWxsYmFjazogJHtfcGFnZXMubGVuZ3RoIC0gMX1gKTtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KDAsIF9wYWdlcy5sZW5ndGggLSAxKTtcbiAgICB9XG5cbiAgICAvKiog5pyA5b6M44Gu44Oa44O844K444KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBnZXRMYXN0UGFnZSgpOiBQYWdlUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICgwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGFnZXNbdGhpcy5fcGFnZXMubGVuZ3RoIC0gMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiCovXG4gICAgcHJpdmF0ZSBvblNjcm9sbChwb3M6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fYWN0aXZlICYmIDAgPCB0aGlzLl9wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICAgICAgLy8gVE9ETzogaW50ZXJzZWN0aW9uUmVjdCDjgpLkvb/nlKjjgZnjgovloLTlkIgsIFNjcm9sbCDjg4/jg7Pjg4njg6njg7zlhajoiKzjga/jganjgYbjgYLjgovjgbnjgY3jgYvopoHmpJzoqI5cbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhwb3MgLSB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zKSA8IHRoaXMuX3NldHRpbmdzLnNjcm9sbFJlZnJlc2hEaXN0YW5jZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggIT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyA9IHBvcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vlgZzmraLjgqTjg5njg7Pjg4ggKi9cbiAgICBwcml2YXRlIG9uU2Nyb2xsU3RvcChwb3M6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fYWN0aXZlICYmIDAgPCB0aGlzLl9wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCAhPT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyA9IHBvcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5rjg7zjgrjljLrliIbjga7jgqLjgrXjgqTjg7MgKi9cbiAgICBwcml2YXRlIGFzc2lnblBhZ2UoZnJvbT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLmNsZWFyUGFnZShmcm9tKTtcblxuICAgICAgICBjb25zdCB7IF9pdGVtcywgX3BhZ2VzLCBfYmFzZUhlaWdodCwgX3Njcm9sbGVyIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBiYXNlUGFnZSA9IHRoaXMuZ2V0TGFzdFBhZ2UoKTtcbiAgICAgICAgY29uc3QgbmV4dEl0ZW1JbmRleCA9IGJhc2VQYWdlPy5nZXRJdGVtTGFzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBjb25zdCBhc2lnbmVlSXRlbXMgID0gX2l0ZW1zLnNsaWNlKG5leHRJdGVtSW5kZXgpO1xuXG4gICAgICAgIGxldCB3b3JrUGFnZSA9IGJhc2VQYWdlO1xuICAgICAgICBpZiAobnVsbCA9PSB3b3JrUGFnZSkge1xuICAgICAgICAgICAgd29ya1BhZ2UgPSBuZXcgUGFnZVByb2ZpbGUoKTtcbiAgICAgICAgICAgIF9wYWdlcy5wdXNoKHdvcmtQYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBhc2lnbmVlSXRlbXMpIHtcbiAgICAgICAgICAgIGlmIChfYmFzZUhlaWdodCA8PSB3b3JrUGFnZS5oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICB3b3JrUGFnZS5ub3JtYWxpemUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdQYWdlID0gbmV3IFBhZ2VQcm9maWxlKCk7XG4gICAgICAgICAgICAgICAgbmV3UGFnZS5pbmRleCA9IHdvcmtQYWdlLmluZGV4ICsgMTtcbiAgICAgICAgICAgICAgICBuZXdQYWdlLm9mZnNldCA9IHdvcmtQYWdlLm9mZnNldCArIHdvcmtQYWdlLmhlaWdodDtcbiAgICAgICAgICAgICAgICB3b3JrUGFnZSA9IG5ld1BhZ2U7XG4gICAgICAgICAgICAgICAgX3BhZ2VzLnB1c2god29ya1BhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXRlbS5wYWdlSW5kZXggPSB3b3JrUGFnZS5pbmRleDtcbiAgICAgICAgICAgIHdvcmtQYWdlLnB1c2goaXRlbSk7XG4gICAgICAgIH1cblxuICAgICAgICB3b3JrUGFnZS5ub3JtYWxpemUoKTtcblxuICAgICAgICBfc2Nyb2xsZXI/LnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKiDjg5rjg7zjgrjljLrliIbjga7op6PpmaQgKi9cbiAgICBwcml2YXRlIGNsZWFyUGFnZShmcm9tPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3BhZ2VzLnNwbGljZShmcm9tID8/IDApO1xuICAgIH1cblxuICAgIC8qKiBpbmFjdGl2ZSDnlKggTWFwIOOBrueUn+aIkCAqL1xuICAgIHByaXZhdGUgcHJlcGFyZUluYWN0aXZlTWFwKCk6IERPTSB7XG4gICAgICAgIGNvbnN0IHsgX2NvbmZpZywgXyRtYXAsIF9tYXBIZWlnaHQgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0ICRwYXJlbnQgPSBfJG1hcC5wYXJlbnQoKTtcbiAgICAgICAgbGV0ICRpbmFjdGl2ZU1hcCA9ICRwYXJlbnQuZmluZChgLiR7X2NvbmZpZy5JTkFDVElWRV9DTEFTU31gKTtcblxuICAgICAgICBpZiAoJGluYWN0aXZlTWFwLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIGNvbnN0ICRsaXN0SXRlbVZpZXdzID0gXyRtYXAuY2xvbmUoKS5jaGlsZHJlbigpLmZpbHRlcigoXywgZWxlbWVudDogSFRNTEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlSW5kZXggPSBOdW1iZXIoJChlbGVtZW50KS5hdHRyKF9jb25maWcuREFUQV9QQUdFX0lOREVYKSk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRQYWdlSW5kZXggLSAxIDw9IHBhZ2VJbmRleCAmJiBwYWdlSW5kZXggPD0gY3VycmVudFBhZ2VJbmRleCArIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGluYWN0aXZlTWFwID0gJChgPHNlY3Rpb24gY2xhc3M9XCIke19jb25maWcuU0NST0xMX01BUF9DTEFTU30gJHtfY29uZmlnLklOQUNUSVZFX0NMQVNTfVwiPjwvc2VjdGlvbj5gKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoJGxpc3RJdGVtVmlld3MpXG4gICAgICAgICAgICAgICAgLmhlaWdodChfbWFwSGVpZ2h0KTtcbiAgICAgICAgICAgICRwYXJlbnQuYXBwZW5kKCRpbmFjdGl2ZU1hcCk7XG4gICAgICAgICAgICBfJG1hcC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICRpbmFjdGl2ZU1hcDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIGRvbSBhcyAkLFxuICAgIHR5cGUgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgVmlldyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RDb250ZXh0LFxuICAgIElMaXN0VmlldyxcbiAgICBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMsXG4gICAgSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgTGlzdENvcmUgfSBmcm9tICcuL2NvcmUvbGlzdCc7XG5pbXBvcnQgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBjb250ZXh0OiBMaXN0Q29yZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBjbGFzcyB0aGF0IHN0b3JlcyB7QGxpbmsgTGlzdFZpZXd9IGluaXRpYWxpemF0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIHtAbGluayBMaXN0Vmlld30g44Gu5Yid5pyf5YyW5oOF5aCx44KS5qC857SN44GZ44KL44Kk44Oz44K/44O844OV44Kn44Kk44K544Kv44Op44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBMaXN0Q29udGV4dE9wdGlvbnMsIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBpbml0aWFsSGVpZ2h0PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIEBlbiBWaXJ0dWFsIGxpc3QgdmlldyBjbGFzcyB0aGF0IHByb3ZpZGVzIG1lbW9yeSBtYW5hZ2VtZW50IGZ1bmN0aW9uYWxpdHkuXG4gKiBAamEg44Oh44Oi44Oq566h55CG5qmf6IO944KS5o+Q5L6b44GZ44KL5Luu5oOz44Oq44K544OI44OT44Ol44O844Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMaXN0VmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElMaXN0VmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBMaXN0Q29yZShvcHRpb25zKSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcblxuICAgICAgICB0aGlzLnNldEVsZW1lbnQodGhpcy4kZWwgYXMgRE9NU2VsZWN0b3I8VEVsZW1lbnQ+KTtcbiAgICB9XG5cbiAgICAvKiogY29udGV4dCBhY2Nlc3NvciAqL1xuICAgIGdldCBjb250ZXh0KCk6IElMaXN0Q29udGV4dCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0O1xuICAgIH1cblxuICAgIC8qKiBjb25zdHJ1Y3Qgb3B0aW9uIGFjY2Vzc29yICovXG4gICAgZ2V0IG9wdGlvbnMoKTogTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQub3B0aW9ucztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBWaWV3IGNvbXBvbmVudCBtZXRob2RzOlxuXG4gICAgLyoqIGB0aGlzLmVsYCDmm7TmlrDmmYLjga7mlrDjgZfjgYQgSFRNTCDjgpLjg6zjg7Pjg4Djg6rjg7PjgrDjg63jgrjjg4Pjgq/jga7lrp/oo4XplqLmlbAuIOODouODh+ODq+abtOaWsOOBqCBWaWV3IOODhuODs+ODl+ODrOODvOODiOOCkumAo+WLleOBleOBm+OCiy4gKi9cbiAgICBhYnN0cmFjdCByZW5kZXIoLi4uYXJnczogdW5rbm93bltdKTogYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBDaGFuZ2UgdGhlIHZpZXcncyBlbGVtZW50IChgdGhpcy5lbGAgcHJvcGVydHkpIGFuZCByZS1kZWxlZ2F0ZSB0aGUgdmlldydzIGV2ZW50cyBvbiB0aGUgbmV3IGVsZW1lbnQuXG4gICAgICogQGphIFZpZXcg44GM566h6L2E44GZ44KL6KaB57SgIChgdGhpcy5lbGAgcHJvcGVydHkpIOOBruWkieabtC4g44Kk44OZ44Oz44OI5YaN6Kit5a6a44KC5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIE9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4jjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBvdmVycmlkZSBzZXRFbGVtZW50KGVsOiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXNbX3Byb3BlcnRpZXNdKSB7XG4gICAgICAgICAgICBjb25zdCB7IGNvbnRleHQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICBjb250ZXh0LmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGNvbnRleHQuaW5pdGlhbGl6ZSgkZWwgYXMgRE9NPE5vZGU+IGFzIERPTSwgdGhpcy5vcHRpb25zLmluaXRpYWxIZWlnaHQgPz8gJGVsLmhlaWdodCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIuc2V0RWxlbWVudChlbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZGVzdHJveSgpO1xuICAgICAgICByZXR1cm4gc3VwZXIucmVtb3ZlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RPcGVyYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciBpdCBoYXMgYmVlbiBpbml0aWFsaXplZC5cbiAgICAgKiBAamEg5Yid5pyf5YyW5riI44G/44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogaW5pdGlhbGl6ZWQgLyBmYWxzZTogdW5pbml0aWFsaXplZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5Yid5pyf5YyW5riI44G/IC8gZmFsc2U6IOacquWIneacn+WMllxuICAgICAqL1xuICAgIGdldCBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0luaXRpYWxpemVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEgaXRlbSDnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICogQHBhcmFtIGluc2VydFRvXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbnNlcnRpb24gcG9zaXRpb24gb2YgaXRlbSBieSBpbmRleFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7mjL/lhaXkvY3nva7jgpLjgqTjg7Pjg4fjg4Pjgq/jgrnjgafmjIflrppcbiAgICAgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLCBpbmZvOiBVbmtub3duT2JqZWN0LCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hZGRJdGVtKG5ldyBJdGVtUHJvZmlsZSh0aGlzLmNvbnRleHQsIE1hdGgudHJ1bmMoaGVpZ2h0KSwgaW5pdGlhbGl6ZXIsIGluZm8pLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGludGVybmFsXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uIChpbnRlcm5hbCB1c2UpLlxuICAgICAqIEBqYSBpdGVtIOeZu+mMsiAo5YaF6YOo55SoKVxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZW1cbiAgICAgKiAgLSBgZW5gIHtAbGluayBJdGVtUHJvZmlsZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBJdGVtUHJvZmlsZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGluc2VydFRvXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbnNlcnRpb24gcG9zaXRpb24gb2YgaXRlbSBieSBpbmRleFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7mjL/lhaXkvY3nva7jgpLjgqTjg7Pjg4fjg4Pjgq/jgrnjgafmjIflrppcbiAgICAgKi9cbiAgICBfYWRkSXRlbShpdGVtOiBJdGVtUHJvZmlsZSB8IEl0ZW1Qcm9maWxlW10sIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuX2FkZEl0ZW0oaXRlbSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWxldGUgdGhlIHNwZWNpZmllZCBJdGVtLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5kZXggdG8gc3RhcnQgcmVsZWFzaW5nXG4gICAgICogIC0gYGphYCDop6PpmaTplovlp4vjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc2l6ZVxuICAgICAqICAtIGBlbmAgdG90YWwgbnVtYmVyIG9mIGl0ZW1zIHRvIHJlbGVhc2VcbiAgICAgKiAgLSBgamFgIOino+mZpOOBmeOCiyBpdGVtIOOBrue3j+aVsCBbZGVmYXVsdDogMV1cbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgdG8gYWN0dWFsbHkgZGVsZXRlIHRoZSBlbGVtZW50IFtkZWZhdWx0OiAwIChpbW1lZGlhdGUgZGVsZXRpb24pXG4gICAgICogIC0gYGphYCDlrp/pmpvjgavopoHntKDjgpLliYrpmaTjgZnjgosgZGVsYXkgdGltZSBbZGVmYXVsdDogMCAo5Y2z5pmC5YmK6ZmkKV1cbiAgICAgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIsIHNpemU/OiBudW1iZXIsIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWxldGUgdGhlIHNwZWNpZmllZCBJdGVtLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0YXJnZXQgaW5kZXggYXJyYXkuIGl0IGlzIG1vcmUgZWZmaWNpZW50IHRvIHNwZWNpZnkgcmV2ZXJzZSBpbmRleC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOCpOODs+ODh+ODg+OCr+OCuemFjeWIl+OCkuaMh+Wumi4gcmV2ZXJzZSBpbmRleCDjgpLmjIflrprjgZnjgovjgbvjgYbjgYzlirnnjofnmoRcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgdG8gYWN0dWFsbHkgZGVsZXRlIHRoZSBlbGVtZW50IFtkZWZhdWx0OiAwIChpbW1lZGlhdGUgZGVsZXRpb24pXG4gICAgICogIC0gYGphYCDlrp/pmpvjgavopoHntKDjgpLliYrpmaTjgZnjgosgZGVsYXkgdGltZSBbZGVmYXVsdDogMCAo5Y2z5pmC5YmK6ZmkKV1cbiAgICAgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyIHwgbnVtYmVyW10sIGFyZzI/OiBudW1iZXIsIGFyZzM/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZW1vdmVJdGVtKGluZGV4IGFzIG51bWJlciwgYXJnMiwgYXJnMyk7IC8vIGF2b2lkIHRzKDIzNDUpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW5mb3JtYXRpb24gc2V0IGZvciB0aGUgc3BlY2lmaWVkIGl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBpdGVtIOOBq+ioreWumuOBl+OBn+aDheWgseOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgaWRlbnRpZmllciBbaW5kZXggfCBldmVudCBvYmplY3RdXG4gICAgICogIC0gYGphYCDorZjliKXlrZAuIFtpbmRleCB8IGV2ZW50IG9iamVjdF1cbiAgICAgKi9cbiAgICBnZXRJdGVtSW5mbyh0YXJnZXQ6IG51bWJlciB8IEV2ZW50KTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEl0ZW1JbmZvKHRhcmdldCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZnJlc2ggYWN0aXZlIHBhZ2VzLlxuICAgICAqIEBqYSDjgqLjgq/jg4bjgqPjg5bjg5rjg7zjgrjjgpLmm7TmlrBcbiAgICAgKi9cbiAgICByZWZyZXNoKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEJ1aWxkIHVuYXNzaWduZWQgcGFnZXMuXG4gICAgICogQGphIOacquOCouOCteOCpOODs+ODmuODvOOCuOOCkuani+eviVxuICAgICAqL1xuICAgIHVwZGF0ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC51cGRhdGUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlYnVpbGQgcGFnZSBhc3NpZ25tZW50cy5cbiAgICAgKiBAamEg44Oa44O844K444Ki44K144Kk44Oz44KS5YaN5qeL5oiQXG4gICAgICovXG4gICAgcmVidWlsZCgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWJ1aWxkKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBEZXN0cm95IGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOeuoei9hOODh+ODvOOCv+OCkuegtOajhFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVsZWFzZSgpO1xuICAgICAgICByZXR1cm4gc3VwZXIucmVsZWFzZSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsYWJsZVxuXG4gICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgc2Nyb2xsUG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFBvcztcbiAgICB9XG5cbiAgICAgLyoqXG4gICAgICAqIEBlbiBHZXQgbWF4aW11bSBzY3JvbGwgcG9zaXRpb24uXG4gICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7mnIDlpKflgKTjgpLlj5blvpdcbiAgICAgICovXG4gICAgZ2V0IHNjcm9sbFBvc01heCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zY3JvbGxQb3NNYXg7XG4gICAgfVxuXG4gICAgIC8qKlxuICAgICAqIEBlbiBTY3JvbGwgZXZlbnQgaGFuZGxlciBzZXR0aW5nL2NhbmNlbGxhdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeODvOmWouaVsFxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9uOiBzZXR0aW5nIC8gb2ZmOiBjYW5jZWxpbmdcbiAgICAgKiAgLSBgamFgIG9uOiDoqK3lrpogLyBvZmY6IOino+mZpFxuICAgICAqL1xuICAgIHNldFNjcm9sbEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXIsIG1ldGhvZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHRpbmcvY2FuY2VsbGluZyBzY3JvbGwgc3RvcCBldmVudCBoYW5kbGVyLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vntYLkuobjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44O86Zai5pWwXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb246IHNldHRpbmcgLyBvZmY6IGNhbmNlbGluZ1xuICAgICAqICAtIGBqYWAgb246IOioreWumiAvIG9mZjog6Kej6ZmkXG4gICAgICovXG4gICAgc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyLCBtZXRob2QpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NcbiAgICAgKiAgLSBgZW5gIG5ldyBzY3JvbGwgcG9zaXRpb24gdmFsdWUgWzAgLSBwb3NNYXhdXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogWzAgLSBwb3NNYXhdXG4gICAgICogQHBhcmFtIGFuaW1hdGVcbiAgICAgKiAgLSBgZW5gIGVuYWJsZS9kaXNhYmxlIGFuaW1hdGlvblxuICAgICAqICAtIGBqYWAg44Ki44OL44Oh44O844K344On44Oz44Gu5pyJ54ShXG4gICAgICogQHBhcmFtIHRpbWVcbiAgICAgKiAgLSBgZW5gIHRpbWUgc3BlbnQgb24gYW5pbWF0aW9uIFttc2VjXVxuICAgICAqICAtIGBqYWAg44Ki44OL44Oh44O844K344On44Oz44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqL1xuICAgIHNjcm9sbFRvKHBvczogbnVtYmVyLCBhbmltYXRlPzogYm9vbGVhbiwgdGltZT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbnN1cmUgdmlzaWJpbGl0eSBvZiBpdGVtIGJ5IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ8gaXRlbSDjga7ooajnpLrjgpLkv53oqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBpbmRleCBvZiBpdGVtXG4gICAgICogIC0gYGphYCBpdGVtIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgZW5zdXJlVmlzaWJsZShpbmRleDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmVuc3VyZVZpc2libGUoaW5kZXgsIG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0QmFja3VwUmVzdG9yZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKGFueSBpZGVudGlmaWVyKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O8KOS7u+aEj+OBruitmOWIpeWtkCnjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEBwYXJhbSByZWJ1aWxkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gcmVidWlsZCB0aGUgbGlzdCBzdHJ1Y3R1cmVcbiAgICAgKiAgLSBgamFgIOODquOCueODiOani+mAoOOCkuWGjeani+evieOBmeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkID0gdHJ1ZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZXN0b3JlKGtleSwgcmVidWlsZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgYmFja3VwIGRhdGEgZXhpc3RzLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzIC8gZmFsc2U6IG5vdCBleGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSAvIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaGFzQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERpc2NhcmQgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBkaXNjYXJkIGV4aXN0aW5nIGRhdGEgLyBmYWxzZTogc3BlY2lmaWVkIGRhdGEgZG9lcyBub3QgZXhpc3RcbiAgICAgKiAgLSBgamFgIHRydWU6IOWtmOWcqOOBl+OBn+ODh+ODvOOCv+OCkuegtOajhCAvIGZhbHNlOiDmjIflrprjgZXjgozjgZ/jg4fjg7zjgr/jga/lrZjlnKjjgZfjgarjgYRcbiAgICAgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY2xlYXJCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKi9cbiAgICBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogVW5rbm93bk9iamVjdCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEJhY2t1cERhdGEoa2V5KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEBlbiBCYWNrdXAgZGF0YSBjYW4gYmUgc2V0IGV4dGVybmFsbHkuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5XG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VlZGVkIC8gZmFsc2U6IHNjaGVtYSBpbnZhbGlkXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog44K544Kt44O844Oe44GM5LiN5q2jXG4gICAgICovXG4gICAgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogVW5rbm93bk9iamVjdCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRCYWNrdXBEYXRhKGtleSwgZGF0YSBhcyB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0VmlldyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5pbXBvcnQgeyB0eXBlIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsIExpc3RJdGVtVmlldyB9IGZyb20gJy4vbGlzdC1pdGVtLXZpZXcnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgZ3JvdXA6IEdyb3VwUHJvZmlsZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE9wdGlvbnMgdG8gcGFzcyB0byB7QGxpbmsgRXhwYW5kYWJsZUxpc3RJdGVtVmlld30gY29uc3RydWN0aW9uLlxuICogQGphIHtAbGluayBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3fSDmp4vnr4njgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEZ1bmNOYW1lID0gc3RyaW5nPlxuICAgIGV4dGVuZHMgTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgb3duZXI6IElFeHBhbmRhYmxlTGlzdFZpZXc7XG4gICAgLyoqIHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlICovXG4gICAgZ3JvdXA6IEdyb3VwUHJvZmlsZTtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBpdGVtIGNvbnRhaW5lciBjbGFzcyBoYW5kbGVkIGJ5IHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9LlxuICogQGphIHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXhwYW5kYWJsZUxpc3RJdGVtVmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgTGlzdEl0ZW1WaWV3PFRFbGVtZW50LCBURXZlbnQ+IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEV4cGFuZGFibGVMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgY29uc3QgeyBncm91cCB9ID0gb3B0aW9ucztcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7IGdyb3VwIH0gYXMgUHJvcGVydHk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJvdGVjdGVkIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzLlxuICAgICAqIEBqYSDlsZXplovnirbmhYvjgpLliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleHBhbmRlZCwgY29sbGFwc2VkOiBjbG9zZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5bGV6ZaLLCBmYWxzZTog5Y+O5p2fXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0V4cGFuZGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uZ3JvdXAuaXNFeHBhbmRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZy5cbiAgICAgKiBAamEg5bGV6ZaL5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzRXhwYW5kaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgY29sbGFwc2luZy5cbiAgICAgKiBAamEg5Y+O5p2f5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc0NvbGxhcHNpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcgb3IgY29sbGFwc2luZy5cbiAgICAgKiBAamEg6ZaL6ZaJ5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzU3dpdGNoaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgaXQgaGFzIGEgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBoYXNDaGlsZHJlbigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmdyb3VwLmhhc0NoaWxkcmVuO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgbHVpZCxcbiAgICBzdGF0dXNBZGRSZWYsXG4gICAgc3RhdHVzUmVsZWFzZSxcbiAgICBzdGF0dXNTY29wZSxcbiAgICBpc1N0YXR1c0luLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIElFeHBhbmRPcGVyYXRpb24sXG4gICAgSUxpc3RTdGF0dXNNYW5hZ2VyLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSxcbiAgICBJRXhwYW5kYWJsZUxpc3RDb250ZXh0LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4uL3Byb2ZpbGUnO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIENvcmUgbG9naWMgaW1wbGVtZW50YXRpb24gY2xhc3MgdGhhdCBtYW5hZ2VzIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgc3RhdGUuXG4gKiBAamEg6ZaL6ZaJ54q25oWL566h55CG44KS6KGM44GG44Kz44Ki44Ot44K444OD44Kv5a6f6KOF44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBFeHBhbmRDb3JlIGltcGxlbWVudHNcbiAgICBJRXhwYW5kT3BlcmF0aW9uLFxuICAgIElMaXN0U3RhdHVzTWFuYWdlcixcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQ7XG5cbiAgICAvKiogeyBpZDogR3JvdXBQcm9maWxlIH0gKi9cbiAgICBwcml2YXRlIF9tYXBHcm91cHM6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT4gPSB7fTtcbiAgICAvKiog56ysMemajuWxpCBHcm91cFByb2ZpbGUg44KS5qC857SNICovXG4gICAgcHJpdmF0ZSBfYXJ5VG9wR3JvdXBzOiBHcm91cFByb2ZpbGVbXSA9IFtdO1xuXG4gICAgLyoqIOODh+ODvOOCv+OBriBiYWNrdXAg6aCY5Z+fLiBrZXkg44GoIHsgbWFwLCB0b3BzIH0g44KS5qC857SNICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYmFja3VwOiBSZWNvcmQ8c3RyaW5nLCB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0+ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSBvd25lciDopqogVmlldyDjga7jgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCkge1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgIH1cblxuICAgIC8qKiDjg4fjg7zjgr/jgpLnoLTmo4QgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fbWFwR3JvdXBzID0ge307XG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3VwcyA9IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRPcGVyYXRpb25cblxuICAgIC8qKiDmlrDopo8gR3JvdXBQcm9maWxlIOOCkuS9nOaIkCAqL1xuICAgIG5ld0dyb3VwKGlkPzogc3RyaW5nKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgaWQgPSBpZCA/PyBsdWlkKCdsaXN0LWdyb3VwJywgNCk7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX21hcEdyb3Vwc1tpZF0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tYXBHcm91cHNbaWRdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGdyb3VwID0gbmV3IEdyb3VwUHJvZmlsZSh0aGlzLl9vd25lciwgaWQpO1xuICAgICAgICB0aGlzLl9tYXBHcm91cHNbaWRdID0gZ3JvdXA7XG4gICAgICAgIHJldHVybiBncm91cDtcbiAgICB9XG5cbiAgICAvKiog55m76Yyy5riI44G/IEdyb3VwIOOCkuWPluW+lyAqL1xuICAgIGdldEdyb3VwKGlkOiBzdHJpbmcpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFwR3JvdXBzW2lkXTtcbiAgICB9XG5cbiAgICAvKiog56ysMemajuWxpOOBriBHcm91cCDnmbvpjLIgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgLy8g44GZ44Gn44Gr55m76Yyy5riI44G/44Gu5aC05ZCI44GvIHJlc3RvcmUg44GX44GmIGxheW91dCDjgq3jg7zjgZTjgajjgavlvqnlhYPjgZnjgovjgIJcbiAgICAgICAgaWYgKCdyZWdpc3RlcmVkJyA9PT0gdG9wR3JvdXAuc3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBvcmllbnRhdGlvbiBjaGFuZ2VkIOaZguOBriBsYXlvdXQg44Kt44O85aSJ5pu05a++5b+c44Gg44GM44CB44Kt44O844Gr5aSJ5pu044GM54Sh44GE44Go44GN44Gv5LiN5YW35ZCI44Go44Gq44KL44CCXG4gICAgICAgICAgICAvLyDjgZPjga4gQVBJIOOBq+Wun+ijheOBjOW/heimgeOBi+OCguWQq+OCgeOBpuimi+ebtOOBl+OBjOW/heimgVxuICAgICAgICAgICAgdG9wR3JvdXAucmVzdG9yZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGFzdEdyb3VwID0gdGhpcy5fYXJ5VG9wR3JvdXBzW3RoaXMuX2FyeVRvcEdyb3Vwcy5sZW5ndGggLSAxXTtcbiAgICAgICAgY29uc3QgaW5zZXJ0VG8gPSBsYXN0R3JvdXA/LmdldE5leHRJdGVtSW5kZXgodHJ1ZSkgPz8gMDtcblxuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMucHVzaCh0b3BHcm91cCk7XG4gICAgICAgIHRvcEdyb3VwLnJlZ2lzdGVyKGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiog56ysMemajuWxpOOBriBHcm91cCDjgpLlj5blvpcgKi9cbiAgICBnZXRUb3BHcm91cHMoKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJ5VG9wR3JvdXBzLnNsaWNlKDApO1xuICAgIH1cblxuICAgIC8qKiDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpICovXG4gICAgYXN5bmMgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNpZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgcHJvbWlzaWVzLnB1c2goZ3JvdXAuZXhwYW5kKCkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2llcyk7XG4gICAgfVxuXG4gICAgLyoqIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWPjuadnyAoMemajuWxpCkgKi9cbiAgICBhc3luYyBjb2xsYXBzZUFsbChkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNpZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgcHJvbWlzaWVzLnB1c2goZ3JvdXAuY29sbGFwc2UoZGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNpZXMpO1xuICAgIH1cblxuICAgIC8qKiDlsZXplovkuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzU3RhdHVzSW4oJ2V4cGFuZGluZycpO1xuICAgIH1cblxuICAgIC8qKiDlj47mnZ/kuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1N0YXR1c0luKCdjb2xsYXBzaW5nJyk7XG4gICAgfVxuXG4gICAgLyoqIOmWi+mWieS4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNFeHBhbmRpbmcgfHwgdGhpcy5pc0NvbGxhcHNpbmc7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTdGF0dXNNYW5hZ2VyXG5cbiAgICAvKiog54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44Kk44Oz44Kv44Oq44Oh44Oz44OIICovXG4gICAgc3RhdHVzQWRkUmVmKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c0FkZFJlZihzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKiDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jg4fjgq/jg6rjg6Hjg7Pjg4ggKi9cbiAgICBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiog5Yem55CG44K544Kz44O844OX5q+O44Gr54q25oWL5aSJ5pWw44KS6Kit5a6aICovXG4gICAgc3RhdHVzU2NvcGU8VD4oc3RhdHVzOiBzdHJpbmcsIGV4ZWN1dG9yOiAoKSA9PiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gc3RhdHVzU2NvcGUoc3RhdHVzLCBleGVjdXRvcik7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBn+eKtuaFi+S4reOBp+OBguOCi+OBi+eiuuiqjSAqL1xuICAgIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGlzU3RhdHVzSW4oc3RhdHVzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jgpLjg5Djg4Pjgq/jgqLjg4Pjg5cgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgeyBfYmFja3VwIH0gPSB0aGlzO1xuICAgICAgICBfYmFja3VwW2tleV0gPz89IHtcbiAgICAgICAgICAgIG1hcDogdGhpcy5fbWFwR3JvdXBzLFxuICAgICAgICAgICAgdG9wczogdGhpcy5fYXJ5VG9wR3JvdXBzLFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44Oq44K544OI44KiICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBiYWNrdXAgPSB0aGlzLmdldEJhY2t1cERhdGEoa2V5KTtcbiAgICAgICAgaWYgKG51bGwgPT0gYmFja3VwKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8IHRoaXMuX2FyeVRvcEdyb3Vwcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLl9tYXBHcm91cHMsIGJhY2t1cC5tYXApO1xuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMgPSBiYWNrdXAudG9wcy5zbGljZSgpO1xuXG4gICAgICAgIC8vIOWxlemWi+OBl+OBpuOBhOOCi+OCguOBruOCkueZu+mMslxuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgZ3JvdXAucmVzdG9yZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YaN5qeL56+J44Gu5LqI57SEXG4gICAgICAgIHJlYnVpbGQgJiYgdGhpcy5fb3duZXIucmVidWlsZCgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54ShICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYWNrdXApKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5ICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aICovXG4gICAgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9KTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChkYXRhLm1hcCAmJiBBcnJheS5pc0FycmF5KGRhdGEudG9wcykpIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0gZGF0YTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFdyaXRhYmxlLCBVbmtub3duT2JqZWN0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0VmlldywgSUV4cGFuZE9wZXJhdGlvbiB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFeHBhbmRDb3JlIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB0eXBlIHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcbmltcG9ydCB7IHR5cGUgTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zLCBMaXN0VmlldyB9IGZyb20gJy4vbGlzdC12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IEV4cGFuZENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBWaXJ0dWFsIGxpc3QgdmlldyBjbGFzcyB3aXRoIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDplovplonmqZ/og73jgpLlgpnjgYjjgZ/ku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0VmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgTGlzdFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJRXhwYW5kYWJsZUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBFeHBhbmRDb3JlKHRoaXMpLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuICAgIC8qKiBjb250ZXh0IGFjY2Vzc29yICovXG4gICAgZ2V0IGV4cGFuZENvbnRleHQoKTogSUV4cGFuZE9wZXJhdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRhYmxlTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcge0BsaW5rIEdyb3VwUHJvZmlsZX0uIFJldHVybiB0aGUgb2JqZWN0IGlmIGl0IGlzIGFscmVhZHkgcmVnaXN0ZXJlZC5cbiAgICAgKiBAamEg5paw6KaPIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuS9nOaIkC4g55m76Yyy5riI44G/44Gu5aC05ZCI44Gv44Gd44Gu44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIG5ld2x5IGNyZWF0ZWQgZ3JvdXAgaWQuIGlmIG5vdCBzcGVjaWZpZWQsIGF1dG9tYXRpYyBhbGxvY2F0aW9uIHdpbGwgYmUgcGVyZm9ybWVkLlxuICAgICAqICAtIGBqYWAg5paw6KaP44Gr5L2c5oiQ44GZ44KLIEdyb3VwIElEIOOCkuaMh+Wumi4g5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv6Ieq5YuV5Ymy44KK5oyv44KKXG4gICAgICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5uZXdHcm91cChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCByZWdpc3RlcmVkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDnmbvpjLLmuIjjgb8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIEdyb3VwIElEIHRvIHJldHJpZXZlXG4gICAgICogIC0gYGphYCDlj5blvpfjgZnjgosgR3JvdXAgSUQg44KS5oyH5a6aXG4gICAgICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEdyb3VwKGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gMXN0IGxheWVyIHtAbGluayBHcm91cFByb2ZpbGV9IHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEg56ysMemajuWxpOOBriB7QGxpbmsgR3JvdXBQcm9maWxlfSDnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b3BHcm91cFxuICAgICAqICAtIGBlbmAgY29uc3RydWN0ZWQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIOani+eviea4iOOBvyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IDFzdCBsYXllciB7QGxpbmsgR3JvdXBQcm9maWxlfS4gPGJyPlxuICAgICAqICAgICBBIGNvcHkgYXJyYXkgaXMgcmV0dXJuZWQsIHNvIHRoZSBjbGllbnQgY2Fubm90IGNhY2hlIGl0LlxuICAgICAqIEBqYSDnrKwx6ZqO5bGk44GuIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+lyA8YnI+XG4gICAgICogICAgIOOCs+ODlOODvOmFjeWIl+OBjOi/lOOBleOCjOOCi+OBn+OCgeOAgeOCr+ODqeOCpOOCouODs+ODiOOBr+OCreODo+ODg+OCt+ODpeS4jeWPr1xuICAgICAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldFRvcEdyb3VwcygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHBhbmQgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpXG4gICAgICovXG4gICAgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5leHBhbmRBbGwoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29sbGFwc2UgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlj47mnZ8gKDHpmo7lsaQpXG4gICAgICovXG4gICAgY29sbGFwc2VBbGwoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY29sbGFwc2VBbGwoZGVsYXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nLlxuICAgICAqIEBqYSDlsZXplovkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzRXhwYW5kaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgY29sbGFwc2luZy5cbiAgICAgKiBAamEg5Y+O5p2f5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNTd2l0Y2hpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICAgICAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICAgICAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnN0YXR1c0FkZFJlZihzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAgICAgKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gICAgICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAgICAgKi9cbiAgICBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc3RhdHVzUmVsZWFzZShzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdGF0ZSB2YXJpYWJsZSBtYW5hZ2VtZW50IHNjb3BlXG4gICAgICogQGphIOeKtuaFi+WkieaVsOeuoeeQhuOCueOCs+ODvOODl1xuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHZhbCBvZiBzZWVkIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWw44Gu5oi744KK5YCkXG4gICAgICovXG4gICAgc3RhdHVzU2NvcGU8VD4oc3RhdHVzOiBzdHJpbmcsIGV4ZWN1dG9yOiAoKSA9PiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zdGF0dXNTY29wZShzdGF0dXMsIGV4ZWN1dG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgaWYgaXQncyBpbiB0aGUgc3BlY2lmaWVkIHN0YXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWU6IOeKtuaFi+WGhSAvIGZhbHNlOiDnirbmhYvlpJZcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgOiB3aXRoaW4gdGhlIHN0YXR1cyAvIGBmYWxzZWA6IG91dCBvZiB0aGUgc3RhdHVzXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOeKtuaFi+WGhSAvIGBmYWxzZWA6IOeKtuaFi+WkllxuICAgICAqL1xuICAgIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNTdGF0dXNJbihzdGF0dXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOiBMaXN0Vmlld1xuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIERlc3Ryb3kgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg566h6L2E44OH44O844K/44KS56C05qOEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgc3VwZXIucmVsZWFzZSgpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbGVhc2UoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKGFueSBpZGVudGlmaWVyKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O8KOS7u+aEj+OBruitmOWIpeWtkCnjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEBwYXJhbSByZWJ1aWxkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gcmVidWlsZCB0aGUgbGlzdCBzdHJ1Y3R1cmVcbiAgICAgKiAgLSBgamFgIOODquOCueODiOani+mAoOOCkuWGjeani+evieOBmeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkID0gdHJ1ZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZXN0b3JlKGtleSwgcmVidWlsZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgYmFja3VwIGRhdGEgZXhpc3RzLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzIC8gZmFsc2U6IG5vdCBleGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSAvIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBvdmVycmlkZSBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaGFzQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERpc2NhcmQgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBkaXNjYXJkIGV4aXN0aW5nIGRhdGEgLyBmYWxzZTogc3BlY2lmaWVkIGRhdGEgZG9lcyBub3QgZXhpc3RcbiAgICAgKiAgLSBgamFgIHRydWU6IOWtmOWcqOOBl+OBn+ODh+ODvOOCv+OCkuegtOajhCAvIGZhbHNlOiDmjIflrprjgZXjgozjgZ/jg4fjg7zjgr/jga/lrZjlnKjjgZfjgarjgYRcbiAgICAgKi9cbiAgICBvdmVycmlkZSBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY2xlYXJCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKi9cbiAgICBvdmVycmlkZSBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogVW5rbm93bk9iamVjdCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEJhY2t1cERhdGEoa2V5KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEBlbiBCYWNrdXAgZGF0YSBjYW4gYmUgc2V0IGV4dGVybmFsbHkuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5XG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VlZGVkIC8gZmFsc2U6IHNjaGVtYSBpbnZhbGlkXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog44K544Kt44O844Oe44GM5LiN5q2jXG4gICAgICovXG4gICAgb3ZlcnJpZGUgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogVW5rbm93bk9iamVjdCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRCYWNrdXBEYXRhKGtleSwgZGF0YSBhcyB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0pO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJzaGVldCIsInN0eWxlQ29yZSIsInN0eWxlQnV0dG9uIiwiJCIsIl9wcm9wZXJ0aWVzIiwic2V0VGltZW91dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBOzs7QUFHRztBQUVILENBQUEsWUFBcUI7QUFlakI7OztBQUdHO0FBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtBQUFBLElBQUEsQ0FBQSxZQUF1QjtB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