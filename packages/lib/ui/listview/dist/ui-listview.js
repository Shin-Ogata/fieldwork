/*!
 * @cdp/ui-listview 0.9.18
 *   web domain utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime'), require('@cdp/ui-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime', '@cdp/ui-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
})(this, (function (exports, runtime, uiUtils) { 'use strict';

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
        SCROLL_MAP_SELECTOR: ".cdp-ui-listview-scroll-map" /* DefaultV.SCROLL_MAP_SELECTOR */,
        INACTIVE_CLASS: "inactive" /* DefaultV.INACTIVE_CLASS */,
        INACTIVE_CLASS_SELECTOR: ".inactive" /* DefaultV.INACTIVE_CLASS_SELECTOR */,
        RECYCLE_CLASS: "cdp-ui-listview-recycle" /* DefaultV.RECYCLE_CLASS */,
        RECYCLE_CLASS_SELECTOR: ".cdp-ui-listview-recycle" /* DefaultV.RECYCLE_CLASS_SELECTOR */,
        LISTITEM_BASE_CLASS: "cdp-ui-listview-item-base" /* DefaultV.LISTITEM_BASE_CLASS */,
        LISTITEM_BASE_CLASS_SELECTOR: ".cdp-ui-listview-item-base" /* DefaultV.LISTITEM_BASE_CLASS_SELECTOR */,
        DATA_PAGE_INDEX: "data-page-index" /* DefaultV.DATA_PAGE_INDEX */,
        DATA_ITEM_INDEX: "data-item-index" /* DefaultV.DATA_ITEM_INDEX */,
    };
    /**
     * @en Get/Update global configuration of list view.
     * @ja リストビューのグローバルコンフィグレーションの取得/更新
     */
    const ListViewGlobalConfig = (newConfig) => {
        if (newConfig) {
            for (const key of Object.keys(newConfig)) {
                if (undefined === newConfig[key]) {
                    delete newConfig[key];
                }
            }
        }
        return Object.assign({}, _config, newConfig);
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
        _index = 0;
        /** @internal belonging page index */
        _pageIndex = 0;
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
                this._owner.updateProfiles(this._index);
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
                $base = runtime.dom(`<${itemTagName} class="${this._config.LISTITEM_BASE_CLASS}"></"${itemTagName}">`);
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
                const { translateY } = uiUtils.getTransformMatrixValues(this._$base[0]);
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
            return runtime.at(this._items, index);
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
        _mapItems = {};
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
            this._mapItems["layout-default" /* LayoutKey.DEFAULT */] = [];
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
         * @param layoutKey
         *  - `en` identifier for each layout
         *  - `ja` レイアウト毎の識別子
         */
        addItem(height, initializer, info, layoutKey) {
            layoutKey = layoutKey ?? "layout-default" /* LayoutKey.DEFAULT */;
            const options = Object.assign({ groupProfile: this }, info);
            if (null == this._mapItems[layoutKey]) {
                this._mapItems[layoutKey] = [];
            }
            const item = new ItemProfile(this._owner.context, Math.trunc(height), initializer, options);
            // _owner の管理下にあるときは速やかに追加
            if (('registered' === this._status) && (null == this._owner.layoutKey || layoutKey === this._owner.layoutKey)) {
                this._owner._addItem(item, this.getNextItemIndex());
                this._owner.update();
            }
            this._mapItems[layoutKey].push(item);
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
         * @en Determine if it has a child {@link GroupProfile}. <br>
         *     If `layoutKey` is specified, whether the layout information matches is also added to the judgment condition.
         * @ja 子 {@link GroupProfile} を持っているか判定 <br>
         *     `layoutKey` が指定されれば、layout 情報が一致しているかも判定条件に加える
         *
         * @param layoutKey
         *  - `en` identifier for each layout
         *  - `ja` レイアウト毎の識別子
         * @returns
         *  - `en` true: exists, false: unexists
         *  - `ja` true: 有, false: 無
         */
        hasChildren(layoutKey) {
            if (this._children.length <= 0) {
                return false;
            }
            else if (null != layoutKey) {
                return this._children.some(child => child.hasLayoutKeyOf(layoutKey));
            }
            else {
                return true;
            }
        }
        /**
         * @en Determine if the specified `layoutKey` exists.
         * @ja 指定された `layoutKey` が存在するか判定
         *
         * @param layoutKey
         *  - `en` identifier for each layout
         *  - `ja` レイアウト毎の識別子
         * @returns
         *  - `en` true: exists, false: unexists
         *  - `ja` true: 有, false: 無
         */
        hasLayoutKeyOf(layoutKey) {
            return (null != this._mapItems[layoutKey]);
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
                        this._owner.removeItem(items[0].index, items.length, delay);
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
                await this._owner.ensureVisible(this._items[0].index, options);
            }
            else {
                options?.callback?.();
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
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} 'GroupProfile#register' method is acceptable only 1st layer group.`);
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
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} 'GroupProfile#restore' method is acceptable only 1st layer group.`);
            }
            if (this._items) {
                const items = this._expanded ? this._items.concat(this.queryOperationTarget('active')) : this._items.slice();
                this._owner._addItem(items);
            }
            return this;
        }
        ///////////////////////////////////////////////////////////////////////
        // internal:
        /** @internal 自身の管理するアクティブな LineProfie を取得 */
        get _items() {
            const key = this._owner.layoutKey;
            if (null != key) {
                return this._mapItems[key];
            }
            else {
                return this._mapItems["layout-default" /* LayoutKey.DEFAULT */];
            }
        }
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
    class ListItemView extends runtime.View {
        /** @internal */
        [_properties$3];
        /** constructor */
        constructor(options) {
            super(options);
            const { owner, $el, item } = options;
            this[_properties$3] = {
                owner,
                item,
            };
            if ($el) {
                this.setElement($el);
            }
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
         * @en Get own item index.
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
        constructor(element, options) {
            this._$target = runtime.dom(element);
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
                    runtime.clearTimeout(timer);
                }
                timer = runtime.setTimeout(() => {
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
            const factory = (element, options) => {
                return new ElementScroller(element, options);
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
            return new Promise(resolve => {
                this._scrollDuration = (this._options.enableAnimation ?? animate) ? time ?? this._options.animationDuration : undefined;
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
        itemTagName: 'li', // TODO: 見極め
        removeItemWithTransition: true,
        useDummyInactiveScrollMap: false,
    };
    /** invalid instance */
    const _$invalid = runtime.dom();
    /** 初期化済みか検証 */
    function verify(x) {
        if (null == x) {
            throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_INITIALIZATION);
        }
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
        /** データの backup 領域. key と _lines を格納 */
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
            this._$root = $root;
            this._$map = $root.hasClass(this._config.SCROLL_MAP_CLASS) ? $root : $root.find(this._config.SCROLL_MAP_SELECTOR);
            // _$map が無い場合は初期化しない
            if (this._$map.length <= 0) {
                this.destroy();
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [${this._config.SCROLL_MAP_CLASS} not found]`);
            }
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
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [base hight: ${height}]`);
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
        /** scroller の種類を取得 */
        get scrollerType() {
            return this._settings.scrollerFactory.type;
        }
        /** スクロール位置の保存/復元 */
        async treatScrollPosition() {
            verify(this._scroller);
            const offset = (this._scroller.pos - this._lastActivePageContext.pos);
            const { useDummyInactiveScrollMap: useDummyMap } = this._settings;
            const updateOffset = ($target) => {
                const { translateY } = uiUtils.getTransformMatrixValues($target[0]);
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
            return this._$map.find(this._config.RECYCLE_CLASS_SELECTOR);
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IListView
        /** 初期化済みか判定 */
        isInitialized() {
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
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [removeItem(), invalid index: ${index}]`);
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
            for (let i = 0, n = indexes.length; i < n; i++) {
                if (i < 0 || this._items.length < i) {
                    throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [removeItem(), invalid index: ${i}]`);
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
                uiUtils.clearTransition(el);
            });
            uiUtils.setTransformTransition(el, 'height', delay, 'ease');
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
            const index = target instanceof Event ? parser(runtime.dom(target.target)) : Number(target);
            if (Number.isNaN(index)) {
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [unsupported type: ${typeof target}]`);
            }
            else if (index < 0 || _items.length <= index) {
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} getItemInfo() [invalid index: ${typeof index}]`);
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
                void runtime.post(() => {
                    this.isInitialized() && _pages[idx]?.activate();
                });
            }
            // そのほかの page の 状態変更
            for (const key of Object.keys(targets)) {
                const index = Number(key);
                const action = targets[index];
                void runtime.post(() => {
                    this.isInitialized() && _pages[index]?.[action]?.();
                });
            }
            // 更新後に使用しなかった DOM を削除
            this.findRecycleElements().remove();
            const pageCurrent = _pages[currentPageIndex];
            _lastActivePageContext.from = pageCurrent.getItemFirst()?.index ?? 0;
            _lastActivePageContext.to = pageCurrent.getItemLast()?.index ?? 0;
            _lastActivePageContext.index = currentPageIndex;
            return this;
        }
        /** 未アサインページを構築 */
        update() {
            this.assignPage(this._pages.length);
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
                pos = this._scroller.pos;
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
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} ensureVisible() [invalid index: ${typeof index}]`);
            }
            const operation = Object.assign({
                partialOK: true,
                setTop: false,
                animate: _settings.enableAnimation,
                time: _settings.animationDuration,
                callback: runtime.noop,
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
                if (operation.partialOK) {
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
            if (operation.setTop) {
                pos = targetScope.from;
            }
            else if (isInScope()) {
                operation.callback();
                return; // noop
            }
            else {
                pos = detectPosition();
            }
            // 補正
            if (pos < 0) {
                pos = 0;
            }
            else if (_scroller.posMax < pos) {
                pos = _scroller.posMax;
            }
            await this.scrollTo(pos, operation.animate, operation.time);
            operation.callback();
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IListBackupRestore
        /** 内部データのバックアップを実行 */
        backup(key) {
            if (null == this._backup[key]) {
                this._backup[key] = { items: this._items };
            }
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
        get backupData() {
            return this._backup;
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
            return this._settings.scrollerFactory(this._$root[0], this._settings);
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
            if (_pages.length <= candidate) {
                candidate = _pages.length - 1;
            }
            let page = _pages[candidate];
            if (validRange(page)) {
                return page.index;
            }
            else if (pos < page.offset) {
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
            return _pages.length - 1;
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
            let $inactiveMap = $parent.find(_config.INACTIVE_CLASS_SELECTOR);
            if ($inactiveMap.length <= 0) {
                const currentPageIndex = this.getPageIndex();
                const $listItemViews = _$map.clone().children().filter((_, element) => {
                    const pageIndex = Number(runtime.dom(element).attr(_config.DATA_PAGE_INDEX));
                    if (currentPageIndex - 1 <= pageIndex || pageIndex <= currentPageIndex + 1) {
                        return true;
                    }
                    else {
                        return false;
                    }
                });
                $inactiveMap = runtime.dom(`<section class="${_config.SCROLL_MAP_CLASS}" "${_config.INACTIVE_CLASS}"></section>`)
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
    class ListView extends runtime.View {
        /** @internal */
        [_properties$2];
        /** constructor */
        constructor(options) {
            super(options);
            const opt = options ?? {};
            this[_properties$2] = {
                context: new ListCore(opt),
            };
            this.setElement((opt.$el ?? this.$el));
            if (opt.initialHeight) {
                this[_properties$2].context.setBaseHeight(opt.initialHeight);
            }
        }
        /** context accessor */
        get context() {
            return this[_properties$2].context;
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
                const $el = runtime.dom(el);
                context.destroy();
                context.initialize($el, $el.height());
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
        isInitialized() {
            return this[_properties$2].context.isInitialized();
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
        restore(key, rebuild) {
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
         */
        get backupData() {
            return this[_properties$2].context.backupData;
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
         * @en Determine if it has a child {@link GroupProfile}. <br>
         *     If `layoutKey` is specified, whether the layout information matches is also added to the judgment condition.
         * @ja 子 {@link GroupProfile} を持っているか判定 <br>
         *     `layoutKey` が指定されれば、layout 情報が一致しているかも判定条件に加える
         *
         * @param layoutKey
         *  - `en` identifier for each layout
         *  - `ja` レイアウト毎の識別子
         * @returns
         *  - `en` true: exists, false: unexists
         *  - `ja` true: 有, false: 無
         */
        hasChildren(layoutKey) {
            return this[_properties$1].group.hasChildren(layoutKey);
        }
    }

    /**
     * @internal
     * @en Core logic implementation class that manages expanding / collapsing state.
     * @ja 開閉状態管理を行うコアロジック実装クラス
     */
    class ExpandCore {
        _owner;
        // TODO: owner との各データの所有権の見直し (backupData?)
        /** { id: GroupProfile } */
        _mapGroups = {};
        /** 第1階層 GroupProfile を格納 */
        _aryTopGroups = [];
        /** layoutKey を格納 */
        _layoutKey;
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
            id = id ?? runtime.luid('list-group', 4);
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
            return this._owner.isStatusIn('expanding');
        }
        /** 収束中か判定 */
        get isCollapsing() {
            return this._owner.isStatusIn('collapsing');
        }
        /** 開閉中か判定 */
        get isSwitching() {
            return this.isExpanding || this.isCollapsing;
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IListLayoutKeyHolder
        /** layout key を取得 */
        get layoutKey() {
            return this._layoutKey;
        }
        /** layout key を設定 */
        set layoutKey(key) {
            this._layoutKey = key;
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IListStatusManager
        /** 状態変数の参照カウントのインクリメント */
        statusAddRef(status) {
            return this._owner.statusAddRef(status);
        }
        /** 状態変数の参照カウントのデクリメント */
        statusRelease(status) {
            return this._owner.statusRelease(status);
        }
        /** 処理スコープ毎に状態変数を設定 */
        statusScope(status, executor) {
            return this._owner.statusScope(status, executor);
        }
        /** 指定した状態中であるか確認 */
        isStatusIn(status) {
            return this._owner.isStatusIn(status);
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IListBackupRestore
        /** 内部データをバックアップ */
        backup(key) {
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
        restore(key, rebuild = true) {
            const backup = this.backupData[key];
            if (null == backup) {
                return false;
            }
            if (0 < this._aryTopGroups.length) {
                this.release();
            }
            this._mapGroups = backup.map;
            this._aryTopGroups = backup.tops;
            // layout 情報の確認
            if (!this._aryTopGroups[0]?.hasLayoutKeyOf(this.layoutKey)) {
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
        hasBackup(key) {
            return this._owner.hasBackup(key);
        }
        /** バックアップデータの破棄 */
        clearBackup(key) {
            return this._owner.clearBackup(key);
        }
        /** バックアップデータにアクセス */
        get backupData() {
            return this._owner.backupData;
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
            return runtime.statusAddRef(status);
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
            return runtime.statusRelease(status);
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
            return runtime.statusScope(status, executor);
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
            return runtime.isStatusIn(status);
        }
        /** @internal layout key を取得 */
        get layoutKey() {
            return this[_properties].context.layoutKey;
        }
        /** @internal layout key を設定 */
        set layoutKey(key) {
            this[_properties].context.layoutKey = key;
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
    }

    // TODO: test
    const UI_LISTVIEW_STATUS = 'UNDER CONSTRUCTION';

    exports.ExpandableListItemView = ExpandableListItemView;
    exports.ExpandableListView = ExpandableListView;
    exports.GroupProfile = GroupProfile;
    exports.ItemProfile = ItemProfile;
    exports.ListItemView = ListItemView;
    exports.ListView = ListView;
    exports.ListViewGlobalConfig = ListViewGlobalConfig;
    exports.PageProfile = PageProfile;
    exports.UI_LISTVIEW_STATUS = UI_LISTVIEW_STATUS;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktbGlzdHZpZXcuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJnbG9iYWwtY29uZmlnLnRzIiwicHJvZmlsZS9pdGVtLnRzIiwicHJvZmlsZS9wYWdlLnRzIiwicHJvZmlsZS9ncm91cC50cyIsImxpc3QtaXRlbS12aWV3LnRzIiwiY29yZS9lbGVtZW50LXNjcm9sbGVyLnRzIiwiY29yZS9saXN0LnRzIiwibGlzdC12aWV3LnRzIiwiZXhwYW5kYWJsZS1saXN0LWl0ZW0tdmlldy50cyIsImNvcmUvZXhwYW5kLnRzIiwiZXhwYW5kYWJsZS1saXN0LXZpZXcudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFVJX0xJU1RWSUVXID0gKENEUF9LTk9XTl9NT0RVTEUuT0ZGU0VUICsgQ0RQX0tOT1dOX1VJX01PRFVMRS5MSVNUVklFVykgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgVUlfTElTVFZJRVdfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9JTklUSUFMSVpBVElPTiA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMSwgJ2xpc3R2aWV3IGhhcyBpbnZhbGlkIGluaXRpYWxpemF0aW9uLicpLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAyLCAnbGlzdHZpZXcgZ2l2ZW4gYSBpbnZhbGlkIHBhcmFtLicpLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX09QRVJBVElPTiAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAzLCAnbGlzdHZpZXcgaW52YWxpZCBvcGVyYXRpb24uJyksXG4gICAgfVxufVxuIiwiLyoqXG4gKiBAZW4gR2xvYmFsIGNvbmZpZ3VyYXRpb24gZGVmaW5pdGlvbiBmb3IgbGlzdCB2aWV3cy5cbiAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjga7jgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjg6zjg7zjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgTkFNRVNQQUNFOiBzdHJpbmc7XG4gICAgU0NST0xMX01BUF9DTEFTUzogc3RyaW5nO1xuICAgIFNDUk9MTF9NQVBfU0VMRUNUT1I6IHN0cmluZztcbiAgICBJTkFDVElWRV9DTEFTUzogc3RyaW5nO1xuICAgIElOQUNUSVZFX0NMQVNTX1NFTEVDVE9SOiBzdHJpbmc7XG4gICAgUkVDWUNMRV9DTEFTUzogc3RyaW5nO1xuICAgIFJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1I6IHN0cmluZztcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBzdHJpbmc7XG4gICAgTElTVElURU1fQkFTRV9DTEFTU19TRUxFQ1RPUjogc3RyaW5nO1xuICAgIERBVEFfUEFHRV9JTkRFWDogc3RyaW5nO1xuICAgIERBVEFfSVRFTV9JTkRFWDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHRWIHtcbiAgICBOQU1FU1BBQ0UgICAgICAgICAgICAgICAgICAgID0gJ2NkcC11aScsXG4gICAgU0NST0xMX01BUF9DTEFTUyAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctc2Nyb2xsLW1hcGAsXG4gICAgU0NST0xMX01BUF9TRUxFQ1RPUiAgICAgICAgICA9IGAuJHtTQ1JPTExfTUFQX0NMQVNTfWAsXG4gICAgSU5BQ1RJVkVfQ0xBU1MgICAgICAgICAgICAgICA9ICdpbmFjdGl2ZScsXG4gICAgSU5BQ1RJVkVfQ0xBU1NfU0VMRUNUT1IgICAgICA9IGAuJHtJTkFDVElWRV9DTEFTU31gLFxuICAgIFJFQ1lDTEVfQ0xBU1MgICAgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXJlY3ljbGVgLFxuICAgIFJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1IgICAgICAgPSBgLiR7UkVDWUNMRV9DTEFTU31gLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LWl0ZW0tYmFzZWAsXG4gICAgTElTVElURU1fQkFTRV9DTEFTU19TRUxFQ1RPUiA9IGAuJHtMSVNUSVRFTV9CQVNFX0NMQVNTfWAsXG4gICAgREFUQV9QQUdFX0lOREVYICAgICAgICAgICAgICA9IGBkYXRhLXBhZ2UtaW5kZXhgLFxuICAgIERBVEFfSVRFTV9JTkRFWCAgICAgICAgICAgICAgPSBgZGF0YS1pdGVtLWluZGV4YCxcbn1cblxuY29uc3QgX2NvbmZpZyA9IHtcbiAgICBOQU1FU1BBQ0U6IERlZmF1bHRWLk5BTUVTUEFDRSxcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBEZWZhdWx0Vi5TQ1JPTExfTUFQX0NMQVNTLFxuICAgIFNDUk9MTF9NQVBfU0VMRUNUT1I6IERlZmF1bHRWLlNDUk9MTF9NQVBfU0VMRUNUT1IsXG4gICAgSU5BQ1RJVkVfQ0xBU1M6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTLFxuICAgIElOQUNUSVZFX0NMQVNTX1NFTEVDVE9SOiBEZWZhdWx0Vi5JTkFDVElWRV9DTEFTU19TRUxFQ1RPUixcbiAgICBSRUNZQ0xFX0NMQVNTOiBEZWZhdWx0Vi5SRUNZQ0xFX0NMQVNTLFxuICAgIFJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1I6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1IsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogRGVmYXVsdFYuTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTX1NFTEVDVE9SOiBEZWZhdWx0Vi5MSVNUSVRFTV9CQVNFX0NMQVNTX1NFTEVDVE9SLFxuICAgIERBVEFfUEFHRV9JTkRFWDogRGVmYXVsdFYuREFUQV9QQUdFX0lOREVYLFxuICAgIERBVEFfSVRFTV9JTkRFWDogRGVmYXVsdFYuREFUQV9JVEVNX0lOREVYLFxufTtcblxuLyoqXG4gKiBAZW4gR2V0L1VwZGF0ZSBnbG9iYWwgY29uZmlndXJhdGlvbiBvZiBsaXN0IHZpZXcuXG4gKiBAamEg44Oq44K544OI44OT44Ol44O844Gu44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Os44O844K344On44Oz44Gu5Y+W5b6XL+abtOaWsFxuICovXG5leHBvcnQgY29uc3QgTGlzdFZpZXdHbG9iYWxDb25maWcgPSAobmV3Q29uZmlnPzogUGFydGlhbDxMaXN0Vmlld0dsb2JhbENvbmZpZz4pOiBMaXN0Vmlld0dsb2JhbENvbmZpZyA9PiB7XG4gICAgaWYgKG5ld0NvbmZpZykge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhuZXdDb25maWcpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgX2NvbmZpZywgbmV3Q29uZmlnKTtcbn07XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25PYmplY3QsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHsgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzIH0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RJdGVtVmlldyxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB7IExpc3RWaWV3R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vZ2xvYmFsLWNvbmZpZyc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBsaXN0IGl0ZW1zLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEl0ZW1Qcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3I7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luZm86IFVua25vd25PYmplY3Q7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBiZWxvbmdpbmcgcGFnZSBpbmRleCAqL1xuICAgIHByaXZhdGUgX3BhZ2VJbmRleCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgb2Zmc2V0ICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGJhc2UgZG9tIGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfJGJhc2U/OiBET007XG4gICAgLyoqIEBpbnRlcm5hbCBJTGlzdEl0ZW1WaWV3IGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfaW5zdGFuY2U/OiBJTGlzdEl0ZW1WaWV3O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RWaWV3Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruWIneacn+OBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUxpc3RDb250ZXh0LCBoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgX2luZm86IFVua25vd25PYmplY3QpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgICAgICAgPSBvd25lcjtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICAgICAgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVyID0gaW5pdGlhbGl6ZXI7XG4gICAgICAgIHRoaXMuX2luZm8gICAgICAgID0gX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGhlaWdodC4gKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGdsb2JhbCBpbmRleC4gKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgc2V0IGluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy51cGRhdGVJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgYmVsb25naW5nIHRoZSBwYWdlIGluZGV4LiAqL1xuICAgIGdldCBwYWdlSW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VJbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBzZXQgcGFnZUluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fcGFnZUluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIGdldCBvZmZzZXQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGdsb2JhbCBvZmZzZXQuICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBpbml0IHBhcmFtZXRlcnMuICovXG4gICAgZ2V0IGluZm8oKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdGhpcy5wcmVwYXJlQmFzZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgZWw6IHRoaXMuXyRiYXNlLFxuICAgICAgICAgICAgICAgIG93bmVyOiB0aGlzLl9vd25lcixcbiAgICAgICAgICAgICAgICBpdGVtOiB0aGlzLFxuICAgICAgICAgICAgfSwgdGhpcy5faW5mbyk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IG5ldyB0aGlzLl9pbml0aWFsaXplcihvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICgnbm9uZScgPT09IHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSW5kZXgoKTtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICd2aXNpYmxlJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgaXRlbSBpbnZpc2libGUuXG4gICAgICogQGphIGl0ZW0g44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICdoaWRkZW4nICE9PSB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknKSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmFkZENsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mm7TmlrBcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlLnJlbmRlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBhY3RpdmF0aW9uIHN0YXR1cyBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfnirbmhYvliKTlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2luc3RhbmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaGVpZ2h0IGluZm9ybWF0aW9uIG9mIHRoZSBpdGVtLiBDYWxsZWQgZnJvbSB7QGxpbmsgTGlzdEl0ZW1WaWV3fS5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXmg4XloLHjga7mm7TmlrAuIHtAbGluayBMaXN0SXRlbVZpZXd9IOOBi+OCieOCs+ODvOODq+OBleOCjOOCi+OAglxuICAgICAqL1xuICAgIHB1YmxpYyB1cGRhdGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZGVsdGEgPSBuZXdIZWlnaHQgLSB0aGlzLl9oZWlnaHQ7XG4gICAgICAgIHRoaXMuX2hlaWdodCA9IG5ld0hlaWdodDtcbiAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhKTtcbiAgICAgICAgaWYgKG9wdGlvbnM/LnJlZmxlY3RBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVByb2ZpbGVzKHRoaXMuX2luZGV4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXNldCB6LWluZGV4LiBDYWxsZWQgZnJvbSB7QGxpbmsgU2Nyb2xsTWFuYWdlcn1gLnJlbW92ZUl0ZW0oKWAuXG4gICAgICogQGphIHotaW5kZXgg44Gu44Oq44K744OD44OILiB7QGxpbmsgU2Nyb2xsTWFuYWdlcn1gLnJlbW92ZUl0ZW0oKWAg44GL44KJ44Kz44O844Or44GV44KM44KL44CCXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0RGVwdGgoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCd6LWluZGV4JywgdGhpcy5fb3duZXIub3B0aW9ucy5iYXNlRGVwdGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHByZXBhcmVCYXNlRWxlbWVudCgpOiBET00ge1xuICAgICAgICBsZXQgJGJhc2U6IERPTTtcbiAgICAgICAgY29uc3QgJHJlY3ljbGUgPSB0aGlzLl9vd25lci5maW5kUmVjeWNsZUVsZW1lbnRzKCkuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgaXRlbVRhZ05hbWUgPSB0aGlzLl9vd25lci5vcHRpb25zLml0ZW1UYWdOYW1lO1xuXG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ3RoaXMuXyRiYXNlIGlzIG5vdCBudWxsLicpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuXyRiYXNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCAkcmVjeWNsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICRiYXNlID0gJHJlY3ljbGU7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVBdHRyKCd6LWluZGV4Jyk7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUT0RPOiAg6KaB5qSc6KiOLiA8bGk+IOWFqOiIrOOBryA8c2xvdD4g44Go44Gp44Gu44KI44GG44Gr5Y2U6Kq/44GZ44KL44GLP1xuICAgICAgICAgICAgJGJhc2UgPSAkKGA8JHtpdGVtVGFnTmFtZX0gY2xhc3M9XCIke3RoaXMuX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTfVwiPjwvXCIke2l0ZW1UYWdOYW1lfVwiPmApO1xuICAgICAgICAgICAgJGJhc2UuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLiRzY3JvbGxNYXAuYXBwZW5kKCRiYXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOmrmOOBleOBruabtOaWsFxuICAgICAgICBpZiAoJGJhc2UuaGVpZ2h0KCkgIT09IHRoaXMuX2hlaWdodCkge1xuICAgICAgICAgICAgJGJhc2UuaGVpZ2h0KHRoaXMuX2hlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGJhc2U7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgpICE9PSBTdHJpbmcodGhpcy5faW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgsIHRoaXMuX2luZGV4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVBhZ2VJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9wYWdlSW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgsIHRoaXMuX3BhZ2VJbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVPZmZzZXQoKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9vd25lci5vcHRpb25zLmVuYWJsZVRyYW5zZm9ybU9mZnNldCkge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2xhdGVZIH0gPSBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXModGhpcy5fJGJhc2VbMF0pO1xuICAgICAgICAgICAgaWYgKHRyYW5zbGF0ZVkgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndHJhbnNmb3JtJywgYHRyYW5zbGF0ZTNkKDAsJHt0aGlzLl9vZmZzZXR9cHgsMGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdG9wID0gcGFyc2VJbnQodGhpcy5fJGJhc2UuY3NzKCd0b3AnKSwgMTApO1xuICAgICAgICAgICAgaWYgKHRvcCAhPT0gdGhpcy5fb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd0b3AnLCBgJHt0aGlzLl9vZmZzZXR9cHhgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IGF0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG4vKipcbiAqIEBlbiBBIGNsYXNzIHRoYXQgc3RvcmVzIFVJIHN0cnVjdHVyZSBpbmZvcm1hdGlvbiBmb3Igb25lIHBhZ2Ugb2YgdGhlIGxpc3QuXG4gKiBAamEg44Oq44K544OIMeODmuODvOOCuOWIhuOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFBhZ2VQcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIG9mZnNldCBmcm9tIHRvcCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlJ3MgaGVpZ2h0ICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGl0ZW0ncyBwcm9maWxlIG1hbmFnZWQgd2l0aCBpbiBwYWdlICovXG4gICAgcHJpdmF0ZSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiogQGludGVybmFsIHBhZ2Ugc3RhdHVzICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAnYWN0aXZlJyB8ICdpbmFjdGl2ZScgfCAnaGlkZGVuJyA9ICdpbmFjdGl2ZSc7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBwYWdlIGluZGV4ICovXG4gICAgc2V0IGluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIG9mZnNldCAqL1xuICAgIGdldCBvZmZzZXQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBwYWdlIG9mZnNldCAqL1xuICAgIHNldCBvZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2UgaGVpZ2h0ICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2Ugc3RhdHVzICovXG4gICAgZ2V0IHN0YXR1cygpOiAnYWN0aXZlJyB8ICdpbmFjdGl2ZScgfCAnaGlkZGVuJyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWN0aXZhdGUgb2YgdGhlIHBhZ2UuXG4gICAgICogQGphIHBhZ2Ug44Gu5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2FjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdhY3RpdmUnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNYWtlIHRoZSBwYWdlIGludmlzaWJsZS5cbiAgICAgKiBAamEgcGFnZSDjga7kuI3lj6/oppbljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGlkZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdoaWRkZW4nICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdoaWRkZW4nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2luYWN0aXZlJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaW5hY3RpdmUnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQge0BsaW5rIEl0ZW1Qcm9maWxlfSB0byB0aGUgcGFnZS5cbiAgICAgKiBAamEge0BsaW5rIEl0ZW1Qcm9maWxlfSDjga7ov73liqBcbiAgICAgKi9cbiAgICBwdWJsaWMgcHVzaChpdGVtOiBJdGVtUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB0aGlzLl9oZWlnaHQgKz0gaXRlbS5oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIElmIGFsbCB7QGxpbmsgSXRlbVByb2ZpbGV9IHVuZGVyIHRoZSBwYWdlIGFyZSBub3QgdmFsaWQsIGRpc2FibGUgdGhlIHBhZ2UncyBzdGF0dXMuXG4gICAgICogQGphIOmFjeS4i+OBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOBmeOBueOBpuOBjOacieWKueOBp+OBquOBhOWgtOWQiCwgcGFnZSDjgrnjg4bjg7zjgr/jgrnjgpLnhKHlirnjgavjgZnjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgbm9ybWFsaXplKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbmFibGVBbGwgPSB0aGlzLl9pdGVtcy5ldmVyeShpdGVtID0+IGl0ZW0uaXNBY3RpdmUoKSk7XG4gICAgICAgIGlmICghZW5hYmxlQWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaW5hY3RpdmUnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgSXRlbVByb2ZpbGV9IGJ5IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgaYge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbShpbmRleDogbnVtYmVyKTogSXRlbVByb2ZpbGUge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5faXRlbXMsIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGZpcnN0IHtAbGluayBJdGVtUHJvZmlsZX0uXG4gICAgICogQGphIOacgOWIneOBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtRmlyc3QoKTogSXRlbVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlbXNbMF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBsYXN0IHtAbGluayBJdGVtUHJvZmlsZX0uXG4gICAgICogQGphIOacgOW+jOOBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtTGFzdCgpOiBJdGVtUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pdGVtc1t0aGlzLl9pdGVtcy5sZW5ndGggLSAxXTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvSGVscFN0cmluZyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zIH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9iYXNlJztcbmltcG9ydCB0eXBlIHsgSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yIH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9saXN0LWl0ZW0tdmlldyc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdENvbnRleHQgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2V4cGFuZGFibGUtY29udGV4dCc7XG5pbXBvcnQgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vaXRlbSc7XG5cbmNvbnN0IGVudW0gTGF5b3V0S2V5IHtcbiAgICBERUZBVUxUID0gJ2xheW91dC1kZWZhdWx0Jyxcbn1cblxuLyoqXG4gKiBAZW4gVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIHN0b3JhZ2UgY2xhc3MgZm9yIGdyb3VwIG1hbmFnZW1lbnQgb2YgbGlzdCBpdGVtcy4gPGJyPlxuICogICAgIFRoaXMgY2xhc3MgZG9lcyBub3QgZGlyZWN0bHkgbWFuaXB1bGF0ZSB0aGUgRE9NLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOCkuOCsOODq+ODvOODl+euoeeQhuOBmeOCiyBVSSDmp4vpgKDmg4XloLHmoLzntI3jgq/jg6njgrkgPGJyPlxuICogICAgIOacrOOCr+ODqeOCueOBr+ebtOaOpeOBryBET00g44KS5pON5L2c44GX44Gq44GEXG4gKi9cbmV4cG9ydCBjbGFzcyBHcm91cFByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgcHJvZmlsZSBpZCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2lkOiBzdHJpbmc7XG4gICAgLyoqIEBpbnRlcm5hbCB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSBpbnN0YW5jZSovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQ7XG4gICAgLyoqIEBpbnRlcm5hbCBwYXJlbnQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgKi9cbiAgICBwcml2YXRlIF9wYXJlbnQ/OiBHcm91cFByb2ZpbGU7XG4gICAgLyoqIEBpbnRlcm5hbCBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBhcnJheSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2NoaWxkcmVuOiBHcm91cFByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiBAaW50ZXJuYWwgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzICovXG4gICAgcHJpdmF0ZSBfZXhwYW5kZWQgPSBmYWxzZTtcbiAgICAvKiogQGludGVybmFsIHJlZ2lzdHJhdGlvbiBzdGF0dXMgZm9yIF9vd25lciAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcgPSAndW5yZWdpc3RlcmVkJztcbiAgICAvKiogQGludGVybmFsIHN0b3JlZCB7QGxpbmsgSXRlbVByb2ZpbGV9IGluZm9ybWF0aW9uICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfbWFwSXRlbXM6IFJlY29yZDxzdHJpbmcsIEl0ZW1Qcm9maWxlW10+ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG93bmVyXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSUV4cGFuZGFibGVMaXN0Q29udGV4dH0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBJRXhwYW5kYWJsZUxpc3RDb250ZXh0fSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIGlkIG9mIHRoZSBpbnN0YW5jZS4gc3BlY2lmaWVkIGJ5IHRoZSBmcmFtZXdvcmsuXG4gICAgICogIC0gYGphYCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga4gSUQuIOODleODrOODvOODoOODr+ODvOOCr+OBjOaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG93bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0LCBpZDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX2lkICAgID0gaWQ7XG4gICAgICAgIHRoaXMuX293bmVyID0gb3duZXI7XG4gICAgICAgIHRoaXMuX21hcEl0ZW1zW0xheW91dEtleS5ERUZBVUxUXSA9IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgSUQuXG4gICAgICogQGphIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQGVuIEdldCBzdGF0dXMuICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnXG4gICAgICogQGphIOOCueODhuODvOOCv+OCueOCkuWPluW+lyAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqL1xuICAgIGdldCBzdGF0dXMoKTogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMuXG4gICAgICogQGphIOWxlemWi+eKtuaFi+OCkuWIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4cGFuZGVkLCBjb2xsYXBzZWQ6IGNsb3NlXG4gICAgICogIC0gYGphYCB0cnVlOiDlsZXplossIGZhbHNlOiDlj47mnZ9cbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4cGFuZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcGFyZW50IHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDopqoge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHBhcmVudCgpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY2hpbGRyZW4ge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY2hpbGRyZW4oKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBuZXh0IGF2YWlsYWJsZSBpbmRleCBvZiB0aGUgbGFzdCBpdGVtIGVsZW1lbnQuXG4gICAgICogQGphIOacgOW+jOOBriBpdGVtIOimgee0oOOBruasoeOBq+S9v+eUqOOBp+OBjeOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB3aXRoQWN0aXZlQ2hpbGRyZW4gXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gc2VhcmNoIGluY2x1ZGluZyByZWdpc3RlcmVkIGNoaWxkIGVsZW1lbnRzXG4gICAgICogIC0gYGphYCDnmbvpjLLmuIjjgb/jga7lrZDopoHntKDjgpLlkKvjgoHjgabmpJzntKLjgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0TmV4dEl0ZW1JbmRleCh3aXRoQWN0aXZlQ2hpbGRyZW4gPSBmYWxzZSk6IG51bWJlciB7XG4gICAgICAgIGxldCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBpZiAod2l0aEFjdGl2ZUNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsID09IGl0ZW1zIHx8IGl0ZW1zLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMuX2l0ZW1zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaXRlbXNbaXRlbXMubGVuZ3RoIC0gMV0/LmluZGV4ID8/IDApICsgMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIOacrCBHcm91cFByb2ZpbGUg44GM566h55CG44GZ44KLIGl0ZW0g44KS5L2c5oiQ44GX44Gm55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqIEBwYXJhbSBsYXlvdXRLZXlcbiAgICAgKiAgLSBgZW5gIGlkZW50aWZpZXIgZm9yIGVhY2ggbGF5b3V0XG4gICAgICogIC0gYGphYCDjg6zjgqTjgqLjgqbjg4jmr47jga7orZjliKXlrZBcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkSXRlbShcbiAgICAgICAgaGVpZ2h0OiBudW1iZXIsXG4gICAgICAgIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG4gICAgICAgIGluZm86IFVua25vd25PYmplY3QsXG4gICAgICAgIGxheW91dEtleT86IHN0cmluZyxcbiAgICApOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBsYXlvdXRLZXkgPSBsYXlvdXRLZXkgPz8gTGF5b3V0S2V5LkRFRkFVTFQ7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHsgZ3JvdXBQcm9maWxlOiB0aGlzIH0sIGluZm8pO1xuXG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX21hcEl0ZW1zW2xheW91dEtleV0pIHtcbiAgICAgICAgICAgIHRoaXMuX21hcEl0ZW1zW2xheW91dEtleV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBuZXcgSXRlbVByb2ZpbGUodGhpcy5fb3duZXIuY29udGV4dCwgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgb3B0aW9ucyk7XG5cbiAgICAgICAgLy8gX293bmVyIOOBrueuoeeQhuS4i+OBq+OBguOCi+OBqOOBjeOBr+mAn+OChOOBi+OBq+i/veWKoFxuICAgICAgICBpZiAoKCdyZWdpc3RlcmVkJyA9PT0gdGhpcy5fc3RhdHVzKSAmJiAobnVsbCA9PSB0aGlzLl9vd25lci5sYXlvdXRLZXkgfHwgbGF5b3V0S2V5ID09PSB0aGlzLl9vd25lci5sYXlvdXRLZXkpKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtLCB0aGlzLmdldE5leHRJdGVtSW5kZXgoKSk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9tYXBJdGVtc1tsYXlvdXRLZXldLnB1c2goaXRlbSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBhcyBjaGlsZCBlbGVtZW50LlxuICAgICAqIEBqYSDlrZDopoHntKDjgajjgZfjgaYge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlIC8gaW5zdGFuY2UgYXJyYXlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkQ2hpbGRyZW4odGFyZ2V0OiBHcm91cFByb2ZpbGUgfCBHcm91cFByb2ZpbGVbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBjaGlsZHJlbjogR3JvdXBQcm9maWxlW10gPSBBcnJheS5pc0FycmF5KHRhcmdldCkgPyB0YXJnZXQgOiBbdGFyZ2V0XTtcbiAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgICAgICAgY2hpbGQuc2V0UGFyZW50KHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuLnB1c2goLi4uY2hpbGRyZW4pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIGlmIGl0IGhhcyBhIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9LiA8YnI+XG4gICAgICogICAgIElmIGBsYXlvdXRLZXlgIGlzIHNwZWNpZmllZCwgd2hldGhlciB0aGUgbGF5b3V0IGluZm9ybWF0aW9uIG1hdGNoZXMgaXMgYWxzbyBhZGRlZCB0byB0aGUganVkZ21lbnQgY29uZGl0aW9uLlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aIDxicj5cbiAgICAgKiAgICAgYGxheW91dEtleWAg44GM5oyH5a6a44GV44KM44KM44Gw44CBbGF5b3V0IOaDheWgseOBjOS4gOiHtOOBl+OBpuOBhOOCi+OBi+OCguWIpOWumuadoeS7tuOBq+WKoOOBiOOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIGxheW91dEtleVxuICAgICAqICAtIGBlbmAgaWRlbnRpZmllciBmb3IgZWFjaCBsYXlvdXRcbiAgICAgKiAgLSBgamFgIOODrOOCpOOCouOCpuODiOavjuOBruitmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgcHVibGljIGhhc0NoaWxkcmVuKGxheW91dEtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAodGhpcy5fY2hpbGRyZW4ubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxheW91dEtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkcmVuLnNvbWUoY2hpbGQgPT4gY2hpbGQuaGFzTGF5b3V0S2V5T2YobGF5b3V0S2V5KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgdGhlIHNwZWNpZmllZCBgbGF5b3V0S2V5YCBleGlzdHMuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgbGF5b3V0S2V5YCDjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsYXlvdXRLZXlcbiAgICAgKiAgLSBgZW5gIGlkZW50aWZpZXIgZm9yIGVhY2ggbGF5b3V0XG4gICAgICogIC0gYGphYCDjg6zjgqTjgqLjgqbjg4jmr47jga7orZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzLCBmYWxzZTogdW5leGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSwgZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXNMYXlvdXRLZXlPZihsYXlvdXRLZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKG51bGwgIT0gdGhpcy5fbWFwSXRlbXNbbGF5b3V0S2V5XSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwIGV4cGFuc2lvbi5cbiAgICAgKiBAamEg44Kw44Or44O844OX5bGV6ZaLXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGV4cGFuZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgncmVnaXN0ZXJlZCcpO1xuICAgICAgICAgICAgaWYgKDAgPCBpdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9vd25lci5zdGF0dXNTY29wZSgnZXhwYW5kaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbXMsIHRoaXMuZ2V0TmV4dEl0ZW1JbmRleCgpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5bGV6ZaL54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgY29sbGFwc2UuXG4gICAgICogQGphIOOCsOODq+ODvOODl+WPjuadn1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGNvbGxhcHNlKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgndW5yZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gdGhpcy5fb3duZXIuY29udGV4dC5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdjb2xsYXBzaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIucmVtb3ZlSXRlbShpdGVtc1swXS5pbmRleCwgaXRlbXMubGVuZ3RoLCBkZWxheSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIOWtkOimgee0oOOBjOOBquOBj+OBpuOCguWPjuadn+eKtuaFi+OBq+OBmeOCi1xuICAgICAgICB0aGlzLl9leHBhbmRlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG93IHNlbGYgaW4gdmlzaWJsZSBhcmVhIG9mIGxpc3QuXG4gICAgICogQGphIOiHqui6q+OCkuODquOCueODiOOBruWPr+imlumgmOWfn+OBq+ihqOekulxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IG9wdGlvbidzIG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9vd25lci5lbnN1cmVWaXNpYmxlKHRoaXMuX2l0ZW1zWzBdLmluZGV4LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnM/LmNhbGxiYWNrPy4oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUb2dnbGUgZXhwYW5kIC8gY29sbGFwc2UuXG4gICAgICogQGphIOmWi+mWieOBruODiOOCsOODq1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHRvZ2dsZShkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5fZXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29sbGFwc2UoZGVsYXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5leHBhbmQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjgbjnmbvpjLIuIOesrDHpmo7lsaTjgrDjg6vjg7zjg5fjga7jgb/nmbvpjLLlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5zZXJ0aW9uIHBvc2l0aW9uIHdpdGggaW5kZXhcbiAgICAgKiAgLSBgamFgIOaMv+WFpeS9jee9ruOCkiBpbmRleCDjgafmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIoaW5zZXJ0VG86IG51bWJlcik6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3JlZ2lzdGVyJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKHRoaXMucHJlcHJvY2VzcygncmVnaXN0ZXJlZCcpLCBpbnNlcnRUbyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN0b3JlIHRvIGxpc3Qgdmlldy4gT25seSAxc3QgbGF5ZXIgZ3JvdXAgY2FuIGJlIHNwZWNpZmllZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G45b6p5YWDLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/5oyH56S65Y+v6IO9LlxuICAgICAqL1xuICAgIHB1YmxpYyByZXN0b3JlKCk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3Jlc3RvcmUnIG1ldGhvZCBpcyBhY2NlcHRhYmxlIG9ubHkgMXN0IGxheWVyIGdyb3VwLmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5fZXhwYW5kZWQgPyB0aGlzLl9pdGVtcy5jb25jYXQodGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgnYWN0aXZlJykpIDogdGhpcy5faXRlbXMuc2xpY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwg6Ieq6Lqr44Gu566h55CG44GZ44KL44Ki44Kv44OG44Kj44OW44GqIExpbmVQcm9maWUg44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBnZXQgX2l0ZW1zKCk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBrZXkgPSB0aGlzLl9vd25lci5sYXlvdXRLZXk7XG4gICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21hcEl0ZW1zW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbWFwSXRlbXNbTGF5b3V0S2V5LkRFRkFVTFRdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCDopqogR3JvdXAg5oyH5a6aICovXG4gICAgcHJpdmF0ZSBzZXRQYXJlbnQocGFyZW50OiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgIHJlZ2lzdGVyIC8gdW5yZWdpc3RlciDjga7liY3lh6bnkIYgKi9cbiAgICBwcml2YXRlIHByZXByb2Nlc3MobmV3U3RhdHVzOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBpZiAobmV3U3RhdHVzICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4udGhpcy5faXRlbXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9IG5ld1N0YXR1cztcbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwg5pON5L2c5a++6LGh44GuIEl0ZW1Qcm9maWxlIOmFjeWIl+OCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgcXVlcnlPcGVyYXRpb25UYXJnZXQob3BlcmF0aW9uOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyB8ICdhY3RpdmUnKTogSXRlbVByb2ZpbGVbXSB7XG4gICAgICAgIGNvbnN0IGZpbmRUYXJnZXRzID0gKGdyb3VwOiBHcm91cFByb2ZpbGUpOiBJdGVtUHJvZmlsZVtdID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGdyb3VwLl9jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JlZ2lzdGVyZWQnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICd1bnJlZ2lzdGVyZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZC5wcmVwcm9jZXNzKG9wZXJhdGlvbikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FjdGl2ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjaGlsZC5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkLl9pdGVtcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBvcGVyYXRpb246ICR7b3BlcmF0aW9ufWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjaGlsZC5pc0V4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uZmluZFRhcmdldHMoY2hpbGQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmaW5kVGFyZ2V0cyh0aGlzKTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFZpZXcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBvd25lcjogSUxpc3RWaWV3O1xuICAgIHJlYWRvbmx5IGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayBMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDmp4vnr4njgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgb3duZXI6IElMaXN0VmlldztcbiAgICAkZWw/OiBET008VEVsZW1lbnQ+O1xuICAgIGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIExpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RJdGVtVmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG93bmVyLCAkZWwsIGl0ZW0gfSA9IG9wdGlvbnM7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgb3duZXIsXG4gICAgICAgICAgICBpdGVtLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuXG4gICAgICAgIGlmICgkZWwpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudCgkZWwgYXMgRE9NU2VsZWN0b3I8VEVsZW1lbnQ+KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIE93bmVyIOWPluW+lyAqL1xuICAgIGdldCBvd25lcigpOiBJTGlzdFZpZXcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ub3duZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gVmlldyBjb21wb25lbnQgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBSZW1vdmUgdGhpcyB2aWV3IGJ5IHRha2luZyB0aGUgZWxlbWVudCBvdXQgb2YgdGhlIERPTSB3aXRoIHJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEgVmlldyDjgYvjgokgRE9NIOOCkuWIh+OCiumbouOBlywg44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLiRlbC5jaGlsZHJlbigpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLiRlbC5vZmYoKTtcbiAgICAgICAgLy8gdGhpcy4kZWwg44Gv5YaN5Yip55So44GZ44KL44Gf44KB5a6M5YWo44Gq56C05qOE44Gv44GX44Gq44GEXG4gICAgICAgIHRoaXMuc2V0RWxlbWVudCgnbnVsbCcpO1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RJdGVtVmlld1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBvd24gaXRlbSBpbmRleC5cbiAgICAgKiBAamEg6Ieq6Lqr44GuIGl0ZW0g44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLmluZGV4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc3BlY2lmaWVkIGhlaWdodC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf6auY44GV44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uaXRlbS5oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGlmIGNoaWxkIG5vZGUgZXhpc3RzLlxuICAgICAqIEBqYSBjaGlsZCBub2RlIOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBoYXNDaGlsZE5vZGUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuJGVsPy5jaGlsZHJlbigpLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGl0ZW0ncyBoZWlnaHQuXG4gICAgICogQGphIGl0ZW0g44Gu6auY44GV44KS5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3SGVpZ2h0XG4gICAgICogIC0gYGVuYCBuZXcgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7mlrDjgZfjgYTpq5jjgZVcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIG9wdGlvbnMgb2JqZWN0XG4gICAgICogIC0gYGphYCDmm7TmlrDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICB1cGRhdGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuJGVsICYmIHRoaXMuaGVpZ2h0ICE9PSBuZXdIZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0udXBkYXRlSGVpZ2h0KG5ld0hlaWdodCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB0aGlzLiRlbC5oZWlnaHQobmV3SGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgTnVsbGFibGUsXG4gICAgdHlwZSBVbmtub3duRnVuY3Rpb24sXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgdHlwZSBDb25uZWN0RXZlbnRNYXAsXG4gICAgdHlwZSBUaW1lckhhbmRsZSxcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBMaXN0U2Nyb2xsZXJGYWN0b3J5LFxuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdFNjcm9sbGVyLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBTY3JvbGxlckV2ZW50TWFwID0gSFRNTEVsZW1lbnRFdmVudE1hcCAmIENvbm5lY3RFdmVudE1hcCAmIHsgJ3Njcm9sbHN0b3AnOiBFdmVudDsgfTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgTUlOX1NDUk9MTFNUT1BfRFVSQVRJT04gPSA1MCxcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiB7QGxpbmsgSUxpc3RTY3JvbGxlcn0gaW1wbGVtZW50YXRpb24gY2xhc3MgZm9yIEhUTUxFbGVtZW50LlxuICogQGphIEhUTUxFbGVtZW50IOOCkuWvvuixoeOBqOOBl+OBnyB7QGxpbmsgSUxpc3RTY3JvbGxlcn0g5a6f6KOF44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBFbGVtZW50U2Nyb2xsZXIgaW1wbGVtZW50cyBJTGlzdFNjcm9sbGVyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kdGFyZ2V0OiBET007XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJHNjcm9sbE1hcDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX29wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxTdG9wVHJpZ2dlcjogRE9NRXZlbnRMaXN0ZW5lcjtcbiAgICBwcml2YXRlIF9zY3JvbGxEdXJhdGlvbj86IG51bWJlcjtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQ6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldCA9ICQoZWxlbWVudCk7XG4gICAgICAgIHRoaXMuXyRzY3JvbGxNYXAgPSB0aGlzLl8kdGFyZ2V0LmNoaWxkcmVuKCkuZmlyc3QoKTtcbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICAgICAgLypcbiAgICAgICAgICogZmlyZSBjdXN0b20gZXZlbnQ6IGBzY3JvbGxzdG9wYFxuICAgICAgICAgKiBgc2Nyb2xsZW5kYCDjga4gU2FmYXJpIOWvvuW/nOW+heOBoVxuICAgICAgICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvRWxlbWVudC9zY3JvbGxlbmRfZXZlbnRcbiAgICAgICAgICovXG4gICAgICAgIGxldCB0aW1lcjogVGltZXJIYW5kbGU7XG4gICAgICAgIHRoaXMuX3Njcm9sbFN0b3BUcmlnZ2VyID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gdGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kdGFyZ2V0LnRyaWdnZXIobmV3IEN1c3RvbUV2ZW50KCdzY3JvbGxzdG9wJywgeyBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH0pKTtcbiAgICAgICAgICAgIH0sIHRoaXMuX3Njcm9sbER1cmF0aW9uID8/IENvbnN0Lk1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqIOOCv+OCpOODl+Wumue+qeitmOWIpeWtkCAqL1xuICAgIHN0YXRpYyBnZXQgVFlQRSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ2NkcDplbGVtZW50LW92ZXJmbG93LXNjcm9sbGVyJztcbiAgICB9XG5cbiAgICAvKiogZmFjdG9yeSDlj5blvpcgKi9cbiAgICBzdGF0aWMgZ2V0RmFjdG9yeSgpOiBMaXN0U2Nyb2xsZXJGYWN0b3J5IHtcbiAgICAgICAgY29uc3QgZmFjdG9yeSA9IChlbGVtZW50OiBET01TZWxlY3Rvciwgb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zKTogSUxpc3RTY3JvbGxlciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEVsZW1lbnRTY3JvbGxlcihlbGVtZW50LCBvcHRpb25zKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gc2V0IHR5cGUgc2lnbmF0dXJlLlxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhmYWN0b3J5LCB7XG4gICAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogRWxlbWVudFNjcm9sbGVyLlRZUEUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhY3RvcnkgYXMgTGlzdFNjcm9sbGVyRmFjdG9yeTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGVyXG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu5Z6L5oOF5aCx44KS5Y+W5b6XICovXG4gICAgZ2V0IHR5cGUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIEVsZW1lbnRTY3JvbGxlci5UWVBFO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7lj5blvpcgKi9cbiAgICBnZXQgcG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kdGFyZ2V0LnNjcm9sbFRvcCgpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vmnIDlpKflgKTkvY3nva7jgpLlj5blvpcgKi9cbiAgICBnZXQgcG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLl8kc2Nyb2xsTWFwLmhlaWdodCgpIC0gdGhpcy5fJHRhcmdldC5oZWlnaHQoKSwgMCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOeZu+mMsiAqL1xuICAgIG9uKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uPFNjcm9sbGVyRXZlbnRNYXA+KHR5cGUsIGNhbGxiYWNrIGFzIFVua25vd25GdW5jdGlvbik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOeZu+mMsuino+mZpCAqL1xuICAgIG9mZih0eXBlOiAnc2Nyb2xsJyB8ICdzY3JvbGxzdG9wJywgY2FsbGJhY2s6IERPTUV2ZW50TGlzdGVuZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vZmY8U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gKHRoaXMuX29wdGlvbnMuZW5hYmxlQW5pbWF0aW9uID8/IGFuaW1hdGUpID8gdGltZSA/PyB0aGlzLl9vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AocG9zLCB0aGlzLl9zY3JvbGxEdXJhdGlvbiwgdW5kZWZpbmVkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDjga7nirbmhYvmm7TmlrAgKi9cbiAgICB1cGRhdGUoKTogdm9pZCB7XG4gICAgICAgIC8vIG5vb3BcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu56C05qOEICovXG4gICAgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldD8ub2ZmKCk7XG4gICAgICAgICh0aGlzLl8kdGFyZ2V0IGFzIE51bGxhYmxlPERPTT4pID0gKHRoaXMuXyRzY3JvbGxNYXAgYXMgTnVsbGFibGU8RE9NPikgPSBudWxsO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBwb3N0LFxuICAgIG5vb3AsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQge1xuICAgIGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyxcbiAgICBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uLFxuICAgIGNsZWFyVHJhbnNpdGlvbixcbn0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0Q29udGV4dCxcbiAgICBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbiAgICBJTGlzdE9wZXJhdGlvbixcbiAgICBJTGlzdFNjcm9sbGFibGUsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Vmlld0dsb2JhbENvbmZpZyB9IGZyb20gJy4uL2dsb2JhbC1jb25maWcnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUsIFBhZ2VQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5pbXBvcnQgeyBFbGVtZW50U2Nyb2xsZXIgfSBmcm9tICcuL2VsZW1lbnQtc2Nyb2xsZXInO1xuXG4vKiogTGlzdENvbnRleHRPcHRpb25zIOaXouWumuWApCAqL1xuY29uc3QgX2RlZmF1bHRPcHRzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+ID0ge1xuICAgIHNjcm9sbGVyRmFjdG9yeTogRWxlbWVudFNjcm9sbGVyLmdldEZhY3RvcnkoKSxcbiAgICBlbmFibGVIaWRkZW5QYWdlOiBmYWxzZSxcbiAgICBlbmFibGVUcmFuc2Zvcm1PZmZzZXQ6IGZhbHNlLFxuICAgIHNjcm9sbE1hcFJlZnJlc2hJbnRlcnZhbDogMjAwLFxuICAgIHNjcm9sbFJlZnJlc2hEaXN0YW5jZTogMjAwLFxuICAgIHBhZ2VQcmVwYXJlQ291bnQ6IDMsXG4gICAgcGFnZVByZWxvYWRDb3VudDogMSxcbiAgICBlbmFibGVBbmltYXRpb246IHRydWUsXG4gICAgYW5pbWF0aW9uRHVyYXRpb246IDAsXG4gICAgYmFzZURlcHRoOiAnYXV0bycsXG4gICAgaXRlbVRhZ05hbWU6ICdsaScsICAvLyBUT0RPOiDopovmpbXjgoFcbiAgICByZW1vdmVJdGVtV2l0aFRyYW5zaXRpb246IHRydWUsXG4gICAgdXNlRHVtbXlJbmFjdGl2ZVNjcm9sbE1hcDogZmFsc2UsXG59O1xuXG4vKiogaW52YWxpZCBpbnN0YW5jZSAqL1xuY29uc3QgXyRpbnZhbGlkID0gJCgpIGFzIERPTTtcblxuLyoqIOWIneacn+WMlua4iOOBv+OBi+aknOiovCAqL1xuZnVuY3Rpb24gdmVyaWZ5PFQ+KHg6IFQgfCB1bmRlZmluZWQpOiBhc3NlcnRzIHggaXMgVCB7XG4gICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04pO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCDjgqLjgqTjg4bjg6DliYrpmaTmg4XloLEgKi9cbmludGVyZmFjZSBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgIHJlbW92ZWQ6IEl0ZW1Qcm9maWxlW107XG4gICAgZGVsdGE6IG51bWJlcjtcbiAgICB0cmFuc2l0aW9uOiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBzY3JvbGwgcHJvY2Vzc2luZyB0aGF0IG1hbmFnZXMgbWVtb3J5LiBBY2Nlc3NlcyB0aGUgRE9NLlxuICogQGphIOODoeODouODqueuoeeQhuOCkuihjOOBhuOCueOCr+ODreODvOODq+WHpueQhuOBruOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuS4gRE9NIOOBq+OCouOCr+OCu+OCueOBmeOCiy5cbiAqL1xuZXhwb3J0IGNsYXNzIExpc3RDb3JlIGltcGxlbWVudHMgSUxpc3RDb250ZXh0LCBJTGlzdE9wZXJhdGlvbiwgSUxpc3RTY3JvbGxhYmxlLCBJTGlzdEJhY2t1cFJlc3RvcmUge1xuICAgIHByaXZhdGUgXyRyb290OiBET007XG4gICAgcHJpdmF0ZSBfJG1hcDogRE9NO1xuICAgIHByaXZhdGUgX21hcEhlaWdodCA9IDA7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsZXI6IElMaXN0U2Nyb2xsZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKiogVUkg6KGo56S65Lit44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9hY3RpdmUgPSB0cnVlO1xuXG4gICAgLyoqIOWIneacn+OCquODl+OCt+ODp+ODs+OCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3NldHRpbmdzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+O1xuICAgIC8qKiBTY3JvbGwgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbEV2ZW50SGFuZGxlcjogKGV2PzogRXZlbnQpID0+IHZvaWQ7XG4gICAgLyoqIFNjcm9sbCBTdG9wIEV2ZW50IEhhbmRsZXIgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogMeODmuODvOOCuOWIhuOBrumrmOOBleOBruWfuua6luWApCAqL1xuICAgIHByaXZhdGUgX2Jhc2VIZWlnaHQgPSAwO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgSXRlbVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiog566h55CG5LiL44Gr44GC44KLIFBhZ2VQcm9maWxlIOmFjeWIlyAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhZ2VzOiBQYWdlUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog5pyA5paw44Gu6KGo56S66aCY5Z+f5oOF5aCx44KS5qC857SNIChTY3JvbGwg5Lit44Gu5pu05paw5Yem55CG44Gr5L2/55SoKSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCA9IHtcbiAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgIGZyb206IDAsXG4gICAgICAgIHRvOiAwLFxuICAgICAgICBwb3M6IDAsICAgIC8vIHNjcm9sbCBwb3NpdGlvblxuICAgIH07XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggX2xpbmVzIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSB0aGlzLl8kbWFwID0gXyRpbnZhbGlkO1xuICAgICAgICB0aGlzLl9zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIF9kZWZhdWx0T3B0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbCh0aGlzLl9zY3JvbGxlciEucG9zKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlciA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TY3JvbGxTdG9wKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruWIneacn+WMliAqL1xuICAgIHB1YmxpYyBpbml0aWFsaXplKCRyb290OiBET00sIGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIOaXouOBq+ani+evieOBleOCjOOBpuOBhOOBn+WgtOWQiOOBr+egtOajhFxuICAgICAgICBpZiAodGhpcy5fJHJvb3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuXyRyb290ID0gJHJvb3Q7XG4gICAgICAgIHRoaXMuXyRtYXAgPSAkcm9vdC5oYXNDbGFzcyh0aGlzLl9jb25maWcuU0NST0xMX01BUF9DTEFTUykgPyAkcm9vdCA6ICRyb290LmZpbmQodGhpcy5fY29uZmlnLlNDUk9MTF9NQVBfU0VMRUNUT1IpO1xuICAgICAgICAvLyBfJG1hcCDjgYznhKHjgYTloLTlkIjjga/liJ3mnJ/ljJbjgZfjgarjgYRcbiAgICAgICAgaWYgKHRoaXMuXyRtYXAubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gWyR7dGhpcy5fY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1N9IG5vdCBmb3VuZF1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsZXIgPSB0aGlzLmNyZWF0ZVNjcm9sbGVyKCk7XG4gICAgICAgIHRoaXMuc2V0QmFzZUhlaWdodChoZWlnaHQpO1xuICAgICAgICB0aGlzLnNldFNjcm9sbGVyQ29uZGl0aW9uKCk7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruegtOajhCAqL1xuICAgIHB1YmxpYyBkZXN0cm95KCk6IHZvaWQge1xuICAgICAgICB0aGlzLnJlc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLl8kcm9vdCA9IHRoaXMuXyRtYXAgPSBfJGludmFsaWQ7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOBruWfuua6luWApOOCkuWPluW+lyAqL1xuICAgIHB1YmxpYyBzZXRCYXNlSGVpZ2h0KGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChoZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW2Jhc2UgaGlnaHQ6ICR7aGVpZ2h0fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Jhc2VIZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiogYWN0aXZlIOeKtuaFi+ioreWumiAqL1xuICAgIHB1YmxpYyBhc3luYyBzZXRBY3RpdmVTdGF0ZShhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fYWN0aXZlID0gYWN0aXZlO1xuICAgICAgICBhd2FpdCB0aGlzLnRyZWF0U2Nyb2xsUG9zaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiogYWN0aXZlIOeKtuaFi+WIpOWumiAqL1xuICAgIGdldCBhY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gICAgfVxuXG4gICAgLyoqIHNjcm9sbGVyIOOBrueorumhnuOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxlclR5cGUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzLnNjcm9sbGVyRmFjdG9yeS50eXBlO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7kv53lrZgv5b6p5YWDICovXG4gICAgcHVibGljIGFzeW5jIHRyZWF0U2Nyb2xsUG9zaXRpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gKHRoaXMuX3Njcm9sbGVyLnBvcyAtIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MpO1xuICAgICAgICBjb25zdCB7IHVzZUR1bW15SW5hY3RpdmVTY3JvbGxNYXA6IHVzZUR1bW15TWFwIH0gPSB0aGlzLl9zZXR0aW5ncztcblxuICAgICAgICBjb25zdCB1cGRhdGVPZmZzZXQgPSAoJHRhcmdldDogRE9NKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zbGF0ZVkgfSA9IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcygkdGFyZ2V0WzBdKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQgIT09IHRyYW5zbGF0ZVkpIHtcbiAgICAgICAgICAgICAgICAkdGFyZ2V0LmNzcygndHJhbnNmb3JtJywgYHRyYW5zbGF0ZTNkKDAsJHtvZmZzZXR9cHgsMGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Njcm9sbGVyLnNjcm9sbFRvKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MsIGZhbHNlLCAwKTtcbiAgICAgICAgICAgIHRoaXMuXyRtYXAuY3NzKHsgJ3RyYW5zZm9ybSc6ICcnLCAnZGlzcGxheSc6ICdibG9jaycgfSk7XG4gICAgICAgICAgICBpZiAodXNlRHVtbXlNYXApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXBhcmVJbmFjdGl2ZU1hcCgpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgJG1hcCA9IHVzZUR1bW15TWFwID8gdGhpcy5wcmVwYXJlSW5hY3RpdmVNYXAoKSA6IHRoaXMuXyRtYXA7XG4gICAgICAgICAgICB1cGRhdGVPZmZzZXQoJG1hcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdENvbnRleHRcblxuICAgIC8qKiBnZXQgc2Nyb2xsLW1hcCBlbGVtZW50ICovXG4gICAgZ2V0ICRzY3JvbGxNYXAoKTogRE9NIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXA7XG4gICAgfVxuXG4gICAgLyoqIGdldCBzY3JvbGwtbWFwIGhlaWdodCBbcHhdICovXG4gICAgZ2V0IHNjcm9sbE1hcEhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcC5sZW5ndGggPyB0aGlzLl9tYXBIZWlnaHQgOiAwO1xuICAgIH1cblxuICAgIC8qKiBnZXQge0BsaW5rIExpc3RDb250ZXh0T3B0aW9uc30gKi9cbiAgICBnZXQgb3B0aW9ucygpOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiB1cGRhdGUgc2Nyb2xsLW1hcCBoZWlnaHQgKGRlbHRhIFtweF0pICovXG4gICAgdXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRtYXAubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9tYXBIZWlnaHQgKz0gTWF0aC50cnVuYyhkZWx0YSk7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlLlxuICAgICAgICAgICAgaWYgKHRoaXMuX21hcEhlaWdodCA8IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tYXBIZWlnaHQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQodGhpcy5fbWFwSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiB1cGRhdGUgaW50ZXJuYWwgcHJvZmlsZSAqL1xuICAgIHVwZGF0ZVByb2ZpbGVzKGZyb206IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IF9pdGVtcyB9ID0gdGhpcztcbiAgICAgICAgZm9yIChsZXQgaSA9IGZyb20sIG4gPSBfaXRlbXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoMCA8IGkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gX2l0ZW1zW2kgLSAxXTtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSBsYXN0LmluZGV4ICsgMTtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0ub2Zmc2V0ID0gbGFzdC5vZmZzZXQgKyBsYXN0LmhlaWdodDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0ub2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBnZXQgcmVjeWNsYWJsZSBlbGVtZW50ICovXG4gICAgZmluZFJlY3ljbGVFbGVtZW50cygpOiBET00ge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcC5maW5kKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTX1NFTEVDVE9SKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFZpZXdcblxuICAgIC8qKiDliJ3mnJ/ljJbmuIjjgb/jgYvliKTlrpogKi9cbiAgICBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9zY3JvbGxlcjtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLCBpbmZvOiBVbmtub3duT2JqZWN0LCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hZGRJdGVtKG5ldyBJdGVtUHJvZmlsZSh0aGlzLCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAo5YaF6YOo55SoKSAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbSA6IFtpdGVtXTtcbiAgICAgICAgbGV0IGRlbHRhSGVpZ2h0ID0gMDtcbiAgICAgICAgbGV0IGFkZFRhaWwgPSBmYWxzZTtcblxuICAgICAgICBpZiAobnVsbCA9PSBpbnNlcnRUbyB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbnNlcnRUbykge1xuICAgICAgICAgICAgaW5zZXJ0VG8gPSB0aGlzLl9pdGVtcy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zZXJ0VG8gPT09IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRkVGFpbCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgbWFwIOOBruabtOaWsFxuICAgICAgICBmb3IgKGNvbnN0IGl0IG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBkZWx0YUhlaWdodCArPSBpdC5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGFIZWlnaHQpO1xuXG4gICAgICAgIC8vIOaMv+WFpVxuICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaW5zZXJ0VG8sIDAsIC4uLml0ZW1zKTtcblxuICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICBpZiAoIWFkZFRhaWwpIHtcbiAgICAgICAgICAgIGlmICgwID09PSBpbnNlcnRUbykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbnNlcnRUbyAtIDFdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaQgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIsIHNpemU/OiBudW1iZXIsIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4LCBhcmcyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXgsIGFyZzIsIGFyZzMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6ICovXG4gICAgcHJpdmF0ZSBfcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5OiBudW1iZXIpOiBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgICAgICBjb25zdCByZW1vdmVkOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGxldCBkZWx0YSA9IDA7XG4gICAgICAgIGxldCB0cmFuc2l0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuX2l0ZW1zW2lkeF07XG4gICAgICAgICAgICBkZWx0YSArPSBpdGVtLmhlaWdodDtcbiAgICAgICAgICAgIC8vIOWJiumZpOimgee0oOOBriB6LWluZGV4IOOBruWIneacn+WMllxuICAgICAgICAgICAgaXRlbS5yZXNldERlcHRoKCk7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8g6Ieq5YuV6Kit5a6a44O75YmK6Zmk6YGF5bu25pmC6ZaT44GM6Kit5a6a44GV44KM44GL44Gk44CB44K544Kv44Ot44O844Or44Od44K444K344On44Oz44Gr5aSJ5pu044GM44GC44KL5aC05ZCI44GvIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0aGlzLl9zZXR0aW5ncy5yZW1vdmVJdGVtV2l0aFRyYW5zaXRpb24gJiYgKDAgPCBkZWxheSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLnNjcm9sbFBvcztcbiAgICAgICAgICAgIGNvbnN0IHBvc01heCA9IHRoaXMuc2Nyb2xsUG9zTWF4IC0gZGVsdGE7XG4gICAgICAgICAgICB0cmFuc2l0aW9uID0gKHBvc01heCA8IGN1cnJlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgcmVtb3ZlZCwgZGVsdGEsIHRyYW5zaXRpb24gfTtcbiAgICB9XG5cbiAgICAvKiogaGVscGVyOiDliYrpmaTmmYLjga7mm7TmlrAgKi9cbiAgICBwcml2YXRlIF91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQ6IFJlbW92ZUl0ZW1zQ29udGV4dCwgZGVsYXk6IG51bWJlciwgcHJvZmlsZVVwZGF0ZTogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH0gPSBjb250ZXh0O1xuXG4gICAgICAgIC8vIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjdXN0b21pemUgcG9pbnQ6IOODl+ODreODleOCoeOCpOODq+OBruabtOaWsFxuICAgICAgICBwcm9maWxlVXBkYXRlKCk7XG5cbiAgICAgICAgLy8g44K544Kv44Ot44O844Or6aCY5Z+f44Gu5pu05pawXG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KC1kZWx0YSk7XG4gICAgICAgIC8vIOmBheW7tuWJiumZpFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiByZW1vdmVkKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDog6YCj57aaIGluZGV4IOeJiCAqL1xuICAgIHByaXZhdGUgX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyIHwgdW5kZWZpbmVkLCBkZWxheTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgICAgIHNpemUgPSBzaXplID8/IDE7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcblxuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4ICsgc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3JlbW92ZUl0ZW0oKSwgaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBpbmRleGVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogc2l6ZSB9LCAoXywgaSkgPT4gaW5kZXggKyBpKTtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luZGV4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluZGV4LCBzaXplKTtcbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5kZXgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDogcmFuZG9tIGFjY2VzcyDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtUmFuZG9tbHkoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcbiAgICAgICAgaW5kZXhlcy5zb3J0KChsaHMsIHJocykgPT4gcmhzIC0gbGhzKTsgLy8g6ZmN6aCG44K944O844OIXG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIG4gPSBpbmRleGVzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgaWYgKGkgPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtyZW1vdmVJdGVtKCksIGludmFsaWQgaW5kZXg6ICR7aX1dYFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7pcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaWR4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaWR4XS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyDphY3liJfjgYvjgonliYrpmaRcbiAgICAgICAgICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gaW5kZXhlc1tpbmRleGVzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9maWxlcyhmaXJzdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBzY3JvbGwgbWFwIOOBruODiOODqeODs+OCuOOCt+ODp+ODs+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0dXBTY3JvbGxNYXBUcmFuc2l0aW9uKGRlbGF5OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcbiAgICAgICAgY29uc3QgZWwgPSB0aGlzLl8kbWFwWzBdO1xuICAgICAgICB0aGlzLl8kbWFwLnRyYW5zaXRpb25FbmQoKCkgPT4ge1xuICAgICAgICAgICAgY2xlYXJUcmFuc2l0aW9uKGVsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFRyYW5zZm9ybVRyYW5zaXRpb24oZWwsICdoZWlnaHQnLCBkZWxheSwgJ2Vhc2UnKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XICovXG4gICAgZ2V0SXRlbUluZm8odGFyZ2V0OiBudW1iZXIgfCBFdmVudCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICBjb25zdCB7IF9pdGVtcywgX2NvbmZpZyB9ID0gdGhpcztcblxuICAgICAgICBjb25zdCBwYXJzZXIgPSAoJHRhcmdldDogRE9NKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKF9jb25maWcuTElTVElURU1fQkFTRV9DTEFTUykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKCR0YXJnZXQuYXR0cihfY29uZmlnLkRBVEFfSVRFTV9JTkRFWCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKF9jb25maWcuU0NST0xMX01BUF9DTEFTUykgfHwgJHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignY2Fubm90IGRpdGVjdCBpdGVtIGZyb20gZXZlbnQgb2JqZWN0LicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZXIoJHRhcmdldC5wYXJlbnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaW5kZXggPSB0YXJnZXQgaW5zdGFuY2VvZiBFdmVudCA/IHBhcnNlcigkKHRhcmdldC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpKSA6IE51bWJlcih0YXJnZXQpO1xuXG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbdW5zdXBwb3J0ZWQgdHlwZTogJHt0eXBlb2YgdGFyZ2V0fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKGluZGV4IDwgMCB8fCBfaXRlbXMubGVuZ3RoIDw9IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBnZXRJdGVtSW5mbygpIFtpbnZhbGlkIGluZGV4OiAke3R5cGVvZiBpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBfaXRlbXNbaW5kZXhdLmluZm87XG4gICAgfVxuXG4gICAgLyoqIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsCAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgX3BhZ2VzLCBfaXRlbXMsIF9zZXR0aW5ncywgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCB9ID0gdGhpcztcblxuICAgICAgICBjb25zdCB0YXJnZXRzOiBSZWNvcmQ8bnVtYmVyLCAnYWN0aXZhdGUnIHwgJ2hpZGUnIHwgJ2RlYWN0aXZhdGUnPiA9IHt9O1xuICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgY29uc3QgaGlnaFByaW9yaXR5SW5kZXg6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgY29uc3Qgc3RvcmVOZXh0UGFnZVN0YXRlID0gKGluZGV4OiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2FjdGl2YXRlJztcbiAgICAgICAgICAgICAgICBoaWdoUHJpb3JpdHlJbmRleC5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoTWF0aC5hYnMoY3VycmVudFBhZ2VJbmRleCAtIGluZGV4KSA8PSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2FjdGl2YXRlJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoX3NldHRpbmdzLmVuYWJsZUhpZGRlblBhZ2UpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdoaWRlJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnZGVhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjdXJyZW50IHBhZ2Ug44GuIOWJjeW+jOOBryBoaWdoIHByaW9yaXR5IOOBq+OBmeOCi1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRQYWdlSW5kZXggKyAxID09PSBpbmRleCB8fCBjdXJyZW50UGFnZUluZGV4IC0gMSA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBoaWdoUHJpb3JpdHlJbmRleC5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyDlr77osaHnhKHjgZdcbiAgICAgICAgaWYgKF9pdGVtcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hDb3VudCA9IF9zZXR0aW5ncy5wYWdlUHJlcGFyZUNvdW50ICsgX3NldHRpbmdzLnBhZ2VQcmVsb2FkQ291bnQ7XG4gICAgICAgICAgICBjb25zdCBiZWdpbkluZGV4ID0gY3VycmVudFBhZ2VJbmRleCAtIHNlYXJjaENvdW50O1xuICAgICAgICAgICAgY29uc3QgZW5kSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQ7XG5cbiAgICAgICAgICAgIGxldCBvdmVyZmxvd1ByZXYgPSAwLCBvdmVyZmxvd05leHQgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgcGFnZUluZGV4ID0gYmVnaW5JbmRleDsgcGFnZUluZGV4IDw9IGVuZEluZGV4OyBwYWdlSW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJmbG93UHJldisrO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gcGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJmbG93TmV4dCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgwIDwgb3ZlcmZsb3dQcmV2KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHBhZ2VJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggKyBzZWFyY2hDb3VudCArIDE7IGkgPCBvdmVyZmxvd1ByZXY7IGkrKywgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gcGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgwIDwgb3ZlcmZsb3dOZXh0KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHBhZ2VJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudCAtIDE7IGkgPCBvdmVyZmxvd05leHQ7IGkrKywgcGFnZUluZGV4LS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhZ2VJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOS4jeimgeOBq+OBquOBo+OBnyBwYWdlIOOBriDpnZ7mtLvmgKfljJZcbiAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIF9wYWdlcy5maWx0ZXIocGFnZSA9PiAnaW5hY3RpdmUnICE9PSBwYWdlLnN0YXR1cykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHRhcmdldHNbcGFnZS5pbmRleF0pIHtcbiAgICAgICAgICAgICAgICBwYWdlLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWEquWFiCBwYWdlIOOBriBhY3RpdmF0ZVxuICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBoaWdoUHJpb3JpdHlJbmRleC5zb3J0KChsaHMsIHJocykgPT4gbGhzIC0gcmhzKSkgeyAvLyDmmIfpoIbjgr3jg7zjg4hcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkKCkgJiYgX3BhZ2VzW2lkeF0/LmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOOBneOBruOBu+OBi+OBriBwYWdlIOOBriDnirbmhYvlpInmm7RcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0cykpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gTnVtYmVyKGtleSk7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSB0YXJnZXRzW2luZGV4XTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkKCkgJiYgX3BhZ2VzW2luZGV4XT8uW2FjdGlvbl0/LigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDmm7TmlrDlvozjgavkvb/nlKjjgZfjgarjgYvjgaPjgZ8gRE9NIOOCkuWJiumZpFxuICAgICAgICB0aGlzLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5yZW1vdmUoKTtcblxuICAgICAgICBjb25zdCBwYWdlQ3VycmVudCA9IF9wYWdlc1tjdXJyZW50UGFnZUluZGV4XTtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5mcm9tICA9IHBhZ2VDdXJyZW50LmdldEl0ZW1GaXJzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnRvICAgID0gcGFnZUN1cnJlbnQuZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCA9IGN1cnJlbnRQYWdlSW5kZXg7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOacquOCouOCteOCpOODs+ODmuODvOOCuOOCkuani+eviSAqL1xuICAgIHVwZGF0ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5hc3NpZ25QYWdlKHRoaXMuX3BhZ2VzLmxlbmd0aCk7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Ki44K144Kk44Oz44KS5YaN5qeL5oiQICovXG4gICAgcmVidWlsZCgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoKTtcbiAgICAgICAgdGhpcy5hc3NpZ25QYWdlKCk7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog566h6L2E44OH44O844K/44KS56C05qOEICovXG4gICAgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wYWdlcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pdGVtcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9tYXBIZWlnaHQgPSAwO1xuICAgICAgICB0aGlzLl8kbWFwLmhlaWdodCgwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbFBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnBvcyA/PyAwO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7mnIDlpKflgKTjgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8ucG9zTWF4ID8/IDA7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaQgKi9cbiAgICBzZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5bbWV0aG9kXSgnc2Nyb2xsJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaQgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uW21ldGhvZF0oJ3Njcm9sbHN0b3AnLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aICovXG4gICAgYXN5bmMgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgcG9zaXRpb24sIHRvbyBzbWFsbC4gW3BvczogJHtwb3N9XWApO1xuICAgICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9zY3JvbGxlci5wb3NNYXggPCBwb3MpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBwb3NpdGlvbiwgdG9vIGJpZy4gW3BvczogJHtwb3N9XWApO1xuICAgICAgICAgICAgcG9zID0gdGhpcy5fc2Nyb2xsZXIucG9zO1xuICAgICAgICB9XG4gICAgICAgIC8vIHBvcyDjga7jgb/lhYjpp4bjgZHjgabmm7TmlrBcbiAgICAgICAgdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyA9IHBvcztcbiAgICAgICAgaWYgKHBvcyAhPT0gdGhpcy5fc2Nyb2xsZXIucG9zKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9zY3JvbGxlci5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovCAqL1xuICAgIGFzeW5jIGVuc3VyZVZpc2libGUoaW5kZXg6IG51bWJlciwgb3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2l0ZW1zLCBfc2V0dGluZ3MsIF9iYXNlSGVpZ2h0IH0gPSB0aGlzO1xuXG4gICAgICAgIHZlcmlmeShfc2Nyb2xsZXIpO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IF9pdGVtcy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IGVuc3VyZVZpc2libGUoKSBbaW52YWxpZCBpbmRleDogJHt0eXBlb2YgaW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcGVyYXRpb24gPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIHBhcnRpYWxPSzogdHJ1ZSxcbiAgICAgICAgICAgIHNldFRvcDogZmFsc2UsXG4gICAgICAgICAgICBhbmltYXRlOiBfc2V0dGluZ3MuZW5hYmxlQW5pbWF0aW9uLFxuICAgICAgICAgICAgdGltZTogX3NldHRpbmdzLmFuaW1hdGlvbkR1cmF0aW9uLFxuICAgICAgICAgICAgY2FsbGJhY2s6IG5vb3AsXG4gICAgICAgIH0sIG9wdGlvbnMpIGFzIFJlcXVpcmVkPExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucz47XG5cbiAgICAgICAgY29uc3QgY3VycmVudFNjb3BlID0ge1xuICAgICAgICAgICAgZnJvbTogX3Njcm9sbGVyLnBvcyxcbiAgICAgICAgICAgIHRvOiBfc2Nyb2xsZXIucG9zICsgX2Jhc2VIZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gX2l0ZW1zW2luZGV4XTtcblxuICAgICAgICBjb25zdCB0YXJnZXRTY29wZSA9IHtcbiAgICAgICAgICAgIGZyb206IHRhcmdldC5vZmZzZXQsXG4gICAgICAgICAgICB0bzogdGFyZ2V0Lm9mZnNldCArIHRhcmdldC5oZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXNJblNjb3BlID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5wYXJ0aWFsT0spIHtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0U2NvcGUuZnJvbSA8PSBjdXJyZW50U2NvcGUuZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFNjb3BlLmZyb20gPD0gdGFyZ2V0U2NvcGUudG87XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFNjb3BlLmZyb20gPD0gY3VycmVudFNjb3BlLnRvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRTY29wZS5mcm9tIDw9IHRhcmdldFNjb3BlLmZyb20gJiYgdGFyZ2V0U2NvcGUudG8gPD0gY3VycmVudFNjb3BlLnRvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRldGVjdFBvc2l0aW9uID0gKCk6IG51bWJlciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0U2NvcGUuZnJvbSA8IGN1cnJlbnRTY29wZS5mcm9tXG4gICAgICAgICAgICAgICAgPyB0YXJnZXRTY29wZS5mcm9tXG4gICAgICAgICAgICAgICAgOiB0YXJnZXQub2Zmc2V0IC0gdGFyZ2V0LmhlaWdodCAvLyBib3R0b20g5ZCI44KP44Gb44Gv5oOF5aCx5LiN6Laz44Gr44KI44KK5LiN5Y+vXG4gICAgICAgICAgICA7XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IHBvczogbnVtYmVyO1xuICAgICAgICBpZiAob3BlcmF0aW9uLnNldFRvcCkge1xuICAgICAgICAgICAgcG9zID0gdGFyZ2V0U2NvcGUuZnJvbTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0luU2NvcGUoKSkge1xuICAgICAgICAgICAgb3BlcmF0aW9uLmNhbGxiYWNrKCk7XG4gICAgICAgICAgICByZXR1cm47IC8vIG5vb3BcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvcyA9IGRldGVjdFBvc2l0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDoo5zmraNcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAoX3Njcm9sbGVyLnBvc01heCA8IHBvcykge1xuICAgICAgICAgICAgcG9zID0gX3Njcm9sbGVyLnBvc01heDtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuc2Nyb2xsVG8ocG9zLCBvcGVyYXRpb24uYW5pbWF0ZSwgb3BlcmF0aW9uLnRpbWUpO1xuICAgICAgICBvcGVyYXRpb24uY2FsbGJhY2soKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYwgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0geyBpdGVtczogdGhpcy5faXRlbXMgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FkZEl0ZW0odGhpcy5fYmFja3VwW2tleV0uaXRlbXMpO1xuXG4gICAgICAgIGlmIChyZWJ1aWxkKSB7XG4gICAgICAgICAgICB0aGlzLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo0gKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhCAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMuX2JhY2t1cCkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrkgKi9cbiAgICBnZXQgYmFja3VwRGF0YSgpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhY2t1cDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9uKCdzY3JvbGxzdG9wJywgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+egtOajhCAqL1xuICAgIHByaXZhdGUgcmVzZXRTY3JvbGxlckNvbmRpdGlvbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub2ZmKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDml6Llrprjga4gU2Nyb2xsZXIg44Kq44OW44K444Kn44Kv44OI44Gu5L2c5oiQICovXG4gICAgcHJpdmF0ZSBjcmVhdGVTY3JvbGxlcigpOiBJTGlzdFNjcm9sbGVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzLnNjcm9sbGVyRmFjdG9yeSh0aGlzLl8kcm9vdFswXSwgdGhpcy5fc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKiDnj77lnKjjga4gUGFnZSBJbmRleCDjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldFBhZ2VJbmRleCgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2Jhc2VIZWlnaHQsIF9wYWdlcyB9ID0gdGhpcztcbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3QgeyBwb3M6IHNjcm9sbFBvcywgcG9zTWF4OiBzY3JvbGxQb3NNYXggfSA9IF9zY3JvbGxlcjtcblxuICAgICAgICBjb25zdCBzY3JvbGxNYXBTaXplID0gKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICAgICAgcmV0dXJuIGxhc3RQYWdlID8gbGFzdFBhZ2Uub2Zmc2V0ICsgbGFzdFBhZ2UuaGVpZ2h0IDogX2Jhc2VIZWlnaHQ7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgY29uc3QgcG9zID0gKCgpID0+IHtcbiAgICAgICAgICAgIGlmICgwID09PSBzY3JvbGxQb3NNYXggfHwgc2Nyb2xsUG9zTWF4IDw9IF9iYXNlSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY3JvbGxQb3MgKiBzY3JvbGxNYXBTaXplIC8gc2Nyb2xsUG9zTWF4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHZhbGlkUmFuZ2UgPSAocGFnZTogUGFnZVByb2ZpbGUpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhZ2Uub2Zmc2V0IDw9IHBvcyAmJiBwb3MgPD0gcGFnZS5vZmZzZXQgKyBwYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNhbmRpZGF0ZSA9IE1hdGguZmxvb3IocG9zIC8gX2Jhc2VIZWlnaHQpO1xuICAgICAgICBpZiAoX3BhZ2VzLmxlbmd0aCA8PSBjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgIGNhbmRpZGF0ZSA9IF9wYWdlcy5sZW5ndGggLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBhZ2UgPSBfcGFnZXNbY2FuZGlkYXRlXTtcbiAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICB9IGVsc2UgaWYgKHBvcyA8IHBhZ2Uub2Zmc2V0KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FuZGlkYXRlIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBwYWdlID0gX3BhZ2VzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYW5kaWRhdGUgKyAxLCBuID0gX3BhZ2VzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHBhZ2UgPSBfcGFnZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgZGV0ZWN0IHBhZ2UgaW5kZXguIGZhbGxiYWNrOiAke19wYWdlcy5sZW5ndGggLSAxfWApO1xuICAgICAgICByZXR1cm4gX3BhZ2VzLmxlbmd0aCAtIDE7XG4gICAgfVxuXG4gICAgLyoqIOacgOW+jOOBruODmuODvOOCuOOCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgZ2V0TGFzdFBhZ2UoKTogUGFnZVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VzW3RoaXMuX3BhZ2VzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4gqL1xuICAgIHByaXZhdGUgb25TY3JvbGwocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGludGVyc2VjdGlvblJlY3Qg44KS5L2/55So44GZ44KL5aC05ZCILCBTY3JvbGwg44OP44Oz44OJ44Op44O85YWo6Iis44Gv44Gp44GG44GC44KL44G544GN44GL6KaB5qSc6KiOXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMocG9zIC0gdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcykgPCB0aGlzLl9zZXR0aW5ncy5zY3JvbGxSZWZyZXNoRGlzdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5YGc5q2i44Kk44OZ44Oz44OIICovXG4gICAgcHJpdmF0ZSBvblNjcm9sbFN0b3AocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggIT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu44Ki44K144Kk44OzICovXG4gICAgcHJpdmF0ZSBhc3NpZ25QYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoZnJvbSk7XG5cbiAgICAgICAgY29uc3QgeyBfaXRlbXMsIF9wYWdlcywgX2Jhc2VIZWlnaHQsIF9zY3JvbGxlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgYmFzZVBhZ2UgPSB0aGlzLmdldExhc3RQYWdlKCk7XG4gICAgICAgIGNvbnN0IG5leHRJdGVtSW5kZXggPSBiYXNlUGFnZT8uZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgY29uc3QgYXNpZ25lZUl0ZW1zICA9IF9pdGVtcy5zbGljZShuZXh0SXRlbUluZGV4KTtcblxuICAgICAgICBsZXQgd29ya1BhZ2UgPSBiYXNlUGFnZTtcbiAgICAgICAgaWYgKG51bGwgPT0gd29ya1BhZ2UpIHtcbiAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3IFBhZ2VQcm9maWxlKCk7XG4gICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgYXNpZ25lZUl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoX2Jhc2VIZWlnaHQgPD0gd29ya1BhZ2UuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2UuaW5kZXggPSB3b3JrUGFnZS5pbmRleCArIDE7XG4gICAgICAgICAgICAgICAgbmV3UGFnZS5vZmZzZXQgPSB3b3JrUGFnZS5vZmZzZXQgKyB3b3JrUGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2UgPSBuZXdQYWdlO1xuICAgICAgICAgICAgICAgIF9wYWdlcy5wdXNoKHdvcmtQYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW0ucGFnZUluZGV4ID0gd29ya1BhZ2UuaW5kZXg7XG4gICAgICAgICAgICB3b3JrUGFnZS5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG5cbiAgICAgICAgX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu6Kej6ZmkICovXG4gICAgcHJpdmF0ZSBjbGVhclBhZ2UoZnJvbT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYWdlcy5zcGxpY2UoZnJvbSA/PyAwKTtcbiAgICB9XG5cbiAgICAvKiogaW5hY3RpdmUg55SoIE1hcCDjga7nlJ/miJAgKi9cbiAgICBwcml2YXRlIHByZXBhcmVJbmFjdGl2ZU1hcCgpOiBET00ge1xuICAgICAgICBjb25zdCB7IF9jb25maWcsIF8kbWFwLCBfbWFwSGVpZ2h0IH0gPSB0aGlzO1xuICAgICAgICBjb25zdCAkcGFyZW50ID0gXyRtYXAucGFyZW50KCk7XG4gICAgICAgIGxldCAkaW5hY3RpdmVNYXAgPSAkcGFyZW50LmZpbmQoX2NvbmZpZy5JTkFDVElWRV9DTEFTU19TRUxFQ1RPUik7XG5cbiAgICAgICAgaWYgKCRpbmFjdGl2ZU1hcC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBjb25zdCAkbGlzdEl0ZW1WaWV3cyA9IF8kbWFwLmNsb25lKCkuY2hpbGRyZW4oKS5maWx0ZXIoKF8sIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZGV4ID0gTnVtYmVyKCQoZWxlbWVudCkuYXR0cihfY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4IC0gMSA8PSBwYWdlSW5kZXggfHwgcGFnZUluZGV4IDw9IGN1cnJlbnRQYWdlSW5kZXggKyAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRpbmFjdGl2ZU1hcCA9ICQoYDxzZWN0aW9uIGNsYXNzPVwiJHtfY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1N9XCIgXCIke19jb25maWcuSU5BQ1RJVkVfQ0xBU1N9XCI+PC9zZWN0aW9uPmApXG4gICAgICAgICAgICAgICAgLmFwcGVuZCgkbGlzdEl0ZW1WaWV3cylcbiAgICAgICAgICAgICAgICAuaGVpZ2h0KF9tYXBIZWlnaHQpO1xuICAgICAgICAgICAgJHBhcmVudC5hcHBlbmQoJGluYWN0aXZlTWFwKTtcbiAgICAgICAgICAgIF8kbWFwLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGluYWN0aXZlTWFwO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgZG9tIGFzICQsXG4gICAgdHlwZSBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBWaWV3LFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Q29yZSB9IGZyb20gJy4vY29yZS9saXN0JztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IExpc3RDb3JlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGNsYXNzIHRoYXQgc3RvcmVzIHtAbGluayBMaXN0Vmlld30gaW5pdGlhbGl6YXRpb24gaW5mb3JtYXRpb24uXG4gKiBAamEge0BsaW5rIExpc3RWaWV3fSDjga7liJ3mnJ/ljJbmg4XloLHjgpLmoLzntI3jgZnjgovjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RDb250ZXh0T3B0aW9ucywgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgICRlbD86IERPTTxURWxlbWVudD47XG4gICAgaW5pdGlhbEhlaWdodD86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBAZW4gVmlydHVhbCBsaXN0IHZpZXcgY2xhc3MgdGhhdCBwcm92aWRlcyBtZW1vcnkgbWFuYWdlbWVudCBmdW5jdGlvbmFsaXR5LlxuICogQGphIOODoeODouODqueuoeeQhuapn+iDveOCkuaPkOS+m+OBmeOCi+S7ruaDs+ODquOCueODiOODk+ODpeODvOOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJTGlzdFZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3Qgb3B0ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiBuZXcgTGlzdENvcmUob3B0KSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcblxuICAgICAgICB0aGlzLnNldEVsZW1lbnQoKG9wdC4kZWwgPz8gdGhpcy4kZWwpIGFzIERPTVNlbGVjdG9yPFRFbGVtZW50Pik7XG4gICAgICAgIGlmIChvcHQuaW5pdGlhbEhlaWdodCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRCYXNlSGVpZ2h0KG9wdC5pbml0aWFsSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBjb250ZXh0IGFjY2Vzc29yICovXG4gICAgZ2V0IGNvbnRleHQoKTogSUxpc3RDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gVmlldyBjb21wb25lbnQgbWV0aG9kczpcblxuICAgIC8qKiBgdGhpcy5lbGAg5pu05paw5pmC44Gu5paw44GX44GEIEhUTUwg44KS44Os44Oz44OA44Oq44Oz44Kw44Ot44K444OD44Kv44Gu5a6f6KOF6Zai5pWwLiDjg6Ljg4fjg6vmm7TmlrDjgaggVmlldyDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLpgKPli5XjgZXjgZvjgosuICovXG4gICAgYWJzdHJhY3QgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gQ2hhbmdlIHRoZSB2aWV3J3MgZWxlbWVudCAoYHRoaXMuZWxgIHByb3BlcnR5KSBhbmQgcmUtZGVsZWdhdGUgdGhlIHZpZXcncyBldmVudHMgb24gdGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBqYSBWaWV3IOOBjOeuoei9hOOBmeOCi+imgee0oCAoYHRoaXMuZWxgIHByb3BlcnR5KSDjga7lpInmm7QuIOOCpOODmeODs+ODiOWGjeioreWumuOCguWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsXG4gICAgICogIC0gYGVuYCBPYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OI44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgc2V0RWxlbWVudChlbDogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzW19wcm9wZXJ0aWVzXSkge1xuICAgICAgICAgICAgY29uc3QgeyBjb250ZXh0IH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgY29udGV4dC5kZXN0cm95KCk7XG4gICAgICAgICAgICBjb250ZXh0LmluaXRpYWxpemUoJGVsIGFzIERPTTxOb2RlPiBhcyBET00sICRlbC5oZWlnaHQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLnNldEVsZW1lbnQoZWwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBSZW1vdmUgdGhpcyB2aWV3IGJ5IHRha2luZyB0aGUgZWxlbWVudCBvdXQgb2YgdGhlIERPTSB3aXRoIHJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEgVmlldyDjgYvjgokgRE9NIOOCkuWIh+OCiumbouOBlywg44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmRlc3Ryb3koKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnJlbW92ZSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0T3BlcmF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgaXQgaGFzIGJlZW4gaW5pdGlhbGl6ZWQuXG4gICAgICogQGphIOWIneacn+WMlua4iOOBv+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGluaXRpYWxpemVkIC8gZmFsc2U6IHVuaW5pdGlhbGl6ZWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOWIneacn+WMlua4iOOBvyAvIGZhbHNlOiDmnKrliJ3mnJ/ljJZcbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0luaXRpYWxpemVkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSBpdGVtIOeZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIGFkZEl0ZW0oaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIGluZm86IFVua25vd25PYmplY3QsIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2FkZEl0ZW0obmV3IEl0ZW1Qcm9maWxlKHRoaXMuY29udGV4dCwgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgaW5mbyksIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24gKGludGVybmFsIHVzZSkuXG4gICAgICogQGphIGl0ZW0g55m76YyyICjlhoXpg6jnlKgpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAqICAtIGBlbmAge0BsaW5rIEl0ZW1Qcm9maWxlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5fYWRkSXRlbShpdGVtLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbmRleCB0byBzdGFydCByZWxlYXNpbmdcbiAgICAgKiAgLSBgamFgIOino+mZpOmWi+Wni+OBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzaXplXG4gICAgICogIC0gYGVuYCB0b3RhbCBudW1iZXIgb2YgaXRlbXMgdG8gcmVsZWFzZVxuICAgICAqICAtIGBqYWAg6Kej6Zmk44GZ44KLIGl0ZW0g44Gu57eP5pWwIFtkZWZhdWx0OiAxXVxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciwgc2l6ZT86IG51bWJlciwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRhcmdldCBpbmRleCBhcnJheS4gaXQgaXMgbW9yZSBlZmZpY2llbnQgdG8gc3BlY2lmeSByZXZlcnNlIGluZGV4LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Kk44Oz44OH44OD44Kv44K56YWN5YiX44KS5oyH5a6aLiByZXZlcnNlIGluZGV4IOOCkuaMh+WumuOBmeOCi+OBu+OBhuOBjOWKueeOh+eahFxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIgfCBudW1iZXJbXSwgYXJnMj86IG51bWJlciwgYXJnMz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbW92ZUl0ZW0oaW5kZXggYXMgbnVtYmVyLCBhcmcyLCBhcmczKTsgLy8gYXZvaWQgdHMoMjM0NSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbmZvcm1hdGlvbiBzZXQgZm9yIHRoZSBzcGVjaWZpZWQgaXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBpZGVudGlmaWVyIFtpbmRleCB8IGV2ZW50IG9iamVjdF1cbiAgICAgKiAgLSBgamFgIOitmOWIpeWtkC4gW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqL1xuICAgIGdldEl0ZW1JbmZvKHRhcmdldDogbnVtYmVyIHwgRXZlbnQpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0SXRlbUluZm8odGFyZ2V0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCBhY3RpdmUgcGFnZXMuXG4gICAgICogQGphIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsFxuICAgICAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQnVpbGQgdW5hc3NpZ25lZCBwYWdlcy5cbiAgICAgKiBAamEg5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JXG4gICAgICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVidWlsZCBwYWdlIGFzc2lnbm1lbnRzLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgqLjgrXjgqTjg7PjgpLlho3mp4vmiJBcbiAgICAgKi9cbiAgICByZWJ1aWxkKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIERlc3Ryb3kgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg566h6L2E44OH44O844K/44KS56C05qOEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZWxlYXNlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAgLyoqXG4gICAgICogQGVuIEdldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zO1xuICAgIH1cblxuICAgICAvKipcbiAgICAgICogQGVuIEdldCBtYXhpbXVtIHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+l1xuICAgICAgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFBvc01heDtcbiAgICB9XG5cbiAgICAgLyoqXG4gICAgICogQGVuIFNjcm9sbCBldmVudCBoYW5kbGVyIHNldHRpbmcvY2FuY2VsbGF0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44O86Zai5pWwXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb246IHNldHRpbmcgLyBvZmY6IGNhbmNlbGluZ1xuICAgICAqICAtIGBqYWAgb246IOioreWumiAvIG9mZjog6Kej6ZmkXG4gICAgICovXG4gICAgc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dGluZy9jYW5jZWxsaW5nIHNjcm9sbCBzdG9wIGV2ZW50IGhhbmRsZXIuXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXIsIG1ldGhvZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc1xuICAgICAqICAtIGBlbmAgbmV3IHNjcm9sbCBwb3NpdGlvbiB2YWx1ZSBbMCAtIHBvc01heF1cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiBbMCAtIHBvc01heF1cbiAgICAgKiBAcGFyYW0gYW5pbWF0ZVxuICAgICAqICAtIGBlbmAgZW5hYmxlL2Rpc2FibGUgYW5pbWF0aW9uXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7mnInnhKFcbiAgICAgKiBAcGFyYW0gdGltZVxuICAgICAqICAtIGBlbmAgdGltZSBzcGVudCBvbiBhbmltYXRpb24gW21zZWNdXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVuc3VyZSB2aXNpYmlsaXR5IG9mIGl0ZW0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGluZGV4IG9mIGl0ZW1cbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBlbnN1cmVWaXNpYmxlKGluZGV4OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZW5zdXJlVmlzaWJsZShpbmRleCwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIGJhY2t1cCBkYXRhIGV4aXN0cy5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cyAvIGZhbHNlOiBub3QgZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIkgLyBmYWxzZTog54ShXG4gICAgICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEaXNjYXJkIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZGlzY2FyZCBleGlzdGluZyBkYXRhIC8gZmFsc2U6IHNwZWNpZmllZCBkYXRhIGRvZXMgbm90IGV4aXN0XG4gICAgICogIC0gYGphYCB0cnVlOiDlrZjlnKjjgZfjgZ/jg4fjg7zjgr/jgpLnoLTmo4QgLyBmYWxzZTog5oyH5a6a44GV44KM44Gf44OH44O844K/44Gv5a2Y5Zyo44GX44Gq44GEXG4gICAgICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGJhY2t1cERhdGEoKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmJhY2t1cERhdGE7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdFZpZXcgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IHsgdHlwZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBMaXN0SXRlbVZpZXcgfSBmcm9tICcuL2xpc3QtaXRlbS12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIEV4cGFuZGFibGVMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RJdGVtVmlld30g5qeL56+J44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhwYW5kYWJsZUxpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIG93bmVyOiBJRXhwYW5kYWJsZUxpc3RWaWV3O1xuICAgIC8qKiB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8qKlxuICogQGVuIExpc3QgaXRlbSBjb250YWluZXIgY2xhc3MgaGFuZGxlZCBieSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSDjgYzmibHjgYbjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgrPjg7Pjg4bjg4rjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0SXRlbVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlldzxURWxlbWVudCwgVEV2ZW50PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHsgZ3JvdXAgfSA9IG9wdGlvbnM7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0geyBncm91cCB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cy5cbiAgICAgKiBAamEg5bGV6ZaL54q25oWL44KS5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhwYW5kZWQsIGNvbGxhcHNlZDogY2xvc2VcbiAgICAgKiAgLSBgamFgIHRydWU6IOWxlemWiywgZmFsc2U6IOWPjuadn1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmdyb3VwLmlzRXhwYW5kZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcuXG4gICAgICogQGphIOWxlemWi+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc0V4cGFuZGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOWPjuadn+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc1N3aXRjaGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIGlmIGl0IGhhcyBhIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9LiA8YnI+XG4gICAgICogICAgIElmIGBsYXlvdXRLZXlgIGlzIHNwZWNpZmllZCwgd2hldGhlciB0aGUgbGF5b3V0IGluZm9ybWF0aW9uIG1hdGNoZXMgaXMgYWxzbyBhZGRlZCB0byB0aGUganVkZ21lbnQgY29uZGl0aW9uLlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aIDxicj5cbiAgICAgKiAgICAgYGxheW91dEtleWAg44GM5oyH5a6a44GV44KM44KM44Gw44CBbGF5b3V0IOaDheWgseOBjOS4gOiHtOOBl+OBpuOBhOOCi+OBi+OCguWIpOWumuadoeS7tuOBq+WKoOOBiOOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIGxheW91dEtleVxuICAgICAqICAtIGBlbmAgaWRlbnRpZmllciBmb3IgZWFjaCBsYXlvdXRcbiAgICAgKiAgLSBgamFgIOODrOOCpOOCouOCpuODiOavjuOBruitmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGhhc0NoaWxkcmVuKGxheW91dEtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uZ3JvdXAuaGFzQ2hpbGRyZW4obGF5b3V0S2V5KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB0eXBlIFVua25vd25PYmplY3QsIGx1aWQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIElFeHBhbmRPcGVyYXRpb24sXG4gICAgSUxpc3RMYXlvdXRLZXlIb2xkZXIsXG4gICAgSUxpc3RTdGF0dXNNYW5hZ2VyLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSxcbiAgICBJRXhwYW5kYWJsZUxpc3RDb250ZXh0LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4uL3Byb2ZpbGUnO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIENvcmUgbG9naWMgaW1wbGVtZW50YXRpb24gY2xhc3MgdGhhdCBtYW5hZ2VzIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgc3RhdGUuXG4gKiBAamEg6ZaL6ZaJ54q25oWL566h55CG44KS6KGM44GG44Kz44Ki44Ot44K444OD44Kv5a6f6KOF44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBFeHBhbmRDb3JlIGltcGxlbWVudHNcbiAgICBJRXhwYW5kT3BlcmF0aW9uLFxuICAgIElMaXN0TGF5b3V0S2V5SG9sZGVyLFxuICAgIElMaXN0U3RhdHVzTWFuYWdlcixcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQ7XG5cbiAgICAvLyBUT0RPOiBvd25lciDjgajjga7lkITjg4fjg7zjgr/jga7miYDmnInmqKnjga7opovnm7TjgZcgKGJhY2t1cERhdGE/KVxuICAgIC8qKiB7IGlkOiBHcm91cFByb2ZpbGUgfSAqL1xuICAgIHByaXZhdGUgX21hcEdyb3VwczogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPiA9IHt9O1xuICAgIC8qKiDnrKwx6ZqO5bGkIEdyb3VwUHJvZmlsZSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIF9hcnlUb3BHcm91cHM6IEdyb3VwUHJvZmlsZVtdID0gW107XG4gICAgLyoqIGxheW91dEtleSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIF9sYXlvdXRLZXk/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSBvd25lciDopqogVmlldyDjga7jgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCkge1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgIH1cblxuICAgIC8qKiDjg4fjg7zjgr/jgpLnoLTmo4QgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fbWFwR3JvdXBzID0ge307XG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3VwcyA9IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRPcGVyYXRpb25cblxuICAgIC8qKiDmlrDopo8gR3JvdXBQcm9maWxlIOOCkuS9nOaIkCAqL1xuICAgIG5ld0dyb3VwKGlkPzogc3RyaW5nKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgaWQgPSBpZCA/PyBsdWlkKCdsaXN0LWdyb3VwJywgNCk7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX21hcEdyb3Vwc1tpZF0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tYXBHcm91cHNbaWRdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGdyb3VwID0gbmV3IEdyb3VwUHJvZmlsZSh0aGlzLl9vd25lciwgaWQpO1xuICAgICAgICB0aGlzLl9tYXBHcm91cHNbaWRdID0gZ3JvdXA7XG4gICAgICAgIHJldHVybiBncm91cDtcbiAgICB9XG5cbiAgICAvKiog55m76Yyy5riI44G/IEdyb3VwIOOCkuWPluW+lyAqL1xuICAgIGdldEdyb3VwKGlkOiBzdHJpbmcpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFwR3JvdXBzW2lkXTtcbiAgICB9XG5cbiAgICAvKiog56ysMemajuWxpOOBriBHcm91cCDnmbvpjLIgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgLy8g44GZ44Gn44Gr55m76Yyy5riI44G/44Gu5aC05ZCI44GvIHJlc3RvcmUg44GX44GmIGxheW91dCDjgq3jg7zjgZTjgajjgavlvqnlhYPjgZnjgovjgIJcbiAgICAgICAgaWYgKCdyZWdpc3RlcmVkJyA9PT0gdG9wR3JvdXAuc3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBvcmllbnRhdGlvbiBjaGFuZ2VkIOaZguOBriBsYXlvdXQg44Kt44O85aSJ5pu05a++5b+c44Gg44GM44CB44Kt44O844Gr5aSJ5pu044GM54Sh44GE44Go44GN44Gv5LiN5YW35ZCI44Go44Gq44KL44CCXG4gICAgICAgICAgICAvLyDjgZPjga4gQVBJIOOBq+Wun+ijheOBjOW/heimgeOBi+OCguWQq+OCgeOBpuimi+ebtOOBl+OBjOW/heimgVxuICAgICAgICAgICAgdG9wR3JvdXAucmVzdG9yZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGFzdEdyb3VwID0gdGhpcy5fYXJ5VG9wR3JvdXBzW3RoaXMuX2FyeVRvcEdyb3Vwcy5sZW5ndGggLSAxXTtcbiAgICAgICAgY29uc3QgaW5zZXJ0VG8gPSBsYXN0R3JvdXA/LmdldE5leHRJdGVtSW5kZXgodHJ1ZSkgPz8gMDtcblxuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMucHVzaCh0b3BHcm91cCk7XG4gICAgICAgIHRvcEdyb3VwLnJlZ2lzdGVyKGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiog56ysMemajuWxpOOBriBHcm91cCDjgpLlj5blvpcgKi9cbiAgICBnZXRUb3BHcm91cHMoKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJ5VG9wR3JvdXBzLnNsaWNlKDApO1xuICAgIH1cblxuICAgIC8qKiDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpICovXG4gICAgYXN5bmMgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNpZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgcHJvbWlzaWVzLnB1c2goZ3JvdXAuZXhwYW5kKCkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2llcyk7XG4gICAgfVxuXG4gICAgLyoqIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWPjuadnyAoMemajuWxpCkgKi9cbiAgICBhc3luYyBjb2xsYXBzZUFsbChkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNpZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgcHJvbWlzaWVzLnB1c2goZ3JvdXAuY29sbGFwc2UoZGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNpZXMpO1xuICAgIH1cblxuICAgIC8qKiDlsZXplovkuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5pc1N0YXR1c0luKCdleHBhbmRpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog5Y+O5p2f5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLmlzU3RhdHVzSW4oJ2NvbGxhcHNpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog6ZaL6ZaJ5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0V4cGFuZGluZyB8fCB0aGlzLmlzQ29sbGFwc2luZztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdExheW91dEtleUhvbGRlclxuXG4gICAgLyoqIGxheW91dCBrZXkg44KS5Y+W5b6XICovXG4gICAgZ2V0IGxheW91dEtleSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGF5b3V0S2V5O1xuICAgIH1cblxuICAgIC8qKiBsYXlvdXQga2V5IOOCkuioreWumiAqL1xuICAgIHNldCBsYXlvdXRLZXkoa2V5OiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fbGF5b3V0S2V5ID0ga2V5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U3RhdHVzTWFuYWdlclxuXG4gICAgLyoqIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiCAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5zdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiog54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5zdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqIOWHpueQhuOCueOCs+ODvOODl+avjuOBq+eKtuaFi+WkieaVsOOCkuioreWumiAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKHN0YXR1cywgZXhlY3V0b3IpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo0gKi9cbiAgICBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5pc1N0YXR1c0luKHN0YXR1cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44OQ44OD44Kv44Ki44OD44OXICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IF9iYWNrdXAgPSB0aGlzLmJhY2t1cERhdGE7XG4gICAgICAgIGlmIChudWxsID09IF9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgX2JhY2t1cFtrZXldID0ge1xuICAgICAgICAgICAgICAgIG1hcDogdGhpcy5fbWFwR3JvdXBzLFxuICAgICAgICAgICAgICAgIHRvcHM6IHRoaXMuX2FyeVRvcEdyb3VwcyxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OCkuODquOCueODiOOCoiAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGJhY2t1cCA9IHRoaXMuYmFja3VwRGF0YVtrZXldIGFzIFVua25vd25PYmplY3Q7XG4gICAgICAgIGlmIChudWxsID09IGJhY2t1cCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCB0aGlzLl9hcnlUb3BHcm91cHMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX21hcEdyb3VwcyA9IGJhY2t1cC5tYXAgYXMgUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gYmFja3VwLnRvcHMgYXMgR3JvdXBQcm9maWxlW107XG5cbiAgICAgICAgLy8gbGF5b3V0IOaDheWgseOBrueiuuiqjVxuICAgICAgICBpZiAoIXRoaXMuX2FyeVRvcEdyb3Vwc1swXT8uaGFzTGF5b3V0S2V5T2YodGhpcy5sYXlvdXRLZXkhKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5bGV6ZaL44GX44Gm44GE44KL44KC44Gu44KS55m76YyyXG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBncm91cC5yZXN0b3JlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlho3mp4vnr4njga7kuojntIRcbiAgICAgICAgcmVidWlsZCAmJiB0aGlzLl9vd25lci5yZWJ1aWxkKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKEgKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuSAqL1xuICAgIGdldCBiYWNrdXBEYXRhKCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3duZXIuYmFja3VwRGF0YTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgc3RhdHVzQWRkUmVmLFxuICAgIHN0YXR1c1JlbGVhc2UsXG4gICAgc3RhdHVzU2NvcGUsXG4gICAgaXNTdGF0dXNJbixcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0VmlldyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFeHBhbmRDb3JlIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB0eXBlIHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcbmltcG9ydCB7IHR5cGUgTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zLCBMaXN0VmlldyB9IGZyb20gJy4vbGlzdC12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IEV4cGFuZENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBWaXJ0dWFsIGxpc3QgdmlldyBjbGFzcyB3aXRoIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDplovplonmqZ/og73jgpLlgpnjgYjjgZ/ku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0VmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgTGlzdFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJRXhwYW5kYWJsZUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBFeHBhbmRDb3JlKHRoaXMpLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRhYmxlTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcge0BsaW5rIEdyb3VwUHJvZmlsZX0uIFJldHVybiB0aGUgb2JqZWN0IGlmIGl0IGlzIGFscmVhZHkgcmVnaXN0ZXJlZC5cbiAgICAgKiBAamEg5paw6KaPIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuS9nOaIkC4g55m76Yyy5riI44G/44Gu5aC05ZCI44Gv44Gd44Gu44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIG5ld2x5IGNyZWF0ZWQgZ3JvdXAgaWQuIGlmIG5vdCBzcGVjaWZpZWQsIGF1dG9tYXRpYyBhbGxvY2F0aW9uIHdpbGwgYmUgcGVyZm9ybWVkLlxuICAgICAqICAtIGBqYWAg5paw6KaP44Gr5L2c5oiQ44GZ44KLIEdyb3VwIElEIOOCkuaMh+Wumi4g5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv6Ieq5YuV5Ymy44KK5oyv44KKXG4gICAgICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5uZXdHcm91cChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCByZWdpc3RlcmVkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDnmbvpjLLmuIjjgb8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIEdyb3VwIElEIHRvIHJldHJpZXZlXG4gICAgICogIC0gYGphYCDlj5blvpfjgZnjgosgR3JvdXAgSUQg44KS5oyH5a6aXG4gICAgICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEdyb3VwKGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gMXN0IGxheWVyIHtAbGluayBHcm91cFByb2ZpbGV9IHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEg56ysMemajuWxpOOBriB7QGxpbmsgR3JvdXBQcm9maWxlfSDnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b3BHcm91cFxuICAgICAqICAtIGBlbmAgY29uc3RydWN0ZWQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIOani+eviea4iOOBvyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IDFzdCBsYXllciB7QGxpbmsgR3JvdXBQcm9maWxlfS4gPGJyPlxuICAgICAqICAgICBBIGNvcHkgYXJyYXkgaXMgcmV0dXJuZWQsIHNvIHRoZSBjbGllbnQgY2Fubm90IGNhY2hlIGl0LlxuICAgICAqIEBqYSDnrKwx6ZqO5bGk44GuIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+lyA8YnI+XG4gICAgICogICAgIOOCs+ODlOODvOmFjeWIl+OBjOi/lOOBleOCjOOCi+OBn+OCgeOAgeOCr+ODqeOCpOOCouODs+ODiOOBr+OCreODo+ODg+OCt+ODpeS4jeWPr1xuICAgICAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldFRvcEdyb3VwcygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHBhbmQgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpXG4gICAgICovXG4gICAgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5leHBhbmRBbGwoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29sbGFwc2UgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlj47mnZ8gKDHpmo7lsaQpXG4gICAgICovXG4gICAgY29sbGFwc2VBbGwoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY29sbGFwc2VBbGwoZGVsYXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nLlxuICAgICAqIEBqYSDlsZXplovkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzRXhwYW5kaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgY29sbGFwc2luZy5cbiAgICAgKiBAamEg5Y+O5p2f5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNTd2l0Y2hpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICAgICAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICAgICAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gICAgICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gICAgICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN0YXRlIHZhcmlhYmxlIG1hbmFnZW1lbnQgc2NvcGVcbiAgICAgKiBAamEg54q25oWL5aSJ5pWw566h55CG44K544Kz44O844OXXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dmFsIG9mIHNlZWQgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDlr77osaHjga7plqLmlbDjga7miLvjgorlgKRcbiAgICAgKi9cbiAgICBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZywgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBzdGF0dXNTY29wZShzdGF0dXMsIGV4ZWN1dG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgaWYgaXQncyBpbiB0aGUgc3BlY2lmaWVkIHN0YXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWU6IOeKtuaFi+WGhSAvIGZhbHNlOiDnirbmhYvlpJZcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgOiB3aXRoaW4gdGhlIHN0YXR1cyAvIGBmYWxzZWA6IG91dCBvZiB0aGUgc3RhdHVzXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOeKtuaFi+WGhSAvIGBmYWxzZWA6IOeKtuaFi+WkllxuICAgICAqL1xuICAgIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGlzU3RhdHVzSW4oc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGxheW91dCBrZXkg44KS5Y+W5b6XICovXG4gICAgZ2V0IGxheW91dEtleSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5sYXlvdXRLZXk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBsYXlvdXQga2V5IOOCkuioreWumiAqL1xuICAgIHNldCBsYXlvdXRLZXkoa2V5OiBzdHJpbmcpIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5sYXlvdXRLZXkgPSBrZXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IExpc3RWaWV3XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRGVzdHJveSBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4RcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICBzdXBlci5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVsZWFzZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBvdmVycmlkZSBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlc3RvcmUoa2V5LCByZWJ1aWxkKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgJy4vcmVzdWx0LWNvZGUtZGVmcyc7XG5leHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0ICogZnJvbSAnLi9nbG9iYWwtY29uZmlnJztcbmV4cG9ydCAqIGZyb20gJy4vcHJvZmlsZSc7XG5leHBvcnQgKiBmcm9tICcuL2xpc3QtaXRlbS12aWV3JztcbmV4cG9ydCAqIGZyb20gJy4vbGlzdC12aWV3JztcbmV4cG9ydCAqIGZyb20gJy4vZXhwYW5kYWJsZS1saXN0LWl0ZW0tdmlldyc7XG5leHBvcnQgKiBmcm9tICcuL2V4cGFuZGFibGUtbGlzdC12aWV3JztcblxuLy8gVE9ETzogdGVzdFxuZXhwb3J0IGNvbnN0IFVJX0xJU1RWSUVXX1NUQVRVUyA9ICdVTkRFUiBDT05TVFJVQ1RJT04nO1xuIl0sIm5hbWVzIjpbIiQiLCJnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMiLCJhdCIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInRvSGVscFN0cmluZyIsIl9wcm9wZXJ0aWVzIiwiVmlldyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJjbGVhclRyYW5zaXRpb24iLCJzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uIiwicG9zdCIsIm5vb3AiLCJsdWlkIiwic3RhdHVzQWRkUmVmIiwic3RhdHVzUmVsZWFzZSIsInN0YXR1c1Njb3BlIiwiaXNTdGF0dXNJbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUxELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEscUJBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxxQkFBOEMsQ0FBQTtZQUM5QyxXQUEyQyxDQUFBLFdBQUEsQ0FBQSwwQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEscUNBQThCLENBQUMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFBLEdBQUEsMENBQUEsQ0FBQTtZQUM1SixXQUEyQyxDQUFBLFdBQUEsQ0FBQSxpQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEscUNBQThCLENBQUMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFBLEdBQUEsaUNBQUEsQ0FBQTtZQUN2SixXQUEyQyxDQUFBLFdBQUEsQ0FBQSxxQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEscUNBQThCLENBQUMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFBLEdBQUEscUNBQUEsQ0FBQTtJQUN2SixLQUFDLEdBQUEsQ0FBQTtJQUNMLENBQUMsR0FBQTs7SUNZRCxNQUFNLE9BQU8sR0FBRztJQUNaLElBQUEsU0FBUyxFQUFvQixRQUFBO0lBQzdCLElBQUEsZ0JBQWdCLEVBQTJCLDRCQUFBO0lBQzNDLElBQUEsbUJBQW1CLEVBQThCLDZCQUFBO0lBQ2pELElBQUEsY0FBYyxFQUF5QixVQUFBO0lBQ3ZDLElBQUEsdUJBQXVCLEVBQWtDLFdBQUE7SUFDekQsSUFBQSxhQUFhLEVBQXdCLHlCQUFBO0lBQ3JDLElBQUEsc0JBQXNCLEVBQWlDLDBCQUFBO0lBQ3ZELElBQUEsbUJBQW1CLEVBQThCLDJCQUFBO0lBQ2pELElBQUEsNEJBQTRCLEVBQXVDLDRCQUFBO0lBQ25FLElBQUEsZUFBZSxFQUEwQixpQkFBQTtJQUN6QyxJQUFBLGVBQWUsRUFBMEIsaUJBQUE7S0FDNUMsQ0FBQztJQUVGOzs7SUFHRztBQUNVLFVBQUEsb0JBQW9CLEdBQUcsQ0FBQyxTQUF5QyxLQUEwQjtRQUNwRyxJQUFJLFNBQVMsRUFBRTtZQUNYLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtJQUN0QyxZQUFBLElBQUksU0FBUyxLQUFLLFNBQVMsQ0FBQyxHQUFpQyxDQUFDLEVBQUU7SUFDNUQsZ0JBQUEsT0FBTyxTQUFTLENBQUMsR0FBaUMsQ0FBQyxDQUFDO2lCQUN2RDthQUNKO1NBQ0o7UUFDRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNqRDs7SUM5Q0E7OztJQUdHO1VBQ1UsV0FBVyxDQUFBOztJQUVILElBQUEsTUFBTSxDQUFlOztJQUU5QixJQUFBLE9BQU8sQ0FBUzs7SUFFUCxJQUFBLFlBQVksQ0FBMkI7O0lBRXZDLElBQUEsS0FBSyxDQUFnQjs7UUFFOUIsTUFBTSxHQUFHLENBQUMsQ0FBQzs7UUFFWCxVQUFVLEdBQUcsQ0FBQyxDQUFDOztRQUVmLE9BQU8sR0FBRyxDQUFDLENBQUM7O0lBRVosSUFBQSxNQUFNLENBQU87O0lBRWIsSUFBQSxTQUFTLENBQWlCO0lBRWxDOzs7Ozs7Ozs7Ozs7Ozs7SUFlRztJQUNILElBQUEsV0FBQSxDQUFZLEtBQW1CLEVBQUUsTUFBYyxFQUFFLFdBQXFDLEVBQUUsS0FBb0IsRUFBQTtJQUN4RyxRQUFBLElBQUksQ0FBQyxNQUFNLEdBQVMsS0FBSyxDQUFDO0lBQzFCLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBUSxNQUFNLENBQUM7SUFDM0IsUUFBQSxJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQztJQUNoQyxRQUFBLElBQUksQ0FBQyxLQUFLLEdBQVUsS0FBSyxDQUFDO1NBQzdCOzs7O0lBTUQsSUFBQSxJQUFJLE1BQU0sR0FBQTtZQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztTQUN2Qjs7SUFHRCxJQUFBLElBQUksS0FBSyxHQUFBO1lBQ0wsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1NBQ3RCOztRQUdELElBQUksS0FBSyxDQUFDLEtBQWEsRUFBQTtJQUNuQixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQ3BCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUN0Qjs7SUFHRCxJQUFBLElBQUksU0FBUyxHQUFBO1lBQ1QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1NBQzFCOztRQUdELElBQUksU0FBUyxDQUFDLEtBQWEsRUFBQTtJQUN2QixRQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztTQUMxQjs7SUFHRCxJQUFBLElBQUksTUFBTSxHQUFBO1lBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1NBQ3ZCOztRQUdELElBQUksTUFBTSxDQUFDLE1BQWMsRUFBQTtJQUNyQixRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUN2Qjs7SUFHRCxJQUFBLElBQUksSUFBSSxHQUFBO1lBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ3JCOzs7SUFLRDs7O0lBR0c7UUFDSSxRQUFRLEdBQUE7SUFDWCxRQUFBLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7SUFDeEIsWUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNwQixZQUFBLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7b0JBQzFCLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDZixLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU07SUFDbEIsZ0JBQUEsSUFBSSxFQUFFLElBQUk7SUFDYixhQUFBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtvQkFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUN2QzthQUNKO1lBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3ZCLFFBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLFNBQVMsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQzVDO1NBQ0o7SUFFRDs7O0lBR0c7UUFDSSxJQUFJLEdBQUE7SUFDUCxRQUFBLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUNuQjtJQUNELFFBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzNDO1NBQ0o7SUFFRDs7O0lBR0c7UUFDSSxVQUFVLEdBQUE7SUFDYixRQUFBLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7SUFDeEIsWUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3hCLFlBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwQyxZQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO2FBQzNCO1NBQ0o7SUFFRDs7O0lBR0c7UUFDSSxPQUFPLEdBQUE7SUFDVixRQUFBLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7SUFDeEIsWUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQzNCO1NBQ0o7SUFFRDs7O0lBR0c7UUFDSSxRQUFRLEdBQUE7SUFDWCxRQUFBLE9BQU8sSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUM7U0FDakM7SUFFRDs7O0lBR0c7UUFDSSxZQUFZLENBQUMsU0FBaUIsRUFBRSxPQUFxQyxFQUFBO0lBQ3hFLFFBQUEsTUFBTSxLQUFLLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDdkMsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztJQUN6QixRQUFBLElBQUksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDekMsUUFBQSxJQUFJLE9BQU8sRUFBRSxVQUFVLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUMzQztTQUNKO0lBRUQ7OztJQUdHO1FBQ0ksVUFBVSxHQUFBO0lBQ2IsUUFBQSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0lBQ3hCLFlBQUEsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQzlEO1NBQ0o7Ozs7SUFNRCxJQUFBLElBQVksT0FBTyxHQUFBO1lBQ2YsT0FBTyxvQkFBb0IsRUFBRSxDQUFDO1NBQ2pDOztRQUdPLGtCQUFrQixHQUFBO0lBQ3RCLFFBQUEsSUFBSSxLQUFVLENBQUM7WUFDZixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDM0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0lBRXBELFFBQUEsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtJQUNyQixZQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztnQkFDekMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO2FBQ3RCO0lBRUQsUUFBQSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUNyQixLQUFLLEdBQUcsUUFBUSxDQUFDO0lBQ2pCLFlBQUEsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDNUIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2FBQ2pEO2lCQUFNOztJQUVILFlBQUEsS0FBSyxHQUFHQSxXQUFDLENBQUMsQ0FBQSxDQUFBLEVBQUksV0FBVyxDQUFXLFFBQUEsRUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFBLEtBQUEsRUFBUSxXQUFXLENBQUEsRUFBQSxDQUFJLENBQUMsQ0FBQztJQUM3RixZQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDeEM7O1lBR0QsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRTtJQUNqQyxZQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQzlCO0lBRUQsUUFBQSxPQUFPLEtBQUssQ0FBQztTQUNoQjs7UUFHTyxXQUFXLEdBQUE7WUFDZixJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQ3ZGLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQy9EO1NBQ0o7O1FBR08sZUFBZSxHQUFBO1lBQ25CLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7SUFDM0YsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDbkU7U0FDSjs7UUFHTyxZQUFZLEdBQUE7SUFDaEIsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDZCxPQUFPO2FBQ1Y7WUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFO0lBQzNDLFlBQUEsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHQyxnQ0FBd0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEUsWUFBQSxJQUFJLFVBQVUsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFO0lBQzdCLGdCQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFBLGNBQUEsRUFBaUIsSUFBSSxDQUFDLE9BQU8sQ0FBQSxJQUFBLENBQU0sQ0FBQyxDQUFDO2lCQUNyRTthQUNKO2lCQUFNO0lBQ0gsWUFBQSxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDakQsWUFBQSxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFO0lBQ3RCLGdCQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFBLEVBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQSxFQUFBLENBQUksQ0FBQyxDQUFDO2lCQUMvQzthQUNKO1NBQ0o7SUFDSjs7SUM5UUQ7OztJQUdHO1VBQ1UsV0FBVyxDQUFBOztRQUVaLE1BQU0sR0FBRyxDQUFDLENBQUM7O1FBRVgsT0FBTyxHQUFHLENBQUMsQ0FBQzs7UUFFWixPQUFPLEdBQUcsQ0FBQyxDQUFDOztRQUVaLE1BQU0sR0FBa0IsRUFBRSxDQUFDOztRQUUzQixPQUFPLEdBQXFDLFVBQVUsQ0FBQzs7OztJQU0vRCxJQUFBLElBQUksS0FBSyxHQUFBO1lBQ0wsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1NBQ3RCOztRQUdELElBQUksS0FBSyxDQUFDLEtBQWEsRUFBQTtJQUNuQixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1NBQ3ZCOztJQUdELElBQUEsSUFBSSxNQUFNLEdBQUE7WUFDTixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDdkI7O1FBR0QsSUFBSSxNQUFNLENBQUMsTUFBYyxFQUFBO0lBQ3JCLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7U0FDekI7O0lBR0QsSUFBQSxJQUFJLE1BQU0sR0FBQTtZQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztTQUN2Qjs7SUFHRCxJQUFBLElBQUksTUFBTSxHQUFBO1lBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1NBQ3ZCOzs7SUFLRDs7O0lBR0c7UUFDSSxRQUFRLEdBQUE7SUFDWCxRQUFBLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDM0IsWUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQzVCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztpQkFDbkI7YUFDSjtJQUNELFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7U0FDM0I7SUFFRDs7O0lBR0c7UUFDSSxJQUFJLEdBQUE7SUFDUCxRQUFBLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDM0IsWUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQzVCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztpQkFDZjthQUNKO0lBQ0QsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQztTQUMzQjtJQUVEOzs7SUFHRztRQUNJLFVBQVUsR0FBQTtJQUNiLFFBQUEsSUFBSSxVQUFVLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRTtJQUM3QixZQUFBLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDNUIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2lCQUNyQjthQUNKO0lBQ0QsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztTQUM3QjtJQUVEOzs7SUFHRztJQUNJLElBQUEsSUFBSSxDQUFDLElBQWlCLEVBQUE7SUFDekIsUUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QixRQUFBLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUMvQjtJQUVEOzs7SUFHRztRQUNJLFNBQVMsR0FBQTtJQUNaLFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLEVBQUU7SUFDWixZQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO2FBQzdCO1NBQ0o7SUFFRDs7O0lBR0c7SUFDSSxJQUFBLE9BQU8sQ0FBQyxLQUFhLEVBQUE7WUFDeEIsT0FBT0MsVUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDakM7SUFFRDs7O0lBR0c7UUFDSSxZQUFZLEdBQUE7SUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6QjtJQUVEOzs7SUFHRztRQUNJLFdBQVcsR0FBQTtJQUNkLFFBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzlDO0lBQ0o7O0lDMUhEOzs7OztJQUtHO1VBQ1UsWUFBWSxDQUFBOztJQUVKLElBQUEsR0FBRyxDQUFTOztJQUVaLElBQUEsTUFBTSxDQUF5Qjs7SUFFeEMsSUFBQSxPQUFPLENBQWdCOztRQUVkLFNBQVMsR0FBbUIsRUFBRSxDQUFDOztRQUV4QyxTQUFTLEdBQUcsS0FBSyxDQUFDOztRQUVsQixPQUFPLEdBQWtDLGNBQWMsQ0FBQzs7UUFFL0MsU0FBUyxHQUFrQyxFQUFFLENBQUM7SUFFL0Q7Ozs7Ozs7OztJQVNHO1FBQ0gsV0FBWSxDQUFBLEtBQTZCLEVBQUUsRUFBVSxFQUFBO0lBQ2pELFFBQUEsSUFBSSxDQUFDLEdBQUcsR0FBTSxFQUFFLENBQUM7SUFDakIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNwQixRQUFBLElBQUksQ0FBQyxTQUFTLENBQW1CLGdCQUFBLHlCQUFBLEdBQUcsRUFBRSxDQUFDO1NBQzFDOzs7SUFLRDs7O0lBR0c7SUFDSCxJQUFBLElBQUksRUFBRSxHQUFBO1lBQ0YsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO1NBQ25CO0lBRUQ7Ozs7SUFJRztJQUNILElBQUEsSUFBSSxNQUFNLEdBQUE7WUFDTixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDdkI7SUFFRDs7Ozs7OztJQU9HO0lBQ0gsSUFBQSxJQUFJLFVBQVUsR0FBQTtZQUNWLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztTQUN6QjtJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBSSxNQUFNLEdBQUE7WUFDTixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDdkI7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQUksUUFBUSxHQUFBO1lBQ1IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1NBQ3pCOzs7SUFLRDs7Ozs7OztJQU9HO1FBQ0ksZ0JBQWdCLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxFQUFBO1lBQzlDLElBQUksS0FBSyxHQUFrQixFQUFFLENBQUM7WUFDOUIsSUFBSSxrQkFBa0IsRUFBRTtJQUNwQixZQUFBLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDL0M7WUFDRCxJQUFJLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7SUFDcEMsWUFBQSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUN2QjtJQUNELFFBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BEO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnQkc7SUFDSSxJQUFBLE9BQU8sQ0FDVixNQUFjLEVBQ2QsV0FBcUMsRUFDckMsSUFBbUIsRUFDbkIsU0FBa0IsRUFBQTtZQUVsQixTQUFTLEdBQUcsU0FBUyxJQUFBLGdCQUFBLHlCQUFzQjtJQUMzQyxRQUFBLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFNUQsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRTtJQUNuQyxZQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQ2xDO1lBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7O1lBRzVGLElBQUksQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDLE9BQU8sTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksU0FBUyxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUU7SUFDM0csWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztJQUNwRCxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDeEI7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVyQyxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFFRDs7Ozs7SUFLRztJQUNJLElBQUEsV0FBVyxDQUFDLE1BQXFDLEVBQUE7SUFDcEQsUUFBQSxNQUFNLFFBQVEsR0FBbUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMzRSxRQUFBLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxFQUFFO0lBQzFCLFlBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN6QjtZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7SUFDakMsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0lBRUQ7Ozs7Ozs7Ozs7OztJQVlHO0lBQ0ksSUFBQSxXQUFXLENBQUMsU0FBa0IsRUFBQTtZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtJQUM1QixZQUFBLE9BQU8sS0FBSyxDQUFDO2FBQ2hCO0lBQU0sYUFBQSxJQUFJLElBQUksSUFBSSxTQUFTLEVBQUU7SUFDMUIsWUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDeEU7aUJBQU07SUFDSCxZQUFBLE9BQU8sSUFBSSxDQUFDO2FBQ2Y7U0FDSjtJQUVEOzs7Ozs7Ozs7O0lBVUc7SUFDSSxJQUFBLGNBQWMsQ0FBQyxTQUFpQixFQUFBO1lBQ25DLFFBQVEsSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUU7U0FDOUM7SUFFRDs7O0lBR0c7SUFDSSxJQUFBLE1BQU0sTUFBTSxHQUFBO0lBQ2YsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDbEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3RELFlBQUEsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtvQkFDbEIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsTUFBSzs7SUFFNUMsb0JBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFOzRCQUM1QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7eUJBQ2xCOztJQUVELG9CQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQ3JELG9CQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDekIsaUJBQUMsQ0FBQyxDQUFDO2lCQUNOO2FBQ0o7O0lBRUQsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztTQUN6QjtJQUVEOzs7Ozs7O0lBT0c7UUFDSSxNQUFNLFFBQVEsQ0FBQyxLQUFjLEVBQUE7SUFDaEMsUUFBQSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2pCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN4RCxZQUFBLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7SUFDbEIsZ0JBQUEsS0FBSyxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUM7b0JBQy9ELE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLE1BQUs7O0lBRTdDLG9CQUFBLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTs0QkFDNUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3lCQUNsQjs7SUFFRCxvQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUQsb0JBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN6QixpQkFBQyxDQUFDLENBQUM7aUJBQ047YUFDSjs7SUFFRCxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1NBQzFCO0lBRUQ7Ozs7Ozs7SUFPRztRQUNILE1BQU0sYUFBYSxDQUFDLE9BQWtDLEVBQUE7WUFDbEQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7SUFDeEIsWUFBQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQ2xFO2lCQUFNO0lBQ0gsWUFBQSxPQUFPLEVBQUUsUUFBUSxJQUFJLENBQUM7YUFDekI7U0FDSjtJQUVEOzs7Ozs7O0lBT0c7UUFDSSxNQUFNLE1BQU0sQ0FBQyxLQUFjLEVBQUE7SUFDOUIsUUFBQSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7SUFDaEIsWUFBQSxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDOUI7aUJBQU07SUFDSCxZQUFBLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3ZCO1NBQ0o7SUFFRDs7Ozs7OztJQU9HO0lBQ0ksSUFBQSxRQUFRLENBQUMsUUFBZ0IsRUFBQTtJQUM1QixRQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtJQUNkLFlBQUEsTUFBTUMsa0JBQVUsQ0FDWkMsbUJBQVcsQ0FBQywrQkFBK0IsRUFDM0MsQ0FBQSxFQUFHQyxvQkFBWSxDQUFDRCxtQkFBVyxDQUFDLCtCQUErQixDQUFDLENBQUEsbUVBQUEsQ0FBcUUsQ0FDcEksQ0FBQzthQUNMO0lBQ0QsUUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzlELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUVEOzs7SUFHRztRQUNJLE9BQU8sR0FBQTtJQUNWLFFBQUEsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0lBQ2QsWUFBQSxNQUFNRCxrQkFBVSxDQUNaQyxtQkFBVyxDQUFDLCtCQUErQixFQUMzQyxDQUFBLEVBQUdDLG9CQUFZLENBQUNELG1CQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQSxrRUFBQSxDQUFvRSxDQUNuSSxDQUFDO2FBQ0w7SUFFRCxRQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtJQUNiLFlBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzdHLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDL0I7SUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7Ozs7SUFNRCxJQUFBLElBQVksTUFBTSxHQUFBO0lBQ2QsUUFBQSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUNsQyxRQUFBLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRTtJQUNiLFlBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzlCO2lCQUFNO0lBQ0gsWUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUEsZ0JBQUEseUJBQW1CLENBQUM7YUFDNUM7U0FDSjs7SUFHTyxJQUFBLFNBQVMsQ0FBQyxNQUFvQixFQUFBO0lBQ2xDLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7U0FDekI7O0lBR08sSUFBQSxVQUFVLENBQUMsU0FBd0MsRUFBQTtZQUN2RCxNQUFNLEtBQUssR0FBa0IsRUFBRSxDQUFDO0lBQ2hDLFFBQUEsSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDNUIsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUM5QjtJQUNELFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7SUFDekIsUUFBQSxPQUFPLEtBQUssQ0FBQztTQUNoQjs7SUFHTyxJQUFBLG9CQUFvQixDQUFDLFNBQW1ELEVBQUE7SUFDNUUsUUFBQSxNQUFNLFdBQVcsR0FBRyxDQUFDLEtBQW1CLEtBQW1CO2dCQUN2RCxNQUFNLEtBQUssR0FBa0IsRUFBRSxDQUFDO0lBQ2hDLFlBQUEsS0FBSyxNQUFNLEtBQUssSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFO29CQUNqQyxRQUFRLFNBQVM7SUFDYixvQkFBQSxLQUFLLFlBQVksQ0FBQztJQUNsQixvQkFBQSxLQUFLLGNBQWM7NEJBQ2YsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzs0QkFDM0MsTUFBTTtJQUNWLG9CQUFBLEtBQUssUUFBUTtJQUNULHdCQUFBLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUU7Z0NBQ3RCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7NkJBQy9COzRCQUNELE1BQU07SUFDVixvQkFBQTs7SUFFSSx3QkFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixTQUFTLENBQUEsQ0FBRSxDQUFDLENBQUM7NEJBQ2hELE1BQU07cUJBQ2I7SUFDRCxnQkFBQSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7d0JBQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztxQkFDckM7aUJBQ0o7SUFDRCxZQUFBLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLFNBQUMsQ0FBQztJQUNGLFFBQUEsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDNUI7SUFDSjs7SUM3WEQsaUJBQWlCLE1BQU1FLGFBQVcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7SUFxQjFEOzs7SUFHRztJQUNHLE1BQWdCLFlBQ2xCLFNBQVFDLFlBQXNCLENBQUE7O1FBR2IsQ0FBQ0QsYUFBVyxFQUFhOztJQUcxQyxJQUFBLFdBQUEsQ0FBWSxPQUFrRCxFQUFBO1lBQzFELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVmLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQztZQUNwQyxJQUFJLENBQUNBLGFBQVcsQ0FBd0IsR0FBRztnQkFDeEMsS0FBSztnQkFDTCxJQUFJO2FBQ0ssQ0FBQztZQUVkLElBQUksR0FBRyxFQUFFO0lBQ0wsWUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQTRCLENBQUMsQ0FBQzthQUNqRDtTQUNKOzs7O0lBTUQsSUFBQSxJQUFJLEtBQUssR0FBQTtJQUNMLFFBQUEsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQztTQUNsQzs7O0lBS0Q7Ozs7SUFJRztRQUNNLE1BQU0sR0FBQTtZQUNYLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDN0IsUUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDOztJQUVmLFFBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDckIsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmOzs7SUFLRDs7O0lBR0c7SUFDSCxJQUFBLElBQUksS0FBSyxHQUFBO1lBQ0wsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDdkM7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQUksTUFBTSxHQUFBO1lBQ04sT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7U0FDeEM7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQUksWUFBWSxHQUFBO1lBQ1osT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUM7U0FDeEM7SUFFRDs7Ozs7Ozs7OztJQVVHO1FBQ0gsWUFBWSxDQUFDLFNBQWlCLEVBQUUsT0FBcUMsRUFBQTtZQUNqRSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUU7SUFDdkMsWUFBQSxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hELFlBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDOUI7SUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFDSjs7SUN4R0Q7Ozs7SUFJRztVQUNVLGVBQWUsQ0FBQTtJQUNQLElBQUEsUUFBUSxDQUFNO0lBQ2QsSUFBQSxXQUFXLENBQU07SUFDakIsSUFBQSxRQUFRLENBQXFCO0lBQzdCLElBQUEsa0JBQWtCLENBQW1CO0lBQzlDLElBQUEsZUFBZSxDQUFVOztRQUdqQyxXQUFZLENBQUEsT0FBb0IsRUFBRSxPQUEyQixFQUFBO0lBQ3pELFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBR04sV0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNCLFFBQUEsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3BELFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFFeEI7Ozs7SUFJRztJQUNILFFBQUEsSUFBSSxLQUFrQixDQUFDO0lBQ3ZCLFFBQUEsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE1BQVc7SUFDakMsWUFBQSxJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7b0JBQ2ZRLG9CQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3ZCO0lBQ0QsWUFBQSxLQUFLLEdBQUdDLGtCQUFVLENBQUMsTUFBSztvQkFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxXQUFXLENBQUMsWUFBWSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlGLGFBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxJQUFBLEVBQUEscUNBQWtDLENBQUM7SUFDOUQsU0FBQyxDQUFDO1lBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ3ZEOzs7O0lBTUQsSUFBQSxXQUFXLElBQUksR0FBQTtJQUNYLFFBQUEsT0FBTywrQkFBK0IsQ0FBQztTQUMxQzs7SUFHRCxJQUFBLE9BQU8sVUFBVSxHQUFBO0lBQ2IsUUFBQSxNQUFNLE9BQU8sR0FBRyxDQUFDLE9BQW9CLEVBQUUsT0FBMkIsS0FBbUI7SUFDakYsWUFBQSxPQUFPLElBQUksZUFBZSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRCxTQUFDLENBQUM7O0lBRUYsUUFBQSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFO0lBQzdCLFlBQUEsSUFBSSxFQUFFO0lBQ0YsZ0JBQUEsWUFBWSxFQUFFLEtBQUs7SUFDbkIsZ0JBQUEsUUFBUSxFQUFFLEtBQUs7SUFDZixnQkFBQSxVQUFVLEVBQUUsSUFBSTtvQkFDaEIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxJQUFJO0lBQzlCLGFBQUE7SUFDSixTQUFBLENBQUMsQ0FBQztJQUNILFFBQUEsT0FBTyxPQUE4QixDQUFDO1NBQ3pDOzs7O0lBTUQsSUFBQSxJQUFJLElBQUksR0FBQTtZQUNKLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQztTQUMvQjs7SUFHRCxJQUFBLElBQUksR0FBRyxHQUFBO0lBQ0gsUUFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7U0FDcEM7O0lBR0QsSUFBQSxJQUFJLE1BQU0sR0FBQTtZQUNOLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDMUU7O1FBR0QsRUFBRSxDQUFDLElBQTZCLEVBQUUsUUFBMEIsRUFBQTtZQUN4RCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBbUIsSUFBSSxFQUFFLFFBQTJCLENBQUMsQ0FBQztTQUN6RTs7UUFHRCxHQUFHLENBQUMsSUFBNkIsRUFBRSxRQUEwQixFQUFBO1lBQ3pELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFtQixJQUFJLEVBQUUsUUFBMkIsQ0FBQyxDQUFDO1NBQzFFOztJQUdELElBQUEsUUFBUSxDQUFDLEdBQVcsRUFBRSxPQUFpQixFQUFFLElBQWEsRUFBQTtJQUNsRCxRQUFBLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFHO2dCQUN6QixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLElBQUksT0FBTyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztJQUN4SCxZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxNQUFLO0lBQy9ELGdCQUFBLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO0lBQ2pDLGdCQUFBLE9BQU8sRUFBRSxDQUFDO0lBQ2QsYUFBQyxDQUFDLENBQUM7SUFDUCxTQUFDLENBQUMsQ0FBQztTQUNOOztRQUdELE1BQU0sR0FBQTs7U0FFTDs7UUFHRCxPQUFPLEdBQUE7SUFDSCxRQUFBLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFFBQTBCLEdBQUksSUFBSSxDQUFDLFdBQTZCLEdBQUcsSUFBSSxDQUFDO1NBQ2pGO0lBQ0o7O0lDekdEO0lBQ0EsTUFBTSxZQUFZLEdBQWlDO0lBQy9DLElBQUEsZUFBZSxFQUFFLGVBQWUsQ0FBQyxVQUFVLEVBQUU7SUFDN0MsSUFBQSxnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLElBQUEscUJBQXFCLEVBQUUsS0FBSztJQUM1QixJQUFBLHdCQUF3QixFQUFFLEdBQUc7SUFDN0IsSUFBQSxxQkFBcUIsRUFBRSxHQUFHO0lBQzFCLElBQUEsZ0JBQWdCLEVBQUUsQ0FBQztJQUNuQixJQUFBLGdCQUFnQixFQUFFLENBQUM7SUFDbkIsSUFBQSxlQUFlLEVBQUUsSUFBSTtJQUNyQixJQUFBLGlCQUFpQixFQUFFLENBQUM7SUFDcEIsSUFBQSxTQUFTLEVBQUUsTUFBTTtRQUNqQixXQUFXLEVBQUUsSUFBSTtJQUNqQixJQUFBLHdCQUF3QixFQUFFLElBQUk7SUFDOUIsSUFBQSx5QkFBeUIsRUFBRSxLQUFLO0tBQ25DLENBQUM7SUFFRjtJQUNBLE1BQU0sU0FBUyxHQUFHVCxXQUFDLEVBQVMsQ0FBQztJQUU3QjtJQUNBLFNBQVMsTUFBTSxDQUFJLENBQWdCLEVBQUE7SUFDL0IsSUFBQSxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUU7SUFDWCxRQUFBLE1BQU1HLGtCQUFVLENBQUNDLG1CQUFXLENBQUMsd0NBQXdDLENBQUMsQ0FBQztTQUMxRTtJQUNMLENBQUM7SUFTRDtJQUVBOzs7O0lBSUc7VUFDVSxRQUFRLENBQUE7SUFDVCxJQUFBLE1BQU0sQ0FBTTtJQUNaLElBQUEsS0FBSyxDQUFNO1FBQ1gsVUFBVSxHQUFHLENBQUMsQ0FBQztJQUNmLElBQUEsU0FBUyxDQUE0Qjs7UUFHckMsT0FBTyxHQUFHLElBQUksQ0FBQzs7SUFHTixJQUFBLFNBQVMsQ0FBK0I7O0lBRXhDLElBQUEsbUJBQW1CLENBQXVCOztJQUUxQyxJQUFBLHVCQUF1QixDQUF1Qjs7UUFFdkQsV0FBVyxHQUFHLENBQUMsQ0FBQzs7UUFFUCxNQUFNLEdBQWtCLEVBQUUsQ0FBQzs7UUFFM0IsTUFBTSxHQUFrQixFQUFFLENBQUM7O0lBRzNCLElBQUEsc0JBQXNCLEdBQUc7SUFDdEMsUUFBQSxLQUFLLEVBQUUsQ0FBQztJQUNSLFFBQUEsSUFBSSxFQUFFLENBQUM7SUFDUCxRQUFBLEVBQUUsRUFBRSxDQUFDO1lBQ0wsR0FBRyxFQUFFLENBQUM7U0FDVCxDQUFDOztRQUdlLE9BQU8sR0FBOEMsRUFBRSxDQUFDOztJQUd6RSxJQUFBLFdBQUEsQ0FBWSxPQUE0QixFQUFBO1lBQ3BDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7SUFDckMsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUUxRCxRQUFBLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxNQUFLO2dCQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkMsU0FBQyxDQUFDO0lBQ0YsUUFBQSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsTUFBVztnQkFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLFNBQUMsQ0FBQztTQUNMOzs7O1FBTU0sVUFBVSxDQUFDLEtBQVUsRUFBRSxNQUFjLEVBQUE7O0lBRXhDLFFBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtnQkFDcEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2xCO0lBRUQsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNwQixRQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDOztZQUVsSCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNmLE1BQU1ELGtCQUFVLENBQ1pDLG1CQUFXLENBQUMsK0JBQStCLEVBQzNDLENBQUEsRUFBR0Msb0JBQVksQ0FBQ0QsbUJBQVcsQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQWEsV0FBQSxDQUFBLENBQzlHLENBQUM7YUFDTDtJQUVELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDdkMsUUFBQSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1NBQy9COztRQUdNLE9BQU8sR0FBQTtZQUNWLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO0lBQzlCLFFBQUEsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUMxQixRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQzNCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7U0FDeEM7O0lBR00sSUFBQSxhQUFhLENBQUMsTUFBYyxFQUFBO0lBQy9CLFFBQUEsSUFBSSxNQUFNLElBQUksQ0FBQyxFQUFFO0lBQ2IsWUFBQSxNQUFNRCxrQkFBVSxDQUNaQyxtQkFBVyxDQUFDLCtCQUErQixFQUMzQyxDQUFHLEVBQUFDLG9CQUFZLENBQUNELG1CQUFXLENBQUMsK0JBQStCLENBQUMsaUJBQWlCLE1BQU0sQ0FBQSxDQUFBLENBQUcsQ0FDekYsQ0FBQzthQUNMO0lBQ0QsUUFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQztJQUMxQixRQUFBLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7U0FDNUI7O1FBR00sTUFBTSxjQUFjLENBQUMsTUFBZSxFQUFBO0lBQ3ZDLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7SUFDdEIsUUFBQSxNQUFNLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1NBQ3BDOztJQUdELElBQUEsSUFBSSxNQUFNLEdBQUE7WUFDTixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDdkI7O0lBR0QsSUFBQSxJQUFJLFlBQVksR0FBQTtJQUNaLFFBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7U0FDOUM7O0lBR00sSUFBQSxNQUFNLG1CQUFtQixHQUFBO0lBQzVCLFFBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUV2QixRQUFBLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0RSxNQUFNLEVBQUUseUJBQXlCLEVBQUUsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUVsRSxRQUFBLE1BQU0sWUFBWSxHQUFHLENBQUMsT0FBWSxLQUFVO2dCQUN4QyxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUdILGdDQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVELFlBQUEsSUFBSSxNQUFNLEtBQUssVUFBVSxFQUFFO29CQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFpQixjQUFBLEVBQUEsTUFBTSxDQUFNLElBQUEsQ0FBQSxDQUFDLENBQUM7aUJBQzNEO0lBQ0wsU0FBQyxDQUFDO0lBRUYsUUFBQSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDZCxZQUFBLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekUsWUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3hELElBQUksV0FBVyxFQUFFO0lBQ2IsZ0JBQUEsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7aUJBQ3RDO2FBQ0o7aUJBQU07SUFDSCxZQUFBLE1BQU0sSUFBSSxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUNsRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdEI7U0FDSjs7OztJQU1ELElBQUEsSUFBSSxVQUFVLEdBQUE7WUFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDckI7O0lBR0QsSUFBQSxJQUFJLGVBQWUsR0FBQTtJQUNmLFFBQUEsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztTQUNsRDs7SUFHRCxJQUFBLElBQUksT0FBTyxHQUFBO1lBQ1AsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1NBQ3pCOztJQUdELElBQUEscUJBQXFCLENBQUMsS0FBYSxFQUFBO0lBQy9CLFFBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtnQkFDbkIsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDOztJQUVyQyxZQUFBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUU7SUFDckIsZ0JBQUEsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7aUJBQ3ZCO2dCQUNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUN0QztTQUNKOztJQUdELElBQUEsY0FBYyxDQUFDLElBQVksRUFBQTtJQUN2QixRQUFBLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDeEIsUUFBQSxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQzlDLFlBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUNQLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzNCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDakMsZ0JBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7aUJBQ2hEO3FCQUFNO0lBQ0gsZ0JBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDcEIsZ0JBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7aUJBQ3hCO2FBQ0o7U0FDSjs7UUFHRCxtQkFBbUIsR0FBQTtJQUNmLFFBQUEsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDL0Q7Ozs7UUFNRCxhQUFhLEdBQUE7SUFDVCxRQUFBLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7U0FDM0I7O0lBR0QsSUFBQSxPQUFPLENBQUMsTUFBYyxFQUFFLFdBQXFDLEVBQUUsSUFBbUIsRUFBRSxRQUFpQixFQUFBO1lBQ2pHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3pGOztRQUdELFFBQVEsQ0FBQyxJQUFpQyxFQUFFLFFBQWlCLEVBQUE7SUFDekQsUUFBQSxNQUFNLEtBQUssR0FBa0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRSxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7WUFDcEIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBRXBCLFFBQUEsSUFBSSxJQUFJLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLFFBQVEsRUFBRTtJQUNuRCxZQUFBLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNqQztZQUVELElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO2dCQUNqQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2FBQ2xCOztJQUdELFFBQUEsS0FBSyxNQUFNLEVBQUUsSUFBSSxLQUFLLEVBQUU7SUFDcEIsWUFBQSxXQUFXLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQzthQUM1QjtJQUNELFFBQUEsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDOztJQUd4QyxRQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQzs7WUFHMUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtJQUNWLFlBQUEsSUFBSSxDQUFDLEtBQUssUUFBUSxFQUFFO29CQUNoQixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7aUJBQ3BCO0lBQU0saUJBQUEsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFO0lBQ3BELGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQ3ZEO2FBQ0o7O0lBR0QsUUFBQSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2pDO0lBS0QsSUFBQSxVQUFVLENBQUMsS0FBd0IsRUFBRSxJQUFhLEVBQUUsSUFBYSxFQUFBO0lBQzdELFFBQUEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ3RCLFlBQUEsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQzthQUN6QztpQkFBTTtnQkFDSCxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNuRDtTQUNKOztRQUdPLHdCQUF3QixDQUFDLE9BQWlCLEVBQUUsS0FBYSxFQUFBO1lBQzdELE1BQU0sT0FBTyxHQUFrQixFQUFFLENBQUM7WUFDbEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0lBRXZCLFFBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7Z0JBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUIsWUFBQSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQzs7Z0JBRXJCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNsQixZQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdEI7O0lBRUQsUUFBQSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxFQUFFO0lBQ3hELFlBQUEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUMvQixZQUFBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO0lBQ3pDLFlBQUEsVUFBVSxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQzthQUNuQztJQUVELFFBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUM7U0FDekM7O0lBR08sSUFBQSw2QkFBNkIsQ0FBQyxPQUEyQixFQUFFLEtBQWEsRUFBRSxhQUF5QixFQUFBO1lBQ3ZHLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxHQUFHLE9BQU8sQ0FBQzs7WUFHL0MsSUFBSSxVQUFVLEVBQUU7SUFDWixZQUFBLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN4Qzs7SUFHRCxRQUFBLGFBQWEsRUFBRSxDQUFDOztJQUdoQixRQUFBLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDOztZQUVuQyxVQUFVLENBQUMsTUFBSztJQUNaLFlBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUU7b0JBQ3hCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztpQkFDckI7YUFDSixFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ2I7O0lBR08sSUFBQSx1QkFBdUIsQ0FBQyxLQUFhLEVBQUUsSUFBd0IsRUFBRSxLQUF5QixFQUFBO0lBQzlGLFFBQUEsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUM7SUFDakIsUUFBQSxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUVuQixRQUFBLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxFQUFFO0lBQ2hELFlBQUEsTUFBTUUsa0JBQVUsQ0FDWkMsbUJBQVcsQ0FBQywrQkFBK0IsRUFDM0MsQ0FBRyxFQUFBQyxvQkFBWSxDQUFDRCxtQkFBVyxDQUFDLCtCQUErQixDQUFDLGtDQUFrQyxLQUFLLENBQUEsQ0FBQSxDQUFHLENBQ3pHLENBQUM7YUFDTDs7WUFHRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQzs7WUFHOUQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBSzs7Z0JBRXBELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxFQUFFO0lBQ3RDLGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDaEQ7O2dCQUVELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQzs7SUFFaEMsWUFBQSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLFNBQUMsQ0FBQyxDQUFDO1NBQ047O1FBR08sbUJBQW1CLENBQUMsT0FBaUIsRUFBRSxLQUFjLEVBQUE7SUFDekQsUUFBQSxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUNuQixRQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUV0QyxRQUFBLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7SUFDNUMsWUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0lBQ2pDLGdCQUFBLE1BQU1ELGtCQUFVLENBQ1pDLG1CQUFXLENBQUMsK0JBQStCLEVBQzNDLENBQUcsRUFBQUMsb0JBQVksQ0FBQ0QsbUJBQVcsQ0FBQywrQkFBK0IsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBLENBQUEsQ0FBRyxDQUNyRyxDQUFDO2lCQUNMO2FBQ0o7O1lBR0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQzs7WUFHOUQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBSztJQUNwRCxZQUFBLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFOztvQkFFdkIsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUU7SUFDcEMsb0JBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUM5Qzs7b0JBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUM5Qjs7Z0JBRUQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDMUMsWUFBQSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLFNBQUMsQ0FBQyxDQUFDO1NBQ047O0lBR08sSUFBQSx3QkFBd0IsQ0FBQyxLQUFhLEVBQUE7SUFDMUMsUUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekIsUUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFLO2dCQUMxQk0sdUJBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN4QixTQUFDLENBQUMsQ0FBQztZQUNIQyw4QkFBc0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztTQUN2RDs7SUFHRCxJQUFBLFdBQVcsQ0FBQyxNQUFzQixFQUFBO0lBQzlCLFFBQUEsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFFakMsUUFBQSxNQUFNLE1BQU0sR0FBRyxDQUFDLE9BQVksS0FBWTtnQkFDcEMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO29CQUMvQyxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO2lCQUN4RDtJQUFNLGlCQUFBLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtJQUMxRSxnQkFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7SUFDdEQsZ0JBQUEsT0FBTyxHQUFHLENBQUM7aUJBQ2Q7cUJBQU07SUFDSCxnQkFBQSxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztpQkFDbkM7SUFDTCxTQUFDLENBQUM7WUFFRixNQUFNLEtBQUssR0FBRyxNQUFNLFlBQVksS0FBSyxHQUFHLE1BQU0sQ0FBQ1gsV0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFxQixDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFakcsUUFBQSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7SUFDckIsWUFBQSxNQUFNRyxrQkFBVSxDQUNaQyxtQkFBVyxDQUFDLCtCQUErQixFQUMzQyxHQUFHQyxvQkFBWSxDQUFDRCxtQkFBVyxDQUFDLCtCQUErQixDQUFDLENBQUEsb0JBQUEsRUFBdUIsT0FBTyxNQUFNLENBQUEsQ0FBQSxDQUFHLENBQ3RHLENBQUM7YUFDTDtpQkFBTSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxLQUFLLEVBQUU7SUFDNUMsWUFBQSxNQUFNRCxrQkFBVSxDQUNaQyxtQkFBVyxDQUFDLCtCQUErQixFQUMzQyxHQUFHQyxvQkFBWSxDQUFDRCxtQkFBVyxDQUFDLCtCQUErQixDQUFDLENBQUEsK0JBQUEsRUFBa0MsT0FBTyxLQUFLLENBQUEsQ0FBQSxDQUFHLENBQ2hILENBQUM7YUFDTDtJQUVELFFBQUEsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO1NBQzdCOztRQUdELE9BQU8sR0FBQTtZQUNILE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxzQkFBc0IsRUFBRSxHQUFHLElBQUksQ0FBQztZQUVuRSxNQUFNLE9BQU8sR0FBdUQsRUFBRSxDQUFDO0lBQ3ZFLFFBQUEsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDN0MsTUFBTSxpQkFBaUIsR0FBYSxFQUFFLENBQUM7SUFFdkMsUUFBQSxNQUFNLGtCQUFrQixHQUFHLENBQUMsS0FBYSxLQUFVO0lBQy9DLFlBQUEsSUFBSSxLQUFLLEtBQUssZ0JBQWdCLEVBQUU7SUFDNUIsZ0JBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLFVBQVUsQ0FBQztJQUM1QixnQkFBQSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ2pDO0lBQU0saUJBQUEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtJQUN6RSxnQkFBQSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsVUFBVSxDQUFDO2lCQUMvQjtJQUFNLGlCQUFBLElBQUksU0FBUyxDQUFDLGdCQUFnQixFQUFFO0lBQ25DLGdCQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUM7aUJBQzNCO3FCQUFNO0lBQ0gsZ0JBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLFlBQVksQ0FBQztpQkFDakM7O0lBRUQsWUFBQSxJQUFJLGdCQUFnQixHQUFHLENBQUMsS0FBSyxLQUFLLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxLQUFLLEtBQUssRUFBRTtJQUNsRSxnQkFBQSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ2pDO0lBQ0wsU0FBQyxDQUFDOztJQUdGLFFBQUEsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtJQUNwQixZQUFBLE9BQU8sSUFBSSxDQUFDO2FBQ2Y7WUFFRDtnQkFDSSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDO0lBQzVFLFlBQUEsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDO0lBQ2xELFlBQUEsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDO0lBRWhELFlBQUEsSUFBSSxZQUFZLEdBQUcsQ0FBQyxFQUFFLFlBQVksR0FBRyxDQUFDLENBQUM7SUFDdkMsWUFBQSxLQUFLLElBQUksU0FBUyxHQUFHLFVBQVUsRUFBRSxTQUFTLElBQUksUUFBUSxFQUFFLFNBQVMsRUFBRSxFQUFFO0lBQ2pFLGdCQUFBLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRTtJQUNmLG9CQUFBLFlBQVksRUFBRSxDQUFDO3dCQUNmLFNBQVM7cUJBQ1o7SUFDRCxnQkFBQSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksU0FBUyxFQUFFO0lBQzVCLG9CQUFBLFlBQVksRUFBRSxDQUFDO3dCQUNmLFNBQVM7cUJBQ1o7b0JBQ0Qsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQ2pDO0lBRUQsWUFBQSxJQUFJLENBQUMsR0FBRyxZQUFZLEVBQUU7b0JBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsR0FBRyxnQkFBZ0IsR0FBRyxXQUFXLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUU7SUFDaEcsb0JBQUEsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLFNBQVMsRUFBRTs0QkFDNUIsTUFBTTt5QkFDVDt3QkFDRCxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDakM7aUJBQ0o7SUFFRCxZQUFBLElBQUksQ0FBQyxHQUFHLFlBQVksRUFBRTtvQkFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxHQUFHLGdCQUFnQixHQUFHLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRTtJQUNoRyxvQkFBQSxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUU7NEJBQ2YsTUFBTTt5QkFDVDt3QkFDRCxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDakM7aUJBQ0o7YUFDSjs7SUFHRCxRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksVUFBVSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbEUsSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDN0IsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2lCQUNyQjthQUNKOztZQUdELEtBQUssTUFBTSxHQUFHLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUU7Z0JBQy9ELEtBQUtRLFlBQUksQ0FBQyxNQUFLO29CQUNYLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUM7SUFDcEQsYUFBQyxDQUFDLENBQUM7YUFDTjs7WUFHRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7SUFDcEMsWUFBQSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDMUIsWUFBQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzlCLEtBQUtBLFlBQUksQ0FBQyxNQUFLO0lBQ1gsZ0JBQUEsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ3hELGFBQUMsQ0FBQyxDQUFDO2FBQ047O0lBR0QsUUFBQSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUVwQyxRQUFBLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzdDLHNCQUFzQixDQUFDLElBQUksR0FBSSxXQUFXLENBQUMsWUFBWSxFQUFFLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQztZQUN0RSxzQkFBc0IsQ0FBQyxFQUFFLEdBQU0sV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDckUsUUFBQSxzQkFBc0IsQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUM7SUFFaEQsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmOztRQUdELE1BQU0sR0FBQTtZQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7O1FBR0QsT0FBTyxHQUFBO1lBQ0gsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7O1FBR0QsT0FBTyxHQUFBO0lBQ0gsUUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzthQUNyQjtJQUNELFFBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLFFBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLFFBQUEsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7SUFDcEIsUUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyQixRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7Ozs7SUFNRCxJQUFBLElBQUksU0FBUyxHQUFBO0lBQ1QsUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztTQUNuQzs7SUFHRCxJQUFBLElBQUksWUFBWSxHQUFBO0lBQ1osUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQztTQUN0Qzs7UUFHRCxnQkFBZ0IsQ0FBQyxPQUF5QixFQUFFLE1BQW9CLEVBQUE7WUFDNUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDL0M7O1FBR0Qsb0JBQW9CLENBQUMsT0FBeUIsRUFBRSxNQUFvQixFQUFBO1lBQ2hFLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ25EOztJQUdELElBQUEsTUFBTSxRQUFRLENBQUMsR0FBVyxFQUFFLE9BQWlCLEVBQUUsSUFBYSxFQUFBO0lBQ3hELFFBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN2QixRQUFBLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtJQUNULFlBQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsR0FBRyxDQUFBLENBQUEsQ0FBRyxDQUFDLENBQUM7Z0JBQzNELEdBQUcsR0FBRyxDQUFDLENBQUM7YUFDWDtpQkFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRTtJQUNwQyxZQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0NBQW9DLEdBQUcsQ0FBQSxDQUFBLENBQUcsQ0FBQyxDQUFDO0lBQ3pELFlBQUEsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO2FBQzVCOztJQUVELFFBQUEsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDdEMsSUFBSSxHQUFHLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7SUFDNUIsWUFBQSxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDckQ7U0FDSjs7SUFHRCxJQUFBLE1BQU0sYUFBYSxDQUFDLEtBQWEsRUFBRSxPQUFrQyxFQUFBO1lBQ2pFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUM7WUFFM0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xCLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLEtBQUssRUFBRTtJQUNyQyxZQUFBLE1BQU1ULGtCQUFVLENBQ1pDLG1CQUFXLENBQUMsK0JBQStCLEVBQzNDLEdBQUdDLG9CQUFZLENBQUNELG1CQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQSxpQ0FBQSxFQUFvQyxPQUFPLEtBQUssQ0FBQSxDQUFBLENBQUcsQ0FDbEgsQ0FBQzthQUNMO0lBRUQsUUFBQSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzVCLFlBQUEsU0FBUyxFQUFFLElBQUk7SUFDZixZQUFBLE1BQU0sRUFBRSxLQUFLO2dCQUNiLE9BQU8sRUFBRSxTQUFTLENBQUMsZUFBZTtnQkFDbEMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxpQkFBaUI7SUFDakMsWUFBQSxRQUFRLEVBQUVTLFlBQUk7YUFDakIsRUFBRSxPQUFPLENBQXVDLENBQUM7SUFFbEQsUUFBQSxNQUFNLFlBQVksR0FBRztnQkFDakIsSUFBSSxFQUFFLFNBQVMsQ0FBQyxHQUFHO0lBQ25CLFlBQUEsRUFBRSxFQUFFLFNBQVMsQ0FBQyxHQUFHLEdBQUcsV0FBVzthQUNsQyxDQUFDO0lBRUYsUUFBQSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFN0IsUUFBQSxNQUFNLFdBQVcsR0FBRztnQkFDaEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNO0lBQ25CLFlBQUEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU07YUFDcEMsQ0FBQztZQUVGLE1BQU0sU0FBUyxHQUFHLE1BQWM7SUFDNUIsWUFBQSxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUU7b0JBQ3JCLElBQUksV0FBVyxDQUFDLElBQUksSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFO0lBQ3ZDLG9CQUFBLE9BQU8sWUFBWSxDQUFDLElBQUksSUFBSSxXQUFXLENBQUMsRUFBRSxDQUFDO3FCQUM5Qzt5QkFBTTtJQUNILG9CQUFBLE9BQU8sV0FBVyxDQUFDLElBQUksSUFBSSxZQUFZLENBQUMsRUFBRSxDQUFDO3FCQUM5QztpQkFDSjtxQkFBTTtJQUNILGdCQUFBLE9BQU8sWUFBWSxDQUFDLElBQUksSUFBSSxXQUFXLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLEVBQUUsQ0FBQztpQkFDckY7SUFDTCxTQUFDLENBQUM7WUFFRixNQUFNLGNBQWMsR0FBRyxNQUFhO0lBQ2hDLFlBQUEsT0FBTyxXQUFXLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQyxJQUFJO3NCQUNyQyxXQUFXLENBQUMsSUFBSTtzQkFDaEIsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTTtJQUNsQyxhQUFBO0lBQ0wsU0FBQyxDQUFDO0lBRUYsUUFBQSxJQUFJLEdBQVcsQ0FBQztJQUNoQixRQUFBLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtJQUNsQixZQUFBLEdBQUcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO2FBQzFCO2lCQUFNLElBQUksU0FBUyxFQUFFLEVBQUU7Z0JBQ3BCLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNyQixZQUFBLE9BQU87YUFDVjtpQkFBTTtnQkFDSCxHQUFHLEdBQUcsY0FBYyxFQUFFLENBQUM7YUFDMUI7O0lBR0QsUUFBQSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUU7Z0JBQ1QsR0FBRyxHQUFHLENBQUMsQ0FBQzthQUNYO0lBQU0sYUFBQSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFO0lBQy9CLFlBQUEsR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7YUFDMUI7SUFFRCxRQUFBLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUQsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ3hCOzs7O0lBTUQsSUFBQSxNQUFNLENBQUMsR0FBVyxFQUFBO1lBQ2QsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUMzQixZQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQzlDO0lBQ0QsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmOztRQUdELE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBZ0IsRUFBQTtZQUNqQyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQzNCLFlBQUEsT0FBTyxLQUFLLENBQUM7YUFDaEI7WUFDRCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtnQkFDeEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2xCO0lBRUQsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFdkMsSUFBSSxPQUFPLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2xCO0lBRUQsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmOztJQUdELElBQUEsU0FBUyxDQUFDLEdBQVcsRUFBQTtZQUNqQixPQUFPLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3BDOztJQUdELElBQUEsV0FBVyxDQUFDLEdBQVksRUFBQTtJQUNwQixRQUFBLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRTtJQUNiLFlBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUN6QyxnQkFBQSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQzVCO0lBQ0QsWUFBQSxPQUFPLElBQUksQ0FBQzthQUNmO2lCQUFNLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDbEMsWUFBQSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekIsWUFBQSxPQUFPLElBQUksQ0FBQzthQUNmO2lCQUFNO0lBQ0gsWUFBQSxPQUFPLEtBQUssQ0FBQzthQUNoQjtTQUNKOztJQUdELElBQUEsSUFBSSxVQUFVLEdBQUE7WUFDVixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDdkI7Ozs7SUFNRCxJQUFBLElBQVksT0FBTyxHQUFBO1lBQ2YsT0FBTyxvQkFBb0IsRUFBRSxDQUFDO1NBQ2pDOztRQUdPLG9CQUFvQixHQUFBO1lBQ3hCLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUN2RCxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7U0FDbEU7O1FBR08sc0JBQXNCLEdBQUE7WUFDMUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ2hFLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztTQUMzRDs7UUFHTyxjQUFjLEdBQUE7SUFDbEIsUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQ3pFOztRQUdPLFlBQVksR0FBQTtZQUNoQixNQUFNLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7WUFDaEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRWxCLE1BQU0sRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFFM0QsUUFBQSxNQUFNLGFBQWEsR0FBRyxDQUFDLE1BQUs7SUFDeEIsWUFBQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDcEMsWUFBQSxPQUFPLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO2FBQ3JFLEdBQUcsQ0FBQztJQUVMLFFBQUEsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFLO2dCQUNkLElBQUksQ0FBQyxLQUFLLFlBQVksSUFBSSxZQUFZLElBQUksV0FBVyxFQUFFO0lBQ25ELGdCQUFBLE9BQU8sQ0FBQyxDQUFDO2lCQUNaO3FCQUFNO0lBQ0gsZ0JBQUEsT0FBTyxTQUFTLEdBQUcsYUFBYSxHQUFHLFlBQVksQ0FBQztpQkFDbkQ7YUFDSixHQUFHLENBQUM7SUFFTCxRQUFBLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBaUIsS0FBYTtJQUM5QyxZQUFBLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtJQUNkLGdCQUFBLE9BQU8sS0FBSyxDQUFDO2lCQUNoQjtJQUFNLGlCQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtJQUMvRCxnQkFBQSxPQUFPLElBQUksQ0FBQztpQkFDZjtxQkFBTTtJQUNILGdCQUFBLE9BQU8sS0FBSyxDQUFDO2lCQUNoQjtJQUNMLFNBQUMsQ0FBQztZQUVGLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQzlDLFFBQUEsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLFNBQVMsRUFBRTtJQUM1QixZQUFBLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzthQUNqQztJQUVELFFBQUEsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdCLFFBQUEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQzthQUNyQjtJQUFNLGFBQUEsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtJQUMxQixZQUFBLEtBQUssSUFBSSxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQ3JDLGdCQUFBLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakIsZ0JBQUEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ2xCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztxQkFDckI7aUJBQ0o7YUFDSjtpQkFBTTtnQkFDSCxLQUFLLElBQUksQ0FBQyxHQUFHLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUN2RCxnQkFBQSxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pCLGdCQUFBLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUNsQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7cUJBQ3JCO2lCQUNKO2FBQ0o7WUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQXVDLG9DQUFBLEVBQUEsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUUsQ0FBQSxDQUFDLENBQUM7SUFDekUsUUFBQSxPQUFPLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1NBQzVCOztRQUdPLFdBQVcsR0FBQTtZQUNmLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO0lBQ3hCLFlBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQzlDO2lCQUFNO0lBQ0gsWUFBQSxPQUFPLFNBQVMsQ0FBQzthQUNwQjtTQUNKOztJQUdPLElBQUEsUUFBUSxDQUFDLEdBQVcsRUFBQTtJQUN4QixRQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7SUFDeEMsWUFBQSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQzs7SUFFN0MsWUFBQSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixFQUFFO29CQUN4RixJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEtBQUssZ0JBQWdCLEVBQUU7d0JBQ3hELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztxQkFDbEI7aUJBQ0o7SUFDRCxZQUFBLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO2FBQ3pDO1NBQ0o7O0lBR08sSUFBQSxZQUFZLENBQUMsR0FBVyxFQUFBO0lBQzVCLFFBQUEsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtJQUN4QyxZQUFBLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUM3QyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEtBQUssZ0JBQWdCLEVBQUU7b0JBQ3hELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDbEI7SUFDRCxZQUFBLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO2FBQ3pDO1NBQ0o7O0lBR08sSUFBQSxVQUFVLENBQUMsSUFBYSxFQUFBO0lBQzVCLFFBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVyQixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3hELFFBQUEsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sYUFBYSxHQUFHLFFBQVEsRUFBRSxXQUFXLEVBQUUsRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDO1lBQzFELE1BQU0sWUFBWSxHQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFbEQsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQ3hCLFFBQUEsSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFO0lBQ2xCLFlBQUEsUUFBUSxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7SUFDN0IsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ3pCO0lBRUQsUUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLFlBQVksRUFBRTtJQUM3QixZQUFBLElBQUksV0FBVyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUU7b0JBQ2hDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNyQixnQkFBQSxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNsQyxPQUFPLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO29CQUNuQyxPQUFPLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztvQkFDbkQsUUFBUSxHQUFHLE9BQU8sQ0FBQztJQUNuQixnQkFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUN6QjtJQUNELFlBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO0lBQ2hDLFlBQUEsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN2QjtZQUVELFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUVyQixTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7U0FDdkI7O0lBR08sSUFBQSxTQUFTLENBQUMsSUFBYSxFQUFBO1lBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNqQzs7UUFHTyxrQkFBa0IsR0FBQTtZQUN0QixNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDNUMsUUFBQSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDL0IsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUVqRSxRQUFBLElBQUksWUFBWSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7SUFDMUIsWUFBQSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUM3QyxZQUFBLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBb0IsS0FBSTtJQUMvRSxnQkFBQSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUNiLFdBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDbkUsZ0JBQUEsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLElBQUksU0FBUyxJQUFJLFNBQVMsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLEVBQUU7SUFDeEUsb0JBQUEsT0FBTyxJQUFJLENBQUM7cUJBQ2Y7eUJBQU07SUFDSCxvQkFBQSxPQUFPLEtBQUssQ0FBQztxQkFDaEI7SUFDTCxhQUFDLENBQUMsQ0FBQztJQUNILFlBQUEsWUFBWSxHQUFHQSxXQUFDLENBQUMsQ0FBQSxnQkFBQSxFQUFtQixPQUFPLENBQUMsZ0JBQWdCLENBQUEsR0FBQSxFQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUEsWUFBQSxDQUFjLENBQUM7cUJBQ2xHLE1BQU0sQ0FBQyxjQUFjLENBQUM7cUJBQ3RCLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN4QixZQUFBLE9BQU8sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDN0IsWUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNoQztJQUVELFFBQUEsT0FBTyxZQUFZLENBQUM7U0FDdkI7SUFDSjs7SUN2NUJELGlCQUFpQixNQUFNTSxhQUFXLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBbUIxRDs7O0lBR0c7SUFDRyxNQUFnQixRQUNsQixTQUFRQyxZQUFzQixDQUFBOztRQUdiLENBQUNELGFBQVcsRUFBYTs7SUFHMUMsSUFBQSxXQUFBLENBQVksT0FBNEMsRUFBQTtZQUNwRCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFZixRQUFBLE1BQU0sR0FBRyxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDQSxhQUFXLENBQXdCLEdBQUc7SUFDeEMsWUFBQSxPQUFPLEVBQUUsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO2FBQ2pCLENBQUM7SUFFZCxRQUFBLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUEyQixDQUFDO0lBQ2hFLFFBQUEsSUFBSSxHQUFHLENBQUMsYUFBYSxFQUFFO0lBQ25CLFlBQUEsSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQzthQUM5RDtTQUNKOztJQUdELElBQUEsSUFBSSxPQUFPLEdBQUE7SUFDUCxRQUFBLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUM7U0FDcEM7SUFRRDs7Ozs7Ozs7SUFRRztJQUNNLElBQUEsVUFBVSxDQUFDLEVBQWtDLEVBQUE7SUFDbEQsUUFBQSxJQUFJLElBQUksQ0FBQ0EsYUFBVyxDQUFDLEVBQUU7Z0JBQ25CLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDO0lBQ3RDLFlBQUEsTUFBTSxHQUFHLEdBQUdOLFdBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEIsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsQixPQUFPLENBQUMsVUFBVSxDQUFDLEdBQXVCLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7YUFDN0Q7SUFDRCxRQUFBLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUMvQjtJQUVEOzs7O0lBSUc7UUFDTSxNQUFNLEdBQUE7WUFDWCxJQUFJLENBQUNNLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQyxRQUFBLE9BQU8sS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ3pCOzs7SUFLRDs7Ozs7OztJQU9HO1FBQ0gsYUFBYSxHQUFBO1lBQ1QsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUNwRDtJQUVEOzs7Ozs7Ozs7Ozs7Ozs7O0lBZ0JHO0lBQ0gsSUFBQSxPQUFPLENBQUMsTUFBYyxFQUFFLFdBQXFDLEVBQUUsSUFBbUIsRUFBRSxRQUFpQixFQUFBO1lBQ2pHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNqRztJQUVEOzs7Ozs7Ozs7OztJQVdHO1FBQ0gsUUFBUSxDQUFDLElBQWlDLEVBQUUsUUFBaUIsRUFBQTtJQUN6RCxRQUFBLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDdEQ7SUErQkQsSUFBQSxVQUFVLENBQUMsS0FBd0IsRUFBRSxJQUFhLEVBQUUsSUFBYSxFQUFBO0lBQzdELFFBQUEsSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDckU7SUFFRDs7Ozs7OztJQU9HO0lBQ0gsSUFBQSxXQUFXLENBQUMsTUFBc0IsRUFBQTtZQUM5QixPQUFPLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN4RDtJQUVEOzs7SUFHRztRQUNILE9BQU8sR0FBQTtZQUNILElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BDLFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUVEOzs7SUFHRztRQUNILE1BQU0sR0FBQTtZQUNGLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ25DLFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUVEOzs7SUFHRztRQUNILE9BQU8sR0FBQTtZQUNILElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BDLFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUVEOzs7O0lBSUc7UUFDTSxPQUFPLEdBQUE7WUFDWixJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQyxRQUFBLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQzFCOzs7SUFLQTs7O0lBR0U7SUFDSCxJQUFBLElBQUksU0FBUyxHQUFBO1lBQ1QsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDOUM7SUFFQTs7O0lBR0c7SUFDSixJQUFBLElBQUksWUFBWSxHQUFBO1lBQ1osT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7U0FDakQ7SUFFQTs7Ozs7Ozs7OztJQVVFO1FBQ0gsZ0JBQWdCLENBQUMsT0FBeUIsRUFBRSxNQUFvQixFQUFBO0lBQzVELFFBQUEsSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQy9EO0lBRUQ7Ozs7Ozs7Ozs7SUFVRztRQUNILG9CQUFvQixDQUFDLE9BQXlCLEVBQUUsTUFBb0IsRUFBQTtJQUNoRSxRQUFBLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztTQUNuRTtJQUVEOzs7Ozs7Ozs7Ozs7O0lBYUc7SUFDSCxJQUFBLFFBQVEsQ0FBQyxHQUFXLEVBQUUsT0FBaUIsRUFBRSxJQUFhLEVBQUE7SUFDbEQsUUFBQSxPQUFPLElBQUksQ0FBQ0EsYUFBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ2pFO0lBRUQ7Ozs7Ozs7Ozs7SUFVRztRQUNILGFBQWEsQ0FBQyxLQUFhLEVBQUUsT0FBa0MsRUFBQTtJQUMzRCxRQUFBLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNsRTs7O0lBS0Q7Ozs7Ozs7Ozs7SUFVRztJQUNILElBQUEsTUFBTSxDQUFDLEdBQVcsRUFBQTtZQUNkLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2hEO0lBRUQ7Ozs7Ozs7Ozs7Ozs7SUFhRztRQUNILE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBZ0IsRUFBQTtJQUNqQyxRQUFBLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUMxRDtJQUVEOzs7Ozs7Ozs7O0lBVUc7SUFDSCxJQUFBLFNBQVMsQ0FBQyxHQUFXLEVBQUE7WUFDakIsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDbkQ7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ0gsSUFBQSxXQUFXLENBQUMsR0FBWSxFQUFBO1lBQ3BCLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3JEO0lBRUQ7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLFVBQVUsR0FBQTtZQUNWLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1NBQy9DO0lBQ0o7O0lDcFlELGlCQUFpQixNQUFNQSxhQUFXLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBb0IxRDs7O0lBR0c7SUFDRyxNQUFnQixzQkFDbEIsU0FBUSxZQUE4QixDQUFBOztRQUdyQixDQUFDQSxhQUFXLEVBQWE7O0lBRzFDLElBQUEsV0FBQSxDQUFZLE9BQTRELEVBQUE7WUFDcEUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2YsUUFBQSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQ3pCLFFBQUEsSUFBSSxDQUFDQSxhQUFXLENBQXdCLEdBQUcsRUFBRSxLQUFLLEVBQWMsQ0FBQztTQUNyRTs7O0lBS0Q7Ozs7Ozs7SUFPRztJQUNILElBQUEsSUFBYyxVQUFVLEdBQUE7WUFDcEIsT0FBTyxJQUFJLENBQUNBLGFBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7U0FDN0M7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQWMsV0FBVyxHQUFBO0lBQ3JCLFFBQUEsT0FBUSxJQUFJLENBQUMsS0FBNkIsQ0FBQyxXQUFXLENBQUM7U0FDMUQ7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQWMsWUFBWSxHQUFBO0lBQ3RCLFFBQUEsT0FBUSxJQUFJLENBQUMsS0FBNkIsQ0FBQyxZQUFZLENBQUM7U0FDM0Q7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQWMsV0FBVyxHQUFBO0lBQ3JCLFFBQUEsT0FBUSxJQUFJLENBQUMsS0FBNkIsQ0FBQyxXQUFXLENBQUM7U0FDMUQ7SUFFRDs7Ozs7Ozs7Ozs7O0lBWUc7SUFDTyxJQUFBLFdBQVcsQ0FBQyxTQUFrQixFQUFBO1lBQ3BDLE9BQU8sSUFBSSxDQUFDQSxhQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQ3pEO0lBQ0o7O0lDdkZEOzs7O0lBSUc7VUFDVSxVQUFVLENBQUE7SUFNRixJQUFBLE1BQU0sQ0FBeUI7OztRQUl4QyxVQUFVLEdBQWlDLEVBQUUsQ0FBQzs7UUFFOUMsYUFBYSxHQUFtQixFQUFFLENBQUM7O0lBRW5DLElBQUEsVUFBVSxDQUFVO0lBRTVCOzs7SUFHRztJQUNILElBQUEsV0FBQSxDQUFZLEtBQTZCLEVBQUE7SUFDckMsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztTQUN2Qjs7UUFHTSxPQUFPLEdBQUE7SUFDVixRQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLFFBQUEsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7U0FDM0I7Ozs7SUFNRCxJQUFBLFFBQVEsQ0FBQyxFQUFXLEVBQUE7WUFDaEIsRUFBRSxHQUFHLEVBQUUsSUFBSVEsWUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQzdCLFlBQUEsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNoRCxRQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzVCLFFBQUEsT0FBTyxLQUFLLENBQUM7U0FDaEI7O0lBR0QsSUFBQSxRQUFRLENBQUMsRUFBVSxFQUFBO0lBQ2YsUUFBQSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDOUI7O0lBR0QsSUFBQSxnQkFBZ0IsQ0FBQyxRQUFzQixFQUFBOztJQUVuQyxRQUFBLElBQUksWUFBWSxLQUFLLFFBQVEsQ0FBQyxNQUFNLEVBQUU7OztnQkFHbEMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNuQixPQUFPO2FBQ1Y7SUFFRCxRQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDcEUsTUFBTSxRQUFRLEdBQUcsU0FBUyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV4RCxRQUFBLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xDLFFBQUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUMvQjs7UUFHRCxZQUFZLEdBQUE7WUFDUixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3RDOztJQUdELElBQUEsTUFBTSxTQUFTLEdBQUE7WUFDWCxNQUFNLFNBQVMsR0FBb0IsRUFBRSxDQUFDO0lBQ3RDLFFBQUEsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUNwQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2FBQ2xDO0lBQ0QsUUFBQSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDaEM7O1FBR0QsTUFBTSxXQUFXLENBQUMsS0FBYyxFQUFBO1lBQzVCLE1BQU0sU0FBUyxHQUFvQixFQUFFLENBQUM7SUFDdEMsUUFBQSxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ3BDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQ3pDO0lBQ0QsUUFBQSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDaEM7O0lBR0QsSUFBQSxJQUFJLFdBQVcsR0FBQTtZQUNYLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDOUM7O0lBR0QsSUFBQSxJQUFJLFlBQVksR0FBQTtZQUNaLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDL0M7O0lBR0QsSUFBQSxJQUFJLFdBQVcsR0FBQTtJQUNYLFFBQUEsT0FBTyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUM7U0FDaEQ7Ozs7SUFNRCxJQUFBLElBQUksU0FBUyxHQUFBO1lBQ1QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1NBQzFCOztRQUdELElBQUksU0FBUyxDQUFDLEdBQVcsRUFBQTtJQUNyQixRQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDO1NBQ3pCOzs7O0lBTUQsSUFBQSxZQUFZLENBQUMsTUFBYyxFQUFBO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDM0M7O0lBR0QsSUFBQSxhQUFhLENBQUMsTUFBYyxFQUFBO1lBQ3hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDNUM7O1FBR0QsV0FBVyxDQUFJLE1BQWMsRUFBRSxRQUE4QixFQUFBO1lBQ3pELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3BEOztJQUdELElBQUEsVUFBVSxDQUFDLE1BQWMsRUFBQTtZQUNyQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3pDOzs7O0lBTUQsSUFBQSxNQUFNLENBQUMsR0FBVyxFQUFBO0lBQ2QsUUFBQSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ2hDLFFBQUEsSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUc7b0JBQ1gsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVO29CQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWE7aUJBQzNCLENBQUM7YUFDTDtJQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjs7SUFHRCxJQUFBLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBTyxHQUFHLElBQUksRUFBQTtZQUMvQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBa0IsQ0FBQztJQUNyRCxRQUFBLElBQUksSUFBSSxJQUFJLE1BQU0sRUFBRTtJQUNoQixZQUFBLE9BQU8sS0FBSyxDQUFDO2FBQ2hCO1lBRUQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUNsQjtJQUVELFFBQUEsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBbUMsQ0FBQztJQUM3RCxRQUFBLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLElBQXNCLENBQUM7O0lBR25ELFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFVLENBQUMsRUFBRTtJQUN6RCxZQUFBLE9BQU8sS0FBSyxDQUFDO2FBQ2hCOztJQUdELFFBQUEsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUNwQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDbkI7O0lBR0QsUUFBQSxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQyxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7O0lBR0QsSUFBQSxTQUFTLENBQUMsR0FBVyxFQUFBO1lBQ2pCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDckM7O0lBR0QsSUFBQSxXQUFXLENBQUMsR0FBWSxFQUFBO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDdkM7O0lBR0QsSUFBQSxJQUFJLFVBQVUsR0FBQTtJQUNWLFFBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztTQUNqQztJQUNKOztJQ3pNRCxpQkFBaUIsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBTzFEO0lBRUE7OztJQUdHO0lBQ0csTUFBZ0Isa0JBQ2xCLFNBQVEsUUFBMEIsQ0FBQTs7UUFHakIsQ0FBQyxXQUFXLEVBQWE7O0lBRzFDLElBQUEsV0FBQSxDQUFZLE9BQTRDLEVBQUE7WUFDcEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2QsSUFBSSxDQUFDLFdBQVcsQ0FBd0IsR0FBRztJQUN4QyxZQUFBLE9BQU8sRUFBRSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUM7YUFDcEIsQ0FBQztTQUNqQjs7O0lBS0Q7Ozs7Ozs7SUFPRztJQUNILElBQUEsUUFBUSxDQUFDLEVBQVcsRUFBQTtZQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2pEO0lBRUQ7Ozs7Ozs7SUFPRztJQUNILElBQUEsUUFBUSxDQUFDLEVBQVUsRUFBQTtZQUNmLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDakQ7SUFFRDs7Ozs7OztJQU9HO0lBQ0gsSUFBQSxnQkFBZ0IsQ0FBQyxRQUFzQixFQUFBO1lBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDeEQ7SUFFRDs7Ozs7SUFLRztRQUNILFlBQVksR0FBQTtZQUNSLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUNuRDtJQUVEOzs7SUFHRztRQUNILFNBQVMsR0FBQTtZQUNMLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNoRDtJQUVEOzs7SUFHRztJQUNILElBQUEsV0FBVyxDQUFDLEtBQWMsRUFBQTtZQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3ZEO0lBRUQ7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLFdBQVcsR0FBQTtZQUNYLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDaEQ7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQUksWUFBWSxHQUFBO1lBQ1osT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztTQUNqRDtJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBSSxXQUFXLEdBQUE7WUFDWCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ2hEO0lBRUQ7Ozs7Ozs7Ozs7SUFVRztJQUNILElBQUEsWUFBWSxDQUFDLE1BQWMsRUFBQTtJQUN2QixRQUFBLE9BQU9DLG9CQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDL0I7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ0gsSUFBQSxhQUFhLENBQUMsTUFBYyxFQUFBO0lBQ3hCLFFBQUEsT0FBT0MscUJBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNoQztJQUVEOzs7Ozs7Ozs7Ozs7O0lBYUc7UUFDSCxXQUFXLENBQUksTUFBYyxFQUFFLFFBQThCLEVBQUE7SUFDekQsUUFBQSxPQUFPQyxtQkFBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztTQUN4QztJQUVEOzs7Ozs7Ozs7OztJQVdHO0lBQ0gsSUFBQSxVQUFVLENBQUMsTUFBYyxFQUFBO0lBQ3JCLFFBQUEsT0FBT0Msa0JBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM3Qjs7SUFHRCxJQUFBLElBQUksU0FBUyxHQUFBO1lBQ1QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUM5Qzs7UUFHRCxJQUFJLFNBQVMsQ0FBQyxHQUFXLEVBQUE7WUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1NBQzdDOzs7SUFLRDs7OztJQUlHO1FBQ00sT0FBTyxHQUFBO1lBQ1osS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEMsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0lBRUQ7Ozs7Ozs7Ozs7O0lBV0c7SUFDTSxJQUFBLE1BQU0sQ0FBQyxHQUFXLEVBQUE7WUFDdkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNoRDtJQUVEOzs7Ozs7Ozs7Ozs7OztJQWNHO0lBQ00sSUFBQSxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQU8sR0FBRyxJQUFJLEVBQUE7SUFDeEMsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUMxRDtJQUNKOztJQ2pQRDtBQUNPLFVBQU0sa0JBQWtCLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdWktbGlzdHZpZXcvIn0=