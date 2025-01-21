/*!
 * @cdp/ui-listview 0.9.19
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktbGlzdHZpZXcuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJnbG9iYWwtY29uZmlnLnRzIiwicHJvZmlsZS9pdGVtLnRzIiwicHJvZmlsZS9wYWdlLnRzIiwicHJvZmlsZS9ncm91cC50cyIsImxpc3QtaXRlbS12aWV3LnRzIiwiY29yZS9lbGVtZW50LXNjcm9sbGVyLnRzIiwiY29yZS9saXN0LnRzIiwibGlzdC12aWV3LnRzIiwiZXhwYW5kYWJsZS1saXN0LWl0ZW0tdmlldy50cyIsImNvcmUvZXhwYW5kLnRzIiwiZXhwYW5kYWJsZS1saXN0LXZpZXcudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBVSV9MSVNUVklFVyA9IChDRFBfS05PV05fTU9EVUxFLk9GRlNFVCArIENEUF9LTk9XTl9VSV9NT0RVTEUuTElTVFZJRVcpICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIFVJX0xJU1RWSUVXX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04gPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDEsICdsaXN0dmlldyBoYXMgaW52YWxpZCBpbml0aWFsaXphdGlvbi4nKSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMiwgJ2xpc3R2aWV3IGdpdmVuIGEgaW52YWxpZCBwYXJhbS4nKSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9PUEVSQVRJT04gICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMywgJ2xpc3R2aWV3IGludmFsaWQgb3BlcmF0aW9uLicpLFxuICAgIH1cbn1cbiIsIi8qKlxuICogQGVuIEdsb2JhbCBjb25maWd1cmF0aW9uIGRlZmluaXRpb24gZm9yIGxpc3Qgdmlld3MuXG4gKiBAamEg44Oq44K544OI44OT44Ol44O844Gu44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Os44O844K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdFZpZXdHbG9iYWxDb25maWcge1xuICAgIE5BTUVTUEFDRTogc3RyaW5nO1xuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHN0cmluZztcbiAgICBJTkFDVElWRV9DTEFTUzogc3RyaW5nO1xuICAgIFJFQ1lDTEVfQ0xBU1M6IHN0cmluZztcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBzdHJpbmc7XG4gICAgREFUQV9QQUdFX0lOREVYOiBzdHJpbmc7XG4gICAgREFUQV9JVEVNX0lOREVYOiBzdHJpbmc7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVmYXVsdFYge1xuICAgIE5BTUVTUEFDRSAgICAgICAgICAgPSAnY2RwLXVpJywgLy8gVE9ETzogbmFtZXNwYWNlIOOBryB1dGlscyDjgavnp7vjgZlcbiAgICBTQ1JPTExfTUFQX0NMQVNTICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1zY3JvbGwtbWFwYCxcbiAgICBJTkFDVElWRV9DTEFTUyAgICAgID0gYCR7TkFNRVNQQUNFfS1pbmFjdGl2ZWAsXG4gICAgUkVDWUNMRV9DTEFTUyAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctcmVjeWNsZWAsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUyA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctaXRlbS1iYXNlYCxcbiAgICBEQVRBX1BBR0VfSU5ERVggICAgID0gJ2RhdGEtcGFnZS1pbmRleCcsXG4gICAgREFUQV9JVEVNX0lOREVYICAgICA9ICdkYXRhLWl0ZW0taW5kZXgnLFxufVxuXG5jb25zdCBfY29uZmlnID0ge1xuICAgIE5BTUVTUEFDRTogRGVmYXVsdFYuTkFNRVNQQUNFLFxuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IERlZmF1bHRWLlNDUk9MTF9NQVBfQ0xBU1MsXG4gICAgSU5BQ1RJVkVfQ0xBU1M6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTLFxuICAgIFJFQ1lDTEVfQ0xBU1M6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1MsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogRGVmYXVsdFYuTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICBEQVRBX1BBR0VfSU5ERVg6IERlZmF1bHRWLkRBVEFfUEFHRV9JTkRFWCxcbiAgICBEQVRBX0lURU1fSU5ERVg6IERlZmF1bHRWLkRBVEFfSVRFTV9JTkRFWCxcbn07XG5cbmV4cG9ydCB0eXBlIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnID0gUGFydGlhbDxcbiAgICBQaWNrPExpc3RWaWV3R2xvYmFsQ29uZmlnXG4gICAgICAgICwgJ05BTUVTUEFDRSdcbiAgICAgICAgfCAnU0NST0xMX01BUF9DTEFTUydcbiAgICAgICAgfCAnSU5BQ1RJVkVfQ0xBU1MnXG4gICAgICAgIHwgJ1JFQ1lDTEVfQ0xBU1MnXG4gICAgICAgIHwgJ0xJU1RJVEVNX0JBU0VfQ0xBU1MnXG4gICAgICAgIHwgJ0RBVEFfUEFHRV9JTkRFWCdcbiAgICAgICAgfCAnREFUQV9JVEVNX0lOREVYJ1xuICAgID5cbj47XG5cbmNvbnN0IGVuc3VyZU5ld0NvbmZpZyA9IChuZXdDb25maWc6IExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnKTogUGFydGlhbDxMaXN0Vmlld0dsb2JhbENvbmZpZz4gPT4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgTkFNRVNQQUNFOiBucyxcbiAgICAgICAgU0NST0xMX01BUF9DTEFTUzogc2Nyb2xsbWFwLFxuICAgICAgICBJTkFDVElWRV9DTEFTUzogaW5hY3RpdmUsXG4gICAgICAgIFJFQ1lDTEVfQ0xBU1M6IHJlY3ljbGUsXG4gICAgICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IGl0ZW1iYXNlLFxuICAgICAgICBEQVRBX1BBR0VfSU5ERVg6IGRhdGFwYWdlLFxuICAgICAgICBEQVRBX0lURU1fSU5ERVg6IGRhdGFpdGVtLFxuICAgIH0gPSBuZXdDb25maWc7XG5cbiAgICBjb25zdCBOQU1FU1BBQ0UgPSBucztcbiAgICBjb25zdCBTQ1JPTExfTUFQX0NMQVNTID0gc2Nyb2xsbWFwID8/IChucyA/IGAke25zfS1saXN0dmlldy1zY3JvbGwtbWFwYCA6IHVuZGVmaW5lZCk7XG4gICAgY29uc3QgSU5BQ1RJVkVfQ0xBU1MgPSBpbmFjdGl2ZSA/PyAobnMgPyBgJHtuc30taW5hY3RpdmVgIDogdW5kZWZpbmVkKTtcbiAgICBjb25zdCBSRUNZQ0xFX0NMQVNTID0gcmVjeWNsZSA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctcmVjeWNsZWAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IExJU1RJVEVNX0JBU0VfQ0xBU1MgPSBpdGVtYmFzZSA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctaXRlbS1iYXNlYCA6IHVuZGVmaW5lZCk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXdDb25maWcsIHtcbiAgICAgICAgTkFNRVNQQUNFLFxuICAgICAgICBTQ1JPTExfTUFQX0NMQVNTLFxuICAgICAgICBJTkFDVElWRV9DTEFTUyxcbiAgICAgICAgUkVDWUNMRV9DTEFTUyxcbiAgICAgICAgTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICAgICAgREFUQV9QQUdFX0lOREVYOiBkYXRhcGFnZSxcbiAgICAgICAgREFUQV9JVEVNX0lOREVYOiBkYXRhaXRlbSxcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIEdldC9VcGRhdGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gb2YgbGlzdCB2aWV3LlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+OBruWPluW+ly/mm7TmlrBcbiAqL1xuZXhwb3J0IGNvbnN0IExpc3RWaWV3R2xvYmFsQ29uZmlnID0gKG5ld0NvbmZpZz86IExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnKTogTGlzdFZpZXdHbG9iYWxDb25maWcgPT4ge1xuICAgIGlmIChuZXdDb25maWcpIHtcbiAgICAgICAgZW5zdXJlTmV3Q29uZmlnKG5ld0NvbmZpZyk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG5ld0NvbmZpZykpIHtcbiAgICAgICAgICAgIGlmICh1bmRlZmluZWQgPT09IG5ld0NvbmZpZ1trZXkgYXMga2V5b2YgTGlzdFZpZXdHbG9iYWxDb25maWdBcmddKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIG5ld0NvbmZpZ1trZXkgYXMga2V5b2YgTGlzdFZpZXdHbG9iYWxDb25maWdBcmddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBPYmplY3QuYXNzaWduKF9jb25maWcsIG5ld0NvbmZpZykpO1xufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgfSBmcm9tICdAY2RwL3VpLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9iYXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdEl0ZW1WaWV3LFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcixcbiAgICBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMsXG59IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHsgTGlzdFZpZXdHbG9iYWxDb25maWcgfSBmcm9tICcuLi9nbG9iYWwtY29uZmlnJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIGxpc3QgaXRlbXMuXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgSXRlbVByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUxpc3RDb250ZXh0O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5mbzogVW5rbm93bk9iamVjdDtcbiAgICAvKiogQGludGVybmFsIGdsb2JhbCBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4PzogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgYmVsb25naW5nIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9wYWdlSW5kZXg/OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgb2Zmc2V0ICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGJhc2UgZG9tIGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfJGJhc2U/OiBET007XG4gICAgLyoqIEBpbnRlcm5hbCBJTGlzdEl0ZW1WaWV3IGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfaW5zdGFuY2U/OiBJTGlzdEl0ZW1WaWV3O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RWaWV3Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruWIneacn+OBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUxpc3RDb250ZXh0LCBoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgX2luZm86IFVua25vd25PYmplY3QpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgICAgICAgPSBvd25lcjtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICAgICAgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVyID0gaW5pdGlhbGl6ZXI7XG4gICAgICAgIHRoaXMuX2luZm8gICAgICAgID0gX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGhlaWdodC4gKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGdsb2JhbCBpbmRleC4gKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgc2V0IGluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy51cGRhdGVJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgYmVsb25naW5nIHRoZSBwYWdlIGluZGV4LiAqL1xuICAgIGdldCBwYWdlSW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VJbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBzZXQgcGFnZUluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fcGFnZUluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIGdldCBvZmZzZXQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGdsb2JhbCBvZmZzZXQuICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBpbml0IHBhcmFtZXRlcnMuICovXG4gICAgZ2V0IGluZm8oKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdGhpcy5wcmVwYXJlQmFzZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgZWw6IHRoaXMuXyRiYXNlLFxuICAgICAgICAgICAgICAgIG93bmVyOiB0aGlzLl9vd25lcixcbiAgICAgICAgICAgICAgICBpdGVtOiB0aGlzLFxuICAgICAgICAgICAgfSwgdGhpcy5faW5mbyk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IG5ldyB0aGlzLl9pbml0aWFsaXplcihvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICgnbm9uZScgPT09IHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSW5kZXgoKTtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICd2aXNpYmxlJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgaXRlbSBpbnZpc2libGUuXG4gICAgICogQGphIGl0ZW0g44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICdoaWRkZW4nICE9PSB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknKSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmFkZENsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mm7TmlrBcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlLnJlbmRlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBhY3RpdmF0aW9uIHN0YXR1cyBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfnirbmhYvliKTlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2luc3RhbmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaGVpZ2h0IGluZm9ybWF0aW9uIG9mIHRoZSBpdGVtLiBDYWxsZWQgZnJvbSB7QGxpbmsgTGlzdEl0ZW1WaWV3fS5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXmg4XloLHjga7mm7TmlrAuIHtAbGluayBMaXN0SXRlbVZpZXd9IOOBi+OCieOCs+ODvOODq+OBleOCjOOCi+OAglxuICAgICAqL1xuICAgIHB1YmxpYyB1cGRhdGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZGVsdGEgPSBuZXdIZWlnaHQgLSB0aGlzLl9oZWlnaHQ7XG4gICAgICAgIHRoaXMuX2hlaWdodCA9IG5ld0hlaWdodDtcbiAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhKTtcbiAgICAgICAgaWYgKG9wdGlvbnM/LnJlZmxlY3RBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVByb2ZpbGVzKHRoaXMuX2luZGV4ID8/IDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHotaW5kZXguIENhbGxlZCBmcm9tIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYC5cbiAgICAgKiBAamEgei1pbmRleCDjga7jg6rjgrvjg4Pjg4guIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYCDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXREZXB0aCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ3otaW5kZXgnLCB0aGlzLl9vd25lci5vcHRpb25zLmJhc2VEZXB0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcHJlcGFyZUJhc2VFbGVtZW50KCk6IERPTSB7XG4gICAgICAgIGxldCAkYmFzZTogRE9NO1xuICAgICAgICBjb25zdCAkcmVjeWNsZSA9IHRoaXMuX293bmVyLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5maXJzdCgpO1xuICAgICAgICBjb25zdCBpdGVtVGFnTmFtZSA9IHRoaXMuX293bmVyLm9wdGlvbnMuaXRlbVRhZ05hbWU7XG5cbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybigndGhpcy5fJGJhc2UgaXMgbm90IG51bGwuJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fJGJhc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8ICRyZWN5Y2xlLmxlbmd0aCkge1xuICAgICAgICAgICAgJGJhc2UgPSAkcmVjeWNsZTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUF0dHIoJ3otaW5kZXgnKTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUNsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86ICDopoHmpJzoqI4uIDxsaT4g5YWo6Iis44GvIDxzbG90PiDjgajjganjga7jgojjgYbjgavljZToqr/jgZnjgovjgYs/XG4gICAgICAgICAgICAkYmFzZSA9ICQoYDwke2l0ZW1UYWdOYW1lfSBjbGFzcz1cIiR7dGhpcy5fY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1N9XCI+PC9cIiR7aXRlbVRhZ05hbWV9XCI+YCk7XG4gICAgICAgICAgICAkYmFzZS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuJHNjcm9sbE1hcC5hcHBlbmQoJGJhc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g6auY44GV44Gu5pu05pawXG4gICAgICAgIGlmICgkYmFzZS5oZWlnaHQoKSAhPT0gdGhpcy5faGVpZ2h0KSB7XG4gICAgICAgICAgICAkYmFzZS5oZWlnaHQodGhpcy5faGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkYmFzZTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfSVRFTV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9pbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfSVRFTV9JTkRFWCwgdGhpcy5faW5kZXghKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVBhZ2VJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9wYWdlSW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgsIHRoaXMuX3BhZ2VJbmRleCEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlT2Zmc2V0KCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fb3duZXIub3B0aW9ucy5lbmFibGVUcmFuc2Zvcm1PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKHRoaXMuXyRiYXNlWzBdKTtcbiAgICAgICAgICAgIGlmICh0cmFuc2xhdGVZICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7dGhpcy5fb2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IHBhcnNlSW50KHRoaXMuXyRiYXNlLmNzcygndG9wJyksIDEwKTtcbiAgICAgICAgICAgIGlmICh0b3AgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndG9wJywgYCR7dGhpcy5fb2Zmc2V0fXB4YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBhdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIG9uZSBwYWdlIG9mIHRoZSBsaXN0LlxuICogQGphIOODquOCueODiDHjg5rjg7zjgrjliIbjga4gVUkg5qeL6YCg5oOF5aCx44KS5qC857SN44GZ44KL44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBQYWdlUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBvZmZzZXQgZnJvbSB0b3AgKi9cbiAgICBwcml2YXRlIF9vZmZzZXQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSdzIGhlaWdodCAqL1xuICAgIHByaXZhdGUgX2hlaWdodCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBpdGVtJ3MgcHJvZmlsZSBtYW5hZ2VkIHdpdGggaW4gcGFnZSAqL1xuICAgIHByaXZhdGUgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIHN0YXR1cyAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicgPSAnaW5hY3RpdmUnO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGhlaWdodCAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIHN0YXR1cyAqL1xuICAgIGdldCBzdGF0dXMoKTogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdhY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgcGFnZSBpbnZpc2libGUuXG4gICAgICogQGphIHBhZ2Ug44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaGlkZGVuJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaGlkZGVuJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVhY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7pnZ7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdpbmFjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBJdGVtUHJvZmlsZX0gdG8gdGhlIHBhZ2UuXG4gICAgICogQGphIHtAbGluayBJdGVtUHJvZmlsZX0g44Gu6L+95YqgXG4gICAgICovXG4gICAgcHVibGljIHB1c2goaXRlbTogSXRlbVByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICs9IGl0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJZiBhbGwge0BsaW5rIEl0ZW1Qcm9maWxlfSB1bmRlciB0aGUgcGFnZSBhcmUgbm90IHZhbGlkLCBkaXNhYmxlIHRoZSBwYWdlJ3Mgc3RhdHVzLlxuICAgICAqIEBqYSDphY3kuIvjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgZnjgbnjgabjgYzmnInlirnjgafjgarjgYTloLTlkIgsIHBhZ2Ug44K544OG44O844K/44K544KS54Sh5Yq544Gr44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIG5vcm1hbGl6ZSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW5hYmxlQWxsID0gdGhpcy5faXRlbXMuZXZlcnkoaXRlbSA9PiBpdGVtLmlzQWN0aXZlKCkpO1xuICAgICAgICBpZiAoIWVuYWJsZUFsbCkge1xuICAgICAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIEl0ZW1Qcm9maWxlfSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6a44GX44GmIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW0oaW5kZXg6IG51bWJlcik6IEl0ZW1Qcm9maWxlIHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX2l0ZW1zLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBmaXJzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDliJ3jga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUZpcnN0KCk6IEl0ZW1Qcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zWzBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDlvozjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUxhc3QoKTogSXRlbVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlbXNbdGhpcy5faXRlbXMubGVuZ3RoIC0gMV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciB9IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9leHBhbmRhYmxlLWNvbnRleHQnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG4vKipcbiAqIEBlbiBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gc3RvcmFnZSBjbGFzcyBmb3IgZ3JvdXAgbWFuYWdlbWVudCBvZiBsaXN0IGl0ZW1zLiA8YnI+XG4gKiAgICAgVGhpcyBjbGFzcyBkb2VzIG5vdCBkaXJlY3RseSBtYW5pcHVsYXRlIHRoZSBET00uXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44KS44Kw44Or44O844OX566h55CG44GZ44KLIFVJIOani+mAoOaDheWgseagvOe0jeOCr+ODqeOCuSA8YnI+XG4gKiAgICAg5pys44Kv44Op44K544Gv55u05o6l44GvIERPTSDjgpLmk43kvZzjgZfjgarjgYRcbiAqL1xuZXhwb3J0IGNsYXNzIEdyb3VwUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwcm9maWxlIGlkICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaWQ6IHN0cmluZztcbiAgICAvKiogQGludGVybmFsIHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9IGluc3RhbmNlKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsIHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX3BhcmVudD86IEdyb3VwUHJvZmlsZTtcbiAgICAvKiogQGludGVybmFsIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9IGFycmF5ICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMgKi9cbiAgICBwcml2YXRlIF9leHBhbmRlZCA9IGZhbHNlO1xuICAgIC8qKiBAaW50ZXJuYWwgcmVnaXN0cmF0aW9uIHN0YXR1cyBmb3IgX293bmVyICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyA9ICd1bnJlZ2lzdGVyZWQnO1xuICAgIC8qKiBAaW50ZXJuYWwgc3RvcmVkIHtAbGluayBJdGVtUHJvZmlsZX0gaW5mb3JtYXRpb24gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUV4cGFuZGFibGVMaXN0Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBpZCBvZiB0aGUgaW5zdGFuY2UuIHNwZWNpZmllZCBieSB0aGUgZnJhbWV3b3JrLlxuICAgICAqICAtIGBqYWAg44Kk44Oz44K544K/44Oz44K544GuIElELiDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jgYzmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCwgaWQ6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9pZCAgICA9IGlkO1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgSUQuXG4gICAgICogQGphIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQGVuIEdldCBzdGF0dXMuICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnXG4gICAgICogQGphIOOCueODhuODvOOCv+OCueOCkuWPluW+lyAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqL1xuICAgIGdldCBzdGF0dXMoKTogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMuXG4gICAgICogQGphIOWxlemWi+eKtuaFi+OCkuWIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4cGFuZGVkLCBjb2xsYXBzZWQ6IGNsb3NlXG4gICAgICogIC0gYGphYCB0cnVlOiDlsZXplossIGZhbHNlOiDlj47mnZ9cbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4cGFuZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcGFyZW50IHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDopqoge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHBhcmVudCgpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY2hpbGRyZW4ge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY2hpbGRyZW4oKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBuZXh0IGF2YWlsYWJsZSBpbmRleCBvZiB0aGUgbGFzdCBpdGVtIGVsZW1lbnQuXG4gICAgICogQGphIOacgOW+jOOBriBpdGVtIOimgee0oOOBruasoeOBq+S9v+eUqOOBp+OBjeOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB3aXRoQWN0aXZlQ2hpbGRyZW4gXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gc2VhcmNoIGluY2x1ZGluZyByZWdpc3RlcmVkIGNoaWxkIGVsZW1lbnRzXG4gICAgICogIC0gYGphYCDnmbvpjLLmuIjjgb/jga7lrZDopoHntKDjgpLlkKvjgoHjgabmpJzntKLjgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0TmV4dEl0ZW1JbmRleCh3aXRoQWN0aXZlQ2hpbGRyZW4gPSBmYWxzZSk6IG51bWJlciB7XG4gICAgICAgIGxldCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBpZiAod2l0aEFjdGl2ZUNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsID09IGl0ZW1zIHx8IGl0ZW1zLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMuX2l0ZW1zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaXRlbXNbaXRlbXMubGVuZ3RoIC0gMV0/LmluZGV4ID8/IDApICsgMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIOacrCBHcm91cFByb2ZpbGUg44GM566h55CG44GZ44KLIGl0ZW0g44KS5L2c5oiQ44GX44Gm55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGRJdGVtKFxuICAgICAgICBoZWlnaHQ6IG51bWJlcixcbiAgICAgICAgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcixcbiAgICAgICAgaW5mbzogVW5rbm93bk9iamVjdCxcbiAgICApOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGdyb3VwOiB0aGlzIH0sIGluZm8pO1xuICAgICAgICBjb25zdCBpdGVtID0gbmV3IEl0ZW1Qcm9maWxlKHRoaXMuX293bmVyLmNvbnRleHQsIE1hdGgudHJ1bmMoaGVpZ2h0KSwgaW5pdGlhbGl6ZXIsIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIF9vd25lciDjga7nrqHnkIbkuIvjgavjgYLjgovjgajjgY3jga/pgJ/jgoTjgYvjgavov73liqBcbiAgICAgICAgaWYgKCdyZWdpc3RlcmVkJyA9PT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtLCB0aGlzLmdldE5leHRJdGVtSW5kZXgoKSk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQge0BsaW5rIEdyb3VwUHJvZmlsZX0gYXMgY2hpbGQgZWxlbWVudC5cbiAgICAgKiBAamEg5a2Q6KaB57Sg44Go44GX44GmIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAvIGluc3RhbmNlIGFycmF5XG4gICAgICovXG4gICAgcHVibGljIGFkZENoaWxkcmVuKHRhcmdldDogR3JvdXBQcm9maWxlIHwgR3JvdXBQcm9maWxlW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gQXJyYXkuaXNBcnJheSh0YXJnZXQpID8gdGFyZ2V0IDogW3RhcmdldF07XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGNoaWxkLnNldFBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jaGlsZHJlbi5wdXNoKC4uLmNoaWxkcmVuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSBpZiBpdCBoYXMgYSBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBnZXQgaGFzQ2hpbGRyZW4oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2NoaWxkcmVuLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgZXhwYW5zaW9uLlxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5flsZXplotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZXhwYW5kKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdyZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdleHBhbmRpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtcywgdGhpcy5nZXROZXh0SXRlbUluZGV4KCkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyDlrZDopoHntKDjgYzjgarjgY/jgabjgoLlsZXplovnirbmhYvjgavjgZnjgotcbiAgICAgICAgdGhpcy5fZXhwYW5kZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cCBjb2xsYXBzZS5cbiAgICAgKiBAamEg44Kw44Or44O844OX5Y+O5p2fXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgc3BlbnQgcmVtb3ZpbmcgZWxlbWVudHMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqICAtIGBqYWAg6KaB57Sg5YmK6Zmk44Gr6LK744KE44GZ6YGF5bu25pmC6ZaTLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgY29sbGFwc2UoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCd1bnJlZ2lzdGVyZWQnKTtcbiAgICAgICAgICAgIGlmICgwIDwgaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsYXkgPSBkZWxheSA/PyB0aGlzLl9vd25lci5jb250ZXh0Lm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb247XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fb3duZXIuc3RhdHVzU2NvcGUoJ2NvbGxhcHNpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBpdGVtc1swXS5pbmRleCAmJiB0aGlzLl9vd25lci5yZW1vdmVJdGVtKGl0ZW1zWzBdLmluZGV4LCBpdGVtcy5sZW5ndGgsIGRlbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5Y+O5p2f54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3cgc2VsZiBpbiB2aXNpYmxlIGFyZWEgb2YgbGlzdC5cbiAgICAgKiBAamEg6Ieq6Lqr44KS44Oq44K544OI44Gu5Y+v6KaW6aCY5Z+f44Gr6KGo56S6XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb3B0aW9uJ3Mgb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBlbnN1cmVWaXNpYmxlKG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIChudWxsICE9IHRoaXMuX2l0ZW1zWzBdLmluZGV4KSAmJiBhd2FpdCB0aGlzLl9vd25lci5lbnN1cmVWaXNpYmxlKHRoaXMuX2l0ZW1zWzBdLmluZGV4LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnM/LmNhbGxiYWNrPy4odGhpcy5fb3duZXIuc2Nyb2xsUG9zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUb2dnbGUgZXhwYW5kIC8gY29sbGFwc2UuXG4gICAgICogQGphIOmWi+mWieOBruODiOOCsOODq1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHRvZ2dsZShkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5fZXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29sbGFwc2UoZGVsYXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5leHBhbmQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjgbjnmbvpjLIuIOesrDHpmo7lsaTjgrDjg6vjg7zjg5fjga7jgb/nmbvpjLLlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5zZXJ0aW9uIHBvc2l0aW9uIHdpdGggaW5kZXhcbiAgICAgKiAgLSBgamFgIOaMv+WFpeS9jee9ruOCkiBpbmRleCDjgafmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIoaW5zZXJ0VG86IG51bWJlcik6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3JlZ2lzdGVyJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKHRoaXMucHJlcHJvY2VzcygncmVnaXN0ZXJlZCcpLCBpbnNlcnRUbyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN0b3JlIHRvIGxpc3Qgdmlldy4gT25seSAxc3QgbGF5ZXIgZ3JvdXAgY2FuIGJlIHNwZWNpZmllZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G45b6p5YWDLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/5oyH56S65Y+v6IO9LlxuICAgICAqL1xuICAgIHB1YmxpYyByZXN0b3JlKCk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3Jlc3RvcmUnIG1ldGhvZCBpcyBhY2NlcHRhYmxlIG9ubHkgMXN0IGxheWVyIGdyb3VwLmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5fZXhwYW5kZWQgPyB0aGlzLl9pdGVtcy5jb25jYXQodGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgnYWN0aXZlJykpIDogdGhpcy5faXRlbXMuc2xpY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwg6KaqIEdyb3VwIOaMh+WumiAqL1xuICAgIHByaXZhdGUgc2V0UGFyZW50KHBhcmVudDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICByZWdpc3RlciAvIHVucmVnaXN0ZXIg44Gu5YmN5Yem55CGICovXG4gICAgcHJpdmF0ZSBwcmVwcm9jZXNzKG5ld1N0YXR1czogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcpOiBJdGVtUHJvZmlsZVtdIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgaWYgKG5ld1N0YXR1cyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKC4uLnRoaXMuX2l0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSBuZXdTdGF0dXM7XG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIOaTjeS9nOWvvuixoeOBriBJdGVtUHJvZmlsZSDphY3liJfjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIHF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KG9wZXJhdGlvbjogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcgfCAnYWN0aXZlJyk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBmaW5kVGFyZ2V0cyA9IChncm91cDogR3JvdXBQcm9maWxlKTogSXRlbVByb2ZpbGVbXSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBncm91cC5fY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndW5yZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGQucHJlcHJvY2VzcyhvcGVyYXRpb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdhY3RpdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY2hpbGQuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZC5faXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0aW9uOiAke29wZXJhdGlvbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmZpbmRUYXJnZXRzKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmluZFRhcmdldHModGhpcyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgVmlldyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdFZpZXcsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxuICAgIElMaXN0SXRlbVZpZXcsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IG93bmVyOiBJTGlzdFZpZXc7XG4gICAgcmVhZG9ubHkgaXRlbTogSXRlbVByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIExpc3RJdGVtVmlld30gY29uc3RydWN0aW9uLlxuICogQGphIHtAbGluayBMaXN0SXRlbVZpZXd9IOani+evieOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBvd25lcjogSUxpc3RWaWV3O1xuICAgIGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIExpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RJdGVtVmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG93bmVyLCBpdGVtIH0gPSBvcHRpb25zO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIG93bmVyLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKiBPd25lciDlj5blvpcgKi9cbiAgICBnZXQgb3duZXIoKTogSUxpc3RWaWV3IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLm93bmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFZpZXcgY29tcG9uZW50IG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy4kZWwuY2hpbGRyZW4oKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy4kZWwub2ZmKCk7XG4gICAgICAgIC8vIHRoaXMuJGVsIOOBr+WGjeWIqeeUqOOBmeOCi+OBn+OCgeWujOWFqOOBquegtOajhOOBr+OBl+OBquOBhFxuICAgICAgICB0aGlzLnNldEVsZW1lbnQoJ251bGwnKTtcbiAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0SXRlbVZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgb3duIGl0ZW0gaW5kZXhcbiAgICAgKiBAamEg6Ieq6Lqr44GuIGl0ZW0g44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLmluZGV4ITtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNwZWNpZmllZCBoZWlnaHQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+mrmOOBleOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBpZiBjaGlsZCBub2RlIGV4aXN0cy5cbiAgICAgKiBAamEgY2hpbGQgbm9kZSDjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaGFzQ2hpbGROb2RlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLiRlbD8uY2hpbGRyZW4oKS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBpdGVtJ3MgaGVpZ2h0LlxuICAgICAqIEBqYSBpdGVtIOOBrumrmOOBleOCkuabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld0hlaWdodFxuICAgICAqICAtIGBlbmAgbmV3IGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5paw44GX44GE6auY44GVXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBvcHRpb25zIG9iamVjdFxuICAgICAqICAtIGBqYWAg5pu05paw44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzLiRlbCAmJiB0aGlzLmhlaWdodCAhPT0gbmV3SGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLnVwZGF0ZUhlaWdodChuZXdIZWlnaHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy4kZWwuaGVpZ2h0KG5ld0hlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIE51bGxhYmxlLFxuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIHR5cGUgQ29ubmVjdEV2ZW50TWFwLFxuICAgIHR5cGUgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdFNjcm9sbGVyRmFjdG9yeSxcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgU2Nyb2xsZXJFdmVudE1hcCA9IEhUTUxFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXAgJiB7ICdzY3JvbGxzdG9wJzogRXZlbnQ7IH07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIE1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OID0gNTAsXG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBIVE1MRWxlbWVudC5cbiAqIEBqYSBIVE1MRWxlbWVudCDjgpLlr77osaHjgajjgZfjgZ8ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IOWun+ijheOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRWxlbWVudFNjcm9sbGVyIGltcGxlbWVudHMgSUxpc3RTY3JvbGxlciB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJHRhcmdldDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRzY3JvbGxNYXA6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnM7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsU3RvcFRyaWdnZXI6IERPTUV2ZW50TGlzdGVuZXI7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsRHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IERPTVNlbGVjdG9yLCBtYXA6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldCA9ICQodGFyZ2V0KTtcbiAgICAgICAgdGhpcy5fJHNjcm9sbE1hcCA9IHRoaXMuXyR0YXJnZXQuY2hpbGRyZW4oKS5maXJzdCgpO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcblxuICAgICAgICAvKlxuICAgICAgICAgKiBmaXJlIGN1c3RvbSBldmVudDogYHNjcm9sbHN0b3BgXG4gICAgICAgICAqIGBzY3JvbGxlbmRgIOOBriBTYWZhcmkg5a++5b+c5b6F44GhXG4gICAgICAgICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9FbGVtZW50L3Njcm9sbGVuZF9ldmVudFxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IHRpbWVyOiBUaW1lckhhbmRsZTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSB0aW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQudHJpZ2dlcihuZXcgQ3VzdG9tRXZlbnQoJ3Njcm9sbHN0b3AnLCB7IGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUgfSkpO1xuICAgICAgICAgICAgfSwgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPz8gQ29uc3QuTUlOX1NDUk9MTFNUT1BfRFVSQVRJT04pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxTdG9wVHJpZ2dlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKiog44K/44Kk44OX5a6a576p6K2Y5Yil5a2QICovXG4gICAgc3RhdGljIGdldCBUWVBFKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnY2RwOmVsZW1lbnQtb3ZlcmZsb3ctc2Nyb2xsZXInO1xuICAgIH1cblxuICAgIC8qKiBmYWN0b3J5IOWPluW+lyAqL1xuICAgIHN0YXRpYyBnZXRGYWN0b3J5KCk6IExpc3RTY3JvbGxlckZhY3Rvcnkge1xuICAgICAgICBjb25zdCBmYWN0b3J5ID0gKHRhcmdldDogRE9NU2VsZWN0b3IsIG1hcDogRE9NU2VsZWN0b3IsIG9wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucyk6IElMaXN0U2Nyb2xsZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBFbGVtZW50U2Nyb2xsZXIodGFyZ2V0LCBtYXAsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBzZXQgdHlwZSBzaWduYXR1cmUuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGZhY3RvcnksIHtcbiAgICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBFbGVtZW50U2Nyb2xsZXIuVFlQRSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFjdG9yeSBhcyBMaXN0U2Nyb2xsZXJGYWN0b3J5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsZXJcblxuICAgIC8qKiBTY3JvbGxlciDjga7lnovmg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXQgdHlwZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gRWxlbWVudFNjcm9sbGVyLlRZUEU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruWPluW+lyAqL1xuICAgIGdldCBwb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+acgOWkp+WApOS9jee9ruOCkuWPluW+lyAqL1xuICAgIGdldCBwb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuXyRzY3JvbGxNYXAuaGVpZ2h0KCkgLSB0aGlzLl8kdGFyZ2V0LmhlaWdodCgpLCAwKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76YyyICovXG4gICAgb24odHlwZTogJ3Njcm9sbCcgfCAnc2Nyb2xsc3RvcCcsIGNhbGxiYWNrOiBET01FdmVudExpc3RlbmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub248U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76Yyy6Kej6ZmkICovXG4gICAgb2ZmKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9mZjxTY3JvbGxlckV2ZW50TWFwPih0eXBlLCBjYWxsYmFjayBhcyBVbmtub3duRnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHBvcyA9PT0gdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AoKSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gKGFuaW1hdGUgPz8gdGhpcy5fb3B0aW9ucy5lbmFibGVBbmltYXRpb24pID8gdGltZSA/PyB0aGlzLl9vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AocG9zLCB0aGlzLl9zY3JvbGxEdXJhdGlvbiwgdW5kZWZpbmVkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDjga7nirbmhYvmm7TmlrAgKi9cbiAgICB1cGRhdGUoKTogdm9pZCB7XG4gICAgICAgIC8vIG5vb3BcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu56C05qOEICovXG4gICAgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldD8ub2ZmKCk7XG4gICAgICAgICh0aGlzLl8kdGFyZ2V0IGFzIE51bGxhYmxlPERPTT4pID0gKHRoaXMuXyRzY3JvbGxNYXAgYXMgTnVsbGFibGU8RE9NPikgPSBudWxsO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBwb3N0LFxuICAgIG5vb3AsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQge1xuICAgIGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyxcbiAgICBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uLFxuICAgIGNsZWFyVHJhbnNpdGlvbixcbn0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0Q29udGV4dCxcbiAgICBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbiAgICBJTGlzdE9wZXJhdGlvbixcbiAgICBJTGlzdFNjcm9sbGFibGUsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Vmlld0dsb2JhbENvbmZpZyB9IGZyb20gJy4uL2dsb2JhbC1jb25maWcnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUsIFBhZ2VQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5pbXBvcnQgeyBFbGVtZW50U2Nyb2xsZXIgfSBmcm9tICcuL2VsZW1lbnQtc2Nyb2xsZXInO1xuXG4vKiogTGlzdENvbnRleHRPcHRpb25zIOaXouWumuWApCAqL1xuY29uc3QgX2RlZmF1bHRPcHRzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+ID0ge1xuICAgIHNjcm9sbGVyRmFjdG9yeTogRWxlbWVudFNjcm9sbGVyLmdldEZhY3RvcnkoKSxcbiAgICBlbmFibGVIaWRkZW5QYWdlOiBmYWxzZSxcbiAgICBlbmFibGVUcmFuc2Zvcm1PZmZzZXQ6IHRydWUsXG4gICAgc2Nyb2xsTWFwUmVmcmVzaEludGVydmFsOiAyMDAsXG4gICAgc2Nyb2xsUmVmcmVzaERpc3RhbmNlOiAyMDAsXG4gICAgcGFnZVByZXBhcmVDb3VudDogMyxcbiAgICBwYWdlUHJlbG9hZENvdW50OiAxLFxuICAgIGVuYWJsZUFuaW1hdGlvbjogdHJ1ZSxcbiAgICBhbmltYXRpb25EdXJhdGlvbjogMCxcbiAgICBiYXNlRGVwdGg6ICdhdXRvJyxcbiAgICBpdGVtVGFnTmFtZTogJ2RpdicsXG4gICAgcmVtb3ZlSXRlbVdpdGhUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZUR1bW15SW5hY3RpdmVTY3JvbGxNYXA6IGZhbHNlLFxufTtcblxuLyoqIGludmFsaWQgaW5zdGFuY2UgKi9cbmNvbnN0IF8kaW52YWxpZCA9ICQoKSBhcyBET007XG5cbi8qKiDliJ3mnJ/ljJbmuIjjgb/jgYvmpJzoqLwgKi9cbmZ1bmN0aW9uIHZlcmlmeTxUPih4OiBUIHwgdW5kZWZpbmVkKTogYXNzZXJ0cyB4IGlzIFQge1xuICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OKTtcbiAgICB9XG59XG5cbi8qKiBvdmVyZmxvdy15IOOCkuS/neiovCAqL1xuZnVuY3Rpb24gZW5zdXJlT3ZlcmZsb3dZKCRlbDogRE9NKTogRE9NIHtcbiAgICBjb25zdCBvdmVyZmxvd1kgPSAkZWwuY3NzKCdvdmVyZmxvdy15Jyk7XG4gICAgaWYgKCdoaWRkZW4nID09PSBvdmVyZmxvd1kgfHwgJ3Zpc2libGUnID09PSBvdmVyZmxvd1kpIHtcbiAgICAgICAgJGVsLmNzcygnb3ZlcmZsb3cteScsICdhdXRvJyk7XG4gICAgfVxuICAgIHJldHVybiAkZWw7XG59XG5cbi8qKiBzY3JvbGwtbWFwIGVsZW1lbnQg44KS5L+d6Ki8ICovXG5mdW5jdGlvbiBlbnN1cmVTY3JvbGxNYXAoJHJvb3Q6IERPTSwgbWFwQ2xhc3M6IHN0cmluZyk6IERPTSB7XG4gICAgbGV0ICRtYXAgPSAkcm9vdC5maW5kKGAuJHttYXBDbGFzc31gKTtcbiAgICAvLyAkbWFwIOOBjOeEoeOBhOWgtOWQiOOBr+S9nOaIkOOBmeOCi1xuICAgIGlmICgkbWFwLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICRtYXAgPSAkKGA8ZGl2IGNsYXNzPVwiJHttYXBDbGFzc31cIj48L2Rpdj5gKTtcbiAgICAgICAgJHJvb3QuYXBwZW5kKCRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gJG1hcDtcbn1cblxuLyoqIEBpbnRlcm5hbCDjgqLjgqTjg4bjg6DliYrpmaTmg4XloLEgKi9cbmludGVyZmFjZSBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgIHJlbW92ZWQ6IEl0ZW1Qcm9maWxlW107XG4gICAgZGVsdGE6IG51bWJlcjtcbiAgICB0cmFuc2l0aW9uOiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBzY3JvbGwgcHJvY2Vzc2luZyB0aGF0IG1hbmFnZXMgbWVtb3J5LiBBY2Nlc3NlcyB0aGUgRE9NLlxuICogQGphIOODoeODouODqueuoeeQhuOCkuihjOOBhuOCueOCr+ODreODvOODq+WHpueQhuOBruOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuS4gRE9NIOOBq+OCouOCr+OCu+OCueOBmeOCiy5cbiAqL1xuZXhwb3J0IGNsYXNzIExpc3RDb3JlIGltcGxlbWVudHMgSUxpc3RDb250ZXh0LCBJTGlzdE9wZXJhdGlvbiwgSUxpc3RTY3JvbGxhYmxlLCBJTGlzdEJhY2t1cFJlc3RvcmUge1xuICAgIHByaXZhdGUgXyRyb290OiBET007XG4gICAgcHJpdmF0ZSBfJG1hcDogRE9NO1xuICAgIHByaXZhdGUgX21hcEhlaWdodCA9IDA7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsZXI6IElMaXN0U2Nyb2xsZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKiogVUkg6KGo56S65Lit44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9hY3RpdmUgPSB0cnVlO1xuXG4gICAgLyoqIOWIneacn+OCquODl+OCt+ODp+ODs+OCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3NldHRpbmdzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+O1xuICAgIC8qKiBTY3JvbGwgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbEV2ZW50SGFuZGxlcjogKGV2PzogRXZlbnQpID0+IHZvaWQ7XG4gICAgLyoqIFNjcm9sbCBTdG9wIEV2ZW50IEhhbmRsZXIgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogMeODmuODvOOCuOWIhuOBrumrmOOBleOBruWfuua6luWApCAqL1xuICAgIHByaXZhdGUgX2Jhc2VIZWlnaHQgPSAwO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgSXRlbVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiog566h55CG5LiL44Gr44GC44KLIFBhZ2VQcm9maWxlIOmFjeWIlyAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhZ2VzOiBQYWdlUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog5pyA5paw44Gu6KGo56S66aCY5Z+f5oOF5aCx44KS5qC857SNIChTY3JvbGwg5Lit44Gu5pu05paw5Yem55CG44Gr5L2/55SoKSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCA9IHtcbiAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgIGZyb206IDAsXG4gICAgICAgIHRvOiAwLFxuICAgICAgICBwb3M6IDAsICAgIC8vIHNjcm9sbCBwb3NpdGlvblxuICAgIH07XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggX2l0ZW1zIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSB0aGlzLl8kbWFwID0gXyRpbnZhbGlkO1xuICAgICAgICB0aGlzLl9zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIF9kZWZhdWx0T3B0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbCh0aGlzLl9zY3JvbGxlciEucG9zKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlciA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TY3JvbGxTdG9wKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruWIneacn+WMliAqL1xuICAgIHB1YmxpYyBpbml0aWFsaXplKCRyb290OiBET00sIGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIOaXouOBq+ani+evieOBleOCjOOBpuOBhOOBn+WgtOWQiOOBr+egtOajhFxuICAgICAgICBpZiAodGhpcy5fJHJvb3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuXyRyb290ID0gZW5zdXJlT3ZlcmZsb3dZKCRyb290KTtcbiAgICAgICAgdGhpcy5fJG1hcCAgPSBlbnN1cmVTY3JvbGxNYXAodGhpcy5fJHJvb3QsIHRoaXMuX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHRoaXMuY3JlYXRlU2Nyb2xsZXIoKTtcbiAgICAgICAgdGhpcy5zZXRCYXNlSGVpZ2h0KGhlaWdodCk7XG4gICAgICAgIHRoaXMuc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEICovXG4gICAgcHVibGljIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVzZXRTY3JvbGxlckNvbmRpdGlvbigpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uZGVzdHJveSgpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXMuXyRyb290ID0gdGhpcy5fJG1hcCA9IF8kaW52YWxpZDtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Gu5Z+65rqW5YCk44KS5Y+W5b6XICovXG4gICAgcHVibGljIHNldEJhc2VIZWlnaHQoaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKGhlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbYmFzZSBoaWdodDogJHtoZWlnaHR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fYmFzZUhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL6Kit5a6aICovXG4gICAgcHVibGljIGFzeW5jIHNldEFjdGl2ZVN0YXRlKGFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG4gICAgICAgIGF3YWl0IHRoaXMudHJlYXRTY3JvbGxQb3NpdGlvbigpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL5Yik5a6aICovXG4gICAgZ2V0IGFjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44Gu5L+d5a2YL+W+qeWFgyAqL1xuICAgIHB1YmxpYyBhc3luYyB0cmVhdFNjcm9sbFBvc2l0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuXG4gICAgICAgIGNvbnN0IG9mZnNldCA9ICh0aGlzLl9zY3JvbGxlci5wb3MgLSB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zKTtcbiAgICAgICAgY29uc3QgeyB1c2VEdW1teUluYWN0aXZlU2Nyb2xsTWFwOiB1c2VEdW1teU1hcCB9ID0gdGhpcy5fc2V0dGluZ3M7XG5cbiAgICAgICAgY29uc3QgdXBkYXRlT2Zmc2V0ID0gKCR0YXJnZXQ6IERPTSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2xhdGVZIH0gPSBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMoJHRhcmdldFswXSk7XG4gICAgICAgICAgICBpZiAob2Zmc2V0ICE9PSB0cmFuc2xhdGVZKSB7XG4gICAgICAgICAgICAgICAgJHRhcmdldC5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7b2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9zY3JvbGxlci5zY3JvbGxUbyh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zLCBmYWxzZSwgMCk7XG4gICAgICAgICAgICB0aGlzLl8kbWFwLmNzcyh7ICd0cmFuc2Zvcm0nOiAnJywgJ2Rpc3BsYXknOiAnYmxvY2snIH0pO1xuICAgICAgICAgICAgaWYgKHVzZUR1bW15TWFwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmVwYXJlSW5hY3RpdmVNYXAoKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0ICRtYXAgPSB1c2VEdW1teU1hcCA/IHRoaXMucHJlcGFyZUluYWN0aXZlTWFwKCkgOiB0aGlzLl8kbWFwO1xuICAgICAgICAgICAgdXBkYXRlT2Zmc2V0KCRtYXApO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RDb250ZXh0XG5cbiAgICAvKiogZ2V0IHNjcm9sbC1tYXAgZWxlbWVudCAqL1xuICAgIGdldCAkc2Nyb2xsTWFwKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwO1xuICAgIH1cblxuICAgIC8qKiBnZXQgc2Nyb2xsLW1hcCBoZWlnaHQgW3B4XSAqL1xuICAgIGdldCBzY3JvbGxNYXBIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXAubGVuZ3RoID8gdGhpcy5fbWFwSGVpZ2h0IDogMDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IHtAbGluayBMaXN0Q29udGV4dE9wdGlvbnN9ICovXG4gICAgZ2V0IG9wdGlvbnMoKTogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogdXBkYXRlIHNjcm9sbC1tYXAgaGVpZ2h0IChkZWx0YSBbcHhdKSAqL1xuICAgIHVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kbWFwLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ICs9IE1hdGgudHJ1bmMoZGVsdGEpO1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZS5cbiAgICAgICAgICAgIGlmICh0aGlzLl9tYXBIZWlnaHQgPCAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuXyRtYXAuaGVpZ2h0KHRoaXMuX21hcEhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogdXBkYXRlIGludGVybmFsIHByb2ZpbGUgKi9cbiAgICB1cGRhdGVQcm9maWxlcyhmcm9tOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBfaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGZvciAobGV0IGkgPSBmcm9tLCBuID0gX2l0ZW1zLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgaWYgKDAgPCBpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IF9pdGVtc1tpIC0gMV07XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLmluZGV4ID0gbGFzdC5pbmRleCEgKyAxO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSBsYXN0Lm9mZnNldCArIGxhc3QuaGVpZ2h0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCByZWN5Y2xhYmxlIGVsZW1lbnQgKi9cbiAgICBmaW5kUmVjeWNsZUVsZW1lbnRzKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwLmZpbmQoYC4ke3RoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTfWApO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0Vmlld1xuXG4gICAgLyoqIOWIneacn+WMlua4iOOBv+OBi+WIpOWumiAqL1xuICAgIGdldCBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9zY3JvbGxlcjtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLCBpbmZvOiBVbmtub3duT2JqZWN0LCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hZGRJdGVtKG5ldyBJdGVtUHJvZmlsZSh0aGlzLCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAo5YaF6YOo55SoKSAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbSA6IFtpdGVtXTtcbiAgICAgICAgbGV0IGRlbHRhSGVpZ2h0ID0gMDtcbiAgICAgICAgbGV0IGFkZFRhaWwgPSBmYWxzZTtcblxuICAgICAgICBpZiAobnVsbCA9PSBpbnNlcnRUbyB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbnNlcnRUbykge1xuICAgICAgICAgICAgaW5zZXJ0VG8gPSB0aGlzLl9pdGVtcy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zZXJ0VG8gPT09IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRkVGFpbCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgbWFwIOOBruabtOaWsFxuICAgICAgICBmb3IgKGNvbnN0IGl0IG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBkZWx0YUhlaWdodCArPSBpdC5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGFIZWlnaHQpO1xuXG4gICAgICAgIC8vIOaMv+WFpVxuICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaW5zZXJ0VG8sIDAsIC4uLml0ZW1zKTtcblxuICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICBpZiAoIWFkZFRhaWwpIHtcbiAgICAgICAgICAgIGlmICgwID09PSBpbnNlcnRUbykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbnNlcnRUbyAtIDFdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaQgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIsIHNpemU/OiBudW1iZXIsIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4LCBhcmcyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXgsIGFyZzIsIGFyZzMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6ICovXG4gICAgcHJpdmF0ZSBfcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5OiBudW1iZXIpOiBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgICAgICBjb25zdCByZW1vdmVkOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGxldCBkZWx0YSA9IDA7XG4gICAgICAgIGxldCB0cmFuc2l0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuX2l0ZW1zW2lkeF07XG4gICAgICAgICAgICBkZWx0YSArPSBpdGVtLmhlaWdodDtcbiAgICAgICAgICAgIC8vIOWJiumZpOimgee0oOOBriB6LWluZGV4IOOBruWIneacn+WMllxuICAgICAgICAgICAgaXRlbS5yZXNldERlcHRoKCk7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8g6Ieq5YuV6Kit5a6a44O75YmK6Zmk6YGF5bu25pmC6ZaT44GM6Kit5a6a44GV44KM44GL44Gk44CB44K544Kv44Ot44O844Or44Od44K444K344On44Oz44Gr5aSJ5pu044GM44GC44KL5aC05ZCI44GvIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0aGlzLl9zZXR0aW5ncy5yZW1vdmVJdGVtV2l0aFRyYW5zaXRpb24gJiYgKDAgPCBkZWxheSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLnNjcm9sbFBvcztcbiAgICAgICAgICAgIGNvbnN0IHBvc01heCA9IHRoaXMuc2Nyb2xsUG9zTWF4IC0gZGVsdGE7XG4gICAgICAgICAgICB0cmFuc2l0aW9uID0gKHBvc01heCA8IGN1cnJlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgcmVtb3ZlZCwgZGVsdGEsIHRyYW5zaXRpb24gfTtcbiAgICB9XG5cbiAgICAvKiogaGVscGVyOiDliYrpmaTmmYLjga7mm7TmlrAgKi9cbiAgICBwcml2YXRlIF91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQ6IFJlbW92ZUl0ZW1zQ29udGV4dCwgZGVsYXk6IG51bWJlciwgcHJvZmlsZVVwZGF0ZTogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH0gPSBjb250ZXh0O1xuXG4gICAgICAgIC8vIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjdXN0b21pemUgcG9pbnQ6IOODl+ODreODleOCoeOCpOODq+OBruabtOaWsFxuICAgICAgICBwcm9maWxlVXBkYXRlKCk7XG5cbiAgICAgICAgLy8g44K544Kv44Ot44O844Or6aCY5Z+f44Gu5pu05pawXG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KC1kZWx0YSk7XG4gICAgICAgIC8vIOmBheW7tuWJiumZpFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiByZW1vdmVkKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDog6YCj57aaIGluZGV4IOeJiCAqL1xuICAgIHByaXZhdGUgX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyIHwgdW5kZWZpbmVkLCBkZWxheTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgICAgIHNpemUgPSBzaXplID8/IDE7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcblxuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4ICsgc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3JlbW92ZUl0ZW0oKSwgaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBpbmRleGVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogc2l6ZSB9LCAoXywgaSkgPT4gaW5kZXggKyBpKTtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luZGV4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluZGV4LCBzaXplKTtcbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5kZXgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDogcmFuZG9tIGFjY2VzcyDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtUmFuZG9tbHkoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcbiAgICAgICAgaW5kZXhlcy5zb3J0KChsaHMsIHJocykgPT4gcmhzIC0gbGhzKTsgLy8g6ZmN6aCG44K944O844OIXG5cbiAgICAgICAgZm9yIChjb25zdCBpbmRleCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbcmVtb3ZlSXRlbSgpLCBpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlcywgZGVsYXkpO1xuXG4gICAgICAgIC8vIOabtOaWsFxuICAgICAgICB0aGlzLl91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQsIGRlbGF5LCAoKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpZHhdLnBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpZHhdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBpbmRleGVzW2luZGV4ZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGZpcnN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIHNjcm9sbCBtYXAg44Gu44OI44Op44Oz44K444K344On44Oz6Kit5a6aICovXG4gICAgcHJpdmF0ZSBzZXR1cFNjcm9sbE1hcFRyYW5zaXRpb24oZGVsYXk6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuICAgICAgICBjb25zdCBlbCA9IHRoaXMuXyRtYXBbMF07XG4gICAgICAgIHRoaXMuXyRtYXAudHJhbnNpdGlvbkVuZCgoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRyYW5zaXRpb24oZWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbihlbCwgJ2hlaWdodCcsIGRlbGF5LCAnZWFzZScpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gaXRlbSDjgavoqK3lrprjgZfjgZ/mg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXRJdGVtSW5mbyh0YXJnZXQ6IG51bWJlciB8IEV2ZW50KTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zLCBfY29uZmlnIH0gPSB0aGlzO1xuXG4gICAgICAgIGNvbnN0IHBhcnNlciA9ICgkdGFyZ2V0OiBET00pOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIoJHRhcmdldC5hdHRyKF9jb25maWcuREFUQV9JVEVNX0lOREVYKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKSB8fCAkdGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdjYW5ub3QgZGl0ZWN0IGl0ZW0gZnJvbSBldmVudCBvYmplY3QuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlcigkdGFyZ2V0LnBhcmVudCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpbmRleCA9IHRhcmdldCBpbnN0YW5jZW9mIEV2ZW50ID8gcGFyc2VyKCQodGFyZ2V0LnRhcmdldCBhcyBIVE1MRWxlbWVudCkpIDogTnVtYmVyKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKE51bWJlci5pc05hTihpbmRleCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFt1bnN1cHBvcnRlZCB0eXBlOiAke3R5cGVvZiB0YXJnZXR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPCAwIHx8IF9pdGVtcy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IGdldEl0ZW1JbmZvKCkgW2ludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX2l0ZW1zW2luZGV4XS5pbmZvO1xuICAgIH1cblxuICAgIC8qKiDjgqLjgq/jg4bjgqPjg5bjg5rjg7zjgrjjgpLmm7TmlrAgKi9cbiAgICByZWZyZXNoKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IF9wYWdlcywgX2l0ZW1zLCBfc2V0dGluZ3MsIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQgfSA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0czogUmVjb3JkPG51bWJlciwgJ2FjdGl2YXRlJyB8ICdoaWRlJyB8ICdkZWFjdGl2YXRlJz4gPSB7fTtcbiAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgIGNvbnN0IGhpZ2hQcmlvcml0eUluZGV4OiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGNvbnN0IHN0b3JlTmV4dFBhZ2VTdGF0ZSA9IChpbmRleDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKE1hdGguYWJzKGN1cnJlbnRQYWdlSW5kZXggLSBpbmRleCkgPD0gX3NldHRpbmdzLnBhZ2VQcmVwYXJlQ291bnQpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zZXR0aW5ncy5lbmFibGVIaWRkZW5QYWdlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnaGlkZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2RlYWN0aXZhdGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY3VycmVudCBwYWdlIOOBriDliY3lvozjga8gaGlnaCBwcmlvcml0eSDjgavjgZnjgotcbiAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4ICsgMSA9PT0gaW5kZXggfHwgY3VycmVudFBhZ2VJbmRleCAtIDEgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8g5a++6LGh54Sh44GXXG4gICAgICAgIGlmIChfaXRlbXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoQ291bnQgPSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCArIF9zZXR0aW5ncy5wYWdlUHJlbG9hZENvdW50O1xuICAgICAgICAgICAgY29uc3QgYmVnaW5JbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudDtcbiAgICAgICAgICAgIGNvbnN0IGVuZEluZGV4ID0gY3VycmVudFBhZ2VJbmRleCArIHNlYXJjaENvdW50O1xuXG4gICAgICAgICAgICBsZXQgb3ZlcmZsb3dQcmV2ID0gMCwgb3ZlcmZsb3dOZXh0ID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IHBhZ2VJbmRleCA9IGJlZ2luSW5kZXg7IHBhZ2VJbmRleCA8PSBlbmRJbmRleDsgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd1ByZXYrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd05leHQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93UHJldikge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQgKyAxOyBpIDwgb3ZlcmZsb3dQcmV2OyBpKyssIHBhZ2VJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93TmV4dCkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4IC0gc2VhcmNoQ291bnQgLSAxOyBpIDwgb3ZlcmZsb3dOZXh0OyBpKyssIHBhZ2VJbmRleC0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDkuI3opoHjgavjgarjgaPjgZ8gcGFnZSDjga4g6Z2e5rS75oCn5YyWXG4gICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBfcGFnZXMuZmlsdGVyKHBhZ2UgPT4gJ2luYWN0aXZlJyAhPT0gcGFnZS5zdGF0dXMpKSB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRzW3BhZ2UuaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgcGFnZS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlhKrlhYggcGFnZSDjga4gYWN0aXZhdGVcbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaGlnaFByaW9yaXR5SW5kZXguc29ydCgobGhzLCByaHMpID0+IGxocyAtIHJocykpIHsgLy8g5piH6aCG44K944O844OIXG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCAmJiBfcGFnZXNbaWR4XT8uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g44Gd44Gu44G744GL44GuIHBhZ2Ug44GuIOeKtuaFi+WkieabtFxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXRzKSkge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBOdW1iZXIoa2V5KTtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IHRhcmdldHNbaW5kZXhdO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgX3BhZ2VzW2luZGV4XT8uW2FjdGlvbl0/LigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDmm7TmlrDlvozjgavkvb/nlKjjgZfjgarjgYvjgaPjgZ8gRE9NIOOCkuWJiumZpFxuICAgICAgICB0aGlzLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5yZW1vdmUoKTtcblxuICAgICAgICBjb25zdCBwYWdlQ3VycmVudCA9IF9wYWdlc1tjdXJyZW50UGFnZUluZGV4XTtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5mcm9tICA9IHBhZ2VDdXJyZW50Py5nZXRJdGVtRmlyc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC50byAgICA9IHBhZ2VDdXJyZW50Py5nZXRJdGVtTGFzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ID0gY3VycmVudFBhZ2VJbmRleDtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLmFzc2lnblBhZ2UoTWF0aC5tYXgodGhpcy5fcGFnZXMubGVuZ3RoIC0gMSwgMCkpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkCAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgIHRoaXMuYXNzaWduUGFnZSgpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOeuoei9hOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFnZXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faXRlbXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQoMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsYWJsZVxuXG4gICAgLyoqIHNjcm9sbGVyIOOBrueorumhnuOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxlclR5cGUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy50eXBlO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsUG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8ucG9zID8/IDA7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxQb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy5wb3NNYXggPz8gMDtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpCAqL1xuICAgIHNldFNjcm9sbEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LlttZXRob2RdKCdzY3JvbGwnLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or57WC5LqG44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpCAqL1xuICAgIHNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5bbWV0aG9kXSgnc2Nyb2xsc3RvcCcsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBhc3luYyBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBwb3NpdGlvbiwgdG9vIHNtYWxsLiBbcG9zOiAke3Bvc31dYCk7XG4gICAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX3Njcm9sbGVyLnBvc01heCA8IHBvcykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIHBvc2l0aW9uLCB0b28gYmlnLiBbcG9zOiAke3Bvc31dYCk7XG4gICAgICAgICAgICBwb3MgPSB0aGlzLl9zY3JvbGxlci5wb3NNYXg7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcG9zIOOBruOBv+WFiOmnhuOBkeOBpuabtOaWsFxuICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICBpZiAocG9zICE9PSB0aGlzLl9zY3JvbGxlci5wb3MpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Njcm9sbGVyLnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44GfIGl0ZW0g44Gu6KGo56S644KS5L+d6Ki8ICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShpbmRleDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgX3Njcm9sbGVyLCBfaXRlbXMsIF9zZXR0aW5ncywgX2Jhc2VIZWlnaHQgfSA9IHRoaXM7XG5cbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgX2l0ZW1zLmxlbmd0aCA8PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gZW5zdXJlVmlzaWJsZSgpIFtpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBwYXJ0aWFsT0ssIHNldFRvcCwgYW5pbWF0ZSwgdGltZSwgY2FsbGJhY2sgfSA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgcGFydGlhbE9LOiB0cnVlLFxuICAgICAgICAgICAgc2V0VG9wOiBmYWxzZSxcbiAgICAgICAgICAgIGFuaW1hdGU6IF9zZXR0aW5ncy5lbmFibGVBbmltYXRpb24sXG4gICAgICAgICAgICB0aW1lOiBfc2V0dGluZ3MuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICAgICAgICBjYWxsYmFjazogbm9vcCxcbiAgICAgICAgfSwgb3B0aW9ucykgYXMgUmVxdWlyZWQ8TGlzdEVuc3VyZVZpc2libGVPcHRpb25zPjtcblxuICAgICAgICBjb25zdCBjdXJyZW50U2NvcGUgPSB7XG4gICAgICAgICAgICBmcm9tOiBfc2Nyb2xsZXIucG9zLFxuICAgICAgICAgICAgdG86IF9zY3JvbGxlci5wb3MgKyBfYmFzZUhlaWdodCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0YXJnZXQgPSBfaXRlbXNbaW5kZXhdO1xuXG4gICAgICAgIGNvbnN0IHRhcmdldFNjb3BlID0ge1xuICAgICAgICAgICAgZnJvbTogdGFyZ2V0Lm9mZnNldCxcbiAgICAgICAgICAgIHRvOiB0YXJnZXQub2Zmc2V0ICsgdGFyZ2V0LmhlaWdodCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpc0luU2NvcGUgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBpZiAocGFydGlhbE9LKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFNjb3BlLmZyb20gPD0gY3VycmVudFNjb3BlLmZyb20pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRTY29wZS5mcm9tIDw9IHRhcmdldFNjb3BlLnRvO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRTY29wZS5mcm9tIDw9IGN1cnJlbnRTY29wZS50bztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50U2NvcGUuZnJvbSA8PSB0YXJnZXRTY29wZS5mcm9tICYmIHRhcmdldFNjb3BlLnRvIDw9IGN1cnJlbnRTY29wZS50bztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkZXRlY3RQb3NpdGlvbiA9ICgpOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFNjb3BlLmZyb20gPCBjdXJyZW50U2NvcGUuZnJvbVxuICAgICAgICAgICAgICAgID8gdGFyZ2V0U2NvcGUuZnJvbVxuICAgICAgICAgICAgICAgIDogdGFyZ2V0Lm9mZnNldCAtIHRhcmdldC5oZWlnaHQgLy8gYm90dG9tIOWQiOOCj+OBm+OBr+aDheWgseS4jei2s+OBq+OCiOOCiuS4jeWPr1xuICAgICAgICAgICAgO1xuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBwb3M6IG51bWJlcjtcbiAgICAgICAgaWYgKHNldFRvcCkge1xuICAgICAgICAgICAgcG9zID0gdGFyZ2V0U2NvcGUuZnJvbTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0luU2NvcGUoKSkge1xuICAgICAgICAgICAgY2FsbGJhY2soX3Njcm9sbGVyLnBvcyk7XG4gICAgICAgICAgICByZXR1cm47IC8vIG5vb3BcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvcyA9IGRldGVjdFBvc2l0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgICAgIGNhbGxiYWNrKHBvcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0geyBpdGVtczogdGhpcy5faXRlbXMgfTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjCAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoMCA8IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hZGRJdGVtKHRoaXMuX2JhY2t1cFtrZXldLml0ZW1zKTtcblxuICAgICAgICBpZiAocmVidWlsZCkge1xuICAgICAgICAgICAgdGhpcy5yZWJ1aWxkKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYWNrdXApKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5ICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumiAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YS5pdGVtcykpIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0gZGF0YTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9uKCdzY3JvbGxzdG9wJywgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+egtOajhCAqL1xuICAgIHByaXZhdGUgcmVzZXRTY3JvbGxlckNvbmRpdGlvbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub2ZmKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDml6Llrprjga4gU2Nyb2xsZXIg44Kq44OW44K444Kn44Kv44OI44Gu5L2c5oiQICovXG4gICAgcHJpdmF0ZSBjcmVhdGVTY3JvbGxlcigpOiBJTGlzdFNjcm9sbGVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzLnNjcm9sbGVyRmFjdG9yeSh0aGlzLl8kcm9vdCwgdGhpcy5fJG1hcCwgdGhpcy5fc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKiDnj77lnKjjga4gUGFnZSBJbmRleCDjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldFBhZ2VJbmRleCgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2Jhc2VIZWlnaHQsIF9wYWdlcyB9ID0gdGhpcztcbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3QgeyBwb3M6IHNjcm9sbFBvcywgcG9zTWF4OiBzY3JvbGxQb3NNYXggfSA9IF9zY3JvbGxlcjtcblxuICAgICAgICBjb25zdCBzY3JvbGxNYXBTaXplID0gKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICAgICAgcmV0dXJuIGxhc3RQYWdlID8gbGFzdFBhZ2Uub2Zmc2V0ICsgbGFzdFBhZ2UuaGVpZ2h0IDogX2Jhc2VIZWlnaHQ7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgY29uc3QgcG9zID0gKCgpID0+IHtcbiAgICAgICAgICAgIGlmICgwID09PSBzY3JvbGxQb3NNYXggfHwgc2Nyb2xsUG9zTWF4IDw9IF9iYXNlSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY3JvbGxQb3MgKiBzY3JvbGxNYXBTaXplIC8gc2Nyb2xsUG9zTWF4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHZhbGlkUmFuZ2UgPSAocGFnZTogUGFnZVByb2ZpbGUgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhZ2Uub2Zmc2V0IDw9IHBvcyAmJiBwb3MgPD0gcGFnZS5vZmZzZXQgKyBwYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNhbmRpZGF0ZSA9IE1hdGguZmxvb3IocG9zIC8gX2Jhc2VIZWlnaHQpO1xuICAgICAgICBpZiAoMCAhPT0gY2FuZGlkYXRlICYmIF9wYWdlcy5sZW5ndGggPD0gY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICBjYW5kaWRhdGUgPSBfcGFnZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwYWdlID0gX3BhZ2VzW2NhbmRpZGF0ZV07XG4gICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgfSBlbHNlIGlmIChwb3MgPCBwYWdlPy5vZmZzZXQpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYW5kaWRhdGUgLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIHBhZ2UgPSBfcGFnZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNhbmRpZGF0ZSArIDEsIG4gPSBfcGFnZXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFnZSA9IF9wYWdlc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBkZXRlY3QgcGFnZSBpbmRleC4gZmFsbGJhY2s6ICR7X3BhZ2VzLmxlbmd0aCAtIDF9YCk7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBfcGFnZXMubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4gICAgLyoqIOacgOW+jOOBruODmuODvOOCuOOCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgZ2V0TGFzdFBhZ2UoKTogUGFnZVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VzW3RoaXMuX3BhZ2VzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4gqL1xuICAgIHByaXZhdGUgb25TY3JvbGwocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGludGVyc2VjdGlvblJlY3Qg44KS5L2/55So44GZ44KL5aC05ZCILCBTY3JvbGwg44OP44Oz44OJ44Op44O85YWo6Iis44Gv44Gp44GG44GC44KL44G544GN44GL6KaB5qSc6KiOXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMocG9zIC0gdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcykgPCB0aGlzLl9zZXR0aW5ncy5zY3JvbGxSZWZyZXNoRGlzdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5YGc5q2i44Kk44OZ44Oz44OIICovXG4gICAgcHJpdmF0ZSBvblNjcm9sbFN0b3AocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggIT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu44Ki44K144Kk44OzICovXG4gICAgcHJpdmF0ZSBhc3NpZ25QYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoZnJvbSk7XG5cbiAgICAgICAgY29uc3QgeyBfaXRlbXMsIF9wYWdlcywgX2Jhc2VIZWlnaHQsIF9zY3JvbGxlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgYmFzZVBhZ2UgPSB0aGlzLmdldExhc3RQYWdlKCk7XG4gICAgICAgIGNvbnN0IG5leHRJdGVtSW5kZXggPSBiYXNlUGFnZT8uZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgY29uc3QgYXNpZ25lZUl0ZW1zICA9IF9pdGVtcy5zbGljZShuZXh0SXRlbUluZGV4KTtcblxuICAgICAgICBsZXQgd29ya1BhZ2UgPSBiYXNlUGFnZTtcbiAgICAgICAgaWYgKG51bGwgPT0gd29ya1BhZ2UpIHtcbiAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3IFBhZ2VQcm9maWxlKCk7XG4gICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgYXNpZ25lZUl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoX2Jhc2VIZWlnaHQgPD0gd29ya1BhZ2UuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2UuaW5kZXggPSB3b3JrUGFnZS5pbmRleCArIDE7XG4gICAgICAgICAgICAgICAgbmV3UGFnZS5vZmZzZXQgPSB3b3JrUGFnZS5vZmZzZXQgKyB3b3JrUGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2UgPSBuZXdQYWdlO1xuICAgICAgICAgICAgICAgIF9wYWdlcy5wdXNoKHdvcmtQYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW0ucGFnZUluZGV4ID0gd29ya1BhZ2UuaW5kZXg7XG4gICAgICAgICAgICB3b3JrUGFnZS5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG5cbiAgICAgICAgX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu6Kej6ZmkICovXG4gICAgcHJpdmF0ZSBjbGVhclBhZ2UoZnJvbT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYWdlcy5zcGxpY2UoZnJvbSA/PyAwKTtcbiAgICB9XG5cbiAgICAvKiogaW5hY3RpdmUg55SoIE1hcCDjga7nlJ/miJAgKi9cbiAgICBwcml2YXRlIHByZXBhcmVJbmFjdGl2ZU1hcCgpOiBET00ge1xuICAgICAgICBjb25zdCB7IF9jb25maWcsIF8kbWFwLCBfbWFwSGVpZ2h0IH0gPSB0aGlzO1xuICAgICAgICBjb25zdCAkcGFyZW50ID0gXyRtYXAucGFyZW50KCk7XG4gICAgICAgIGxldCAkaW5hY3RpdmVNYXAgPSAkcGFyZW50LmZpbmQoYC4ke19jb25maWcuSU5BQ1RJVkVfQ0xBU1N9YCk7XG5cbiAgICAgICAgaWYgKCRpbmFjdGl2ZU1hcC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBjb25zdCAkbGlzdEl0ZW1WaWV3cyA9IF8kbWFwLmNsb25lKCkuY2hpbGRyZW4oKS5maWx0ZXIoKF8sIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZGV4ID0gTnVtYmVyKCQoZWxlbWVudCkuYXR0cihfY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4IC0gMSA8PSBwYWdlSW5kZXggJiYgcGFnZUluZGV4IDw9IGN1cnJlbnRQYWdlSW5kZXggKyAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRpbmFjdGl2ZU1hcCA9ICQoYDxzZWN0aW9uIGNsYXNzPVwiJHtfY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1N9ICR7X2NvbmZpZy5JTkFDVElWRV9DTEFTU31cIj48L3NlY3Rpb24+YClcbiAgICAgICAgICAgICAgICAuYXBwZW5kKCRsaXN0SXRlbVZpZXdzKVxuICAgICAgICAgICAgICAgIC5oZWlnaHQoX21hcEhlaWdodCk7XG4gICAgICAgICAgICAkcGFyZW50LmFwcGVuZCgkaW5hY3RpdmVNYXApO1xuICAgICAgICAgICAgXyRtYXAuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkaW5hY3RpdmVNYXA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBkb20gYXMgJCxcbiAgICB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFZpZXcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0Q29udGV4dCxcbiAgICBJTGlzdFZpZXcsXG4gICAgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zLFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IExpc3RDb3JlIH0gZnJvbSAnLi9jb3JlL2xpc3QnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgY29udGV4dDogTGlzdENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgY2xhc3MgdGhhdCBzdG9yZXMge0BsaW5rIExpc3RWaWV3fSBpbml0aWFsaXphdGlvbiBpbmZvcm1hdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBruWIneacn+WMluaDheWgseOCkuagvOe0jeOBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCueOCr+ODqeOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEZ1bmNOYW1lID0gc3RyaW5nPlxuICAgIGV4dGVuZHMgTGlzdENvbnRleHRPcHRpb25zLCBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgaW5pdGlhbEhlaWdodD86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBAZW4gVmlydHVhbCBsaXN0IHZpZXcgY2xhc3MgdGhhdCBwcm92aWRlcyBtZW1vcnkgbWFuYWdlbWVudCBmdW5jdGlvbmFsaXR5LlxuICogQGphIOODoeODouODqueuoeeQhuapn+iDveOCkuaPkOS+m+OBmeOCi+S7ruaDs+ODquOCueODiOODk+ODpeODvOOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJTGlzdFZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiBuZXcgTGlzdENvcmUob3B0aW9ucyksXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG5cbiAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuJGVsIGFzIERPTVNlbGVjdG9yPFRFbGVtZW50Pik7XG4gICAgfVxuXG4gICAgLyoqIGNvbnRleHQgYWNjZXNzb3IgKi9cbiAgICBnZXQgY29udGV4dCgpOiBJTGlzdENvbnRleHQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dDtcbiAgICB9XG5cbiAgICAvKiogY29uc3RydWN0IG9wdGlvbiBhY2Nlc3NvciAqL1xuICAgIGdldCBvcHRpb25zKCk6IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm9wdGlvbnM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gVmlldyBjb21wb25lbnQgbWV0aG9kczpcblxuICAgIC8qKiBgdGhpcy5lbGAg5pu05paw5pmC44Gu5paw44GX44GEIEhUTUwg44KS44Os44Oz44OA44Oq44Oz44Kw44Ot44K444OD44Kv44Gu5a6f6KOF6Zai5pWwLiDjg6Ljg4fjg6vmm7TmlrDjgaggVmlldyDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLpgKPli5XjgZXjgZvjgosuICovXG4gICAgYWJzdHJhY3QgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gQ2hhbmdlIHRoZSB2aWV3J3MgZWxlbWVudCAoYHRoaXMuZWxgIHByb3BlcnR5KSBhbmQgcmUtZGVsZWdhdGUgdGhlIHZpZXcncyBldmVudHMgb24gdGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBqYSBWaWV3IOOBjOeuoei9hOOBmeOCi+imgee0oCAoYHRoaXMuZWxgIHByb3BlcnR5KSDjga7lpInmm7QuIOOCpOODmeODs+ODiOWGjeioreWumuOCguWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsXG4gICAgICogIC0gYGVuYCBPYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OI44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgc2V0RWxlbWVudChlbDogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzW19wcm9wZXJ0aWVzXSkge1xuICAgICAgICAgICAgY29uc3QgeyBjb250ZXh0IH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgY29udGV4dC5kZXN0cm95KCk7XG4gICAgICAgICAgICBjb250ZXh0LmluaXRpYWxpemUoJGVsIGFzIERPTTxOb2RlPiBhcyBET00sIHRoaXMub3B0aW9ucy5pbml0aWFsSGVpZ2h0ID8/ICRlbC5oZWlnaHQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLnNldEVsZW1lbnQoZWwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBSZW1vdmUgdGhpcyB2aWV3IGJ5IHRha2luZyB0aGUgZWxlbWVudCBvdXQgb2YgdGhlIERPTSB3aXRoIHJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEgVmlldyDjgYvjgokgRE9NIOOCkuWIh+OCiumbouOBlywg44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmRlc3Ryb3koKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnJlbW92ZSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0T3BlcmF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgaXQgaGFzIGJlZW4gaW5pdGlhbGl6ZWQuXG4gICAgICogQGphIOWIneacn+WMlua4iOOBv+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGluaXRpYWxpemVkIC8gZmFsc2U6IHVuaW5pdGlhbGl6ZWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOWIneacn+WMlua4iOOBvyAvIGZhbHNlOiDmnKrliJ3mnJ/ljJZcbiAgICAgKi9cbiAgICBnZXQgaXNJbml0aWFsaXplZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNJbml0aWFsaXplZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIGl0ZW0g55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGl0ZW0gYnkgaW5kZXhcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5oy/5YWl5L2N572u44KS44Kk44Oz44OH44OD44Kv44K544Gn5oyH5a6aXG4gICAgICovXG4gICAgYWRkSXRlbShoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgaW5mbzogVW5rbm93bk9iamVjdCwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYWRkSXRlbShuZXcgSXRlbVByb2ZpbGUodGhpcy5jb250ZXh0LCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbiAoaW50ZXJuYWwgdXNlKS5cbiAgICAgKiBAamEgaXRlbSDnmbvpjLIgKOWGhemDqOeUqClcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSXRlbVByb2ZpbGV9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGl0ZW0gYnkgaW5kZXhcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5oy/5YWl5L2N572u44KS44Kk44Oz44OH44OD44Kv44K544Gn5oyH5a6aXG4gICAgICovXG4gICAgX2FkZEl0ZW0oaXRlbTogSXRlbVByb2ZpbGUgfCBJdGVtUHJvZmlsZVtdLCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Ll9hZGRJdGVtKGl0ZW0sIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHRoZSBzcGVjaWZpZWQgSXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluZGV4IHRvIHN0YXJ0IHJlbGVhc2luZ1xuICAgICAqICAtIGBqYWAg6Kej6Zmk6ZaL5aeL44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIHNpemVcbiAgICAgKiAgLSBgZW5gIHRvdGFsIG51bWJlciBvZiBpdGVtcyB0byByZWxlYXNlXG4gICAgICogIC0gYGphYCDop6PpmaTjgZnjgosgaXRlbSDjga7nt4/mlbAgW2RlZmF1bHQ6IDFdXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHRvIGFjdHVhbGx5IGRlbGV0ZSB0aGUgZWxlbWVudCBbZGVmYXVsdDogMCAoaW1tZWRpYXRlIGRlbGV0aW9uKVxuICAgICAqICAtIGBqYWAg5a6f6Zqb44Gr6KaB57Sg44KS5YmK6Zmk44GZ44KLIGRlbGF5IHRpbWUgW2RlZmF1bHQ6IDAgKOWNs+aZguWJiumZpCldXG4gICAgICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyLCBzaXplPzogbnVtYmVyLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHRoZSBzcGVjaWZpZWQgSXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGFyZ2V0IGluZGV4IGFycmF5LiBpdCBpcyBtb3JlIGVmZmljaWVudCB0byBzcGVjaWZ5IHJldmVyc2UgaW5kZXguXG4gICAgICogIC0gYGphYCDlr77osaHjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjgpLmjIflrpouIHJldmVyc2UgaW5kZXgg44KS5oyH5a6a44GZ44KL44G744GG44GM5Yq5546H55qEXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHRvIGFjdHVhbGx5IGRlbGV0ZSB0aGUgZWxlbWVudCBbZGVmYXVsdDogMCAoaW1tZWRpYXRlIGRlbGV0aW9uKVxuICAgICAqICAtIGBqYWAg5a6f6Zqb44Gr6KaB57Sg44KS5YmK6Zmk44GZ44KLIGRlbGF5IHRpbWUgW2RlZmF1bHQ6IDAgKOWNs+aZguWJiumZpCldXG4gICAgICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcblxuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVtb3ZlSXRlbShpbmRleCBhcyBudW1iZXIsIGFyZzIsIGFyZzMpOyAvLyBhdm9pZCB0cygyMzQ1KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGluZm9ybWF0aW9uIHNldCBmb3IgdGhlIHNwZWNpZmllZCBpdGVtLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gaXRlbSDjgavoqK3lrprjgZfjgZ/mg4XloLHjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGlkZW50aWZpZXIgW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqICAtIGBqYWAg6K2Y5Yil5a2QLiBbaW5kZXggfCBldmVudCBvYmplY3RdXG4gICAgICovXG4gICAgZ2V0SXRlbUluZm8odGFyZ2V0OiBudW1iZXIgfCBFdmVudCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRJdGVtSW5mbyh0YXJnZXQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWZyZXNoIGFjdGl2ZSBwYWdlcy5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW44Oa44O844K444KS5pu05pawXG4gICAgICovXG4gICAgcmVmcmVzaCgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWZyZXNoKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBCdWlsZCB1bmFzc2lnbmVkIHBhZ2VzLlxuICAgICAqIEBqYSDmnKrjgqLjgrXjgqTjg7Pjg5rjg7zjgrjjgpLmp4vnr4lcbiAgICAgKi9cbiAgICB1cGRhdGUoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQudXBkYXRlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWJ1aWxkIHBhZ2UgYXNzaWdubWVudHMuXG4gICAgICogQGphIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkFxuICAgICAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVidWlsZCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRGVzdHJveSBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4RcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbGVhc2UoKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnJlbGVhc2UoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGFibGVcblxuICAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHNjcm9sbFBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zY3JvbGxQb3M7XG4gICAgfVxuXG4gICAgIC8qKlxuICAgICAgKiBAZW4gR2V0IG1heGltdW0gc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44Gu5pyA5aSn5YCk44KS5Y+W5b6XXG4gICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zTWF4O1xuICAgIH1cblxuICAgICAvKipcbiAgICAgKiBAZW4gU2Nyb2xsIGV2ZW50IGhhbmRsZXIgc2V0dGluZy9jYW5jZWxsYXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyLCBtZXRob2QpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXR0aW5nL2NhbmNlbGxpbmcgc2Nyb2xsIHN0b3AgZXZlbnQgaGFuZGxlci5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or57WC5LqG44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeODvOmWouaVsFxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9uOiBzZXR0aW5nIC8gb2ZmOiBjYW5jZWxpbmdcbiAgICAgKiAgLSBgamFgIG9uOiDoqK3lrpogLyBvZmY6IOino+mZpFxuICAgICAqL1xuICAgIHNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zXG4gICAgICogIC0gYGVuYCBuZXcgc2Nyb2xsIHBvc2l0aW9uIHZhbHVlIFswIC0gcG9zTWF4XVxuICAgICAqICAtIGBqYWAg5paw44GX44GE44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aIFswIC0gcG9zTWF4XVxuICAgICAqIEBwYXJhbSBhbmltYXRlXG4gICAgICogIC0gYGVuYCBlbmFibGUvZGlzYWJsZSBhbmltYXRpb25cbiAgICAgKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+OBruacieeEoVxuICAgICAqIEBwYXJhbSB0aW1lXG4gICAgICogIC0gYGVuYCB0aW1lIHNwZW50IG9uIGFuaW1hdGlvbiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW5zdXJlIHZpc2liaWxpdHkgb2YgaXRlbSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44GfIGl0ZW0g44Gu6KGo56S644KS5L+d6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5kZXggb2YgaXRlbVxuICAgICAqICAtIGBqYWAgaXRlbSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSBvYmplY3RcbiAgICAgKiAgLSBgamFgIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIGVuc3VyZVZpc2libGUoaW5kZXg6IG51bWJlciwgb3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5lbnN1cmVWaXNpYmxlKGluZGV4LCBvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5IChhbnkgaWRlbnRpZmllcilcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvCjku7vmhI/jga7orZjliKXlrZAp44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5iYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcGFyYW0gcmVidWlsZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHJlYnVpbGQgdGhlIGxpc3Qgc3RydWN0dXJlXG4gICAgICogIC0gYGphYCDjg6rjgrnjg4jmp4vpgKDjgpLlho3mp4vnr4njgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZCA9IHRydWUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIGJhY2t1cCBkYXRhIGV4aXN0cy5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cyAvIGZhbHNlOiBub3QgZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIkgLyBmYWxzZTog54ShXG4gICAgICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEaXNjYXJkIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZGlzY2FyZCBleGlzdGluZyBkYXRhIC8gZmFsc2U6IHNwZWNpZmllZCBkYXRhIGRvZXMgbm90IGV4aXN0XG4gICAgICogIC0gYGphYCB0cnVlOiDlrZjlnKjjgZfjgZ/jg4fjg7zjgr/jgpLnoLTmo4QgLyBmYWxzZTog5oyH5a6a44GV44KM44Gf44OH44O844K/44Gv5a2Y5Zyo44GX44Gq44GEXG4gICAgICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IFVua25vd25PYmplY3QgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmFja3VwIGRhdGEgY2FuIGJlIHNldCBleHRlcm5hbGx5LlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2NlZWRlZCAvIGZhbHNlOiBzY2hlbWEgaW52YWxpZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOOCueOCreODvOODnuOBjOS4jeato1xuICAgICAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IFVua25vd25PYmplY3QpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0QmFja3VwRGF0YShrZXksIGRhdGEgYXMgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdFZpZXcgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IHsgdHlwZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBMaXN0SXRlbVZpZXcgfSBmcm9tICcuL2xpc3QtaXRlbS12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIEV4cGFuZGFibGVMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RJdGVtVmlld30g5qeL56+J44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhwYW5kYWJsZUxpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIG93bmVyOiBJRXhwYW5kYWJsZUxpc3RWaWV3O1xuICAgIC8qKiB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8qKlxuICogQGVuIExpc3QgaXRlbSBjb250YWluZXIgY2xhc3MgaGFuZGxlZCBieSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSDjgYzmibHjgYbjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgrPjg7Pjg4bjg4rjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0SXRlbVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlldzxURWxlbWVudCwgVEV2ZW50PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHsgZ3JvdXAgfSA9IG9wdGlvbnM7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0geyBncm91cCB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cy5cbiAgICAgKiBAamEg5bGV6ZaL54q25oWL44KS5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhwYW5kZWQsIGNvbGxhcHNlZDogY2xvc2VcbiAgICAgKiAgLSBgamFgIHRydWU6IOWxlemWiywgZmFsc2U6IOWPjuadn1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmdyb3VwLmlzRXhwYW5kZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcuXG4gICAgICogQGphIOWxlemWi+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc0V4cGFuZGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOWPjuadn+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc1N3aXRjaGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIGlmIGl0IGhhcyBhIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzLCBmYWxzZTogdW5leGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSwgZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaGFzQ2hpbGRyZW4oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5ncm91cC5oYXNDaGlsZHJlbjtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIGx1aWQsXG4gICAgc3RhdHVzQWRkUmVmLFxuICAgIHN0YXR1c1JlbGVhc2UsXG4gICAgc3RhdHVzU2NvcGUsXG4gICAgaXNTdGF0dXNJbixcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBJRXhwYW5kT3BlcmF0aW9uLFxuICAgIElMaXN0U3RhdHVzTWFuYWdlcixcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUsXG4gICAgSUV4cGFuZGFibGVMaXN0Q29udGV4dCxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuLi9wcm9maWxlJztcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIHRoYXQgbWFuYWdlcyBleHBhbmRpbmcgLyBjb2xsYXBzaW5nIHN0YXRlLlxuICogQGphIOmWi+mWieeKtuaFi+euoeeQhuOCkuihjOOBhuOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRXhwYW5kQ29yZSBpbXBsZW1lbnRzXG4gICAgSUV4cGFuZE9wZXJhdGlvbixcbiAgICBJTGlzdFN0YXR1c01hbmFnZXIsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlIHtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX293bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0O1xuXG4gICAgLyoqIHsgaWQ6IEdyb3VwUHJvZmlsZSB9ICovXG4gICAgcHJpdmF0ZSBfbWFwR3JvdXBzOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+ID0ge307XG4gICAgLyoqIOesrDHpmo7lsaQgR3JvdXBQcm9maWxlIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgX2FyeVRvcEdyb3VwczogR3JvdXBQcm9maWxlW10gPSBbXTtcblxuICAgIC8qKiDjg4fjg7zjgr/jga4gYmFja3VwIOmgmOWfny4ga2V5IOOBqCB7IG1hcCwgdG9wcyB9IOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9PiA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0gb3duZXIg6KaqIFZpZXcg44Gu44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbiAgICB9XG5cbiAgICAvKiog44OH44O844K/44KS56C05qOEICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX21hcEdyb3VwcyA9IHt9O1xuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMgPSBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRXhwYW5kT3BlcmF0aW9uXG5cbiAgICAvKiog5paw6KaPIEdyb3VwUHJvZmlsZSDjgpLkvZzmiJAgKi9cbiAgICBuZXdHcm91cChpZD86IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB7XG4gICAgICAgIGlkID0gaWQgPz8gbHVpZCgnbGlzdC1ncm91cCcsIDQpO1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9tYXBHcm91cHNbaWRdKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbWFwR3JvdXBzW2lkXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBncm91cCA9IG5ldyBHcm91cFByb2ZpbGUodGhpcy5fb3duZXIsIGlkKTtcbiAgICAgICAgdGhpcy5fbWFwR3JvdXBzW2lkXSA9IGdyb3VwO1xuICAgICAgICByZXR1cm4gZ3JvdXA7XG4gICAgfVxuXG4gICAgLyoqIOeZu+mMsua4iOOBvyBHcm91cCDjgpLlj5blvpcgKi9cbiAgICBnZXRHcm91cChpZDogc3RyaW5nKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21hcEdyb3Vwc1tpZF07XG4gICAgfVxuXG4gICAgLyoqIOesrDHpmo7lsaTjga4gR3JvdXAg55m76YyyICovXG4gICAgcmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIC8vIOOBmeOBp+OBq+eZu+mMsua4iOOBv+OBruWgtOWQiOOBryByZXN0b3JlIOOBl+OBpiBsYXlvdXQg44Kt44O844GU44Go44Gr5b6p5YWD44GZ44KL44CCXG4gICAgICAgIGlmICgncmVnaXN0ZXJlZCcgPT09IHRvcEdyb3VwLnN0YXR1cykge1xuICAgICAgICAgICAgLy8gVE9ETzogb3JpZW50YXRpb24gY2hhbmdlZCDmmYLjga4gbGF5b3V0IOOCreODvOWkieabtOWvvuW/nOOBoOOBjOOAgeOCreODvOOBq+WkieabtOOBjOeEoeOBhOOBqOOBjeOBr+S4jeWFt+WQiOOBqOOBquOCi+OAglxuICAgICAgICAgICAgLy8g44GT44GuIEFQSSDjgavlrp/oo4XjgYzlv4XopoHjgYvjgoLlkKvjgoHjgabopovnm7TjgZfjgYzlv4XopoFcbiAgICAgICAgICAgIHRvcEdyb3VwLnJlc3RvcmUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxhc3RHcm91cCA9IHRoaXMuX2FyeVRvcEdyb3Vwc1t0aGlzLl9hcnlUb3BHcm91cHMubGVuZ3RoIC0gMV07XG4gICAgICAgIGNvbnN0IGluc2VydFRvID0gbGFzdEdyb3VwPy5nZXROZXh0SXRlbUluZGV4KHRydWUpID8/IDA7XG5cbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzLnB1c2godG9wR3JvdXApO1xuICAgICAgICB0b3BHcm91cC5yZWdpc3RlcihpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqIOesrDHpmo7lsaTjga4gR3JvdXAg44KS5Y+W5b6XICovXG4gICAgZ2V0VG9wR3JvdXBzKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FyeVRvcEdyb3Vwcy5zbGljZSgwKTtcbiAgICB9XG5cbiAgICAvKiog44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5bGV6ZaLICgx6ZqO5bGkKSAqL1xuICAgIGFzeW5jIGV4cGFuZEFsbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzaWVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIHByb21pc2llcy5wdXNoKGdyb3VwLmV4cGFuZCgpKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNpZXMpO1xuICAgIH1cblxuICAgIC8qKiDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlj47mnZ8gKDHpmo7lsaQpICovXG4gICAgYXN5bmMgY29sbGFwc2VBbGwoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzaWVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIHByb21pc2llcy5wdXNoKGdyb3VwLmNvbGxhcHNlKGRlbGF5KSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzaWVzKTtcbiAgICB9XG5cbiAgICAvKiog5bGV6ZaL5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1N0YXR1c0luKCdleHBhbmRpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog5Y+O5p2f5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNTdGF0dXNJbignY29sbGFwc2luZycpO1xuICAgIH1cblxuICAgIC8qKiDplovplonkuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzRXhwYW5kaW5nIHx8IHRoaXMuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U3RhdHVzTWFuYWdlclxuXG4gICAgLyoqIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiCAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiog54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqIOWHpueQhuOCueOCs+ODvOODl+avjuOBq+eKtuaFi+WkieaVsOOCkuioreWumiAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c1Njb3BlKHN0YXR1cywgZXhlY3V0b3IpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo0gKi9cbiAgICBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBpc1N0YXR1c0luKHN0YXR1cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44OQ44OD44Kv44Ki44OD44OXICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHsgX2JhY2t1cCB9ID0gdGhpcztcbiAgICAgICAgaWYgKG51bGwgPT0gX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBfYmFja3VwW2tleV0gPSB7XG4gICAgICAgICAgICAgICAgbWFwOiB0aGlzLl9tYXBHcm91cHMsXG4gICAgICAgICAgICAgICAgdG9wczogdGhpcy5fYXJ5VG9wR3JvdXBzLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44Oq44K544OI44KiICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBiYWNrdXAgPSB0aGlzLmdldEJhY2t1cERhdGEoa2V5KTtcbiAgICAgICAgaWYgKG51bGwgPT0gYmFja3VwKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8IHRoaXMuX2FyeVRvcEdyb3Vwcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLl9tYXBHcm91cHMsIGJhY2t1cC5tYXApO1xuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMgPSBiYWNrdXAudG9wcy5zbGljZSgpO1xuXG4gICAgICAgIC8vIOWxlemWi+OBl+OBpuOBhOOCi+OCguOBruOCkueZu+mMslxuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHRoaXMuX2FyeVRvcEdyb3Vwcykge1xuICAgICAgICAgICAgZ3JvdXAucmVzdG9yZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g5YaN5qeL56+J44Gu5LqI57SEXG4gICAgICAgIHJlYnVpbGQgJiYgdGhpcy5fb3duZXIucmVidWlsZCgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54ShICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYWNrdXApKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5ICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aICovXG4gICAgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9KTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChkYXRhLm1hcCAmJiBBcnJheS5pc0FycmF5KGRhdGEudG9wcykpIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0gZGF0YTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFdyaXRhYmxlLCBVbmtub3duT2JqZWN0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0VmlldywgSUV4cGFuZE9wZXJhdGlvbiB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFeHBhbmRDb3JlIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB0eXBlIHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcbmltcG9ydCB7IHR5cGUgTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zLCBMaXN0VmlldyB9IGZyb20gJy4vbGlzdC12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IEV4cGFuZENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBWaXJ0dWFsIGxpc3QgdmlldyBjbGFzcyB3aXRoIGV4cGFuZGluZyAvIGNvbGxhcHNpbmcgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDplovplonmqZ/og73jgpLlgpnjgYjjgZ/ku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0VmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgTGlzdFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJRXhwYW5kYWJsZUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IG5ldyBFeHBhbmRDb3JlKHRoaXMpLFxuICAgICAgICB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuICAgIC8qKiBjb250ZXh0IGFjY2Vzc29yICovXG4gICAgZ2V0IGV4cGFuZENvbnRleHQoKTogSUV4cGFuZE9wZXJhdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElFeHBhbmRhYmxlTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcge0BsaW5rIEdyb3VwUHJvZmlsZX0uIFJldHVybiB0aGUgb2JqZWN0IGlmIGl0IGlzIGFscmVhZHkgcmVnaXN0ZXJlZC5cbiAgICAgKiBAamEg5paw6KaPIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuS9nOaIkC4g55m76Yyy5riI44G/44Gu5aC05ZCI44Gv44Gd44Gu44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIG5ld2x5IGNyZWF0ZWQgZ3JvdXAgaWQuIGlmIG5vdCBzcGVjaWZpZWQsIGF1dG9tYXRpYyBhbGxvY2F0aW9uIHdpbGwgYmUgcGVyZm9ybWVkLlxuICAgICAqICAtIGBqYWAg5paw6KaP44Gr5L2c5oiQ44GZ44KLIEdyb3VwIElEIOOCkuaMh+Wumi4g5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv6Ieq5YuV5Ymy44KK5oyv44KKXG4gICAgICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5uZXdHcm91cChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCByZWdpc3RlcmVkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDnmbvpjLLmuIjjgb8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIEdyb3VwIElEIHRvIHJldHJpZXZlXG4gICAgICogIC0gYGphYCDlj5blvpfjgZnjgosgR3JvdXAgSUQg44KS5oyH5a6aXG4gICAgICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEdyb3VwKGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gMXN0IGxheWVyIHtAbGluayBHcm91cFByb2ZpbGV9IHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEg56ysMemajuWxpOOBriB7QGxpbmsgR3JvdXBQcm9maWxlfSDnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b3BHcm91cFxuICAgICAqICAtIGBlbmAgY29uc3RydWN0ZWQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIOani+eviea4iOOBvyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwOiBHcm91cFByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWdpc3RlclRvcEdyb3VwKHRvcEdyb3VwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IDFzdCBsYXllciB7QGxpbmsgR3JvdXBQcm9maWxlfS4gPGJyPlxuICAgICAqICAgICBBIGNvcHkgYXJyYXkgaXMgcmV0dXJuZWQsIHNvIHRoZSBjbGllbnQgY2Fubm90IGNhY2hlIGl0LlxuICAgICAqIEBqYSDnrKwx6ZqO5bGk44GuIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+lyA8YnI+XG4gICAgICogICAgIOOCs+ODlOODvOmFjeWIl+OBjOi/lOOBleOCjOOCi+OBn+OCgeOAgeOCr+ODqeOCpOOCouODs+ODiOOBr+OCreODo+ODg+OCt+ODpeS4jeWPr1xuICAgICAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldFRvcEdyb3VwcygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHBhbmQgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlsZXplosgKDHpmo7lsaQpXG4gICAgICovXG4gICAgZXhwYW5kQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5leHBhbmRBbGwoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29sbGFwc2UgYWxsIGdyb3VwcyAoMXN0IGxheWVyKVxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlj47mnZ8gKDHpmo7lsaQpXG4gICAgICovXG4gICAgY29sbGFwc2VBbGwoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY29sbGFwc2VBbGwoZGVsYXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nLlxuICAgICAqIEBqYSDlsZXplovkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzRXhwYW5kaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgY29sbGFwc2luZy5cbiAgICAgKiBAamEg5Y+O5p2f5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNTd2l0Y2hpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICAgICAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICAgICAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnN0YXR1c0FkZFJlZihzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAgICAgKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gICAgICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAgICAgKi9cbiAgICBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc3RhdHVzUmVsZWFzZShzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdGF0ZSB2YXJpYWJsZSBtYW5hZ2VtZW50IHNjb3BlXG4gICAgICogQGphIOeKtuaFi+WkieaVsOeuoeeQhuOCueOCs+ODvOODl1xuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHZhbCBvZiBzZWVkIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWw44Gu5oi744KK5YCkXG4gICAgICovXG4gICAgc3RhdHVzU2NvcGU8VD4oc3RhdHVzOiBzdHJpbmcsIGV4ZWN1dG9yOiAoKSA9PiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zdGF0dXNTY29wZShzdGF0dXMsIGV4ZWN1dG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgaWYgaXQncyBpbiB0aGUgc3BlY2lmaWVkIHN0YXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWU6IOeKtuaFi+WGhSAvIGZhbHNlOiDnirbmhYvlpJZcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgOiB3aXRoaW4gdGhlIHN0YXR1cyAvIGBmYWxzZWA6IG91dCBvZiB0aGUgc3RhdHVzXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOeKtuaFi+WGhSAvIGBmYWxzZWA6IOeKtuaFi+WkllxuICAgICAqL1xuICAgIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNTdGF0dXNJbihzdGF0dXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOiBMaXN0Vmlld1xuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIERlc3Ryb3kgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg566h6L2E44OH44O844K/44KS56C05qOEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgc3VwZXIucmVsZWFzZSgpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbGVhc2UoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKGFueSBpZGVudGlmaWVyKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O8KOS7u+aEj+OBruitmOWIpeWtkCnjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEBwYXJhbSByZWJ1aWxkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gcmVidWlsZCB0aGUgbGlzdCBzdHJ1Y3R1cmVcbiAgICAgKiAgLSBgamFgIOODquOCueODiOani+mAoOOCkuWGjeani+evieOBmeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkID0gdHJ1ZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZXN0b3JlKGtleSwgcmVidWlsZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgYmFja3VwIGRhdGEgZXhpc3RzLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzIC8gZmFsc2U6IG5vdCBleGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSAvIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBvdmVycmlkZSBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaGFzQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERpc2NhcmQgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBkaXNjYXJkIGV4aXN0aW5nIGRhdGEgLyBmYWxzZTogc3BlY2lmaWVkIGRhdGEgZG9lcyBub3QgZXhpc3RcbiAgICAgKiAgLSBgamFgIHRydWU6IOWtmOWcqOOBl+OBn+ODh+ODvOOCv+OCkuegtOajhCAvIGZhbHNlOiDmjIflrprjgZXjgozjgZ/jg4fjg7zjgr/jga/lrZjlnKjjgZfjgarjgYRcbiAgICAgKi9cbiAgICBvdmVycmlkZSBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY2xlYXJCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKi9cbiAgICBvdmVycmlkZSBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogVW5rbm93bk9iamVjdCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmdldEJhY2t1cERhdGEoa2V5KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEBlbiBCYWNrdXAgZGF0YSBjYW4gYmUgc2V0IGV4dGVybmFsbHkuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5XG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VlZGVkIC8gZmFsc2U6IHNjaGVtYSBpbnZhbGlkXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog44K544Kt44O844Oe44GM5LiN5q2jXG4gICAgICovXG4gICAgb3ZlcnJpZGUgc2V0QmFja3VwRGF0YShrZXk6IHN0cmluZywgZGF0YTogVW5rbm93bk9iamVjdCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zZXRCYWNrdXBEYXRhKGtleSwgZGF0YSBhcyB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0pO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyIkIiwiZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzIiwiYXQiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJ0b0hlbHBTdHJpbmciLCJfcHJvcGVydGllcyIsIlZpZXciLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiY2xlYXJUcmFuc2l0aW9uIiwic2V0VHJhbnNmb3JtVHJhbnNpdGlvbiIsInBvc3QiLCJub29wIiwibHVpZCIsInN0YXR1c0FkZFJlZiIsInN0YXR1c1JlbGVhc2UiLCJzdGF0dXNTY29wZSIsImlzU3RhdHVzSW4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBQUEsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBO0lBQUEsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxxQkFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLHFCQUE4QztZQUM5QyxXQUEyQyxDQUFBLFdBQUEsQ0FBQSwwQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEscUNBQThCLENBQUMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFBLEdBQUEsMENBQUE7WUFD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