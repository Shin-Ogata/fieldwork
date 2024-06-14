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
            this._$target = runtime.dom(target);
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
    const _$invalid = runtime.dom();
    /** 初期化済みか検証 */
    function verify(x) {
        if (null == x) {
            throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_INITIALIZATION);
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
            $map = runtime.dom(`<div class="${mapClass}"></div>`);
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
            for (const index of indexes) {
                if (index < 0 || this._items.length < index) {
                    throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [removeItem(), invalid index: ${index}]`);
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
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} getItemInfo() [invalid index: ${index}]`);
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
                    this.isInitialized && _pages[idx]?.activate();
                });
            }
            // そのほかの page の 状態変更
            for (const key of Object.keys(targets)) {
                const index = Number(key);
                const action = targets[index];
                void runtime.post(() => {
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
                throw runtime.makeResult(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM, `${runtime.toHelpString(runtime.RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} ensureVisible() [invalid index: ${index}]`);
            }
            const { partialOK, setTop, animate, time, callback } = Object.assign({
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
                    const pageIndex = Number(runtime.dom(element).attr(_config.DATA_PAGE_INDEX));
                    if (currentPageIndex - 1 <= pageIndex && pageIndex <= currentPageIndex + 1) {
                        return true;
                    }
                    else {
                        return false;
                    }
                });
                $inactiveMap = runtime.dom(`<section class="${_config.SCROLL_MAP_CLASS} ${_config.INACTIVE_CLASS}"></section>`)
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
                const $el = runtime.dom(el);
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
            return runtime.statusAddRef(status);
        }
        /** 状態変数の参照カウントのデクリメント */
        statusRelease(status) {
            return runtime.statusRelease(status);
        }
        /** 処理スコープ毎に状態変数を設定 */
        statusScope(status, executor) {
            return runtime.statusScope(status, executor);
        }
        /** 指定した状態中であるか確認 */
        isStatusIn(status) {
            return runtime.isStatusIn(status);
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

    exports.ExpandableListItemView = ExpandableListItemView;
    exports.ExpandableListView = ExpandableListView;
    exports.GroupProfile = GroupProfile;
    exports.ItemProfile = ItemProfile;
    exports.ListItemView = ListItemView;
    exports.ListView = ListView;
    exports.ListViewGlobalConfig = ListViewGlobalConfig;
    exports.PageProfile = PageProfile;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktbGlzdHZpZXcuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJnbG9iYWwtY29uZmlnLnRzIiwicHJvZmlsZS9pdGVtLnRzIiwicHJvZmlsZS9wYWdlLnRzIiwicHJvZmlsZS9ncm91cC50cyIsImxpc3QtaXRlbS12aWV3LnRzIiwiY29yZS9lbGVtZW50LXNjcm9sbGVyLnRzIiwiY29yZS9saXN0LnRzIiwibGlzdC12aWV3LnRzIiwiZXhwYW5kYWJsZS1saXN0LWl0ZW0tdmlldy50cyIsImNvcmUvZXhwYW5kLnRzIiwiZXhwYW5kYWJsZS1saXN0LXZpZXcudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBVSV9MSVNUVklFVyA9IChDRFBfS05PV05fTU9EVUxFLk9GRlNFVCArIENEUF9LTk9XTl9VSV9NT0RVTEUuTElTVFZJRVcpICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIFVJX0xJU1RWSUVXX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04gPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDEsICdsaXN0dmlldyBoYXMgaW52YWxpZCBpbml0aWFsaXphdGlvbi4nKSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMiwgJ2xpc3R2aWV3IGdpdmVuIGEgaW52YWxpZCBwYXJhbS4nKSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9PUEVSQVRJT04gICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMywgJ2xpc3R2aWV3IGludmFsaWQgb3BlcmF0aW9uLicpLFxuICAgIH1cbn1cbiIsIi8qKlxuICogQGVuIEdsb2JhbCBjb25maWd1cmF0aW9uIGRlZmluaXRpb24gZm9yIGxpc3Qgdmlld3MuXG4gKiBAamEg44Oq44K544OI44OT44Ol44O844Gu44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Os44O844K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdFZpZXdHbG9iYWxDb25maWcge1xuICAgIE5BTUVTUEFDRTogc3RyaW5nO1xuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHN0cmluZztcbiAgICBJTkFDVElWRV9DTEFTUzogc3RyaW5nO1xuICAgIFJFQ1lDTEVfQ0xBU1M6IHN0cmluZztcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBzdHJpbmc7XG4gICAgREFUQV9QQUdFX0lOREVYOiBzdHJpbmc7XG4gICAgREFUQV9JVEVNX0lOREVYOiBzdHJpbmc7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVmYXVsdFYge1xuICAgIE5BTUVTUEFDRSAgICAgICAgICAgICAgICAgICAgPSAnY2RwLXVpJyxcbiAgICBTQ1JPTExfTUFQX0NMQVNTICAgICAgICAgICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1zY3JvbGwtbWFwYCxcbiAgICBJTkFDVElWRV9DTEFTUyAgICAgICAgICAgICAgID0gYCR7TkFNRVNQQUNFfS1pbmFjdGl2ZWAsXG4gICAgUkVDWUNMRV9DTEFTUyAgICAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctcmVjeWNsZWAsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUyAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctaXRlbS1iYXNlYCxcbiAgICBEQVRBX1BBR0VfSU5ERVggICAgICAgICAgICAgID0gJ2RhdGEtcGFnZS1pbmRleCcsXG4gICAgREFUQV9JVEVNX0lOREVYICAgICAgICAgICAgICA9ICdkYXRhLWl0ZW0taW5kZXgnLFxufVxuXG5jb25zdCBfY29uZmlnID0ge1xuICAgIE5BTUVTUEFDRTogRGVmYXVsdFYuTkFNRVNQQUNFLFxuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IERlZmF1bHRWLlNDUk9MTF9NQVBfQ0xBU1MsXG4gICAgSU5BQ1RJVkVfQ0xBU1M6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTLFxuICAgIFJFQ1lDTEVfQ0xBU1M6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1MsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogRGVmYXVsdFYuTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICBEQVRBX1BBR0VfSU5ERVg6IERlZmF1bHRWLkRBVEFfUEFHRV9JTkRFWCxcbiAgICBEQVRBX0lURU1fSU5ERVg6IERlZmF1bHRWLkRBVEFfSVRFTV9JTkRFWCxcbn07XG5cbmV4cG9ydCB0eXBlIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnID0gUGFydGlhbDxcblBpY2s8TGlzdFZpZXdHbG9iYWxDb25maWdcbiwgJ05BTUVTUEFDRSdcbnwgJ1NDUk9MTF9NQVBfQ0xBU1MnXG58ICdJTkFDVElWRV9DTEFTUydcbnwgJ1JFQ1lDTEVfQ0xBU1MnXG58ICdMSVNUSVRFTV9CQVNFX0NMQVNTJ1xufCAnREFUQV9QQUdFX0lOREVYJ1xufCAnREFUQV9JVEVNX0lOREVYJ1xuPj47XG5cbmNvbnN0IGVuc3VyZU5ld0NvbmZpZyA9IChuZXdDb25maWc6IExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnKTogUGFydGlhbDxMaXN0Vmlld0dsb2JhbENvbmZpZz4gPT4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgTkFNRVNQQUNFOiBucyxcbiAgICAgICAgU0NST0xMX01BUF9DTEFTUzogc2Nyb2xsbWFwLFxuICAgICAgICBJTkFDVElWRV9DTEFTUzogaW5hY3RpdmUsXG4gICAgICAgIFJFQ1lDTEVfQ0xBU1M6IHJlY3ljbGUsXG4gICAgICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IGl0ZW1iYXNlLFxuICAgICAgICBEQVRBX1BBR0VfSU5ERVg6IGRhdGFwYWdlLFxuICAgICAgICBEQVRBX0lURU1fSU5ERVg6IGRhdGFpdGVtLFxuICAgIH0gPSBuZXdDb25maWc7XG5cbiAgICBjb25zdCBOQU1FU1BBQ0UgPSBucztcbiAgICBjb25zdCBTQ1JPTExfTUFQX0NMQVNTID0gc2Nyb2xsbWFwID8/IChucyA/IGAke25zfS1saXN0dmlldy1zY3JvbGwtbWFwYCA6IHVuZGVmaW5lZCk7XG4gICAgY29uc3QgSU5BQ1RJVkVfQ0xBU1MgPSBpbmFjdGl2ZSA/PyAobnMgPyBgJHtuc30taW5hY3RpdmVgIDogdW5kZWZpbmVkKTtcbiAgICBjb25zdCBSRUNZQ0xFX0NMQVNTID0gcmVjeWNsZSA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctcmVjeWNsZWAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IExJU1RJVEVNX0JBU0VfQ0xBU1MgPSBpdGVtYmFzZSA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctaXRlbS1iYXNlYCA6IHVuZGVmaW5lZCk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXdDb25maWcsIHtcbiAgICAgICAgTkFNRVNQQUNFLFxuICAgICAgICBTQ1JPTExfTUFQX0NMQVNTLFxuICAgICAgICBJTkFDVElWRV9DTEFTUyxcbiAgICAgICAgUkVDWUNMRV9DTEFTUyxcbiAgICAgICAgTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICAgICAgREFUQV9QQUdFX0lOREVYOiBkYXRhcGFnZSxcbiAgICAgICAgREFUQV9JVEVNX0lOREVYOiBkYXRhaXRlbSxcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIEdldC9VcGRhdGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gb2YgbGlzdCB2aWV3LlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+OBruWPluW+ly/mm7TmlrBcbiAqL1xuZXhwb3J0IGNvbnN0IExpc3RWaWV3R2xvYmFsQ29uZmlnID0gKG5ld0NvbmZpZz86IExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnKTogTGlzdFZpZXdHbG9iYWxDb25maWcgPT4ge1xuICAgIGlmIChuZXdDb25maWcpIHtcbiAgICAgICAgZW5zdXJlTmV3Q29uZmlnKG5ld0NvbmZpZyk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG5ld0NvbmZpZykpIHtcbiAgICAgICAgICAgIGlmICh1bmRlZmluZWQgPT09IG5ld0NvbmZpZ1trZXkgYXMga2V5b2YgTGlzdFZpZXdHbG9iYWxDb25maWdBcmddKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIG5ld0NvbmZpZ1trZXkgYXMga2V5b2YgTGlzdFZpZXdHbG9iYWxDb25maWdBcmddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBPYmplY3QuYXNzaWduKF9jb25maWcsIG5ld0NvbmZpZykpO1xufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgfSBmcm9tICdAY2RwL3VpLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9iYXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdEl0ZW1WaWV3LFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcixcbiAgICBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMsXG59IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHsgTGlzdFZpZXdHbG9iYWxDb25maWcgfSBmcm9tICcuLi9nbG9iYWwtY29uZmlnJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIGxpc3QgaXRlbXMuXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgSXRlbVByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUxpc3RDb250ZXh0O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5mbzogVW5rbm93bk9iamVjdDtcbiAgICAvKiogQGludGVybmFsIGdsb2JhbCBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4PzogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgYmVsb25naW5nIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9wYWdlSW5kZXg/OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgb2Zmc2V0ICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGJhc2UgZG9tIGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfJGJhc2U/OiBET007XG4gICAgLyoqIEBpbnRlcm5hbCBJTGlzdEl0ZW1WaWV3IGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfaW5zdGFuY2U/OiBJTGlzdEl0ZW1WaWV3O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RWaWV3Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruWIneacn+OBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUxpc3RDb250ZXh0LCBoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgX2luZm86IFVua25vd25PYmplY3QpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgICAgICAgPSBvd25lcjtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICAgICAgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVyID0gaW5pdGlhbGl6ZXI7XG4gICAgICAgIHRoaXMuX2luZm8gICAgICAgID0gX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGhlaWdodC4gKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGdsb2JhbCBpbmRleC4gKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgc2V0IGluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy51cGRhdGVJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgYmVsb25naW5nIHRoZSBwYWdlIGluZGV4LiAqL1xuICAgIGdldCBwYWdlSW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VJbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBzZXQgcGFnZUluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fcGFnZUluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIGdldCBvZmZzZXQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGdsb2JhbCBvZmZzZXQuICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBpbml0IHBhcmFtZXRlcnMuICovXG4gICAgZ2V0IGluZm8oKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdGhpcy5wcmVwYXJlQmFzZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgZWw6IHRoaXMuXyRiYXNlLFxuICAgICAgICAgICAgICAgIG93bmVyOiB0aGlzLl9vd25lcixcbiAgICAgICAgICAgICAgICBpdGVtOiB0aGlzLFxuICAgICAgICAgICAgfSwgdGhpcy5faW5mbyk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IG5ldyB0aGlzLl9pbml0aWFsaXplcihvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICgnbm9uZScgPT09IHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSW5kZXgoKTtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICd2aXNpYmxlJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgaXRlbSBpbnZpc2libGUuXG4gICAgICogQGphIGl0ZW0g44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICdoaWRkZW4nICE9PSB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknKSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmFkZENsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mm7TmlrBcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlLnJlbmRlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBhY3RpdmF0aW9uIHN0YXR1cyBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfnirbmhYvliKTlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2luc3RhbmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaGVpZ2h0IGluZm9ybWF0aW9uIG9mIHRoZSBpdGVtLiBDYWxsZWQgZnJvbSB7QGxpbmsgTGlzdEl0ZW1WaWV3fS5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXmg4XloLHjga7mm7TmlrAuIHtAbGluayBMaXN0SXRlbVZpZXd9IOOBi+OCieOCs+ODvOODq+OBleOCjOOCi+OAglxuICAgICAqL1xuICAgIHB1YmxpYyB1cGRhdGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZGVsdGEgPSBuZXdIZWlnaHQgLSB0aGlzLl9oZWlnaHQ7XG4gICAgICAgIHRoaXMuX2hlaWdodCA9IG5ld0hlaWdodDtcbiAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhKTtcbiAgICAgICAgaWYgKG9wdGlvbnM/LnJlZmxlY3RBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVByb2ZpbGVzKHRoaXMuX2luZGV4ID8/IDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHotaW5kZXguIENhbGxlZCBmcm9tIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYC5cbiAgICAgKiBAamEgei1pbmRleCDjga7jg6rjgrvjg4Pjg4guIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYCDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXREZXB0aCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ3otaW5kZXgnLCB0aGlzLl9vd25lci5vcHRpb25zLmJhc2VEZXB0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcHJlcGFyZUJhc2VFbGVtZW50KCk6IERPTSB7XG4gICAgICAgIGxldCAkYmFzZTogRE9NO1xuICAgICAgICBjb25zdCAkcmVjeWNsZSA9IHRoaXMuX293bmVyLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5maXJzdCgpO1xuICAgICAgICBjb25zdCBpdGVtVGFnTmFtZSA9IHRoaXMuX293bmVyLm9wdGlvbnMuaXRlbVRhZ05hbWU7XG5cbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybigndGhpcy5fJGJhc2UgaXMgbm90IG51bGwuJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fJGJhc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8ICRyZWN5Y2xlLmxlbmd0aCkge1xuICAgICAgICAgICAgJGJhc2UgPSAkcmVjeWNsZTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUF0dHIoJ3otaW5kZXgnKTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUNsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86ICDopoHmpJzoqI4uIDxsaT4g5YWo6Iis44GvIDxzbG90PiDjgajjganjga7jgojjgYbjgavljZToqr/jgZnjgovjgYs/XG4gICAgICAgICAgICAkYmFzZSA9ICQoYDwke2l0ZW1UYWdOYW1lfSBjbGFzcz1cIiR7dGhpcy5fY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1N9XCI+PC9cIiR7aXRlbVRhZ05hbWV9XCI+YCk7XG4gICAgICAgICAgICAkYmFzZS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuJHNjcm9sbE1hcC5hcHBlbmQoJGJhc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g6auY44GV44Gu5pu05pawXG4gICAgICAgIGlmICgkYmFzZS5oZWlnaHQoKSAhPT0gdGhpcy5faGVpZ2h0KSB7XG4gICAgICAgICAgICAkYmFzZS5oZWlnaHQodGhpcy5faGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkYmFzZTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfSVRFTV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9pbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfSVRFTV9JTkRFWCwgdGhpcy5faW5kZXghKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVBhZ2VJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9wYWdlSW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgsIHRoaXMuX3BhZ2VJbmRleCEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlT2Zmc2V0KCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fb3duZXIub3B0aW9ucy5lbmFibGVUcmFuc2Zvcm1PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKHRoaXMuXyRiYXNlWzBdKTtcbiAgICAgICAgICAgIGlmICh0cmFuc2xhdGVZICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7dGhpcy5fb2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IHBhcnNlSW50KHRoaXMuXyRiYXNlLmNzcygndG9wJyksIDEwKTtcbiAgICAgICAgICAgIGlmICh0b3AgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndG9wJywgYCR7dGhpcy5fb2Zmc2V0fXB4YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBhdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIG9uZSBwYWdlIG9mIHRoZSBsaXN0LlxuICogQGphIOODquOCueODiDHjg5rjg7zjgrjliIbjga4gVUkg5qeL6YCg5oOF5aCx44KS5qC857SN44GZ44KL44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBQYWdlUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBvZmZzZXQgZnJvbSB0b3AgKi9cbiAgICBwcml2YXRlIF9vZmZzZXQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSdzIGhlaWdodCAqL1xuICAgIHByaXZhdGUgX2hlaWdodCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBpdGVtJ3MgcHJvZmlsZSBtYW5hZ2VkIHdpdGggaW4gcGFnZSAqL1xuICAgIHByaXZhdGUgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIHN0YXR1cyAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicgPSAnaW5hY3RpdmUnO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGhlaWdodCAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIHN0YXR1cyAqL1xuICAgIGdldCBzdGF0dXMoKTogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdhY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgcGFnZSBpbnZpc2libGUuXG4gICAgICogQGphIHBhZ2Ug44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaGlkZGVuJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaGlkZGVuJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVhY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7pnZ7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdpbmFjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBJdGVtUHJvZmlsZX0gdG8gdGhlIHBhZ2UuXG4gICAgICogQGphIHtAbGluayBJdGVtUHJvZmlsZX0g44Gu6L+95YqgXG4gICAgICovXG4gICAgcHVibGljIHB1c2goaXRlbTogSXRlbVByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICs9IGl0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJZiBhbGwge0BsaW5rIEl0ZW1Qcm9maWxlfSB1bmRlciB0aGUgcGFnZSBhcmUgbm90IHZhbGlkLCBkaXNhYmxlIHRoZSBwYWdlJ3Mgc3RhdHVzLlxuICAgICAqIEBqYSDphY3kuIvjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgZnjgbnjgabjgYzmnInlirnjgafjgarjgYTloLTlkIgsIHBhZ2Ug44K544OG44O844K/44K544KS54Sh5Yq544Gr44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIG5vcm1hbGl6ZSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW5hYmxlQWxsID0gdGhpcy5faXRlbXMuZXZlcnkoaXRlbSA9PiBpdGVtLmlzQWN0aXZlKCkpO1xuICAgICAgICBpZiAoIWVuYWJsZUFsbCkge1xuICAgICAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIEl0ZW1Qcm9maWxlfSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6a44GX44GmIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW0oaW5kZXg6IG51bWJlcik6IEl0ZW1Qcm9maWxlIHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX2l0ZW1zLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBmaXJzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDliJ3jga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUZpcnN0KCk6IEl0ZW1Qcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zWzBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDlvozjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUxhc3QoKTogSXRlbVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlbXNbdGhpcy5faXRlbXMubGVuZ3RoIC0gMV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciB9IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9leHBhbmRhYmxlLWNvbnRleHQnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG4vKipcbiAqIEBlbiBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gc3RvcmFnZSBjbGFzcyBmb3IgZ3JvdXAgbWFuYWdlbWVudCBvZiBsaXN0IGl0ZW1zLiA8YnI+XG4gKiAgICAgVGhpcyBjbGFzcyBkb2VzIG5vdCBkaXJlY3RseSBtYW5pcHVsYXRlIHRoZSBET00uXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44KS44Kw44Or44O844OX566h55CG44GZ44KLIFVJIOani+mAoOaDheWgseagvOe0jeOCr+ODqeOCuSA8YnI+XG4gKiAgICAg5pys44Kv44Op44K544Gv55u05o6l44GvIERPTSDjgpLmk43kvZzjgZfjgarjgYRcbiAqL1xuZXhwb3J0IGNsYXNzIEdyb3VwUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwcm9maWxlIGlkICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaWQ6IHN0cmluZztcbiAgICAvKiogQGludGVybmFsIHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9IGluc3RhbmNlKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsIHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX3BhcmVudD86IEdyb3VwUHJvZmlsZTtcbiAgICAvKiogQGludGVybmFsIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9IGFycmF5ICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMgKi9cbiAgICBwcml2YXRlIF9leHBhbmRlZCA9IGZhbHNlO1xuICAgIC8qKiBAaW50ZXJuYWwgcmVnaXN0cmF0aW9uIHN0YXR1cyBmb3IgX293bmVyICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyA9ICd1bnJlZ2lzdGVyZWQnO1xuICAgIC8qKiBAaW50ZXJuYWwgc3RvcmVkIHtAbGluayBJdGVtUHJvZmlsZX0gaW5mb3JtYXRpb24gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUV4cGFuZGFibGVMaXN0Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBpZCBvZiB0aGUgaW5zdGFuY2UuIHNwZWNpZmllZCBieSB0aGUgZnJhbWV3b3JrLlxuICAgICAqICAtIGBqYWAg44Kk44Oz44K544K/44Oz44K544GuIElELiDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jgYzmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCwgaWQ6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9pZCAgICA9IGlkO1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgSUQuXG4gICAgICogQGphIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQGVuIEdldCBzdGF0dXMuICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnXG4gICAgICogQGphIOOCueODhuODvOOCv+OCueOCkuWPluW+lyAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqL1xuICAgIGdldCBzdGF0dXMoKTogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMuXG4gICAgICogQGphIOWxlemWi+eKtuaFi+OCkuWIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4cGFuZGVkLCBjb2xsYXBzZWQ6IGNsb3NlXG4gICAgICogIC0gYGphYCB0cnVlOiDlsZXplossIGZhbHNlOiDlj47mnZ9cbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4cGFuZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcGFyZW50IHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDopqoge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHBhcmVudCgpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY2hpbGRyZW4ge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY2hpbGRyZW4oKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBuZXh0IGF2YWlsYWJsZSBpbmRleCBvZiB0aGUgbGFzdCBpdGVtIGVsZW1lbnQuXG4gICAgICogQGphIOacgOW+jOOBriBpdGVtIOimgee0oOOBruasoeOBq+S9v+eUqOOBp+OBjeOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB3aXRoQWN0aXZlQ2hpbGRyZW4gXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gc2VhcmNoIGluY2x1ZGluZyByZWdpc3RlcmVkIGNoaWxkIGVsZW1lbnRzXG4gICAgICogIC0gYGphYCDnmbvpjLLmuIjjgb/jga7lrZDopoHntKDjgpLlkKvjgoHjgabmpJzntKLjgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0TmV4dEl0ZW1JbmRleCh3aXRoQWN0aXZlQ2hpbGRyZW4gPSBmYWxzZSk6IG51bWJlciB7XG4gICAgICAgIGxldCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBpZiAod2l0aEFjdGl2ZUNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsID09IGl0ZW1zIHx8IGl0ZW1zLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMuX2l0ZW1zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaXRlbXNbaXRlbXMubGVuZ3RoIC0gMV0/LmluZGV4ID8/IDApICsgMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIOacrCBHcm91cFByb2ZpbGUg44GM566h55CG44GZ44KLIGl0ZW0g44KS5L2c5oiQ44GX44Gm55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGRJdGVtKFxuICAgICAgICBoZWlnaHQ6IG51bWJlcixcbiAgICAgICAgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcixcbiAgICAgICAgaW5mbzogVW5rbm93bk9iamVjdCxcbiAgICApOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGdyb3VwOiB0aGlzIH0sIGluZm8pO1xuICAgICAgICBjb25zdCBpdGVtID0gbmV3IEl0ZW1Qcm9maWxlKHRoaXMuX293bmVyLmNvbnRleHQsIE1hdGgudHJ1bmMoaGVpZ2h0KSwgaW5pdGlhbGl6ZXIsIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIF9vd25lciDjga7nrqHnkIbkuIvjgavjgYLjgovjgajjgY3jga/pgJ/jgoTjgYvjgavov73liqBcbiAgICAgICAgaWYgKCdyZWdpc3RlcmVkJyA9PT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtLCB0aGlzLmdldE5leHRJdGVtSW5kZXgoKSk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQge0BsaW5rIEdyb3VwUHJvZmlsZX0gYXMgY2hpbGQgZWxlbWVudC5cbiAgICAgKiBAamEg5a2Q6KaB57Sg44Go44GX44GmIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAvIGluc3RhbmNlIGFycmF5XG4gICAgICovXG4gICAgcHVibGljIGFkZENoaWxkcmVuKHRhcmdldDogR3JvdXBQcm9maWxlIHwgR3JvdXBQcm9maWxlW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gQXJyYXkuaXNBcnJheSh0YXJnZXQpID8gdGFyZ2V0IDogW3RhcmdldF07XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGNoaWxkLnNldFBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jaGlsZHJlbi5wdXNoKC4uLmNoaWxkcmVuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSBpZiBpdCBoYXMgYSBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBnZXQgaGFzQ2hpbGRyZW4oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2NoaWxkcmVuLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgZXhwYW5zaW9uLlxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5flsZXplotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZXhwYW5kKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdyZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdleHBhbmRpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtcywgdGhpcy5nZXROZXh0SXRlbUluZGV4KCkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyDlrZDopoHntKDjgYzjgarjgY/jgabjgoLlsZXplovnirbmhYvjgavjgZnjgotcbiAgICAgICAgdGhpcy5fZXhwYW5kZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cCBjb2xsYXBzZS5cbiAgICAgKiBAamEg44Kw44Or44O844OX5Y+O5p2fXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgc3BlbnQgcmVtb3ZpbmcgZWxlbWVudHMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqICAtIGBqYWAg6KaB57Sg5YmK6Zmk44Gr6LK744KE44GZ6YGF5bu25pmC6ZaTLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgY29sbGFwc2UoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCd1bnJlZ2lzdGVyZWQnKTtcbiAgICAgICAgICAgIGlmICgwIDwgaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsYXkgPSBkZWxheSA/PyB0aGlzLl9vd25lci5jb250ZXh0Lm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb247XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fb3duZXIuc3RhdHVzU2NvcGUoJ2NvbGxhcHNpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBpdGVtc1swXS5pbmRleCAmJiB0aGlzLl9vd25lci5yZW1vdmVJdGVtKGl0ZW1zWzBdLmluZGV4LCBpdGVtcy5sZW5ndGgsIGRlbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5Y+O5p2f54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3cgc2VsZiBpbiB2aXNpYmxlIGFyZWEgb2YgbGlzdC5cbiAgICAgKiBAamEg6Ieq6Lqr44KS44Oq44K544OI44Gu5Y+v6KaW6aCY5Z+f44Gr6KGo56S6XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb3B0aW9uJ3Mgb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBlbnN1cmVWaXNpYmxlKG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIChudWxsICE9IHRoaXMuX2l0ZW1zWzBdLmluZGV4KSAmJiBhd2FpdCB0aGlzLl9vd25lci5lbnN1cmVWaXNpYmxlKHRoaXMuX2l0ZW1zWzBdLmluZGV4LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnM/LmNhbGxiYWNrPy4odGhpcy5fb3duZXIuc2Nyb2xsUG9zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUb2dnbGUgZXhwYW5kIC8gY29sbGFwc2UuXG4gICAgICogQGphIOmWi+mWieOBruODiOOCsOODq1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHRvZ2dsZShkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5fZXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29sbGFwc2UoZGVsYXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5leHBhbmQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjgbjnmbvpjLIuIOesrDHpmo7lsaTjgrDjg6vjg7zjg5fjga7jgb/nmbvpjLLlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5zZXJ0aW9uIHBvc2l0aW9uIHdpdGggaW5kZXhcbiAgICAgKiAgLSBgamFgIOaMv+WFpeS9jee9ruOCkiBpbmRleCDjgafmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIoaW5zZXJ0VG86IG51bWJlcik6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3JlZ2lzdGVyJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKHRoaXMucHJlcHJvY2VzcygncmVnaXN0ZXJlZCcpLCBpbnNlcnRUbyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN0b3JlIHRvIGxpc3Qgdmlldy4gT25seSAxc3QgbGF5ZXIgZ3JvdXAgY2FuIGJlIHNwZWNpZmllZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G45b6p5YWDLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/5oyH56S65Y+v6IO9LlxuICAgICAqL1xuICAgIHB1YmxpYyByZXN0b3JlKCk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3Jlc3RvcmUnIG1ldGhvZCBpcyBhY2NlcHRhYmxlIG9ubHkgMXN0IGxheWVyIGdyb3VwLmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5fZXhwYW5kZWQgPyB0aGlzLl9pdGVtcy5jb25jYXQodGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgnYWN0aXZlJykpIDogdGhpcy5faXRlbXMuc2xpY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwg6KaqIEdyb3VwIOaMh+WumiAqL1xuICAgIHByaXZhdGUgc2V0UGFyZW50KHBhcmVudDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICByZWdpc3RlciAvIHVucmVnaXN0ZXIg44Gu5YmN5Yem55CGICovXG4gICAgcHJpdmF0ZSBwcmVwcm9jZXNzKG5ld1N0YXR1czogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcpOiBJdGVtUHJvZmlsZVtdIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgaWYgKG5ld1N0YXR1cyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKC4uLnRoaXMuX2l0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSBuZXdTdGF0dXM7XG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIOaTjeS9nOWvvuixoeOBriBJdGVtUHJvZmlsZSDphY3liJfjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIHF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KG9wZXJhdGlvbjogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcgfCAnYWN0aXZlJyk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBmaW5kVGFyZ2V0cyA9IChncm91cDogR3JvdXBQcm9maWxlKTogSXRlbVByb2ZpbGVbXSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBncm91cC5fY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndW5yZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGQucHJlcHJvY2VzcyhvcGVyYXRpb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdhY3RpdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY2hpbGQuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZC5faXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0aW9uOiAke29wZXJhdGlvbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmZpbmRUYXJnZXRzKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmluZFRhcmdldHModGhpcyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgVmlldyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdFZpZXcsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxuICAgIElMaXN0SXRlbVZpZXcsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IG93bmVyOiBJTGlzdFZpZXc7XG4gICAgcmVhZG9ubHkgaXRlbTogSXRlbVByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIExpc3RJdGVtVmlld30gY29uc3RydWN0aW9uLlxuICogQGphIHtAbGluayBMaXN0SXRlbVZpZXd9IOani+evieOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBvd25lcjogSUxpc3RWaWV3O1xuICAgIGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIExpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RJdGVtVmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG93bmVyLCBpdGVtIH0gPSBvcHRpb25zO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIG93bmVyLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKiBPd25lciDlj5blvpcgKi9cbiAgICBnZXQgb3duZXIoKTogSUxpc3RWaWV3IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLm93bmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFZpZXcgY29tcG9uZW50IG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy4kZWwuY2hpbGRyZW4oKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy4kZWwub2ZmKCk7XG4gICAgICAgIC8vIHRoaXMuJGVsIOOBr+WGjeWIqeeUqOOBmeOCi+OBn+OCgeWujOWFqOOBquegtOajhOOBr+OBl+OBquOBhFxuICAgICAgICB0aGlzLnNldEVsZW1lbnQoJ251bGwnKTtcbiAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0SXRlbVZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgb3duIGl0ZW0gaW5kZXhcbiAgICAgKiBAamEg6Ieq6Lqr44GuIGl0ZW0g44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLmluZGV4ITtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNwZWNpZmllZCBoZWlnaHQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+mrmOOBleOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBpZiBjaGlsZCBub2RlIGV4aXN0cy5cbiAgICAgKiBAamEgY2hpbGQgbm9kZSDjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaGFzQ2hpbGROb2RlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLiRlbD8uY2hpbGRyZW4oKS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBpdGVtJ3MgaGVpZ2h0LlxuICAgICAqIEBqYSBpdGVtIOOBrumrmOOBleOCkuabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld0hlaWdodFxuICAgICAqICAtIGBlbmAgbmV3IGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5paw44GX44GE6auY44GVXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBvcHRpb25zIG9iamVjdFxuICAgICAqICAtIGBqYWAg5pu05paw44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzLiRlbCAmJiB0aGlzLmhlaWdodCAhPT0gbmV3SGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLnVwZGF0ZUhlaWdodChuZXdIZWlnaHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy4kZWwuaGVpZ2h0KG5ld0hlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIE51bGxhYmxlLFxuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIHR5cGUgQ29ubmVjdEV2ZW50TWFwLFxuICAgIHR5cGUgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdFNjcm9sbGVyRmFjdG9yeSxcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgU2Nyb2xsZXJFdmVudE1hcCA9IEhUTUxFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXAgJiB7ICdzY3JvbGxzdG9wJzogRXZlbnQ7IH07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIE1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OID0gNTAsXG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBIVE1MRWxlbWVudC5cbiAqIEBqYSBIVE1MRWxlbWVudCDjgpLlr77osaHjgajjgZfjgZ8ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IOWun+ijheOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRWxlbWVudFNjcm9sbGVyIGltcGxlbWVudHMgSUxpc3RTY3JvbGxlciB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJHRhcmdldDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRzY3JvbGxNYXA6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnM7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsU3RvcFRyaWdnZXI6IERPTUV2ZW50TGlzdGVuZXI7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsRHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IERPTVNlbGVjdG9yLCBtYXA6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldCA9ICQodGFyZ2V0KTtcbiAgICAgICAgdGhpcy5fJHNjcm9sbE1hcCA9IHRoaXMuXyR0YXJnZXQuY2hpbGRyZW4oKS5maXJzdCgpO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcblxuICAgICAgICAvKlxuICAgICAgICAgKiBmaXJlIGN1c3RvbSBldmVudDogYHNjcm9sbHN0b3BgXG4gICAgICAgICAqIGBzY3JvbGxlbmRgIOOBriBTYWZhcmkg5a++5b+c5b6F44GhXG4gICAgICAgICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9FbGVtZW50L3Njcm9sbGVuZF9ldmVudFxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IHRpbWVyOiBUaW1lckhhbmRsZTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSB0aW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQudHJpZ2dlcihuZXcgQ3VzdG9tRXZlbnQoJ3Njcm9sbHN0b3AnLCB7IGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUgfSkpO1xuICAgICAgICAgICAgfSwgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPz8gQ29uc3QuTUlOX1NDUk9MTFNUT1BfRFVSQVRJT04pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxTdG9wVHJpZ2dlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKiog44K/44Kk44OX5a6a576p6K2Y5Yil5a2QICovXG4gICAgc3RhdGljIGdldCBUWVBFKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnY2RwOmVsZW1lbnQtb3ZlcmZsb3ctc2Nyb2xsZXInO1xuICAgIH1cblxuICAgIC8qKiBmYWN0b3J5IOWPluW+lyAqL1xuICAgIHN0YXRpYyBnZXRGYWN0b3J5KCk6IExpc3RTY3JvbGxlckZhY3Rvcnkge1xuICAgICAgICBjb25zdCBmYWN0b3J5ID0gKHRhcmdldDogRE9NU2VsZWN0b3IsIG1hcDogRE9NU2VsZWN0b3IsIG9wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucyk6IElMaXN0U2Nyb2xsZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBFbGVtZW50U2Nyb2xsZXIodGFyZ2V0LCBtYXAsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBzZXQgdHlwZSBzaWduYXR1cmUuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGZhY3RvcnksIHtcbiAgICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBFbGVtZW50U2Nyb2xsZXIuVFlQRSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFjdG9yeSBhcyBMaXN0U2Nyb2xsZXJGYWN0b3J5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsZXJcblxuICAgIC8qKiBTY3JvbGxlciDjga7lnovmg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXQgdHlwZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gRWxlbWVudFNjcm9sbGVyLlRZUEU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruWPluW+lyAqL1xuICAgIGdldCBwb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+acgOWkp+WApOS9jee9ruOCkuWPluW+lyAqL1xuICAgIGdldCBwb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuXyRzY3JvbGxNYXAuaGVpZ2h0KCkgLSB0aGlzLl8kdGFyZ2V0LmhlaWdodCgpLCAwKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76YyyICovXG4gICAgb24odHlwZTogJ3Njcm9sbCcgfCAnc2Nyb2xsc3RvcCcsIGNhbGxiYWNrOiBET01FdmVudExpc3RlbmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub248U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76Yyy6Kej6ZmkICovXG4gICAgb2ZmKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9mZjxTY3JvbGxlckV2ZW50TWFwPih0eXBlLCBjYWxsYmFjayBhcyBVbmtub3duRnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHBvcyA9PT0gdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AoKSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gKGFuaW1hdGUgPz8gdGhpcy5fb3B0aW9ucy5lbmFibGVBbmltYXRpb24pID8gdGltZSA/PyB0aGlzLl9vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AocG9zLCB0aGlzLl9zY3JvbGxEdXJhdGlvbiwgdW5kZWZpbmVkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDjga7nirbmhYvmm7TmlrAgKi9cbiAgICB1cGRhdGUoKTogdm9pZCB7XG4gICAgICAgIC8vIG5vb3BcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu56C05qOEICovXG4gICAgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldD8ub2ZmKCk7XG4gICAgICAgICh0aGlzLl8kdGFyZ2V0IGFzIE51bGxhYmxlPERPTT4pID0gKHRoaXMuXyRzY3JvbGxNYXAgYXMgTnVsbGFibGU8RE9NPikgPSBudWxsO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBwb3N0LFxuICAgIG5vb3AsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQge1xuICAgIGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyxcbiAgICBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uLFxuICAgIGNsZWFyVHJhbnNpdGlvbixcbn0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0Q29udGV4dCxcbiAgICBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbiAgICBJTGlzdE9wZXJhdGlvbixcbiAgICBJTGlzdFNjcm9sbGFibGUsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Vmlld0dsb2JhbENvbmZpZyB9IGZyb20gJy4uL2dsb2JhbC1jb25maWcnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUsIFBhZ2VQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5pbXBvcnQgeyBFbGVtZW50U2Nyb2xsZXIgfSBmcm9tICcuL2VsZW1lbnQtc2Nyb2xsZXInO1xuXG4vKiogTGlzdENvbnRleHRPcHRpb25zIOaXouWumuWApCAqL1xuY29uc3QgX2RlZmF1bHRPcHRzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+ID0ge1xuICAgIHNjcm9sbGVyRmFjdG9yeTogRWxlbWVudFNjcm9sbGVyLmdldEZhY3RvcnkoKSxcbiAgICBlbmFibGVIaWRkZW5QYWdlOiBmYWxzZSxcbiAgICBlbmFibGVUcmFuc2Zvcm1PZmZzZXQ6IGZhbHNlLFxuICAgIHNjcm9sbE1hcFJlZnJlc2hJbnRlcnZhbDogMjAwLFxuICAgIHNjcm9sbFJlZnJlc2hEaXN0YW5jZTogMjAwLFxuICAgIHBhZ2VQcmVwYXJlQ291bnQ6IDMsXG4gICAgcGFnZVByZWxvYWRDb3VudDogMSxcbiAgICBlbmFibGVBbmltYXRpb246IHRydWUsXG4gICAgYW5pbWF0aW9uRHVyYXRpb246IDAsXG4gICAgYmFzZURlcHRoOiAnYXV0bycsXG4gICAgaXRlbVRhZ05hbWU6ICdkaXYnLFxuICAgIHJlbW92ZUl0ZW1XaXRoVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICB1c2VEdW1teUluYWN0aXZlU2Nyb2xsTWFwOiBmYWxzZSxcbn07XG5cbi8qKiBpbnZhbGlkIGluc3RhbmNlICovXG5jb25zdCBfJGludmFsaWQgPSAkKCkgYXMgRE9NO1xuXG4vKiog5Yid5pyf5YyW5riI44G/44GL5qSc6Ki8ICovXG5mdW5jdGlvbiB2ZXJpZnk8VD4oeDogVCB8IHVuZGVmaW5lZCk6IGFzc2VydHMgeCBpcyBUIHtcbiAgICBpZiAobnVsbCA9PSB4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9JTklUSUFMSVpBVElPTik7XG4gICAgfVxufVxuXG4vKiogb3ZlcmZsb3cteSDjgpLkv53oqLwgKi9cbmZ1bmN0aW9uIGVuc3VyZU92ZXJmbG93WSgkZWw6IERPTSk6IERPTSB7XG4gICAgY29uc3Qgb3ZlcmZsb3dZID0gJGVsLmNzcygnb3ZlcmZsb3cteScpO1xuICAgIGlmICgnaGlkZGVuJyA9PT0gb3ZlcmZsb3dZIHx8ICd2aXNpYmxlJyA9PT0gb3ZlcmZsb3dZKSB7XG4gICAgICAgICRlbC5jc3MoJ292ZXJmbG93LXknLCAnYXV0bycpO1xuICAgIH1cbiAgICByZXR1cm4gJGVsO1xufVxuXG4vKiogc2Nyb2xsLW1hcCBlbGVtZW50IOOCkuS/neiovCAqL1xuZnVuY3Rpb24gZW5zdXJlU2Nyb2xsTWFwKCRyb290OiBET00sIG1hcENsYXNzOiBzdHJpbmcpOiBET00ge1xuICAgIGxldCAkbWFwID0gJHJvb3QuZmluZChgLiR7bWFwQ2xhc3N9YCk7XG4gICAgLy8gJG1hcCDjgYznhKHjgYTloLTlkIjjga/kvZzmiJDjgZnjgotcbiAgICBpZiAoJG1hcC5sZW5ndGggPD0gMCkge1xuICAgICAgICAkbWFwID0gJChgPGRpdiBjbGFzcz1cIiR7bWFwQ2xhc3N9XCI+PC9kaXY+YCk7XG4gICAgICAgICRyb290LmFwcGVuZCgkbWFwKTtcbiAgICB9XG4gICAgcmV0dXJuICRtYXA7XG59XG5cbi8qKiBAaW50ZXJuYWwg44Ki44Kk44OG44Og5YmK6Zmk5oOF5aCxICovXG5pbnRlcmZhY2UgUmVtb3ZlSXRlbXNDb250ZXh0IHtcbiAgICByZW1vdmVkOiBJdGVtUHJvZmlsZVtdO1xuICAgIGRlbHRhOiBudW1iZXI7XG4gICAgdHJhbnNpdGlvbjogYm9vbGVhbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4gQ29yZSBsb2dpYyBpbXBsZW1lbnRhdGlvbiBjbGFzcyBmb3Igc2Nyb2xsIHByb2Nlc3NpbmcgdGhhdCBtYW5hZ2VzIG1lbW9yeS4gQWNjZXNzZXMgdGhlIERPTS5cbiAqIEBqYSDjg6Hjg6Ljg6rnrqHnkIbjgpLooYzjgYbjgrnjgq/jg63jg7zjg6vlh6bnkIbjga7jgrPjgqLjg63jgrjjg4Pjgq/lrp/oo4Xjgq/jg6njgrkuIERPTSDjgavjgqLjgq/jgrvjgrnjgZnjgosuXG4gKi9cbmV4cG9ydCBjbGFzcyBMaXN0Q29yZSBpbXBsZW1lbnRzIElMaXN0Q29udGV4dCwgSUxpc3RPcGVyYXRpb24sIElMaXN0U2Nyb2xsYWJsZSwgSUxpc3RCYWNrdXBSZXN0b3JlIHtcbiAgICBwcml2YXRlIF8kcm9vdDogRE9NO1xuICAgIHByaXZhdGUgXyRtYXA6IERPTTtcbiAgICBwcml2YXRlIF9tYXBIZWlnaHQgPSAwO1xuICAgIHByaXZhdGUgX3Njcm9sbGVyOiBJTGlzdFNjcm9sbGVyIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqIFVJIOihqOekuuS4reOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfYWN0aXZlID0gdHJ1ZTtcblxuICAgIC8qKiDliJ3mnJ/jgqrjg5fjgrfjg6fjg7PjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zZXR0aW5nczogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPjtcbiAgICAvKiogU2Nyb2xsIEV2ZW50IEhhbmRsZXIgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxFdmVudEhhbmRsZXI6IChldj86IEV2ZW50KSA9PiB2b2lkO1xuICAgIC8qKiBTY3JvbGwgU3RvcCBFdmVudCBIYW5kbGVyICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcjogKGV2PzogRXZlbnQpID0+IHZvaWQ7XG4gICAgLyoqIDHjg5rjg7zjgrjliIbjga7pq5jjgZXjga7ln7rmupblgKQgKi9cbiAgICBwcml2YXRlIF9iYXNlSGVpZ2h0ID0gMDtcbiAgICAvKiog566h55CG5LiL44Gr44GC44KLIEl0ZW1Qcm9maWxlIOmFjeWIlyAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgLyoqIOeuoeeQhuS4i+OBq+OBguOCiyBQYWdlUHJvZmlsZSDphY3liJcgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wYWdlczogUGFnZVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgLyoqIOacgOaWsOOBruihqOekuumgmOWfn+aDheWgseOCkuagvOe0jSAoU2Nyb2xsIOS4reOBruabtOaWsOWHpueQhuOBq+S9v+eUqCkgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9sYXN0QWN0aXZlUGFnZUNvbnRleHQgPSB7XG4gICAgICAgIGluZGV4OiAwLFxuICAgICAgICBmcm9tOiAwLFxuICAgICAgICB0bzogMCxcbiAgICAgICAgcG9zOiAwLCAgICAvLyBzY3JvbGwgcG9zaXRpb25cbiAgICB9O1xuXG4gICAgLyoqIOODh+ODvOOCv+OBriBiYWNrdXAg6aCY5Z+fLiBrZXkg44GoIF9pdGVtcyDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9iYWNrdXA6IFJlY29yZDxzdHJpbmcsIHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0+ID0ge307XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogTGlzdENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHRoaXMuXyRyb290ID0gdGhpcy5fJG1hcCA9IF8kaW52YWxpZDtcbiAgICAgICAgdGhpcy5fc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBfZGVmYXVsdE9wdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgIHRoaXMuX3Njcm9sbEV2ZW50SGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TY3JvbGwodGhpcy5fc2Nyb2xsZXIhLnBvcyk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uU2Nyb2xsU3RvcCh0aGlzLl9zY3JvbGxlciEucG9zKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKiDlhoXpg6jjgqrjg5bjgrjjgqfjgq/jg4jjga7liJ3mnJ/ljJYgKi9cbiAgICBwdWJsaWMgaW5pdGlhbGl6ZSgkcm9vdDogRE9NLCBoZWlnaHQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvLyDml6Ljgavmp4vnr4njgZXjgozjgabjgYTjgZ/loLTlkIjjga/noLTmo4RcbiAgICAgICAgaWYgKHRoaXMuXyRyb290Lmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl8kcm9vdCA9IGVuc3VyZU92ZXJmbG93WSgkcm9vdCk7XG4gICAgICAgIHRoaXMuXyRtYXAgID0gZW5zdXJlU2Nyb2xsTWFwKHRoaXMuXyRyb290LCB0aGlzLl9jb25maWcuU0NST0xMX01BUF9DTEFTUyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsZXIgPSB0aGlzLmNyZWF0ZVNjcm9sbGVyKCk7XG4gICAgICAgIHRoaXMuc2V0QmFzZUhlaWdodChoZWlnaHQpO1xuICAgICAgICB0aGlzLnNldFNjcm9sbGVyQ29uZGl0aW9uKCk7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruegtOajhCAqL1xuICAgIHB1YmxpYyBkZXN0cm95KCk6IHZvaWQge1xuICAgICAgICB0aGlzLnJlc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLl8kcm9vdCA9IHRoaXMuXyRtYXAgPSBfJGludmFsaWQ7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOBruWfuua6luWApOOCkuWPluW+lyAqL1xuICAgIHB1YmxpYyBzZXRCYXNlSGVpZ2h0KGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChoZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW2Jhc2UgaGlnaHQ6ICR7aGVpZ2h0fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Jhc2VIZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiogYWN0aXZlIOeKtuaFi+ioreWumiAqL1xuICAgIHB1YmxpYyBhc3luYyBzZXRBY3RpdmVTdGF0ZShhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fYWN0aXZlID0gYWN0aXZlO1xuICAgICAgICBhd2FpdCB0aGlzLnRyZWF0U2Nyb2xsUG9zaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiogYWN0aXZlIOeKtuaFi+WIpOWumiAqL1xuICAgIGdldCBhY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOBruS/neWtmC/lvqnlhYMgKi9cbiAgICBwdWJsaWMgYXN5bmMgdHJlYXRTY3JvbGxQb3NpdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcblxuICAgICAgICBjb25zdCBvZmZzZXQgPSAodGhpcy5fc2Nyb2xsZXIucG9zIC0gdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyk7XG4gICAgICAgIGNvbnN0IHsgdXNlRHVtbXlJbmFjdGl2ZVNjcm9sbE1hcDogdXNlRHVtbXlNYXAgfSA9IHRoaXMuX3NldHRpbmdzO1xuXG4gICAgICAgIGNvbnN0IHVwZGF0ZU9mZnNldCA9ICgkdGFyZ2V0OiBET00pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKCR0YXJnZXRbMF0pO1xuICAgICAgICAgICAgaWYgKG9mZnNldCAhPT0gdHJhbnNsYXRlWSkge1xuICAgICAgICAgICAgICAgICR0YXJnZXQuY3NzKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlM2QoMCwke29mZnNldH1weCwwYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fc2Nyb2xsZXIuc2Nyb2xsVG8odGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcywgZmFsc2UsIDApO1xuICAgICAgICAgICAgdGhpcy5fJG1hcC5jc3MoeyAndHJhbnNmb3JtJzogJycsICdkaXNwbGF5JzogJ2Jsb2NrJyB9KTtcbiAgICAgICAgICAgIGlmICh1c2VEdW1teU1hcCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJlcGFyZUluYWN0aXZlTWFwKCkucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCAkbWFwID0gdXNlRHVtbXlNYXAgPyB0aGlzLnByZXBhcmVJbmFjdGl2ZU1hcCgpIDogdGhpcy5fJG1hcDtcbiAgICAgICAgICAgIHVwZGF0ZU9mZnNldCgkbWFwKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0Q29udGV4dFxuXG4gICAgLyoqIGdldCBzY3JvbGwtbWFwIGVsZW1lbnQgKi9cbiAgICBnZXQgJHNjcm9sbE1hcCgpOiBET00ge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IHNjcm9sbC1tYXAgaGVpZ2h0IFtweF0gKi9cbiAgICBnZXQgc2Nyb2xsTWFwSGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwLmxlbmd0aCA/IHRoaXMuX21hcEhlaWdodCA6IDA7XG4gICAgfVxuXG4gICAgLyoqIGdldCB7QGxpbmsgTGlzdENvbnRleHRPcHRpb25zfSAqL1xuICAgIGdldCBvcHRpb25zKCk6IFJlcXVpcmVkPExpc3RDb250ZXh0T3B0aW9ucz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIHVwZGF0ZSBzY3JvbGwtbWFwIGhlaWdodCAoZGVsdGEgW3B4XSkgKi9cbiAgICB1cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGE6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fJG1hcC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX21hcEhlaWdodCArPSBNYXRoLnRydW5jKGRlbHRhKTtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmUuXG4gICAgICAgICAgICBpZiAodGhpcy5fbWFwSGVpZ2h0IDwgMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21hcEhlaWdodCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl8kbWFwLmhlaWdodCh0aGlzLl9tYXBIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIHVwZGF0ZSBpbnRlcm5hbCBwcm9maWxlICovXG4gICAgdXBkYXRlUHJvZmlsZXMoZnJvbTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBmb3IgKGxldCBpID0gZnJvbSwgbiA9IF9pdGVtcy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICgwIDwgaSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3QgPSBfaXRlbXNbaSAtIDFdO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5pbmRleCA9IGxhc3QuaW5kZXghICsgMTtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0ub2Zmc2V0ID0gbGFzdC5vZmZzZXQgKyBsYXN0LmhlaWdodDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0ub2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBnZXQgcmVjeWNsYWJsZSBlbGVtZW50ICovXG4gICAgZmluZFJlY3ljbGVFbGVtZW50cygpOiBET00ge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcC5maW5kKGAuJHt0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTU31gKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFZpZXdcblxuICAgIC8qKiDliJ3mnJ/ljJbmuIjjgb/jgYvliKTlrpogKi9cbiAgICBnZXQgaXNJbml0aWFsaXplZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fc2Nyb2xsZXI7XG4gICAgfVxuXG4gICAgLyoqIGl0ZW0g55m76YyyICovXG4gICAgYWRkSXRlbShoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgaW5mbzogVW5rbm93bk9iamVjdCwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYWRkSXRlbShuZXcgSXRlbVByb2ZpbGUodGhpcywgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgaW5mbyksIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKOWGhemDqOeUqCkgKi9cbiAgICBfYWRkSXRlbShpdGVtOiBJdGVtUHJvZmlsZSB8IEl0ZW1Qcm9maWxlW10sIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gQXJyYXkuaXNBcnJheShpdGVtKSA/IGl0ZW0gOiBbaXRlbV07XG4gICAgICAgIGxldCBkZWx0YUhlaWdodCA9IDA7XG4gICAgICAgIGxldCBhZGRUYWlsID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKG51bGwgPT0gaW5zZXJ0VG8gfHwgdGhpcy5faXRlbXMubGVuZ3RoIDwgaW5zZXJ0VG8pIHtcbiAgICAgICAgICAgIGluc2VydFRvID0gdGhpcy5faXRlbXMubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluc2VydFRvID09PSB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFkZFRhaWwgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2Nyb2xsIG1hcCDjga7mm7TmlrBcbiAgICAgICAgZm9yIChjb25zdCBpdCBvZiBpdGVtcykge1xuICAgICAgICAgICAgZGVsdGFIZWlnaHQgKz0gaXQuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhSGVpZ2h0KTtcblxuICAgICAgICAvLyDmjL/lhaVcbiAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluc2VydFRvLCAwLCAuLi5pdGVtcyk7XG5cbiAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgaWYgKCFhZGRUYWlsKSB7XG4gICAgICAgICAgICBpZiAoMCA9PT0gaW5zZXJ0VG8pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luc2VydFRvIC0gMV0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyLCBzaXplPzogbnVtYmVyLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIgfCBudW1iZXJbXSwgYXJnMj86IG51bWJlciwgYXJnMz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShpbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1SYW5kb21seShpbmRleCwgYXJnMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVJdGVtQ29udGludW91c2x5KGluZGV4LCBhcmcyLCBhcmczKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBoZWxwZXI6IOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHuiAqL1xuICAgIHByaXZhdGUgX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXM6IG51bWJlcltdLCBkZWxheTogbnVtYmVyKTogUmVtb3ZlSXRlbXNDb250ZXh0IHtcbiAgICAgICAgY29uc3QgcmVtb3ZlZDogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBsZXQgZGVsdGEgPSAwO1xuICAgICAgICBsZXQgdHJhbnNpdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgIGZvciAoY29uc3QgaWR4IG9mIGluZGV4ZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLl9pdGVtc1tpZHhdO1xuICAgICAgICAgICAgZGVsdGEgKz0gaXRlbS5oZWlnaHQ7XG4gICAgICAgICAgICAvLyDliYrpmaTopoHntKDjga4gei1pbmRleCDjga7liJ3mnJ/ljJZcbiAgICAgICAgICAgIGl0ZW0ucmVzZXREZXB0aCgpO1xuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIOiHquWLleioreWumuODu+WJiumZpOmBheW7tuaZgumWk+OBjOioreWumuOBleOCjOOBi+OBpOOAgeOCueOCr+ODreODvOODq+ODneOCuOOCt+ODp+ODs+OBq+WkieabtOOBjOOBguOCi+WgtOWQiOOBryB0cmFuc2l0aW9uIOioreWumlxuICAgICAgICBpZiAodGhpcy5fc2V0dGluZ3MucmVtb3ZlSXRlbVdpdGhUcmFuc2l0aW9uICYmICgwIDwgZGVsYXkpKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5zY3JvbGxQb3M7XG4gICAgICAgICAgICBjb25zdCBwb3NNYXggPSB0aGlzLnNjcm9sbFBvc01heCAtIGRlbHRhO1xuICAgICAgICAgICAgdHJhbnNpdGlvbiA9IChwb3NNYXggPCBjdXJyZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH07XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5pmC44Gu5pu05pawICovXG4gICAgcHJpdmF0ZSBfdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0OiBSZW1vdmVJdGVtc0NvbnRleHQsIGRlbGF5OiBudW1iZXIsIHByb2ZpbGVVcGRhdGU6ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyByZW1vdmVkLCBkZWx0YSwgdHJhbnNpdGlvbiB9ID0gY29udGV4dDtcblxuICAgICAgICAvLyB0cmFuc2l0aW9uIOioreWumlxuICAgICAgICBpZiAodHJhbnNpdGlvbikge1xuICAgICAgICAgICAgdGhpcy5zZXR1cFNjcm9sbE1hcFRyYW5zaXRpb24oZGVsYXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY3VzdG9taXplIHBvaW50OiDjg5fjg63jg5XjgqHjgqTjg6vjga7mm7TmlrBcbiAgICAgICAgcHJvZmlsZVVwZGF0ZSgpO1xuXG4gICAgICAgIC8vIOOCueOCr+ODreODvOODq+mgmOWfn+OBruabtOaWsFxuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbE1hcEhlaWdodCgtZGVsdGEpO1xuICAgICAgICAvLyDpgYXlu7bliYrpmaRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcmVtb3ZlZCkge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBkZWxheSk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBJdGVtUHJvZmlsZSDjgpLliYrpmaQ6IOmAo+e2miBpbmRleCDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtQ29udGludW91c2x5KGluZGV4OiBudW1iZXIsIHNpemU6IG51bWJlciB8IHVuZGVmaW5lZCwgZGVsYXk6IG51bWJlciB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgICAgICBzaXplID0gc2l6ZSA/PyAxO1xuICAgICAgICBkZWxheSA9IGRlbGF5ID8/IDA7XG5cbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbmRleCArIHNpemUpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtyZW1vdmVJdGVtKCksIGludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7pcbiAgICAgICAgY29uc3QgaW5kZXhlcyA9IEFycmF5LmZyb20oeyBsZW5ndGg6IHNpemUgfSwgKF8sIGkpID0+IGluZGV4ICsgaSk7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9xdWVyeVJlbW92ZUl0ZW1zQ29udGV4dChpbmRleGVzLCBkZWxheSk7XG5cbiAgICAgICAgLy8g5pu05pawXG4gICAgICAgIHRoaXMuX3VwZGF0ZVdpdGhSZW1vdmVJdGVtc0NvbnRleHQoY29udGV4dCwgZGVsYXksICgpID0+IHtcbiAgICAgICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaW5kZXhdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDphY3liJfjgYvjgonliYrpmaRcbiAgICAgICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpbmRleCwgc2l6ZSk7XG4gICAgICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGluZGV4KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBnyBJdGVtUHJvZmlsZSDjgpLliYrpmaQ6IHJhbmRvbSBhY2Nlc3Mg54mIICovXG4gICAgcHJpdmF0ZSBfcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4ZXM6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICBkZWxheSA9IGRlbGF5ID8/IDA7XG4gICAgICAgIGluZGV4ZXMuc29ydCgobGhzLCByaHMpID0+IHJocyAtIGxocyk7IC8vIOmZjemghuOCveODvOODiFxuXG4gICAgICAgIGZvciAoY29uc3QgaW5kZXggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbmRleCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3JlbW92ZUl0ZW0oKSwgaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7pcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaWR4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaWR4XS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyDphY3liJfjgYvjgonliYrpmaRcbiAgICAgICAgICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gaW5kZXhlc1tpbmRleGVzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9maWxlcyhmaXJzdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBzY3JvbGwgbWFwIOOBruODiOODqeODs+OCuOOCt+ODp+ODs+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0dXBTY3JvbGxNYXBUcmFuc2l0aW9uKGRlbGF5OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcbiAgICAgICAgY29uc3QgZWwgPSB0aGlzLl8kbWFwWzBdO1xuICAgICAgICB0aGlzLl8kbWFwLnRyYW5zaXRpb25FbmQoKCkgPT4ge1xuICAgICAgICAgICAgY2xlYXJUcmFuc2l0aW9uKGVsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFRyYW5zZm9ybVRyYW5zaXRpb24oZWwsICdoZWlnaHQnLCBkZWxheSwgJ2Vhc2UnKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XICovXG4gICAgZ2V0SXRlbUluZm8odGFyZ2V0OiBudW1iZXIgfCBFdmVudCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICBjb25zdCB7IF9pdGVtcywgX2NvbmZpZyB9ID0gdGhpcztcblxuICAgICAgICBjb25zdCBwYXJzZXIgPSAoJHRhcmdldDogRE9NKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKF9jb25maWcuTElTVElURU1fQkFTRV9DTEFTUykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKCR0YXJnZXQuYXR0cihfY29uZmlnLkRBVEFfSVRFTV9JTkRFWCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKF9jb25maWcuU0NST0xMX01BUF9DTEFTUykgfHwgJHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignY2Fubm90IGRpdGVjdCBpdGVtIGZyb20gZXZlbnQgb2JqZWN0LicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZXIoJHRhcmdldC5wYXJlbnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaW5kZXggPSB0YXJnZXQgaW5zdGFuY2VvZiBFdmVudCA/IHBhcnNlcigkKHRhcmdldC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpKSA6IE51bWJlcih0YXJnZXQpO1xuXG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbdW5zdXBwb3J0ZWQgdHlwZTogJHt0eXBlb2YgdGFyZ2V0fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKGluZGV4IDwgMCB8fCBfaXRlbXMubGVuZ3RoIDw9IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBnZXRJdGVtSW5mbygpIFtpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIF9pdGVtc1tpbmRleF0uaW5mbztcbiAgICB9XG5cbiAgICAvKiog44Ki44Kv44OG44Kj44OW44Oa44O844K444KS5pu05pawICovXG4gICAgcmVmcmVzaCgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBfcGFnZXMsIF9pdGVtcywgX3NldHRpbmdzLCBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0IH0gPSB0aGlzO1xuXG4gICAgICAgIGNvbnN0IHRhcmdldHM6IFJlY29yZDxudW1iZXIsICdhY3RpdmF0ZScgfCAnaGlkZScgfCAnZGVhY3RpdmF0ZSc+ID0ge307XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICBjb25zdCBoaWdoUHJpb3JpdHlJbmRleDogbnVtYmVyW10gPSBbXTtcblxuICAgICAgICBjb25zdCBzdG9yZU5leHRQYWdlU3RhdGUgPSAoaW5kZXg6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnYWN0aXZhdGUnO1xuICAgICAgICAgICAgICAgIGhpZ2hQcmlvcml0eUluZGV4LnB1c2goaW5kZXgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChNYXRoLmFicyhjdXJyZW50UGFnZUluZGV4IC0gaW5kZXgpIDw9IF9zZXR0aW5ncy5wYWdlUHJlcGFyZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnYWN0aXZhdGUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfc2V0dGluZ3MuZW5hYmxlSGlkZGVuUGFnZSkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2hpZGUnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdkZWFjdGl2YXRlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGN1cnJlbnQgcGFnZSDjga4g5YmN5b6M44GvIGhpZ2ggcHJpb3JpdHkg44Gr44GZ44KLXG4gICAgICAgICAgICBpZiAoY3VycmVudFBhZ2VJbmRleCArIDEgPT09IGluZGV4IHx8IGN1cnJlbnRQYWdlSW5kZXggLSAxID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgIGhpZ2hQcmlvcml0eUluZGV4LnB1c2goaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIOWvvuixoeeEoeOBl1xuICAgICAgICBpZiAoX2l0ZW1zLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaENvdW50ID0gX3NldHRpbmdzLnBhZ2VQcmVwYXJlQ291bnQgKyBfc2V0dGluZ3MucGFnZVByZWxvYWRDb3VudDtcbiAgICAgICAgICAgIGNvbnN0IGJlZ2luSW5kZXggPSBjdXJyZW50UGFnZUluZGV4IC0gc2VhcmNoQ291bnQ7XG4gICAgICAgICAgICBjb25zdCBlbmRJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggKyBzZWFyY2hDb3VudDtcblxuICAgICAgICAgICAgbGV0IG92ZXJmbG93UHJldiA9IDAsIG92ZXJmbG93TmV4dCA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBwYWdlSW5kZXggPSBiZWdpbkluZGV4OyBwYWdlSW5kZXggPD0gZW5kSW5kZXg7IHBhZ2VJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmZsb3dQcmV2Kys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoX3BhZ2VzLmxlbmd0aCA8PSBwYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmZsb3dOZXh0Kys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKDAgPCBvdmVyZmxvd1ByZXYpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgcGFnZUluZGV4ID0gY3VycmVudFBhZ2VJbmRleCArIHNlYXJjaENvdW50ICsgMTsgaSA8IG92ZXJmbG93UHJldjsgaSsrLCBwYWdlSW5kZXgrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoX3BhZ2VzLmxlbmd0aCA8PSBwYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKDAgPCBvdmVyZmxvd05leHQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgcGFnZUluZGV4ID0gY3VycmVudFBhZ2VJbmRleCAtIHNlYXJjaENvdW50IC0gMTsgaSA8IG92ZXJmbG93TmV4dDsgaSsrLCBwYWdlSW5kZXgtLSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFnZUluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5LiN6KaB44Gr44Gq44Gj44GfIHBhZ2Ug44GuIOmdnua0u+aAp+WMllxuICAgICAgICBmb3IgKGNvbnN0IHBhZ2Ugb2YgX3BhZ2VzLmZpbHRlcihwYWdlID0+ICdpbmFjdGl2ZScgIT09IHBhZ2Uuc3RhdHVzKSkge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdGFyZ2V0c1twYWdlLmluZGV4XSkge1xuICAgICAgICAgICAgICAgIHBhZ2UuZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YSq5YWIIHBhZ2Ug44GuIGFjdGl2YXRlXG4gICAgICAgIGZvciAoY29uc3QgaWR4IG9mIGhpZ2hQcmlvcml0eUluZGV4LnNvcnQoKGxocywgcmhzKSA9PiBsaHMgLSByaHMpKSB7IC8vIOaYh+mghuOCveODvOODiFxuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgX3BhZ2VzW2lkeF0/LmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOOBneOBruOBu+OBi+OBriBwYWdlIOOBriDnirbmhYvlpInmm7RcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0cykpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gTnVtYmVyKGtleSk7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSB0YXJnZXRzW2luZGV4XTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkICYmIF9wYWdlc1tpbmRleF0/LlthY3Rpb25dPy4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5pu05paw5b6M44Gr5L2/55So44GX44Gq44GL44Gj44GfIERPTSDjgpLliYrpmaRcbiAgICAgICAgdGhpcy5maW5kUmVjeWNsZUVsZW1lbnRzKCkucmVtb3ZlKCk7XG5cbiAgICAgICAgY29uc3QgcGFnZUN1cnJlbnQgPSBfcGFnZXNbY3VycmVudFBhZ2VJbmRleF07XG4gICAgICAgIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQuZnJvbSAgPSBwYWdlQ3VycmVudD8uZ2V0SXRlbUZpcnN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQudG8gICAgPSBwYWdlQ3VycmVudD8uZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCA9IGN1cnJlbnRQYWdlSW5kZXg7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOacquOCouOCteOCpOODs+ODmuODvOOCuOOCkuani+eviSAqL1xuICAgIHVwZGF0ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5hc3NpZ25QYWdlKE1hdGgubWF4KHRoaXMuX3BhZ2VzLmxlbmd0aCAtIDEsIDApKTtcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiDjg5rjg7zjgrjjgqLjgrXjgqTjg7PjgpLlho3mp4vmiJAgKi9cbiAgICByZWJ1aWxkKCk6IHRoaXMge1xuICAgICAgICB0aGlzLmNsZWFyUGFnZSgpO1xuICAgICAgICB0aGlzLmFzc2lnblBhZ2UoKTtcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4QgKi9cbiAgICByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BhZ2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2l0ZW1zLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX21hcEhlaWdodCA9IDA7XG4gICAgICAgIHRoaXMuXyRtYXAuaGVpZ2h0KDApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGFibGVcblxuICAgIC8qKiBzY3JvbGxlciDjga7nqK7poZ7jgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsZXJUeXBlKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8udHlwZTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbFBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnBvcyA/PyAwO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7mnIDlpKflgKTjgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8ucG9zTWF4ID8/IDA7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaQgKi9cbiAgICBzZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5bbWV0aG9kXSgnc2Nyb2xsJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaQgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uW21ldGhvZF0oJ3Njcm9sbHN0b3AnLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aICovXG4gICAgYXN5bmMgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgcG9zaXRpb24sIHRvbyBzbWFsbC4gW3BvczogJHtwb3N9XWApO1xuICAgICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9zY3JvbGxlci5wb3NNYXggPCBwb3MpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBwb3NpdGlvbiwgdG9vIGJpZy4gW3BvczogJHtwb3N9XWApO1xuICAgICAgICAgICAgcG9zID0gdGhpcy5fc2Nyb2xsZXIucG9zTWF4O1xuICAgICAgICB9XG4gICAgICAgIC8vIHBvcyDjga7jgb/lhYjpp4bjgZHjgabmm7TmlrBcbiAgICAgICAgdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyA9IHBvcztcbiAgICAgICAgaWYgKHBvcyAhPT0gdGhpcy5fc2Nyb2xsZXIucG9zKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9zY3JvbGxlci5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovCAqL1xuICAgIGFzeW5jIGVuc3VyZVZpc2libGUoaW5kZXg6IG51bWJlciwgb3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2l0ZW1zLCBfc2V0dGluZ3MsIF9iYXNlSGVpZ2h0IH0gPSB0aGlzO1xuXG4gICAgICAgIHZlcmlmeShfc2Nyb2xsZXIpO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IF9pdGVtcy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IGVuc3VyZVZpc2libGUoKSBbaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgcGFydGlhbE9LLCBzZXRUb3AsIGFuaW1hdGUsIHRpbWUsIGNhbGxiYWNrIH0gPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIHBhcnRpYWxPSzogdHJ1ZSxcbiAgICAgICAgICAgIHNldFRvcDogZmFsc2UsXG4gICAgICAgICAgICBhbmltYXRlOiBfc2V0dGluZ3MuZW5hYmxlQW5pbWF0aW9uLFxuICAgICAgICAgICAgdGltZTogX3NldHRpbmdzLmFuaW1hdGlvbkR1cmF0aW9uLFxuICAgICAgICAgICAgY2FsbGJhY2s6IG5vb3AsXG4gICAgICAgIH0sIG9wdGlvbnMpIGFzIFJlcXVpcmVkPExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucz47XG5cbiAgICAgICAgY29uc3QgY3VycmVudFNjb3BlID0ge1xuICAgICAgICAgICAgZnJvbTogX3Njcm9sbGVyLnBvcyxcbiAgICAgICAgICAgIHRvOiBfc2Nyb2xsZXIucG9zICsgX2Jhc2VIZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gX2l0ZW1zW2luZGV4XTtcblxuICAgICAgICBjb25zdCB0YXJnZXRTY29wZSA9IHtcbiAgICAgICAgICAgIGZyb206IHRhcmdldC5vZmZzZXQsXG4gICAgICAgICAgICB0bzogdGFyZ2V0Lm9mZnNldCArIHRhcmdldC5oZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXNJblNjb3BlID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgaWYgKHBhcnRpYWxPSykge1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRTY29wZS5mcm9tIDw9IGN1cnJlbnRTY29wZS5mcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50U2NvcGUuZnJvbSA8PSB0YXJnZXRTY29wZS50bztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0U2NvcGUuZnJvbSA8PSBjdXJyZW50U2NvcGUudG87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFNjb3BlLmZyb20gPD0gdGFyZ2V0U2NvcGUuZnJvbSAmJiB0YXJnZXRTY29wZS50byA8PSBjdXJyZW50U2NvcGUudG87XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZGV0ZWN0UG9zaXRpb24gPSAoKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRTY29wZS5mcm9tIDwgY3VycmVudFNjb3BlLmZyb21cbiAgICAgICAgICAgICAgICA/IHRhcmdldFNjb3BlLmZyb21cbiAgICAgICAgICAgICAgICA6IHRhcmdldC5vZmZzZXQgLSB0YXJnZXQuaGVpZ2h0IC8vIGJvdHRvbSDlkIjjgo/jgZvjga/mg4XloLHkuI3otrPjgavjgojjgorkuI3lj69cbiAgICAgICAgICAgIDtcbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgcG9zOiBudW1iZXI7XG4gICAgICAgIGlmIChzZXRUb3ApIHtcbiAgICAgICAgICAgIHBvcyA9IHRhcmdldFNjb3BlLmZyb207XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJblNjb3BlKCkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9zY3JvbGxlci5wb3MpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub29wXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3MgPSBkZXRlY3RQb3NpdGlvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgICAgICBjYWxsYmFjayhwb3MpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0QmFja3VwUmVzdG9yZVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjCAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IHsgaXRlbXM6IHRoaXMuX2l0ZW1zIH07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYwgKi9cbiAgICByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDAgPCB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fYWRkSXRlbSh0aGlzLl9iYWNrdXBba2V5XS5pdGVtcyk7XG5cbiAgICAgICAgaWYgKHJlYnVpbGQpIHtcbiAgICAgICAgICAgIHRoaXMucmVidWlsZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoeOCkueiuuiqjSAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5fYmFja3VwKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuSAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrpogKi9cbiAgICBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9KTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEuaXRlbXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IGRhdGE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDnlKjnkrDlooPoqK3lrpogKi9cbiAgICBwcml2YXRlIHNldFNjcm9sbGVyQ29uZGl0aW9uKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub24oJ3Njcm9sbCcsIHRoaXMuX3Njcm9sbEV2ZW50SGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDnlKjnkrDlooPnoLTmo4QgKi9cbiAgICBwcml2YXRlIHJlc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vZmYoJ3Njcm9sbHN0b3AnLCB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog5pei5a6a44GuIFNjcm9sbGVyIOOCquODluOCuOOCp+OCr+ODiOOBruS9nOaIkCAqL1xuICAgIHByaXZhdGUgY3JlYXRlU2Nyb2xsZXIoKTogSUxpc3RTY3JvbGxlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncy5zY3JvbGxlckZhY3RvcnkodGhpcy5fJHJvb3QsIHRoaXMuXyRtYXAsIHRoaXMuX3NldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKiog54++5Zyo44GuIFBhZ2UgSW5kZXgg44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBnZXRQYWdlSW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgeyBfc2Nyb2xsZXIsIF9iYXNlSGVpZ2h0LCBfcGFnZXMgfSA9IHRoaXM7XG4gICAgICAgIHZlcmlmeShfc2Nyb2xsZXIpO1xuXG4gICAgICAgIGNvbnN0IHsgcG9zOiBzY3JvbGxQb3MsIHBvc01heDogc2Nyb2xsUG9zTWF4IH0gPSBfc2Nyb2xsZXI7XG5cbiAgICAgICAgY29uc3Qgc2Nyb2xsTWFwU2l6ZSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsYXN0UGFnZSA9IHRoaXMuZ2V0TGFzdFBhZ2UoKTtcbiAgICAgICAgICAgIHJldHVybiBsYXN0UGFnZSA/IGxhc3RQYWdlLm9mZnNldCArIGxhc3RQYWdlLmhlaWdodCA6IF9iYXNlSGVpZ2h0O1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHBvcyA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoMCA9PT0gc2Nyb2xsUG9zTWF4IHx8IHNjcm9sbFBvc01heCA8PSBfYmFzZUhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsUG9zICogc2Nyb2xsTWFwU2l6ZSAvIHNjcm9sbFBvc01heDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICBjb25zdCB2YWxpZFJhbmdlID0gKHBhZ2U6IFBhZ2VQcm9maWxlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYWdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYWdlLm9mZnNldCA8PSBwb3MgJiYgcG9zIDw9IHBhZ2Uub2Zmc2V0ICsgcGFnZS5oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBjYW5kaWRhdGUgPSBNYXRoLmZsb29yKHBvcyAvIF9iYXNlSGVpZ2h0KTtcbiAgICAgICAgaWYgKDAgIT09IGNhbmRpZGF0ZSAmJiBfcGFnZXMubGVuZ3RoIDw9IGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgY2FuZGlkYXRlID0gX3BhZ2VzLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcGFnZSA9IF9wYWdlc1tjYW5kaWRhdGVdO1xuICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgIH0gZWxzZSBpZiAocG9zIDwgcGFnZT8ub2Zmc2V0KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FuZGlkYXRlIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBwYWdlID0gX3BhZ2VzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYW5kaWRhdGUgKyAxLCBuID0gX3BhZ2VzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHBhZ2UgPSBfcGFnZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgZGV0ZWN0IHBhZ2UgaW5kZXguIGZhbGxiYWNrOiAke19wYWdlcy5sZW5ndGggLSAxfWApO1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgX3BhZ2VzLmxlbmd0aCAtIDEpO1xuICAgIH1cblxuICAgIC8qKiDmnIDlvozjga7jg5rjg7zjgrjjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldExhc3RQYWdlKCk6IFBhZ2VQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYWdlc1t0aGlzLl9wYWdlcy5sZW5ndGggLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OIKi9cbiAgICBwcml2YXRlIG9uU2Nyb2xsKHBvczogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICAvLyBUT0RPOiBpbnRlcnNlY3Rpb25SZWN0IOOCkuS9v+eUqOOBmeOCi+WgtOWQiCwgU2Nyb2xsIOODj+ODs+ODieODqeODvOWFqOiIrOOBr+OBqeOBhuOBguOCi+OBueOBjeOBi+imgeaknOiojlxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHBvcyAtIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MpIDwgdGhpcy5fc2V0dGluZ3Muc2Nyb2xsUmVmcmVzaERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCAhPT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+WBnOatouOCpOODmeODs+ODiCAqL1xuICAgIHByaXZhdGUgb25TY3JvbGxTdG9wKHBvczogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOWMuuWIhuOBruOCouOCteOCpOODsyAqL1xuICAgIHByaXZhdGUgYXNzaWduUGFnZShmcm9tPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKGZyb20pO1xuXG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zLCBfcGFnZXMsIF9iYXNlSGVpZ2h0LCBfc2Nyb2xsZXIgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGJhc2VQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICBjb25zdCBuZXh0SXRlbUluZGV4ID0gYmFzZVBhZ2U/LmdldEl0ZW1MYXN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIGNvbnN0IGFzaWduZWVJdGVtcyAgPSBfaXRlbXMuc2xpY2UobmV4dEl0ZW1JbmRleCk7XG5cbiAgICAgICAgbGV0IHdvcmtQYWdlID0gYmFzZVBhZ2U7XG4gICAgICAgIGlmIChudWxsID09IHdvcmtQYWdlKSB7XG4gICAgICAgICAgICB3b3JrUGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgX3BhZ2VzLnB1c2god29ya1BhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGFzaWduZWVJdGVtcykge1xuICAgICAgICAgICAgaWYgKF9iYXNlSGVpZ2h0IDw9IHdvcmtQYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHdvcmtQYWdlLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhZ2UgPSBuZXcgUGFnZVByb2ZpbGUoKTtcbiAgICAgICAgICAgICAgICBuZXdQYWdlLmluZGV4ID0gd29ya1BhZ2UuaW5kZXggKyAxO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2Uub2Zmc2V0ID0gd29ya1BhZ2Uub2Zmc2V0ICsgd29ya1BhZ2UuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3UGFnZTtcbiAgICAgICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpdGVtLnBhZ2VJbmRleCA9IHdvcmtQYWdlLmluZGV4O1xuICAgICAgICAgICAgd29ya1BhZ2UucHVzaChpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmtQYWdlLm5vcm1hbGl6ZSgpO1xuXG4gICAgICAgIF9zY3JvbGxlcj8udXBkYXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOWMuuWIhuOBruino+mZpCAqL1xuICAgIHByaXZhdGUgY2xlYXJQYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGFnZXMuc3BsaWNlKGZyb20gPz8gMCk7XG4gICAgfVxuXG4gICAgLyoqIGluYWN0aXZlIOeUqCBNYXAg44Gu55Sf5oiQICovXG4gICAgcHJpdmF0ZSBwcmVwYXJlSW5hY3RpdmVNYXAoKTogRE9NIHtcbiAgICAgICAgY29uc3QgeyBfY29uZmlnLCBfJG1hcCwgX21hcEhlaWdodCB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgJHBhcmVudCA9IF8kbWFwLnBhcmVudCgpO1xuICAgICAgICBsZXQgJGluYWN0aXZlTWFwID0gJHBhcmVudC5maW5kKGAuJHtfY29uZmlnLklOQUNUSVZFX0NMQVNTfWApO1xuXG4gICAgICAgIGlmICgkaW5hY3RpdmVNYXAubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICAgICAgY29uc3QgJGxpc3RJdGVtVmlld3MgPSBfJG1hcC5jbG9uZSgpLmNoaWxkcmVuKCkuZmlsdGVyKChfLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmRleCA9IE51bWJlcigkKGVsZW1lbnQpLmF0dHIoX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFBhZ2VJbmRleCAtIDEgPD0gcGFnZUluZGV4ICYmIHBhZ2VJbmRleCA8PSBjdXJyZW50UGFnZUluZGV4ICsgMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkaW5hY3RpdmVNYXAgPSAkKGA8c2VjdGlvbiBjbGFzcz1cIiR7X2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTfSAke19jb25maWcuSU5BQ1RJVkVfQ0xBU1N9XCI+PC9zZWN0aW9uPmApXG4gICAgICAgICAgICAgICAgLmFwcGVuZCgkbGlzdEl0ZW1WaWV3cylcbiAgICAgICAgICAgICAgICAuaGVpZ2h0KF9tYXBIZWlnaHQpO1xuICAgICAgICAgICAgJHBhcmVudC5hcHBlbmQoJGluYWN0aXZlTWFwKTtcbiAgICAgICAgICAgIF8kbWFwLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGluYWN0aXZlTWFwO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgZG9tIGFzICQsXG4gICAgdHlwZSBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBWaWV3LFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Q29yZSB9IGZyb20gJy4vY29yZS9saXN0JztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IExpc3RDb3JlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGNsYXNzIHRoYXQgc3RvcmVzIHtAbGluayBMaXN0Vmlld30gaW5pdGlhbGl6YXRpb24gaW5mb3JtYXRpb24uXG4gKiBAamEge0BsaW5rIExpc3RWaWV3fSDjga7liJ3mnJ/ljJbmg4XloLHjgpLmoLzntI3jgZnjgovjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RDb250ZXh0T3B0aW9ucywgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIGluaXRpYWxIZWlnaHQ/OiBudW1iZXI7XG59XG5cbi8qKlxuICogQGVuIFZpcnR1YWwgbGlzdCB2aWV3IGNsYXNzIHRoYXQgcHJvdmlkZXMgbWVtb3J5IG1hbmFnZW1lbnQgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDjg6Hjg6Ljg6rnrqHnkIbmqZ/og73jgpLmj5DkvpvjgZnjgovku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpc3RWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgY29udGV4dDogbmV3IExpc3RDb3JlKG9wdGlvbnMpLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuXG4gICAgICAgIHRoaXMuc2V0RWxlbWVudCh0aGlzLiRlbCBhcyBET01TZWxlY3RvcjxURWxlbWVudD4pO1xuICAgIH1cblxuICAgIC8qKiBjb250ZXh0IGFjY2Vzc29yICovXG4gICAgZ2V0IGNvbnRleHQoKTogSUxpc3RDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqIGNvbnN0cnVjdCBvcHRpb24gYWNjZXNzb3IgKi9cbiAgICBnZXQgb3B0aW9ucygpOiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5vcHRpb25zO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFZpZXcgY29tcG9uZW50IG1ldGhvZHM6XG5cbiAgICAvKiogYHRoaXMuZWxgIOabtOaWsOaZguOBruaWsOOBl+OBhCBIVE1MIOOCkuODrOODs+ODgOODquODs+OCsOODreOCuOODg+OCr+OBruWun+ijhemWouaVsC4g44Oi44OH44Or5pu05paw44GoIFZpZXcg44OG44Oz44OX44Os44O844OI44KS6YCj5YuV44GV44Gb44KLLiAqL1xuICAgIGFic3RyYWN0IHJlbmRlciguLi5hcmdzOiB1bmtub3duW10pOiBhbnk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIENoYW5nZSB0aGUgdmlldydzIGVsZW1lbnQgKGB0aGlzLmVsYCBwcm9wZXJ0eSkgYW5kIHJlLWRlbGVnYXRlIHRoZSB2aWV3J3MgZXZlbnRzIG9uIHRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAamEgVmlldyDjgYznrqHovYTjgZnjgovopoHntKAgKGB0aGlzLmVsYCBwcm9wZXJ0eSkg44Gu5aSJ5pu0LiDjgqTjg5njg7Pjg4jlho3oqK3lrprjgoLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFxuICAgICAqICAtIGBlbmAgT2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiOOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHNldEVsZW1lbnQoZWw6IERPTVNlbGVjdG9yPFRFbGVtZW50IHwgc3RyaW5nPik6IHRoaXMge1xuICAgICAgICBpZiAodGhpc1tfcHJvcGVydGllc10pIHtcbiAgICAgICAgICAgIGNvbnN0IHsgY29udGV4dCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIGNvbnRleHQuZGVzdHJveSgpO1xuICAgICAgICAgICAgY29udGV4dC5pbml0aWFsaXplKCRlbCBhcyBET008Tm9kZT4gYXMgRE9NLCB0aGlzLm9wdGlvbnMuaW5pdGlhbEhlaWdodCA/PyAkZWwuaGVpZ2h0KCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci5zZXRFbGVtZW50KGVsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5kZXN0cm95KCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZW1vdmUoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdE9wZXJhdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGl0IGhhcyBiZWVuIGluaXRpYWxpemVkLlxuICAgICAqIEBqYSDliJ3mnJ/ljJbmuIjjgb/jgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBpbml0aWFsaXplZCAvIGZhbHNlOiB1bmluaXRpYWxpemVkXG4gICAgICogIC0gYGphYCB0cnVlOiDliJ3mnJ/ljJbmuIjjgb8gLyBmYWxzZTog5pyq5Yid5pyf5YyWXG4gICAgICovXG4gICAgZ2V0IGlzSW5pdGlhbGl6ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzSW5pdGlhbGl6ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSBpdGVtIOeZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIGFkZEl0ZW0oaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIGluZm86IFVua25vd25PYmplY3QsIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2FkZEl0ZW0obmV3IEl0ZW1Qcm9maWxlKHRoaXMuY29udGV4dCwgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgaW5mbyksIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24gKGludGVybmFsIHVzZSkuXG4gICAgICogQGphIGl0ZW0g55m76YyyICjlhoXpg6jnlKgpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAqICAtIGBlbmAge0BsaW5rIEl0ZW1Qcm9maWxlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5fYWRkSXRlbShpdGVtLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbmRleCB0byBzdGFydCByZWxlYXNpbmdcbiAgICAgKiAgLSBgamFgIOino+mZpOmWi+Wni+OBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzaXplXG4gICAgICogIC0gYGVuYCB0b3RhbCBudW1iZXIgb2YgaXRlbXMgdG8gcmVsZWFzZVxuICAgICAqICAtIGBqYWAg6Kej6Zmk44GZ44KLIGl0ZW0g44Gu57eP5pWwIFtkZWZhdWx0OiAxXVxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciwgc2l6ZT86IG51bWJlciwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRhcmdldCBpbmRleCBhcnJheS4gaXQgaXMgbW9yZSBlZmZpY2llbnQgdG8gc3BlY2lmeSByZXZlcnNlIGluZGV4LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Kk44Oz44OH44OD44Kv44K56YWN5YiX44KS5oyH5a6aLiByZXZlcnNlIGluZGV4IOOCkuaMh+WumuOBmeOCi+OBu+OBhuOBjOWKueeOh+eahFxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIgfCBudW1iZXJbXSwgYXJnMj86IG51bWJlciwgYXJnMz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbW92ZUl0ZW0oaW5kZXggYXMgbnVtYmVyLCBhcmcyLCBhcmczKTsgLy8gYXZvaWQgdHMoMjM0NSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbmZvcm1hdGlvbiBzZXQgZm9yIHRoZSBzcGVjaWZpZWQgaXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBpZGVudGlmaWVyIFtpbmRleCB8IGV2ZW50IG9iamVjdF1cbiAgICAgKiAgLSBgamFgIOitmOWIpeWtkC4gW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqL1xuICAgIGdldEl0ZW1JbmZvKHRhcmdldDogbnVtYmVyIHwgRXZlbnQpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0SXRlbUluZm8odGFyZ2V0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCBhY3RpdmUgcGFnZXMuXG4gICAgICogQGphIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsFxuICAgICAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQnVpbGQgdW5hc3NpZ25lZCBwYWdlcy5cbiAgICAgKiBAamEg5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JXG4gICAgICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVidWlsZCBwYWdlIGFzc2lnbm1lbnRzLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgqLjgrXjgqTjg7PjgpLlho3mp4vmiJBcbiAgICAgKi9cbiAgICByZWJ1aWxkKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIERlc3Ryb3kgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg566h6L2E44OH44O844K/44KS56C05qOEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZWxlYXNlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAgLyoqXG4gICAgICogQGVuIEdldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zO1xuICAgIH1cblxuICAgICAvKipcbiAgICAgICogQGVuIEdldCBtYXhpbXVtIHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+l1xuICAgICAgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFBvc01heDtcbiAgICB9XG5cbiAgICAgLyoqXG4gICAgICogQGVuIFNjcm9sbCBldmVudCBoYW5kbGVyIHNldHRpbmcvY2FuY2VsbGF0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44O86Zai5pWwXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb246IHNldHRpbmcgLyBvZmY6IGNhbmNlbGluZ1xuICAgICAqICAtIGBqYWAgb246IOioreWumiAvIG9mZjog6Kej6ZmkXG4gICAgICovXG4gICAgc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dGluZy9jYW5jZWxsaW5nIHNjcm9sbCBzdG9wIGV2ZW50IGhhbmRsZXIuXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXIsIG1ldGhvZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc1xuICAgICAqICAtIGBlbmAgbmV3IHNjcm9sbCBwb3NpdGlvbiB2YWx1ZSBbMCAtIHBvc01heF1cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiBbMCAtIHBvc01heF1cbiAgICAgKiBAcGFyYW0gYW5pbWF0ZVxuICAgICAqICAtIGBlbmAgZW5hYmxlL2Rpc2FibGUgYW5pbWF0aW9uXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7mnInnhKFcbiAgICAgKiBAcGFyYW0gdGltZVxuICAgICAqICAtIGBlbmAgdGltZSBzcGVudCBvbiBhbmltYXRpb24gW21zZWNdXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVuc3VyZSB2aXNpYmlsaXR5IG9mIGl0ZW0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGluZGV4IG9mIGl0ZW1cbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBlbnN1cmVWaXNpYmxlKGluZGV4OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZW5zdXJlVmlzaWJsZShpbmRleCwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlc3RvcmUoa2V5LCByZWJ1aWxkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciBiYWNrdXAgZGF0YSBleGlzdHMuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoeOCkueiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMgLyBmYWxzZTogbm90IGV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJIC8gZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5oYXNCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGlzY2FyZCBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGRpc2NhcmQgZXhpc3RpbmcgZGF0YSAvIGZhbHNlOiBzcGVjaWZpZWQgZGF0YSBkb2VzIG5vdCBleGlzdFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5a2Y5Zyo44GX44Gf44OH44O844K/44KS56C05qOEIC8gZmFsc2U6IOaMh+WumuOBleOCjOOBn+ODh+ODvOOCv+OBr+WtmOWcqOOBl+OBquOBhFxuICAgICAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5jbGVhckJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiBVbmtub3duT2JqZWN0IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0QmFja3VwRGF0YShrZXkpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQGVuIEJhY2t1cCBkYXRhIGNhbiBiZSBzZXQgZXh0ZXJuYWxseS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXlcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZWVkZWQgLyBmYWxzZTogc2NoZW1hIGludmFsaWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDjgrnjgq3jg7zjg57jgYzkuI3mraNcbiAgICAgKi9cbiAgICBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiBVbmtub3duT2JqZWN0KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldEJhY2t1cERhdGEoa2V5LCBkYXRhIGFzIHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0pO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgV3JpdGFibGUgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RWaWV3IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcbmltcG9ydCB7IHR5cGUgTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9ucywgTGlzdEl0ZW1WaWV3IH0gZnJvbSAnLi9saXN0LWl0ZW0tdmlldyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBncm91cDogR3JvdXBQcm9maWxlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3fSBjb25zdHJ1Y3Rpb24uXG4gKiBAamEge0BsaW5rIEV4cGFuZGFibGVMaXN0SXRlbVZpZXd9IOani+evieOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4cGFuZGFibGVMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBvd25lcjogSUV4cGFuZGFibGVMaXN0VmlldztcbiAgICAvKioge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgKi9cbiAgICBncm91cDogR3JvdXBQcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIEV4cGFuZGFibGVMaXN0Vmlld30uXG4gKiBAamEge0BsaW5rIEV4cGFuZGFibGVMaXN0Vmlld30g44GM5omx44GG44Oq44K544OI44Ki44Kk44OG44Og44Kz44Oz44OG44OK44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBMaXN0SXRlbVZpZXc8VEVsZW1lbnQsIFRFdmVudD4ge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogRXhwYW5kYWJsZUxpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICBjb25zdCB7IGdyb3VwIH0gPSBvcHRpb25zO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHsgZ3JvdXAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcm90ZWN0ZWQgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMuXG4gICAgICogQGphIOWxlemWi+eKtuaFi+OCkuWIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4cGFuZGVkLCBjb2xsYXBzZWQ6IGNsb3NlXG4gICAgICogIC0gYGphYCB0cnVlOiDlsZXplossIGZhbHNlOiDlj47mnZ9cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzRXhwYW5kZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5ncm91cC5pc0V4cGFuZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nLlxuICAgICAqIEBqYSDlsZXplovkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNFeHBhbmRpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDlj47mnZ/kuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzQ29sbGFwc2luZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZyBvciBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDplovplonkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNTd2l0Y2hpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSBpZiBpdCBoYXMgYSBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGhhc0NoaWxkcmVuKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uZ3JvdXAuaGFzQ2hpbGRyZW47XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBsdWlkLFxuICAgIHN0YXR1c0FkZFJlZixcbiAgICBzdGF0dXNSZWxlYXNlLFxuICAgIHN0YXR1c1Njb3BlLFxuICAgIGlzU3RhdHVzSW4sXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUV4cGFuZE9wZXJhdGlvbixcbiAgICBJTGlzdFN0YXR1c01hbmFnZXIsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElFeHBhbmRhYmxlTGlzdENvbnRleHQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4gQ29yZSBsb2dpYyBpbXBsZW1lbnRhdGlvbiBjbGFzcyB0aGF0IG1hbmFnZXMgZXhwYW5kaW5nIC8gY29sbGFwc2luZyBzdGF0ZS5cbiAqIEBqYSDplovplonnirbmhYvnrqHnkIbjgpLooYzjgYbjgrPjgqLjg63jgrjjg4Pjgq/lrp/oo4Xjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEV4cGFuZENvcmUgaW1wbGVtZW50c1xuICAgIElFeHBhbmRPcGVyYXRpb24sXG4gICAgSUxpc3RTdGF0dXNNYW5hZ2VyLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcblxuICAgIC8qKiB7IGlkOiBHcm91cFByb2ZpbGUgfSAqL1xuICAgIHByaXZhdGUgX21hcEdyb3VwczogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPiA9IHt9O1xuICAgIC8qKiDnrKwx6ZqO5bGkIEdyb3VwUHJvZmlsZSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIF9hcnlUb3BHcm91cHM6IEdyb3VwUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggeyBtYXAsIHRvcHMgfSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9iYWNrdXA6IFJlY29yZDxzdHJpbmcsIHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIG93bmVyIOimqiBWaWV3IOOBruOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG93bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX293bmVyID0gb3duZXI7XG4gICAgfVxuXG4gICAgLyoqIOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9tYXBHcm91cHMgPSB7fTtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gW107XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUV4cGFuZE9wZXJhdGlvblxuXG4gICAgLyoqIOaWsOimjyBHcm91cFByb2ZpbGUg44KS5L2c5oiQICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBpZCA9IGlkID8/IGx1aWQoJ2xpc3QtZ3JvdXAnLCA0KTtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fbWFwR3JvdXBzW2lkXSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21hcEdyb3Vwc1tpZF07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZ3JvdXAgPSBuZXcgR3JvdXBQcm9maWxlKHRoaXMuX293bmVyLCBpZCk7XG4gICAgICAgIHRoaXMuX21hcEdyb3Vwc1tpZF0gPSBncm91cDtcbiAgICAgICAgcmV0dXJuIGdyb3VwO1xuICAgIH1cblxuICAgIC8qKiDnmbvpjLLmuIjjgb8gR3JvdXAg44KS5Y+W5b6XICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXBHcm91cHNbaWRdO1xuICAgIH1cblxuICAgIC8qKiDnrKwx6ZqO5bGk44GuIEdyb3VwIOeZu+mMsiAqL1xuICAgIHJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXA6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICAvLyDjgZnjgafjgavnmbvpjLLmuIjjgb/jga7loLTlkIjjga8gcmVzdG9yZSDjgZfjgaYgbGF5b3V0IOOCreODvOOBlOOBqOOBq+W+qeWFg+OBmeOCi+OAglxuICAgICAgICBpZiAoJ3JlZ2lzdGVyZWQnID09PSB0b3BHcm91cC5zdGF0dXMpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IG9yaWVudGF0aW9uIGNoYW5nZWQg5pmC44GuIGxheW91dCDjgq3jg7zlpInmm7Tlr77lv5zjgaDjgYzjgIHjgq3jg7zjgavlpInmm7TjgYznhKHjgYTjgajjgY3jga/kuI3lhbflkIjjgajjgarjgovjgIJcbiAgICAgICAgICAgIC8vIOOBk+OBriBBUEkg44Gr5a6f6KOF44GM5b+F6KaB44GL44KC5ZCr44KB44Gm6KaL55u044GX44GM5b+F6KaBXG4gICAgICAgICAgICB0b3BHcm91cC5yZXN0b3JlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsYXN0R3JvdXAgPSB0aGlzLl9hcnlUb3BHcm91cHNbdGhpcy5fYXJ5VG9wR3JvdXBzLmxlbmd0aCAtIDFdO1xuICAgICAgICBjb25zdCBpbnNlcnRUbyA9IGxhc3RHcm91cD8uZ2V0TmV4dEl0ZW1JbmRleCh0cnVlKSA/PyAwO1xuXG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3Vwcy5wdXNoKHRvcEdyb3VwKTtcbiAgICAgICAgdG9wR3JvdXAucmVnaXN0ZXIoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDnrKwx6ZqO5bGk44GuIEdyb3VwIOOCkuWPluW+lyAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnlUb3BHcm91cHMuc2xpY2UoMCk7XG4gICAgfVxuXG4gICAgLyoqIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWxlemWiyAoMemajuWxpCkgKi9cbiAgICBhc3luYyBleHBhbmRBbGwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2llczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBwcm9taXNpZXMucHVzaChncm91cC5leHBhbmQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzaWVzKTtcbiAgICB9XG5cbiAgICAvKiog44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5Y+O5p2fICgx6ZqO5bGkKSAqL1xuICAgIGFzeW5jIGNvbGxhcHNlQWxsKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2llczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBwcm9taXNpZXMucHVzaChncm91cC5jb2xsYXBzZShkZWxheSkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2llcyk7XG4gICAgfVxuXG4gICAgLyoqIOWxlemWi+S4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNTdGF0dXNJbignZXhwYW5kaW5nJyk7XG4gICAgfVxuXG4gICAgLyoqIOWPjuadn+S4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzU3RhdHVzSW4oJ2NvbGxhcHNpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog6ZaL6ZaJ5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0V4cGFuZGluZyB8fCB0aGlzLmlzQ29sbGFwc2luZztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFN0YXR1c01hbmFnZXJcblxuICAgIC8qKiDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4ggKi9cbiAgICBzdGF0dXNBZGRSZWYoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gc3RhdHVzQWRkUmVmKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiCAqL1xuICAgIHN0YXR1c1JlbGVhc2Uoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gc3RhdHVzUmVsZWFzZShzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKiDlh6bnkIbjgrnjgrPjg7zjg5fmr47jgavnirbmhYvlpInmlbDjgpLoqK3lrpogKi9cbiAgICBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZywgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBzdGF0dXNTY29wZShzdGF0dXMsIGV4ZWN1dG9yKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44Gf54q25oWL5Lit44Gn44GC44KL44GL56K66KqNICovXG4gICAgaXNTdGF0dXNJbihzdGF0dXM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gaXNTdGF0dXNJbihzdGF0dXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0QmFja3VwUmVzdG9yZVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OCkuODkOODg+OCr+OCouODg+ODlyAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCB7IF9iYWNrdXAgfSA9IHRoaXM7XG4gICAgICAgIGlmIChudWxsID09IF9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgX2JhY2t1cFtrZXldID0ge1xuICAgICAgICAgICAgICAgIG1hcDogdGhpcy5fbWFwR3JvdXBzLFxuICAgICAgICAgICAgICAgIHRvcHM6IHRoaXMuX2FyeVRvcEdyb3VwcyxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OCkuODquOCueODiOOCoiAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYmFja3VwID0gdGhpcy5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgICAgIGlmIChudWxsID09IGJhY2t1cCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCB0aGlzLl9hcnlUb3BHcm91cHMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5fbWFwR3JvdXBzLCBiYWNrdXAubWFwKTtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gYmFja3VwLnRvcHMuc2xpY2UoKTtcblxuICAgICAgICAvLyDlsZXplovjgZfjgabjgYTjgovjgoLjga7jgpLnmbvpjLJcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIGdyb3VwLnJlc3RvcmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWGjeani+evieOBruS6iOe0hFxuICAgICAgICByZWJ1aWxkICYmIHRoaXMuX293bmVyLnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoSAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5fYmFja3VwKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuSAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumiAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfSk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoZGF0YS5tYXAgJiYgQXJyYXkuaXNBcnJheShkYXRhLnRvcHMpKSB7XG4gICAgICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IGRhdGE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSwgVW5rbm93bk9iamVjdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdFZpZXcsIElFeHBhbmRPcGVyYXRpb24gfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgRXhwYW5kQ29yZSB9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQgdHlwZSB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5pbXBvcnQgeyB0eXBlIExpc3RWaWV3Q29uc3RydWN0T3B0aW9ucywgTGlzdFZpZXcgfSBmcm9tICcuL2xpc3Qtdmlldyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBjb250ZXh0OiBFeHBhbmRDb3JlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVmlydHVhbCBsaXN0IHZpZXcgY2xhc3Mgd2l0aCBleHBhbmRpbmcgLyBjb2xsYXBzaW5nIGZ1bmN0aW9uYWxpdHkuXG4gKiBAamEg6ZaL6ZaJ5qmf6IO944KS5YKZ44GI44Gf5Luu5oOz44Oq44K544OI44OT44Ol44O844Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFeHBhbmRhYmxlTGlzdFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIExpc3RWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUV4cGFuZGFibGVMaXN0VmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiBuZXcgRXhwYW5kQ29yZSh0aGlzKSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbiAgICAvKiogY29udGV4dCBhY2Nlc3NvciAqL1xuICAgIGdldCBleHBhbmRDb250ZXh0KCk6IElFeHBhbmRPcGVyYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRXhwYW5kYWJsZUxpc3RWaWV3XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IHtAbGluayBHcm91cFByb2ZpbGV9LiBSZXR1cm4gdGhlIG9iamVjdCBpZiBpdCBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQuXG4gICAgICogQGphIOaWsOimjyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLkvZzmiJAuIOeZu+mMsua4iOOBv+OBruWgtOWQiOOBr+OBneOBruOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBuZXdseSBjcmVhdGVkIGdyb3VwIGlkLiBpZiBub3Qgc3BlY2lmaWVkLCBhdXRvbWF0aWMgYWxsb2NhdGlvbiB3aWxsIGJlIHBlcmZvcm1lZC5cbiAgICAgKiAgLSBgamFgIOaWsOimj+OBq+S9nOaIkOOBmeOCiyBHcm91cCBJRCDjgpLmjIflrpouIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+iHquWLleWJsuOCiuaMr+OCilxuICAgICAqL1xuICAgIG5ld0dyb3VwKGlkPzogc3RyaW5nKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQubmV3R3JvdXAoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcmVnaXN0ZXJlZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg55m76Yyy5riI44G/IHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBHcm91cCBJRCB0byByZXRyaWV2ZVxuICAgICAqICAtIGBqYWAg5Y+W5b6X44GZ44KLIEdyb3VwIElEIOOCkuaMh+WumlxuICAgICAqL1xuICAgIGdldEdyb3VwKGlkOiBzdHJpbmcpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRHcm91cChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIDFzdCBsYXllciB7QGxpbmsgR3JvdXBQcm9maWxlfSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIOesrDHpmo7lsaTjga4ge0BsaW5rIEdyb3VwUHJvZmlsZX0g55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9wR3JvdXBcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGVkIHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCDmp4vnr4nmuIjjgb8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCAxc3QgbGF5ZXIge0BsaW5rIEdyb3VwUHJvZmlsZX0uIDxicj5cbiAgICAgKiAgICAgQSBjb3B5IGFycmF5IGlzIHJldHVybmVkLCBzbyB0aGUgY2xpZW50IGNhbm5vdCBjYWNoZSBpdC5cbiAgICAgKiBAamEg56ysMemajuWxpOOBriB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpcgPGJyPlxuICAgICAqICAgICDjgrPjg5Tjg7zphY3liJfjgYzov5TjgZXjgozjgovjgZ/jgoHjgIHjgq/jg6njgqTjgqLjg7Pjg4jjga/jgq3jg6Pjg4Pjgrfjg6XkuI3lj69cbiAgICAgKi9cbiAgICBnZXRUb3BHcm91cHMoKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRUb3BHcm91cHMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhwYW5kIGFsbCBncm91cHMgKDFzdCBsYXllcilcbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5bGV6ZaLICgx6ZqO5bGkKVxuICAgICAqL1xuICAgIGV4cGFuZEFsbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZXhwYW5kQWxsKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbGxhcHNlIGFsbCBncm91cHMgKDFzdCBsYXllcilcbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5Y+O5p2fICgx6ZqO5bGkKVxuICAgICAqL1xuICAgIGNvbGxhcHNlQWxsKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNvbGxhcHNlQWxsKGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZy5cbiAgICAgKiBAamEg5bGV6ZaL5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0V4cGFuZGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOWPjuadn+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzQ29sbGFwc2luZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZyBvciBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDplovplonkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzU3dpdGNoaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbmNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAgICAgKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44Kk44Oz44Kv44Oq44Oh44Oz44OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gICAgICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAgICAgKi9cbiAgICBzdGF0dXNBZGRSZWYoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gICAgICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gICAgICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhdGUgdmFyaWFibGUgbWFuYWdlbWVudCBzY29wZVxuICAgICAqIEBqYSDnirbmhYvlpInmlbDnrqHnkIbjgrnjgrPjg7zjg5dcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR2YWwgb2Ygc2VlZCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBrumWouaVsOOBruaIu+OCiuWApFxuICAgICAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc3RhdHVzU2NvcGUoc3RhdHVzLCBleGVjdXRvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGlmIGl0J3MgaW4gdGhlIHNwZWNpZmllZCBzdGF0ZS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf54q25oWL5Lit44Gn44GC44KL44GL56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlOiDnirbmhYvlhoUgLyBmYWxzZTog54q25oWL5aSWXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogd2l0aGluIHRoZSBzdGF0dXMgLyBgZmFsc2VgOiBvdXQgb2YgdGhlIHN0YXR1c1xuICAgICAqICAtIGBqYWAgYHRydWVgOiDnirbmhYvlhoUgLyBgZmFsc2VgOiDnirbmhYvlpJZcbiAgICAgKi9cbiAgICBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzU3RhdHVzSW4oc3RhdHVzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBEZXN0cm95IGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOeuoei9hOODh+ODvOOCv+OCkuegtOajhFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHN1cGVyLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5IChhbnkgaWRlbnRpZmllcilcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvCjku7vmhI/jga7orZjliKXlrZAp44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5iYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcGFyYW0gcmVidWlsZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHJlYnVpbGQgdGhlIGxpc3Qgc3RydWN0dXJlXG4gICAgICogIC0gYGphYCDjg6rjgrnjg4jmp4vpgKDjgpLlho3mp4vnr4njgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZCA9IHRydWUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIGJhY2t1cCBkYXRhIGV4aXN0cy5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cyAvIGZhbHNlOiBub3QgZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIkgLyBmYWxzZTog54ShXG4gICAgICovXG4gICAgb3ZlcnJpZGUgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEaXNjYXJkIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZGlzY2FyZCBleGlzdGluZyBkYXRhIC8gZmFsc2U6IHNwZWNpZmllZCBkYXRhIGRvZXMgbm90IGV4aXN0XG4gICAgICogIC0gYGphYCB0cnVlOiDlrZjlnKjjgZfjgZ/jg4fjg7zjgr/jgpLnoLTmo4QgLyBmYWxzZTog5oyH5a6a44GV44KM44Gf44OH44O844K/44Gv5a2Y5Zyo44GX44Gq44GEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICovXG4gICAgb3ZlcnJpZGUgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IFVua25vd25PYmplY3QgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmFja3VwIGRhdGEgY2FuIGJlIHNldCBleHRlcm5hbGx5LlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2NlZWRlZCAvIGZhbHNlOiBzY2hlbWEgaW52YWxpZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOOCueOCreODvOODnuOBjOS4jeato1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IFVua25vd25PYmplY3QpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0QmFja3VwRGF0YShrZXksIGRhdGEgYXMgeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9KTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiJCIsImdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyIsImF0IiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwidG9IZWxwU3RyaW5nIiwiX3Byb3BlcnRpZXMiLCJWaWV3IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImNsZWFyVHJhbnNpdGlvbiIsInNldFRyYW5zZm9ybVRyYW5zaXRpb24iLCJwb3N0Iiwibm9vcCIsImx1aWQiLCJzdGF0dXNBZGRSZWYiLCJzdGF0dXNSZWxlYXNlIiwic3RhdHVzU2NvcGUiLCJpc1N0YXR1c0luIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFHRztJQUVILENBQUEsWUFBcUI7SUFNakI7OztJQUdHO0lBQ0gsSUFBQSxJQUtDLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQSxDQUFBO0lBTEQsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxxQkFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLHFCQUE4QyxDQUFBO1lBQzlDLFdBQTJDLENBQUEsV0FBQSxDQUFBLDBDQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsR0FBQSxxQ0FBOEIsQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUEsR0FBQSwwQ0FBQSxDQUFBO1lBQzVKLFdBQTJDLENBQUEsV0FBQSxDQUFBLGlD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LENBQUM7U0FDMUQ7SUFFRDs7Ozs7Ozs7Ozs7OztJQWFHO1FBQ0gsV0FBVyxDQUFJLE1BQWMsRUFBRSxRQUE4QixFQUFBO0lBQ3pELFFBQUEsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDbEU7SUFFRDs7Ozs7Ozs7Ozs7SUFXRztJQUNILElBQUEsVUFBVSxDQUFDLE1BQWMsRUFBQTtZQUNyQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZEOzs7SUFLRDs7OztJQUlHO1FBQ00sT0FBTyxHQUFBO1lBQ1osS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEMsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0lBRUQ7Ozs7Ozs7Ozs7O0lBV0c7SUFDTSxJQUFBLE1BQU0sQ0FBQyxHQUFXLEVBQUE7WUFDdkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNoRDtJQUVEOzs7Ozs7Ozs7Ozs7OztJQWNHO0lBQ00sSUFBQSxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQU8sR0FBRyxJQUFJLEVBQUE7SUFDeEMsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUMxRDtJQUVEOzs7Ozs7Ozs7O0lBVUc7SUFDTSxJQUFBLFNBQVMsQ0FBQyxHQUFXLEVBQUE7WUFDMUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuRDtJQUVEOzs7Ozs7Ozs7O0lBVUc7SUFDTSxJQUFBLFdBQVcsQ0FBQyxHQUFZLEVBQUE7WUFDN0IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNyRDtJQUVEOzs7Ozs7O0lBT0c7SUFDTSxJQUFBLGFBQWEsQ0FBQyxHQUFXLEVBQUE7WUFDOUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN2RDtJQUdEOzs7Ozs7Ozs7O0lBVUc7UUFDTSxhQUFhLENBQUMsR0FBVyxFQUFFLElBQW1CLEVBQUE7SUFDbkQsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFvRSxDQUFDLENBQUM7U0FDN0g7SUFDSjs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3VpLWxpc3R2aWV3LyJ9