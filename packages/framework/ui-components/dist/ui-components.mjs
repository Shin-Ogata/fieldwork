/*!
 * @cdp/ui-components 0.9.18
 *   ui-componets collection
 */

import { safe, post, noop, dom, at, makeResult, RESULT_CODE, toHelpString, View, luid, statusAddRef, statusRelease, statusScope, isStatusIn, setTimeout as setTimeout$1, clearTimeout } from '@cdp/runtime';

/*!
 * @cdp/ui-utils 0.9.18
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
 * @cdp/ui-forms 0.9.18
 *   UI form components
 */


const sheet$1 = new CSSStyleSheet();sheet$1.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

const sheet = new CSSStyleSheet();sheet.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
void post(noop(sheet$1, sheet));

/*!
 * @cdp/ui-listview 0.9.18
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

export { ExpandableListItemView, ExpandableListView, GroupProfile, ItemProfile, ListItemView, ListView, ListViewGlobalConfig, PageProfile, UI_FORMS_STATUS, clearTransition, cssPrefixes, getTransformMatrixValues, setTransformTransition };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5tanMiLCJzb3VyY2VzIjpbInVpLXV0aWxzL3Jlc3VsdC1jb2RlLWRlZnMudHMiLCJ1aS11dGlscy9zc3IudHMiLCJ1aS11dGlscy9jc3MvbWlzYy50cyIsInVpLWZvcm1zL2luZGV4LnRzIiwidWktbGlzdHZpZXcvcmVzdWx0LWNvZGUtZGVmcy50cyIsInVpLWxpc3R2aWV3L2dsb2JhbC1jb25maWcudHMiLCJ1aS1saXN0dmlldy9wcm9maWxlL2l0ZW0udHMiLCJ1aS1saXN0dmlldy9wcm9maWxlL3BhZ2UudHMiLCJ1aS1saXN0dmlldy9wcm9maWxlL2dyb3VwLnRzIiwidWktbGlzdHZpZXcvbGlzdC1pdGVtLXZpZXcudHMiLCJ1aS1saXN0dmlldy9jb3JlL2VsZW1lbnQtc2Nyb2xsZXIudHMiLCJ1aS1saXN0dmlldy9jb3JlL2xpc3QudHMiLCJ1aS1saXN0dmlldy9saXN0LXZpZXcudHMiLCJ1aS1saXN0dmlldy9leHBhbmRhYmxlLWxpc3QtaXRlbS12aWV3LnRzIiwidWktbGlzdHZpZXcvY29yZS9leHBhbmQudHMiLCJ1aS1saXN0dmlldy9leHBhbmRhYmxlLWxpc3Qtdmlldy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBleHBvcnQgY29uc3QgZW51bSBDRFBfS05PV05fVUlfTU9EVUxFIHtcbiAgICAgICAgLyoqIGBAY2RwL3VpLXV0aWxzYCAqL1xuICAgICAgICBVVElMUyAgICAgPSAxLFxuICAgICAgICAvKiogYEBjZHAvdWktbGlzdHZpZXdgICovXG4gICAgICAgIExJU1RWSUVXICA9IDIsXG4gICAgICAgIC8qKiBvZmZzZXQgZm9yIHVua25vd24gdWktbW9kdWxlICovXG4gICAgICAgIE9GRlNFVCxcbiAgICB9XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFVJX1VUSUxTID0gKENEUF9LTk9XTl9NT0RVTEUuT0ZGU0VUICsgQ0RQX0tOT1dOX1VJX01PRFVMRS5VVElMUykgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgVUlfVVRJTFNfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfVUlfVVRJTFNfRkFUQUwgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9VVElMUyArIDEsICdVSSB1dGlscyBzb21ldGhpbmcgd3JvbmcuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGdldENvbXB1dGVkU3R5bGUgPSBzYWZlKGdsb2JhbFRoaXMuZ2V0Q29tcHV0ZWRTdHlsZSk7XG4iLCJpbXBvcnQgeyBnZXRDb21wdXRlZFN0eWxlIH0gZnJvbSAnLi4vc3NyJztcblxuLyoqXG4gKiBAZW4gQ1NTIHZlbmRvciBwcmVmaXggc3RyaW5nIGRlZmluaXRpb24uXG4gKiBAamEgQ1NTIOODmeODs+ODgOODvOODl+ODquODleOCo+ODg+OCr+OCueaWh+Wtl+WIl+Wumue+qVxuICovXG5leHBvcnQgY29uc3QgY3NzUHJlZml4ZXMgPSBbJy13ZWJraXQtJywgJy1tb3otJywgJy1tcy0nLCAnLW8tJywgJyddO1xuXG4vKipcbiAqIEBlbiBTdG9yZXMgdGhlIHZhbHVlIHNwZWNpZmllZCBpbiBjc3MgYHRyYW5zZm9ybSgzZClgLlxuICogQGphIGNzcyBgdHJhbnNmb3JtKDNkKWAg44Gr5oyH5a6a44GV44KM44KL5YCk44KS5qC857SNXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNmb3JtTWF0cml4VmFsdWVzIHtcbiAgICB0cmFuc2xhdGVYOiBudW1iZXI7XG4gICAgdHJhbnNsYXRlWTogbnVtYmVyO1xuICAgIHRyYW5zbGF0ZVo6IG51bWJlcjtcbiAgICBzY2FsZVg6IG51bWJlcjtcbiAgICBzY2FsZVk6IG51bWJlcjtcbiAgICBzY2FsZVo6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiB0aGUgdHJhbnNmb3JtIG1hdHJpeCBzcGVjaWZpZWQgaW4gYEVsZW1lbnRgLlxuICogQGphIGBFbGVtZW50YCDjgavmjIflrprjgZXjgozjgZ8gdHJhbnNmb3JtIOihjOWIl+OBruWApOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBjb25zdCBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgPSAoZWw6IEVsZW1lbnQpOiBUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG4gICAgY29uc3QgeyBtMTEsIG0yMiwgbTMzLCBtNDEsIG00MiwgbTQzIH0gPSBuZXcgRE9NTWF0cml4UmVhZE9ubHkoc3R5bGUudHJhbnNmb3JtKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0cmFuc2xhdGVYOiBtNDEsXG4gICAgICAgIHRyYW5zbGF0ZVk6IG00MixcbiAgICAgICAgdHJhbnNsYXRlWjogbTQzLFxuICAgICAgICBzY2FsZVg6IG0xMSxcbiAgICAgICAgc2NhbGVZOiBtMjIsXG4gICAgICAgIHNjYWxlWjogbTMzLFxuICAgIH07XG59O1xuXG4vKipcbiAqIEBlbiBTZXR0aW5nIHByb3BlcnR5IGNvbnZlcnNpb24gYW5pbWF0aW9uIHVzaW5nIGNzcyB0cmFuc2l0aW9uIGZvciBzcGVjaWZpZWQgZWxlbWVudC5cbiAqIEBqYSDmjIflrpropoHntKDjgavlr77jgZfjgaYgY3NzIHRyYW5zaXRpb24g44KS55So44GE44Gf44OX44Ot44OR44OG44Kj5aSJ5o+b44Ki44OL44Oh44O844K344On44Oz44Gu6Kit5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgSFRNTEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgSFRNTEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWUgW2V4OiBoZWlnaHRdXG4gKiAgLSBgamFgIOWvvuixoeODl+ODreODkeODhuOCo+WQjSBbZXg6IGhlaWdodF1cbiAqIEBwYXJhbSBtc2VjXG4gKiAgLSBgZW5gIGFuaW1hdGlvbiBkdXJhdGlvbiBbbXNlY11cbiAqICAtIGBqYWAg44Ki44OL44Oh44O844K344On44Oz5pmC6ZaTIFttc2VjXVxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBuYW1lIFtkZWZhdWx0OiBlYXNlXVxuICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbDlkI0gW2RlZmF1bHQ6IGVhc2VdXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uID0gKGVsOiBIVE1MRWxlbWVudCwgcHJvcDogc3RyaW5nLCBtc2VjOiBudW1iZXIsIHRpbWluZ0Z1bmN0aW9uID0gJ2Vhc2UnKTogdm9pZCA9PiB7XG4gICAgY29uc3QgYW5pbWF0aW9uID0gYCR7KG1zZWMgLyAxMDAwKX1zICR7dGltaW5nRnVuY3Rpb259YDtcbiAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgndHJhbnNpdGlvbicsIGAke3Byb3B9ICR7YW5pbWF0aW9ufSwgdHJhbnNmb3JtICR7YW5pbWF0aW9ufWApO1xufTtcblxuXG4vKipcbiAqIEBlbiBDbGVhciBjc3MgdHJhbnNpdGlvbiBzZXR0aW5ncyBmb3Igc3BlY2lmaWVkIGVsZW1lbnQuXG4gKiBAamEg5oyH5a6a6KaB57Sg44GuIGNzcyB0cmFuc2l0aW9uIOioreWumuOCkuino+mZpFxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEhUTUxFbGVtZW50YCBpbnN0YW5jZVxuICogIC0gYGphYCDlr77osaEgYEhUTUxFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyVHJhbnNpdGlvbiA9IChlbDogSFRNTEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndHJhbnNpdGlvbicpO1xufTtcbiIsImV4cG9ydCBjb25zdCBVSV9GT1JNU19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcblxuaW1wb3J0IHsgbm9vcCwgcG9zdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbmltcG9ydCBzdHlsZUNvcmUgZnJvbSAnQGNzcy9zdHJ1Y3R1cmUuY3NzJyB3aXRoIHsgdHlwZTogJ2NzcycgfTtcbmltcG9ydCBzdHlsZUJ1dHRvbiBmcm9tICdAY3NzL3N0cnVjdHVyZS1idXR0b24uY3NzJyB3aXRoIHsgdHlwZTogJ2NzcycgfTtcblxudm9pZCBwb3N0KG5vb3Aoc3R5bGVDb3JlLCBzdHlsZUJ1dHRvbikpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBVSV9MSVNUVklFVyA9IChDRFBfS05PV05fTU9EVUxFLk9GRlNFVCArIENEUF9LTk9XTl9VSV9NT0RVTEUuTElTVFZJRVcpICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIFVJX0xJU1RWSUVXX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04gPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDEsICdsaXN0dmlldyBoYXMgaW52YWxpZCBpbml0aWFsaXphdGlvbi4nKSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMiwgJ2xpc3R2aWV3IGdpdmVuIGEgaW52YWxpZCBwYXJhbS4nKSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9PUEVSQVRJT04gICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMywgJ2xpc3R2aWV3IGludmFsaWQgb3BlcmF0aW9uLicpLFxuICAgIH1cbn1cbiIsIi8qKlxuICogQGVuIEdsb2JhbCBjb25maWd1cmF0aW9uIGRlZmluaXRpb24gZm9yIGxpc3Qgdmlld3MuXG4gKiBAamEg44Oq44K544OI44OT44Ol44O844Gu44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Os44O844K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdFZpZXdHbG9iYWxDb25maWcge1xuICAgIE5BTUVTUEFDRTogc3RyaW5nO1xuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHN0cmluZztcbiAgICBJTkFDVElWRV9DTEFTUzogc3RyaW5nO1xuICAgIFJFQ1lDTEVfQ0xBU1M6IHN0cmluZztcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBzdHJpbmc7XG4gICAgREFUQV9QQUdFX0lOREVYOiBzdHJpbmc7XG4gICAgREFUQV9JVEVNX0lOREVYOiBzdHJpbmc7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVmYXVsdFYge1xuICAgIE5BTUVTUEFDRSAgICAgICAgICAgPSAnY2RwLXVpJywgLy8gVE9ETzogbmFtZXNwYWNlIOOBryB1dGlscyDjgavnp7vjgZlcbiAgICBTQ1JPTExfTUFQX0NMQVNTICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1zY3JvbGwtbWFwYCxcbiAgICBJTkFDVElWRV9DTEFTUyAgICAgID0gYCR7TkFNRVNQQUNFfS1pbmFjdGl2ZWAsXG4gICAgUkVDWUNMRV9DTEFTUyAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctcmVjeWNsZWAsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUyA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctaXRlbS1iYXNlYCxcbiAgICBEQVRBX1BBR0VfSU5ERVggICAgID0gJ2RhdGEtcGFnZS1pbmRleCcsXG4gICAgREFUQV9JVEVNX0lOREVYICAgICA9ICdkYXRhLWl0ZW0taW5kZXgnLFxufVxuXG5jb25zdCBfY29uZmlnID0ge1xuICAgIE5BTUVTUEFDRTogRGVmYXVsdFYuTkFNRVNQQUNFLFxuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IERlZmF1bHRWLlNDUk9MTF9NQVBfQ0xBU1MsXG4gICAgSU5BQ1RJVkVfQ0xBU1M6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTLFxuICAgIFJFQ1lDTEVfQ0xBU1M6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1MsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogRGVmYXVsdFYuTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICBEQVRBX1BBR0VfSU5ERVg6IERlZmF1bHRWLkRBVEFfUEFHRV9JTkRFWCxcbiAgICBEQVRBX0lURU1fSU5ERVg6IERlZmF1bHRWLkRBVEFfSVRFTV9JTkRFWCxcbn07XG5cbmV4cG9ydCB0eXBlIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnID0gUGFydGlhbDxcbiAgICBQaWNrPExpc3RWaWV3R2xvYmFsQ29uZmlnXG4gICAgICAgICwgJ05BTUVTUEFDRSdcbiAgICAgICAgfCAnU0NST0xMX01BUF9DTEFTUydcbiAgICAgICAgfCAnSU5BQ1RJVkVfQ0xBU1MnXG4gICAgICAgIHwgJ1JFQ1lDTEVfQ0xBU1MnXG4gICAgICAgIHwgJ0xJU1RJVEVNX0JBU0VfQ0xBU1MnXG4gICAgICAgIHwgJ0RBVEFfUEFHRV9JTkRFWCdcbiAgICAgICAgfCAnREFUQV9JVEVNX0lOREVYJ1xuICAgID5cbj47XG5cbmNvbnN0IGVuc3VyZU5ld0NvbmZpZyA9IChuZXdDb25maWc6IExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnKTogUGFydGlhbDxMaXN0Vmlld0dsb2JhbENvbmZpZz4gPT4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgTkFNRVNQQUNFOiBucyxcbiAgICAgICAgU0NST0xMX01BUF9DTEFTUzogc2Nyb2xsbWFwLFxuICAgICAgICBJTkFDVElWRV9DTEFTUzogaW5hY3RpdmUsXG4gICAgICAgIFJFQ1lDTEVfQ0xBU1M6IHJlY3ljbGUsXG4gICAgICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IGl0ZW1iYXNlLFxuICAgICAgICBEQVRBX1BBR0VfSU5ERVg6IGRhdGFwYWdlLFxuICAgICAgICBEQVRBX0lURU1fSU5ERVg6IGRhdGFpdGVtLFxuICAgIH0gPSBuZXdDb25maWc7XG5cbiAgICBjb25zdCBOQU1FU1BBQ0UgPSBucztcbiAgICBjb25zdCBTQ1JPTExfTUFQX0NMQVNTID0gc2Nyb2xsbWFwID8/IChucyA/IGAke25zfS1saXN0dmlldy1zY3JvbGwtbWFwYCA6IHVuZGVmaW5lZCk7XG4gICAgY29uc3QgSU5BQ1RJVkVfQ0xBU1MgPSBpbmFjdGl2ZSA/PyAobnMgPyBgJHtuc30taW5hY3RpdmVgIDogdW5kZWZpbmVkKTtcbiAgICBjb25zdCBSRUNZQ0xFX0NMQVNTID0gcmVjeWNsZSA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctcmVjeWNsZWAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IExJU1RJVEVNX0JBU0VfQ0xBU1MgPSBpdGVtYmFzZSA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctaXRlbS1iYXNlYCA6IHVuZGVmaW5lZCk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXdDb25maWcsIHtcbiAgICAgICAgTkFNRVNQQUNFLFxuICAgICAgICBTQ1JPTExfTUFQX0NMQVNTLFxuICAgICAgICBJTkFDVElWRV9DTEFTUyxcbiAgICAgICAgUkVDWUNMRV9DTEFTUyxcbiAgICAgICAgTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICAgICAgREFUQV9QQUdFX0lOREVYOiBkYXRhcGFnZSxcbiAgICAgICAgREFUQV9JVEVNX0lOREVYOiBkYXRhaXRlbSxcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIEdldC9VcGRhdGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gb2YgbGlzdCB2aWV3LlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+OBruWPluW+ly/mm7TmlrBcbiAqL1xuZXhwb3J0IGNvbnN0IExpc3RWaWV3R2xvYmFsQ29uZmlnID0gKG5ld0NvbmZpZz86IExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnKTogTGlzdFZpZXdHbG9iYWxDb25maWcgPT4ge1xuICAgIGlmIChuZXdDb25maWcpIHtcbiAgICAgICAgZW5zdXJlTmV3Q29uZmlnKG5ld0NvbmZpZyk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG5ld0NvbmZpZykpIHtcbiAgICAgICAgICAgIGlmICh1bmRlZmluZWQgPT09IG5ld0NvbmZpZ1trZXkgYXMga2V5b2YgTGlzdFZpZXdHbG9iYWxDb25maWdBcmddKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIG5ld0NvbmZpZ1trZXkgYXMga2V5b2YgTGlzdFZpZXdHbG9iYWxDb25maWdBcmddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBPYmplY3QuYXNzaWduKF9jb25maWcsIG5ld0NvbmZpZykpO1xufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgfSBmcm9tICdAY2RwL3VpLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9iYXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdEl0ZW1WaWV3LFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcixcbiAgICBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMsXG59IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHsgTGlzdFZpZXdHbG9iYWxDb25maWcgfSBmcm9tICcuLi9nbG9iYWwtY29uZmlnJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIGxpc3QgaXRlbXMuXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgSXRlbVByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUxpc3RDb250ZXh0O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5mbzogVW5rbm93bk9iamVjdDtcbiAgICAvKiogQGludGVybmFsIGdsb2JhbCBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4PzogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgYmVsb25naW5nIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9wYWdlSW5kZXg/OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgb2Zmc2V0ICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGJhc2UgZG9tIGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfJGJhc2U/OiBET007XG4gICAgLyoqIEBpbnRlcm5hbCBJTGlzdEl0ZW1WaWV3IGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfaW5zdGFuY2U/OiBJTGlzdEl0ZW1WaWV3O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RWaWV3Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruWIneacn+OBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUxpc3RDb250ZXh0LCBoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgX2luZm86IFVua25vd25PYmplY3QpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgICAgICAgPSBvd25lcjtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICAgICAgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVyID0gaW5pdGlhbGl6ZXI7XG4gICAgICAgIHRoaXMuX2luZm8gICAgICAgID0gX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGhlaWdodC4gKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGdsb2JhbCBpbmRleC4gKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgc2V0IGluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy51cGRhdGVJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgYmVsb25naW5nIHRoZSBwYWdlIGluZGV4LiAqL1xuICAgIGdldCBwYWdlSW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VJbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBzZXQgcGFnZUluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fcGFnZUluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIGdldCBvZmZzZXQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGdsb2JhbCBvZmZzZXQuICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBpbml0IHBhcmFtZXRlcnMuICovXG4gICAgZ2V0IGluZm8oKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdGhpcy5wcmVwYXJlQmFzZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgZWw6IHRoaXMuXyRiYXNlLFxuICAgICAgICAgICAgICAgIG93bmVyOiB0aGlzLl9vd25lcixcbiAgICAgICAgICAgICAgICBpdGVtOiB0aGlzLFxuICAgICAgICAgICAgfSwgdGhpcy5faW5mbyk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IG5ldyB0aGlzLl9pbml0aWFsaXplcihvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICgnbm9uZScgPT09IHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSW5kZXgoKTtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICd2aXNpYmxlJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgaXRlbSBpbnZpc2libGUuXG4gICAgICogQGphIGl0ZW0g44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICdoaWRkZW4nICE9PSB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknKSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmFkZENsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mm7TmlrBcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlLnJlbmRlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBhY3RpdmF0aW9uIHN0YXR1cyBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfnirbmhYvliKTlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2luc3RhbmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaGVpZ2h0IGluZm9ybWF0aW9uIG9mIHRoZSBpdGVtLiBDYWxsZWQgZnJvbSB7QGxpbmsgTGlzdEl0ZW1WaWV3fS5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXmg4XloLHjga7mm7TmlrAuIHtAbGluayBMaXN0SXRlbVZpZXd9IOOBi+OCieOCs+ODvOODq+OBleOCjOOCi+OAglxuICAgICAqL1xuICAgIHB1YmxpYyB1cGRhdGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZGVsdGEgPSBuZXdIZWlnaHQgLSB0aGlzLl9oZWlnaHQ7XG4gICAgICAgIHRoaXMuX2hlaWdodCA9IG5ld0hlaWdodDtcbiAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhKTtcbiAgICAgICAgaWYgKG9wdGlvbnM/LnJlZmxlY3RBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVByb2ZpbGVzKHRoaXMuX2luZGV4ID8/IDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHotaW5kZXguIENhbGxlZCBmcm9tIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYC5cbiAgICAgKiBAamEgei1pbmRleCDjga7jg6rjgrvjg4Pjg4guIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYCDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXREZXB0aCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ3otaW5kZXgnLCB0aGlzLl9vd25lci5vcHRpb25zLmJhc2VEZXB0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcHJlcGFyZUJhc2VFbGVtZW50KCk6IERPTSB7XG4gICAgICAgIGxldCAkYmFzZTogRE9NO1xuICAgICAgICBjb25zdCAkcmVjeWNsZSA9IHRoaXMuX293bmVyLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5maXJzdCgpO1xuICAgICAgICBjb25zdCBpdGVtVGFnTmFtZSA9IHRoaXMuX293bmVyLm9wdGlvbnMuaXRlbVRhZ05hbWU7XG5cbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybigndGhpcy5fJGJhc2UgaXMgbm90IG51bGwuJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fJGJhc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8ICRyZWN5Y2xlLmxlbmd0aCkge1xuICAgICAgICAgICAgJGJhc2UgPSAkcmVjeWNsZTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUF0dHIoJ3otaW5kZXgnKTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUNsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86ICDopoHmpJzoqI4uIDxsaT4g5YWo6Iis44GvIDxzbG90PiDjgajjganjga7jgojjgYbjgavljZToqr/jgZnjgovjgYs/XG4gICAgICAgICAgICAkYmFzZSA9ICQoYDwke2l0ZW1UYWdOYW1lfSBjbGFzcz1cIiR7dGhpcy5fY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1N9XCI+PC9cIiR7aXRlbVRhZ05hbWV9XCI+YCk7XG4gICAgICAgICAgICAkYmFzZS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuJHNjcm9sbE1hcC5hcHBlbmQoJGJhc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g6auY44GV44Gu5pu05pawXG4gICAgICAgIGlmICgkYmFzZS5oZWlnaHQoKSAhPT0gdGhpcy5faGVpZ2h0KSB7XG4gICAgICAgICAgICAkYmFzZS5oZWlnaHQodGhpcy5faGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkYmFzZTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfSVRFTV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9pbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfSVRFTV9JTkRFWCwgdGhpcy5faW5kZXghKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVBhZ2VJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9wYWdlSW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgsIHRoaXMuX3BhZ2VJbmRleCEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlT2Zmc2V0KCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fb3duZXIub3B0aW9ucy5lbmFibGVUcmFuc2Zvcm1PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKHRoaXMuXyRiYXNlWzBdKTtcbiAgICAgICAgICAgIGlmICh0cmFuc2xhdGVZICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7dGhpcy5fb2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IHBhcnNlSW50KHRoaXMuXyRiYXNlLmNzcygndG9wJyksIDEwKTtcbiAgICAgICAgICAgIGlmICh0b3AgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndG9wJywgYCR7dGhpcy5fb2Zmc2V0fXB4YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBhdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIG9uZSBwYWdlIG9mIHRoZSBsaXN0LlxuICogQGphIOODquOCueODiDHjg5rjg7zjgrjliIbjga4gVUkg5qeL6YCg5oOF5aCx44KS5qC857SN44GZ44KL44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBQYWdlUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBvZmZzZXQgZnJvbSB0b3AgKi9cbiAgICBwcml2YXRlIF9vZmZzZXQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSdzIGhlaWdodCAqL1xuICAgIHByaXZhdGUgX2hlaWdodCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBpdGVtJ3MgcHJvZmlsZSBtYW5hZ2VkIHdpdGggaW4gcGFnZSAqL1xuICAgIHByaXZhdGUgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIHN0YXR1cyAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicgPSAnaW5hY3RpdmUnO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGhlaWdodCAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIHN0YXR1cyAqL1xuICAgIGdldCBzdGF0dXMoKTogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdhY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgcGFnZSBpbnZpc2libGUuXG4gICAgICogQGphIHBhZ2Ug44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaGlkZGVuJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaGlkZGVuJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVhY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7pnZ7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdpbmFjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBJdGVtUHJvZmlsZX0gdG8gdGhlIHBhZ2UuXG4gICAgICogQGphIHtAbGluayBJdGVtUHJvZmlsZX0g44Gu6L+95YqgXG4gICAgICovXG4gICAgcHVibGljIHB1c2goaXRlbTogSXRlbVByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICs9IGl0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJZiBhbGwge0BsaW5rIEl0ZW1Qcm9maWxlfSB1bmRlciB0aGUgcGFnZSBhcmUgbm90IHZhbGlkLCBkaXNhYmxlIHRoZSBwYWdlJ3Mgc3RhdHVzLlxuICAgICAqIEBqYSDphY3kuIvjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgZnjgbnjgabjgYzmnInlirnjgafjgarjgYTloLTlkIgsIHBhZ2Ug44K544OG44O844K/44K544KS54Sh5Yq544Gr44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIG5vcm1hbGl6ZSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW5hYmxlQWxsID0gdGhpcy5faXRlbXMuZXZlcnkoaXRlbSA9PiBpdGVtLmlzQWN0aXZlKCkpO1xuICAgICAgICBpZiAoIWVuYWJsZUFsbCkge1xuICAgICAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIEl0ZW1Qcm9maWxlfSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6a44GX44GmIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW0oaW5kZXg6IG51bWJlcik6IEl0ZW1Qcm9maWxlIHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX2l0ZW1zLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBmaXJzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDliJ3jga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUZpcnN0KCk6IEl0ZW1Qcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zWzBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDlvozjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUxhc3QoKTogSXRlbVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlbXNbdGhpcy5faXRlbXMubGVuZ3RoIC0gMV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciB9IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9leHBhbmRhYmxlLWNvbnRleHQnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG4vKipcbiAqIEBlbiBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gc3RvcmFnZSBjbGFzcyBmb3IgZ3JvdXAgbWFuYWdlbWVudCBvZiBsaXN0IGl0ZW1zLiA8YnI+XG4gKiAgICAgVGhpcyBjbGFzcyBkb2VzIG5vdCBkaXJlY3RseSBtYW5pcHVsYXRlIHRoZSBET00uXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44KS44Kw44Or44O844OX566h55CG44GZ44KLIFVJIOani+mAoOaDheWgseagvOe0jeOCr+ODqeOCuSA8YnI+XG4gKiAgICAg5pys44Kv44Op44K544Gv55u05o6l44GvIERPTSDjgpLmk43kvZzjgZfjgarjgYRcbiAqL1xuZXhwb3J0IGNsYXNzIEdyb3VwUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwcm9maWxlIGlkICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaWQ6IHN0cmluZztcbiAgICAvKiogQGludGVybmFsIHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9IGluc3RhbmNlKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsIHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX3BhcmVudD86IEdyb3VwUHJvZmlsZTtcbiAgICAvKiogQGludGVybmFsIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9IGFycmF5ICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMgKi9cbiAgICBwcml2YXRlIF9leHBhbmRlZCA9IGZhbHNlO1xuICAgIC8qKiBAaW50ZXJuYWwgcmVnaXN0cmF0aW9uIHN0YXR1cyBmb3IgX293bmVyICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyA9ICd1bnJlZ2lzdGVyZWQnO1xuICAgIC8qKiBAaW50ZXJuYWwgc3RvcmVkIHtAbGluayBJdGVtUHJvZmlsZX0gaW5mb3JtYXRpb24gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUV4cGFuZGFibGVMaXN0Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBpZCBvZiB0aGUgaW5zdGFuY2UuIHNwZWNpZmllZCBieSB0aGUgZnJhbWV3b3JrLlxuICAgICAqICAtIGBqYWAg44Kk44Oz44K544K/44Oz44K544GuIElELiDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jgYzmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCwgaWQ6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9pZCAgICA9IGlkO1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgSUQuXG4gICAgICogQGphIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQGVuIEdldCBzdGF0dXMuICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnXG4gICAgICogQGphIOOCueODhuODvOOCv+OCueOCkuWPluW+lyAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqL1xuICAgIGdldCBzdGF0dXMoKTogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMuXG4gICAgICogQGphIOWxlemWi+eKtuaFi+OCkuWIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4cGFuZGVkLCBjb2xsYXBzZWQ6IGNsb3NlXG4gICAgICogIC0gYGphYCB0cnVlOiDlsZXplossIGZhbHNlOiDlj47mnZ9cbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4cGFuZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcGFyZW50IHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDopqoge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHBhcmVudCgpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY2hpbGRyZW4ge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY2hpbGRyZW4oKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBuZXh0IGF2YWlsYWJsZSBpbmRleCBvZiB0aGUgbGFzdCBpdGVtIGVsZW1lbnQuXG4gICAgICogQGphIOacgOW+jOOBriBpdGVtIOimgee0oOOBruasoeOBq+S9v+eUqOOBp+OBjeOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB3aXRoQWN0aXZlQ2hpbGRyZW4gXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gc2VhcmNoIGluY2x1ZGluZyByZWdpc3RlcmVkIGNoaWxkIGVsZW1lbnRzXG4gICAgICogIC0gYGphYCDnmbvpjLLmuIjjgb/jga7lrZDopoHntKDjgpLlkKvjgoHjgabmpJzntKLjgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0TmV4dEl0ZW1JbmRleCh3aXRoQWN0aXZlQ2hpbGRyZW4gPSBmYWxzZSk6IG51bWJlciB7XG4gICAgICAgIGxldCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBpZiAod2l0aEFjdGl2ZUNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsID09IGl0ZW1zIHx8IGl0ZW1zLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMuX2l0ZW1zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaXRlbXNbaXRlbXMubGVuZ3RoIC0gMV0/LmluZGV4ID8/IDApICsgMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIOacrCBHcm91cFByb2ZpbGUg44GM566h55CG44GZ44KLIGl0ZW0g44KS5L2c5oiQ44GX44Gm55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGRJdGVtKFxuICAgICAgICBoZWlnaHQ6IG51bWJlcixcbiAgICAgICAgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcixcbiAgICAgICAgaW5mbzogVW5rbm93bk9iamVjdCxcbiAgICApOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGdyb3VwOiB0aGlzIH0sIGluZm8pO1xuICAgICAgICBjb25zdCBpdGVtID0gbmV3IEl0ZW1Qcm9maWxlKHRoaXMuX293bmVyLmNvbnRleHQsIE1hdGgudHJ1bmMoaGVpZ2h0KSwgaW5pdGlhbGl6ZXIsIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIF9vd25lciDjga7nrqHnkIbkuIvjgavjgYLjgovjgajjgY3jga/pgJ/jgoTjgYvjgavov73liqBcbiAgICAgICAgaWYgKCdyZWdpc3RlcmVkJyA9PT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtLCB0aGlzLmdldE5leHRJdGVtSW5kZXgoKSk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQge0BsaW5rIEdyb3VwUHJvZmlsZX0gYXMgY2hpbGQgZWxlbWVudC5cbiAgICAgKiBAamEg5a2Q6KaB57Sg44Go44GX44GmIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAvIGluc3RhbmNlIGFycmF5XG4gICAgICovXG4gICAgcHVibGljIGFkZENoaWxkcmVuKHRhcmdldDogR3JvdXBQcm9maWxlIHwgR3JvdXBQcm9maWxlW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gQXJyYXkuaXNBcnJheSh0YXJnZXQpID8gdGFyZ2V0IDogW3RhcmdldF07XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGNoaWxkLnNldFBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jaGlsZHJlbi5wdXNoKC4uLmNoaWxkcmVuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSBpZiBpdCBoYXMgYSBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBnZXQgaGFzQ2hpbGRyZW4oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2NoaWxkcmVuLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgZXhwYW5zaW9uLlxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5flsZXplotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZXhwYW5kKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdyZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdleHBhbmRpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtcywgdGhpcy5nZXROZXh0SXRlbUluZGV4KCkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyDlrZDopoHntKDjgYzjgarjgY/jgabjgoLlsZXplovnirbmhYvjgavjgZnjgotcbiAgICAgICAgdGhpcy5fZXhwYW5kZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cCBjb2xsYXBzZS5cbiAgICAgKiBAamEg44Kw44Or44O844OX5Y+O5p2fXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgc3BlbnQgcmVtb3ZpbmcgZWxlbWVudHMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqICAtIGBqYWAg6KaB57Sg5YmK6Zmk44Gr6LK744KE44GZ6YGF5bu25pmC6ZaTLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgY29sbGFwc2UoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCd1bnJlZ2lzdGVyZWQnKTtcbiAgICAgICAgICAgIGlmICgwIDwgaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsYXkgPSBkZWxheSA/PyB0aGlzLl9vd25lci5jb250ZXh0Lm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb247XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fb3duZXIuc3RhdHVzU2NvcGUoJ2NvbGxhcHNpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBpdGVtc1swXS5pbmRleCAmJiB0aGlzLl9vd25lci5yZW1vdmVJdGVtKGl0ZW1zWzBdLmluZGV4LCBpdGVtcy5sZW5ndGgsIGRlbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5Y+O5p2f54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3cgc2VsZiBpbiB2aXNpYmxlIGFyZWEgb2YgbGlzdC5cbiAgICAgKiBAamEg6Ieq6Lqr44KS44Oq44K544OI44Gu5Y+v6KaW6aCY5Z+f44Gr6KGo56S6XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb3B0aW9uJ3Mgb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBlbnN1cmVWaXNpYmxlKG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIChudWxsICE9IHRoaXMuX2l0ZW1zWzBdLmluZGV4KSAmJiBhd2FpdCB0aGlzLl9vd25lci5lbnN1cmVWaXNpYmxlKHRoaXMuX2l0ZW1zWzBdLmluZGV4LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnM/LmNhbGxiYWNrPy4odGhpcy5fb3duZXIuc2Nyb2xsUG9zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUb2dnbGUgZXhwYW5kIC8gY29sbGFwc2UuXG4gICAgICogQGphIOmWi+mWieOBruODiOOCsOODq1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHRvZ2dsZShkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5fZXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29sbGFwc2UoZGVsYXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5leHBhbmQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjgbjnmbvpjLIuIOesrDHpmo7lsaTjgrDjg6vjg7zjg5fjga7jgb/nmbvpjLLlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5zZXJ0aW9uIHBvc2l0aW9uIHdpdGggaW5kZXhcbiAgICAgKiAgLSBgamFgIOaMv+WFpeS9jee9ruOCkiBpbmRleCDjgafmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIoaW5zZXJ0VG86IG51bWJlcik6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3JlZ2lzdGVyJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKHRoaXMucHJlcHJvY2VzcygncmVnaXN0ZXJlZCcpLCBpbnNlcnRUbyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN0b3JlIHRvIGxpc3Qgdmlldy4gT25seSAxc3QgbGF5ZXIgZ3JvdXAgY2FuIGJlIHNwZWNpZmllZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G45b6p5YWDLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/5oyH56S65Y+v6IO9LlxuICAgICAqL1xuICAgIHB1YmxpYyByZXN0b3JlKCk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3Jlc3RvcmUnIG1ldGhvZCBpcyBhY2NlcHRhYmxlIG9ubHkgMXN0IGxheWVyIGdyb3VwLmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5fZXhwYW5kZWQgPyB0aGlzLl9pdGVtcy5jb25jYXQodGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgnYWN0aXZlJykpIDogdGhpcy5faXRlbXMuc2xpY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwg6KaqIEdyb3VwIOaMh+WumiAqL1xuICAgIHByaXZhdGUgc2V0UGFyZW50KHBhcmVudDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICByZWdpc3RlciAvIHVucmVnaXN0ZXIg44Gu5YmN5Yem55CGICovXG4gICAgcHJpdmF0ZSBwcmVwcm9jZXNzKG5ld1N0YXR1czogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcpOiBJdGVtUHJvZmlsZVtdIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgaWYgKG5ld1N0YXR1cyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKC4uLnRoaXMuX2l0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSBuZXdTdGF0dXM7XG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIOaTjeS9nOWvvuixoeOBriBJdGVtUHJvZmlsZSDphY3liJfjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIHF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KG9wZXJhdGlvbjogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcgfCAnYWN0aXZlJyk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBmaW5kVGFyZ2V0cyA9IChncm91cDogR3JvdXBQcm9maWxlKTogSXRlbVByb2ZpbGVbXSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBncm91cC5fY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndW5yZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGQucHJlcHJvY2VzcyhvcGVyYXRpb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdhY3RpdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY2hpbGQuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZC5faXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0aW9uOiAke29wZXJhdGlvbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmZpbmRUYXJnZXRzKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmluZFRhcmdldHModGhpcyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgVmlldyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdFZpZXcsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxuICAgIElMaXN0SXRlbVZpZXcsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IG93bmVyOiBJTGlzdFZpZXc7XG4gICAgcmVhZG9ubHkgaXRlbTogSXRlbVByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIExpc3RJdGVtVmlld30gY29uc3RydWN0aW9uLlxuICogQGphIHtAbGluayBMaXN0SXRlbVZpZXd9IOani+evieOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBvd25lcjogSUxpc3RWaWV3O1xuICAgIGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIExpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RJdGVtVmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG93bmVyLCBpdGVtIH0gPSBvcHRpb25zO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIG93bmVyLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKiBPd25lciDlj5blvpcgKi9cbiAgICBnZXQgb3duZXIoKTogSUxpc3RWaWV3IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLm93bmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFZpZXcgY29tcG9uZW50IG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy4kZWwuY2hpbGRyZW4oKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy4kZWwub2ZmKCk7XG4gICAgICAgIC8vIHRoaXMuJGVsIOOBr+WGjeWIqeeUqOOBmeOCi+OBn+OCgeWujOWFqOOBquegtOajhOOBr+OBl+OBquOBhFxuICAgICAgICB0aGlzLnNldEVsZW1lbnQoJ251bGwnKTtcbiAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0SXRlbVZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgb3duIGl0ZW0gaW5kZXhcbiAgICAgKiBAamEg6Ieq6Lqr44GuIGl0ZW0g44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLmluZGV4ITtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNwZWNpZmllZCBoZWlnaHQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+mrmOOBleOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBpZiBjaGlsZCBub2RlIGV4aXN0cy5cbiAgICAgKiBAamEgY2hpbGQgbm9kZSDjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaGFzQ2hpbGROb2RlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLiRlbD8uY2hpbGRyZW4oKS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBpdGVtJ3MgaGVpZ2h0LlxuICAgICAqIEBqYSBpdGVtIOOBrumrmOOBleOCkuabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld0hlaWdodFxuICAgICAqICAtIGBlbmAgbmV3IGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5paw44GX44GE6auY44GVXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBvcHRpb25zIG9iamVjdFxuICAgICAqICAtIGBqYWAg5pu05paw44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzLiRlbCAmJiB0aGlzLmhlaWdodCAhPT0gbmV3SGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLnVwZGF0ZUhlaWdodChuZXdIZWlnaHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy4kZWwuaGVpZ2h0KG5ld0hlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIE51bGxhYmxlLFxuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIHR5cGUgQ29ubmVjdEV2ZW50TWFwLFxuICAgIHR5cGUgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdFNjcm9sbGVyRmFjdG9yeSxcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgU2Nyb2xsZXJFdmVudE1hcCA9IEhUTUxFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXAgJiB7ICdzY3JvbGxzdG9wJzogRXZlbnQ7IH07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIE1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OID0gNTAsXG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBIVE1MRWxlbWVudC5cbiAqIEBqYSBIVE1MRWxlbWVudCDjgpLlr77osaHjgajjgZfjgZ8ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IOWun+ijheOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRWxlbWVudFNjcm9sbGVyIGltcGxlbWVudHMgSUxpc3RTY3JvbGxlciB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJHRhcmdldDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRzY3JvbGxNYXA6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnM7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsU3RvcFRyaWdnZXI6IERPTUV2ZW50TGlzdGVuZXI7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsRHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IERPTVNlbGVjdG9yLCBtYXA6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldCA9ICQodGFyZ2V0KTtcbiAgICAgICAgdGhpcy5fJHNjcm9sbE1hcCA9IHRoaXMuXyR0YXJnZXQuY2hpbGRyZW4oKS5maXJzdCgpO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcblxuICAgICAgICAvKlxuICAgICAgICAgKiBmaXJlIGN1c3RvbSBldmVudDogYHNjcm9sbHN0b3BgXG4gICAgICAgICAqIGBzY3JvbGxlbmRgIOOBriBTYWZhcmkg5a++5b+c5b6F44GhXG4gICAgICAgICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9FbGVtZW50L3Njcm9sbGVuZF9ldmVudFxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IHRpbWVyOiBUaW1lckhhbmRsZTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSB0aW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQudHJpZ2dlcihuZXcgQ3VzdG9tRXZlbnQoJ3Njcm9sbHN0b3AnLCB7IGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUgfSkpO1xuICAgICAgICAgICAgfSwgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPz8gQ29uc3QuTUlOX1NDUk9MTFNUT1BfRFVSQVRJT04pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxTdG9wVHJpZ2dlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKiog44K/44Kk44OX5a6a576p6K2Y5Yil5a2QICovXG4gICAgc3RhdGljIGdldCBUWVBFKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnY2RwOmVsZW1lbnQtb3ZlcmZsb3ctc2Nyb2xsZXInO1xuICAgIH1cblxuICAgIC8qKiBmYWN0b3J5IOWPluW+lyAqL1xuICAgIHN0YXRpYyBnZXRGYWN0b3J5KCk6IExpc3RTY3JvbGxlckZhY3Rvcnkge1xuICAgICAgICBjb25zdCBmYWN0b3J5ID0gKHRhcmdldDogRE9NU2VsZWN0b3IsIG1hcDogRE9NU2VsZWN0b3IsIG9wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucyk6IElMaXN0U2Nyb2xsZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBFbGVtZW50U2Nyb2xsZXIodGFyZ2V0LCBtYXAsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBzZXQgdHlwZSBzaWduYXR1cmUuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGZhY3RvcnksIHtcbiAgICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBFbGVtZW50U2Nyb2xsZXIuVFlQRSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFjdG9yeSBhcyBMaXN0U2Nyb2xsZXJGYWN0b3J5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsZXJcblxuICAgIC8qKiBTY3JvbGxlciDjga7lnovmg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXQgdHlwZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gRWxlbWVudFNjcm9sbGVyLlRZUEU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruWPluW+lyAqL1xuICAgIGdldCBwb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+acgOWkp+WApOS9jee9ruOCkuWPluW+lyAqL1xuICAgIGdldCBwb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuXyRzY3JvbGxNYXAuaGVpZ2h0KCkgLSB0aGlzLl8kdGFyZ2V0LmhlaWdodCgpLCAwKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76YyyICovXG4gICAgb24odHlwZTogJ3Njcm9sbCcgfCAnc2Nyb2xsc3RvcCcsIGNhbGxiYWNrOiBET01FdmVudExpc3RlbmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub248U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76Yyy6Kej6ZmkICovXG4gICAgb2ZmKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9mZjxTY3JvbGxlckV2ZW50TWFwPih0eXBlLCBjYWxsYmFjayBhcyBVbmtub3duRnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHBvcyA9PT0gdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AoKSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gKGFuaW1hdGUgPz8gdGhpcy5fb3B0aW9ucy5lbmFibGVBbmltYXRpb24pID8gdGltZSA/PyB0aGlzLl9vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AocG9zLCB0aGlzLl9zY3JvbGxEdXJhdGlvbiwgdW5kZWZpbmVkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDjga7nirbmhYvmm7TmlrAgKi9cbiAgICB1cGRhdGUoKTogdm9pZCB7XG4gICAgICAgIC8vIG5vb3BcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu56C05qOEICovXG4gICAgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldD8ub2ZmKCk7XG4gICAgICAgICh0aGlzLl8kdGFyZ2V0IGFzIE51bGxhYmxlPERPTT4pID0gKHRoaXMuXyRzY3JvbGxNYXAgYXMgTnVsbGFibGU8RE9NPikgPSBudWxsO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBwb3N0LFxuICAgIG5vb3AsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQge1xuICAgIGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyxcbiAgICBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uLFxuICAgIGNsZWFyVHJhbnNpdGlvbixcbn0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0Q29udGV4dCxcbiAgICBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbiAgICBJTGlzdE9wZXJhdGlvbixcbiAgICBJTGlzdFNjcm9sbGFibGUsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Vmlld0dsb2JhbENvbmZpZyB9IGZyb20gJy4uL2dsb2JhbC1jb25maWcnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUsIFBhZ2VQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5pbXBvcnQgeyBFbGVtZW50U2Nyb2xsZXIgfSBmcm9tICcuL2VsZW1lbnQtc2Nyb2xsZXInO1xuXG4vKiogTGlzdENvbnRleHRPcHRpb25zIOaXouWumuWApCAqL1xuY29uc3QgX2RlZmF1bHRPcHRzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+ID0ge1xuICAgIHNjcm9sbGVyRmFjdG9yeTogRWxlbWVudFNjcm9sbGVyLmdldEZhY3RvcnkoKSxcbiAgICBlbmFibGVIaWRkZW5QYWdlOiBmYWxzZSxcbiAgICBlbmFibGVUcmFuc2Zvcm1PZmZzZXQ6IHRydWUsXG4gICAgc2Nyb2xsTWFwUmVmcmVzaEludGVydmFsOiAyMDAsXG4gICAgc2Nyb2xsUmVmcmVzaERpc3RhbmNlOiAyMDAsXG4gICAgcGFnZVByZXBhcmVDb3VudDogMyxcbiAgICBwYWdlUHJlbG9hZENvdW50OiAxLFxuICAgIGVuYWJsZUFuaW1hdGlvbjogdHJ1ZSxcbiAgICBhbmltYXRpb25EdXJhdGlvbjogMCxcbiAgICBiYXNlRGVwdGg6ICdhdXRvJyxcbiAgICBpdGVtVGFnTmFtZTogJ2RpdicsXG4gICAgcmVtb3ZlSXRlbVdpdGhUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZUR1bW15SW5hY3RpdmVTY3JvbGxNYXA6IGZhbHNlLFxufTtcblxuLyoqIGludmFsaWQgaW5zdGFuY2UgKi9cbmNvbnN0IF8kaW52YWxpZCA9ICQoKSBhcyBET007XG5cbi8qKiDliJ3mnJ/ljJbmuIjjgb/jgYvmpJzoqLwgKi9cbmZ1bmN0aW9uIHZlcmlmeTxUPih4OiBUIHwgdW5kZWZpbmVkKTogYXNzZXJ0cyB4IGlzIFQge1xuICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OKTtcbiAgICB9XG59XG5cbi8qKiBvdmVyZmxvdy15IOOCkuS/neiovCAqL1xuZnVuY3Rpb24gZW5zdXJlT3ZlcmZsb3dZKCRlbDogRE9NKTogRE9NIHtcbiAgICBjb25zdCBvdmVyZmxvd1kgPSAkZWwuY3NzKCdvdmVyZmxvdy15Jyk7XG4gICAgaWYgKCdoaWRkZW4nID09PSBvdmVyZmxvd1kgfHwgJ3Zpc2libGUnID09PSBvdmVyZmxvd1kpIHtcbiAgICAgICAgJGVsLmNzcygnb3ZlcmZsb3cteScsICdhdXRvJyk7XG4gICAgfVxuICAgIHJldHVybiAkZWw7XG59XG5cbi8qKiBzY3JvbGwtbWFwIGVsZW1lbnQg44KS5L+d6Ki8ICovXG5mdW5jdGlvbiBlbnN1cmVTY3JvbGxNYXAoJHJvb3Q6IERPTSwgbWFwQ2xhc3M6IHN0cmluZyk6IERPTSB7XG4gICAgbGV0ICRtYXAgPSAkcm9vdC5maW5kKGAuJHttYXBDbGFzc31gKTtcbiAgICAvLyAkbWFwIOOBjOeEoeOBhOWgtOWQiOOBr+S9nOaIkOOBmeOCi1xuICAgIGlmICgkbWFwLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICRtYXAgPSAkKGA8ZGl2IGNsYXNzPVwiJHttYXBDbGFzc31cIj48L2Rpdj5gKTtcbiAgICAgICAgJHJvb3QuYXBwZW5kKCRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gJG1hcDtcbn1cblxuLyoqIEBpbnRlcm5hbCDjgqLjgqTjg4bjg6DliYrpmaTmg4XloLEgKi9cbmludGVyZmFjZSBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgIHJlbW92ZWQ6IEl0ZW1Qcm9maWxlW107XG4gICAgZGVsdGE6IG51bWJlcjtcbiAgICB0cmFuc2l0aW9uOiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBzY3JvbGwgcHJvY2Vzc2luZyB0aGF0IG1hbmFnZXMgbWVtb3J5LiBBY2Nlc3NlcyB0aGUgRE9NLlxuICogQGphIOODoeODouODqueuoeeQhuOCkuihjOOBhuOCueOCr+ODreODvOODq+WHpueQhuOBruOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuS4gRE9NIOOBq+OCouOCr+OCu+OCueOBmeOCiy5cbiAqL1xuZXhwb3J0IGNsYXNzIExpc3RDb3JlIGltcGxlbWVudHMgSUxpc3RDb250ZXh0LCBJTGlzdE9wZXJhdGlvbiwgSUxpc3RTY3JvbGxhYmxlLCBJTGlzdEJhY2t1cFJlc3RvcmUge1xuICAgIHByaXZhdGUgXyRyb290OiBET007XG4gICAgcHJpdmF0ZSBfJG1hcDogRE9NO1xuICAgIHByaXZhdGUgX21hcEhlaWdodCA9IDA7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsZXI6IElMaXN0U2Nyb2xsZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKiogVUkg6KGo56S65Lit44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9hY3RpdmUgPSB0cnVlO1xuXG4gICAgLyoqIOWIneacn+OCquODl+OCt+ODp+ODs+OCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3NldHRpbmdzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+O1xuICAgIC8qKiBTY3JvbGwgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbEV2ZW50SGFuZGxlcjogKGV2PzogRXZlbnQpID0+IHZvaWQ7XG4gICAgLyoqIFNjcm9sbCBTdG9wIEV2ZW50IEhhbmRsZXIgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogMeODmuODvOOCuOWIhuOBrumrmOOBleOBruWfuua6luWApCAqL1xuICAgIHByaXZhdGUgX2Jhc2VIZWlnaHQgPSAwO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgSXRlbVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiog566h55CG5LiL44Gr44GC44KLIFBhZ2VQcm9maWxlIOmFjeWIlyAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhZ2VzOiBQYWdlUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog5pyA5paw44Gu6KGo56S66aCY5Z+f5oOF5aCx44KS5qC857SNIChTY3JvbGwg5Lit44Gu5pu05paw5Yem55CG44Gr5L2/55SoKSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCA9IHtcbiAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgIGZyb206IDAsXG4gICAgICAgIHRvOiAwLFxuICAgICAgICBwb3M6IDAsICAgIC8vIHNjcm9sbCBwb3NpdGlvblxuICAgIH07XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggX2l0ZW1zIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSB0aGlzLl8kbWFwID0gXyRpbnZhbGlkO1xuICAgICAgICB0aGlzLl9zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIF9kZWZhdWx0T3B0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbCh0aGlzLl9zY3JvbGxlciEucG9zKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlciA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TY3JvbGxTdG9wKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruWIneacn+WMliAqL1xuICAgIHB1YmxpYyBpbml0aWFsaXplKCRyb290OiBET00sIGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIOaXouOBq+ani+evieOBleOCjOOBpuOBhOOBn+WgtOWQiOOBr+egtOajhFxuICAgICAgICBpZiAodGhpcy5fJHJvb3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuXyRyb290ID0gZW5zdXJlT3ZlcmZsb3dZKCRyb290KTtcbiAgICAgICAgdGhpcy5fJG1hcCAgPSBlbnN1cmVTY3JvbGxNYXAodGhpcy5fJHJvb3QsIHRoaXMuX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHRoaXMuY3JlYXRlU2Nyb2xsZXIoKTtcbiAgICAgICAgdGhpcy5zZXRCYXNlSGVpZ2h0KGhlaWdodCk7XG4gICAgICAgIHRoaXMuc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEICovXG4gICAgcHVibGljIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVzZXRTY3JvbGxlckNvbmRpdGlvbigpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uZGVzdHJveSgpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXMuXyRyb290ID0gdGhpcy5fJG1hcCA9IF8kaW52YWxpZDtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Gu5Z+65rqW5YCk44KS5Y+W5b6XICovXG4gICAgcHVibGljIHNldEJhc2VIZWlnaHQoaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKGhlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbYmFzZSBoaWdodDogJHtoZWlnaHR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fYmFzZUhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL6Kit5a6aICovXG4gICAgcHVibGljIGFzeW5jIHNldEFjdGl2ZVN0YXRlKGFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG4gICAgICAgIGF3YWl0IHRoaXMudHJlYXRTY3JvbGxQb3NpdGlvbigpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL5Yik5a6aICovXG4gICAgZ2V0IGFjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44Gu5L+d5a2YL+W+qeWFgyAqL1xuICAgIHB1YmxpYyBhc3luYyB0cmVhdFNjcm9sbFBvc2l0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuXG4gICAgICAgIGNvbnN0IG9mZnNldCA9ICh0aGlzLl9zY3JvbGxlci5wb3MgLSB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zKTtcbiAgICAgICAgY29uc3QgeyB1c2VEdW1teUluYWN0aXZlU2Nyb2xsTWFwOiB1c2VEdW1teU1hcCB9ID0gdGhpcy5fc2V0dGluZ3M7XG5cbiAgICAgICAgY29uc3QgdXBkYXRlT2Zmc2V0ID0gKCR0YXJnZXQ6IERPTSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2xhdGVZIH0gPSBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMoJHRhcmdldFswXSk7XG4gICAgICAgICAgICBpZiAob2Zmc2V0ICE9PSB0cmFuc2xhdGVZKSB7XG4gICAgICAgICAgICAgICAgJHRhcmdldC5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7b2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9zY3JvbGxlci5zY3JvbGxUbyh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zLCBmYWxzZSwgMCk7XG4gICAgICAgICAgICB0aGlzLl8kbWFwLmNzcyh7ICd0cmFuc2Zvcm0nOiAnJywgJ2Rpc3BsYXknOiAnYmxvY2snIH0pO1xuICAgICAgICAgICAgaWYgKHVzZUR1bW15TWFwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmVwYXJlSW5hY3RpdmVNYXAoKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0ICRtYXAgPSB1c2VEdW1teU1hcCA/IHRoaXMucHJlcGFyZUluYWN0aXZlTWFwKCkgOiB0aGlzLl8kbWFwO1xuICAgICAgICAgICAgdXBkYXRlT2Zmc2V0KCRtYXApO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RDb250ZXh0XG5cbiAgICAvKiogZ2V0IHNjcm9sbC1tYXAgZWxlbWVudCAqL1xuICAgIGdldCAkc2Nyb2xsTWFwKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwO1xuICAgIH1cblxuICAgIC8qKiBnZXQgc2Nyb2xsLW1hcCBoZWlnaHQgW3B4XSAqL1xuICAgIGdldCBzY3JvbGxNYXBIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXAubGVuZ3RoID8gdGhpcy5fbWFwSGVpZ2h0IDogMDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IHtAbGluayBMaXN0Q29udGV4dE9wdGlvbnN9ICovXG4gICAgZ2V0IG9wdGlvbnMoKTogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogdXBkYXRlIHNjcm9sbC1tYXAgaGVpZ2h0IChkZWx0YSBbcHhdKSAqL1xuICAgIHVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kbWFwLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ICs9IE1hdGgudHJ1bmMoZGVsdGEpO1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZS5cbiAgICAgICAgICAgIGlmICh0aGlzLl9tYXBIZWlnaHQgPCAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuXyRtYXAuaGVpZ2h0KHRoaXMuX21hcEhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogdXBkYXRlIGludGVybmFsIHByb2ZpbGUgKi9cbiAgICB1cGRhdGVQcm9maWxlcyhmcm9tOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBfaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGZvciAobGV0IGkgPSBmcm9tLCBuID0gX2l0ZW1zLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgaWYgKDAgPCBpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IF9pdGVtc1tpIC0gMV07XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLmluZGV4ID0gbGFzdC5pbmRleCEgKyAxO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSBsYXN0Lm9mZnNldCArIGxhc3QuaGVpZ2h0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCByZWN5Y2xhYmxlIGVsZW1lbnQgKi9cbiAgICBmaW5kUmVjeWNsZUVsZW1lbnRzKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwLmZpbmQoYC4ke3RoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTfWApO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0Vmlld1xuXG4gICAgLyoqIOWIneacn+WMlua4iOOBv+OBi+WIpOWumiAqL1xuICAgIGdldCBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9zY3JvbGxlcjtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLCBpbmZvOiBVbmtub3duT2JqZWN0LCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hZGRJdGVtKG5ldyBJdGVtUHJvZmlsZSh0aGlzLCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAo5YaF6YOo55SoKSAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbSA6IFtpdGVtXTtcbiAgICAgICAgbGV0IGRlbHRhSGVpZ2h0ID0gMDtcbiAgICAgICAgbGV0IGFkZFRhaWwgPSBmYWxzZTtcblxuICAgICAgICBpZiAobnVsbCA9PSBpbnNlcnRUbyB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbnNlcnRUbykge1xuICAgICAgICAgICAgaW5zZXJ0VG8gPSB0aGlzLl9pdGVtcy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zZXJ0VG8gPT09IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRkVGFpbCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgbWFwIOOBruabtOaWsFxuICAgICAgICBmb3IgKGNvbnN0IGl0IG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBkZWx0YUhlaWdodCArPSBpdC5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGFIZWlnaHQpO1xuXG4gICAgICAgIC8vIOaMv+WFpVxuICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaW5zZXJ0VG8sIDAsIC4uLml0ZW1zKTtcblxuICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICBpZiAoIWFkZFRhaWwpIHtcbiAgICAgICAgICAgIGlmICgwID09PSBpbnNlcnRUbykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbnNlcnRUbyAtIDFdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaQgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIsIHNpemU/OiBudW1iZXIsIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4LCBhcmcyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXgsIGFyZzIsIGFyZzMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6ICovXG4gICAgcHJpdmF0ZSBfcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5OiBudW1iZXIpOiBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgICAgICBjb25zdCByZW1vdmVkOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGxldCBkZWx0YSA9IDA7XG4gICAgICAgIGxldCB0cmFuc2l0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuX2l0ZW1zW2lkeF07XG4gICAgICAgICAgICBkZWx0YSArPSBpdGVtLmhlaWdodDtcbiAgICAgICAgICAgIC8vIOWJiumZpOimgee0oOOBriB6LWluZGV4IOOBruWIneacn+WMllxuICAgICAgICAgICAgaXRlbS5yZXNldERlcHRoKCk7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8g6Ieq5YuV6Kit5a6a44O75YmK6Zmk6YGF5bu25pmC6ZaT44GM6Kit5a6a44GV44KM44GL44Gk44CB44K544Kv44Ot44O844Or44Od44K444K344On44Oz44Gr5aSJ5pu044GM44GC44KL5aC05ZCI44GvIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0aGlzLl9zZXR0aW5ncy5yZW1vdmVJdGVtV2l0aFRyYW5zaXRpb24gJiYgKDAgPCBkZWxheSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLnNjcm9sbFBvcztcbiAgICAgICAgICAgIGNvbnN0IHBvc01heCA9IHRoaXMuc2Nyb2xsUG9zTWF4IC0gZGVsdGE7XG4gICAgICAgICAgICB0cmFuc2l0aW9uID0gKHBvc01heCA8IGN1cnJlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgcmVtb3ZlZCwgZGVsdGEsIHRyYW5zaXRpb24gfTtcbiAgICB9XG5cbiAgICAvKiogaGVscGVyOiDliYrpmaTmmYLjga7mm7TmlrAgKi9cbiAgICBwcml2YXRlIF91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQ6IFJlbW92ZUl0ZW1zQ29udGV4dCwgZGVsYXk6IG51bWJlciwgcHJvZmlsZVVwZGF0ZTogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH0gPSBjb250ZXh0O1xuXG4gICAgICAgIC8vIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjdXN0b21pemUgcG9pbnQ6IOODl+ODreODleOCoeOCpOODq+OBruabtOaWsFxuICAgICAgICBwcm9maWxlVXBkYXRlKCk7XG5cbiAgICAgICAgLy8g44K544Kv44Ot44O844Or6aCY5Z+f44Gu5pu05pawXG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KC1kZWx0YSk7XG4gICAgICAgIC8vIOmBheW7tuWJiumZpFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiByZW1vdmVkKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDog6YCj57aaIGluZGV4IOeJiCAqL1xuICAgIHByaXZhdGUgX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyIHwgdW5kZWZpbmVkLCBkZWxheTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgICAgIHNpemUgPSBzaXplID8/IDE7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcblxuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4ICsgc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3JlbW92ZUl0ZW0oKSwgaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBpbmRleGVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogc2l6ZSB9LCAoXywgaSkgPT4gaW5kZXggKyBpKTtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luZGV4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluZGV4LCBzaXplKTtcbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5kZXgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDogcmFuZG9tIGFjY2VzcyDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtUmFuZG9tbHkoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcbiAgICAgICAgaW5kZXhlcy5zb3J0KChsaHMsIHJocykgPT4gcmhzIC0gbGhzKTsgLy8g6ZmN6aCG44K944O844OIXG5cbiAgICAgICAgZm9yIChjb25zdCBpbmRleCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbcmVtb3ZlSXRlbSgpLCBpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlcywgZGVsYXkpO1xuXG4gICAgICAgIC8vIOabtOaWsFxuICAgICAgICB0aGlzLl91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQsIGRlbGF5LCAoKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpZHhdLnBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpZHhdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBpbmRleGVzW2luZGV4ZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGZpcnN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIHNjcm9sbCBtYXAg44Gu44OI44Op44Oz44K444K344On44Oz6Kit5a6aICovXG4gICAgcHJpdmF0ZSBzZXR1cFNjcm9sbE1hcFRyYW5zaXRpb24oZGVsYXk6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuICAgICAgICBjb25zdCBlbCA9IHRoaXMuXyRtYXBbMF07XG4gICAgICAgIHRoaXMuXyRtYXAudHJhbnNpdGlvbkVuZCgoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRyYW5zaXRpb24oZWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbihlbCwgJ2hlaWdodCcsIGRlbGF5LCAnZWFzZScpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gaXRlbSDjgavoqK3lrprjgZfjgZ/mg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXRJdGVtSW5mbyh0YXJnZXQ6IG51bWJlciB8IEV2ZW50KTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zLCBfY29uZmlnIH0gPSB0aGlzO1xuXG4gICAgICAgIGNvbnN0IHBhcnNlciA9ICgkdGFyZ2V0OiBET00pOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIoJHRhcmdldC5hdHRyKF9jb25maWcuREFUQV9JVEVNX0lOREVYKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKSB8fCAkdGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdjYW5ub3QgZGl0ZWN0IGl0ZW0gZnJvbSBldmVudCBvYmplY3QuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlcigkdGFyZ2V0LnBhcmVudCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpbmRleCA9IHRhcmdldCBpbnN0YW5jZW9mIEV2ZW50ID8gcGFyc2VyKCQodGFyZ2V0LnRhcmdldCBhcyBIVE1MRWxlbWVudCkpIDogTnVtYmVyKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKE51bWJlci5pc05hTihpbmRleCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFt1bnN1cHBvcnRlZCB0eXBlOiAke3R5cGVvZiB0YXJnZXR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPCAwIHx8IF9pdGVtcy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IGdldEl0ZW1JbmZvKCkgW2ludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX2l0ZW1zW2luZGV4XS5pbmZvO1xuICAgIH1cblxuICAgIC8qKiDjgqLjgq/jg4bjgqPjg5bjg5rjg7zjgrjjgpLmm7TmlrAgKi9cbiAgICByZWZyZXNoKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IF9wYWdlcywgX2l0ZW1zLCBfc2V0dGluZ3MsIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQgfSA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0czogUmVjb3JkPG51bWJlciwgJ2FjdGl2YXRlJyB8ICdoaWRlJyB8ICdkZWFjdGl2YXRlJz4gPSB7fTtcbiAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgIGNvbnN0IGhpZ2hQcmlvcml0eUluZGV4OiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGNvbnN0IHN0b3JlTmV4dFBhZ2VTdGF0ZSA9IChpbmRleDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKE1hdGguYWJzKGN1cnJlbnRQYWdlSW5kZXggLSBpbmRleCkgPD0gX3NldHRpbmdzLnBhZ2VQcmVwYXJlQ291bnQpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zZXR0aW5ncy5lbmFibGVIaWRkZW5QYWdlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnaGlkZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2RlYWN0aXZhdGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY3VycmVudCBwYWdlIOOBriDliY3lvozjga8gaGlnaCBwcmlvcml0eSDjgavjgZnjgotcbiAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4ICsgMSA9PT0gaW5kZXggfHwgY3VycmVudFBhZ2VJbmRleCAtIDEgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8g5a++6LGh54Sh44GXXG4gICAgICAgIGlmIChfaXRlbXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoQ291bnQgPSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCArIF9zZXR0aW5ncy5wYWdlUHJlbG9hZENvdW50O1xuICAgICAgICAgICAgY29uc3QgYmVnaW5JbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudDtcbiAgICAgICAgICAgIGNvbnN0IGVuZEluZGV4ID0gY3VycmVudFBhZ2VJbmRleCArIHNlYXJjaENvdW50O1xuXG4gICAgICAgICAgICBsZXQgb3ZlcmZsb3dQcmV2ID0gMCwgb3ZlcmZsb3dOZXh0ID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IHBhZ2VJbmRleCA9IGJlZ2luSW5kZXg7IHBhZ2VJbmRleCA8PSBlbmRJbmRleDsgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd1ByZXYrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd05leHQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93UHJldikge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQgKyAxOyBpIDwgb3ZlcmZsb3dQcmV2OyBpKyssIHBhZ2VJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93TmV4dCkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4IC0gc2VhcmNoQ291bnQgLSAxOyBpIDwgb3ZlcmZsb3dOZXh0OyBpKyssIHBhZ2VJbmRleC0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDkuI3opoHjgavjgarjgaPjgZ8gcGFnZSDjga4g6Z2e5rS75oCn5YyWXG4gICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBfcGFnZXMuZmlsdGVyKHBhZ2UgPT4gJ2luYWN0aXZlJyAhPT0gcGFnZS5zdGF0dXMpKSB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRzW3BhZ2UuaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgcGFnZS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlhKrlhYggcGFnZSDjga4gYWN0aXZhdGVcbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaGlnaFByaW9yaXR5SW5kZXguc29ydCgobGhzLCByaHMpID0+IGxocyAtIHJocykpIHsgLy8g5piH6aCG44K944O844OIXG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCAmJiBfcGFnZXNbaWR4XT8uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g44Gd44Gu44G744GL44GuIHBhZ2Ug44GuIOeKtuaFi+WkieabtFxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXRzKSkge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBOdW1iZXIoa2V5KTtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IHRhcmdldHNbaW5kZXhdO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgX3BhZ2VzW2luZGV4XT8uW2FjdGlvbl0/LigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDmm7TmlrDlvozjgavkvb/nlKjjgZfjgarjgYvjgaPjgZ8gRE9NIOOCkuWJiumZpFxuICAgICAgICB0aGlzLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5yZW1vdmUoKTtcblxuICAgICAgICBjb25zdCBwYWdlQ3VycmVudCA9IF9wYWdlc1tjdXJyZW50UGFnZUluZGV4XTtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5mcm9tICA9IHBhZ2VDdXJyZW50Py5nZXRJdGVtRmlyc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC50byAgICA9IHBhZ2VDdXJyZW50Py5nZXRJdGVtTGFzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ID0gY3VycmVudFBhZ2VJbmRleDtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLmFzc2lnblBhZ2UoTWF0aC5tYXgodGhpcy5fcGFnZXMubGVuZ3RoIC0gMSwgMCkpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkCAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgIHRoaXMuYXNzaWduUGFnZSgpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOeuoei9hOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFnZXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faXRlbXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQoMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsYWJsZVxuXG4gICAgLyoqIHNjcm9sbGVyIOOBrueorumhnuOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxlclR5cGUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy50eXBlO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsUG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8ucG9zID8/IDA7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxQb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy5wb3NNYXggPz8gMDtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpCAqL1xuICAgIHNldFNjcm9sbEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LlttZXRob2RdKCdzY3JvbGwnLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or57WC5LqG44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpCAqL1xuICAgIHNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5bbWV0aG9kXSgnc2Nyb2xsc3RvcCcsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBhc3luYyBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBwb3NpdGlvbiwgdG9vIHNtYWxsLiBbcG9zOiAke3Bvc31dYCk7XG4gICAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX3Njcm9sbGVyLnBvc01heCA8IHBvcykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIHBvc2l0aW9uLCB0b28gYmlnLiBbcG9zOiAke3Bvc31dYCk7XG4gICAgICAgICAgICBwb3MgPSB0aGlzLl9zY3JvbGxlci5wb3NNYXg7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcG9zIOOBruOBv+WFiOmnhuOBkeOBpuabtOaWsFxuICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICBpZiAocG9zICE9PSB0aGlzLl9zY3JvbGxlci5wb3MpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Njcm9sbGVyLnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44GfIGl0ZW0g44Gu6KGo56S644KS5L+d6Ki8ICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShpbmRleDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgX3Njcm9sbGVyLCBfaXRlbXMsIF9zZXR0aW5ncywgX2Jhc2VIZWlnaHQgfSA9IHRoaXM7XG5cbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgX2l0ZW1zLmxlbmd0aCA8PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gZW5zdXJlVmlzaWJsZSgpIFtpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBwYXJ0aWFsT0ssIHNldFRvcCwgYW5pbWF0ZSwgdGltZSwgY2FsbGJhY2sgfSA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgcGFydGlhbE9LOiB0cnVlLFxuICAgICAgICAgICAgc2V0VG9wOiBmYWxzZSxcbiAgICAgICAgICAgIGFuaW1hdGU6IF9zZXR0aW5ncy5lbmFibGVBbmltYXRpb24sXG4gICAgICAgICAgICB0aW1lOiBfc2V0dGluZ3MuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICAgICAgICBjYWxsYmFjazogbm9vcCxcbiAgICAgICAgfSwgb3B0aW9ucykgYXMgUmVxdWlyZWQ8TGlzdEVuc3VyZVZpc2libGVPcHRpb25zPjtcblxuICAgICAgICBjb25zdCBjdXJyZW50U2NvcGUgPSB7XG4gICAgICAgICAgICBmcm9tOiBfc2Nyb2xsZXIucG9zLFxuICAgICAgICAgICAgdG86IF9zY3JvbGxlci5wb3MgKyBfYmFzZUhlaWdodCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0YXJnZXQgPSBfaXRlbXNbaW5kZXhdO1xuXG4gICAgICAgIGNvbnN0IHRhcmdldFNjb3BlID0ge1xuICAgICAgICAgICAgZnJvbTogdGFyZ2V0Lm9mZnNldCxcbiAgICAgICAgICAgIHRvOiB0YXJnZXQub2Zmc2V0ICsgdGFyZ2V0LmhlaWdodCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpc0luU2NvcGUgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBpZiAocGFydGlhbE9LKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFNjb3BlLmZyb20gPD0gY3VycmVudFNjb3BlLmZyb20pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRTY29wZS5mcm9tIDw9IHRhcmdldFNjb3BlLnRvO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRTY29wZS5mcm9tIDw9IGN1cnJlbnRTY29wZS50bztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50U2NvcGUuZnJvbSA8PSB0YXJnZXRTY29wZS5mcm9tICYmIHRhcmdldFNjb3BlLnRvIDw9IGN1cnJlbnRTY29wZS50bztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkZXRlY3RQb3NpdGlvbiA9ICgpOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFNjb3BlLmZyb20gPCBjdXJyZW50U2NvcGUuZnJvbVxuICAgICAgICAgICAgICAgID8gdGFyZ2V0U2NvcGUuZnJvbVxuICAgICAgICAgICAgICAgIDogdGFyZ2V0Lm9mZnNldCAtIHRhcmdldC5oZWlnaHQgLy8gYm90dG9tIOWQiOOCj+OBm+OBr+aDheWgseS4jei2s+OBq+OCiOOCiuS4jeWPr1xuICAgICAgICAgICAgO1xuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBwb3M6IG51bWJlcjtcbiAgICAgICAgaWYgKHNldFRvcCkge1xuICAgICAgICAgICAgcG9zID0gdGFyZ2V0U2NvcGUuZnJvbTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0luU2NvcGUoKSkge1xuICAgICAgICAgICAgY2FsbGJhY2soX3Njcm9sbGVyLnBvcyk7XG4gICAgICAgICAgICByZXR1cm47IC8vIG5vb3BcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvcyA9IGRldGVjdFBvc2l0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgICAgIGNhbGxiYWNrKHBvcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0geyBpdGVtczogdGhpcy5faXRlbXMgfTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjCAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoMCA8IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hZGRJdGVtKHRoaXMuX2JhY2t1cFtrZXldLml0ZW1zKTtcblxuICAgICAgICBpZiAocmVidWlsZCkge1xuICAgICAgICAgICAgdGhpcy5yZWJ1aWxkKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYWNrdXApKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5ICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumiAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YS5pdGVtcykpIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0gZGF0YTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9uKCdzY3JvbGxzdG9wJywgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+egtOajhCAqL1xuICAgIHByaXZhdGUgcmVzZXRTY3JvbGxlckNvbmRpdGlvbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub2ZmKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDml6Llrprjga4gU2Nyb2xsZXIg44Kq44OW44K444Kn44Kv44OI44Gu5L2c5oiQICovXG4gICAgcHJpdmF0ZSBjcmVhdGVTY3JvbGxlcigpOiBJTGlzdFNjcm9sbGVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzLnNjcm9sbGVyRmFjdG9yeSh0aGlzLl8kcm9vdCwgdGhpcy5fJG1hcCwgdGhpcy5fc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKiDnj77lnKjjga4gUGFnZSBJbmRleCDjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldFBhZ2VJbmRleCgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2Jhc2VIZWlnaHQsIF9wYWdlcyB9ID0gdGhpcztcbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3QgeyBwb3M6IHNjcm9sbFBvcywgcG9zTWF4OiBzY3JvbGxQb3NNYXggfSA9IF9zY3JvbGxlcjtcblxuICAgICAgICBjb25zdCBzY3JvbGxNYXBTaXplID0gKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICAgICAgcmV0dXJuIGxhc3RQYWdlID8gbGFzdFBhZ2Uub2Zmc2V0ICsgbGFzdFBhZ2UuaGVpZ2h0IDogX2Jhc2VIZWlnaHQ7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgY29uc3QgcG9zID0gKCgpID0+IHtcbiAgICAgICAgICAgIGlmICgwID09PSBzY3JvbGxQb3NNYXggfHwgc2Nyb2xsUG9zTWF4IDw9IF9iYXNlSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY3JvbGxQb3MgKiBzY3JvbGxNYXBTaXplIC8gc2Nyb2xsUG9zTWF4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHZhbGlkUmFuZ2UgPSAocGFnZTogUGFnZVByb2ZpbGUgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhZ2Uub2Zmc2V0IDw9IHBvcyAmJiBwb3MgPD0gcGFnZS5vZmZzZXQgKyBwYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNhbmRpZGF0ZSA9IE1hdGguZmxvb3IocG9zIC8gX2Jhc2VIZWlnaHQpO1xuICAgICAgICBpZiAoMCAhPT0gY2FuZGlkYXRlICYmIF9wYWdlcy5sZW5ndGggPD0gY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICBjYW5kaWRhdGUgPSBfcGFnZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwYWdlID0gX3BhZ2VzW2NhbmRpZGF0ZV07XG4gICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgfSBlbHNlIGlmIChwb3MgPCBwYWdlPy5vZmZzZXQpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYW5kaWRhdGUgLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIHBhZ2UgPSBfcGFnZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNhbmRpZGF0ZSArIDEsIG4gPSBfcGFnZXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFnZSA9IF9wYWdlc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBkZXRlY3QgcGFnZSBpbmRleC4gZmFsbGJhY2s6ICR7X3BhZ2VzLmxlbmd0aCAtIDF9YCk7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBfcGFnZXMubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4gICAgLyoqIOacgOW+jOOBruODmuODvOOCuOOCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgZ2V0TGFzdFBhZ2UoKTogUGFnZVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VzW3RoaXMuX3BhZ2VzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4gqL1xuICAgIHByaXZhdGUgb25TY3JvbGwocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGludGVyc2VjdGlvblJlY3Qg44KS5L2/55So44GZ44KL5aC05ZCILCBTY3JvbGwg44OP44Oz44OJ44Op44O85YWo6Iis44Gv44Gp44GG44GC44KL44G544GN44GL6KaB5qSc6KiOXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMocG9zIC0gdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcykgPCB0aGlzLl9zZXR0aW5ncy5zY3JvbGxSZWZyZXNoRGlzdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5YGc5q2i44Kk44OZ44Oz44OIICovXG4gICAgcHJpdmF0ZSBvblNjcm9sbFN0b3AocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggIT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu44Ki44K144Kk44OzICovXG4gICAgcHJpdmF0ZSBhc3NpZ25QYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoZnJvbSk7XG5cbiAgICAgICAgY29uc3QgeyBfaXRlbXMsIF9wYWdlcywgX2Jhc2VIZWlnaHQsIF9zY3JvbGxlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgYmFzZVBhZ2UgPSB0aGlzLmdldExhc3RQYWdlKCk7XG4gICAgICAgIGNvbnN0IG5leHRJdGVtSW5kZXggPSBiYXNlUGFnZT8uZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgY29uc3QgYXNpZ25lZUl0ZW1zICA9IF9pdGVtcy5zbGljZShuZXh0SXRlbUluZGV4KTtcblxuICAgICAgICBsZXQgd29ya1BhZ2UgPSBiYXNlUGFnZTtcbiAgICAgICAgaWYgKG51bGwgPT0gd29ya1BhZ2UpIHtcbiAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3IFBhZ2VQcm9maWxlKCk7XG4gICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgYXNpZ25lZUl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoX2Jhc2VIZWlnaHQgPD0gd29ya1BhZ2UuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2UuaW5kZXggPSB3b3JrUGFnZS5pbmRleCArIDE7XG4gICAgICAgICAgICAgICAgbmV3UGFnZS5vZmZzZXQgPSB3b3JrUGFnZS5vZmZzZXQgKyB3b3JrUGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2UgPSBuZXdQYWdlO1xuICAgICAgICAgICAgICAgIF9wYWdlcy5wdXNoKHdvcmtQYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW0ucGFnZUluZGV4ID0gd29ya1BhZ2UuaW5kZXg7XG4gICAgICAgICAgICB3b3JrUGFnZS5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG5cbiAgICAgICAgX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu6Kej6ZmkICovXG4gICAgcHJpdmF0ZSBjbGVhclBhZ2UoZnJvbT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYWdlcy5zcGxpY2UoZnJvbSA/PyAwKTtcbiAgICB9XG5cbiAgICAvKiogaW5hY3RpdmUg55SoIE1hcCDjga7nlJ/miJAgKi9cbiAgICBwcml2YXRlIHByZXBhcmVJbmFjdGl2ZU1hcCgpOiBET00ge1xuICAgICAgICBjb25zdCB7IF9jb25maWcsIF8kbWFwLCBfbWFwSGVpZ2h0IH0gPSB0aGlzO1xuICAgICAgICBjb25zdCAkcGFyZW50ID0gXyRtYXAucGFyZW50KCk7XG4gICAgICAgIGxldCAkaW5hY3RpdmVNYXAgPSAkcGFyZW50LmZpbmQoYC4ke19jb25maWcuSU5BQ1RJVkVfQ0xBU1N9YCk7XG5cbiAgICAgICAgaWYgKCRpbmFjdGl2ZU1hcC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBjb25zdCAkbGlzdEl0ZW1WaWV3cyA9IF8kbWFwLmNsb25lKCkuY2hpbGRyZW4oKS5maWx0ZXIoKF8sIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZGV4ID0gTnVtYmVyKCQoZWxlbWVudCkuYXR0cihfY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4IC0gMSA8PSBwYWdlSW5kZXggJiYgcGFnZUluZGV4IDw9IGN1cnJlbnRQYWdlSW5kZXggKyAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRpbmFjdGl2ZU1hcCA9ICQoYDxzZWN0aW9uIGNsYXNzPVwiJHtfY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1N9ICR7X2NvbmZpZy5JTkFDVElWRV9DTEFTU31cIj48L3NlY3Rpb24+YClcbiAgICAgICAgICAgICAgICAuYXBwZW5kKCRsaXN0SXRlbVZpZXdzKVxuICAgICAgICAgICAgICAgIC5oZWlnaHQoX21hcEhlaWdodCk7XG4gICAgICAgICAgICAkcGFyZW50LmFwcGVuZCgkaW5hY3RpdmVNYXApO1xuICAgICAgICAgICAgXyRtYXAuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkaW5hY3RpdmVNYXA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBkb20gYXMgJCxcbiAgICB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFZpZXcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0Q29udGV4dCxcbiAgICBJTGlzdFZpZXcsXG4gICAgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zLFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IExpc3RDb3JlIH0gZnJvbSAnLi9jb3JlL2xpc3QnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgY29udGV4dDogTGlzdENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgY2xhc3MgdGhhdCBzdG9yZXMge0BsaW5rIExpc3RWaWV3fSBpbml0aWFsaXphdGlvbiBpbmZvcm1hdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBruWIneacn+WMluaDheWgseOCkuagvOe0jeOBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCueOCr+ODqeOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEZ1bmNOYW1lID0gc3RyaW5nPlxuICAgIGV4dGVuZHMgTGlzdENvbnRleHRPcHRpb25zLCBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgaW5pdGlhbEhlaWdodD86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBAZW4gVmlydHVhbCBsaXN0IHZpZXcgY2xhc3MgdGhhdCBwcm92aWRlcyBtZW1vcnkgbWFuYWdlbWVudCBmdW5jdGlvbmFsaXR5LlxuICogQGphIOODoeODouODqueuoeeQhuapn+iDveOCkuaPkOS+m+OBmeOCi+S7ruaDs+ODquOCueODiOODk+ODpeODvOOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJTGlzdFZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiBuZXcgTGlzdENvcmUob3B0aW9ucyksXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG5cbiAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuJGVsIGFzIERPTVNlbGVjdG9yPFRFbGVtZW50Pik7XG4gICAgfVxuXG4gICAgLyoqIGNvbnRleHQgYWNjZXNzb3IgKi9cbiAgICBnZXQgY29udGV4dCgpOiBJTGlzdENvbnRleHQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dDtcbiAgICB9XG5cbiAgICAvKiogY29uc3RydWN0IG9wdGlvbiBhY2Nlc3NvciAqL1xuICAgIGdldCBvcHRpb25zKCk6IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm9wdGlvbnM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gVmlldyBjb21wb25lbnQgbWV0aG9kczpcblxuICAgIC8qKiBgdGhpcy5lbGAg5pu05paw5pmC44Gu5paw44GX44GEIEhUTUwg44KS44Os44Oz44OA44Oq44Oz44Kw44Ot44K444OD44Kv44Gu5a6f6KOF6Zai5pWwLiDjg6Ljg4fjg6vmm7TmlrDjgaggVmlldyDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLpgKPli5XjgZXjgZvjgosuICovXG4gICAgYWJzdHJhY3QgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gQ2hhbmdlIHRoZSB2aWV3J3MgZWxlbWVudCAoYHRoaXMuZWxgIHByb3BlcnR5KSBhbmQgcmUtZGVsZWdhdGUgdGhlIHZpZXcncyBldmVudHMgb24gdGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBqYSBWaWV3IOOBjOeuoei9hOOBmeOCi+imgee0oCAoYHRoaXMuZWxgIHByb3BlcnR5KSDjga7lpInmm7QuIOOCpOODmeODs+ODiOWGjeioreWumuOCguWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsXG4gICAgICogIC0gYGVuYCBPYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OI44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgc2V0RWxlbWVudChlbDogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzW19wcm9wZXJ0aWVzXSkge1xuICAgICAgICAgICAgY29uc3QgeyBjb250ZXh0IH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgY29udGV4dC5kZXN0cm95KCk7XG4gICAgICAgICAgICBjb250ZXh0LmluaXRpYWxpemUoJGVsIGFzIERPTTxOb2RlPiBhcyBET00sIHRoaXMub3B0aW9ucy5pbml0aWFsSGVpZ2h0ID8/ICRlbC5oZWlnaHQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLnNldEVsZW1lbnQoZWwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBSZW1vdmUgdGhpcyB2aWV3IGJ5IHRha2luZyB0aGUgZWxlbWVudCBvdXQgb2YgdGhlIERPTSB3aXRoIHJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEgVmlldyDjgYvjgokgRE9NIOOCkuWIh+OCiumbouOBlywg44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmRlc3Ryb3koKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnJlbW92ZSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0T3BlcmF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgaXQgaGFzIGJlZW4gaW5pdGlhbGl6ZWQuXG4gICAgICogQGphIOWIneacn+WMlua4iOOBv+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGluaXRpYWxpemVkIC8gZmFsc2U6IHVuaW5pdGlhbGl6ZWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOWIneacn+WMlua4iOOBvyAvIGZhbHNlOiDmnKrliJ3mnJ/ljJZcbiAgICAgKi9cbiAgICBnZXQgaXNJbml0aWFsaXplZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNJbml0aWFsaXplZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIGl0ZW0g55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGl0ZW0gYnkgaW5kZXhcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5oy/5YWl5L2N572u44KS44Kk44Oz44OH44OD44Kv44K544Gn5oyH5a6aXG4gICAgICovXG4gICAgYWRkSXRlbShoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgaW5mbzogVW5rbm93bk9iamVjdCwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYWRkSXRlbShuZXcgSXRlbVByb2ZpbGUodGhpcy5jb250ZXh0LCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbiAoaW50ZXJuYWwgdXNlKS5cbiAgICAgKiBAamEgaXRlbSDnmbvpjLIgKOWGhemDqOeUqClcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSXRlbVByb2ZpbGV9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGl0ZW0gYnkgaW5kZXhcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5oy/5YWl5L2N572u44KS44Kk44Oz44OH44OD44Kv44K544Gn5oyH5a6aXG4gICAgICovXG4gICAgX2FkZEl0ZW0oaXRlbTogSXRlbVByb2ZpbGUgfCBJdGVtUHJvZmlsZVtdLCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Ll9hZGRJdGVtKGl0ZW0sIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHRoZSBzcGVjaWZpZWQgSXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluZGV4IHRvIHN0YXJ0IHJlbGVhc2luZ1xuICAgICAqICAtIGBqYWAg6Kej6Zmk6ZaL5aeL44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIHNpemVcbiAgICAgKiAgLSBgZW5gIHRvdGFsIG51bWJlciBvZiBpdGVtcyB0byByZWxlYXNlXG4gICAgICogIC0gYGphYCDop6PpmaTjgZnjgosgaXRlbSDjga7nt4/mlbAgW2RlZmF1bHQ6IDFdXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHRvIGFjdHVhbGx5IGRlbGV0ZSB0aGUgZWxlbWVudCBbZGVmYXVsdDogMCAoaW1tZWRpYXRlIGRlbGV0aW9uKVxuICAgICAqICAtIGBqYWAg5a6f6Zqb44Gr6KaB57Sg44KS5YmK6Zmk44GZ44KLIGRlbGF5IHRpbWUgW2RlZmF1bHQ6IDAgKOWNs+aZguWJiumZpCldXG4gICAgICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyLCBzaXplPzogbnVtYmVyLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHRoZSBzcGVjaWZpZWQgSXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGFyZ2V0IGluZGV4IGFycmF5LiBpdCBpcyBtb3JlIGVmZmljaWVudCB0byBzcGVjaWZ5IHJldmVyc2UgaW5kZXguXG4gICAgICogIC0gYGphYCDlr77osaHjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjgpLmjIflrpouIHJldmVyc2UgaW5kZXgg44KS5oyH5a6a44GZ44KL44G744GG44GM5Yq5546H55qEXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHRvIGFjdHVhbGx5IGRlbGV0ZSB0aGUgZWxlbWVudCBbZGVmYXVsdDogMCAoaW1tZWRpYXRlIGRlbGV0aW9uKVxuICAgICAqICAtIGBqYWAg5a6f6Zqb44Gr6KaB57Sg44KS5YmK6Zmk44GZ44KLIGRlbGF5IHRpbWUgW2RlZmF1bHQ6IDAgKOWNs+aZguWJiumZpCldXG4gICAgICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcblxuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVtb3ZlSXRlbShpbmRleCBhcyBudW1iZXIsIGFyZzIsIGFyZzMpOyAvLyBhdm9pZCB0cygyMzQ1KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGluZm9ybWF0aW9uIHNldCBmb3IgdGhlIHNwZWNpZmllZCBpdGVtLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gaXRlbSDjgavoqK3lrprjgZfjgZ/mg4XloLHjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGlkZW50aWZpZXIgW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqICAtIGBqYWAg6K2Y5Yil5a2QLiBbaW5kZXggfCBldmVudCBvYmplY3RdXG4gICAgICovXG4gICAgZ2V0SXRlbUluZm8odGFyZ2V0OiBudW1iZXIgfCBFdmVudCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRJdGVtSW5mbyh0YXJnZXQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWZyZXNoIGFjdGl2ZSBwYWdlcy5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW44Oa44O844K444KS5pu05pawXG4gICAgICovXG4gICAgcmVmcmVzaCgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWZyZXNoKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBCdWlsZCB1bmFzc2lnbmVkIHBhZ2VzLlxuICAgICAqIEBqYSDmnKrjgqLjgrXjgqTjg7Pjg5rjg7zjgrjjgpLmp4vnr4lcbiAgICAgKi9cbiAgICB1cGRhdGUoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQudXBkYXRlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWJ1aWxkIHBhZ2UgYXNzaWdubWVudHMuXG4gICAgICogQGphIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkFxuICAgICAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVidWlsZCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRGVzdHJveSBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4RcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbGVhc2UoKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnJlbGVhc2UoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGFibGVcblxuICAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHNjcm9sbFBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zY3JvbGxQb3M7XG4gICAgfVxuXG4gICAgIC8qKlxuICAgICAgKiBAZW4gR2V0IG1heGltdW0gc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44Gu5pyA5aSn5YCk44KS5Y+W5b6XXG4gICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zTWF4O1xuICAgIH1cblxuICAgICAvKipcbiAgICAgKiBAZW4gU2Nyb2xsIGV2ZW50IGhhbmRsZXIgc2V0dGluZy9jYW5jZWxsYXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyLCBtZXRob2QpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXR0aW5nL2NhbmNlbGxpbmcgc2Nyb2xsIHN0b3AgZXZlbnQgaGFuZGxlci5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or57WC5LqG44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeODvOmWouaVsFxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9uOiBzZXR0aW5nIC8gb2ZmOiBjYW5jZWxpbmdcbiAgICAgKiAgLSBgamFgIG9uOiDoqK3lrpogLyBvZmY6IOino+mZpFxuICAgICAqL1xuICAgIHNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zXG4gICAgICogIC0gYGVuYCBuZXcgc2Nyb2xsIHBvc2l0aW9uIHZhbHVlIFswIC0gcG9zTWF4XVxuICAgICAqICAtIGBqYWAg5paw44GX44GE44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aIFswIC0gcG9zTWF4XVxuICAgICAqIEBwYXJhbSBhbmltYXRlXG4gICAgICogIC0gYGVuYCBlbmFibGUvZGlzYWJsZSBhbmltYXRpb25cbiAgICAgKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+OBruacieeEoVxuICAgICAqIEBwYXJhbSB0aW1lXG4gICAgICogIC0gYGVuYCB0aW1lIHNwZW50IG9uIGFuaW1hdGlvbiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW5zdXJlIHZpc2liaWxpdHkgb2YgaXRlbSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44GfIGl0ZW0g44Gu6KGo56S644KS5L+d6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5kZXggb2YgaXRlbVxuICAgICAqICAtIGBqYWAgaXRlbSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSBvYmplY3RcbiAgICAgKiAgLSBgamFgIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIGVuc3VyZVZpc2libGUoaW5kZXg6IG51bWJlciwgb3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5lbnN1cmVWaXNpYmxlKGluZGV4LCBvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5IChhbnkgaWRlbnRpZmllcilcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvCjku7vmhI/jga7orZjliKXlrZAp44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5iYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcGFyYW0gcmVidWlsZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHJlYnVpbGQgdGhlIGxpc3Qgc3RydWN0dXJlXG4gICAgICogIC0gYGphYCDjg6rjgrnjg4jmp4vpgKDjgpLlho3mp4vnr4njgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZCA9IHRydWUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIGJhY2t1cCBkYXRhIGV4aXN0cy5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cyAvIGZhbHNlOiBub3QgZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIkgLyBmYWxzZTog54ShXG4gICAgICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEaXNjYXJkIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZGlzY2FyZCBleGlzdGluZyBkYXRhIC8gZmFsc2U6IHNwZWNpZmllZCBkYXRhIGRvZXMgbm90IGV4aXN0XG4gICAgICogIC0gYGphYCB0cnVlOiDlrZjlnKjjgZfjgZ/jg4fjg7zjgr/jgpLnoLTmo4QgLyBmYWxzZTog5oyH5a6a44GV44KM44Gf44OH44O844K/44Gv5a2Y5Zyo44GX44Gq44GEXG4gICAgICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IFVua25vd25PYmplY3QgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmFja3VwIGRhdGEgY2FuIGJlIHNldCBleHRlcm5hbGx5LlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2NlZWRlZCAvIGZhbHNlOiBzY2hlbWEgaW52YWxpZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOOCueOCreODvOODnuOBjOS4jeato1xuICAgICAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IFVua25vd25PYmplY3QpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0QmFja3VwRGF0YShrZXksIGRhdGEgYXMgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdFZpZXcgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IHsgdHlwZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBMaXN0SXRlbVZpZXcgfSBmcm9tICcuL2xpc3QtaXRlbS12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIEV4cGFuZGFibGVMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RJdGVtVmlld30g5qeL56+J44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhwYW5kYWJsZUxpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIG93bmVyOiBJRXhwYW5kYWJsZUxpc3RWaWV3O1xuICAgIC8qKiB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8qKlxuICogQGVuIExpc3QgaXRlbSBjb250YWluZXIgY2xhc3MgaGFuZGxlZCBieSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSDjgYzmibHjgYbjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgrPjg7Pjg4bjg4rjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0SXRlbVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlldzxURWxlbWVudCwgVEV2ZW50PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHsgZ3JvdXAgfSA9IG9wdGlvbnM7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0geyBncm91cCB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cy5cbiAgICAgKiBAamEg5bGV6ZaL54q25oWL44KS5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhwYW5kZWQsIGNvbGxhcHNlZDogY2xvc2VcbiAgICAgKiAgLSBgamFgIHRydWU6IOWxlemWiywgZmFsc2U6IOWPjuadn1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmdyb3VwLmlzRXhwYW5kZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcuXG4gICAgICogQGphIOWxlemWi+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc0V4cGFuZGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOWPjuadn+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc1N3aXRjaGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIGlmIGl0IGhhcyBhIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzLCBmYWxzZTogdW5leGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSwgZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaGFzQ2hpbGRyZW4oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5ncm91cC5oYXNDaGlsZHJlbjtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIGx1aWQsXG4gICAgc3RhdHVzQWRkUmVmLFxuICAgIHN0YXR1c1JlbGVhc2UsXG4gICAgc3RhdHVzU2NvcGUsXG4gICAgaXNTdGF0dXNJbixcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBJRXhwYW5kT3BlcmF0aW9uLFxuICAgIElMaXN0U3RhdHVzTWFuYWdlcixcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUsXG4gICAgSUV4cGFuZGFibGVMaXN0Q29udGV4dCxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuLi9wcm9maWxlJztcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIHRoYXQgbWFuYWdlcyBleHBhbmRpbmcgLyBjb2xsYXBzaW5nIHN0YXRlLlxuICogQGphIOmWi+mWieeKtuaFi+euoeeQhuOCkuihjOOBhuOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRXhwYW5kQ29yZSBpbXBsZW1lbnRzXG4gICAgSUV4cGFuZE9wZXJhdGlvbixcbiAgICBJTGlzdFN0YXR1c01hbmFnZXIsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlIHtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX293bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0O1xuXG4gICAgLyoqIHsgaWQ6IEdyb3VwUHJvZmlsZSB9ICovXG4gICAgcHJpdmF0ZSBfbWFwR3JvdXBzOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+ID0ge307XG4gICAgLyoqIOesrDHpmo7lsaQgR3JvdXBQcm9maWxlIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgX2FyeVRvcEdyb3VwczogR3JvdXBQcm9maWxlW10gPSBbXTtcblxuICAgIC8qKiDjg4fjg7zjgr/jga4gYmFja3VwIOmgmOWfny4ga2V5IOOBqCB7IG1hcCwgdG9wcyB9IOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9PiA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0gb3duZXIg6KaqIFZpZXcg44Gu44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbiAgICB9XG5cbiAgICAvKiog44OH44O844K/44KS56C05qOEICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX21hcEdyb3VwcyA9IHt9O1xuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMgPSBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRXhwYW5kT3BlcmF0aW9uXG5cbiAgICAvKiog5paw6KaPIEdyb3VwUHJvZmlsZSDjgpLkvZzmiJAgKi9cbiAgICBuZXdHcm91cChpZD86IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB7XG4gICAgICAgIGlkID0gaWQgPz8gbHVpZCgnbGlzdC1ncm91cCcsIDQpO1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9tYXBHcm91cHNbaWRdKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbWFwR3JvdXBzW2lkXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBncm91cCA9IG5ldyBHcm91cFByb2ZpbGUodGhpcy5fb3duZXIsIGlkKTtcbiAgICAgICAgdGhpcy5fbWFwR3JvdXBzW2lkXSA9IGdyb3VwO1xuICAgICAgICByZXR1cm4gZ3JvdXA7XG4gICAgfVxuXG4gICAgLyoqIOeZu+mMsua4iOOBvyBHcm91cCDjgpLlj5blvpcgKi9cbiAgICBnZXRHcm91cChpZDogc3RyaW5nKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21hcEdyb3Vwc1tpZF07XG4gICAgfVxuXG4gICAgLyoqIOesrDHpmo7lsaTjga4gR3JvdXAg55m76YyyICovXG4gICAgcmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIC8vIOOBmeOBp+OBq+eZu+mMsua4iOOBv+OBruWgtOWQiOOBryByZXN0b3JlIOOBl+OBpiBsYXlvdXQg44Kt44O844GU44Go44Gr5b6p5YWD44GZ44KL44CCXG4gICAgICAgIGlmICgncmVnaXN0ZXJlZCcgPT09IHRvcEdyb3VwLnN0YXR1cykge1xuICAgICAgICAgICAgLy8gVE9ETzogb3JpZW50YXRpb24gY2hhbmdlZCDmmYLjga4gbGF5b3V0IOOCreODvOWkieabtOWvvuW/nOOBoOOBjOOAgeOCreODvOOBq+WkieabtOOBjOeEoeOBhOOBqOOBjeOBr+S4jeWFt+WQiOOBqOOBquOCi+OAglxuICAgICAgICAgICAgLy8g44GT44GuIEFQSSDjgavlrp/oo4XjgYzlv4XopoHjgYvjgoLlkKvjgoHjgabopovnm7TjgZfjgYzlv4XopoFcbiAgICAgICAgICAgIHRvcEdyb3VwLnJlc3RvcmUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxhc3RHcm91cCA9IHRoaXMuX2FyeVRvcEdyb3Vwc1t0aGlzLl9hcnlUb3BHcm91cHMubGVuZ3RoIC0gMV07XG4gICAgICAgIGNvbnN0IGluc2VydFRvID0gbGFzdEdyb3VwPy5nZXROZXh0SXRlbUluZGV4KHRydWUpID8/IDA7XG5cbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzLnB1c2godG9wR3JvdXApO1xuICAgICAgICB0b3BHcm91cC5yZWdpc3RlcihpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqIOesrDHpmo7lsaTjga4gR3JvdXAg44KS5Y+W5b6XICovXG4gICAgZ2V0VG9wR3JvdXBzKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FyeVRvcEdyb3Vwcy5zbGljZSgwKTtcbiAgICB9XG5cbiAgICAvKiog44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5bGV6ZaLICgx6ZqO5bGkKSAqL1xuICAgIGFzeW5jIGV4cGFuZEFsbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzaWVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIHByb21pc2llcy5wdXNoKGdyb3VwLmV4cGFuZCgpKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNpZXMpO1xuICAgIH1cblxuICAgIC8qKiDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlj47mnZ8gKDHpmo7lsaQpICovXG4gICAgYXN5bmMgY29sbGFwc2VBbGwoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzaWVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIHByb21pc2llcy5wdXNoKGdyb3VwLmNvbGxhcHNlKGRlbGF5KSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzaWVzKTtcbiAgICB9XG5cbiAgICAvKiog5bGV6ZaL5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1N0YXR1c0luKCdleHBhbmRpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog5Y+O5p2f5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNTdGF0dXNJbignY29sbGFwc2luZycpO1xuICAgIH1cblxuICAgIC8qKiDplovplonkuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzRXhwYW5kaW5nIHx8IHRoaXMuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U3RhdHVzTWFuYWdlclxuXG4gICAgLyoqIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiCAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiog54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqIOWHpueQhuOCueOCs+ODvOODl+avjuOBq+eKtuaFi+WkieaVsOOCkuioreWumiAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c1Njb3BlKHN0YXR1cywgZXhlY3V0b3IpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo0gKi9cbiAgICBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBpc1N0YXR1c0luKHN0YXR1cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44OQ44OD44Kv44Ki44OD44OXICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHsgX2JhY2t1cCB9ID0gdGhpcztcbiAgICAgICAgaWYgKG51bGwgPT0gX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBfYmFja3VwW2tleV0gPSB7XG4gICAgICAgICAgICAgICAgbWFwOiB0aGlzLl9tYXBHcm91cHMsXG4gICAgICAgICAgICAgICAgdG9wczogdGhpcy5fYXJ5VG9wR3JvdXBzLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44Oq44K544OI44KiICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBiYWNrdXAgPSB0aGlzLmdldEJhY2t1cERhdGEoa2V5KTtcbiAgICAgICAgaWYgKG51bGwgPT0gYmFja3VwKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8IHRoaXMuX2FyeVRvcEdyb3Vwcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLl9tYXBHcm91cHMsIGJhY2t1cC5tYXApO1xuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMgPSBiYWNrdXAudG9wcy5zbGljZSgpO1xuXG4gICAgICAgIC8vIOWxlemWi+OBl+OBpuOBhOOCi+OCguOBruOCkueZu+mMslxuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgZ3JvdXAucmVzdG9yZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YaN5qeL56+J44Gu5LqI57SEXG4gICAgICAgIHJlYnVpbGQgJiYgdGhpcy5fb3duZXIucmVidWlsZCgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54ShICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYWNrdXApKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5ICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aICovXG4gICAgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9KTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChkYXRhLm1hcCAmJiBBcnJheS5pc0FycmF5KGRhdGEudG9wcykpIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0gZGF0YTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFdyaXRhYmxlLCBVbmtub3duT2JqZWN0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0VmlldywgSUV4cGFuZE9wZXJhdGlvbiB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFeHBhbmRDb3JlIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB0eXBlIHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcbmltcG9ydCB7IHR5cGUgTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zLCBMaXN0VmlldyB9IGZyb20gJy4vbGlzdC12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IEV4cGFuZENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBWaXJ0dWFsIGxpc3QgdmlldyBjbGFzcyB3aXRoIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDplovplonmqZ/og73jgpLlgpnjgYjjgZ/ku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0VmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgTGlzdFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJRXhwYW5kYWJsZUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBFeHBhbmRDb3JlKHRoaXMpLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuICAgIC8qKiBjb250ZXh0IGFjY2Vzc29yICovXG4gICAgZ2V0IGV4cGFuZENvbnRleHQoKTogSUV4cGFuZE9wZXJhdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRhYmxlTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcge0BsaW5rIEdyb3VwUHJvZmlsZX0uIFJldHVybiB0aGUgb2JqZWN0IGlmIGl0IGlzIGFscmVhZHkgcmVnaXN0ZXJlZC5cbiAgICAgKiBAamEg5paw6KaPIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuS9nOaIkC4g55m76Yyy5riI44G/44Gu5aC05ZCI44Gv44Gd44Gu44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIG5ld2x5IGNyZWF0ZWQgZ3JvdXAgaWQuIGlmIG5vdCBzcGVjaWZpZWQsIGF1dG9tYXRpYyBhbGxvY2F0aW9uIHdpbGwgYmUgcGVyZm9ybWVkLlxuICAgICAqICAtIGBqYWAg5paw6KaP44Gr5L2c5oiQ44GZ44KLIEdyb3VwIElEIOOCkuaMh+Wumi4g5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv6Ieq5YuV5Ymy44KK5oyv44KKXG4gICAgICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5uZXdHcm91cChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCByZWdpc3RlcmVkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDnmbvpjLLmuIjjgb8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIEdyb3VwIElEIHRvIHJldHJpZXZlXG4gICAgICogIC0gYGphYCDlj5blvpfjgZnjgosgR3JvdXAgSUQg44KS5oyH5a6aXG4gICAgICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEdyb3VwKGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gMXN0IGxheWVyIHtAbGluayBHcm91cFByb2ZpbGV9IHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEg56ysMemajuWxpOOBriB7QGxpbmsgR3JvdXBQcm9maWxlfSDnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b3BHcm91cFxuICAgICAqICAtIGBlbmAgY29uc3RydWN0ZWQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIOani+eviea4iOOBvyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IDFzdCBsYXllciB7QGxpbmsgR3JvdXBQcm9maWxlfS4gPGJyPlxuICAgICAqICAgICBBIGNvcHkgYXJyYXkgaXMgcmV0dXJuZWQsIHNvIHRoZSBjbGllbnQgY2Fubm90IGNhY2hlIGl0LlxuICAgICAqIEBqYSDnrKwx6ZqO5bGk44GuIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+lyA8YnI+XG4gICAgICogICAgIOOCs+ODlOODvOmFjeWIl+OBjOi/lOOBleOCjOOCi+OBn+OCgeOAgeOCr+ODqeOCpOOCouODs+ODiOOBr+OCreODo+ODg+OCt+ODpeS4jeWPr1xuICAgICAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldFRvcEdyb3VwcygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHBhbmQgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpXG4gICAgICovXG4gICAgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5leHBhbmRBbGwoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29sbGFwc2UgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlj47mnZ8gKDHpmo7lsaQpXG4gICAgICovXG4gICAgY29sbGFwc2VBbGwoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY29sbGFwc2VBbGwoZGVsYXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nLlxuICAgICAqIEBqYSDlsZXplovkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzRXhwYW5kaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgY29sbGFwc2luZy5cbiAgICAgKiBAamEg5Y+O5p2f5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNTd2l0Y2hpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICAgICAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICAgICAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnN0YXR1c0FkZFJlZihzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAgICAgKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gICAgICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAgICAgKi9cbiAgICBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc3RhdHVzUmVsZWFzZShzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdGF0ZSB2YXJpYWJsZSBtYW5hZ2VtZW50IHNjb3BlXG4gICAgICogQGphIOeKtuaFi+WkieaVsOeuoeeQhuOCueOCs+ODvOODl1xuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHZhbCBvZiBzZWVkIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWw44Gu5oi744KK5YCkXG4gICAgICovXG4gICAgc3RhdHVzU2NvcGU8VD4oc3RhdHVzOiBzdHJpbmcsIGV4ZWN1dG9yOiAoKSA9PiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zdGF0dXNTY29wZShzdGF0dXMsIGV4ZWN1dG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgaWYgaXQncyBpbiB0aGUgc3BlY2lmaWVkIHN0YXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWU6IOeKtuaFi+WGhSAvIGZhbHNlOiDnirbmhYvlpJZcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgOiB3aXRoaW4gdGhlIHN0YXR1cyAvIGBmYWxzZWA6IG91dCBvZiB0aGUgc3RhdHVzXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOeKtuaFi+WGhSAvIGBmYWxzZWA6IOeKtuaFi+WkllxuICAgICAqL1xuICAgIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNTdGF0dXNJbihzdGF0dXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOiBMaXN0Vmlld1xuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIERlc3Ryb3kgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg566h6L2E44OH44O844K/44KS56C05qOEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgc3VwZXIucmVsZWFzZSgpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbGVhc2UoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKGFueSBpZGVudGlmaWVyKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O8KOS7u+aEj+OBruitmOWIpeWtkCnjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEBwYXJhbSByZWJ1aWxkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gcmVidWlsZCB0aGUgbGlzdCBzdHJ1Y3R1cmVcbiAgICAgKiAgLSBgamFgIOODquOCueODiOani+mAoOOCkuWGjeani+evieOBmeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkID0gdHJ1ZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZXN0b3JlKGtleSwgcmVidWlsZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgYmFja3VwIGRhdGEgZXhpc3RzLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzIC8gZmFsc2U6IG5vdCBleGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSAvIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBvdmVycmlkZSBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaGFzQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERpc2NhcmQgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBkaXNjYXJkIGV4aXN0aW5nIGRhdGEgLyBmYWxzZTogc3BlY2lmaWVkIGRhdGEgZG9lcyBub3QgZXhpc3RcbiAgICAgKiAgLSBgamFgIHRydWU6IOWtmOWcqOOBl+OBn+ODh+ODvOOCv+OCkuegtOajhCAvIGZhbHNlOiDmjIflrprjgZXjgozjgZ/jg4fjg7zjgr/jga/lrZjlnKjjgZfjgarjgYRcbiAgICAgKi9cbiAgICBvdmVycmlkZSBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY2xlYXJCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKi9cbiAgICBvdmVycmlkZSBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogVW5rbm93bk9iamVjdCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEJhY2t1cERhdGEoa2V5KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEBlbiBCYWNrdXAgZGF0YSBjYW4gYmUgc2V0IGV4dGVybmFsbHkuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5XG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VlZGVkIC8gZmFsc2U6IHNjaGVtYSBpbnZhbGlkXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog44K544Kt44O844Oe44GM5LiN5q2jXG4gICAgICovXG4gICAgb3ZlcnJpZGUgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogVW5rbm93bk9iamVjdCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRCYWNrdXBEYXRhKGtleSwgZGF0YSBhcyB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0pO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJzdHlsZUNvcmUiLCJzdHlsZUJ1dHRvbiIsIiQiLCJfcHJvcGVydGllcyIsInNldFRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQTs7O0FBR0c7QUFFSCxDQUFBLFlBQXFCO0FBZWpCOzs7QUFHRztBQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQUhELElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdB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