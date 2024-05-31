/*!
 * @cdp/ui-components 0.9.18
 *   ui-componets collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, runtime) { 'use strict';

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

    /** @internal */ const getComputedStyle = runtime.safe(globalThis.getComputedStyle);

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

    // TODO: test
    const UI_UTILS_STATUS = 'UNDER CONSTRUCTION';
    runtime.isFunction(runtime.i18n.t) && console.log('okok');

    /*!
     * @cdp/ui-forms 0.9.18
     *   UI form components
     */


    const sheet$1 = new CSSStyleSheet();sheet$1.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

    const sheet = new CSSStyleSheet();sheet.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

    const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
    void runtime.post(runtime.noop(sheet$1, sheet));

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
                clearTransition(el);
            });
            setTransformTransition(el, 'height', delay, 'ease');
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
    exports.UI_FORMS_STATUS = UI_FORMS_STATUS;
    exports.UI_LISTVIEW_STATUS = UI_LISTVIEW_STATUS;
    exports.UI_UTILS_STATUS = UI_UTILS_STATUS;
    exports.clearTransition = clearTransition;
    exports.cssPrefixes = cssPrefixes;
    exports.getTransformMatrixValues = getTransformMatrixValues;
    exports.setTransformTransition = setTransformTransition;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5qcyIsInNvdXJjZXMiOlsidWktdXRpbHMvcmVzdWx0LWNvZGUtZGVmcy50cyIsInVpLXV0aWxzL3Nzci50cyIsInVpLXV0aWxzL2Nzcy9taXNjLnRzIiwidWktdXRpbHMvaW5kZXgudHMiLCJ1aS1mb3Jtcy9pbmRleC50cyIsInVpLWxpc3R2aWV3L3Jlc3VsdC1jb2RlLWRlZnMudHMiLCJ1aS1saXN0dmlldy9nbG9iYWwtY29uZmlnLnRzIiwidWktbGlzdHZpZXcvcHJvZmlsZS9pdGVtLnRzIiwidWktbGlzdHZpZXcvcHJvZmlsZS9wYWdlLnRzIiwidWktbGlzdHZpZXcvcHJvZmlsZS9ncm91cC50cyIsInVpLWxpc3R2aWV3L2xpc3QtaXRlbS12aWV3LnRzIiwidWktbGlzdHZpZXcvY29yZS9lbGVtZW50LXNjcm9sbGVyLnRzIiwidWktbGlzdHZpZXcvY29yZS9saXN0LnRzIiwidWktbGlzdHZpZXcvbGlzdC12aWV3LnRzIiwidWktbGlzdHZpZXcvZXhwYW5kYWJsZS1saXN0LWl0ZW0tdmlldy50cyIsInVpLWxpc3R2aWV3L2NvcmUvZXhwYW5kLnRzIiwidWktbGlzdHZpZXcvZXhwYW5kYWJsZS1saXN0LXZpZXcudHMiLCJ1aS1saXN0dmlldy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBleHBvcnQgY29uc3QgZW51bSBDRFBfS05PV05fVUlfTU9EVUxFIHtcbiAgICAgICAgLyoqIGBAY2RwL3VpLXV0aWxzYCAqL1xuICAgICAgICBVVElMUyAgICAgPSAxLFxuICAgICAgICAvKiogYEBjZHAvdWktbGlzdHZpZXdgICovXG4gICAgICAgIExJU1RWSUVXICA9IDIsXG4gICAgICAgIC8qKiBvZmZzZXQgZm9yIHVua25vd24gdWktbW9kdWxlICovXG4gICAgICAgIE9GRlNFVCxcbiAgICB9XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFVJX1VUSUxTID0gKENEUF9LTk9XTl9NT0RVTEUuT0ZGU0VUICsgQ0RQX0tOT1dOX1VJX01PRFVMRS5VVElMUykgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgVUlfVVRJTFNfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfVUlfVVRJTFNfRkFUQUwgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9VVElMUyArIDEsICdVSSB1dGlscyBzb21ldGhpbmcgd3JvbmcuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGdldENvbXB1dGVkU3R5bGUgPSBzYWZlKGdsb2JhbFRoaXMuZ2V0Q29tcHV0ZWRTdHlsZSk7XG4iLCJpbXBvcnQgeyBnZXRDb21wdXRlZFN0eWxlIH0gZnJvbSAnLi4vc3NyJztcblxuLyoqXG4gKiBAZW4gQ1NTIHZlbmRvciBwcmVmaXggc3RyaW5nIGRlZmluaXRpb24uXG4gKiBAamEgQ1NTIOODmeODs+ODgOODvOODl+ODquODleOCo+ODg+OCr+OCueaWh+Wtl+WIl+Wumue+qVxuICovXG5leHBvcnQgY29uc3QgY3NzUHJlZml4ZXMgPSBbJy13ZWJraXQtJywgJy1tb3otJywgJy1tcy0nLCAnLW8tJywgJyddO1xuXG4vKipcbiAqIEBlbiBTdG9yZXMgdGhlIHZhbHVlIHNwZWNpZmllZCBpbiBjc3MgYHRyYW5zZm9ybSgzZClgLlxuICogQGphIGNzcyBgdHJhbnNmb3JtKDNkKWAg44Gr5oyH5a6a44GV44KM44KL5YCk44KS5qC857SNXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNmb3JtTWF0cml4VmFsdWVzIHtcbiAgICB0cmFuc2xhdGVYOiBudW1iZXI7XG4gICAgdHJhbnNsYXRlWTogbnVtYmVyO1xuICAgIHRyYW5zbGF0ZVo6IG51bWJlcjtcbiAgICBzY2FsZVg6IG51bWJlcjtcbiAgICBzY2FsZVk6IG51bWJlcjtcbiAgICBzY2FsZVo6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiB0aGUgdHJhbnNmb3JtIG1hdHJpeCBzcGVjaWZpZWQgaW4gYEVsZW1lbnRgLlxuICogQGphIGBFbGVtZW50YCDjgavmjIflrprjgZXjgozjgZ8gdHJhbnNmb3JtIOihjOWIl+OBruWApOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBjb25zdCBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgPSAoZWw6IEVsZW1lbnQpOiBUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG4gICAgY29uc3QgeyBtMTEsIG0yMiwgbTMzLCBtNDEsIG00MiwgbTQzIH0gPSBuZXcgRE9NTWF0cml4UmVhZE9ubHkoc3R5bGUudHJhbnNmb3JtKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0cmFuc2xhdGVYOiBtNDEsXG4gICAgICAgIHRyYW5zbGF0ZVk6IG00MixcbiAgICAgICAgdHJhbnNsYXRlWjogbTQzLFxuICAgICAgICBzY2FsZVg6IG0xMSxcbiAgICAgICAgc2NhbGVZOiBtMjIsXG4gICAgICAgIHNjYWxlWjogbTMzLFxuICAgIH07XG59O1xuXG4vKipcbiAqIEBlbiBTZXR0aW5nIHByb3BlcnR5IGNvbnZlcnNpb24gYW5pbWF0aW9uIHVzaW5nIGNzcyB0cmFuc2l0aW9uIGZvciBzcGVjaWZpZWQgZWxlbWVudC5cbiAqIEBqYSDmjIflrpropoHntKDjgavlr77jgZfjgaYgY3NzIHRyYW5zaXRpb24g44KS55So44GE44Gf44OX44Ot44OR44OG44Kj5aSJ5o+b44Ki44OL44Oh44O844K344On44Oz44Gu6Kit5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgSFRNTEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgSFRNTEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWUgW2V4OiBoZWlnaHRdXG4gKiAgLSBgamFgIOWvvuixoeODl+ODreODkeODhuOCo+WQjSBbZXg6IGhlaWdodF1cbiAqIEBwYXJhbSBtc2VjXG4gKiAgLSBgZW5gIGFuaW1hdGlvbiBkdXJhdGlvbiBbbXNlY11cbiAqICAtIGBqYWAg44Ki44OL44Oh44O844K344On44Oz5pmC6ZaTIFttc2VjXVxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBuYW1lIFtkZWZhdWx0OiBlYXNlXVxuICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbDlkI0gW2RlZmF1bHQ6IGVhc2VdXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uID0gKGVsOiBIVE1MRWxlbWVudCwgcHJvcDogc3RyaW5nLCBtc2VjOiBudW1iZXIsIHRpbWluZ0Z1bmN0aW9uID0gJ2Vhc2UnKTogdm9pZCA9PiB7XG4gICAgY29uc3QgYW5pbWF0aW9uID0gYCR7KG1zZWMgLyAxMDAwKX1zICR7dGltaW5nRnVuY3Rpb259YDtcbiAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgndHJhbnNpdGlvbicsIGAke3Byb3B9ICR7YW5pbWF0aW9ufSwgdHJhbnNmb3JtICR7YW5pbWF0aW9ufWApO1xufTtcblxuXG4vKipcbiAqIEBlbiBDbGVhciBjc3MgdHJhbnNpdGlvbiBzZXR0aW5ncyBmb3Igc3BlY2lmaWVkIGVsZW1lbnQuXG4gKiBAamEg5oyH5a6a6KaB57Sg44GuIGNzcyB0cmFuc2l0aW9uIOioreWumuOCkuino+mZpFxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEhUTUxFbGVtZW50YCBpbnN0YW5jZVxuICogIC0gYGphYCDlr77osaEgYEhUTUxFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyVHJhbnNpdGlvbiA9IChlbDogSFRNTEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndHJhbnNpdGlvbicpO1xufTtcbiIsImltcG9ydCAnLi9yZXN1bHQtY29kZS1kZWZzJztcbmV4cG9ydCAqIGZyb20gJy4vY3NzJztcblxuLy8gVE9ETzogdGVzdFxuZXhwb3J0IGNvbnN0IFVJX1VUSUxTX1NUQVRVUyA9ICdVTkRFUiBDT05TVFJVQ1RJT04nO1xuaW1wb3J0IHsgaTE4biwgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pc0Z1bmN0aW9uKGkxOG4udCkgJiYgIGNvbnNvbGUubG9nKCdva29rJyk7XG4iLCJleHBvcnQgY29uc3QgVUlfRk9STVNfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG5cbmltcG9ydCB7IG5vb3AsIHBvc3QgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuXG5pbXBvcnQgc3R5bGVDb3JlIGZyb20gJ0Bjc3Mvc3RydWN0dXJlLmNzcycgd2l0aCB7IHR5cGU6ICdjc3MnIH07XG5pbXBvcnQgc3R5bGVCdXR0b24gZnJvbSAnQGNzcy9zdHJ1Y3R1cmUtYnV0dG9uLmNzcycgd2l0aCB7IHR5cGU6ICdjc3MnIH07XG5cbnZvaWQgcG9zdChub29wKHN0eWxlQ29yZSwgc3R5bGVCdXR0b24pKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfTElTVFZJRVcgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLkxJU1RWSUVXKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9MSVNUVklFV19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAxLCAnbGlzdHZpZXcgaGFzIGludmFsaWQgaW5pdGlhbGl6YXRpb24uJyksXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0gICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDIsICdsaXN0dmlldyBnaXZlbiBhIGludmFsaWQgcGFyYW0uJyksXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfT1BFUkFUSU9OICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDMsICdsaXN0dmlldyBpbnZhbGlkIG9wZXJhdGlvbi4nKSxcbiAgICB9XG59XG4iLCIvKipcbiAqIEBlbiBHbG9iYWwgY29uZmlndXJhdGlvbiBkZWZpbml0aW9uIGZvciBsaXN0IHZpZXdzLlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICBOQU1FU1BBQ0U6IHN0cmluZztcbiAgICBXUkFQUEVSX0NMQVNTOiBzdHJpbmc7XG4gICAgV1JBUFBFUl9TRUxFQ1RPUjogc3RyaW5nO1xuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHN0cmluZztcbiAgICBTQ1JPTExfTUFQX1NFTEVDVE9SOiBzdHJpbmc7XG4gICAgSU5BQ1RJVkVfQ0xBU1M6IHN0cmluZztcbiAgICBJTkFDVElWRV9DTEFTU19TRUxFQ1RPUjogc3RyaW5nO1xuICAgIFJFQ1lDTEVfQ0xBU1M6IHN0cmluZztcbiAgICBSRUNZQ0xFX0NMQVNTX1NFTEVDVE9SOiBzdHJpbmc7XG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogc3RyaW5nO1xuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1NfU0VMRUNUT1I6IHN0cmluZztcbiAgICBEQVRBX1BBR0VfSU5ERVg6IHN0cmluZztcbiAgICBEQVRBX0NPTlRBSU5FUl9JTkRFWDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHRWIHtcbiAgICBOQU1FU1BBQ0UgICAgICAgICAgICAgICAgICAgID0gJ2NkcC11aScsXG4gICAgV1JBUFBFUl9DTEFTUyAgICAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctd3JhcHBlcmAsXG4gICAgV1JBUFBFUl9TRUxFQ1RPUiAgICAgICAgICAgICA9IGAuJHtXUkFQUEVSX0NMQVNTfWAsXG4gICAgU0NST0xMX01BUF9DTEFTUyAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctc2Nyb2xsLW1hcGAsXG4gICAgU0NST0xMX01BUF9TRUxFQ1RPUiAgICAgICAgICA9IGAuJHtTQ1JPTExfTUFQX0NMQVNTfWAsXG4gICAgSU5BQ1RJVkVfQ0xBU1MgICAgICAgICAgICAgICA9ICdpbmFjdGl2ZScsXG4gICAgSU5BQ1RJVkVfQ0xBU1NfU0VMRUNUT1IgICAgICA9IGAuJHtJTkFDVElWRV9DTEFTU31gLFxuICAgIFJFQ1lDTEVfQ0xBU1MgICAgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXJlY3ljbGVgLFxuICAgIFJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1IgICAgICAgPSBgLiR7UkVDWUNMRV9DTEFTU31gLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LWl0ZW0tYmFzZWAsXG4gICAgTElTVElURU1fQkFTRV9DTEFTU19TRUxFQ1RPUiA9IGAuJHtMSVNUSVRFTV9CQVNFX0NMQVNTfWAsXG4gICAgREFUQV9QQUdFX0lOREVYICAgICAgICAgICAgICA9IGBkYXRhLSR7TkFNRVNQQUNFfS1wYWdlLWluZGV4YCxcbiAgICBEQVRBX0NPTlRBSU5FUl9JTkRFWCAgICAgICAgID0gYGRhdGEtJHtOQU1FU1BBQ0V9LWNvbnRhaW5lci1pbmRleGAsXG59XG5cbmNvbnN0IF9jb25maWcgPSB7XG4gICAgTkFNRVNQQUNFOiBEZWZhdWx0Vi5OQU1FU1BBQ0UsXG4gICAgV1JBUFBFUl9DTEFTUzogRGVmYXVsdFYuV1JBUFBFUl9DTEFTUyxcbiAgICBXUkFQUEVSX1NFTEVDVE9SOiBEZWZhdWx0Vi5XUkFQUEVSX1NFTEVDVE9SLFxuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IERlZmF1bHRWLlNDUk9MTF9NQVBfQ0xBU1MsXG4gICAgU0NST0xMX01BUF9TRUxFQ1RPUjogRGVmYXVsdFYuU0NST0xMX01BUF9TRUxFQ1RPUixcbiAgICBJTkFDVElWRV9DTEFTUzogRGVmYXVsdFYuSU5BQ1RJVkVfQ0xBU1MsXG4gICAgSU5BQ1RJVkVfQ0xBU1NfU0VMRUNUT1I6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTX1NFTEVDVE9SLFxuICAgIFJFQ1lDTEVfQ0xBU1M6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1MsXG4gICAgUkVDWUNMRV9DTEFTU19TRUxFQ1RPUjogRGVmYXVsdFYuUkVDWUNMRV9DTEFTU19TRUxFQ1RPUixcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBEZWZhdWx0Vi5MSVNUSVRFTV9CQVNFX0NMQVNTLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1NfU0VMRUNUT1I6IERlZmF1bHRWLkxJU1RJVEVNX0JBU0VfQ0xBU1NfU0VMRUNUT1IsXG4gICAgREFUQV9QQUdFX0lOREVYOiBEZWZhdWx0Vi5EQVRBX1BBR0VfSU5ERVgsXG4gICAgREFUQV9DT05UQUlORVJfSU5ERVg6IERlZmF1bHRWLkRBVEFfQ09OVEFJTkVSX0lOREVYLFxufTtcblxuLyoqXG4gKiBAZW4gR2V0L1VwZGF0ZSBnbG9iYWwgY29uZmlndXJhdGlvbiBvZiBsaXN0IHZpZXcuXG4gKiBAamEg44Oq44K544OI44OT44Ol44O844Gu44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Os44O844K344On44Oz44Gu5Y+W5b6XL+abtOaWsFxuICovXG5leHBvcnQgY29uc3QgTGlzdFZpZXdHbG9iYWxDb25maWcgPSAobmV3Q29uZmlnPzogUGFydGlhbDxMaXN0Vmlld0dsb2JhbENvbmZpZz4pOiBMaXN0Vmlld0dsb2JhbENvbmZpZyA9PiB7XG4gICAgaWYgKG5ld0NvbmZpZykge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhuZXdDb25maWcpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgX2NvbmZpZywgbmV3Q29uZmlnKTtcbn07XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25PYmplY3QsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHsgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzIH0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7IElMaXN0SXRlbVZpZXcsIExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHsgTGlzdFZpZXdHbG9iYWxDb25maWcgfSBmcm9tICcuLi9nbG9iYWwtY29uZmlnJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIGxpc3QgaXRlbXMuXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgSXRlbVByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUxpc3RDb250ZXh0O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5pdGlhbGl6ZXI6IG5ldyAob3B0aW9ucz86IFVua25vd25PYmplY3QpID0+IElMaXN0SXRlbVZpZXc7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luZm86IFVua25vd25PYmplY3Q7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBiZWxvbmdpbmcgcGFnZSBpbmRleCAqL1xuICAgIHByaXZhdGUgX3BhZ2VJbmRleCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgb2Zmc2V0ICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGJhc2UgZG9tIGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfJGJhc2U/OiBET007XG4gICAgLyoqIEBpbnRlcm5hbCBJTGlzdEl0ZW1WaWV3IGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfaW5zdGFuY2U/OiBJTGlzdEl0ZW1WaWV3O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RWaWV3Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruWIneacn+OBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUxpc3RDb250ZXh0LCBoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IG5ldyAob3B0aW9ucz86IFVua25vd25PYmplY3QpID0+IElMaXN0SXRlbVZpZXcsIF9pbmZvOiBVbmtub3duT2JqZWN0KSB7XG4gICAgICAgIHRoaXMuX293bmVyICAgICAgID0gb3duZXI7XG4gICAgICAgIHRoaXMuX2hlaWdodCAgICAgID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplciA9IGluaXRpYWxpemVyO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgICA9IF9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBoZWlnaHQuICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBpdGVtJ3MgZ2xvYmFsIGluZGV4LiAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBnZXQgcGFnZUluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYWdlSW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCBiZWxvbmdpbmcgdGhlIHBhZ2UgaW5kZXguICovXG4gICAgc2V0IHBhZ2VJbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX3BhZ2VJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgZ2xvYmFsIG9mZnNldC4gKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIHNldCBvZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgaW5pdCBwYXJhbWV0ZXJzLiAqL1xuICAgIGdldCBpbmZvKCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5mbztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZSA9IHRoaXMucHJlcGFyZUJhc2VFbGVtZW50KCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgZWw6IHRoaXMuXyRiYXNlLFxuICAgICAgICAgICAgICAgIG93bmVyOiB0aGlzLl9vd25lcixcbiAgICAgICAgICAgICAgICBsaW5lUHJvZmlsZTogdGhpcyxcbiAgICAgICAgICAgIH0sIHRoaXMuX2luZm8pO1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSBuZXcgdGhpcy5faW5pdGlhbGl6ZXIob3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoJ25vbmUnID09PSB0aGlzLl8kYmFzZS5jc3MoJ2Rpc3BsYXknKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAndmlzaWJsZScgIT09IHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIGl0ZW0gaW52aXNpYmxlLlxuICAgICAqIEBqYSBpdGVtIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAnaGlkZGVuJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5hZGRDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZnJlc2ggdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5pu05pawXG4gICAgICovXG4gICAgcHVibGljIHJlZnJlc2goKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW5kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgYWN0aXZhdGlvbiBzdGF0dXMgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5rS75oCn54q25oWL5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9pbnN0YW5jZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGhlaWdodCBpbmZvcm1hdGlvbiBvZiB0aGUgaXRlbS4gQ2FsbGVkIGZyb20ge0BsaW5rIExpc3RJdGVtVmlld30uXG4gICAgICogQGphIGl0ZW0g44Gu6auY44GV5oOF5aCx44Gu5pu05pawLiB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gbmV3SGVpZ2h0IC0gdGhpcy5faGVpZ2h0O1xuICAgICAgICB0aGlzLl9oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YSk7XG4gICAgICAgIGlmIChvcHRpb25zPy5yZWZsZWN0QWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGVQcm9maWxlcyh0aGlzLl9pbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgei1pbmRleC4gQ2FsbGVkIGZyb20ge0BsaW5rIFNjcm9sbE1hbmFnZXJ9YC5yZW1vdmVJdGVtKClgLlxuICAgICAqIEBqYSB6LWluZGV4IOOBruODquOCu+ODg+ODiC4ge0BsaW5rIFNjcm9sbE1hbmFnZXJ9YC5yZW1vdmVJdGVtKClgIOOBi+OCieOCs+ODvOODq+OBleOCjOOCi+OAglxuICAgICAqL1xuICAgIHB1YmxpYyByZXNldERlcHRoKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmNzcygnei1pbmRleCcsIHRoaXMuX293bmVyLm9wdGlvbnMuYmFzZURlcHRoKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZ2V0IF9jb25maWcoKTogTGlzdFZpZXdHbG9iYWxDb25maWcge1xuICAgICAgICByZXR1cm4gTGlzdFZpZXdHbG9iYWxDb25maWcoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBwcmVwYXJlQmFzZUVsZW1lbnQoKTogRE9NIHtcbiAgICAgICAgbGV0ICRiYXNlOiBET007XG4gICAgICAgIGNvbnN0ICRyZWN5Y2xlID0gdGhpcy5fb3duZXIuZmluZFJlY3ljbGVFbGVtZW50cygpLmZpcnN0KCk7XG4gICAgICAgIGNvbnN0IGl0ZW1UYWdOYW1lID0gdGhpcy5fb3duZXIub3B0aW9ucy5pdGVtVGFnTmFtZTtcblxuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl8kYmFzZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCd0aGlzLl8kYmFzZSBpcyBub3QgbnVsbC4nKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl8kYmFzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgwIDwgJHJlY3ljbGUubGVuZ3RoKSB7XG4gICAgICAgICAgICAkYmFzZSA9ICRyZWN5Y2xlO1xuICAgICAgICAgICAgJGJhc2UucmVtb3ZlQXR0cignei1pbmRleCcpO1xuICAgICAgICAgICAgJGJhc2UucmVtb3ZlQ2xhc3ModGhpcy5fY29uZmlnLlJFQ1lDTEVfQ0xBU1MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVE9ETzogIOimgeS7tuetiS4gPGxpPiDlhajoiKzjga8gPHNsb3Q+IOOBqOWQjOW8t+iqv+OBmeOCi+OBiz9cbiAgICAgICAgICAgICRiYXNlID0gJChgPCR7aXRlbVRhZ05hbWV9IGNsYXNzPVwiJHt0aGlzLl9jb25maWcuTElTVElURU1fQkFTRV9DTEFTU31cIj48L1wiJHtpdGVtVGFnTmFtZX1cIj5gKTtcbiAgICAgICAgICAgICRiYXNlLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci4kc2Nyb2xsTWFwLmFwcGVuZCgkYmFzZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDpq5jjgZXjga7mm7TmlrBcbiAgICAgICAgaWYgKCRiYXNlLmhlaWdodCgpICE9PSB0aGlzLl9oZWlnaHQpIHtcbiAgICAgICAgICAgICRiYXNlLmhlaWdodCh0aGlzLl9oZWlnaHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW5kZXgg44Gu6Kit5a6aXG4gICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICAgICAgLy8gb2Zmc2V0IOOBruabtOaWsFxuICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuXG4gICAgICAgIHJldHVybiAkYmFzZTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfQ09OVEFJTkVSX0lOREVYKSAhPT0gU3RyaW5nKHRoaXMuX2luZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9DT05UQUlORVJfSU5ERVgsIHRoaXMuX2luZGV4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVBhZ2VJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9wYWdlSW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgsIHRoaXMuX3BhZ2VJbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVPZmZzZXQoKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9vd25lci5vcHRpb25zLmVuYWJsZVRyYW5zZm9ybU9mZnNldCkge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2xhdGVZIH0gPSBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXModGhpcy5fJGJhc2VbMF0pO1xuICAgICAgICAgICAgaWYgKHRyYW5zbGF0ZVkgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndHJhbnNmb3JtJywgYHRyYW5zbGF0ZTNkKDAsJHt0aGlzLl9vZmZzZXR9cHgsMGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdG9wID0gcGFyc2VJbnQodGhpcy5fJGJhc2UuY3NzKCd0b3AnKSwgMTApO1xuICAgICAgICAgICAgaWYgKHRvcCAhPT0gdGhpcy5fb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd0b3AnLCBgJHt0aGlzLl9vZmZzZXR9cHhgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IGF0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG4vKipcbiAqIEBlbiBBIGNsYXNzIHRoYXQgc3RvcmVzIFVJIHN0cnVjdHVyZSBpbmZvcm1hdGlvbiBmb3Igb25lIHBhZ2Ugb2YgdGhlIGxpc3QuXG4gKiBAamEg44Oq44K544OIMeODmuODvOOCuOWIhuOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFBhZ2VQcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIG9mZnNldCBmcm9tIHRvcCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlJ3MgaGVpZ2h0ICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGl0ZW0ncyBwcm9maWxlIG1hbmFnZWQgd2l0aCBpbiBwYWdlICovXG4gICAgcHJpdmF0ZSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiogQGludGVybmFsIHBhZ2Ugc3RhdHVzICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAnYWN0aXZlJyB8ICdpbmFjdGl2ZScgfCAnaGlkZGVuJyA9ICdpbmFjdGl2ZSc7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBwYWdlIGluZGV4ICovXG4gICAgc2V0IGluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIG9mZnNldCAqL1xuICAgIGdldCBvZmZzZXQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBwYWdlIG9mZnNldCAqL1xuICAgIHNldCBvZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2UgaGVpZ2h0ICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2Ugc3RhdHVzICovXG4gICAgZ2V0IHN0YXR1cygpOiAnYWN0aXZlJyB8ICdpbmFjdGl2ZScgfCAnaGlkZGVuJyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWN0aXZhdGUgb2YgdGhlIHBhZ2UuXG4gICAgICogQGphIHBhZ2Ug44Gu5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2FjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdhY3RpdmUnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNYWtlIHRoZSBwYWdlIGludmlzaWJsZS5cbiAgICAgKiBAamEgcGFnZSDjga7kuI3lj6/oppbljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGlkZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdoaWRkZW4nICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdoaWRkZW4nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2luYWN0aXZlJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaW5hY3RpdmUnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQge0BsaW5rIEl0ZW1Qcm9maWxlfSB0byB0aGUgcGFnZS5cbiAgICAgKiBAamEge0BsaW5rIEl0ZW1Qcm9maWxlfSDjga7ov73liqBcbiAgICAgKi9cbiAgICBwdWJsaWMgcHVzaChpdGVtOiBJdGVtUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB0aGlzLl9oZWlnaHQgKz0gaXRlbS5oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIElmIGFsbCB7QGxpbmsgSXRlbVByb2ZpbGV9IHVuZGVyIHRoZSBwYWdlIGFyZSBub3QgdmFsaWQsIGRpc2FibGUgdGhlIHBhZ2UncyBzdGF0dXMuXG4gICAgICogQGphIOmFjeS4i+OBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOBmeOBueOBpuOBjOacieWKueOBp+OBquOBhOWgtOWQiCwgcGFnZSDjgrnjg4bjg7zjgr/jgrnjgpLnhKHlirnjgavjgZnjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgbm9ybWFsaXplKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbmFibGVBbGwgPSB0aGlzLl9pdGVtcy5ldmVyeShpdGVtID0+IGl0ZW0uaXNBY3RpdmUoKSk7XG4gICAgICAgIGlmICghZW5hYmxlQWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaW5hY3RpdmUnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgSXRlbVByb2ZpbGV9IGJ5IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgaYge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbShpbmRleDogbnVtYmVyKTogSXRlbVByb2ZpbGUge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5faXRlbXMsIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGZpcnN0IHtAbGluayBJdGVtUHJvZmlsZX0uXG4gICAgICogQGphIOacgOWIneOBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtRmlyc3QoKTogSXRlbVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlbXNbMF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBsYXN0IHtAbGluayBJdGVtUHJvZmlsZX0uXG4gICAgICogQGphIOacgOW+jOOBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtTGFzdCgpOiBJdGVtUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pdGVtc1t0aGlzLl9pdGVtcy5sZW5ndGggLSAxXTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvSGVscFN0cmluZyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zIH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9iYXNlJztcbmltcG9ydCB0eXBlIHsgSUxpc3RJdGVtVmlldyB9IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9leHBhbmRhYmxlLWNvbnRleHQnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG5jb25zdCBlbnVtIExheW91dEtleSB7XG4gICAgREVGQVVMVCA9ICdsYXlvdXQtZGVmYXVsdCcsXG59XG5cbi8qKlxuICogQGVuIFVJIHN0cnVjdHVyZSBpbmZvcm1hdGlvbiBzdG9yYWdlIGNsYXNzIGZvciBncm91cCBtYW5hZ2VtZW50IG9mIGxpc3QgaXRlbXMuIDxicj5cbiAqICAgICBUaGlzIGNsYXNzIGRvZXMgbm90IGRpcmVjdGx5IG1hbmlwdWxhdGUgdGhlIERPTS5cbiAqIEBqYSDjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgpLjgrDjg6vjg7zjg5fnrqHnkIbjgZnjgosgVUkg5qeL6YCg5oOF5aCx5qC857SN44Kv44Op44K5IDxicj5cbiAqICAgICDmnKzjgq/jg6njgrnjga/nm7TmjqXjga8gRE9NIOOCkuaTjeS9nOOBl+OBquOBhFxuICovXG5leHBvcnQgY2xhc3MgR3JvdXBQcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsIHByb2ZpbGUgaWQgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pZDogc3RyaW5nO1xuICAgIC8qKiBAaW50ZXJuYWwge0BsaW5rIEV4cGFuZGFibGVMaXN0Vmlld30gaW5zdGFuY2UqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX293bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0O1xuICAgIC8qKiBAaW50ZXJuYWwgcGFyZW50IHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfcGFyZW50PzogR3JvdXBQcm9maWxlO1xuICAgIC8qKiBAaW50ZXJuYWwgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0gYXJyYXkgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9jaGlsZHJlbjogR3JvdXBQcm9maWxlW10gPSBbXTtcbiAgICAvKiogQGludGVybmFsIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cyAqL1xuICAgIHByaXZhdGUgX2V4cGFuZGVkID0gZmFsc2U7XG4gICAgLyoqIEBpbnRlcm5hbCByZWdpc3RyYXRpb24gc3RhdHVzIGZvciBfb3duZXIgKi9cbiAgICBwcml2YXRlIF9zdGF0dXM6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnID0gJ3VucmVnaXN0ZXJlZCc7XG4gICAgLyoqIEBpbnRlcm5hbCBzdG9yZWQge0BsaW5rIEl0ZW1Qcm9maWxlfSBpbmZvcm1hdGlvbiAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX21hcEl0ZW1zOiBSZWNvcmQ8c3RyaW5nLCBJdGVtUHJvZmlsZVtdPiA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUV4cGFuZGFibGVMaXN0Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBpZCBvZiB0aGUgaW5zdGFuY2UuIHNwZWNpZmllZCBieSB0aGUgZnJhbWV3b3JrLlxuICAgICAqICAtIGBqYWAg44Kk44Oz44K544K/44Oz44K544GuIElELiDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jgYzmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCwgaWQ6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9pZCAgICA9IGlkO1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgICAgICB0aGlzLl9tYXBJdGVtc1tMYXlvdXRLZXkuREVGQVVMVF0gPSBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IElELlxuICAgICAqIEBqYSBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBlbiBHZXQgc3RhdHVzLiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqIEBqYSDjgrnjg4bjg7zjgr/jgrnjgpLlj5blvpcgJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCdcbiAgICAgKi9cbiAgICBnZXQgc3RhdHVzKCk6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzLlxuICAgICAqIEBqYSDlsZXplovnirbmhYvjgpLliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleHBhbmRlZCwgY29sbGFwc2VkOiBjbG9zZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5bGV6ZaLLCBmYWxzZTog5Y+O5p2fXG4gICAgICovXG4gICAgZ2V0IGlzRXhwYW5kZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHBhbmRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg6KaqIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBwYXJlbnQoKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNoaWxkcmVuIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNoaWxkcmVuKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkcmVuO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbmV4dCBhdmFpbGFibGUgaW5kZXggb2YgdGhlIGxhc3QgaXRlbSBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDlvozjga4gaXRlbSDopoHntKDjga7mrKHjgavkvb/nlKjjgafjgY3jgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gd2l0aEFjdGl2ZUNoaWxkcmVuIFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHNlYXJjaCBpbmNsdWRpbmcgcmVnaXN0ZXJlZCBjaGlsZCBlbGVtZW50c1xuICAgICAqICAtIGBqYWAg55m76Yyy5riI44G/44Gu5a2Q6KaB57Sg44KS5ZCr44KB44Gm5qSc57Si44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGdldE5leHRJdGVtSW5kZXgod2l0aEFjdGl2ZUNoaWxkcmVuID0gZmFsc2UpOiBudW1iZXIge1xuICAgICAgICBsZXQgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgaWYgKHdpdGhBY3RpdmVDaGlsZHJlbikge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCA9PSBpdGVtcyB8fCBpdGVtcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLl9pdGVtcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGl0ZW1zW2l0ZW1zLmxlbmd0aCAtIDFdPy5pbmRleCA/PyAwKSArIDE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSDmnKwgR3JvdXBQcm9maWxlIOOBjOeuoeeQhuOBmeOCiyBpdGVtIOOCkuS9nOaIkOOBl+OBpueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKiBAcGFyYW0gbGF5b3V0S2V5XG4gICAgICogIC0gYGVuYCBpZGVudGlmaWVyIGZvciBlYWNoIGxheW91dFxuICAgICAqICAtIGBqYWAg44Os44Kk44Ki44Km44OI5q+O44Gu6K2Y5Yil5a2QXG4gICAgICovXG4gICAgcHVibGljIGFkZEl0ZW0oXG4gICAgICAgIGhlaWdodDogbnVtYmVyLFxuICAgICAgICBpbml0aWFsaXplcjogbmV3IChvcHRpb25zPzogVW5rbm93bk9iamVjdCkgPT4gSUxpc3RJdGVtVmlldyxcbiAgICAgICAgaW5mbzogVW5rbm93bk9iamVjdCxcbiAgICAgICAgbGF5b3V0S2V5Pzogc3RyaW5nLFxuICAgICk6IEdyb3VwUHJvZmlsZSB7XG4gICAgICAgIGxheW91dEtleSA9IGxheW91dEtleSA/PyBMYXlvdXRLZXkuREVGQVVMVDtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBncm91cFByb2ZpbGU6IHRoaXMgfSwgaW5mbyk7XG5cbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5fbWFwSXRlbXNbbGF5b3V0S2V5XSkge1xuICAgICAgICAgICAgdGhpcy5fbWFwSXRlbXNbbGF5b3V0S2V5XSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtUHJvZmlsZSh0aGlzLl9vd25lci5jb250ZXh0LCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBfb3duZXIg44Gu566h55CG5LiL44Gr44GC44KL44Go44GN44Gv6YCf44KE44GL44Gr6L+95YqgXG4gICAgICAgIGlmICgoJ3JlZ2lzdGVyZWQnID09PSB0aGlzLl9zdGF0dXMpICYmIChudWxsID09IHRoaXMuX293bmVyLmxheW91dEtleSB8fCBsYXlvdXRLZXkgPT09IHRoaXMuX293bmVyLmxheW91dEtleSkpIHtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW0sIHRoaXMuZ2V0TmV4dEl0ZW1JbmRleCgpKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21hcEl0ZW1zW2xheW91dEtleV0ucHVzaChpdGVtKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBHcm91cFByb2ZpbGV9IGFzIGNoaWxkIGVsZW1lbnQuXG4gICAgICogQGphIOWtkOimgee0oOOBqOOBl+OBpiB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgLyBpbnN0YW5jZSBhcnJheVxuICAgICAqL1xuICAgIHB1YmxpYyBhZGRDaGlsZHJlbih0YXJnZXQ6IEdyb3VwUHJvZmlsZSB8IEdyb3VwUHJvZmlsZVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNoaWxkcmVuOiBHcm91cFByb2ZpbGVbXSA9IEFycmF5LmlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFt0YXJnZXRdO1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgICAgICBjaGlsZC5zZXRQYXJlbnQodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2hpbGRyZW4ucHVzaCguLi5jaGlsZHJlbik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgaXQgaGFzIGEgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0uIDxicj5cbiAgICAgKiAgICAgSWYgYGxheW91dEtleWAgaXMgc3BlY2lmaWVkLCB3aGV0aGVyIHRoZSBsYXlvdXQgaW5mb3JtYXRpb24gbWF0Y2hlcyBpcyBhbHNvIGFkZGVkIHRvIHRoZSBqdWRnbWVudCBjb25kaXRpb24uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrpogPGJyPlxuICAgICAqICAgICBgbGF5b3V0S2V5YCDjgYzmjIflrprjgZXjgozjgozjgbDjgIFsYXlvdXQg5oOF5aCx44GM5LiA6Ie044GX44Gm44GE44KL44GL44KC5Yik5a6a5p2h5Lu244Gr5Yqg44GI44KLXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGF5b3V0S2V5XG4gICAgICogIC0gYGVuYCBpZGVudGlmaWVyIGZvciBlYWNoIGxheW91dFxuICAgICAqICAtIGBqYWAg44Os44Kk44Ki44Km44OI5q+O44Gu6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzQ2hpbGRyZW4obGF5b3V0S2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICh0aGlzLl9jaGlsZHJlbi5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGF5b3V0S2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW4uc29tZShjaGlsZCA9PiBjaGlsZC5oYXNMYXlvdXRLZXlPZihsYXlvdXRLZXkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSBpZiB0aGUgc3BlY2lmaWVkIGBsYXlvdXRLZXlgIGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBsYXlvdXRLZXlgIOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGxheW91dEtleVxuICAgICAqICAtIGBlbmAgaWRlbnRpZmllciBmb3IgZWFjaCBsYXlvdXRcbiAgICAgKiAgLSBgamFgIOODrOOCpOOCouOCpuODiOavjuOBruitmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgcHVibGljIGhhc0xheW91dEtleU9mKGxheW91dEtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSB0aGlzLl9tYXBJdGVtc1tsYXlvdXRLZXldKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgZXhwYW5zaW9uLlxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5flsZXplotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZXhwYW5kKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdyZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdleHBhbmRpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtcywgdGhpcy5nZXROZXh0SXRlbUluZGV4KCkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyDlrZDopoHntKDjgYzjgarjgY/jgabjgoLlsZXplovnirbmhYvjgavjgZnjgotcbiAgICAgICAgdGhpcy5fZXhwYW5kZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cCBjb2xsYXBzZS5cbiAgICAgKiBAamEg44Kw44Or44O844OX5Y+O5p2fXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgc3BlbnQgcmVtb3ZpbmcgZWxlbWVudHMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqICAtIGBqYWAg6KaB57Sg5YmK6Zmk44Gr6LK744KE44GZ6YGF5bu25pmC6ZaTLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgY29sbGFwc2UoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCd1bnJlZ2lzdGVyZWQnKTtcbiAgICAgICAgICAgIGlmICgwIDwgaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsYXkgPSBkZWxheSA/PyB0aGlzLl9vd25lci5jb250ZXh0Lm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb247XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fb3duZXIuc3RhdHVzU2NvcGUoJ2NvbGxhcHNpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci5yZW1vdmVJdGVtKGl0ZW1zWzBdLmluZGV4LCBpdGVtcy5sZW5ndGgsIGRlbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5Y+O5p2f54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3cgc2VsZiBpbiB2aXNpYmxlIGFyZWEgb2YgbGlzdC5cbiAgICAgKiBAamEg6Ieq6Lqr44KS44Oq44K544OI44Gu5Y+v6KaW6aCY5Z+f44Gr6KGo56S6XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb3B0aW9uJ3Mgb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBlbnN1cmVWaXNpYmxlKG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLmVuc3VyZVZpc2libGUodGhpcy5faXRlbXNbMF0uaW5kZXgsIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0aW9ucz8uY2FsbGJhY2s/LigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRvZ2dsZSBleHBhbmQgLyBjb2xsYXBzZS5cbiAgICAgKiBAamEg6ZaL6ZaJ44Gu44OI44Kw44OrXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgc3BlbnQgcmVtb3ZpbmcgZWxlbWVudHMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqICAtIGBqYWAg6KaB57Sg5YmK6Zmk44Gr6LK744KE44GZ6YGF5bu25pmC6ZaTLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgdG9nZ2xlKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLl9leHBhbmRlZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb2xsYXBzZShkZWxheSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmV4cGFuZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIHRvIGxpc3Qgdmlldy4gT25seSAxc3QgbGF5ZXIgZ3JvdXAgY2FuIGJlIHJlZ2lzdGVyZWQuXG4gICAgICogQGphIOODquOCueODiOODk+ODpeODvOOBuOeZu+mMsi4g56ysMemajuWxpOOCsOODq+ODvOODl+OBruOBv+eZu+mMsuWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSBpbnNlcnRpb24gcG9zaXRpb24gd2l0aCBpbmRleFxuICAgICAqICAtIGBqYWAg5oy/5YWl5L2N572u44KSIGluZGV4IOOBp+aMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZWdpc3RlcihpbnNlcnRUbzogbnVtYmVyKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9ICdHcm91cFByb2ZpbGUjcmVnaXN0ZXInIG1ldGhvZCBpcyBhY2NlcHRhYmxlIG9ubHkgMXN0IGxheWVyIGdyb3VwLmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0odGhpcy5wcmVwcm9jZXNzKCdyZWdpc3RlcmVkJyksIGluc2VydFRvKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc3RvcmUgdG8gbGlzdCB2aWV3LiBPbmx5IDFzdCBsYXllciBncm91cCBjYW4gYmUgc3BlY2lmaWVkLlxuICAgICAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjgbjlvqnlhYMuIOesrDHpmo7lsaTjgrDjg6vjg7zjg5fjga7jgb/mjIfnpLrlj6/og70uXG4gICAgICovXG4gICAgcHVibGljIHJlc3RvcmUoKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9ICdHcm91cFByb2ZpbGUjcmVzdG9yZScgbWV0aG9kIGlzIGFjY2VwdGFibGUgb25seSAxc3QgbGF5ZXIgZ3JvdXAuYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLl9leHBhbmRlZCA/IHRoaXMuX2l0ZW1zLmNvbmNhdCh0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdhY3RpdmUnKSkgOiB0aGlzLl9pdGVtcy5zbGljZSgpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCDoh6rouqvjga7nrqHnkIbjgZnjgovjgqLjgq/jg4bjgqPjg5bjgaogTGluZVByb2ZpZSDjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldCBfaXRlbXMoKTogSXRlbVByb2ZpbGVbXSB7XG4gICAgICAgIGNvbnN0IGtleSA9IHRoaXMuX293bmVyLmxheW91dEtleTtcbiAgICAgICAgaWYgKG51bGwgIT0ga2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbWFwSXRlbXNba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tYXBJdGVtc1tMYXlvdXRLZXkuREVGQVVMVF07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIOimqiBHcm91cCDmjIflrpogKi9cbiAgICBwcml2YXRlIHNldFBhcmVudChwYXJlbnQ6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAgcmVnaXN0ZXIgLyB1bnJlZ2lzdGVyIOOBruWJjeWHpueQhiAqL1xuICAgIHByaXZhdGUgcHJlcHJvY2VzcyhuZXdTdGF0dXM6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnKTogSXRlbVByb2ZpbGVbXSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGlmIChuZXdTdGF0dXMgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgaXRlbXMucHVzaCguLi50aGlzLl9pdGVtcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gbmV3U3RhdHVzO1xuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCDmk43kvZzlr77osaHjga4gSXRlbVByb2ZpbGUg6YWN5YiX44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBxdWVyeU9wZXJhdGlvblRhcmdldChvcGVyYXRpb246ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnIHwgJ2FjdGl2ZScpOiBJdGVtUHJvZmlsZVtdIHtcbiAgICAgICAgY29uc3QgZmluZFRhcmdldHMgPSAoZ3JvdXA6IEdyb3VwUHJvZmlsZSk6IEl0ZW1Qcm9maWxlW10gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZ3JvdXAuX2NoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVnaXN0ZXJlZCc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VucmVnaXN0ZXJlZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkLnByZXByb2Nlc3Mob3BlcmF0aW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWN0aXZlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNoaWxkLl9pdGVtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGQuX2l0ZW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIG9wZXJhdGlvbjogJHtvcGVyYXRpb259YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5maW5kVGFyZ2V0cyhjaGlsZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZpbmRUYXJnZXRzKHRoaXMpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgVmlldyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdFZpZXcsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxuICAgIElMaXN0SXRlbVZpZXcsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IG93bmVyOiBJTGlzdFZpZXc7XG4gICAgcmVhZG9ubHkgaXRlbTogSXRlbVByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIExpc3RJdGVtVmlld30gY29uc3RydWN0aW9uLlxuICogQGphIHtAbGluayBMaXN0SXRlbVZpZXd9IOani+evieOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBvd25lcjogSUxpc3RWaWV3O1xuICAgICRlbD86IERPTTxURWxlbWVudD47XG4gICAgaXRlbTogSXRlbVByb2ZpbGU7XG59XG5cbi8qKlxuICogQGVuIExpc3QgaXRlbSBjb250YWluZXIgY2xhc3MgaGFuZGxlZCBieSB7QGxpbmsgTGlzdFZpZXd9LlxuICogQGphIHtAbGluayBMaXN0Vmlld30g44GM5omx44GG44Oq44K544OI44Ki44Kk44OG44Og44Kz44Oz44OG44OK44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMaXN0SXRlbVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJTGlzdEl0ZW1WaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHsgb3duZXIsICRlbCwgaXRlbSB9ID0gb3B0aW9ucztcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBvd25lcixcbiAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG5cbiAgICAgICAgaWYgKCRlbCkge1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KCRlbCBhcyBET01TZWxlY3RvcjxURWxlbWVudD4pO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKiogT3duZXIg5Y+W5b6XICovXG4gICAgZ2V0IG93bmVyKCk6IElMaXN0VmlldyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5vd25lcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBWaWV3IGNvbXBvbmVudCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuJGVsLmNoaWxkcmVuKCkucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xuICAgICAgICAvLyB0aGlzLiRlbCDjga/lho3liKnnlKjjgZnjgovjgZ/jgoHlrozlhajjgarnoLTmo4Tjga/jgZfjgarjgYRcbiAgICAgICAgdGhpcy5zZXRFbGVtZW50KCdudWxsJyk7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEl0ZW1WaWV3XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IG93biBpdGVtIGluZGV4LlxuICAgICAqIEBqYSDoh6rouqvjga4gaXRlbSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXRJbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uaXRlbS5pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNwZWNpZmllZCBoZWlnaHQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+mrmOOBleOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldEhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uaXRlbS5oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGlmIGNoaWxkIG5vZGUgZXhpc3RzLlxuICAgICAqIEBqYSBjaGlsZCBub2RlIOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGhhc0NoaWxkTm9kZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy4kZWw/LmNoaWxkcmVuKCkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaXRlbSdzIGhlaWdodC5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXjgpLmm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdIZWlnaHRcbiAgICAgKiAgLSBgZW5gIG5ldyBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaWsOOBl+OBhOmrmOOBlVxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB1cGRhdGUgb3B0aW9ucyBvYmplY3RcbiAgICAgKiAgLSBgamFgIOabtOaWsOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHVwZGF0ZUhlaWdodChuZXdIZWlnaHQ6IG51bWJlciwgb3B0aW9ucz86IExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy4kZWwgJiYgdGhpcy5nZXRIZWlnaHQoKSAhPT0gbmV3SGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLnVwZGF0ZUhlaWdodChuZXdIZWlnaHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy4kZWwuaGVpZ2h0KG5ld0hlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIE51bGxhYmxlLFxuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIHR5cGUgQ29ubmVjdEV2ZW50TWFwLFxuICAgIHR5cGUgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdFNjcm9sbGVyRmFjdG9yeSxcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgU2Nyb2xsZXJFdmVudE1hcCA9IEhUTUxFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXAgJiB7ICdzY3JvbGxzdG9wJzogRXZlbnQ7IH07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIE1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OID0gNTAsXG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBIVE1MRWxlbWVudC5cbiAqIEBqYSBIVE1MRWxlbWVudCDjgpLlr77osaHjgajjgZfjgZ8ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IOWun+ijheOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRWxlbWVudFNjcm9sbGVyIGltcGxlbWVudHMgSUxpc3RTY3JvbGxlciB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJHRhcmdldDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRzY3JvbGxNYXA6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnM7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsU3RvcFRyaWdnZXI6IERPTUV2ZW50TGlzdGVuZXI7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsRHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50OiBET01TZWxlY3Rvciwgb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQgPSAkKGVsZW1lbnQpO1xuICAgICAgICB0aGlzLl8kc2Nyb2xsTWFwID0gdGhpcy5fJHRhcmdldC5jaGlsZHJlbigpLmZpcnN0KCk7XG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgICAgIC8qXG4gICAgICAgICAqIGZpcmUgY3VzdG9tIGV2ZW50OiBgc2Nyb2xsc3RvcGBcbiAgICAgICAgICogYHNjcm9sbGVuZGAg44GuIFNhZmFyaSDlr77lv5zlvoXjgaFcbiAgICAgICAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9XZWIvQVBJL0VsZW1lbnQvc2Nyb2xsZW5kX2V2ZW50XG4gICAgICAgICAqL1xuICAgICAgICBsZXQgdGltZXI6IFRpbWVySGFuZGxlO1xuICAgICAgICB0aGlzLl9zY3JvbGxTdG9wVHJpZ2dlciA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHRpbWVyKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJHRhcmdldC50cmlnZ2VyKG5ldyBDdXN0b21FdmVudCgnc2Nyb2xsc3RvcCcsIHsgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSB9KSk7XG4gICAgICAgICAgICB9LCB0aGlzLl9zY3JvbGxEdXJhdGlvbiA/PyBDb25zdC5NSU5fU0NST0xMU1RPUF9EVVJBVElPTik7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub24oJ3Njcm9sbCcsIHRoaXMuX3Njcm9sbFN0b3BUcmlnZ2VyKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKiDjgr/jgqTjg5flrprnvqnorZjliKXlrZAgKi9cbiAgICBzdGF0aWMgZ2V0IFRZUEUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdjZHA6ZWxlbWVudC1vdmVyZmxvdy1zY3JvbGxlcic7XG4gICAgfVxuXG4gICAgLyoqIGZhY3Rvcnkg5Y+W5b6XICovXG4gICAgc3RhdGljIGdldEZhY3RvcnkoKTogTGlzdFNjcm9sbGVyRmFjdG9yeSB7XG4gICAgICAgIGNvbnN0IGZhY3RvcnkgPSAoZWxlbWVudDogRE9NU2VsZWN0b3IsIG9wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucyk6IElMaXN0U2Nyb2xsZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBFbGVtZW50U2Nyb2xsZXIoZWxlbWVudCwgb3B0aW9ucyk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIHNldCB0eXBlIHNpZ25hdHVyZS5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoZmFjdG9yeSwge1xuICAgICAgICAgICAgdHlwZToge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IEVsZW1lbnRTY3JvbGxlci5UWVBFLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWN0b3J5IGFzIExpc3RTY3JvbGxlckZhY3Rvcnk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxlclxuXG4gICAgLyoqIFNjcm9sbGVyIOOBruWei+aDheWgseOCkuWPluW+lyAqL1xuICAgIGdldCB0eXBlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBFbGVtZW50U2Nyb2xsZXIuVFlQRTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u5Y+W5b6XICovXG4gICAgZ2V0IHBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AoKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5pyA5aSn5YCk5L2N572u44KS5Y+W5b6XICovXG4gICAgZ2V0IHBvc01heCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5fJHNjcm9sbE1hcC5oZWlnaHQoKSAtIHRoaXMuXyR0YXJnZXQuaGVpZ2h0KCksIDApO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jnmbvpjLIgKi9cbiAgICBvbih0eXBlOiAnc2Nyb2xsJyB8ICdzY3JvbGxzdG9wJywgY2FsbGJhY2s6IERPTUV2ZW50TGlzdGVuZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vbjxTY3JvbGxlckV2ZW50TWFwPih0eXBlLCBjYWxsYmFjayBhcyBVbmtub3duRnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jnmbvpjLLop6PpmaQgKi9cbiAgICBvZmYodHlwZTogJ3Njcm9sbCcgfCAnc2Nyb2xsc3RvcCcsIGNhbGxiYWNrOiBET01FdmVudExpc3RlbmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub2ZmPFNjcm9sbGVyRXZlbnRNYXA+KHR5cGUsIGNhbGxiYWNrIGFzIFVua25vd25GdW5jdGlvbik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiAqL1xuICAgIHNjcm9sbFRvKHBvczogbnVtYmVyLCBhbmltYXRlPzogYm9vbGVhbiwgdGltZT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxEdXJhdGlvbiA9ICh0aGlzLl9vcHRpb25zLmVuYWJsZUFuaW1hdGlvbiA/PyBhbmltYXRlKSA/IHRpbWUgPz8gdGhpcy5fb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbiA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKHBvcywgdGhpcy5fc2Nyb2xsRHVyYXRpb24sIHVuZGVmaW5lZCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu54q25oWL5pu05pawICovXG4gICAgdXBkYXRlKCk6IHZvaWQge1xuICAgICAgICAvLyBub29wXG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOOBruegtOajhCAqL1xuICAgIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQ/Lm9mZigpO1xuICAgICAgICAodGhpcy5fJHRhcmdldCBhcyBOdWxsYWJsZTxET00+KSA9ICh0aGlzLl8kc2Nyb2xsTWFwIGFzIE51bGxhYmxlPERPTT4pID0gbnVsbDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgcG9zdCxcbiAgICBub29wLFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VSZXN1bHQsXG4gICAgdG9IZWxwU3RyaW5nLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHtcbiAgICBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMsXG4gICAgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbixcbiAgICBjbGVhclRyYW5zaXRpb24sXG59IGZyb20gJ0BjZHAvdWktdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zLFxuICAgIElMaXN0U2Nyb2xsZXIsXG4gICAgSUxpc3RPcGVyYXRpb24sXG4gICAgSUxpc3RTY3JvbGxhYmxlLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSxcbiAgICBJTGlzdEl0ZW1WaWV3LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IExpc3RWaWV3R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vZ2xvYmFsLWNvbmZpZyc7XG5pbXBvcnQgeyBJdGVtUHJvZmlsZSwgUGFnZVByb2ZpbGUgfSBmcm9tICcuLi9wcm9maWxlJztcbmltcG9ydCB7IEVsZW1lbnRTY3JvbGxlciB9IGZyb20gJy4vZWxlbWVudC1zY3JvbGxlcic7XG5cbi8qKiBMaXN0Q29udGV4dE9wdGlvbnMg5pei5a6a5YCkICovXG5jb25zdCBfZGVmYXVsdE9wdHM6IFJlcXVpcmVkPExpc3RDb250ZXh0T3B0aW9ucz4gPSB7XG4gICAgc2Nyb2xsZXJGYWN0b3J5OiBFbGVtZW50U2Nyb2xsZXIuZ2V0RmFjdG9yeSgpLFxuICAgIGVuYWJsZUhpZGRlblBhZ2U6IGZhbHNlLFxuICAgIGVuYWJsZVRyYW5zZm9ybU9mZnNldDogZmFsc2UsXG4gICAgc2Nyb2xsTWFwUmVmcmVzaEludGVydmFsOiAyMDAsXG4gICAgc2Nyb2xsUmVmcmVzaERpc3RhbmNlOiAyMDAsXG4gICAgcGFnZVByZXBhcmVDb3VudDogMyxcbiAgICBwYWdlUHJlbG9hZENvdW50OiAxLFxuICAgIGVuYWJsZUFuaW1hdGlvbjogdHJ1ZSxcbiAgICBhbmltYXRpb25EdXJhdGlvbjogMCxcbiAgICBiYXNlRGVwdGg6ICdhdXRvJyxcbiAgICBpdGVtVGFnTmFtZTogJ2xpJywgIC8vIFRPRE86IOimi+alteOCgVxuICAgIHJlbW92ZUl0ZW1XaXRoVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICB1c2VEdW1teUluYWN0aXZlU2Nyb2xsTWFwOiBmYWxzZSxcbn07XG5cbi8qKiBpbnZhbGlkIGluc3RhbmNlICovXG5jb25zdCBfJGludmFsaWQgPSAkKCkgYXMgRE9NO1xuXG4vKiog5Yid5pyf5YyW5riI44G/44GL5qSc6Ki8ICovXG5mdW5jdGlvbiB2ZXJpZnk8VD4oeDogVCB8IHVuZGVmaW5lZCk6IGFzc2VydHMgeCBpcyBUIHtcbiAgICBpZiAobnVsbCA9PSB4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9JTklUSUFMSVpBVElPTik7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIOOCouOCpOODhuODoOWJiumZpOaDheWgsSAqL1xuaW50ZXJmYWNlIFJlbW92ZUl0ZW1zQ29udGV4dCB7XG4gICAgcmVtb3ZlZDogSXRlbVByb2ZpbGVbXTtcbiAgICBkZWx0YTogbnVtYmVyO1xuICAgIHRyYW5zaXRpb246IGJvb2xlYW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIENvcmUgbG9naWMgaW1wbGVtZW50YXRpb24gY2xhc3MgZm9yIHNjcm9sbCBwcm9jZXNzaW5nIHRoYXQgbWFuYWdlcyBtZW1vcnkuIEFjY2Vzc2VzIHRoZSBET00uXG4gKiBAamEg44Oh44Oi44Oq566h55CG44KS6KGM44GG44K544Kv44Ot44O844Or5Yem55CG44Gu44Kz44Ki44Ot44K444OD44Kv5a6f6KOF44Kv44Op44K5LiBET00g44Gr44Ki44Kv44K744K544GZ44KLLlxuICovXG5leHBvcnQgY2xhc3MgTGlzdENvcmUgaW1wbGVtZW50cyBJTGlzdENvbnRleHQsIElMaXN0T3BlcmF0aW9uLCBJTGlzdFNjcm9sbGFibGUsIElMaXN0QmFja3VwUmVzdG9yZSB7XG4gICAgcHJpdmF0ZSBfJHJvb3Q6IERPTTtcbiAgICBwcml2YXRlIF8kbWFwOiBET007XG4gICAgcHJpdmF0ZSBfbWFwSGVpZ2h0ID0gMDtcbiAgICBwcml2YXRlIF9zY3JvbGxlcjogSUxpc3RTY3JvbGxlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKiBVSSDooajnpLrkuK3jgasgdHJ1ZSAqL1xuICAgIHByaXZhdGUgX2FjdGl2ZSA9IHRydWU7XG5cbiAgICAvKiog5Yid5pyf44Kq44OX44K344On44Oz44KS5qC857SNICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2V0dGluZ3M6IFJlcXVpcmVkPExpc3RDb250ZXh0T3B0aW9ucz47XG4gICAgLyoqIFNjcm9sbCBFdmVudCBIYW5kbGVyICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogU2Nyb2xsIFN0b3AgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbFN0b3BFdmVudEhhbmRsZXI6IChldj86IEV2ZW50KSA9PiB2b2lkO1xuICAgIC8qKiAx44Oa44O844K45YiG44Gu6auY44GV44Gu5Z+65rqW5YCkICovXG4gICAgcHJpdmF0ZSBfYmFzZUhlaWdodCA9IDA7XG4gICAgLyoqIOeuoeeQhuS4i+OBq+OBguOCiyBJdGVtUHJvZmlsZSDphY3liJcgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgUGFnZVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfcGFnZXM6IFBhZ2VQcm9maWxlW10gPSBbXTtcblxuICAgIC8qKiDmnIDmlrDjga7ooajnpLrpoJjln5/mg4XloLHjgpLmoLzntI0gKFNjcm9sbCDkuK3jga7mm7TmlrDlh6bnkIbjgavkvb/nlKgpICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0ID0ge1xuICAgICAgICBpbmRleDogMCxcbiAgICAgICAgZnJvbTogMCxcbiAgICAgICAgdG86IDAsXG4gICAgICAgIHBvczogMCwgICAgLy8gc2Nyb2xsIHBvc2l0aW9uXG4gICAgfTtcblxuICAgIC8qKiDjg4fjg7zjgr/jga4gYmFja3VwIOmgmOWfny4ga2V5IOOBqCBfbGluZXMg44KS5qC857SNICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYmFja3VwOiBSZWNvcmQ8c3RyaW5nLCB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9PiA9IHt9O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RDb250ZXh0T3B0aW9ucykge1xuICAgICAgICB0aGlzLl8kcm9vdCA9IHRoaXMuXyRtYXAgPSBfJGludmFsaWQ7XG4gICAgICAgIHRoaXMuX3NldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgX2RlZmF1bHRPcHRzLCBvcHRpb25zKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uU2Nyb2xsKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbFN0b3AodGhpcy5fc2Nyb2xsZXIhLnBvcyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKiog5YaF6YOo44Kq44OW44K444Kn44Kv44OI44Gu5Yid5pyf5YyWICovXG4gICAgcHVibGljIGluaXRpYWxpemUoJHJvb3Q6IERPTSwgaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgLy8g5pei44Gr5qeL56+J44GV44KM44Gm44GE44Gf5aC05ZCI44Gv56C05qOEXG4gICAgICAgIGlmICh0aGlzLl8kcm9vdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fJHJvb3QgPSAkcm9vdDtcbiAgICAgICAgdGhpcy5fJG1hcCA9ICRyb290Lmhhc0NsYXNzKHRoaXMuX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKSA/ICRyb290IDogJHJvb3QuZmluZCh0aGlzLl9jb25maWcuU0NST0xMX01BUF9TRUxFQ1RPUik7XG4gICAgICAgIC8vIF8kbWFwIOOBjOeEoeOBhOWgtOWQiOOBr+WIneacn+WMluOBl+OBquOBhFxuICAgICAgICBpZiAodGhpcy5fJG1hcC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbJHt0aGlzLl9jb25maWcuU0NST0xMX01BUF9DTEFTU30gbm90IGZvdW5kXWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHRoaXMuY3JlYXRlU2Nyb2xsZXIoKTtcbiAgICAgICAgdGhpcy5zZXRCYXNlSGVpZ2h0KGhlaWdodCk7XG4gICAgICAgIHRoaXMuc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEICovXG4gICAgcHVibGljIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVzZXRTY3JvbGxlckNvbmRpdGlvbigpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uZGVzdHJveSgpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXMuXyRyb290ID0gdGhpcy5fJG1hcCA9IF8kaW52YWxpZDtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Gu5Z+65rqW5YCk44KS5Y+W5b6XICovXG4gICAgcHVibGljIHNldEJhc2VIZWlnaHQoaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKGhlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbYmFzZSBoaWdodDogJHtoZWlnaHR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fYmFzZUhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL6Kit5a6aICovXG4gICAgcHVibGljIGFzeW5jIHNldEFjdGl2ZVN0YXRlKGFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG4gICAgICAgIGF3YWl0IHRoaXMudHJlYXRTY3JvbGxQb3NpdGlvbigpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL5Yik5a6aICovXG4gICAgZ2V0IGFjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgICB9XG5cbiAgICAvKiogc2Nyb2xsZXIg44Gu56iu6aGe44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbGVyVHlwZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2V0dGluZ3Muc2Nyb2xsZXJGYWN0b3J5LnR5cGU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOBruS/neWtmC/lvqnlhYMgKi9cbiAgICBwdWJsaWMgYXN5bmMgdHJlYXRTY3JvbGxQb3NpdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcblxuICAgICAgICBjb25zdCBvZmZzZXQgPSAodGhpcy5fc2Nyb2xsZXIucG9zIC0gdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyk7XG4gICAgICAgIGNvbnN0IHsgdXNlRHVtbXlJbmFjdGl2ZVNjcm9sbE1hcDogdXNlRHVtbXlNYXAgfSA9IHRoaXMuX3NldHRpbmdzO1xuXG4gICAgICAgIGNvbnN0IHVwZGF0ZU9mZnNldCA9ICgkdGFyZ2V0OiBET00pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKCR0YXJnZXRbMF0pO1xuICAgICAgICAgICAgaWYgKG9mZnNldCAhPT0gdHJhbnNsYXRlWSkge1xuICAgICAgICAgICAgICAgICR0YXJnZXQuY3NzKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlM2QoMCwke29mZnNldH1weCwwYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fc2Nyb2xsZXIuc2Nyb2xsVG8odGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcywgZmFsc2UsIDApO1xuICAgICAgICAgICAgdGhpcy5fJG1hcC5jc3MoeyAndHJhbnNmb3JtJzogJycsICdkaXNwbGF5JzogJ2Jsb2NrJyB9KTtcbiAgICAgICAgICAgIGlmICh1c2VEdW1teU1hcCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJlcGFyZUluYWN0aXZlTWFwKCkucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCAkbWFwID0gdXNlRHVtbXlNYXAgPyB0aGlzLnByZXBhcmVJbmFjdGl2ZU1hcCgpIDogdGhpcy5fJG1hcDtcbiAgICAgICAgICAgIHVwZGF0ZU9mZnNldCgkbWFwKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0Q29udGV4dFxuXG4gICAgLyoqIGdldCBzY3JvbGwtbWFwIGVsZW1lbnQgKi9cbiAgICBnZXQgJHNjcm9sbE1hcCgpOiBET00ge1xuICAgICAgICByZXR1cm4gdGhpcy5fJG1hcDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IHNjcm9sbC1tYXAgaGVpZ2h0IFtweF0gKi9cbiAgICBnZXQgc2Nyb2xsTWFwSGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwLmxlbmd0aCA/IHRoaXMuX21hcEhlaWdodCA6IDA7XG4gICAgfVxuXG4gICAgLyoqIGdldCB7QGxpbmsgTGlzdENvbnRleHRPcHRpb25zfSAqL1xuICAgIGdldCBvcHRpb25zKCk6IFJlcXVpcmVkPExpc3RDb250ZXh0T3B0aW9ucz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIHVwZGF0ZSBzY3JvbGwtbWFwIGhlaWdodCAoZGVsdGEgW3B4XSkgKi9cbiAgICB1cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGE6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fJG1hcC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX21hcEhlaWdodCArPSBNYXRoLnRydW5jKGRlbHRhKTtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmUuXG4gICAgICAgICAgICBpZiAodGhpcy5fbWFwSGVpZ2h0IDwgMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21hcEhlaWdodCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl8kbWFwLmhlaWdodCh0aGlzLl9tYXBIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIHVwZGF0ZSBpbnRlcm5hbCBwcm9maWxlICovXG4gICAgdXBkYXRlUHJvZmlsZXMoZnJvbTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBmb3IgKGxldCBpID0gZnJvbSwgbiA9IF9pdGVtcy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICgwIDwgaSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3QgPSBfaXRlbXNbaSAtIDFdO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5pbmRleCA9IGxhc3QuaW5kZXggKyAxO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSBsYXN0Lm9mZnNldCArIGxhc3QuaGVpZ2h0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCByZWN5Y2xhYmxlIGVsZW1lbnQgKi9cbiAgICBmaW5kUmVjeWNsZUVsZW1lbnRzKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwLmZpbmQodGhpcy5fY29uZmlnLlJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1IpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0Vmlld1xuXG4gICAgLyoqIOWIneacn+WMlua4iOOBv+OBi+WIpOWumiAqL1xuICAgIGlzSW5pdGlhbGl6ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX3Njcm9sbGVyO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAqL1xuICAgIGFkZEl0ZW0oaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBuZXcgKG9wdGlvbnM/OiBVbmtub3duT2JqZWN0KSA9PiBJTGlzdEl0ZW1WaWV3LCBpbmZvOiBVbmtub3duT2JqZWN0LCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hZGRJdGVtKG5ldyBJdGVtUHJvZmlsZSh0aGlzLCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAo5YaF6YOo55SoKSAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbSA6IFtpdGVtXTtcbiAgICAgICAgbGV0IGRlbHRhSGVpZ2h0ID0gMDtcbiAgICAgICAgbGV0IGFkZFRhaWwgPSBmYWxzZTtcblxuICAgICAgICBpZiAobnVsbCA9PSBpbnNlcnRUbyB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbnNlcnRUbykge1xuICAgICAgICAgICAgaW5zZXJ0VG8gPSB0aGlzLl9pdGVtcy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zZXJ0VG8gPT09IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRkVGFpbCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgbWFwIOOBruabtOaWsFxuICAgICAgICBmb3IgKGNvbnN0IGl0IG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBkZWx0YUhlaWdodCArPSBpdC5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGFIZWlnaHQpO1xuXG4gICAgICAgIC8vIOaMv+WFpVxuICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaW5zZXJ0VG8sIDAsIC4uLml0ZW1zKTtcblxuICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICBpZiAoIWFkZFRhaWwpIHtcbiAgICAgICAgICAgIGlmICgwID09PSBpbnNlcnRUbykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbnNlcnRUbyAtIDFdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaQgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIsIHNpemU/OiBudW1iZXIsIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4LCBhcmcyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXgsIGFyZzIsIGFyZzMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6ICovXG4gICAgcHJpdmF0ZSBfcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5OiBudW1iZXIpOiBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgICAgICBjb25zdCByZW1vdmVkOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGxldCBkZWx0YSA9IDA7XG4gICAgICAgIGxldCB0cmFuc2l0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuX2l0ZW1zW2lkeF07XG4gICAgICAgICAgICBkZWx0YSArPSBpdGVtLmhlaWdodDtcbiAgICAgICAgICAgIC8vIOWJiumZpOimgee0oOOBriB6LWluZGV4IOOBruWIneacn+WMllxuICAgICAgICAgICAgaXRlbS5yZXNldERlcHRoKCk7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8g6Ieq5YuV6Kit5a6a44O75YmK6Zmk6YGF5bu25pmC6ZaT44GM6Kit5a6a44GV44KM44GL44Gk44CB44K544Kv44Ot44O844Or44Od44K444K344On44Oz44Gr5aSJ5pu044GM44GC44KL5aC05ZCI44GvIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0aGlzLl9zZXR0aW5ncy5yZW1vdmVJdGVtV2l0aFRyYW5zaXRpb24gJiYgKDAgPCBkZWxheSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLnNjcm9sbFBvcztcbiAgICAgICAgICAgIGNvbnN0IHBvc01heCA9IHRoaXMuc2Nyb2xsUG9zTWF4IC0gZGVsdGE7XG4gICAgICAgICAgICB0cmFuc2l0aW9uID0gKHBvc01heCA8IGN1cnJlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgcmVtb3ZlZCwgZGVsdGEsIHRyYW5zaXRpb24gfTtcbiAgICB9XG5cbiAgICAvKiogaGVscGVyOiDliYrpmaTmmYLjga7mm7TmlrAgKi9cbiAgICBwcml2YXRlIF91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQ6IFJlbW92ZUl0ZW1zQ29udGV4dCwgZGVsYXk6IG51bWJlciwgcHJvZmlsZVVwZGF0ZTogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH0gPSBjb250ZXh0O1xuXG4gICAgICAgIC8vIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjdXN0b21pemUgcG9pbnQ6IOODl+ODreODleOCoeOCpOODq+OBruabtOaWsFxuICAgICAgICBwcm9maWxlVXBkYXRlKCk7XG5cbiAgICAgICAgLy8g44K544Kv44Ot44O844Or6aCY5Z+f44Gu5pu05pawXG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KC1kZWx0YSk7XG4gICAgICAgIC8vIOmBheW7tuWJiumZpFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiByZW1vdmVkKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDog6YCj57aaIGluZGV4IOeJiCAqL1xuICAgIHByaXZhdGUgX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyIHwgdW5kZWZpbmVkLCBkZWxheTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgICAgIHNpemUgPSBzaXplID8/IDE7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcblxuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4ICsgc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3JlbW92ZUl0ZW0oKSwgaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBpbmRleGVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogc2l6ZSB9LCAoXywgaSkgPT4gaW5kZXggKyBpKTtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luZGV4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluZGV4LCBzaXplKTtcbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5kZXgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDogcmFuZG9tIGFjY2VzcyDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtUmFuZG9tbHkoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcbiAgICAgICAgaW5kZXhlcy5zb3J0KChsaHMsIHJocykgPT4gcmhzIC0gbGhzKTsgLy8g6ZmN6aCG44K944O844OIXG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIG4gPSBpbmRleGVzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgaWYgKGkgPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFtyZW1vdmVJdGVtKCksIGludmFsaWQgaW5kZXg6ICR7aX1dYFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDliYrpmaTlgJnoo5zjgajlpInljJbph4/jga7nrpflh7pcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgICAgIC8vIHBhZ2Ug6Kit5a6a44Gu6Kej6ZmkXG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaWR4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhclBhZ2UodGhpcy5faXRlbXNbaWR4XS5wYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyDphY3liJfjgYvjgonliYrpmaRcbiAgICAgICAgICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gaW5kZXhlc1tpbmRleGVzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9maWxlcyhmaXJzdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBzY3JvbGwgbWFwIOOBruODiOODqeODs+OCuOOCt+ODp+ODs+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0dXBTY3JvbGxNYXBUcmFuc2l0aW9uKGRlbGF5OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcbiAgICAgICAgY29uc3QgZWwgPSB0aGlzLl8kbWFwWzBdO1xuICAgICAgICB0aGlzLl8kbWFwLnRyYW5zaXRpb25FbmQoKCkgPT4ge1xuICAgICAgICAgICAgY2xlYXJUcmFuc2l0aW9uKGVsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFRyYW5zZm9ybVRyYW5zaXRpb24oZWwsICdoZWlnaHQnLCBkZWxheSwgJ2Vhc2UnKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XICovXG4gICAgZ2V0SXRlbUluZm8odGFyZ2V0OiBudW1iZXIgfCBFdmVudCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICBjb25zdCB7IF9pdGVtcywgX2NvbmZpZyB9ID0gdGhpcztcblxuICAgICAgICBjb25zdCBwYXJzZXIgPSAoJHRhcmdldDogRE9NKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKF9jb25maWcuTElTVElURU1fQkFTRV9DTEFTUykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKCR0YXJnZXQuYXR0cihfY29uZmlnLkRBVEFfQ09OVEFJTkVSX0lOREVYKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKSB8fCAkdGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdjYW5ub3QgZGl0ZWN0IGl0ZW0gZnJvbSBldmVudCBvYmplY3QuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlcigkdGFyZ2V0LnBhcmVudCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpbmRleCA9IHRhcmdldCBpbnN0YW5jZW9mIEV2ZW50ID8gcGFyc2VyKCQodGFyZ2V0LmN1cnJlbnRUYXJnZXQgYXMgSFRNTEVsZW1lbnQpKSA6IE51bWJlcih0YXJnZXQpO1xuXG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbdW5zdXBwb3J0ZWQgdHlwZTogJHt0eXBlb2YgdGFyZ2V0fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKGluZGV4IDwgMCB8fCBfaXRlbXMubGVuZ3RoIDw9IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBnZXRJdGVtSW5mbygpIFtpbnZhbGlkIGluZGV4OiAke3R5cGVvZiBpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBfaXRlbXNbaW5kZXhdLmluZm87XG4gICAgfVxuXG4gICAgLyoqIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsCAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgX3BhZ2VzLCBfaXRlbXMsIF9zZXR0aW5ncywgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCB9ID0gdGhpcztcblxuICAgICAgICBjb25zdCB0YXJnZXRzOiBSZWNvcmQ8bnVtYmVyLCAnYWN0aXZhdGUnIHwgJ2hpZGUnIHwgJ2RlYWN0aXZhdGUnPiA9IHt9O1xuICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgY29uc3QgaGlnaFByaW9yaXR5SW5kZXg6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgY29uc3Qgc3RvcmVOZXh0UGFnZVN0YXRlID0gKGluZGV4OiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2FjdGl2YXRlJztcbiAgICAgICAgICAgICAgICBoaWdoUHJpb3JpdHlJbmRleC5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoTWF0aC5hYnMoY3VycmVudFBhZ2VJbmRleCAtIGluZGV4KSA8PSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCkge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2FjdGl2YXRlJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoX3NldHRpbmdzLmVuYWJsZUhpZGRlblBhZ2UpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdoaWRlJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnZGVhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjdXJyZW50IHBhZ2Ug44GuIOWJjeW+jOOBryBoaWdoIHByaW9yaXR5IOOBq+OBmeOCi1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRQYWdlSW5kZXggKyAxID09PSBpbmRleCB8fCBjdXJyZW50UGFnZUluZGV4IC0gMSA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBoaWdoUHJpb3JpdHlJbmRleC5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyDlr77osaHnhKHjgZdcbiAgICAgICAgaWYgKF9pdGVtcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hDb3VudCA9IF9zZXR0aW5ncy5wYWdlUHJlcGFyZUNvdW50ICsgX3NldHRpbmdzLnBhZ2VQcmVsb2FkQ291bnQ7XG4gICAgICAgICAgICBjb25zdCBiZWdpbkluZGV4ID0gY3VycmVudFBhZ2VJbmRleCAtIHNlYXJjaENvdW50O1xuICAgICAgICAgICAgY29uc3QgZW5kSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQ7XG5cbiAgICAgICAgICAgIGxldCBvdmVyZmxvd1ByZXYgPSAwLCBvdmVyZmxvd05leHQgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgcGFnZUluZGV4ID0gYmVnaW5JbmRleDsgcGFnZUluZGV4IDw9IGVuZEluZGV4OyBwYWdlSW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJmbG93UHJldisrO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gcGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJmbG93TmV4dCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgwIDwgb3ZlcmZsb3dQcmV2KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHBhZ2VJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggKyBzZWFyY2hDb3VudCArIDE7IGkgPCBvdmVyZmxvd1ByZXY7IGkrKywgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9wYWdlcy5sZW5ndGggPD0gcGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgwIDwgb3ZlcmZsb3dOZXh0KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHBhZ2VJbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudCAtIDE7IGkgPCBvdmVyZmxvd05leHQ7IGkrKywgcGFnZUluZGV4LS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhZ2VJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOS4jeimgeOBq+OBquOBo+OBnyBwYWdlIOOBriDpnZ7mtLvmgKfljJZcbiAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIF9wYWdlcy5maWx0ZXIocGFnZSA9PiAnaW5hY3RpdmUnICE9PSBwYWdlLnN0YXR1cykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHRhcmdldHNbcGFnZS5pbmRleF0pIHtcbiAgICAgICAgICAgICAgICBwYWdlLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWEquWFiCBwYWdlIOOBriBhY3RpdmF0ZVxuICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBoaWdoUHJpb3JpdHlJbmRleC5zb3J0KChsaHMsIHJocykgPT4gbGhzIC0gcmhzKSkgeyAvLyDmmIfpoIbjgr3jg7zjg4hcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkKCkgJiYgX3BhZ2VzW2lkeF0/LmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOOBneOBruOBu+OBi+OBriBwYWdlIOOBriDnirbmhYvlpInmm7RcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0cykpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gTnVtYmVyKGtleSk7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSB0YXJnZXRzW2luZGV4XTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkKCkgJiYgX3BhZ2VzW2luZGV4XT8uW2FjdGlvbl0/LigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDmm7TmlrDlvozjgavkvb/nlKjjgZfjgarjgYvjgaPjgZ8gRE9NIOOCkuWJiumZpFxuICAgICAgICB0aGlzLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5yZW1vdmUoKTtcblxuICAgICAgICBjb25zdCBwYWdlQ3VycmVudCA9IF9wYWdlc1tjdXJyZW50UGFnZUluZGV4XTtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5mcm9tICA9IHBhZ2VDdXJyZW50LmdldEl0ZW1GaXJzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnRvICAgID0gcGFnZUN1cnJlbnQuZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCA9IGN1cnJlbnRQYWdlSW5kZXg7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOacquOCouOCteOCpOODs+ODmuODvOOCuOOCkuani+eviSAqL1xuICAgIHVwZGF0ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5hc3NpZ25QYWdlKHRoaXMuX3BhZ2VzLmxlbmd0aCk7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Ki44K144Kk44Oz44KS5YaN5qeL5oiQICovXG4gICAgcmVidWlsZCgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoKTtcbiAgICAgICAgdGhpcy5hc3NpZ25QYWdlKCk7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog566h6L2E44OH44O844K/44KS56C05qOEICovXG4gICAgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wYWdlcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pdGVtcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9tYXBIZWlnaHQgPSAwO1xuICAgICAgICB0aGlzLl8kbWFwLmhlaWdodCgwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5Y+W5b6XICovXG4gICAgZ2V0IHNjcm9sbFBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsZXI/LnBvcyA/PyAwO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jga7mnIDlpKflgKTjgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8ucG9zTWF4ID8/IDA7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaQgKi9cbiAgICBzZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5bbWV0aG9kXSgnc2Nyb2xsJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaQgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uW21ldGhvZF0oJ3Njcm9sbHN0b3AnLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aICovXG4gICAgYXN5bmMgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHZlcmlmeSh0aGlzLl9zY3JvbGxlcik7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgcG9zaXRpb24sIHRvbyBzbWFsbC4gW3BvczogJHtwb3N9XWApO1xuICAgICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9zY3JvbGxlci5wb3NNYXggPCBwb3MpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBwb3NpdGlvbiwgdG9vIGJpZy4gW3BvczogJHtwb3N9XWApO1xuICAgICAgICAgICAgcG9zID0gdGhpcy5fc2Nyb2xsZXIucG9zO1xuICAgICAgICB9XG4gICAgICAgIC8vIHBvcyDjga7jgb/lhYjpp4bjgZHjgabmm7TmlrBcbiAgICAgICAgdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcyA9IHBvcztcbiAgICAgICAgaWYgKHBvcyAhPT0gdGhpcy5fc2Nyb2xsZXIucG9zKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9zY3JvbGxlci5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovCAqL1xuICAgIGFzeW5jIGVuc3VyZVZpc2libGUoaW5kZXg6IG51bWJlciwgb3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2l0ZW1zLCBfc2V0dGluZ3MsIF9iYXNlSGVpZ2h0IH0gPSB0aGlzO1xuXG4gICAgICAgIHZlcmlmeShfc2Nyb2xsZXIpO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IF9pdGVtcy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IGVuc3VyZVZpc2libGUoKSBbaW52YWxpZCBpbmRleDogJHt0eXBlb2YgaW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcGVyYXRpb24gPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIHBhcnRpYWxPSzogdHJ1ZSxcbiAgICAgICAgICAgIHNldFRvcDogZmFsc2UsXG4gICAgICAgICAgICBhbmltYXRlOiBfc2V0dGluZ3MuZW5hYmxlQW5pbWF0aW9uLFxuICAgICAgICAgICAgdGltZTogX3NldHRpbmdzLmFuaW1hdGlvbkR1cmF0aW9uLFxuICAgICAgICAgICAgY2FsbGJhY2s6IG5vb3AsXG4gICAgICAgIH0sIG9wdGlvbnMpIGFzIFJlcXVpcmVkPExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucz47XG5cbiAgICAgICAgY29uc3QgY3VycmVudFNjb3BlID0ge1xuICAgICAgICAgICAgZnJvbTogX3Njcm9sbGVyLnBvcyxcbiAgICAgICAgICAgIHRvOiBfc2Nyb2xsZXIucG9zICsgX2Jhc2VIZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gX2l0ZW1zW2luZGV4XTtcblxuICAgICAgICBjb25zdCB0YXJnZXRTY29wZSA9IHtcbiAgICAgICAgICAgIGZyb206IHRhcmdldC5vZmZzZXQsXG4gICAgICAgICAgICB0bzogdGFyZ2V0Lm9mZnNldCArIHRhcmdldC5oZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXNJblNjb3BlID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5wYXJ0aWFsT0spIHtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0U2NvcGUuZnJvbSA8PSBjdXJyZW50U2NvcGUuZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFNjb3BlLmZyb20gPD0gdGFyZ2V0U2NvcGUudG87XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFNjb3BlLmZyb20gPD0gY3VycmVudFNjb3BlLnRvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRTY29wZS5mcm9tIDw9IHRhcmdldFNjb3BlLmZyb20gJiYgdGFyZ2V0U2NvcGUudG8gPD0gY3VycmVudFNjb3BlLnRvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRldGVjdFBvc2l0aW9uID0gKCk6IG51bWJlciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0U2NvcGUuZnJvbSA8IGN1cnJlbnRTY29wZS5mcm9tXG4gICAgICAgICAgICAgICAgPyB0YXJnZXRTY29wZS5mcm9tXG4gICAgICAgICAgICAgICAgOiB0YXJnZXQub2Zmc2V0IC0gdGFyZ2V0LmhlaWdodCAvLyBib3R0b20g5ZCI44KP44Gb44Gv5oOF5aCx5LiN6Laz44Gr44KI44KK5LiN5Y+vXG4gICAgICAgICAgICA7XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IHBvczogbnVtYmVyO1xuICAgICAgICBpZiAob3BlcmF0aW9uLnNldFRvcCkge1xuICAgICAgICAgICAgcG9zID0gdGFyZ2V0U2NvcGUuZnJvbTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0luU2NvcGUoKSkge1xuICAgICAgICAgICAgb3BlcmF0aW9uLmNhbGxiYWNrKCk7XG4gICAgICAgICAgICByZXR1cm47IC8vIG5vb3BcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvcyA9IGRldGVjdFBvc2l0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDoo5zmraNcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAoX3Njcm9sbGVyLnBvc01heCA8IHBvcykge1xuICAgICAgICAgICAgcG9zID0gX3Njcm9sbGVyLnBvc01heDtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuc2Nyb2xsVG8ocG9zLCBvcGVyYXRpb24uYW5pbWF0ZSwgb3BlcmF0aW9uLnRpbWUpO1xuICAgICAgICBvcGVyYXRpb24uY2FsbGJhY2soKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYwgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0geyBpdGVtczogdGhpcy5faXRlbXMgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FkZEl0ZW0odGhpcy5fYmFja3VwW2tleV0uaXRlbXMpO1xuXG4gICAgICAgIGlmIChyZWJ1aWxkKSB7XG4gICAgICAgICAgICB0aGlzLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo0gKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhCAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMuX2JhY2t1cCkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrkgKi9cbiAgICBnZXQgYmFja3VwRGF0YSgpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhY2t1cDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9uKCdzY3JvbGxzdG9wJywgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+egtOajhCAqL1xuICAgIHByaXZhdGUgcmVzZXRTY3JvbGxlckNvbmRpdGlvbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub2ZmKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDml6Llrprjga4gU2Nyb2xsZXIg44Kq44OW44K444Kn44Kv44OI44Gu5L2c5oiQICovXG4gICAgcHJpdmF0ZSBjcmVhdGVTY3JvbGxlcigpOiBJTGlzdFNjcm9sbGVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzLnNjcm9sbGVyRmFjdG9yeSh0aGlzLl8kcm9vdFswXSwgdGhpcy5fc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKiDnj77lnKjjga4gUGFnZSBJbmRleCDjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldFBhZ2VJbmRleCgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2Jhc2VIZWlnaHQsIF9wYWdlcyB9ID0gdGhpcztcbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3QgeyBwb3M6IHNjcm9sbFBvcywgcG9zTWF4OiBzY3JvbGxQb3NNYXggfSA9IF9zY3JvbGxlcjtcblxuICAgICAgICBjb25zdCBzY3JvbGxNYXBTaXplID0gKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICAgICAgcmV0dXJuIGxhc3RQYWdlID8gbGFzdFBhZ2Uub2Zmc2V0ICsgbGFzdFBhZ2UuaGVpZ2h0IDogX2Jhc2VIZWlnaHQ7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgY29uc3QgcG9zID0gKCgpID0+IHtcbiAgICAgICAgICAgIGlmICgwID09PSBzY3JvbGxQb3NNYXggfHwgc2Nyb2xsUG9zTWF4IDw9IF9iYXNlSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY3JvbGxQb3MgKiBzY3JvbGxNYXBTaXplIC8gc2Nyb2xsUG9zTWF4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHZhbGlkUmFuZ2UgPSAocGFnZTogUGFnZVByb2ZpbGUpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhZ2Uub2Zmc2V0IDw9IHBvcyAmJiBwb3MgPD0gcGFnZS5vZmZzZXQgKyBwYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNhbmRpZGF0ZSA9IE1hdGguZmxvb3IocG9zIC8gX2Jhc2VIZWlnaHQpO1xuICAgICAgICBpZiAoX3BhZ2VzLmxlbmd0aCA8PSBjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgIGNhbmRpZGF0ZSA9IF9wYWdlcy5sZW5ndGggLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBhZ2UgPSBfcGFnZXNbY2FuZGlkYXRlXTtcbiAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICB9IGVsc2UgaWYgKHBvcyA8IHBhZ2Uub2Zmc2V0KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FuZGlkYXRlIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBwYWdlID0gX3BhZ2VzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYW5kaWRhdGUgKyAxLCBuID0gX3BhZ2VzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHBhZ2UgPSBfcGFnZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgZGV0ZWN0IHBhZ2UgaW5kZXguIGZhbGxiYWNrOiAke19wYWdlcy5sZW5ndGggLSAxfWApO1xuICAgICAgICByZXR1cm4gX3BhZ2VzLmxlbmd0aCAtIDE7XG4gICAgfVxuXG4gICAgLyoqIOacgOW+jOOBruODmuODvOOCuOOCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgZ2V0TGFzdFBhZ2UoKTogUGFnZVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VzW3RoaXMuX3BhZ2VzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4gqL1xuICAgIHByaXZhdGUgb25TY3JvbGwocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGludGVyc2VjdGlvblJlY3Qg44KS5L2/55So44GZ44KL5aC05ZCILCBTY3JvbGwg44OP44Oz44OJ44Op44O85YWo6Iis44Gv44Gp44GG44GC44KL44G544GN44GL6KaB5qSc6KiOXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMocG9zIC0gdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcykgPCB0aGlzLl9zZXR0aW5ncy5zY3JvbGxSZWZyZXNoRGlzdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5YGc5q2i44Kk44OZ44Oz44OIICovXG4gICAgcHJpdmF0ZSBvblNjcm9sbFN0b3AocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggIT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu44Ki44K144Kk44OzICovXG4gICAgcHJpdmF0ZSBhc3NpZ25QYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoZnJvbSk7XG5cbiAgICAgICAgY29uc3QgeyBfaXRlbXMsIF9wYWdlcywgX2Jhc2VIZWlnaHQsIF9zY3JvbGxlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgYmFzZVBhZ2UgPSB0aGlzLmdldExhc3RQYWdlKCk7XG4gICAgICAgIGNvbnN0IG5leHRJdGVtSW5kZXggPSBiYXNlUGFnZT8uZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgY29uc3QgYXNpZ25lZUl0ZW1zICA9IF9pdGVtcy5zbGljZShuZXh0SXRlbUluZGV4KTtcblxuICAgICAgICBsZXQgd29ya1BhZ2UgPSBiYXNlUGFnZTtcbiAgICAgICAgaWYgKG51bGwgPT0gd29ya1BhZ2UpIHtcbiAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3IFBhZ2VQcm9maWxlKCk7XG4gICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgYXNpZ25lZUl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoX2Jhc2VIZWlnaHQgPD0gd29ya1BhZ2UuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2UuaW5kZXggPSB3b3JrUGFnZS5pbmRleCArIDE7XG4gICAgICAgICAgICAgICAgbmV3UGFnZS5vZmZzZXQgPSB3b3JrUGFnZS5vZmZzZXQgKyB3b3JrUGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2UgPSBuZXdQYWdlO1xuICAgICAgICAgICAgICAgIF9wYWdlcy5wdXNoKHdvcmtQYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW0ucGFnZUluZGV4ID0gd29ya1BhZ2UuaW5kZXg7XG4gICAgICAgICAgICB3b3JrUGFnZS5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG5cbiAgICAgICAgX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu6Kej6ZmkICovXG4gICAgcHJpdmF0ZSBjbGVhclBhZ2UoZnJvbT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYWdlcy5zcGxpY2UoZnJvbSA/PyAwKTtcbiAgICB9XG5cbiAgICAvKiogaW5hY3RpdmUg55SoIE1hcCDjga7nlJ/miJAgKi9cbiAgICBwcml2YXRlIHByZXBhcmVJbmFjdGl2ZU1hcCgpOiBET00ge1xuICAgICAgICBjb25zdCB7IF9jb25maWcsIF8kbWFwLCBfbWFwSGVpZ2h0IH0gPSB0aGlzO1xuICAgICAgICBjb25zdCAkcGFyZW50ID0gXyRtYXAucGFyZW50KCk7XG4gICAgICAgIGxldCAkaW5hY3RpdmVNYXAgPSAkcGFyZW50LmZpbmQoX2NvbmZpZy5JTkFDVElWRV9DTEFTU19TRUxFQ1RPUik7XG5cbiAgICAgICAgaWYgKCRpbmFjdGl2ZU1hcC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBjb25zdCAkbGlzdEl0ZW1WaWV3cyA9IF8kbWFwLmNsb25lKCkuY2hpbGRyZW4oKS5maWx0ZXIoKF8sIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZGV4ID0gTnVtYmVyKCQoZWxlbWVudCkuYXR0cihfY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4IC0gMSA8PSBwYWdlSW5kZXggfHwgcGFnZUluZGV4IDw9IGN1cnJlbnRQYWdlSW5kZXggKyAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRpbmFjdGl2ZU1hcCA9ICQoYDxzZWN0aW9uIGNsYXNzPVwiJHtfY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1N9XCIgXCIke19jb25maWcuSU5BQ1RJVkVfQ0xBU1N9XCI+PC9zZWN0aW9uPmApXG4gICAgICAgICAgICAgICAgLmFwcGVuZCgkbGlzdEl0ZW1WaWV3cylcbiAgICAgICAgICAgICAgICAuaGVpZ2h0KF9tYXBIZWlnaHQpO1xuICAgICAgICAgICAgJHBhcmVudC5hcHBlbmQoJGluYWN0aXZlTWFwKTtcbiAgICAgICAgICAgIF8kbWFwLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGluYWN0aXZlTWFwO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgZG9tIGFzICQsXG4gICAgdHlwZSBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBWaWV3LFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgTGlzdENvcmUgfSBmcm9tICcuL2NvcmUvbGlzdCc7XG5pbXBvcnQgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBjb250ZXh0OiBMaXN0Q29yZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBjbGFzcyB0aGF0IHN0b3JlcyB7QGxpbmsgTGlzdFZpZXd9IGluaXRpYWxpemF0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIHtAbGluayBMaXN0Vmlld30g44Gu5Yid5pyf5YyW5oOF5aCx44KS5qC857SN44GZ44KL44Kk44Oz44K/44O844OV44Kn44Kk44K544Kv44Op44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBMaXN0Q29udGV4dE9wdGlvbnMsIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICAkZWw/OiBET008VEVsZW1lbnQ+O1xuICAgIGluaXRpYWxIZWlnaHQ/OiBudW1iZXI7XG59XG5cbi8qKlxuICogQGVuIFZpcnR1YWwgbGlzdCB2aWV3IGNsYXNzIHRoYXQgcHJvdmlkZXMgbWVtb3J5IG1hbmFnZW1lbnQgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDjg6Hjg6Ljg6rnrqHnkIbmqZ/og73jgpLmj5DkvpvjgZnjgovku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpc3RWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IG9wdCA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgY29udGV4dDogbmV3IExpc3RDb3JlKG9wdCksXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG5cbiAgICAgICAgaWYgKG9wdC4kZWwpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChvcHQuJGVsIGFzIERPTVNlbGVjdG9yPFRFbGVtZW50Pik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBoZWlnaHQgPSBvcHQuaW5pdGlhbEhlaWdodCA/PyB0aGlzLiRlbC5oZWlnaHQoKTtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaW5pdGlhbGl6ZSh0aGlzLiRlbCBhcyBET008Tm9kZT4gYXMgRE9NLCBoZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGNvbnRleHQgYWNjZXNzb3IgKi9cbiAgICBnZXQgY29udGV4dCgpOiBJTGlzdENvbnRleHQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBWaWV3IGNvbXBvbmVudCBtZXRob2RzOlxuXG4gICAgLyoqIGB0aGlzLmVsYCDmm7TmlrDmmYLjga7mlrDjgZfjgYQgSFRNTCDjgpLjg6zjg7Pjg4Djg6rjg7PjgrDjg63jgrjjg4Pjgq/jga7lrp/oo4XplqLmlbAuIOODouODh+ODq+abtOaWsOOBqCBWaWV3IOODhuODs+ODl+ODrOODvOODiOOCkumAo+WLleOBleOBm+OCiy4gKi9cbiAgICBhYnN0cmFjdCByZW5kZXIoLi4uYXJnczogdW5rbm93bltdKTogYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBDaGFuZ2UgdGhlIHZpZXcncyBlbGVtZW50IChgdGhpcy5lbGAgcHJvcGVydHkpIGFuZCByZS1kZWxlZ2F0ZSB0aGUgdmlldydzIGV2ZW50cyBvbiB0aGUgbmV3IGVsZW1lbnQuXG4gICAgICogQGphIFZpZXcg44GM566h6L2E44GZ44KL6KaB57SgIChgdGhpcy5lbGAgcHJvcGVydHkpIOOBruWkieabtC4g44Kk44OZ44Oz44OI5YaN6Kit5a6a44KC5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIE9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4jjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBvdmVycmlkZSBzZXRFbGVtZW50KGVsOiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBjb250ZXh0IH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgIGNvbnRleHQuZGVzdHJveSgpO1xuICAgICAgICBjb250ZXh0LmluaXRpYWxpemUoJGVsIGFzIERPTTxOb2RlPiBhcyBET00sICRlbC5oZWlnaHQoKSk7XG4gICAgICAgIHJldHVybiBzdXBlci5zZXRFbGVtZW50KGVsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5kZXN0cm95KCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZW1vdmUoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdE9wZXJhdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGl0IGhhcyBiZWVuIGluaXRpYWxpemVkLlxuICAgICAqIEBqYSDliJ3mnJ/ljJbmuIjjgb/jgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBpbml0aWFsaXplZCAvIGZhbHNlOiB1bmluaXRpYWxpemVkXG4gICAgICogIC0gYGphYCB0cnVlOiDliJ3mnJ/ljJbmuIjjgb8gLyBmYWxzZTog5pyq5Yid5pyf5YyWXG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNJbml0aWFsaXplZCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbi5cbiAgICAgKiBAamEgaXRlbSDnmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICogQHBhcmFtIGluc2VydFRvXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbnNlcnRpb24gcG9zaXRpb24gb2YgaXRlbSBieSBpbmRleFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7mjL/lhaXkvY3nva7jgpLjgqTjg7Pjg4fjg4Pjgq/jgrnjgafmjIflrppcbiAgICAgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogbmV3IChvcHRpb25zPzogVW5rbm93bk9iamVjdCkgPT4gSUxpc3RJdGVtVmlldywgaW5mbzogVW5rbm93bk9iamVjdCwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYWRkSXRlbShuZXcgSXRlbVByb2ZpbGUodGhpcy5jb250ZXh0LCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbiAoaW50ZXJuYWwgdXNlKS5cbiAgICAgKiBAamEgaXRlbSDnmbvpjLIgKOWGhemDqOeUqClcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSXRlbVByb2ZpbGV9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGl0ZW0gYnkgaW5kZXhcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5oy/5YWl5L2N572u44KS44Kk44Oz44OH44OD44Kv44K544Gn5oyH5a6aXG4gICAgICovXG4gICAgX2FkZEl0ZW0oaXRlbTogSXRlbVByb2ZpbGUgfCBJdGVtUHJvZmlsZVtdLCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Ll9hZGRJdGVtKGl0ZW0sIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHRoZSBzcGVjaWZpZWQgSXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluZGV4IHRvIHN0YXJ0IHJlbGVhc2luZ1xuICAgICAqICAtIGBqYWAg6Kej6Zmk6ZaL5aeL44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIHNpemVcbiAgICAgKiAgLSBgZW5gIHRvdGFsIG51bWJlciBvZiBpdGVtcyB0byByZWxlYXNlXG4gICAgICogIC0gYGphYCDop6PpmaTjgZnjgosgaXRlbSDjga7nt4/mlbAgW2RlZmF1bHQ6IDFdXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHRvIGFjdHVhbGx5IGRlbGV0ZSB0aGUgZWxlbWVudCBbZGVmYXVsdDogMCAoaW1tZWRpYXRlIGRlbGV0aW9uKVxuICAgICAqICAtIGBqYWAg5a6f6Zqb44Gr6KaB57Sg44KS5YmK6Zmk44GZ44KLIGRlbGF5IHRpbWUgW2RlZmF1bHQ6IDAgKOWNs+aZguWJiumZpCldXG4gICAgICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyLCBzaXplPzogbnVtYmVyLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHRoZSBzcGVjaWZpZWQgSXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGFyZ2V0IGluZGV4IGFycmF5LiBpdCBpcyBtb3JlIGVmZmljaWVudCB0byBzcGVjaWZ5IHJldmVyc2UgaW5kZXguXG4gICAgICogIC0gYGphYCDlr77osaHjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjgpLmjIflrpouIHJldmVyc2UgaW5kZXgg44KS5oyH5a6a44GZ44KL44G744GG44GM5Yq5546H55qEXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHRvIGFjdHVhbGx5IGRlbGV0ZSB0aGUgZWxlbWVudCBbZGVmYXVsdDogMCAoaW1tZWRpYXRlIGRlbGV0aW9uKVxuICAgICAqICAtIGBqYWAg5a6f6Zqb44Gr6KaB57Sg44KS5YmK6Zmk44GZ44KLIGRlbGF5IHRpbWUgW2RlZmF1bHQ6IDAgKOWNs+aZguWJiumZpCldXG4gICAgICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcblxuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVtb3ZlSXRlbShpbmRleCBhcyBudW1iZXIsIGFyZzIsIGFyZzMpOyAvLyBhdm9pZCB0cygyMzQ1KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGluZm9ybWF0aW9uIHNldCBmb3IgdGhlIHNwZWNpZmllZCBpdGVtLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gaXRlbSDjgavoqK3lrprjgZfjgZ/mg4XloLHjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGlkZW50aWZpZXIgW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqICAtIGBqYWAg6K2Y5Yil5a2QLiBbaW5kZXggfCBldmVudCBvYmplY3RdXG4gICAgICovXG4gICAgZ2V0SXRlbUluZm8odGFyZ2V0OiBudW1iZXIgfCBFdmVudCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRJdGVtSW5mbyh0YXJnZXQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWZyZXNoIGFjdGl2ZSBwYWdlcy5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW44Oa44O844K444KS5pu05pawXG4gICAgICovXG4gICAgcmVmcmVzaCgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWZyZXNoKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBCdWlsZCB1bmFzc2lnbmVkIHBhZ2VzLlxuICAgICAqIEBqYSDmnKrjgqLjgrXjgqTjg7Pjg5rjg7zjgrjjgpLmp4vnr4lcbiAgICAgKi9cbiAgICB1cGRhdGUoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQudXBkYXRlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWJ1aWxkIHBhZ2UgYXNzaWdubWVudHMuXG4gICAgICogQGphIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkFxuICAgICAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVidWlsZCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRGVzdHJveSBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4RcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbGVhc2UoKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnJlbGVhc2UoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGFibGVcblxuICAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHNjcm9sbFBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zY3JvbGxQb3M7XG4gICAgfVxuXG4gICAgIC8qKlxuICAgICAgKiBAZW4gR2V0IG1heGltdW0gc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44Gu5pyA5aSn5YCk44KS5Y+W5b6XXG4gICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zTWF4O1xuICAgIH1cblxuICAgICAvKipcbiAgICAgKiBAZW4gU2Nyb2xsIGV2ZW50IGhhbmRsZXIgc2V0dGluZy9jYW5jZWxsYXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyLCBtZXRob2QpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXR0aW5nL2NhbmNlbGxpbmcgc2Nyb2xsIHN0b3AgZXZlbnQgaGFuZGxlci5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or57WC5LqG44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeODvOmWouaVsFxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9uOiBzZXR0aW5nIC8gb2ZmOiBjYW5jZWxpbmdcbiAgICAgKiAgLSBgamFgIG9uOiDoqK3lrpogLyBvZmY6IOino+mZpFxuICAgICAqL1xuICAgIHNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zXG4gICAgICogIC0gYGVuYCBuZXcgc2Nyb2xsIHBvc2l0aW9uIHZhbHVlIFswIC0gcG9zTWF4XVxuICAgICAqICAtIGBqYWAg5paw44GX44GE44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aIFswIC0gcG9zTWF4XVxuICAgICAqIEBwYXJhbSBhbmltYXRlXG4gICAgICogIC0gYGVuYCBlbmFibGUvZGlzYWJsZSBhbmltYXRpb25cbiAgICAgKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+OBruacieeEoVxuICAgICAqIEBwYXJhbSB0aW1lXG4gICAgICogIC0gYGVuYCB0aW1lIHNwZW50IG9uIGFuaW1hdGlvbiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW5zdXJlIHZpc2liaWxpdHkgb2YgaXRlbSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44GfIGl0ZW0g44Gu6KGo56S644KS5L+d6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5kZXggb2YgaXRlbVxuICAgICAqICAtIGBqYWAgaXRlbSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSBvYmplY3RcbiAgICAgKiAgLSBgamFgIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIGVuc3VyZVZpc2libGUoaW5kZXg6IG51bWJlciwgb3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5lbnN1cmVWaXNpYmxlKGluZGV4LCBvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5IChhbnkgaWRlbnRpZmllcilcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvCjku7vmhI/jga7orZjliKXlrZAp44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5iYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcGFyYW0gcmVidWlsZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHJlYnVpbGQgdGhlIGxpc3Qgc3RydWN0dXJlXG4gICAgICogIC0gYGphYCDjg6rjgrnjg4jmp4vpgKDjgpLlho3mp4vnr4njgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZXN0b3JlKGtleSwgcmVidWlsZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgYmFja3VwIGRhdGEgZXhpc3RzLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKHjgpLnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzIC8gZmFsc2U6IG5vdCBleGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSAvIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaGFzQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERpc2NhcmQgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBkaXNjYXJkIGV4aXN0aW5nIGRhdGEgLyBmYWxzZTogc3BlY2lmaWVkIGRhdGEgZG9lcyBub3QgZXhpc3RcbiAgICAgKiAgLSBgamFgIHRydWU6IOWtmOWcqOOBl+OBn+ODh+ODvOOCv+OCkuegtOajhCAvIGZhbHNlOiDmjIflrprjgZXjgozjgZ/jg4fjg7zjgr/jga/lrZjlnKjjgZfjgarjgYRcbiAgICAgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuY2xlYXJCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgYmFja3VwRGF0YSgpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwRGF0YTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0VmlldyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5pbXBvcnQgeyB0eXBlIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsIExpc3RJdGVtVmlldyB9IGZyb20gJy4vbGlzdC1pdGVtLXZpZXcnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgZ3JvdXA6IEdyb3VwUHJvZmlsZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE9wdGlvbnMgdG8gcGFzcyB0byB7QGxpbmsgRXhwYW5kYWJsZUxpc3RJdGVtVmlld30gY29uc3RydWN0aW9uLlxuICogQGphIHtAbGluayBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3fSDmp4vnr4njgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEZ1bmNOYW1lID0gc3RyaW5nPlxuICAgIGV4dGVuZHMgTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgb3duZXI6IElFeHBhbmRhYmxlTGlzdFZpZXc7XG4gICAgLyoqIHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlICovXG4gICAgZ3JvdXA6IEdyb3VwUHJvZmlsZTtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBpdGVtIGNvbnRhaW5lciBjbGFzcyBoYW5kbGVkIGJ5IHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9LlxuICogQGphIHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXhwYW5kYWJsZUxpc3RJdGVtVmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgTGlzdEl0ZW1WaWV3PFRFbGVtZW50LCBURXZlbnQ+IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEV4cGFuZGFibGVMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgY29uc3QgeyBncm91cCB9ID0gb3B0aW9ucztcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7IGdyb3VwIH0gYXMgUHJvcGVydHk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJvdGVjdGVkIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzLlxuICAgICAqIEBqYSDlsZXplovnirbmhYvjgpLliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleHBhbmRlZCwgY29sbGFwc2VkOiBjbG9zZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5bGV6ZaLLCBmYWxzZTog5Y+O5p2fXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0V4cGFuZGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uZ3JvdXAuaXNFeHBhbmRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZy5cbiAgICAgKiBAamEg5bGV6ZaL5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzRXhwYW5kaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgY29sbGFwc2luZy5cbiAgICAgKiBAamEg5Y+O5p2f5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc0NvbGxhcHNpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcgb3IgY29sbGFwc2luZy5cbiAgICAgKiBAamEg6ZaL6ZaJ5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBpc1N3aXRjaGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzU3dpdGNoaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgaXQgaGFzIGEgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0uIDxicj5cbiAgICAgKiAgICAgSWYgYGxheW91dEtleWAgaXMgc3BlY2lmaWVkLCB3aGV0aGVyIHRoZSBsYXlvdXQgaW5mb3JtYXRpb24gbWF0Y2hlcyBpcyBhbHNvIGFkZGVkIHRvIHRoZSBqdWRnbWVudCBjb25kaXRpb24uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrpogPGJyPlxuICAgICAqICAgICBgbGF5b3V0S2V5YCDjgYzmjIflrprjgZXjgozjgozjgbDjgIFsYXlvdXQg5oOF5aCx44GM5LiA6Ie044GX44Gm44GE44KL44GL44KC5Yik5a6a5p2h5Lu244Gr5Yqg44GI44KLXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGF5b3V0S2V5XG4gICAgICogIC0gYGVuYCBpZGVudGlmaWVyIGZvciBlYWNoIGxheW91dFxuICAgICAqICAtIGBqYWAg44Os44Kk44Ki44Km44OI5q+O44Gu6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgaGFzQ2hpbGRyZW4obGF5b3V0S2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5ncm91cC5oYXNDaGlsZHJlbihsYXlvdXRLZXkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHR5cGUgVW5rbm93bk9iamVjdCwgbHVpZCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUV4cGFuZE9wZXJhdGlvbixcbiAgICBJTGlzdExheW91dEtleUhvbGRlcixcbiAgICBJTGlzdFN0YXR1c01hbmFnZXIsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElFeHBhbmRhYmxlTGlzdENvbnRleHQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4gQ29yZSBsb2dpYyBpbXBsZW1lbnRhdGlvbiBjbGFzcyB0aGF0IG1hbmFnZXMgZXhwYW5kaW5nIC8gY29sbGFwc2luZyBzdGF0ZS5cbiAqIEBqYSDplovplonnirbmhYvnrqHnkIbjgpLooYzjgYbjgrPjgqLjg63jgrjjg4Pjgq/lrp/oo4Xjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEV4cGFuZENvcmUgaW1wbGVtZW50c1xuICAgIElFeHBhbmRPcGVyYXRpb24sXG4gICAgSUxpc3RMYXlvdXRLZXlIb2xkZXIsXG4gICAgSUxpc3RTdGF0dXNNYW5hZ2VyLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcblxuICAgIC8vIFRPRE86IG93bmVyIOOBqOOBruWQhOODh+ODvOOCv+OBruaJgOacieaoqeOBruimi+ebtOOBlyAoYmFja3VwRGF0YT8pXG4gICAgLyoqIHsgaWQ6IEdyb3VwUHJvZmlsZSB9ICovXG4gICAgcHJpdmF0ZSBfbWFwR3JvdXBzOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+ID0ge307XG4gICAgLyoqIOesrDHpmo7lsaQgR3JvdXBQcm9maWxlIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgX2FyeVRvcEdyb3VwczogR3JvdXBQcm9maWxlW10gPSBbXTtcbiAgICAvKiogbGF5b3V0S2V5IOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgX2xheW91dEtleT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIG93bmVyIOimqiBWaWV3IOOBruOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG93bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX293bmVyID0gb3duZXI7XG4gICAgfVxuXG4gICAgLyoqIOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9tYXBHcm91cHMgPSB7fTtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gW107XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUV4cGFuZE9wZXJhdGlvblxuXG4gICAgLyoqIOaWsOimjyBHcm91cFByb2ZpbGUg44KS5L2c5oiQICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBpZCA9IGlkID8/IGx1aWQoJ2xpc3QtZ3JvdXAnLCA0KTtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fbWFwR3JvdXBzW2lkXSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21hcEdyb3Vwc1tpZF07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZ3JvdXAgPSBuZXcgR3JvdXBQcm9maWxlKHRoaXMuX293bmVyLCBpZCk7XG4gICAgICAgIHRoaXMuX21hcEdyb3Vwc1tpZF0gPSBncm91cDtcbiAgICAgICAgcmV0dXJuIGdyb3VwO1xuICAgIH1cblxuICAgIC8qKiDnmbvpjLLmuIjjgb8gR3JvdXAg44KS5Y+W5b6XICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXBHcm91cHNbaWRdO1xuICAgIH1cblxuICAgIC8qKiDnrKwx6ZqO5bGk44GuIEdyb3VwIOeZu+mMsiAqL1xuICAgIHJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXA6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICAvLyDjgZnjgafjgavnmbvpjLLmuIjjgb/jga7loLTlkIjjga8gcmVzdG9yZSDjgZfjgaYgbGF5b3V0IOOCreODvOOBlOOBqOOBq+W+qeWFg+OBmeOCi+OAglxuICAgICAgICBpZiAoJ3JlZ2lzdGVyZWQnID09PSB0b3BHcm91cC5zdGF0dXMpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IG9yaWVudGF0aW9uIGNoYW5nZWQg5pmC44GuIGxheW91dCDjgq3jg7zlpInmm7Tlr77lv5zjgaDjgYzjgIHjgq3jg7zjgavlpInmm7TjgYznhKHjgYTjgajjgY3jga/kuI3lhbflkIjjgajjgarjgovjgIJcbiAgICAgICAgICAgIC8vIOOBk+OBriBBUEkg44Gr5a6f6KOF44GM5b+F6KaB44GL44KC5ZCr44KB44Gm6KaL55u044GX44GM5b+F6KaBXG4gICAgICAgICAgICB0b3BHcm91cC5yZXN0b3JlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsYXN0R3JvdXAgPSB0aGlzLl9hcnlUb3BHcm91cHNbdGhpcy5fYXJ5VG9wR3JvdXBzLmxlbmd0aCAtIDFdO1xuICAgICAgICBjb25zdCBpbnNlcnRUbyA9IGxhc3RHcm91cD8uZ2V0TmV4dEl0ZW1JbmRleCh0cnVlKSA/PyAwO1xuXG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3Vwcy5wdXNoKHRvcEdyb3VwKTtcbiAgICAgICAgdG9wR3JvdXAucmVnaXN0ZXIoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDnrKwx6ZqO5bGk44GuIEdyb3VwIOOCkuWPluW+lyAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnlUb3BHcm91cHMuc2xpY2UoMCk7XG4gICAgfVxuXG4gICAgLyoqIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWxlemWiyAoMemajuWxpCkgKi9cbiAgICBhc3luYyBleHBhbmRBbGwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2llczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBwcm9taXNpZXMucHVzaChncm91cC5leHBhbmQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzaWVzKTtcbiAgICB9XG5cbiAgICAvKiog44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5Y+O5p2fICgx6ZqO5bGkKSAqL1xuICAgIGFzeW5jIGNvbGxhcHNlQWxsKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2llczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBwcm9taXNpZXMucHVzaChncm91cC5jb2xsYXBzZShkZWxheSkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2llcyk7XG4gICAgfVxuXG4gICAgLyoqIOWxlemWi+S4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLmlzU3RhdHVzSW4oJ2V4cGFuZGluZycpO1xuICAgIH1cblxuICAgIC8qKiDlj47mnZ/kuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3duZXIuaXNTdGF0dXNJbignY29sbGFwc2luZycpO1xuICAgIH1cblxuICAgIC8qKiDplovplonkuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzRXhwYW5kaW5nIHx8IHRoaXMuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0TGF5b3V0S2V5SG9sZGVyXG5cbiAgICAvKiogbGF5b3V0IGtleSDjgpLlj5blvpcgKi9cbiAgICBnZXQgbGF5b3V0S2V5KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sYXlvdXRLZXk7XG4gICAgfVxuXG4gICAgLyoqIGxheW91dCBrZXkg44KS6Kit5a6aICovXG4gICAgc2V0IGxheW91dEtleShrZXk6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9sYXlvdXRLZXkgPSBrZXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTdGF0dXNNYW5hZ2VyXG5cbiAgICAvKiog54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44Kk44Oz44Kv44Oq44Oh44Oz44OIICovXG4gICAgc3RhdHVzQWRkUmVmKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLnN0YXR1c0FkZFJlZihzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKiDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jg4fjgq/jg6rjg6Hjg7Pjg4ggKi9cbiAgICBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLnN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiog5Yem55CG44K544Kz44O844OX5q+O44Gr54q25oWL5aSJ5pWw44KS6Kit5a6aICovXG4gICAgc3RhdHVzU2NvcGU8VD4oc3RhdHVzOiBzdHJpbmcsIGV4ZWN1dG9yOiAoKSA9PiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3duZXIuc3RhdHVzU2NvcGUoc3RhdHVzLCBleGVjdXRvcik7XG4gICAgfVxuXG4gICAgLyoqIOaMh+WumuOBl+OBn+eKtuaFi+S4reOBp+OBguOCi+OBi+eiuuiqjSAqL1xuICAgIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX293bmVyLmlzU3RhdHVzSW4oc3RhdHVzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jgpLjg5Djg4Pjgq/jgqLjg4Pjg5cgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgX2JhY2t1cCA9IHRoaXMuYmFja3VwRGF0YTtcbiAgICAgICAgaWYgKG51bGwgPT0gX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBfYmFja3VwW2tleV0gPSB7XG4gICAgICAgICAgICAgICAgbWFwOiB0aGlzLl9tYXBHcm91cHMsXG4gICAgICAgICAgICAgICAgdG9wczogdGhpcy5fYXJ5VG9wR3JvdXBzLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44Oq44K544OI44KiICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZCA9IHRydWUpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYmFja3VwID0gdGhpcy5iYWNrdXBEYXRhW2tleV0gYXMgVW5rbm93bk9iamVjdDtcbiAgICAgICAgaWYgKG51bGwgPT0gYmFja3VwKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8IHRoaXMuX2FyeVRvcEdyb3Vwcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fbWFwR3JvdXBzID0gYmFja3VwLm1hcCBhcyBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+O1xuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMgPSBiYWNrdXAudG9wcyBhcyBHcm91cFByb2ZpbGVbXTtcblxuICAgICAgICAvLyBsYXlvdXQg5oOF5aCx44Gu56K66KqNXG4gICAgICAgIGlmICghdGhpcy5fYXJ5VG9wR3JvdXBzWzBdPy5oYXNMYXlvdXRLZXlPZih0aGlzLmxheW91dEtleSEpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlsZXplovjgZfjgabjgYTjgovjgoLjga7jgpLnmbvpjLJcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIGdyb3VwLnJlc3RvcmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWGjeani+evieOBruS6iOe0hFxuICAgICAgICByZWJ1aWxkICYmIHRoaXMuX293bmVyLnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoSAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3duZXIuaGFzQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhCAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3duZXIuY2xlYXJCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5ICovXG4gICAgZ2V0IGJhY2t1cERhdGEoKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vd25lci5iYWNrdXBEYXRhO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICBzdGF0dXNBZGRSZWYsXG4gICAgc3RhdHVzUmVsZWFzZSxcbiAgICBzdGF0dXNTY29wZSxcbiAgICBpc1N0YXR1c0luLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RWaWV3IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEV4cGFuZENvcmUgfSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0IHR5cGUgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IHsgdHlwZSBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnMsIExpc3RWaWV3IH0gZnJvbSAnLi9saXN0LXZpZXcnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgY29udGV4dDogRXhwYW5kQ29yZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFZpcnR1YWwgbGlzdCB2aWV3IGNsYXNzIHdpdGggZXhwYW5kaW5nIC8gY29sbGFwc2luZyBmdW5jdGlvbmFsaXR5LlxuICogQGphIOmWi+mWieapn+iDveOCkuWCmeOBiOOBn+S7ruaDs+ODquOCueODiOODk+ODpeODvOOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXhwYW5kYWJsZUxpc3RWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBMaXN0VmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElFeHBhbmRhYmxlTGlzdFZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgY29udGV4dDogbmV3IEV4cGFuZENvcmUodGhpcyksXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUV4cGFuZGFibGVMaXN0Vmlld1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyB7QGxpbmsgR3JvdXBQcm9maWxlfS4gUmV0dXJuIHRoZSBvYmplY3QgaWYgaXQgaXMgYWxyZWFkeSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDmlrDopo8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5L2c5oiQLiDnmbvpjLLmuIjjgb/jga7loLTlkIjjga/jgZ3jga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgbmV3bHkgY3JlYXRlZCBncm91cCBpZC4gaWYgbm90IHNwZWNpZmllZCwgYXV0b21hdGljIGFsbG9jYXRpb24gd2lsbCBiZSBwZXJmb3JtZWQuXG4gICAgICogIC0gYGphYCDmlrDopo/jgavkvZzmiJDjgZnjgosgR3JvdXAgSUQg44KS5oyH5a6aLiDmjIflrprjgZfjgarjgYTloLTlkIjjga/oh6rli5XlibLjgormjK/jgopcbiAgICAgKi9cbiAgICBuZXdHcm91cChpZD86IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lm5ld0dyb3VwKGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHJlZ2lzdGVyZWQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOeZu+mMsua4iOOBvyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgR3JvdXAgSUQgdG8gcmV0cmlldmVcbiAgICAgKiAgLSBgamFgIOWPluW+l+OBmeOCiyBHcm91cCBJRCDjgpLmjIflrppcbiAgICAgKi9cbiAgICBnZXRHcm91cChpZDogc3RyaW5nKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0R3JvdXAoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiAxc3QgbGF5ZXIge0BsaW5rIEdyb3VwUHJvZmlsZX0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSDnrKwx6ZqO5bGk44GuIHtAbGluayBHcm91cFByb2ZpbGV9IOeZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIHRvcEdyb3VwXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RlZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAg5qeL56+J5riI44G/IHtAbGluayBHcm91cFByb2ZpbGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXA6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgMXN0IGxheWVyIHtAbGluayBHcm91cFByb2ZpbGV9LiA8YnI+XG4gICAgICogICAgIEEgY29weSBhcnJheSBpcyByZXR1cm5lZCwgc28gdGhlIGNsaWVudCBjYW5ub3QgY2FjaGUgaXQuXG4gICAgICogQGphIOesrDHpmo7lsaTjga4ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg44Kz44OU44O86YWN5YiX44GM6L+U44GV44KM44KL44Gf44KB44CB44Kv44Op44Kk44Ki44Oz44OI44Gv44Kt44Oj44OD44K344Ol5LiN5Y+vXG4gICAgICovXG4gICAgZ2V0VG9wR3JvdXBzKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0VG9wR3JvdXBzKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4cGFuZCBhbGwgZ3JvdXBzICgxc3QgbGF5ZXIpXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWxlemWiyAoMemajuWxpClcbiAgICAgKi9cbiAgICBleHBhbmRBbGwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmV4cGFuZEFsbCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb2xsYXBzZSBhbGwgZ3JvdXBzICgxc3QgbGF5ZXIpXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWPjuadnyAoMemajuWxpClcbiAgICAgKi9cbiAgICBjb2xsYXBzZUFsbChkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5jb2xsYXBzZUFsbChkZWxheSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcuXG4gICAgICogQGphIOWxlemWi+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNFeHBhbmRpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDlj47mnZ/kuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0NvbGxhcHNpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcgb3IgY29sbGFwc2luZy5cbiAgICAgKiBAamEg6ZaL6ZaJ5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc1N3aXRjaGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5jcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gICAgICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gICAgICovXG4gICAgc3RhdHVzQWRkUmVmKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c0FkZFJlZihzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAgICAgKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gICAgICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAgICAgKi9cbiAgICBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhdGUgdmFyaWFibGUgbWFuYWdlbWVudCBzY29wZVxuICAgICAqIEBqYSDnirbmhYvlpInmlbDnrqHnkIbjgrnjgrPjg7zjg5dcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR2YWwgb2Ygc2VlZCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBrumWouaVsOOBruaIu+OCiuWApFxuICAgICAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c1Njb3BlKHN0YXR1cywgZXhlY3V0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBpZiBpdCdzIGluIHRoZSBzcGVjaWZpZWQgc3RhdGUuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+eKtuaFi+S4reOBp+OBguOCi+OBi+eiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZTog54q25oWL5YaFIC8gZmFsc2U6IOeKtuaFi+WkllxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IHdpdGhpbiB0aGUgc3RhdHVzIC8gYGZhbHNlYDogb3V0IG9mIHRoZSBzdGF0dXNcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog54q25oWL5YaFIC8gYGZhbHNlYDog54q25oWL5aSWXG4gICAgICovXG4gICAgaXNTdGF0dXNJbihzdGF0dXM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gaXNTdGF0dXNJbihzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgbGF5b3V0IGtleSDjgpLlj5blvpcgKi9cbiAgICBnZXQgbGF5b3V0S2V5KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmxheW91dEtleTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGxheW91dCBrZXkg44KS6Kit5a6aICovXG4gICAgc2V0IGxheW91dEtleShrZXk6IHN0cmluZykge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmxheW91dEtleSA9IGtleTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBEZXN0cm95IGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOeuoei9hOODh+ODvOOCv+OCkuegtOajhFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHN1cGVyLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5IChhbnkgaWRlbnRpZmllcilcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvCjku7vmhI/jga7orZjliKXlrZAp44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5iYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcGFyYW0gcmVidWlsZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHJlYnVpbGQgdGhlIGxpc3Qgc3RydWN0dXJlXG4gICAgICogIC0gYGphYCDjg6rjgrnjg4jmp4vpgKDjgpLlho3mp4vnr4njgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZCA9IHRydWUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cbn1cbiIsImltcG9ydCAnLi9yZXN1bHQtY29kZS1kZWZzJztcbmV4cG9ydCAqIGZyb20gJy4vaW50ZXJmYWNlcyc7XG5leHBvcnQgKiBmcm9tICcuL2dsb2JhbC1jb25maWcnO1xuZXhwb3J0ICogZnJvbSAnLi9wcm9maWxlJztcbmV4cG9ydCAqIGZyb20gJy4vbGlzdC1pdGVtLXZpZXcnO1xuZXhwb3J0ICogZnJvbSAnLi9saXN0LXZpZXcnO1xuZXhwb3J0ICogZnJvbSAnLi9leHBhbmRhYmxlLWxpc3QtaXRlbS12aWV3JztcbmV4cG9ydCAqIGZyb20gJy4vZXhwYW5kYWJsZS1saXN0LXZpZXcnO1xuXG4vLyBUT0RPOiB0ZXN0XG5leHBvcnQgY29uc3QgVUlfTElTVFZJRVdfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG4iXSwibmFtZXMiOlsic2FmZSIsImlzRnVuY3Rpb24iLCJpMThuIiwicG9zdCIsIm5vb3AiLCJzdHlsZUNvcmUiLCJzdHlsZUJ1dHRvbiIsIiQiLCJhdCIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInRvSGVscFN0cmluZyIsIl9wcm9wZXJ0aWVzIiwiVmlldyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJsdWlkIiwic3RhdHVzQWRkUmVmIiwic3RhdHVzUmVsZWFzZSIsInN0YXR1c1Njb3BlIiwiaXNTdGF0dXNJbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBZWpCOzs7SUFHRztJQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUhELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsa0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxrQkFBMkMsQ0FBQTtZQUMzQyxXQUF1QixDQUFBLFdBQUEsQ0FBQSxzQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEsa0NBQTJCLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBLEdBQUEsc0JBQUEsQ0FBQTtJQUM5SCxLQUFDLEdBQUEsQ0FBQTtJQUNMLENBQUMsR0FBQSxDQUFBOztJQzFCRCxpQkFBd0IsTUFBTSxnQkFBZ0IsR0FBR0EsWUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBOztJQ0FsRjs7O0lBR0c7QUFDSSxVQUFNLFdBQVcsR0FBRyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7SUFlcEU7Ozs7Ozs7SUFPRztBQUNVLFVBQUEs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Q0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEMsUUFBQSxPQUFPLElBQUksQ0FBQztJQUNmLEtBQUE7SUFFRDs7Ozs7Ozs7Ozs7SUFXRztJQUNNLElBQUEsTUFBTSxDQUFDLEdBQVcsRUFBQTtZQUN2QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hELEtBQUE7SUFFRDs7Ozs7Ozs7Ozs7Ozs7SUFjRztJQUNNLElBQUEsT0FBTyxDQUFDLEdBQVcsRUFBRSxPQUFPLEdBQUcsSUFBSSxFQUFBO0lBQ3hDLFFBQUEsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDMUQsS0FBQTtJQUNKLENBQUE7O0lDalBEO0FBQ08sVUFBTSxrQkFBa0IsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC91aS1jb21wb25lbnRzLyJ9