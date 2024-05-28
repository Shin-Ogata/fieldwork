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
        WRAPPER_CLASS: "cdp-ui-listview-wrapper" /* DefaultV.WRAPPER_CLASS */,
        WRAPPER_SELECTOR: ".cdp-ui-listview-wrapper" /* DefaultV.WRAPPER_SELECTOR */,
        SCROLL_MAP_CLASS: "cdp-ui-listview-scroll-map" /* DefaultV.SCROLL_MAP_CLASS */,
        SCROLL_MAP_SELECTOR: ".cdp-ui-listview-scroll-map" /* DefaultV.SCROLL_MAP_SELECTOR */,
        INACTIVE_CLASS: "inactive" /* DefaultV.INACTIVE_CLASS */,
        INACTIVE_CLASS_SELECTOR: ".inactive" /* DefaultV.INACTIVE_CLASS_SELECTOR */,
        RECYCLE_CLASS: "cdp-ui-listview-recycle" /* DefaultV.RECYCLE_CLASS */,
        RECYCLE_CLASS_SELECTOR: ".cdp-ui-listview-recycle" /* DefaultV.RECYCLE_CLASS_SELECTOR */,
        LISTITEM_BASE_CLASS: "cdp-ui-listview-item-base" /* DefaultV.LISTITEM_BASE_CLASS */,
        LISTITEM_BASE_CLASS_SELECTOR: ".cdp-ui-listview-item-base" /* DefaultV.LISTITEM_BASE_CLASS_SELECTOR */,
        DATA_PAGE_INDEX: "data-cdp-ui-page-index" /* DefaultV.DATA_PAGE_INDEX */,
        DATA_CONTAINER_INDEX: "data-cdp-ui-container-index" /* DefaultV.DATA_CONTAINER_INDEX */,
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
                // TODO:  要件等. <li> 全般は <slot> と同強調するか?
                $base = runtime.dom(`<${itemTagName} class="${this._config.LISTITEM_BASE_CLASS}"></"${itemTagName}">`);
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
        updateIndex() {
            if (this._$base && this._$base.attr(this._config.DATA_CONTAINER_INDEX) !== String(this._index)) {
                this._$base.attr(this._config.DATA_CONTAINER_INDEX, this._index);
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
        getIndex() {
            return this[_properties$3].item.index;
        }
        /**
         * @en Get specified height.
         * @ja 指定された高さを取得
         */
        getHeight() {
            return this[_properties$3].item.height;
        }
        /**
         * @en Check if child node exists.
         * @ja child node が存在するか判定
         */
        hasChildNode() {
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
            if (this.$el && this.getHeight() !== newHeight) {
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
                    return Number($target.attr(_config.DATA_CONTAINER_INDEX));
                }
                else if ($target.hasClass(_config.SCROLL_MAP_CLASS) || $target.length <= 0) {
                    console.warn('cannot ditect item from event object.');
                    return NaN;
                }
                else {
                    return parser($target.parent());
                }
            };
            const index = target instanceof Event ? parser(runtime.dom(target.currentTarget)) : Number(target);
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
            if (opt.$el) {
                this.setElement(opt.$el);
            }
            else {
                const height = opt.initialHeight ?? this.$el.height();
                this[_properties$2].context.initialize(this.$el, height);
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
            const { context } = this[_properties$2];
            const $el = runtime.dom(el);
            context.destroy();
            context.initialize($el, $el.height());
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktbGlzdHZpZXcuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJnbG9iYWwtY29uZmlnLnRzIiwicHJvZmlsZS9pdGVtLnRzIiwicHJvZmlsZS9wYWdlLnRzIiwicHJvZmlsZS9ncm91cC50cyIsImxpc3QtaXRlbS12aWV3LnRzIiwiY29yZS9lbGVtZW50LXNjcm9sbGVyLnRzIiwiY29yZS9saXN0LnRzIiwibGlzdC12aWV3LnRzIiwiZXhwYW5kYWJsZS1saXN0LWl0ZW0tdmlldy50cyIsImNvcmUvZXhwYW5kLnRzIiwiZXhwYW5kYWJsZS1saXN0LXZpZXcudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFVJX0xJU1RWSUVXID0gKENEUF9LTk9XTl9NT0RVTEUuT0ZGU0VUICsgQ0RQX0tOT1dOX1VJX01PRFVMRS5MSVNUVklFVykgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgVUlfTElTVFZJRVdfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9JTklUSUFMSVpBVElPTiA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMSwgJ2xpc3R2aWV3IGhhcyBpbnZhbGlkIGluaXRpYWxpemF0aW9uLicpLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAyLCAnbGlzdHZpZXcgZ2l2ZW4gYSBpbnZhbGlkIHBhcmFtLicpLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX09QRVJBVElPTiAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAzLCAnbGlzdHZpZXcgaW52YWxpZCBvcGVyYXRpb24uJyksXG4gICAgfVxufVxuIiwiLyoqXG4gKiBAZW4gR2xvYmFsIGNvbmZpZ3VyYXRpb24gZGVmaW5pdGlvbiBmb3IgbGlzdCB2aWV3cy5cbiAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjga7jgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjg6zjg7zjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgTkFNRVNQQUNFOiBzdHJpbmc7XG4gICAgV1JBUFBFUl9DTEFTUzogc3RyaW5nO1xuICAgIFdSQVBQRVJfU0VMRUNUT1I6IHN0cmluZztcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBzdHJpbmc7XG4gICAgU0NST0xMX01BUF9TRUxFQ1RPUjogc3RyaW5nO1xuICAgIElOQUNUSVZFX0NMQVNTOiBzdHJpbmc7XG4gICAgSU5BQ1RJVkVfQ0xBU1NfU0VMRUNUT1I6IHN0cmluZztcbiAgICBSRUNZQ0xFX0NMQVNTOiBzdHJpbmc7XG4gICAgUkVDWUNMRV9DTEFTU19TRUxFQ1RPUjogc3RyaW5nO1xuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IHN0cmluZztcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTX1NFTEVDVE9SOiBzdHJpbmc7XG4gICAgREFUQV9QQUdFX0lOREVYOiBzdHJpbmc7XG4gICAgREFUQV9DT05UQUlORVJfSU5ERVg6IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZWZhdWx0ViB7XG4gICAgTkFNRVNQQUNFICAgICAgICAgICAgICAgICAgICA9ICdjZHAtdWknLFxuICAgIFdSQVBQRVJfQ0xBU1MgICAgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXdyYXBwZXJgLFxuICAgIFdSQVBQRVJfU0VMRUNUT1IgICAgICAgICAgICAgPSBgLiR7V1JBUFBFUl9DTEFTU31gLFxuICAgIFNDUk9MTF9NQVBfQ0xBU1MgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXNjcm9sbC1tYXBgLFxuICAgIFNDUk9MTF9NQVBfU0VMRUNUT1IgICAgICAgICAgPSBgLiR7U0NST0xMX01BUF9DTEFTU31gLFxuICAgIElOQUNUSVZFX0NMQVNTICAgICAgICAgICAgICAgPSAnaW5hY3RpdmUnLFxuICAgIElOQUNUSVZFX0NMQVNTX1NFTEVDVE9SICAgICAgPSBgLiR7SU5BQ1RJVkVfQ0xBU1N9YCxcbiAgICBSRUNZQ0xFX0NMQVNTICAgICAgICAgICAgICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1yZWN5Y2xlYCxcbiAgICBSRUNZQ0xFX0NMQVNTX1NFTEVDVE9SICAgICAgID0gYC4ke1JFQ1lDTEVfQ0xBU1N9YCxcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTICAgICAgICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1pdGVtLWJhc2VgLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1NfU0VMRUNUT1IgPSBgLiR7TElTVElURU1fQkFTRV9DTEFTU31gLFxuICAgIERBVEFfUEFHRV9JTkRFWCAgICAgICAgICAgICAgPSBgZGF0YS0ke05BTUVTUEFDRX0tcGFnZS1pbmRleGAsXG4gICAgREFUQV9DT05UQUlORVJfSU5ERVggICAgICAgICA9IGBkYXRhLSR7TkFNRVNQQUNFfS1jb250YWluZXItaW5kZXhgLFxufVxuXG5jb25zdCBfY29uZmlnID0ge1xuICAgIE5BTUVTUEFDRTogRGVmYXVsdFYuTkFNRVNQQUNFLFxuICAgIFdSQVBQRVJfQ0xBU1M6IERlZmF1bHRWLldSQVBQRVJfQ0xBU1MsXG4gICAgV1JBUFBFUl9TRUxFQ1RPUjogRGVmYXVsdFYuV1JBUFBFUl9TRUxFQ1RPUixcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBEZWZhdWx0Vi5TQ1JPTExfTUFQX0NMQVNTLFxuICAgIFNDUk9MTF9NQVBfU0VMRUNUT1I6IERlZmF1bHRWLlNDUk9MTF9NQVBfU0VMRUNUT1IsXG4gICAgSU5BQ1RJVkVfQ0xBU1M6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTLFxuICAgIElOQUNUSVZFX0NMQVNTX1NFTEVDVE9SOiBEZWZhdWx0Vi5JTkFDVElWRV9DTEFTU19TRUxFQ1RPUixcbiAgICBSRUNZQ0xFX0NMQVNTOiBEZWZhdWx0Vi5SRUNZQ0xFX0NMQVNTLFxuICAgIFJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1I6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1IsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogRGVmYXVsdFYuTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTX1NFTEVDVE9SOiBEZWZhdWx0Vi5MSVNUSVRFTV9CQVNFX0NMQVNTX1NFTEVDVE9SLFxuICAgIERBVEFfUEFHRV9JTkRFWDogRGVmYXVsdFYuREFUQV9QQUdFX0lOREVYLFxuICAgIERBVEFfQ09OVEFJTkVSX0lOREVYOiBEZWZhdWx0Vi5EQVRBX0NPTlRBSU5FUl9JTkRFWCxcbn07XG5cbi8qKlxuICogQGVuIEdldC9VcGRhdGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gb2YgbGlzdCB2aWV3LlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+OBruWPluW+ly/mm7TmlrBcbiAqL1xuZXhwb3J0IGNvbnN0IExpc3RWaWV3R2xvYmFsQ29uZmlnID0gKG5ld0NvbmZpZz86IFBhcnRpYWw8TGlzdFZpZXdHbG9iYWxDb25maWc+KTogTGlzdFZpZXdHbG9iYWxDb25maWcgPT4ge1xuICAgIGlmIChuZXdDb25maWcpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMobmV3Q29uZmlnKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gbmV3Q29uZmlnW2tleSBhcyBrZXlvZiBMaXN0Vmlld0dsb2JhbENvbmZpZ10pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgbmV3Q29uZmlnW2tleSBhcyBrZXlvZiBMaXN0Vmlld0dsb2JhbENvbmZpZ107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIF9jb25maWcsIG5ld0NvbmZpZyk7XG59O1xuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB7IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyB9IGZyb20gJ0BjZHAvdWktdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBJTGlzdENvbnRleHQgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2Jhc2UnO1xuaW1wb3J0IHR5cGUgeyBJTGlzdEl0ZW1WaWV3LCBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB7IExpc3RWaWV3R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vZ2xvYmFsLWNvbmZpZyc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBsaXN0IGl0ZW1zLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEl0ZW1Qcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luaXRpYWxpemVyOiBuZXcgKG9wdGlvbnM/OiBVbmtub3duT2JqZWN0KSA9PiBJTGlzdEl0ZW1WaWV3O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pbmZvOiBVbmtub3duT2JqZWN0O1xuICAgIC8qKiBAaW50ZXJuYWwgZ2xvYmFsIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgYmVsb25naW5nIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9wYWdlSW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgZ2xvYmFsIG9mZnNldCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBiYXNlIGRvbSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgXyRiYXNlPzogRE9NO1xuICAgIC8qKiBAaW50ZXJuYWwgSUxpc3RJdGVtVmlldyBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX2luc3RhbmNlPzogSUxpc3RJdGVtVmlldztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJTGlzdFZpZXdDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7liJ3mnJ/jga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElMaXN0Q29udGV4dCwgaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBuZXcgKG9wdGlvbnM/OiBVbmtub3duT2JqZWN0KSA9PiBJTGlzdEl0ZW1WaWV3LCBfaW5mbzogVW5rbm93bk9iamVjdCkge1xuICAgICAgICB0aGlzLl9vd25lciAgICAgICA9IG93bmVyO1xuICAgICAgICB0aGlzLl9oZWlnaHQgICAgICA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZXIgPSBpbml0aWFsaXplcjtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgICAgPSBfaW5mbztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKiogR2V0IHRoZSBpdGVtJ3MgaGVpZ2h0LiAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBpdGVtJ3MgZ2xvYmFsIGluZGV4LiAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgaXRlbSdzIGdsb2JhbCBpbmRleC4gKi9cbiAgICBzZXQgaW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnVwZGF0ZUluZGV4KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBiZWxvbmdpbmcgdGhlIHBhZ2UgaW5kZXguICovXG4gICAgZ2V0IHBhZ2VJbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFnZUluZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgYmVsb25naW5nIHRoZSBwYWdlIGluZGV4LiAqL1xuICAgIHNldCBwYWdlSW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9wYWdlSW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSW5kZXgoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGdsb2JhbCBvZmZzZXQuICovXG4gICAgZ2V0IG9mZnNldCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBTZXQgZ2xvYmFsIG9mZnNldC4gKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICAgICAgdGhpcy51cGRhdGVPZmZzZXQoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGluaXQgcGFyYW1ldGVycy4gKi9cbiAgICBnZXQgaW5mbygpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWN0aXZhdGUgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UgPSB0aGlzLnByZXBhcmVCYXNlRWxlbWVudCgpO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgICAgIGVsOiB0aGlzLl8kYmFzZSxcbiAgICAgICAgICAgICAgICBvd25lcjogdGhpcy5fb3duZXIsXG4gICAgICAgICAgICAgICAgbGluZVByb2ZpbGU6IHRoaXMsXG4gICAgICAgICAgICB9LCB0aGlzLl9pbmZvKTtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlID0gbmV3IHRoaXMuX2luaXRpYWxpemVyKG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCdub25lJyA9PT0gdGhpcy5fJGJhc2UuY3NzKCdkaXNwbGF5JykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VJbmRleCgpO1xuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgJ3Zpc2libGUnICE9PSB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknKSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNYWtlIHRoZSBpdGVtIGludmlzaWJsZS5cbiAgICAgKiBAamEgaXRlbSDjga7kuI3lj6/oppbljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGlkZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgJ2hpZGRlbicgIT09IHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVhY3RpdmF0ZSBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7pnZ7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uYWRkQ2xhc3ModGhpcy5fY29uZmlnLlJFQ1lDTEVfQ0xBU1MpO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWZyZXNoIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBruabtOaWsFxuICAgICAqL1xuICAgIHB1YmxpYyByZWZyZXNoKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UucmVuZGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGFjdGl2YXRpb24gc3RhdHVzIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrua0u+aAp+eKtuaFi+WIpOWumlxuICAgICAqL1xuICAgIHB1YmxpYyBpc0FjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5faW5zdGFuY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBoZWlnaHQgaW5mb3JtYXRpb24gb2YgdGhlIGl0ZW0uIENhbGxlZCBmcm9tIHtAbGluayBMaXN0SXRlbVZpZXd9LlxuICAgICAqIEBqYSBpdGVtIOOBrumrmOOBleaDheWgseOBruabtOaWsC4ge0BsaW5rIExpc3RJdGVtVmlld30g44GL44KJ44Kz44O844Or44GV44KM44KL44CCXG4gICAgICovXG4gICAgcHVibGljIHVwZGF0ZUhlaWdodChuZXdIZWlnaHQ6IG51bWJlciwgb3B0aW9ucz86IExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyk6IHZvaWQge1xuICAgICAgICBjb25zdCBkZWx0YSA9IG5ld0hlaWdodCAtIHRoaXMuX2hlaWdodDtcbiAgICAgICAgdGhpcy5faGVpZ2h0ID0gbmV3SGVpZ2h0O1xuICAgICAgICB0aGlzLl9vd25lci51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGEpO1xuICAgICAgICBpZiAob3B0aW9ucz8ucmVmbGVjdEFsbCkge1xuICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlUHJvZmlsZXModGhpcy5faW5kZXgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHotaW5kZXguIENhbGxlZCBmcm9tIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYC5cbiAgICAgKiBAamEgei1pbmRleCDjga7jg6rjgrvjg4Pjg4guIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYCDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXREZXB0aCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ3otaW5kZXgnLCB0aGlzLl9vd25lci5vcHRpb25zLmJhc2VEZXB0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcHJlcGFyZUJhc2VFbGVtZW50KCk6IERPTSB7XG4gICAgICAgIGxldCAkYmFzZTogRE9NO1xuICAgICAgICBjb25zdCAkcmVjeWNsZSA9IHRoaXMuX293bmVyLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5maXJzdCgpO1xuICAgICAgICBjb25zdCBpdGVtVGFnTmFtZSA9IHRoaXMuX293bmVyLm9wdGlvbnMuaXRlbVRhZ05hbWU7XG5cbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybigndGhpcy5fJGJhc2UgaXMgbm90IG51bGwuJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fJGJhc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8ICRyZWN5Y2xlLmxlbmd0aCkge1xuICAgICAgICAgICAgJGJhc2UgPSAkcmVjeWNsZTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUF0dHIoJ3otaW5kZXgnKTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUNsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86ICDopoHku7bnrYkuIDxsaT4g5YWo6Iis44GvIDxzbG90PiDjgajlkIzlvLfoqr/jgZnjgovjgYs/XG4gICAgICAgICAgICAkYmFzZSA9ICQoYDwke2l0ZW1UYWdOYW1lfSBjbGFzcz1cIiR7dGhpcy5fY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1N9XCI+PC9cIiR7aXRlbVRhZ05hbWV9XCI+YCk7XG4gICAgICAgICAgICAkYmFzZS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuJHNjcm9sbE1hcC5hcHBlbmQoJGJhc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g6auY44GV44Gu5pu05pawXG4gICAgICAgIGlmICgkYmFzZS5oZWlnaHQoKSAhPT0gdGhpcy5faGVpZ2h0KSB7XG4gICAgICAgICAgICAkYmFzZS5oZWlnaHQodGhpcy5faGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGluZGV4IOOBruioreWumlxuICAgICAgICB0aGlzLnVwZGF0ZUluZGV4KCk7XG4gICAgICAgIC8vIG9mZnNldCDjga7mm7TmlrBcbiAgICAgICAgdGhpcy51cGRhdGVPZmZzZXQoKTtcblxuICAgICAgICByZXR1cm4gJGJhc2U7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0NPTlRBSU5FUl9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9pbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfQ09OVEFJTkVSX0lOREVYLCB0aGlzLl9pbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVQYWdlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpICE9PSBTdHJpbmcodGhpcy5fcGFnZUluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9QQUdFX0lOREVYLCB0aGlzLl9wYWdlSW5kZXgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlT2Zmc2V0KCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fb3duZXIub3B0aW9ucy5lbmFibGVUcmFuc2Zvcm1PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKHRoaXMuXyRiYXNlWzBdKTtcbiAgICAgICAgICAgIGlmICh0cmFuc2xhdGVZICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7dGhpcy5fb2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IHBhcnNlSW50KHRoaXMuXyRiYXNlLmNzcygndG9wJyksIDEwKTtcbiAgICAgICAgICAgIGlmICh0b3AgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndG9wJywgYCR7dGhpcy5fb2Zmc2V0fXB4YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBhdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIG9uZSBwYWdlIG9mIHRoZSBsaXN0LlxuICogQGphIOODquOCueODiDHjg5rjg7zjgrjliIbjga4gVUkg5qeL6YCg5oOF5aCx44KS5qC857SN44GZ44KL44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBQYWdlUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBvZmZzZXQgZnJvbSB0b3AgKi9cbiAgICBwcml2YXRlIF9vZmZzZXQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSdzIGhlaWdodCAqL1xuICAgIHByaXZhdGUgX2hlaWdodCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBpdGVtJ3MgcHJvZmlsZSBtYW5hZ2VkIHdpdGggaW4gcGFnZSAqL1xuICAgIHByaXZhdGUgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIHN0YXR1cyAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicgPSAnaW5hY3RpdmUnO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGhlaWdodCAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIHN0YXR1cyAqL1xuICAgIGdldCBzdGF0dXMoKTogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdhY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgcGFnZSBpbnZpc2libGUuXG4gICAgICogQGphIHBhZ2Ug44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaGlkZGVuJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaGlkZGVuJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVhY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7pnZ7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdpbmFjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBJdGVtUHJvZmlsZX0gdG8gdGhlIHBhZ2UuXG4gICAgICogQGphIHtAbGluayBJdGVtUHJvZmlsZX0g44Gu6L+95YqgXG4gICAgICovXG4gICAgcHVibGljIHB1c2goaXRlbTogSXRlbVByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICs9IGl0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJZiBhbGwge0BsaW5rIEl0ZW1Qcm9maWxlfSB1bmRlciB0aGUgcGFnZSBhcmUgbm90IHZhbGlkLCBkaXNhYmxlIHRoZSBwYWdlJ3Mgc3RhdHVzLlxuICAgICAqIEBqYSDphY3kuIvjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgZnjgbnjgabjgYzmnInlirnjgafjgarjgYTloLTlkIgsIHBhZ2Ug44K544OG44O844K/44K544KS54Sh5Yq544Gr44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIG5vcm1hbGl6ZSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW5hYmxlQWxsID0gdGhpcy5faXRlbXMuZXZlcnkoaXRlbSA9PiBpdGVtLmlzQWN0aXZlKCkpO1xuICAgICAgICBpZiAoIWVuYWJsZUFsbCkge1xuICAgICAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIEl0ZW1Qcm9maWxlfSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6a44GX44GmIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW0oaW5kZXg6IG51bWJlcik6IEl0ZW1Qcm9maWxlIHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX2l0ZW1zLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBmaXJzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDliJ3jga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUZpcnN0KCk6IEl0ZW1Qcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zWzBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDlvozjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUxhc3QoKTogSXRlbVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlbXNbdGhpcy5faXRlbXMubGVuZ3RoIC0gMV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7IElMaXN0SXRlbVZpZXcgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvZXhwYW5kYWJsZS1jb250ZXh0JztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuY29uc3QgZW51bSBMYXlvdXRLZXkge1xuICAgIERFRkFVTFQgPSAnbGF5b3V0LWRlZmF1bHQnLFxufVxuXG4vKipcbiAqIEBlbiBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gc3RvcmFnZSBjbGFzcyBmb3IgZ3JvdXAgbWFuYWdlbWVudCBvZiBsaXN0IGl0ZW1zLiA8YnI+XG4gKiAgICAgVGhpcyBjbGFzcyBkb2VzIG5vdCBkaXJlY3RseSBtYW5pcHVsYXRlIHRoZSBET00uXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44KS44Kw44Or44O844OX566h55CG44GZ44KLIFVJIOani+mAoOaDheWgseagvOe0jeOCr+ODqeOCuSA8YnI+XG4gKiAgICAg5pys44Kv44Op44K544Gv55u05o6l44GvIERPTSDjgpLmk43kvZzjgZfjgarjgYRcbiAqL1xuZXhwb3J0IGNsYXNzIEdyb3VwUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwcm9maWxlIGlkICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaWQ6IHN0cmluZztcbiAgICAvKiogQGludGVybmFsIHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9IGluc3RhbmNlKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsIHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX3BhcmVudD86IEdyb3VwUHJvZmlsZTtcbiAgICAvKiogQGludGVybmFsIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9IGFycmF5ICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMgKi9cbiAgICBwcml2YXRlIF9leHBhbmRlZCA9IGZhbHNlO1xuICAgIC8qKiBAaW50ZXJuYWwgcmVnaXN0cmF0aW9uIHN0YXR1cyBmb3IgX293bmVyICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyA9ICd1bnJlZ2lzdGVyZWQnO1xuICAgIC8qKiBAaW50ZXJuYWwgc3RvcmVkIHtAbGluayBJdGVtUHJvZmlsZX0gaW5mb3JtYXRpb24gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9tYXBJdGVtczogUmVjb3JkPHN0cmluZywgSXRlbVByb2ZpbGVbXT4gPSB7fTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJRXhwYW5kYWJsZUxpc3RDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgaWQgb2YgdGhlIGluc3RhbmNlLiBzcGVjaWZpZWQgYnkgdGhlIGZyYW1ld29yay5cbiAgICAgKiAgLSBgamFgIOOCpOODs+OCueOCv+ODs+OCueOBriBJRC4g44OV44Os44O844Og44Ov44O844Kv44GM5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQsIGlkOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5faWQgICAgPSBpZDtcbiAgICAgICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbiAgICAgICAgdGhpcy5fbWFwSXRlbXNbTGF5b3V0S2V5LkRFRkFVTFRdID0gW107XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBJRC5cbiAgICAgKiBAamEgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAZW4gR2V0IHN0YXR1cy4gJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCdcbiAgICAgKiBAamEg44K544OG44O844K/44K544KS5Y+W5b6XICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnXG4gICAgICovXG4gICAgZ2V0IHN0YXR1cygpOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cy5cbiAgICAgKiBAamEg5bGV6ZaL54q25oWL44KS5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhwYW5kZWQsIGNvbGxhcHNlZDogY2xvc2VcbiAgICAgKiAgLSBgamFgIHRydWU6IOWxlemWiywgZmFsc2U6IOWPjuadn1xuICAgICAqL1xuICAgIGdldCBpc0V4cGFuZGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXhwYW5kZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBwYXJlbnQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOimqiB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgcGFyZW50KCk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjaGlsZHJlbiB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBjaGlsZHJlbigpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG5leHQgYXZhaWxhYmxlIGluZGV4IG9mIHRoZSBsYXN0IGl0ZW0gZWxlbWVudC5cbiAgICAgKiBAamEg5pyA5b6M44GuIGl0ZW0g6KaB57Sg44Gu5qyh44Gr5L2/55So44Gn44GN44KLIGluZGV4IOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHdpdGhBY3RpdmVDaGlsZHJlbiBcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byBzZWFyY2ggaW5jbHVkaW5nIHJlZ2lzdGVyZWQgY2hpbGQgZWxlbWVudHNcbiAgICAgKiAgLSBgamFgIOeZu+mMsua4iOOBv+OBruWtkOimgee0oOOCkuWQq+OCgeOBpuaknOe0ouOBmeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBnZXROZXh0SXRlbUluZGV4KHdpdGhBY3RpdmVDaGlsZHJlbiA9IGZhbHNlKTogbnVtYmVyIHtcbiAgICAgICAgbGV0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGlmICh3aXRoQWN0aXZlQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgPT0gaXRlbXMgfHwgaXRlbXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGl0ZW1zID0gdGhpcy5faXRlbXM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChpdGVtc1tpdGVtcy5sZW5ndGggLSAxXT8uaW5kZXggPz8gMCkgKyAxO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEg5pysIEdyb3VwUHJvZmlsZSDjgYznrqHnkIbjgZnjgosgaXRlbSDjgpLkvZzmiJDjgZfjgabnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICogQHBhcmFtIGxheW91dEtleVxuICAgICAqICAtIGBlbmAgaWRlbnRpZmllciBmb3IgZWFjaCBsYXlvdXRcbiAgICAgKiAgLSBgamFgIOODrOOCpOOCouOCpuODiOavjuOBruitmOWIpeWtkFxuICAgICAqL1xuICAgIHB1YmxpYyBhZGRJdGVtKFxuICAgICAgICBoZWlnaHQ6IG51bWJlcixcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5ldyAob3B0aW9ucz86IFVua25vd25PYmplY3QpID0+IElMaXN0SXRlbVZpZXcsXG4gICAgICAgIGluZm86IFVua25vd25PYmplY3QsXG4gICAgICAgIGxheW91dEtleT86IHN0cmluZyxcbiAgICApOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBsYXlvdXRLZXkgPSBsYXlvdXRLZXkgPz8gTGF5b3V0S2V5LkRFRkFVTFQ7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHsgZ3JvdXBQcm9maWxlOiB0aGlzIH0sIGluZm8pO1xuXG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX21hcEl0ZW1zW2xheW91dEtleV0pIHtcbiAgICAgICAgICAgIHRoaXMuX21hcEl0ZW1zW2xheW91dEtleV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBuZXcgSXRlbVByb2ZpbGUodGhpcy5fb3duZXIuY29udGV4dCwgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgb3B0aW9ucyk7XG5cbiAgICAgICAgLy8gX293bmVyIOOBrueuoeeQhuS4i+OBq+OBguOCi+OBqOOBjeOBr+mAn+OChOOBi+OBq+i/veWKoFxuICAgICAgICBpZiAoKCdyZWdpc3RlcmVkJyA9PT0gdGhpcy5fc3RhdHVzKSAmJiAobnVsbCA9PSB0aGlzLl9vd25lci5sYXlvdXRLZXkgfHwgbGF5b3V0S2V5ID09PSB0aGlzLl9vd25lci5sYXlvdXRLZXkpKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtLCB0aGlzLmdldE5leHRJdGVtSW5kZXgoKSk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9tYXBJdGVtc1tsYXlvdXRLZXldLnB1c2goaXRlbSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBhcyBjaGlsZCBlbGVtZW50LlxuICAgICAqIEBqYSDlrZDopoHntKDjgajjgZfjgaYge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlIC8gaW5zdGFuY2UgYXJyYXlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkQ2hpbGRyZW4odGFyZ2V0OiBHcm91cFByb2ZpbGUgfCBHcm91cFByb2ZpbGVbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBjaGlsZHJlbjogR3JvdXBQcm9maWxlW10gPSBBcnJheS5pc0FycmF5KHRhcmdldCkgPyB0YXJnZXQgOiBbdGFyZ2V0XTtcbiAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgICAgICAgY2hpbGQuc2V0UGFyZW50KHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuLnB1c2goLi4uY2hpbGRyZW4pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIGlmIGl0IGhhcyBhIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9LiA8YnI+XG4gICAgICogICAgIElmIGBsYXlvdXRLZXlgIGlzIHNwZWNpZmllZCwgd2hldGhlciB0aGUgbGF5b3V0IGluZm9ybWF0aW9uIG1hdGNoZXMgaXMgYWxzbyBhZGRlZCB0byB0aGUganVkZ21lbnQgY29uZGl0aW9uLlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aIDxicj5cbiAgICAgKiAgICAgYGxheW91dEtleWAg44GM5oyH5a6a44GV44KM44KM44Gw44CBbGF5b3V0IOaDheWgseOBjOS4gOiHtOOBl+OBpuOBhOOCi+OBi+OCguWIpOWumuadoeS7tuOBq+WKoOOBiOOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIGxheW91dEtleVxuICAgICAqICAtIGBlbmAgaWRlbnRpZmllciBmb3IgZWFjaCBsYXlvdXRcbiAgICAgKiAgLSBgamFgIOODrOOCpOOCouOCpuODiOavjuOBruitmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgcHVibGljIGhhc0NoaWxkcmVuKGxheW91dEtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAodGhpcy5fY2hpbGRyZW4ubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxheW91dEtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkcmVuLnNvbWUoY2hpbGQgPT4gY2hpbGQuaGFzTGF5b3V0S2V5T2YobGF5b3V0S2V5KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgdGhlIHNwZWNpZmllZCBgbGF5b3V0S2V5YCBleGlzdHMuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgbGF5b3V0S2V5YCDjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsYXlvdXRLZXlcbiAgICAgKiAgLSBgZW5gIGlkZW50aWZpZXIgZm9yIGVhY2ggbGF5b3V0XG4gICAgICogIC0gYGphYCDjg6zjgqTjgqLjgqbjg4jmr47jga7orZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzLCBmYWxzZTogdW5leGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSwgZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXNMYXlvdXRLZXlPZihsYXlvdXRLZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKG51bGwgIT0gdGhpcy5fbWFwSXRlbXNbbGF5b3V0S2V5XSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwIGV4cGFuc2lvbi5cbiAgICAgKiBAamEg44Kw44Or44O844OX5bGV6ZaLXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGV4cGFuZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgncmVnaXN0ZXJlZCcpO1xuICAgICAgICAgICAgaWYgKDAgPCBpdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9vd25lci5zdGF0dXNTY29wZSgnZXhwYW5kaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbXMsIHRoaXMuZ2V0TmV4dEl0ZW1JbmRleCgpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5bGV6ZaL54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgY29sbGFwc2UuXG4gICAgICogQGphIOOCsOODq+ODvOODl+WPjuadn1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGNvbGxhcHNlKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgndW5yZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gdGhpcy5fb3duZXIuY29udGV4dC5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdjb2xsYXBzaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIucmVtb3ZlSXRlbShpdGVtc1swXS5pbmRleCwgaXRlbXMubGVuZ3RoLCBkZWxheSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIOWtkOimgee0oOOBjOOBquOBj+OBpuOCguWPjuadn+eKtuaFi+OBq+OBmeOCi1xuICAgICAgICB0aGlzLl9leHBhbmRlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG93IHNlbGYgaW4gdmlzaWJsZSBhcmVhIG9mIGxpc3QuXG4gICAgICogQGphIOiHqui6q+OCkuODquOCueODiOOBruWPr+imlumgmOWfn+OBq+ihqOekulxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IG9wdGlvbidzIG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9vd25lci5lbnN1cmVWaXNpYmxlKHRoaXMuX2l0ZW1zWzBdLmluZGV4LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnM/LmNhbGxiYWNrPy4oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUb2dnbGUgZXhwYW5kIC8gY29sbGFwc2UuXG4gICAgICogQGphIOmWi+mWieOBruODiOOCsOODq1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHRvZ2dsZShkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5fZXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29sbGFwc2UoZGVsYXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5leHBhbmQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjgbjnmbvpjLIuIOesrDHpmo7lsaTjgrDjg6vjg7zjg5fjga7jgb/nmbvpjLLlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5zZXJ0aW9uIHBvc2l0aW9uIHdpdGggaW5kZXhcbiAgICAgKiAgLSBgamFgIOaMv+WFpeS9jee9ruOCkiBpbmRleCDjgafmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIoaW5zZXJ0VG86IG51bWJlcik6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3JlZ2lzdGVyJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKHRoaXMucHJlcHJvY2VzcygncmVnaXN0ZXJlZCcpLCBpbnNlcnRUbyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN0b3JlIHRvIGxpc3Qgdmlldy4gT25seSAxc3QgbGF5ZXIgZ3JvdXAgY2FuIGJlIHNwZWNpZmllZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G45b6p5YWDLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/5oyH56S65Y+v6IO9LlxuICAgICAqL1xuICAgIHB1YmxpYyByZXN0b3JlKCk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3Jlc3RvcmUnIG1ldGhvZCBpcyBhY2NlcHRhYmxlIG9ubHkgMXN0IGxheWVyIGdyb3VwLmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5fZXhwYW5kZWQgPyB0aGlzLl9pdGVtcy5jb25jYXQodGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgnYWN0aXZlJykpIDogdGhpcy5faXRlbXMuc2xpY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwg6Ieq6Lqr44Gu566h55CG44GZ44KL44Ki44Kv44OG44Kj44OW44GqIExpbmVQcm9maWUg44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBnZXQgX2l0ZW1zKCk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBrZXkgPSB0aGlzLl9vd25lci5sYXlvdXRLZXk7XG4gICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21hcEl0ZW1zW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbWFwSXRlbXNbTGF5b3V0S2V5LkRFRkFVTFRdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCDopqogR3JvdXAg5oyH5a6aICovXG4gICAgcHJpdmF0ZSBzZXRQYXJlbnQocGFyZW50OiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgIHJlZ2lzdGVyIC8gdW5yZWdpc3RlciDjga7liY3lh6bnkIYgKi9cbiAgICBwcml2YXRlIHByZXByb2Nlc3MobmV3U3RhdHVzOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBpZiAobmV3U3RhdHVzICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4udGhpcy5faXRlbXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9IG5ld1N0YXR1cztcbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwg5pON5L2c5a++6LGh44GuIEl0ZW1Qcm9maWxlIOmFjeWIl+OCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgcXVlcnlPcGVyYXRpb25UYXJnZXQob3BlcmF0aW9uOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyB8ICdhY3RpdmUnKTogSXRlbVByb2ZpbGVbXSB7XG4gICAgICAgIGNvbnN0IGZpbmRUYXJnZXRzID0gKGdyb3VwOiBHcm91cFByb2ZpbGUpOiBJdGVtUHJvZmlsZVtdID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGdyb3VwLl9jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JlZ2lzdGVyZWQnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICd1bnJlZ2lzdGVyZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZC5wcmVwcm9jZXNzKG9wZXJhdGlvbikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FjdGl2ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjaGlsZC5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkLl9pdGVtcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBvcGVyYXRpb246ICR7b3BlcmF0aW9ufWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjaGlsZC5pc0V4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uZmluZFRhcmdldHMoY2hpbGQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmaW5kVGFyZ2V0cyh0aGlzKTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFZpZXcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBvd25lcjogSUxpc3RWaWV3O1xuICAgIHJlYWRvbmx5IGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayBMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDmp4vnr4njgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgb3duZXI6IElMaXN0VmlldztcbiAgICAkZWw/OiBET008VEVsZW1lbnQ+O1xuICAgIGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIExpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RJdGVtVmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG93bmVyLCAkZWwsIGl0ZW0gfSA9IG9wdGlvbnM7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgb3duZXIsXG4gICAgICAgICAgICBpdGVtLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuXG4gICAgICAgIGlmICgkZWwpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudCgkZWwgYXMgRE9NU2VsZWN0b3I8VEVsZW1lbnQ+KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIE93bmVyIOWPluW+lyAqL1xuICAgIGdldCBvd25lcigpOiBJTGlzdFZpZXcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ub3duZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gVmlldyBjb21wb25lbnQgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBSZW1vdmUgdGhpcyB2aWV3IGJ5IHRha2luZyB0aGUgZWxlbWVudCBvdXQgb2YgdGhlIERPTSB3aXRoIHJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEgVmlldyDjgYvjgokgRE9NIOOCkuWIh+OCiumbouOBlywg44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLiRlbC5jaGlsZHJlbigpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLiRlbC5vZmYoKTtcbiAgICAgICAgLy8gdGhpcy4kZWwg44Gv5YaN5Yip55So44GZ44KL44Gf44KB5a6M5YWo44Gq56C05qOE44Gv44GX44Gq44GEXG4gICAgICAgIHRoaXMuc2V0RWxlbWVudCgnbnVsbCcpO1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RJdGVtVmlld1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBvd24gaXRlbSBpbmRleC5cbiAgICAgKiBAamEg6Ieq6Lqr44GuIGl0ZW0g44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0SW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0uaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBzcGVjaWZpZWQgaGVpZ2h0LlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/pq5jjgZXjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXRIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBpZiBjaGlsZCBub2RlIGV4aXN0cy5cbiAgICAgKiBAamEgY2hpbGQgbm9kZSDjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBoYXNDaGlsZE5vZGUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuJGVsPy5jaGlsZHJlbigpLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGl0ZW0ncyBoZWlnaHQuXG4gICAgICogQGphIGl0ZW0g44Gu6auY44GV44KS5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3SGVpZ2h0XG4gICAgICogIC0gYGVuYCBuZXcgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7mlrDjgZfjgYTpq5jjgZVcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIG9wdGlvbnMgb2JqZWN0XG4gICAgICogIC0gYGphYCDmm7TmlrDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICB1cGRhdGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuJGVsICYmIHRoaXMuZ2V0SGVpZ2h0KCkgIT09IG5ld0hlaWdodCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uaXRlbS51cGRhdGVIZWlnaHQobmV3SGVpZ2h0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmhlaWdodChuZXdIZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBOdWxsYWJsZSxcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICB0eXBlIENvbm5lY3RFdmVudE1hcCxcbiAgICB0eXBlIFRpbWVySGFuZGxlLFxuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RTY3JvbGxlckZhY3RvcnksXG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0U2Nyb2xsZXIsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG50eXBlIFNjcm9sbGVyRXZlbnRNYXAgPSBIVE1MRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwICYgeyAnc2Nyb2xsc3RvcCc6IEV2ZW50OyB9O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBNSU5fU0NST0xMU1RPUF9EVVJBVElPTiA9IDUwLFxufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIHtAbGluayBJTGlzdFNjcm9sbGVyfSBpbXBsZW1lbnRhdGlvbiBjbGFzcyBmb3IgSFRNTEVsZW1lbnQuXG4gKiBAamEgSFRNTEVsZW1lbnQg44KS5a++6LGh44Go44GX44GfIHtAbGluayBJTGlzdFNjcm9sbGVyfSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEVsZW1lbnRTY3JvbGxlciBpbXBsZW1lbnRzIElMaXN0U2Nyb2xsZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyR0YXJnZXQ6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kc2Nyb2xsTWFwOiBET007XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbFN0b3BUcmlnZ2VyOiBET01FdmVudExpc3RlbmVyO1xuICAgIHByaXZhdGUgX3Njcm9sbER1cmF0aW9uPzogbnVtYmVyO1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IoZWxlbWVudDogRE9NU2VsZWN0b3IsIG9wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucykge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0ID0gJChlbGVtZW50KTtcbiAgICAgICAgdGhpcy5fJHNjcm9sbE1hcCA9IHRoaXMuXyR0YXJnZXQuY2hpbGRyZW4oKS5maXJzdCgpO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcblxuICAgICAgICAvKlxuICAgICAgICAgKiBmaXJlIGN1c3RvbSBldmVudDogYHNjcm9sbHN0b3BgXG4gICAgICAgICAqIGBzY3JvbGxlbmRgIOOBriBTYWZhcmkg5a++5b+c5b6F44GhXG4gICAgICAgICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9FbGVtZW50L3Njcm9sbGVuZF9ldmVudFxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IHRpbWVyOiBUaW1lckhhbmRsZTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSB0aW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQudHJpZ2dlcihuZXcgQ3VzdG9tRXZlbnQoJ3Njcm9sbHN0b3AnLCB7IGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUgfSkpO1xuICAgICAgICAgICAgfSwgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPz8gQ29uc3QuTUlOX1NDUk9MTFNUT1BfRFVSQVRJT04pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxTdG9wVHJpZ2dlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKiog44K/44Kk44OX5a6a576p6K2Y5Yil5a2QICovXG4gICAgc3RhdGljIGdldCBUWVBFKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnY2RwOmVsZW1lbnQtb3ZlcmZsb3ctc2Nyb2xsZXInO1xuICAgIH1cblxuICAgIC8qKiBmYWN0b3J5IOWPluW+lyAqL1xuICAgIHN0YXRpYyBnZXRGYWN0b3J5KCk6IExpc3RTY3JvbGxlckZhY3Rvcnkge1xuICAgICAgICBjb25zdCBmYWN0b3J5ID0gKGVsZW1lbnQ6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpOiBJTGlzdFNjcm9sbGVyID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRWxlbWVudFNjcm9sbGVyKGVsZW1lbnQsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBzZXQgdHlwZSBzaWduYXR1cmUuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGZhY3RvcnksIHtcbiAgICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBFbGVtZW50U2Nyb2xsZXIuVFlQRSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFjdG9yeSBhcyBMaXN0U2Nyb2xsZXJGYWN0b3J5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsZXJcblxuICAgIC8qKiBTY3JvbGxlciDjga7lnovmg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXQgdHlwZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gRWxlbWVudFNjcm9sbGVyLlRZUEU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruWPluW+lyAqL1xuICAgIGdldCBwb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+acgOWkp+WApOS9jee9ruOCkuWPluW+lyAqL1xuICAgIGdldCBwb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuXyRzY3JvbGxNYXAuaGVpZ2h0KCkgLSB0aGlzLl8kdGFyZ2V0LmhlaWdodCgpLCAwKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76YyyICovXG4gICAgb24odHlwZTogJ3Njcm9sbCcgfCAnc2Nyb2xsc3RvcCcsIGNhbGxiYWNrOiBET01FdmVudExpc3RlbmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub248U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76Yyy6Kej6ZmkICovXG4gICAgb2ZmKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9mZjxTY3JvbGxlckV2ZW50TWFwPih0eXBlLCBjYWxsYmFjayBhcyBVbmtub3duRnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPSAodGhpcy5fb3B0aW9ucy5lbmFibGVBbmltYXRpb24gPz8gYW5pbWF0ZSkgPyB0aW1lID8/IHRoaXMuX29wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl8kdGFyZ2V0LnNjcm9sbFRvcChwb3MsIHRoaXMuX3Njcm9sbER1cmF0aW9uLCB1bmRlZmluZWQsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY3JvbGxEdXJhdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOOBrueKtuaFi+abtOaWsCAqL1xuICAgIHVwZGF0ZSgpOiB2b2lkIHtcbiAgICAgICAgLy8gbm9vcFxuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDjga7noLTmo4QgKi9cbiAgICBkZXN0cm95KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Py5vZmYoKTtcbiAgICAgICAgKHRoaXMuXyR0YXJnZXQgYXMgTnVsbGFibGU8RE9NPikgPSAodGhpcy5fJHNjcm9sbE1hcCBhcyBOdWxsYWJsZTxET00+KSA9IG51bGw7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIHBvc3QsXG4gICAgbm9vcCxcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvSGVscFN0cmluZyxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB7XG4gICAgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzLFxuICAgIHNldFRyYW5zZm9ybVRyYW5zaXRpb24sXG4gICAgY2xlYXJUcmFuc2l0aW9uLFxufSBmcm9tICdAY2RwL3VpLXV0aWxzJztcbmltcG9ydCB0eXBlIHtcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RDb250ZXh0LFxuICAgIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyxcbiAgICBJTGlzdFNjcm9sbGVyLFxuICAgIElMaXN0T3BlcmF0aW9uLFxuICAgIElMaXN0U2Nyb2xsYWJsZSxcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUsXG4gICAgSUxpc3RJdGVtVmlldyxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Vmlld0dsb2JhbENvbmZpZyB9IGZyb20gJy4uL2dsb2JhbC1jb25maWcnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUsIFBhZ2VQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5pbXBvcnQgeyBFbGVtZW50U2Nyb2xsZXIgfSBmcm9tICcuL2VsZW1lbnQtc2Nyb2xsZXInO1xuXG4vKiogTGlzdENvbnRleHRPcHRpb25zIOaXouWumuWApCAqL1xuY29uc3QgX2RlZmF1bHRPcHRzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+ID0ge1xuICAgIHNjcm9sbGVyRmFjdG9yeTogRWxlbWVudFNjcm9sbGVyLmdldEZhY3RvcnkoKSxcbiAgICBlbmFibGVIaWRkZW5QYWdlOiBmYWxzZSxcbiAgICBlbmFibGVUcmFuc2Zvcm1PZmZzZXQ6IGZhbHNlLFxuICAgIHNjcm9sbE1hcFJlZnJlc2hJbnRlcnZhbDogMjAwLFxuICAgIHNjcm9sbFJlZnJlc2hEaXN0YW5jZTogMjAwLFxuICAgIHBhZ2VQcmVwYXJlQ291bnQ6IDMsXG4gICAgcGFnZVByZWxvYWRDb3VudDogMSxcbiAgICBlbmFibGVBbmltYXRpb246IHRydWUsXG4gICAgYW5pbWF0aW9uRHVyYXRpb246IDAsXG4gICAgYmFzZURlcHRoOiAnYXV0bycsXG4gICAgaXRlbVRhZ05hbWU6ICdsaScsICAvLyBUT0RPOiDopovmpbXjgoFcbiAgICByZW1vdmVJdGVtV2l0aFRyYW5zaXRpb246IHRydWUsXG4gICAgdXNlRHVtbXlJbmFjdGl2ZVNjcm9sbE1hcDogZmFsc2UsXG59O1xuXG4vKiogaW52YWxpZCBpbnN0YW5jZSAqL1xuY29uc3QgXyRpbnZhbGlkID0gJCgpIGFzIERPTTtcblxuLyoqIOWIneacn+WMlua4iOOBv+OBi+aknOiovCAqL1xuZnVuY3Rpb24gdmVyaWZ5PFQ+KHg6IFQgfCB1bmRlZmluZWQpOiBhc3NlcnRzIHggaXMgVCB7XG4gICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04pO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCDjgqLjgqTjg4bjg6DliYrpmaTmg4XloLEgKi9cbmludGVyZmFjZSBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgIHJlbW92ZWQ6IEl0ZW1Qcm9maWxlW107XG4gICAgZGVsdGE6IG51bWJlcjtcbiAgICB0cmFuc2l0aW9uOiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBzY3JvbGwgcHJvY2Vzc2luZyB0aGF0IG1hbmFnZXMgbWVtb3J5LiBBY2Nlc3NlcyB0aGUgRE9NLlxuICogQGphIOODoeODouODqueuoeeQhuOCkuihjOOBhuOCueOCr+ODreODvOODq+WHpueQhuOBruOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuS4gRE9NIOOBq+OCouOCr+OCu+OCueOBmeOCiy5cbiAqL1xuZXhwb3J0IGNsYXNzIExpc3RDb3JlIGltcGxlbWVudHMgSUxpc3RDb250ZXh0LCBJTGlzdE9wZXJhdGlvbiwgSUxpc3RTY3JvbGxhYmxlLCBJTGlzdEJhY2t1cFJlc3RvcmUge1xuICAgIHByaXZhdGUgXyRyb290OiBET007XG4gICAgcHJpdmF0ZSBfJG1hcDogRE9NO1xuICAgIHByaXZhdGUgX21hcEhlaWdodCA9IDA7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsZXI6IElMaXN0U2Nyb2xsZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKiogVUkg6KGo56S65Lit44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9hY3RpdmUgPSB0cnVlO1xuXG4gICAgLyoqIOWIneacn+OCquODl+OCt+ODp+ODs+OCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3NldHRpbmdzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+O1xuICAgIC8qKiBTY3JvbGwgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbEV2ZW50SGFuZGxlcjogKGV2PzogRXZlbnQpID0+IHZvaWQ7XG4gICAgLyoqIFNjcm9sbCBTdG9wIEV2ZW50IEhhbmRsZXIgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogMeODmuODvOOCuOWIhuOBrumrmOOBleOBruWfuua6luWApCAqL1xuICAgIHByaXZhdGUgX2Jhc2VIZWlnaHQgPSAwO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgSXRlbVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiog566h55CG5LiL44Gr44GC44KLIFBhZ2VQcm9maWxlIOmFjeWIlyAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhZ2VzOiBQYWdlUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog5pyA5paw44Gu6KGo56S66aCY5Z+f5oOF5aCx44KS5qC857SNIChTY3JvbGwg5Lit44Gu5pu05paw5Yem55CG44Gr5L2/55SoKSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCA9IHtcbiAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgIGZyb206IDAsXG4gICAgICAgIHRvOiAwLFxuICAgICAgICBwb3M6IDAsICAgIC8vIHNjcm9sbCBwb3NpdGlvblxuICAgIH07XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggX2xpbmVzIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSB0aGlzLl8kbWFwID0gXyRpbnZhbGlkO1xuICAgICAgICB0aGlzLl9zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIF9kZWZhdWx0T3B0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbCh0aGlzLl9zY3JvbGxlciEucG9zKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlciA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TY3JvbGxTdG9wKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruWIneacn+WMliAqL1xuICAgIHB1YmxpYyBpbml0aWFsaXplKCRyb290OiBET00sIGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIOaXouOBq+ani+evieOBleOCjOOBpuOBhOOBn+WgtOWQiOOBr+egtOajhFxuICAgICAgICBpZiAodGhpcy5fJHJvb3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuXyRyb290ID0gJHJvb3Q7XG4gICAgICAgIHRoaXMuXyRtYXAgPSAkcm9vdC5oYXNDbGFzcyh0aGlzLl9jb25maWcuU0NST0xMX01BUF9DTEFTUykgPyAkcm9vdCA6ICRyb290LmZpbmQodGhpcy5fY29uZmlnLlNDUk9MTF9NQVBfU0VMRUNUT1IpO1xuICAgICAgICAvLyBfJG1hcCDjgYznhKHjgYTloLTlkIjjga/liJ3mnJ/ljJbjgZfjgarjgYRcbiAgICAgICAgaWYgKHRoaXMuXyRtYXAubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gWyR7dGhpcy5fY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1N9IG5vdCBmb3VuZF1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsZXIgPSB0aGlzLmNyZWF0ZVNjcm9sbGVyKCk7XG4gICAgICAgIHRoaXMuc2V0QmFzZUhlaWdodChoZWlnaHQpO1xuICAgICAgICB0aGlzLnNldFNjcm9sbGVyQ29uZGl0aW9uKCk7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruegtOajhCAqL1xuICAgIHB1YmxpYyBkZXN0cm95KCk6IHZvaWQge1xuICAgICAgICB0aGlzLnJlc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLl8kcm9vdCA9IHRoaXMuXyRtYXAgPSBfJGludmFsaWQ7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOBruWfuua6luWApOOCkuWPluW+lyAqL1xuICAgIHB1YmxpYyBzZXRCYXNlSGVpZ2h0KGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChoZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW2Jhc2UgaGlnaHQ6ICR7aGVpZ2h0fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Jhc2VIZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiogYWN0aXZlIOeKtuaFi+ioreWumiAqL1xuICAgIHB1YmxpYyBhc3luYyBzZXRBY3RpdmVTdGF0ZShhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fYWN0aXZlID0gYWN0aXZlO1xuICAgICAgICBhd2FpdCB0aGlzLnRyZWF0U2Nyb2xsUG9zaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiogYWN0aXZlIOeKtuaFi+WIpOWumiAqL1xuICAgIGdldCBhY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gICAgfVxuXG4gICAgLyoqIHNjcm9sbGVyIOOBrueorumhnuOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxlclR5cGUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzLnNjcm9sbGVyRmFjdG9yeS50eXBlO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7kv53lrZgv5b6p5YWDICovXG4gICAgcHVibGljIGFzeW5jIHRyZWF0U2Nyb2xsUG9zaXRpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gKHRoaXMuX3Njcm9sbGVyLnBvcyAtIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MpO1xuICAgICAgICBjb25zdCB7IHVzZUR1bW15SW5hY3RpdmVTY3JvbGxNYXA6IHVzZUR1bW15TWFwIH0gPSB0aGlzLl9zZXR0aW5ncztcblxuICAgICAgICBjb25zdCB1cGRhdGVPZmZzZXQgPSAoJHRhcmdldDogRE9NKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zbGF0ZVkgfSA9IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcygkdGFyZ2V0WzBdKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQgIT09IHRyYW5zbGF0ZVkpIHtcbiAgICAgICAgICAgICAgICAkdGFyZ2V0LmNzcygndHJhbnNmb3JtJywgYHRyYW5zbGF0ZTNkKDAsJHtvZmZzZXR9cHgsMGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Njcm9sbGVyLnNjcm9sbFRvKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MsIGZhbHNlLCAwKTtcbiAgICAgICAgICAgIHRoaXMuXyRtYXAuY3NzKHsgJ3RyYW5zZm9ybSc6ICcnLCAnZGlzcGxheSc6ICdibG9jaycgfSk7XG4gICAgICAgICAgICBpZiAodXNlRHVtbXlNYXApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXBhcmVJbmFjdGl2ZU1hcCgpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgJG1hcCA9IHVzZUR1bW15TWFwID8gdGhpcy5wcmVwYXJlSW5hY3RpdmVNYXAoKSA6IHRoaXMuXyRtYXA7XG4gICAgICAgICAgICB1cGRhdGVPZmZzZXQoJG1hcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdENvbnRleHRcblxuICAgIC8qKiBnZXQgc2Nyb2xsLW1hcCBlbGVtZW50ICovXG4gICAgZ2V0ICRzY3JvbGxNYXAoKTogRE9NIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXA7XG4gICAgfVxuXG4gICAgLyoqIGdldCBzY3JvbGwtbWFwIGhlaWdodCBbcHhdICovXG4gICAgZ2V0IHNjcm9sbE1hcEhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcC5sZW5ndGggPyB0aGlzLl9tYXBIZWlnaHQgOiAwO1xuICAgIH1cblxuICAgIC8qKiBnZXQge0BsaW5rIExpc3RDb250ZXh0T3B0aW9uc30gKi9cbiAgICBnZXQgb3B0aW9ucygpOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiB1cGRhdGUgc2Nyb2xsLW1hcCBoZWlnaHQgKGRlbHRhIFtweF0pICovXG4gICAgdXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRtYXAubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9tYXBIZWlnaHQgKz0gTWF0aC50cnVuYyhkZWx0YSk7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlLlxuICAgICAgICAgICAgaWYgKHRoaXMuX21hcEhlaWdodCA8IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tYXBIZWlnaHQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQodGhpcy5fbWFwSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiB1cGRhdGUgaW50ZXJuYWwgcHJvZmlsZSAqL1xuICAgIHVwZGF0ZVByb2ZpbGVzKGZyb206IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IF9pdGVtcyB9ID0gdGhpcztcbiAgICAgICAgZm9yIChsZXQgaSA9IGZyb20sIG4gPSBfaXRlbXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoMCA8IGkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gX2l0ZW1zW2kgLSAxXTtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSBsYXN0LmluZGV4ICsgMTtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0ub2Zmc2V0ID0gbGFzdC5vZmZzZXQgKyBsYXN0LmhlaWdodDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0ub2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBnZXQgcmVjeWNsYWJsZSBlbGVtZW50ICovXG4gICAgZmluZFJlY3ljbGVFbGVtZW50cygpOiBET00ge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcC5maW5kKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTX1NFTEVDVE9SKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFZpZXdcblxuICAgIC8qKiDliJ3mnJ/ljJbmuIjjgb/jgYvliKTlrpogKi9cbiAgICBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9zY3JvbGxlcjtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogbmV3IChvcHRpb25zPzogVW5rbm93bk9iamVjdCkgPT4gSUxpc3RJdGVtVmlldywgaW5mbzogVW5rbm93bk9iamVjdCwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYWRkSXRlbShuZXcgSXRlbVByb2ZpbGUodGhpcywgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgaW5mbyksIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKOWGhemDqOeUqCkgKi9cbiAgICBfYWRkSXRlbShpdGVtOiBJdGVtUHJvZmlsZSB8IEl0ZW1Qcm9maWxlW10sIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gQXJyYXkuaXNBcnJheShpdGVtKSA/IGl0ZW0gOiBbaXRlbV07XG4gICAgICAgIGxldCBkZWx0YUhlaWdodCA9IDA7XG4gICAgICAgIGxldCBhZGRUYWlsID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKG51bGwgPT0gaW5zZXJ0VG8gfHwgdGhpcy5faXRlbXMubGVuZ3RoIDwgaW5zZXJ0VG8pIHtcbiAgICAgICAgICAgIGluc2VydFRvID0gdGhpcy5faXRlbXMubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluc2VydFRvID09PSB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFkZFRhaWwgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2Nyb2xsIG1hcCDjga7mm7TmlrBcbiAgICAgICAgZm9yIChjb25zdCBpdCBvZiBpdGVtcykge1xuICAgICAgICAgICAgZGVsdGFIZWlnaHQgKz0gaXQuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhSGVpZ2h0KTtcblxuICAgICAgICAvLyDmjL/lhaVcbiAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluc2VydFRvLCAwLCAuLi5pdGVtcyk7XG5cbiAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgaWYgKCFhZGRUYWlsKSB7XG4gICAgICAgICAgICBpZiAoMCA9PT0gaW5zZXJ0VG8pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luc2VydFRvIC0gMV0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyLCBzaXplPzogbnVtYmVyLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIgfCBudW1iZXJbXSwgYXJnMj86IG51bWJlciwgYXJnMz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShpbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1SYW5kb21seShpbmRleCwgYXJnMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVJdGVtQ29udGludW91c2x5KGluZGV4LCBhcmcyLCBhcmczKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBoZWxwZXI6IOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHuiAqL1xuICAgIHByaXZhdGUgX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXM6IG51bWJlcltdLCBkZWxheTogbnVtYmVyKTogUmVtb3ZlSXRlbXNDb250ZXh0IHtcbiAgICAgICAgY29uc3QgcmVtb3ZlZDogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBsZXQgZGVsdGEgPSAwO1xuICAgICAgICBsZXQgdHJhbnNpdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgIGZvciAoY29uc3QgaWR4IG9mIGluZGV4ZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLl9pdGVtc1tpZHhdO1xuICAgICAgICAgICAgZGVsdGEgKz0gaXRlbS5oZWlnaHQ7XG4gICAgICAgICAgICAvLyDliYrpmaTopoHntKDjga4gei1pbmRleCDjga7liJ3mnJ/ljJZcbiAgICAgICAgICAgIGl0ZW0ucmVzZXREZXB0aCgpO1xuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIOiHquWLleioreWumuODu+WJiumZpOmBheW7tuaZgumWk+OBjOioreWumuOBleOCjOOBi+OBpOOAgeOCueOCr+ODreODvOODq+ODneOCuOOCt+ODp+ODs+OBq+WkieabtOOBjOOBguOCi+WgtOWQiOOBryB0cmFuc2l0aW9uIOioreWumlxuICAgICAgICBpZiAodGhpcy5fc2V0dGluZ3MucmVtb3ZlSXRlbVdpdGhUcmFuc2l0aW9uICYmICgwIDwgZGVsYXkpKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5zY3JvbGxQb3M7XG4gICAgICAgICAgICBjb25zdCBwb3NNYXggPSB0aGlzLnNjcm9sbFBvc01heCAtIGRlbHRhO1xuICAgICAgICAgICAgdHJhbnNpdGlvbiA9IChwb3NNYXggPCBjdXJyZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH07XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5pmC44Gu5pu05pawICovXG4gICAgcHJpdmF0ZSBfdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0OiBSZW1vdmVJdGVtc0NvbnRleHQsIGRlbGF5OiBudW1iZXIsIHByb2ZpbGVVcGRhdGU6ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyByZW1vdmVkLCBkZWx0YSwgdHJhbnNpdGlvbiB9ID0gY29udGV4dDtcblxuICAgICAgICAvLyB0cmFuc2l0aW9uIOioreWumlxuICAgICAgICBpZiAodHJhbnNpdGlvbikge1xuICAgICAgICAgICAgdGhpcy5zZXR1cFNjcm9sbE1hcFRyYW5zaXRpb24oZGVsYXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY3VzdG9taXplIHBvaW50OiDjg5fjg63jg5XjgqHjgqTjg6vjga7mm7TmlrBcbiAgICAgICAgcHJvZmlsZVVwZGF0ZSgpO1xuXG4gICAgICAgIC8vIOOCueOCr+ODreODvOODq+mgmOWfn+OBruabtOaWsFxuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbE1hcEhlaWdodCgtZGVsdGEpO1xuICAgICAgICAvLyDpgYXlu7bliYrpmaRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcmVtb3ZlZCkge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBkZWxheSk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBJdGVtUHJvZmlsZSDjgpLliYrpmaQ6IOmAo+e2miBpbmRleCDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtQ29udGludW91c2x5KGluZGV4OiBudW1iZXIsIHNpemU6IG51bWJlciB8IHVuZGVmaW5lZCwgZGVsYXk6IG51bWJlciB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgICAgICBzaXplID0gc2l6ZSA/PyAxO1xuICAgICAgICBkZWxheSA9IGRlbGF5ID8/IDA7XG5cbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbmRleCArIHNpemUpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtyZW1vdmVJdGVtKCksIGludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7pcbiAgICAgICAgY29uc3QgaW5kZXhlcyA9IEFycmF5LmZyb20oeyBsZW5ndGg6IHNpemUgfSwgKF8sIGkpID0+IGluZGV4ICsgaSk7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9xdWVyeVJlbW92ZUl0ZW1zQ29udGV4dChpbmRleGVzLCBkZWxheSk7XG5cbiAgICAgICAgLy8g5pu05pawXG4gICAgICAgIHRoaXMuX3VwZGF0ZVdpdGhSZW1vdmVJdGVtc0NvbnRleHQoY29udGV4dCwgZGVsYXksICgpID0+IHtcbiAgICAgICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaW5kZXhdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDphY3liJfjgYvjgonliYrpmaRcbiAgICAgICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpbmRleCwgc2l6ZSk7XG4gICAgICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGluZGV4KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBJdGVtUHJvZmlsZSDjgpLliYrpmaQ6IHJhbmRvbSBhY2Nlc3Mg54mIICovXG4gICAgcHJpdmF0ZSBfcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4ZXM6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICBkZWxheSA9IGRlbGF5ID8/IDA7XG4gICAgICAgIGluZGV4ZXMuc29ydCgobGhzLCByaHMpID0+IHJocyAtIGxocyk7IC8vIOmZjemghuOCveODvOODiFxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBuID0gaW5kZXhlcy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpIDwgMCB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbcmVtb3ZlSXRlbSgpLCBpbnZhbGlkIGluZGV4OiAke2l9XWBcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9xdWVyeVJlbW92ZUl0ZW1zQ29udGV4dChpbmRleGVzLCBkZWxheSk7XG5cbiAgICAgICAgLy8g5pu05pawXG4gICAgICAgIHRoaXMuX3VwZGF0ZVdpdGhSZW1vdmVJdGVtc0NvbnRleHQoY29udGV4dCwgZGVsYXksICgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaWR4IG9mIGluZGV4ZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2lkeF0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKHRoaXMuX2l0ZW1zW2lkeF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8g6YWN5YiX44GL44KJ5YmK6ZmkXG4gICAgICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IGluZGV4ZXNbaW5kZXhlcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoZmlyc3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiogc2Nyb2xsIG1hcCDjga7jg4jjg6njg7Pjgrjjgrfjg6fjg7PoqK3lrpogKi9cbiAgICBwcml2YXRlIHNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG4gICAgICAgIGNvbnN0IGVsID0gdGhpcy5fJG1hcFswXTtcbiAgICAgICAgdGhpcy5fJG1hcC50cmFuc2l0aW9uRW5kKCgpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVHJhbnNpdGlvbihlbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uKGVsLCAnaGVpZ2h0JywgZGVsYXksICdlYXNlJyk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBpdGVtIOOBq+ioreWumuOBl+OBn+aDheWgseOCkuWPluW+lyAqL1xuICAgIGdldEl0ZW1JbmZvKHRhcmdldDogbnVtYmVyIHwgRXZlbnQpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgY29uc3QgeyBfaXRlbXMsIF9jb25maWcgfSA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgcGFyc2VyID0gKCR0YXJnZXQ6IERPTSk6IG51bWJlciA9PiB7XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5oYXNDbGFzcyhfY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlcigkdGFyZ2V0LmF0dHIoX2NvbmZpZy5EQVRBX0NPTlRBSU5FUl9JTkRFWCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKF9jb25maWcuU0NST0xMX01BUF9DTEFTUykgfHwgJHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignY2Fubm90IGRpdGVjdCBpdGVtIGZyb20gZXZlbnQgb2JqZWN0LicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZXIoJHRhcmdldC5wYXJlbnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaW5kZXggPSB0YXJnZXQgaW5zdGFuY2VvZiBFdmVudCA/IHBhcnNlcigkKHRhcmdldC5jdXJyZW50VGFyZ2V0IGFzIEhUTUxFbGVtZW50KSkgOiBOdW1iZXIodGFyZ2V0KTtcblxuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKGluZGV4KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3Vuc3VwcG9ydGVkIHR5cGU6ICR7dHlwZW9mIHRhcmdldH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbmRleCA8IDAgfHwgX2l0ZW1zLmxlbmd0aCA8PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gZ2V0SXRlbUluZm8oKSBbaW52YWxpZCBpbmRleDogJHt0eXBlb2YgaW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX2l0ZW1zW2luZGV4XS5pbmZvO1xuICAgIH1cblxuICAgIC8qKiDjgqLjgq/jg4bjgqPjg5bjg5rjg7zjgrjjgpLmm7TmlrAgKi9cbiAgICByZWZyZXNoKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IF9wYWdlcywgX2l0ZW1zLCBfc2V0dGluZ3MsIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQgfSA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0czogUmVjb3JkPG51bWJlciwgJ2FjdGl2YXRlJyB8ICdoaWRlJyB8ICdkZWFjdGl2YXRlJz4gPSB7fTtcbiAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgIGNvbnN0IGhpZ2hQcmlvcml0eUluZGV4OiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGNvbnN0IHN0b3JlTmV4dFBhZ2VTdGF0ZSA9IChpbmRleDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKE1hdGguYWJzKGN1cnJlbnRQYWdlSW5kZXggLSBpbmRleCkgPD0gX3NldHRpbmdzLnBhZ2VQcmVwYXJlQ291bnQpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zZXR0aW5ncy5lbmFibGVIaWRkZW5QYWdlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnaGlkZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2RlYWN0aXZhdGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY3VycmVudCBwYWdlIOOBriDliY3lvozjga8gaGlnaCBwcmlvcml0eSDjgavjgZnjgotcbiAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4ICsgMSA9PT0gaW5kZXggfHwgY3VycmVudFBhZ2VJbmRleCAtIDEgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8g5a++6LGh54Sh44GXXG4gICAgICAgIGlmIChfaXRlbXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoQ291bnQgPSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCArIF9zZXR0aW5ncy5wYWdlUHJlbG9hZENvdW50O1xuICAgICAgICAgICAgY29uc3QgYmVnaW5JbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudDtcbiAgICAgICAgICAgIGNvbnN0IGVuZEluZGV4ID0gY3VycmVudFBhZ2VJbmRleCArIHNlYXJjaENvdW50O1xuXG4gICAgICAgICAgICBsZXQgb3ZlcmZsb3dQcmV2ID0gMCwgb3ZlcmZsb3dOZXh0ID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IHBhZ2VJbmRleCA9IGJlZ2luSW5kZXg7IHBhZ2VJbmRleCA8PSBlbmRJbmRleDsgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd1ByZXYrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd05leHQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93UHJldikge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQgKyAxOyBpIDwgb3ZlcmZsb3dQcmV2OyBpKyssIHBhZ2VJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93TmV4dCkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4IC0gc2VhcmNoQ291bnQgLSAxOyBpIDwgb3ZlcmZsb3dOZXh0OyBpKyssIHBhZ2VJbmRleC0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDkuI3opoHjgavjgarjgaPjgZ8gcGFnZSDjga4g6Z2e5rS75oCn5YyWXG4gICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBfcGFnZXMuZmlsdGVyKHBhZ2UgPT4gJ2luYWN0aXZlJyAhPT0gcGFnZS5zdGF0dXMpKSB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRzW3BhZ2UuaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgcGFnZS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlhKrlhYggcGFnZSDjga4gYWN0aXZhdGVcbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaGlnaFByaW9yaXR5SW5kZXguc29ydCgobGhzLCByaHMpID0+IGxocyAtIHJocykpIHsgLy8g5piH6aCG44K944O844OIXG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCgpICYmIF9wYWdlc1tpZHhdPy5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDjgZ3jga7jgbvjgYvjga4gcGFnZSDjga4g54q25oWL5aSJ5pu0XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldHMpKSB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IE51bWJlcihrZXkpO1xuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gdGFyZ2V0c1tpbmRleF07XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCgpICYmIF9wYWdlc1tpbmRleF0/LlthY3Rpb25dPy4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5pu05paw5b6M44Gr5L2/55So44GX44Gq44GL44Gj44GfIERPTSDjgpLliYrpmaRcbiAgICAgICAgdGhpcy5maW5kUmVjeWNsZUVsZW1lbnRzKCkucmVtb3ZlKCk7XG5cbiAgICAgICAgY29uc3QgcGFnZUN1cnJlbnQgPSBfcGFnZXNbY3VycmVudFBhZ2VJbmRleF07XG4gICAgICAgIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQuZnJvbSAgPSBwYWdlQ3VycmVudC5nZXRJdGVtRmlyc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC50byAgICA9IHBhZ2VDdXJyZW50LmdldEl0ZW1MYXN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggPSBjdXJyZW50UGFnZUluZGV4O1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiDmnKrjgqLjgrXjgqTjg7Pjg5rjg7zjgrjjgpLmp4vnr4kgKi9cbiAgICB1cGRhdGUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuYXNzaWduUGFnZSh0aGlzLl9wYWdlcy5sZW5ndGgpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkCAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgIHRoaXMuYXNzaWduUGFnZSgpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOeuoei9hOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFnZXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faXRlbXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQoMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsYWJsZVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxQb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy5wb3MgPz8gMDtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44Gu5pyA5aSn5YCk44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbFBvc01heCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnBvc01heCA/PyAwO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkICovXG4gICAgc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uW21ldGhvZF0oJ3Njcm9sbCcsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vntYLkuobjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkICovXG4gICAgc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LlttZXRob2RdKCdzY3JvbGxzdG9wJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiAqL1xuICAgIGFzeW5jIHNjcm9sbFRvKHBvczogbnVtYmVyLCBhbmltYXRlPzogYm9vbGVhbiwgdGltZT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIHBvc2l0aW9uLCB0b28gc21hbGwuIFtwb3M6ICR7cG9zfV1gKTtcbiAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fc2Nyb2xsZXIucG9zTWF4IDwgcG9zKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgcG9zaXRpb24sIHRvbyBiaWcuIFtwb3M6ICR7cG9zfV1gKTtcbiAgICAgICAgICAgIHBvcyA9IHRoaXMuX3Njcm9sbGVyLnBvcztcbiAgICAgICAgfVxuICAgICAgICAvLyBwb3Mg44Gu44G/5YWI6aeG44GR44Gm5pu05pawXG4gICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIGlmIChwb3MgIT09IHRoaXMuX3Njcm9sbGVyLnBvcykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fc2Nyb2xsZXIuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ8gaXRlbSDjga7ooajnpLrjgpLkv53oqLwgKi9cbiAgICBhc3luYyBlbnN1cmVWaXNpYmxlKGluZGV4OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBfc2Nyb2xsZXIsIF9pdGVtcywgX3NldHRpbmdzLCBfYmFzZUhlaWdodCB9ID0gdGhpcztcblxuICAgICAgICB2ZXJpZnkoX3Njcm9sbGVyKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBfaXRlbXMubGVuZ3RoIDw9IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBlbnN1cmVWaXNpYmxlKCkgW2ludmFsaWQgaW5kZXg6ICR7dHlwZW9mIGluZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3BlcmF0aW9uID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBwYXJ0aWFsT0s6IHRydWUsXG4gICAgICAgICAgICBzZXRUb3A6IGZhbHNlLFxuICAgICAgICAgICAgYW5pbWF0ZTogX3NldHRpbmdzLmVuYWJsZUFuaW1hdGlvbixcbiAgICAgICAgICAgIHRpbWU6IF9zZXR0aW5ncy5hbmltYXRpb25EdXJhdGlvbixcbiAgICAgICAgICAgIGNhbGxiYWNrOiBub29wLFxuICAgICAgICB9LCBvcHRpb25zKSBhcyBSZXF1aXJlZDxMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnM+O1xuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRTY29wZSA9IHtcbiAgICAgICAgICAgIGZyb206IF9zY3JvbGxlci5wb3MsXG4gICAgICAgICAgICB0bzogX3Njcm9sbGVyLnBvcyArIF9iYXNlSGVpZ2h0LFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IF9pdGVtc1tpbmRleF07XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0U2NvcGUgPSB7XG4gICAgICAgICAgICBmcm9tOiB0YXJnZXQub2Zmc2V0LFxuICAgICAgICAgICAgdG86IHRhcmdldC5vZmZzZXQgKyB0YXJnZXQuaGVpZ2h0LFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGlzSW5TY29wZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24ucGFydGlhbE9LKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFNjb3BlLmZyb20gPD0gY3VycmVudFNjb3BlLmZyb20pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRTY29wZS5mcm9tIDw9IHRhcmdldFNjb3BlLnRvO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRTY29wZS5mcm9tIDw9IGN1cnJlbnRTY29wZS50bztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50U2NvcGUuZnJvbSA8PSB0YXJnZXRTY29wZS5mcm9tICYmIHRhcmdldFNjb3BlLnRvIDw9IGN1cnJlbnRTY29wZS50bztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkZXRlY3RQb3NpdGlvbiA9ICgpOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFNjb3BlLmZyb20gPCBjdXJyZW50U2NvcGUuZnJvbVxuICAgICAgICAgICAgICAgID8gdGFyZ2V0U2NvcGUuZnJvbVxuICAgICAgICAgICAgICAgIDogdGFyZ2V0Lm9mZnNldCAtIHRhcmdldC5oZWlnaHQgLy8gYm90dG9tIOWQiOOCj+OBm+OBr+aDheWgseS4jei2s+OBq+OCiOOCiuS4jeWPr1xuICAgICAgICAgICAgO1xuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBwb3M6IG51bWJlcjtcbiAgICAgICAgaWYgKG9wZXJhdGlvbi5zZXRUb3ApIHtcbiAgICAgICAgICAgIHBvcyA9IHRhcmdldFNjb3BlLmZyb207XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJblNjb3BlKCkpIHtcbiAgICAgICAgICAgIG9wZXJhdGlvbi5jYWxsYmFjaygpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub29wXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3MgPSBkZXRlY3RQb3NpdGlvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g6KOc5q2jXG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKF9zY3JvbGxlci5wb3NNYXggPCBwb3MpIHtcbiAgICAgICAgICAgIHBvcyA9IF9zY3JvbGxlci5wb3NNYXg7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnNjcm9sbFRvKHBvcywgb3BlcmF0aW9uLmFuaW1hdGUsIG9wZXJhdGlvbi50aW1lKTtcbiAgICAgICAgb3BlcmF0aW9uLmNhbGxiYWNrKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IHsgaXRlbXM6IHRoaXMuX2l0ZW1zIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjCAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoMCA8IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hZGRJdGVtKHRoaXMuX2JhY2t1cFtrZXldLml0ZW1zKTtcblxuICAgICAgICBpZiAocmVidWlsZCkge1xuICAgICAgICAgICAgdGhpcy5yZWJ1aWxkKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYWNrdXApKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5ICovXG4gICAgZ2V0IGJhY2t1cERhdGEoKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9iYWNrdXA7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDnlKjnkrDlooPoqK3lrpogKi9cbiAgICBwcml2YXRlIHNldFNjcm9sbGVyQ29uZGl0aW9uKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub24oJ3Njcm9sbCcsIHRoaXMuX3Njcm9sbEV2ZW50SGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDnlKjnkrDlooPnoLTmo4QgKi9cbiAgICBwcml2YXRlIHJlc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vZmYoJ3Njcm9sbHN0b3AnLCB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog5pei5a6a44GuIFNjcm9sbGVyIOOCquODluOCuOOCp+OCr+ODiOOBruS9nOaIkCAqL1xuICAgIHByaXZhdGUgY3JlYXRlU2Nyb2xsZXIoKTogSUxpc3RTY3JvbGxlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncy5zY3JvbGxlckZhY3RvcnkodGhpcy5fJHJvb3RbMF0sIHRoaXMuX3NldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKiog54++5Zyo44GuIFBhZ2UgSW5kZXgg44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBnZXRQYWdlSW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgeyBfc2Nyb2xsZXIsIF9iYXNlSGVpZ2h0LCBfcGFnZXMgfSA9IHRoaXM7XG4gICAgICAgIHZlcmlmeShfc2Nyb2xsZXIpO1xuXG4gICAgICAgIGNvbnN0IHsgcG9zOiBzY3JvbGxQb3MsIHBvc01heDogc2Nyb2xsUG9zTWF4IH0gPSBfc2Nyb2xsZXI7XG5cbiAgICAgICAgY29uc3Qgc2Nyb2xsTWFwU2l6ZSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsYXN0UGFnZSA9IHRoaXMuZ2V0TGFzdFBhZ2UoKTtcbiAgICAgICAgICAgIHJldHVybiBsYXN0UGFnZSA/IGxhc3RQYWdlLm9mZnNldCArIGxhc3RQYWdlLmhlaWdodCA6IF9iYXNlSGVpZ2h0O1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHBvcyA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoMCA9PT0gc2Nyb2xsUG9zTWF4IHx8IHNjcm9sbFBvc01heCA8PSBfYmFzZUhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsUG9zICogc2Nyb2xsTWFwU2l6ZSAvIHNjcm9sbFBvc01heDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICBjb25zdCB2YWxpZFJhbmdlID0gKHBhZ2U6IFBhZ2VQcm9maWxlKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYWdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYWdlLm9mZnNldCA8PSBwb3MgJiYgcG9zIDw9IHBhZ2Uub2Zmc2V0ICsgcGFnZS5oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBjYW5kaWRhdGUgPSBNYXRoLmZsb29yKHBvcyAvIF9iYXNlSGVpZ2h0KTtcbiAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICBjYW5kaWRhdGUgPSBfcGFnZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwYWdlID0gX3BhZ2VzW2NhbmRpZGF0ZV07XG4gICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgfSBlbHNlIGlmIChwb3MgPCBwYWdlLm9mZnNldCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNhbmRpZGF0ZSAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgcGFnZSA9IF9wYWdlc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FuZGlkYXRlICsgMSwgbiA9IF9wYWdlcy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYWdlID0gX3BhZ2VzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUud2FybihgY2Fubm90IGRldGVjdCBwYWdlIGluZGV4LiBmYWxsYmFjazogJHtfcGFnZXMubGVuZ3RoIC0gMX1gKTtcbiAgICAgICAgcmV0dXJuIF9wYWdlcy5sZW5ndGggLSAxO1xuICAgIH1cblxuICAgIC8qKiDmnIDlvozjga7jg5rjg7zjgrjjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldExhc3RQYWdlKCk6IFBhZ2VQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYWdlc1t0aGlzLl9wYWdlcy5sZW5ndGggLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OIKi9cbiAgICBwcml2YXRlIG9uU2Nyb2xsKHBvczogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICAvLyBUT0RPOiBpbnRlcnNlY3Rpb25SZWN0IOOCkuS9v+eUqOOBmeOCi+WgtOWQiCwgU2Nyb2xsIOODj+ODs+ODieODqeODvOWFqOiIrOOBr+OBqeOBhuOBguOCi+OBueOBjeOBi+imgeaknOiojlxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHBvcyAtIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MpIDwgdGhpcy5fc2V0dGluZ3Muc2Nyb2xsUmVmcmVzaERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCAhPT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+WBnOatouOCpOODmeODs+ODiCAqL1xuICAgIHByaXZhdGUgb25TY3JvbGxTdG9wKHBvczogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOWMuuWIhuOBruOCouOCteOCpOODsyAqL1xuICAgIHByaXZhdGUgYXNzaWduUGFnZShmcm9tPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKGZyb20pO1xuXG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zLCBfcGFnZXMsIF9iYXNlSGVpZ2h0LCBfc2Nyb2xsZXIgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGJhc2VQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICBjb25zdCBuZXh0SXRlbUluZGV4ID0gYmFzZVBhZ2U/LmdldEl0ZW1MYXN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIGNvbnN0IGFzaWduZWVJdGVtcyAgPSBfaXRlbXMuc2xpY2UobmV4dEl0ZW1JbmRleCk7XG5cbiAgICAgICAgbGV0IHdvcmtQYWdlID0gYmFzZVBhZ2U7XG4gICAgICAgIGlmIChudWxsID09IHdvcmtQYWdlKSB7XG4gICAgICAgICAgICB3b3JrUGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgX3BhZ2VzLnB1c2god29ya1BhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGFzaWduZWVJdGVtcykge1xuICAgICAgICAgICAgaWYgKF9iYXNlSGVpZ2h0IDw9IHdvcmtQYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHdvcmtQYWdlLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhZ2UgPSBuZXcgUGFnZVByb2ZpbGUoKTtcbiAgICAgICAgICAgICAgICBuZXdQYWdlLmluZGV4ID0gd29ya1BhZ2UuaW5kZXggKyAxO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2Uub2Zmc2V0ID0gd29ya1BhZ2Uub2Zmc2V0ICsgd29ya1BhZ2UuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3UGFnZTtcbiAgICAgICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpdGVtLnBhZ2VJbmRleCA9IHdvcmtQYWdlLmluZGV4O1xuICAgICAgICAgICAgd29ya1BhZ2UucHVzaChpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmtQYWdlLm5vcm1hbGl6ZSgpO1xuXG4gICAgICAgIF9zY3JvbGxlcj8udXBkYXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOWMuuWIhuOBruino+mZpCAqL1xuICAgIHByaXZhdGUgY2xlYXJQYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGFnZXMuc3BsaWNlKGZyb20gPz8gMCk7XG4gICAgfVxuXG4gICAgLyoqIGluYWN0aXZlIOeUqCBNYXAg44Gu55Sf5oiQICovXG4gICAgcHJpdmF0ZSBwcmVwYXJlSW5hY3RpdmVNYXAoKTogRE9NIHtcbiAgICAgICAgY29uc3QgeyBfY29uZmlnLCBfJG1hcCwgX21hcEhlaWdodCB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgJHBhcmVudCA9IF8kbWFwLnBhcmVudCgpO1xuICAgICAgICBsZXQgJGluYWN0aXZlTWFwID0gJHBhcmVudC5maW5kKF9jb25maWcuSU5BQ1RJVkVfQ0xBU1NfU0VMRUNUT1IpO1xuXG4gICAgICAgIGlmICgkaW5hY3RpdmVNYXAubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICAgICAgY29uc3QgJGxpc3RJdGVtVmlld3MgPSBfJG1hcC5jbG9uZSgpLmNoaWxkcmVuKCkuZmlsdGVyKChfLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmRleCA9IE51bWJlcigkKGVsZW1lbnQpLmF0dHIoX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFBhZ2VJbmRleCAtIDEgPD0gcGFnZUluZGV4IHx8IHBhZ2VJbmRleCA8PSBjdXJyZW50UGFnZUluZGV4ICsgMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkaW5hY3RpdmVNYXAgPSAkKGA8c2VjdGlvbiBjbGFzcz1cIiR7X2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTfVwiIFwiJHtfY29uZmlnLklOQUNUSVZFX0NMQVNTfVwiPjwvc2VjdGlvbj5gKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoJGxpc3RJdGVtVmlld3MpXG4gICAgICAgICAgICAgICAgLmhlaWdodChfbWFwSGVpZ2h0KTtcbiAgICAgICAgICAgICRwYXJlbnQuYXBwZW5kKCRpbmFjdGl2ZU1hcCk7XG4gICAgICAgICAgICBfJG1hcC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICRpbmFjdGl2ZU1hcDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIGRvbSBhcyAkLFxuICAgIHR5cGUgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgVmlldyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RDb250ZXh0LFxuICAgIElMaXN0VmlldyxcbiAgICBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMsXG4gICAgSUxpc3RJdGVtVmlldyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IExpc3RDb3JlIH0gZnJvbSAnLi9jb3JlL2xpc3QnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgY29udGV4dDogTGlzdENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgY2xhc3MgdGhhdCBzdG9yZXMge0BsaW5rIExpc3RWaWV3fSBpbml0aWFsaXphdGlvbiBpbmZvcm1hdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBruWIneacn+WMluaDheWgseOCkuagvOe0jeOBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCueOCr+ODqeOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEZ1bmNOYW1lID0gc3RyaW5nPlxuICAgIGV4dGVuZHMgTGlzdENvbnRleHRPcHRpb25zLCBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgJGVsPzogRE9NPFRFbGVtZW50PjtcbiAgICBpbml0aWFsSGVpZ2h0PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIEBlbiBWaXJ0dWFsIGxpc3QgdmlldyBjbGFzcyB0aGF0IHByb3ZpZGVzIG1lbW9yeSBtYW5hZ2VtZW50IGZ1bmN0aW9uYWxpdHkuXG4gKiBAamEg44Oh44Oi44Oq566h55CG5qmf6IO944KS5o+Q5L6b44GZ44KL5Luu5oOz44Oq44K544OI44OT44Ol44O844Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMaXN0VmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElMaXN0VmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBvcHQgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBMaXN0Q29yZShvcHQpLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuXG4gICAgICAgIGlmIChvcHQuJGVsKSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQob3B0LiRlbCBhcyBET01TZWxlY3RvcjxURWxlbWVudD4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gb3B0LmluaXRpYWxIZWlnaHQgPz8gdGhpcy4kZWwuaGVpZ2h0KCk7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmluaXRpYWxpemUodGhpcy4kZWwgYXMgRE9NPE5vZGU+IGFzIERPTSwgaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBjb250ZXh0IGFjY2Vzc29yICovXG4gICAgZ2V0IGNvbnRleHQoKTogSUxpc3RDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gVmlldyBjb21wb25lbnQgbWV0aG9kczpcblxuICAgIC8qKiBgdGhpcy5lbGAg5pu05paw5pmC44Gu5paw44GX44GEIEhUTUwg44KS44Os44Oz44OA44Oq44Oz44Kw44Ot44K444OD44Kv44Gu5a6f6KOF6Zai5pWwLiDjg6Ljg4fjg6vmm7TmlrDjgaggVmlldyDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLpgKPli5XjgZXjgZvjgosuICovXG4gICAgYWJzdHJhY3QgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gQ2hhbmdlIHRoZSB2aWV3J3MgZWxlbWVudCAoYHRoaXMuZWxgIHByb3BlcnR5KSBhbmQgcmUtZGVsZWdhdGUgdGhlIHZpZXcncyBldmVudHMgb24gdGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBqYSBWaWV3IOOBjOeuoei9hOOBmeOCi+imgee0oCAoYHRoaXMuZWxgIHByb3BlcnR5KSDjga7lpInmm7QuIOOCpOODmeODs+ODiOWGjeioreWumuOCguWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsXG4gICAgICogIC0gYGVuYCBPYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OI44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgc2V0RWxlbWVudChlbDogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgY29udGV4dCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICBjb250ZXh0LmRlc3Ryb3koKTtcbiAgICAgICAgY29udGV4dC5pbml0aWFsaXplKCRlbCBhcyBET008Tm9kZT4gYXMgRE9NLCAkZWwuaGVpZ2h0KCkpO1xuICAgICAgICByZXR1cm4gc3VwZXIuc2V0RWxlbWVudChlbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZGVzdHJveSgpO1xuICAgICAgICByZXR1cm4gc3VwZXIucmVtb3ZlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RPcGVyYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciBpdCBoYXMgYmVlbiBpbml0aWFsaXplZC5cbiAgICAgKiBAamEg5Yid5pyf5YyW5riI44G/44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogaW5pdGlhbGl6ZWQgLyBmYWxzZTogdW5pbml0aWFsaXplZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5Yid5pyf5YyW5riI44G/IC8gZmFsc2U6IOacquWIneacn+WMllxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzSW5pdGlhbGl6ZWQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIGl0ZW0g55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGl0ZW0gYnkgaW5kZXhcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5oy/5YWl5L2N572u44KS44Kk44Oz44OH44OD44Kv44K544Gn5oyH5a6aXG4gICAgICovXG4gICAgYWRkSXRlbShoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IG5ldyAob3B0aW9ucz86IFVua25vd25PYmplY3QpID0+IElMaXN0SXRlbVZpZXcsIGluZm86IFVua25vd25PYmplY3QsIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2FkZEl0ZW0obmV3IEl0ZW1Qcm9maWxlKHRoaXMuY29udGV4dCwgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgaW5mbyksIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24gKGludGVybmFsIHVzZSkuXG4gICAgICogQGphIGl0ZW0g55m76YyyICjlhoXpg6jnlKgpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAqICAtIGBlbmAge0BsaW5rIEl0ZW1Qcm9maWxlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5fYWRkSXRlbShpdGVtLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbmRleCB0byBzdGFydCByZWxlYXNpbmdcbiAgICAgKiAgLSBgamFgIOino+mZpOmWi+Wni+OBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzaXplXG4gICAgICogIC0gYGVuYCB0b3RhbCBudW1iZXIgb2YgaXRlbXMgdG8gcmVsZWFzZVxuICAgICAqICAtIGBqYWAg6Kej6Zmk44GZ44KLIGl0ZW0g44Gu57eP5pWwIFtkZWZhdWx0OiAxXVxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciwgc2l6ZT86IG51bWJlciwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRhcmdldCBpbmRleCBhcnJheS4gaXQgaXMgbW9yZSBlZmZpY2llbnQgdG8gc3BlY2lmeSByZXZlcnNlIGluZGV4LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Kk44Oz44OH44OD44Kv44K56YWN5YiX44KS5oyH5a6aLiByZXZlcnNlIGluZGV4IOOCkuaMh+WumuOBmeOCi+OBu+OBhuOBjOWKueeOh+eahFxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIgfCBudW1iZXJbXSwgYXJnMj86IG51bWJlciwgYXJnMz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbW92ZUl0ZW0oaW5kZXggYXMgbnVtYmVyLCBhcmcyLCBhcmczKTsgLy8gYXZvaWQgdHMoMjM0NSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbmZvcm1hdGlvbiBzZXQgZm9yIHRoZSBzcGVjaWZpZWQgaXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBpZGVudGlmaWVyIFtpbmRleCB8IGV2ZW50IG9iamVjdF1cbiAgICAgKiAgLSBgamFgIOitmOWIpeWtkC4gW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqL1xuICAgIGdldEl0ZW1JbmZvKHRhcmdldDogbnVtYmVyIHwgRXZlbnQpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0SXRlbUluZm8odGFyZ2V0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCBhY3RpdmUgcGFnZXMuXG4gICAgICogQGphIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsFxuICAgICAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQnVpbGQgdW5hc3NpZ25lZCBwYWdlcy5cbiAgICAgKiBAamEg5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JXG4gICAgICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVidWlsZCBwYWdlIGFzc2lnbm1lbnRzLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgqLjgrXjgqTjg7PjgpLlho3mp4vmiJBcbiAgICAgKi9cbiAgICByZWJ1aWxkKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIERlc3Ryb3kgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg566h6L2E44OH44O844K/44KS56C05qOEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZWxlYXNlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAgLyoqXG4gICAgICogQGVuIEdldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zO1xuICAgIH1cblxuICAgICAvKipcbiAgICAgICogQGVuIEdldCBtYXhpbXVtIHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+l1xuICAgICAgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFBvc01heDtcbiAgICB9XG5cbiAgICAgLyoqXG4gICAgICogQGVuIFNjcm9sbCBldmVudCBoYW5kbGVyIHNldHRpbmcvY2FuY2VsbGF0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44O86Zai5pWwXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb246IHNldHRpbmcgLyBvZmY6IGNhbmNlbGluZ1xuICAgICAqICAtIGBqYWAgb246IOioreWumiAvIG9mZjog6Kej6ZmkXG4gICAgICovXG4gICAgc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dGluZy9jYW5jZWxsaW5nIHNjcm9sbCBzdG9wIGV2ZW50IGhhbmRsZXIuXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXIsIG1ldGhvZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc1xuICAgICAqICAtIGBlbmAgbmV3IHNjcm9sbCBwb3NpdGlvbiB2YWx1ZSBbMCAtIHBvc01heF1cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiBbMCAtIHBvc01heF1cbiAgICAgKiBAcGFyYW0gYW5pbWF0ZVxuICAgICAqICAtIGBlbmAgZW5hYmxlL2Rpc2FibGUgYW5pbWF0aW9uXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7mnInnhKFcbiAgICAgKiBAcGFyYW0gdGltZVxuICAgICAqICAtIGBlbmAgdGltZSBzcGVudCBvbiBhbmltYXRpb24gW21zZWNdXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVuc3VyZSB2aXNpYmlsaXR5IG9mIGl0ZW0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGluZGV4IG9mIGl0ZW1cbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBlbnN1cmVWaXNpYmxlKGluZGV4OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZW5zdXJlVmlzaWJsZShpbmRleCwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIGJhY2t1cCBkYXRhIGV4aXN0cy5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cyAvIGZhbHNlOiBub3QgZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIkgLyBmYWxzZTog54ShXG4gICAgICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEaXNjYXJkIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZGlzY2FyZCBleGlzdGluZyBkYXRhIC8gZmFsc2U6IHNwZWNpZmllZCBkYXRhIGRvZXMgbm90IGV4aXN0XG4gICAgICogIC0gYGphYCB0cnVlOiDlrZjlnKjjgZfjgZ/jg4fjg7zjgr/jgpLnoLTmo4QgLyBmYWxzZTog5oyH5a6a44GV44KM44Gf44OH44O844K/44Gv5a2Y5Zyo44GX44Gq44GEXG4gICAgICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGJhY2t1cERhdGEoKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmJhY2t1cERhdGE7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdFZpZXcgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IHsgdHlwZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBMaXN0SXRlbVZpZXcgfSBmcm9tICcuL2xpc3QtaXRlbS12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIEV4cGFuZGFibGVMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RJdGVtVmlld30g5qeL56+J44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhwYW5kYWJsZUxpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIG93bmVyOiBJRXhwYW5kYWJsZUxpc3RWaWV3O1xuICAgIC8qKiB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8qKlxuICogQGVuIExpc3QgaXRlbSBjb250YWluZXIgY2xhc3MgaGFuZGxlZCBieSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSDjgYzmibHjgYbjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgrPjg7Pjg4bjg4rjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0SXRlbVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlldzxURWxlbWVudCwgVEV2ZW50PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHsgZ3JvdXAgfSA9IG9wdGlvbnM7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0geyBncm91cCB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cy5cbiAgICAgKiBAamEg5bGV6ZaL54q25oWL44KS5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhwYW5kZWQsIGNvbGxhcHNlZDogY2xvc2VcbiAgICAgKiAgLSBgamFgIHRydWU6IOWxlemWiywgZmFsc2U6IOWPjuadn1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmdyb3VwLmlzRXhwYW5kZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcuXG4gICAgICogQGphIOWxlemWi+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc0V4cGFuZGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOWPjuadn+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc1N3aXRjaGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIGlmIGl0IGhhcyBhIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9LiA8YnI+XG4gICAgICogICAgIElmIGBsYXlvdXRLZXlgIGlzIHNwZWNpZmllZCwgd2hldGhlciB0aGUgbGF5b3V0IGluZm9ybWF0aW9uIG1hdGNoZXMgaXMgYWxzbyBhZGRlZCB0byB0aGUganVkZ21lbnQgY29uZGl0aW9uLlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aIDxicj5cbiAgICAgKiAgICAgYGxheW91dEtleWAg44GM5oyH5a6a44GV44KM44KM44Gw44CBbGF5b3V0IOaDheWgseOBjOS4gOiHtOOBl+OBpuOBhOOCi+OBi+OCguWIpOWumuadoeS7tuOBq+WKoOOBiOOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIGxheW91dEtleVxuICAgICAqICAtIGBlbmAgaWRlbnRpZmllciBmb3IgZWFjaCBsYXlvdXRcbiAgICAgKiAgLSBgamFgIOODrOOCpOOCouOCpuODiOavjuOBruitmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGhhc0NoaWxkcmVuKGxheW91dEtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uZ3JvdXAuaGFzQ2hpbGRyZW4obGF5b3V0S2V5KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB0eXBlIFVua25vd25PYmplY3QsIGx1aWQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIElFeHBhbmRPcGVyYXRpb24sXG4gICAgSUxpc3RMYXlvdXRLZXlIb2xkZXIsXG4gICAgSUxpc3RTdGF0dXNNYW5hZ2VyLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSxcbiAgICBJRXhwYW5kYWJsZUxpc3RDb250ZXh0LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4uL3Byb2ZpbGUnO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIENvcmUgbG9naWMgaW1wbGVtZW50YXRpb24gY2xhc3MgdGhhdCBtYW5hZ2VzIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgc3RhdGUuXG4gKiBAamEg6ZaL6ZaJ54q25oWL566h55CG44KS6KGM44GG44Kz44Ki44Ot44K444OD44Kv5a6f6KOF44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBFeHBhbmRDb3JlIGltcGxlbWVudHNcbiAgICBJRXhwYW5kT3BlcmF0aW9uLFxuICAgIElMaXN0TGF5b3V0S2V5SG9sZGVyLFxuICAgIElMaXN0U3RhdHVzTWFuYWdlcixcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQ7XG5cbiAgICAvLyBUT0RPOiBvd25lciDjgajjga7lkITjg4fjg7zjgr/jga7miYDmnInmqKnjga7opovnm7TjgZcgKGJhY2t1cERhdGE/KVxuICAgIC8qKiB7IGlkOiBHcm91cFByb2ZpbGUgfSAqL1xuICAgIHByaXZhdGUgX21hcEdyb3VwczogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPiA9IHt9O1xuICAgIC8qKiDnrKwx6ZqO5bGkIEdyb3VwUHJvZmlsZSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIF9hcnlUb3BHcm91cHM6IEdyb3VwUHJvZmlsZVtdID0gW107XG4gICAgLyoqIGxheW91dEtleSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIF9sYXlvdXRLZXk/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSBvd25lciDopqogVmlldyDjga7jgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCkge1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgIH1cblxuICAgIC8qKiDjg4fjg7zjgr/jgpLnoLTmo4QgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fbWFwR3JvdXBzID0ge307XG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3VwcyA9IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRPcGVyYXRpb25cblxuICAgIC8qKiDmlrDopo8gR3JvdXBQcm9maWxlIOOCkuS9nOaIkCAqL1xuICAgIG5ld0dyb3VwKGlkPzogc3RyaW5nKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgaWQgPSBpZCA/PyBsdWlkKCdsaXN0LWdyb3VwJywgNCk7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX21hcEdyb3Vwc1tpZF0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tYXBHcm91cHNbaWRdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGdyb3VwID0gbmV3IEdyb3VwUHJvZmlsZSh0aGlzLl9vd25lciwgaWQpO1xuICAgICAgICB0aGlzLl9tYXBHcm91cHNbaWRdID0gZ3JvdXA7XG4gICAgICAgIHJldHVybiBncm91cDtcbiAgICB9XG5cbiAgICAvKiog55m76Yyy5riI44G/IEdyb3VwIOOCkuWPluW+lyAqL1xuICAgIGdldEdyb3VwKGlkOiBzdHJpbmcpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFwR3JvdXBzW2lkXTtcbiAgICB9XG5cbiAgICAvKiog56ysMemajuWxpOOBriBHcm91cCDnmbvpjLIgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgLy8g44GZ44Gn44Gr55m76Yyy5riI44G/44Gu5aC05ZCI44GvIHJlc3RvcmUg44GX44GmIGxheW91dCDjgq3jg7zjgZTjgajjgavlvqnlhYPjgZnjgovjgIJcbiAgICAgICAgaWYgKCdyZWdpc3RlcmVkJyA9PT0gdG9wR3JvdXAuc3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBvcmllbnRhdGlvbiBjaGFuZ2VkIOaZguOBriBsYXlvdXQg44Kt44O85aSJ5pu05a++5b+c44Gg44GM44CB44Kt44O844Gr5aSJ5pu044GM54Sh44GE44Go44GN44Gv5LiN5YW35ZCI44Go44Gq44KL44CCXG4gICAgICAgICAgICAvLyDjgZPjga4gQVBJIOOBq+Wun+ijheOBjOW/heimgeOBi+OCguWQq+OCgeOBpuimi+ebtOOBl+OBjOW/heimgVxuICAgICAgICAgICAgdG9wR3JvdXAucmVzdG9yZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGFzdEdyb3VwID0gdGhpcy5fYXJ5VG9wR3JvdXBzW3RoaXMuX2FyeVRvcEdyb3Vwcy5sZW5ndGggLSAxXTtcbiAgICAgICAgY29uc3QgaW5zZXJ0VG8gPSBsYXN0R3JvdXA/LmdldE5leHRJdGVtSW5kZXgodHJ1ZSkgPz8gMDtcblxuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMucHVzaCh0b3BHcm91cCk7XG4gICAgICAgIHRvcEdyb3VwLnJlZ2lzdGVyKGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiog56ysMemajuWxpOOBriBHcm91cCDjgpLlj5blvpcgKi9cbiAgICBnZXRUb3BHcm91cHMoKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJ5VG9wR3JvdXBzLnNsaWNlKDApO1xuICAgIH1cblxuICAgIC8qKiDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpICovXG4gICAgYXN5bmMgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNpZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgcHJvbWlzaWVzLnB1c2goZ3JvdXAuZXhwYW5kKCkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2llcyk7XG4gICAgfVxuXG4gICAgLyoqIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWPjuadnyAoMemajuWxpCkgKi9cbiAgICBhc3luYyBjb2xsYXBzZUFsbChkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNpZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgcHJvbWlzaWVzLnB1c2goZ3JvdXAuY29sbGFwc2UoZGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNpZXMpO1xuICAgIH1cblxuICAgIC8qKiDlsZXplovkuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5pc1N0YXR1c0luKCdleHBhbmRpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog5Y+O5p2f5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLmlzU3RhdHVzSW4oJ2NvbGxhcHNpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog6ZaL6ZaJ5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0V4cGFuZGluZyB8fCB0aGlzLmlzQ29sbGFwc2luZztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdExheW91dEtleUhvbGRlclxuXG4gICAgLyoqIGxheW91dCBrZXkg44KS5Y+W5b6XICovXG4gICAgZ2V0IGxheW91dEtleSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGF5b3V0S2V5O1xuICAgIH1cblxuICAgIC8qKiBsYXlvdXQga2V5IOOCkuioreWumiAqL1xuICAgIHNldCBsYXlvdXRLZXkoa2V5OiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fbGF5b3V0S2V5ID0ga2V5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U3RhdHVzTWFuYWdlclxuXG4gICAgLyoqIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiCAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5zdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiog54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5zdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqIOWHpueQhuOCueOCs+ODvOODl+avjuOBq+eKtuaFi+WkieaVsOOCkuioreWumiAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKHN0YXR1cywgZXhlY3V0b3IpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo0gKi9cbiAgICBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5pc1N0YXR1c0luKHN0YXR1cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44OQ44OD44Kv44Ki44OD44OXICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IF9iYWNrdXAgPSB0aGlzLmJhY2t1cERhdGE7XG4gICAgICAgIGlmIChudWxsID09IF9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgX2JhY2t1cFtrZXldID0ge1xuICAgICAgICAgICAgICAgIG1hcDogdGhpcy5fbWFwR3JvdXBzLFxuICAgICAgICAgICAgICAgIHRvcHM6IHRoaXMuX2FyeVRvcEdyb3VwcyxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OCkuODquOCueODiOOCoiAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGJhY2t1cCA9IHRoaXMuYmFja3VwRGF0YVtrZXldIGFzIFVua25vd25PYmplY3Q7XG4gICAgICAgIGlmIChudWxsID09IGJhY2t1cCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCB0aGlzLl9hcnlUb3BHcm91cHMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX21hcEdyb3VwcyA9IGJhY2t1cC5tYXAgYXMgUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gYmFja3VwLnRvcHMgYXMgR3JvdXBQcm9maWxlW107XG5cbiAgICAgICAgLy8gbGF5b3V0IOaDheWgseOBrueiuuiqjVxuICAgICAgICBpZiAoIXRoaXMuX2FyeVRvcEdyb3Vwc1swXT8uaGFzTGF5b3V0S2V5T2YodGhpcy5sYXlvdXRLZXkhKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5bGV6ZaL44GX44Gm44GE44KL44KC44Gu44KS55m76YyyXG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBncm91cC5yZXN0b3JlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlho3mp4vnr4njga7kuojntIRcbiAgICAgICAgcmVidWlsZCAmJiB0aGlzLl9vd25lci5yZWJ1aWxkKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKEgKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuSAqL1xuICAgIGdldCBiYWNrdXBEYXRhKCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3duZXIuYmFja3VwRGF0YTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgc3RhdHVzQWRkUmVmLFxuICAgIHN0YXR1c1JlbGVhc2UsXG4gICAgc3RhdHVzU2NvcGUsXG4gICAgaXNTdGF0dXNJbixcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0VmlldyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFeHBhbmRDb3JlIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB0eXBlIHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcbmltcG9ydCB7IHR5cGUgTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zLCBMaXN0VmlldyB9IGZyb20gJy4vbGlzdC12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IEV4cGFuZENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBWaXJ0dWFsIGxpc3QgdmlldyBjbGFzcyB3aXRoIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDplovplonmqZ/og73jgpLlgpnjgYjjgZ/ku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0VmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgTGlzdFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJRXhwYW5kYWJsZUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBFeHBhbmRDb3JlKHRoaXMpLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRhYmxlTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcge0BsaW5rIEdyb3VwUHJvZmlsZX0uIFJldHVybiB0aGUgb2JqZWN0IGlmIGl0IGlzIGFscmVhZHkgcmVnaXN0ZXJlZC5cbiAgICAgKiBAamEg5paw6KaPIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuS9nOaIkC4g55m76Yyy5riI44G/44Gu5aC05ZCI44Gv44Gd44Gu44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIG5ld2x5IGNyZWF0ZWQgZ3JvdXAgaWQuIGlmIG5vdCBzcGVjaWZpZWQsIGF1dG9tYXRpYyBhbGxvY2F0aW9uIHdpbGwgYmUgcGVyZm9ybWVkLlxuICAgICAqICAtIGBqYWAg5paw6KaP44Gr5L2c5oiQ44GZ44KLIEdyb3VwIElEIOOCkuaMh+Wumi4g5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv6Ieq5YuV5Ymy44KK5oyv44KKXG4gICAgICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5uZXdHcm91cChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCByZWdpc3RlcmVkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDnmbvpjLLmuIjjgb8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIEdyb3VwIElEIHRvIHJldHJpZXZlXG4gICAgICogIC0gYGphYCDlj5blvpfjgZnjgosgR3JvdXAgSUQg44KS5oyH5a6aXG4gICAgICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEdyb3VwKGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gMXN0IGxheWVyIHtAbGluayBHcm91cFByb2ZpbGV9IHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEg56ysMemajuWxpOOBriB7QGxpbmsgR3JvdXBQcm9maWxlfSDnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b3BHcm91cFxuICAgICAqICAtIGBlbmAgY29uc3RydWN0ZWQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIOani+eviea4iOOBvyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IDFzdCBsYXllciB7QGxpbmsgR3JvdXBQcm9maWxlfS4gPGJyPlxuICAgICAqICAgICBBIGNvcHkgYXJyYXkgaXMgcmV0dXJuZWQsIHNvIHRoZSBjbGllbnQgY2Fubm90IGNhY2hlIGl0LlxuICAgICAqIEBqYSDnrKwx6ZqO5bGk44GuIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+lyA8YnI+XG4gICAgICogICAgIOOCs+ODlOODvOmFjeWIl+OBjOi/lOOBleOCjOOCi+OBn+OCgeOAgeOCr+ODqeOCpOOCouODs+ODiOOBr+OCreODo+ODg+OCt+ODpeS4jeWPr1xuICAgICAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldFRvcEdyb3VwcygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHBhbmQgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpXG4gICAgICovXG4gICAgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5leHBhbmRBbGwoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29sbGFwc2UgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlj47mnZ8gKDHpmo7lsaQpXG4gICAgICovXG4gICAgY29sbGFwc2VBbGwoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY29sbGFwc2VBbGwoZGVsYXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nLlxuICAgICAqIEBqYSDlsZXplovkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzRXhwYW5kaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgY29sbGFwc2luZy5cbiAgICAgKiBAamEg5Y+O5p2f5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNTd2l0Y2hpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICAgICAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICAgICAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gICAgICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gICAgICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN0YXRlIHZhcmlhYmxlIG1hbmFnZW1lbnQgc2NvcGVcbiAgICAgKiBAamEg54q25oWL5aSJ5pWw566h55CG44K544Kz44O844OXXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dmFsIG9mIHNlZWQgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDlr77osaHjga7plqLmlbDjga7miLvjgorlgKRcbiAgICAgKi9cbiAgICBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZywgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBzdGF0dXNTY29wZShzdGF0dXMsIGV4ZWN1dG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgaWYgaXQncyBpbiB0aGUgc3BlY2lmaWVkIHN0YXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWU6IOeKtuaFi+WGhSAvIGZhbHNlOiDnirbmhYvlpJZcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgOiB3aXRoaW4gdGhlIHN0YXR1cyAvIGBmYWxzZWA6IG91dCBvZiB0aGUgc3RhdHVzXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOeKtuaFi+WGhSAvIGBmYWxzZWA6IOeKtuaFi+WkllxuICAgICAqL1xuICAgIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGlzU3RhdHVzSW4oc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGxheW91dCBrZXkg44KS5Y+W5b6XICovXG4gICAgZ2V0IGxheW91dEtleSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5sYXlvdXRLZXk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBsYXlvdXQga2V5IOOCkuioreWumiAqL1xuICAgIHNldCBsYXlvdXRLZXkoa2V5OiBzdHJpbmcpIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5sYXlvdXRLZXkgPSBrZXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IExpc3RWaWV3XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRGVzdHJveSBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4RcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICBzdXBlci5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVsZWFzZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBvdmVycmlkZSBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlc3RvcmUoa2V5LCByZWJ1aWxkKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgJy4vcmVzdWx0LWNvZGUtZGVmcyc7XG5leHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0ICogZnJvbSAnLi9nbG9iYWwtY29uZmlnJztcbmV4cG9ydCAqIGZyb20gJy4vcHJvZmlsZSc7XG5leHBvcnQgKiBmcm9tICcuL2xpc3QtaXRlbS12aWV3JztcbmV4cG9ydCAqIGZyb20gJy4vbGlzdC12aWV3JztcbmV4cG9ydCAqIGZyb20gJy4vZXhwYW5kYWJsZS1saXN0LWl0ZW0tdmlldyc7XG5leHBvcnQgKiBmcm9tICcuL2V4cGFuZGFibGUtbGlzdC12aWV3JztcblxuLy8gVE9ETzogdGVzdFxuZXhwb3J0IGNvbnN0IFVJX0xJU1RWSUVXX1NUQVRVUyA9ICdVTkRFUiBDT05TVFJVQ1RJT04nO1xuIl0sIm5hbWVzIjpbIiQiLCJnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMiLCJhdCIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInRvSGVscFN0cmluZyIsIl9wcm9wZXJ0aWVzIiwiVmlldyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJjbGVhclRyYW5zaXRpb24iLCJzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uIiwicG9zdCIsIm5vb3AiLCJsdWlkIiwic3RhdHVzQWRkUmVmIiwic3RhdHVzUmVsZWFzZSIsInN0YXR1c1Njb3BlIiwiaXNTdGF0dXNJbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUxELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEscUJBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxxQkFBOEMsQ0FBQTtZQUM5QyxXQUEyQyxDQUFBLFdBQUEsQ0FBQSwwQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZC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QWMsRUFBQTtJQUN2QixRQUFBLE9BQU9DLG9CQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDL0I7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ0gsSUFBQSxhQUFhLENBQUMsTUFBYyxFQUFBO0lBQ3hCLFFBQUEsT0FBT0MscUJBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNoQztJQUVEOzs7Ozs7Ozs7Ozs7O0lBYUc7UUFDSCxXQUFXLENBQUksTUFBYyxFQUFFLFFBQThCLEVBQUE7SUFDekQsUUFBQSxPQUFPQyxtQkFBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztTQUN4QztJQUVEOzs7Ozs7Ozs7OztJQVdHO0lBQ0gsSUFBQSxVQUFVLENBQUMsTUFBYyxFQUFBO0lBQ3JCLFFBQUEsT0FBT0Msa0JBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM3Qjs7SUFHRCxJQUFBLElBQUksU0FBUyxHQUFBO1lBQ1QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUM5Qzs7UUFHRCxJQUFJLFNBQVMsQ0FBQyxHQUFXLEVBQUE7WUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1NBQzdDOzs7SUFLRDs7OztJQUlHO1FBQ00sT0FBTyxHQUFBO1lBQ1osS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEMsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0lBRUQ7Ozs7Ozs7Ozs7O0lBV0c7SUFDTSxJQUFBLE1BQU0sQ0FBQyxHQUFXLEVBQUE7WUFDdkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNoRDtJQUVEOzs7Ozs7Ozs7Ozs7OztJQWNHO0lBQ00sSUFBQSxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQU8sR0FBRyxJQUFJLEVBQUE7SUFDeEMsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUMxRDtJQUNKOztJQ2pQRDtBQUNPLFVBQU0sa0JBQWtCLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdWktbGlzdHZpZXcvIn0=