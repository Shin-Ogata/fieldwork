/*!
 * @cdp/ui-components 0.9.22
 *   ui-componets collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, runtime) { 'use strict';

    /*!
     * @cdp/ui-utils 0.9.22
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

    /*!
     * @cdp/ui-forms 0.9.22
     *   UI form components
     */


    const sheet$1 = new CSSStyleSheet();sheet$1.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

    const sheet = new CSSStyleSheet();sheet.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

    const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
    void runtime.post(runtime.noop(sheet$1, sheet));

    /*!
     * @cdp/ui-listview 0.9.22
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
    const _$invalid = runtime.dom(); // eslint-disable-line
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

    exports.ExpandableListItemView = ExpandableListItemView;
    exports.ExpandableListView = ExpandableListView;
    exports.GroupProfile = GroupProfile;
    exports.ItemProfile = ItemProfile;
    exports.ListItemView = ListItemView;
    exports.ListView = ListView;
    exports.ListViewGlobalConfig = ListViewGlobalConfig;
    exports.PageProfile = PageProfile;
    exports.UI_FORMS_STATUS = UI_FORMS_STATUS;
    exports.clearTransition = clearTransition;
    exports.cssPrefixes = cssPrefixes;
    exports.getTransformMatrixValues = getTransformMatrixValues;
    exports.setTransformTransition = setTransformTransition;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5qcyIsInNvdXJjZXMiOlsidWktdXRpbHMvcmVzdWx0LWNvZGUtZGVmcy50cyIsInVpLXV0aWxzL3Nzci50cyIsInVpLXV0aWxzL2Nzcy9taXNjLnRzIiwic2Nzcy9zdHJ1Y3R1cmUuc2NzcyIsInNjc3Mvc3RydWN0dXJlLWJ1dHRvbi5zY3NzIiwidWktZm9ybXMvaW5kZXgudHMiLCJ1aS1saXN0dmlldy9yZXN1bHQtY29kZS1kZWZzLnRzIiwidWktbGlzdHZpZXcvZ2xvYmFsLWNvbmZpZy50cyIsInVpLWxpc3R2aWV3L3Byb2ZpbGUvaXRlbS50cyIsInVpLWxpc3R2aWV3L3Byb2ZpbGUvcGFnZS50cyIsInVpLWxpc3R2aWV3L3Byb2ZpbGUvZ3JvdXAudHMiLCJ1aS1saXN0dmlldy9saXN0LWl0ZW0tdmlldy50cyIsInVpLWxpc3R2aWV3L2NvcmUvZWxlbWVudC1zY3JvbGxlci50cyIsInVpLWxpc3R2aWV3L2NvcmUvbGlzdC50cyIsInVpLWxpc3R2aWV3L2xpc3Qtdmlldy50cyIsInVpLWxpc3R2aWV3L2V4cGFuZGFibGUtbGlzdC1pdGVtLXZpZXcudHMiLCJ1aS1saXN0dmlldy9jb3JlL2V4cGFuZC50cyIsInVpLWxpc3R2aWV3L2V4cGFuZGFibGUtbGlzdC12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGV4cG9ydCBjb25zdCBlbnVtIENEUF9LTk9XTl9VSV9NT0RVTEUge1xuICAgICAgICAvKiogYEBjZHAvdWktdXRpbHNgICovXG4gICAgICAgIFVUSUxTICAgICA9IDEsXG4gICAgICAgIC8qKiBgQGNkcC91aS1saXN0dmlld2AgKi9cbiAgICAgICAgTElTVFZJRVcgID0gMixcbiAgICAgICAgLyoqIG9mZnNldCBmb3IgdW5rbm93biB1aS1tb2R1bGUgKi9cbiAgICAgICAgT0ZGU0VULFxuICAgIH1cblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfVVRJTFMgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLlVUSUxTKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9VVElMU19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9VVElMU19GQVRBTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX1VUSUxTICsgMSwgJ1VJIHV0aWxzIHNvbWV0aGluZyB3cm9uZy4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZ2V0Q29tcHV0ZWRTdHlsZSA9IHNhZmUoZ2xvYmFsVGhpcy5nZXRDb21wdXRlZFN0eWxlKTtcbiIsImltcG9ydCB7IGdldENvbXB1dGVkU3R5bGUgfSBmcm9tICcuLi9zc3InO1xuXG4vKipcbiAqIEBlbiBDU1MgdmVuZG9yIHByZWZpeCBzdHJpbmcgZGVmaW5pdGlvbi5cbiAqIEBqYSBDU1Mg44OZ44Oz44OA44O844OX44Oq44OV44Kj44OD44Kv44K55paH5a2X5YiX5a6a576pXG4gKi9cbmV4cG9ydCBjb25zdCBjc3NQcmVmaXhlcyA9IFsnLXdlYmtpdC0nLCAnLW1vei0nLCAnLW1zLScsICctby0nLCAnJ107XG5cbi8qKlxuICogQGVuIFN0b3JlcyB0aGUgdmFsdWUgc3BlY2lmaWVkIGluIGNzcyBgdHJhbnNmb3JtKDNkKWAuXG4gKiBAamEgY3NzIGB0cmFuc2Zvcm0oM2QpYCDjgavmjIflrprjgZXjgozjgovlgKTjgpLmoLzntI1cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMge1xuICAgIHRyYW5zbGF0ZVg6IG51bWJlcjtcbiAgICB0cmFuc2xhdGVZOiBudW1iZXI7XG4gICAgdHJhbnNsYXRlWjogbnVtYmVyO1xuICAgIHNjYWxlWDogbnVtYmVyO1xuICAgIHNjYWxlWTogbnVtYmVyO1xuICAgIHNjYWxlWjogbnVtYmVyO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIHRoZSB0cmFuc2Zvcm0gbWF0cml4IHNwZWNpZmllZCBpbiBgRWxlbWVudGAuXG4gKiBAamEgYEVsZW1lbnRgIOOBq+aMh+WumuOBleOCjOOBnyB0cmFuc2Zvcm0g6KGM5YiX44Gu5YCk44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgRWxlbWVudGAgaW5zdGFuY2VcbiAqICAtIGBqYWAg5a++6LGhIGBFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGNvbnN0IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyA9IChlbDogRWxlbWVudCk6IFRyYW5zZm9ybU1hdHJpeFZhbHVlcyA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICBjb25zdCB7IG0xMSwgbTIyLCBtMzMsIG00MSwgbTQyLCBtNDMgfSA9IG5ldyBET01NYXRyaXhSZWFkT25seShzdHlsZS50cmFuc2Zvcm0pO1xuICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zbGF0ZVg6IG00MSxcbiAgICAgICAgdHJhbnNsYXRlWTogbTQyLFxuICAgICAgICB0cmFuc2xhdGVaOiBtNDMsXG4gICAgICAgIHNjYWxlWDogbTExLFxuICAgICAgICBzY2FsZVk6IG0yMixcbiAgICAgICAgc2NhbGVaOiBtMzMsXG4gICAgfTtcbn07XG5cbi8qKlxuICogQGVuIFNldHRpbmcgcHJvcGVydHkgY29udmVyc2lvbiBhbmltYXRpb24gdXNpbmcgY3NzIHRyYW5zaXRpb24gZm9yIHNwZWNpZmllZCBlbGVtZW50LlxuICogQGphIOaMh+Wumuimgee0oOOBq+WvvuOBl+OBpiBjc3MgdHJhbnNpdGlvbiDjgpLnlKjjgYTjgZ/jg5fjg63jg5Hjg4bjgqPlpInmj5vjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7oqK3lrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGFyZ2V0IGBIVE1MRWxlbWVudGAgaW5zdGFuY2VcbiAqICAtIGBqYWAg5a++6LGhIGBIVE1MRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K5XG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZSBbZXg6IGhlaWdodF1cbiAqICAtIGBqYWAg5a++6LGh44OX44Ot44OR44OG44Kj5ZCNIFtleDogaGVpZ2h0XVxuICogQHBhcmFtIG1zZWNcbiAqICAtIGBlbmAgYW5pbWF0aW9uIGR1cmF0aW9uIFttc2VjXVxuICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7PmmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIG5hbWUgW2RlZmF1bHQ6IGVhc2VdXG4gKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsOWQjSBbZGVmYXVsdDogZWFzZV1cbiAqL1xuZXhwb3J0IGNvbnN0IHNldFRyYW5zZm9ybVRyYW5zaXRpb24gPSAoZWw6IEhUTUxFbGVtZW50LCBwcm9wOiBzdHJpbmcsIG1zZWM6IG51bWJlciwgdGltaW5nRnVuY3Rpb24gPSAnZWFzZScpOiB2b2lkID0+IHtcbiAgICBjb25zdCBhbmltYXRpb24gPSBgJHsobXNlYyAvIDEwMDApfXMgJHt0aW1pbmdGdW5jdGlvbn1gO1xuICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCd0cmFuc2l0aW9uJywgYCR7cHJvcH0gJHthbmltYXRpb259LCB0cmFuc2Zvcm0gJHthbmltYXRpb259YCk7XG59O1xuXG5cbi8qKlxuICogQGVuIENsZWFyIGNzcyB0cmFuc2l0aW9uIHNldHRpbmdzIGZvciBzcGVjaWZpZWQgZWxlbWVudC5cbiAqIEBqYSDmjIflrpropoHntKDjga4gY3NzIHRyYW5zaXRpb24g6Kit5a6a44KS6Kej6ZmkXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgSFRNTEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgSFRNTEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgY29uc3QgY2xlYXJUcmFuc2l0aW9uID0gKGVsOiBIVE1MRWxlbWVudCk6IHZvaWQgPT4ge1xuICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd0cmFuc2l0aW9uJyk7XG59O1xuIixudWxsLG51bGwsImV4cG9ydCBjb25zdCBVSV9GT1JNU19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcblxuaW1wb3J0IHsgbm9vcCwgcG9zdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbmltcG9ydCBzdHlsZUNvcmUgZnJvbSAnQGNzcy9zdHJ1Y3R1cmUuY3NzJyB3aXRoIHsgdHlwZTogJ2NzcycgfTtcbmltcG9ydCBzdHlsZUJ1dHRvbiBmcm9tICdAY3NzL3N0cnVjdHVyZS1idXR0b24uY3NzJyB3aXRoIHsgdHlwZTogJ2NzcycgfTtcblxudm9pZCBwb3N0KG5vb3Aoc3R5bGVDb3JlLCBzdHlsZUJ1dHRvbikpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBVSV9MSVNUVklFVyA9IChDRFBfS05PV05fTU9EVUxFLk9GRlNFVCArIENEUF9LTk9XTl9VSV9NT0RVTEUuTElTVFZJRVcpICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIFVJX0xJU1RWSUVXX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04gPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDEsICdsaXN0dmlldyBoYXMgaW52YWxpZCBpbml0aWFsaXphdGlvbi4nKSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMiwgJ2xpc3R2aWV3IGdpdmVuIGEgaW52YWxpZCBwYXJhbS4nKSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9PUEVSQVRJT04gICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMywgJ2xpc3R2aWV3IGludmFsaWQgb3BlcmF0aW9uLicpLFxuICAgIH1cbn1cbiIsIi8qKlxuICogQGVuIEdsb2JhbCBjb25maWd1cmF0aW9uIGRlZmluaXRpb24gZm9yIGxpc3Qgdmlld3MuXG4gKiBAamEg44Oq44K544OI44OT44Ol44O844Gu44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Os44O844K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdFZpZXdHbG9iYWxDb25maWcge1xuICAgIE5BTUVTUEFDRTogc3RyaW5nO1xuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHN0cmluZztcbiAgICBJTkFDVElWRV9DTEFTUzogc3RyaW5nO1xuICAgIFJFQ1lDTEVfQ0xBU1M6IHN0cmluZztcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBzdHJpbmc7XG4gICAgREFUQV9QQUdFX0lOREVYOiBzdHJpbmc7XG4gICAgREFUQV9JVEVNX0lOREVYOiBzdHJpbmc7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVmYXVsdFYge1xuICAgIE5BTUVTUEFDRSAgICAgICAgICAgPSAnY2RwLXVpJywgLy8gVE9ETzogbmFtZXNwYWNlIOOBryB1dGlscyDjgavnp7vjgZlcbiAgICBTQ1JPTExfTUFQX0NMQVNTICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1zY3JvbGwtbWFwYCxcbiAgICBJTkFDVElWRV9DTEFTUyAgICAgID0gYCR7TkFNRVNQQUNFfS1pbmFjdGl2ZWAsXG4gICAgUkVDWUNMRV9DTEFTUyAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctcmVjeWNsZWAsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUyA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctaXRlbS1iYXNlYCxcbiAgICBEQVRBX1BBR0VfSU5ERVggICAgID0gJ2RhdGEtcGFnZS1pbmRleCcsXG4gICAgREFUQV9JVEVNX0lOREVYICAgICA9ICdkYXRhLWl0ZW0taW5kZXgnLFxufVxuXG5jb25zdCBfY29uZmlnID0ge1xuICAgIE5BTUVTUEFDRTogRGVmYXVsdFYuTkFNRVNQQUNFLFxuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IERlZmF1bHRWLlNDUk9MTF9NQVBfQ0xBU1MsXG4gICAgSU5BQ1RJVkVfQ0xBU1M6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTLFxuICAgIFJFQ1lDTEVfQ0xBU1M6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1MsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogRGVmYXVsdFYuTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICBEQVRBX1BBR0VfSU5ERVg6IERlZmF1bHRWLkRBVEFfUEFHRV9JTkRFWCxcbiAgICBEQVRBX0lURU1fSU5ERVg6IERlZmF1bHRWLkRBVEFfSVRFTV9JTkRFWCxcbn07XG5cbmV4cG9ydCB0eXBlIExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnID0gUGFydGlhbDxcbiAgICBQaWNrPExpc3RWaWV3R2xvYmFsQ29uZmlnXG4gICAgICAgICwgJ05BTUVTUEFDRSdcbiAgICAgICAgfCAnU0NST0xMX01BUF9DTEFTUydcbiAgICAgICAgfCAnSU5BQ1RJVkVfQ0xBU1MnXG4gICAgICAgIHwgJ1JFQ1lDTEVfQ0xBU1MnXG4gICAgICAgIHwgJ0xJU1RJVEVNX0JBU0VfQ0xBU1MnXG4gICAgICAgIHwgJ0RBVEFfUEFHRV9JTkRFWCdcbiAgICAgICAgfCAnREFUQV9JVEVNX0lOREVYJ1xuICAgID5cbj47XG5cbmNvbnN0IGVuc3VyZU5ld0NvbmZpZyA9IChuZXdDb25maWc6IExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnKTogUGFydGlhbDxMaXN0Vmlld0dsb2JhbENvbmZpZz4gPT4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgTkFNRVNQQUNFOiBucyxcbiAgICAgICAgU0NST0xMX01BUF9DTEFTUzogc2Nyb2xsbWFwLFxuICAgICAgICBJTkFDVElWRV9DTEFTUzogaW5hY3RpdmUsXG4gICAgICAgIFJFQ1lDTEVfQ0xBU1M6IHJlY3ljbGUsXG4gICAgICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IGl0ZW1iYXNlLFxuICAgICAgICBEQVRBX1BBR0VfSU5ERVg6IGRhdGFwYWdlLFxuICAgICAgICBEQVRBX0lURU1fSU5ERVg6IGRhdGFpdGVtLFxuICAgIH0gPSBuZXdDb25maWc7XG5cbiAgICBjb25zdCBOQU1FU1BBQ0UgPSBucztcbiAgICBjb25zdCBTQ1JPTExfTUFQX0NMQVNTID0gc2Nyb2xsbWFwID8/IChucyA/IGAke25zfS1saXN0dmlldy1zY3JvbGwtbWFwYCA6IHVuZGVmaW5lZCk7XG4gICAgY29uc3QgSU5BQ1RJVkVfQ0xBU1MgPSBpbmFjdGl2ZSA/PyAobnMgPyBgJHtuc30taW5hY3RpdmVgIDogdW5kZWZpbmVkKTtcbiAgICBjb25zdCBSRUNZQ0xFX0NMQVNTID0gcmVjeWNsZSA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctcmVjeWNsZWAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IExJU1RJVEVNX0JBU0VfQ0xBU1MgPSBpdGVtYmFzZSA/PyAobnMgPyBgJHtuc30tbGlzdHZpZXctaXRlbS1iYXNlYCA6IHVuZGVmaW5lZCk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXdDb25maWcsIHtcbiAgICAgICAgTkFNRVNQQUNFLFxuICAgICAgICBTQ1JPTExfTUFQX0NMQVNTLFxuICAgICAgICBJTkFDVElWRV9DTEFTUyxcbiAgICAgICAgUkVDWUNMRV9DTEFTUyxcbiAgICAgICAgTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICAgICAgREFUQV9QQUdFX0lOREVYOiBkYXRhcGFnZSxcbiAgICAgICAgREFUQV9JVEVNX0lOREVYOiBkYXRhaXRlbSxcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIEdldC9VcGRhdGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gb2YgbGlzdCB2aWV3LlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+OBruWPluW+ly/mm7TmlrBcbiAqL1xuZXhwb3J0IGNvbnN0IExpc3RWaWV3R2xvYmFsQ29uZmlnID0gKG5ld0NvbmZpZz86IExpc3RWaWV3R2xvYmFsQ29uZmlnQXJnKTogTGlzdFZpZXdHbG9iYWxDb25maWcgPT4ge1xuICAgIGlmIChuZXdDb25maWcpIHtcbiAgICAgICAgZW5zdXJlTmV3Q29uZmlnKG5ld0NvbmZpZyk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG5ld0NvbmZpZykpIHtcbiAgICAgICAgICAgIGlmICh1bmRlZmluZWQgPT09IG5ld0NvbmZpZ1trZXkgYXMga2V5b2YgTGlzdFZpZXdHbG9iYWxDb25maWdBcmddKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIG5ld0NvbmZpZ1trZXkgYXMga2V5b2YgTGlzdFZpZXdHbG9iYWxDb25maWdBcmddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBPYmplY3QuYXNzaWduKF9jb25maWcsIG5ld0NvbmZpZykpO1xufTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHsgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzIH0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RJdGVtVmlldyxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB7IExpc3RWaWV3R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vZ2xvYmFsLWNvbmZpZyc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBsaXN0IGl0ZW1zLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEl0ZW1Qcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3I7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luZm86IFVua25vd25PYmplY3Q7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleD86IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsIGJlbG9uZ2luZyBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfcGFnZUluZGV4PzogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgZ2xvYmFsIG9mZnNldCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBiYXNlIGRvbSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgXyRiYXNlPzogRE9NO1xuICAgIC8qKiBAaW50ZXJuYWwgSUxpc3RJdGVtVmlldyBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX2luc3RhbmNlPzogSUxpc3RJdGVtVmlldztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJTGlzdFZpZXdDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7liJ3mnJ/jga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElMaXN0Q29udGV4dCwgaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIF9pbmZvOiBVbmtub3duT2JqZWN0KSB7XG4gICAgICAgIHRoaXMuX293bmVyICAgICAgID0gb3duZXI7XG4gICAgICAgIHRoaXMuX2hlaWdodCAgICAgID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplciA9IGluaXRpYWxpemVyO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgICA9IF9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBoZWlnaHQuICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBpdGVtJ3MgZ2xvYmFsIGluZGV4LiAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBnZXQgcGFnZUluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYWdlSW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCBiZWxvbmdpbmcgdGhlIHBhZ2UgaW5kZXguICovXG4gICAgc2V0IHBhZ2VJbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX3BhZ2VJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgZ2xvYmFsIG9mZnNldC4gKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIHNldCBvZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgaW5pdCBwYXJhbWV0ZXJzLiAqL1xuICAgIGdldCBpbmZvKCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5mbztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZSA9IHRoaXMucHJlcGFyZUJhc2VFbGVtZW50KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUluZGV4KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgICAgIGVsOiB0aGlzLl8kYmFzZSxcbiAgICAgICAgICAgICAgICBvd25lcjogdGhpcy5fb3duZXIsXG4gICAgICAgICAgICAgICAgaXRlbTogdGhpcyxcbiAgICAgICAgICAgIH0sIHRoaXMuX2luZm8pO1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSBuZXcgdGhpcy5faW5pdGlhbGl6ZXIob3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoJ25vbmUnID09PSB0aGlzLl8kYmFzZS5jc3MoJ2Rpc3BsYXknKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAndmlzaWJsZScgIT09IHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIGl0ZW0gaW52aXNpYmxlLlxuICAgICAqIEBqYSBpdGVtIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAnaGlkZGVuJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5hZGRDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZnJlc2ggdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5pu05pawXG4gICAgICovXG4gICAgcHVibGljIHJlZnJlc2goKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW5kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgYWN0aXZhdGlvbiBzdGF0dXMgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5rS75oCn54q25oWL5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9pbnN0YW5jZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGhlaWdodCBpbmZvcm1hdGlvbiBvZiB0aGUgaXRlbS4gQ2FsbGVkIGZyb20ge0BsaW5rIExpc3RJdGVtVmlld30uXG4gICAgICogQGphIGl0ZW0g44Gu6auY44GV5oOF5aCx44Gu5pu05pawLiB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gbmV3SGVpZ2h0IC0gdGhpcy5faGVpZ2h0O1xuICAgICAgICB0aGlzLl9oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YSk7XG4gICAgICAgIGlmIChvcHRpb25zPy5yZWZsZWN0QWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGVQcm9maWxlcyh0aGlzLl9pbmRleCA/PyAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXNldCB6LWluZGV4LiBDYWxsZWQgZnJvbSB7QGxpbmsgU2Nyb2xsTWFuYWdlcn1gLnJlbW92ZUl0ZW0oKWAuXG4gICAgICogQGphIHotaW5kZXgg44Gu44Oq44K744OD44OILiB7QGxpbmsgU2Nyb2xsTWFuYWdlcn1gLnJlbW92ZUl0ZW0oKWAg44GL44KJ44Kz44O844Or44GV44KM44KL44CCXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0RGVwdGgoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCd6LWluZGV4JywgdGhpcy5fb3duZXIub3B0aW9ucy5iYXNlRGVwdGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHByZXBhcmVCYXNlRWxlbWVudCgpOiBET00ge1xuICAgICAgICBsZXQgJGJhc2U6IERPTTtcbiAgICAgICAgY29uc3QgJHJlY3ljbGUgPSB0aGlzLl9vd25lci5maW5kUmVjeWNsZUVsZW1lbnRzKCkuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgaXRlbVRhZ05hbWUgPSB0aGlzLl9vd25lci5vcHRpb25zLml0ZW1UYWdOYW1lO1xuXG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ3RoaXMuXyRiYXNlIGlzIG5vdCBudWxsLicpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuXyRiYXNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCAkcmVjeWNsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICRiYXNlID0gJHJlY3ljbGU7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVBdHRyKCd6LWluZGV4Jyk7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUT0RPOiAg6KaB5qSc6KiOLiA8bGk+IOWFqOiIrOOBryA8c2xvdD4g44Go44Gp44Gu44KI44GG44Gr5Y2U6Kq/44GZ44KL44GLP1xuICAgICAgICAgICAgJGJhc2UgPSAkKGA8JHtpdGVtVGFnTmFtZX0gY2xhc3M9XCIke3RoaXMuX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTfVwiPjwvXCIke2l0ZW1UYWdOYW1lfVwiPmApO1xuICAgICAgICAgICAgJGJhc2UuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLiRzY3JvbGxNYXAuYXBwZW5kKCRiYXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOmrmOOBleOBruabtOaWsFxuICAgICAgICBpZiAoJGJhc2UuaGVpZ2h0KCkgIT09IHRoaXMuX2hlaWdodCkge1xuICAgICAgICAgICAgJGJhc2UuaGVpZ2h0KHRoaXMuX2hlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGJhc2U7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgpICE9PSBTdHJpbmcodGhpcy5faW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0lURU1fSU5ERVgsIHRoaXMuX2luZGV4ISk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVQYWdlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpICE9PSBTdHJpbmcodGhpcy5fcGFnZUluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9QQUdFX0lOREVYLCB0aGlzLl9wYWdlSW5kZXghKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZU9mZnNldCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl8kYmFzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX293bmVyLm9wdGlvbnMuZW5hYmxlVHJhbnNmb3JtT2Zmc2V0KSB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zbGF0ZVkgfSA9IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyh0aGlzLl8kYmFzZVswXSk7XG4gICAgICAgICAgICBpZiAodHJhbnNsYXRlWSAhPT0gdGhpcy5fb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlM2QoMCwke3RoaXMuX29mZnNldH1weCwwYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0b3AgPSBwYXJzZUludCh0aGlzLl8kYmFzZS5jc3MoJ3RvcCcpLCAxMCk7XG4gICAgICAgICAgICBpZiAodG9wICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RvcCcsIGAke3RoaXMuX29mZnNldH1weGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgYXQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vaXRlbSc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBvbmUgcGFnZSBvZiB0aGUgbGlzdC5cbiAqIEBqYSDjg6rjgrnjg4gx44Oa44O844K45YiG44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgUGFnZVByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcbiAgICAvKiogQGludGVybmFsIHBhZ2Ugb2Zmc2V0IGZyb20gdG9wICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIHBhZ2UncyBoZWlnaHQgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgaXRlbSdzIHByb2ZpbGUgbWFuYWdlZCB3aXRoIGluIHBhZ2UgKi9cbiAgICBwcml2YXRlIF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBzdGF0dXMgKi9cbiAgICBwcml2YXRlIF9zdGF0dXM6ICdhY3RpdmUnIHwgJ2luYWN0aXZlJyB8ICdoaWRkZW4nID0gJ2luYWN0aXZlJztcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIHBhZ2UgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIHBhZ2UgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2Ugb2Zmc2V0ICovXG4gICAgZ2V0IG9mZnNldCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIHBhZ2Ugb2Zmc2V0ICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBoZWlnaHQgKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBzdGF0dXMgKi9cbiAgICBnZXQgc3RhdHVzKCk6ICdhY3RpdmUnIHwgJ2luYWN0aXZlJyB8ICdoaWRkZW4nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnYWN0aXZlJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2FjdGl2ZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIHBhZ2UgaW52aXNpYmxlLlxuICAgICAqIEBqYSBwYWdlIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2hpZGRlbicgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2hpZGRlbic7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIHBhZ2UuXG4gICAgICogQGphIHBhZ2Ug44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaW5hY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdpbmFjdGl2ZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB7QGxpbmsgSXRlbVByb2ZpbGV9IHRvIHRoZSBwYWdlLlxuICAgICAqIEBqYSB7QGxpbmsgSXRlbVByb2ZpbGV9IOOBrui/veWKoFxuICAgICAqL1xuICAgIHB1YmxpYyBwdXNoKGl0ZW06IEl0ZW1Qcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2l0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIHRoaXMuX2hlaWdodCArPSBpdGVtLmhlaWdodDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSWYgYWxsIHtAbGluayBJdGVtUHJvZmlsZX0gdW5kZXIgdGhlIHBhZ2UgYXJlIG5vdCB2YWxpZCwgZGlzYWJsZSB0aGUgcGFnZSdzIHN0YXR1cy5cbiAgICAgKiBAamEg6YWN5LiL44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44GZ44G544Gm44GM5pyJ5Yq544Gn44Gq44GE5aC05ZCILCBwYWdlIOOCueODhuODvOOCv+OCueOCkueEoeWKueOBq+OBmeOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBub3JtYWxpemUoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuYWJsZUFsbCA9IHRoaXMuX2l0ZW1zLmV2ZXJ5KGl0ZW0gPT4gaXRlbS5pc0FjdGl2ZSgpKTtcbiAgICAgICAgaWYgKCFlbmFibGVBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXR1cyA9ICdpbmFjdGl2ZSc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBJdGVtUHJvZmlsZX0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumuOBl+OBpiB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtKGluZGV4OiBudW1iZXIpOiBJdGVtUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLl9pdGVtcywgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZmlyc3Qge0BsaW5rIEl0ZW1Qcm9maWxlfS5cbiAgICAgKiBAamEg5pyA5Yid44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW1GaXJzdCgpOiBJdGVtUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pdGVtc1swXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGxhc3Qge0BsaW5rIEl0ZW1Qcm9maWxlfS5cbiAgICAgKiBAamEg5pyA5b6M44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW1MYXN0KCk6IEl0ZW1Qcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zW3RoaXMuX2l0ZW1zLmxlbmd0aCAtIDFdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VSZXN1bHQsXG4gICAgdG9IZWxwU3RyaW5nLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2Jhc2UnO1xuaW1wb3J0IHR5cGUgeyBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2xpc3QtaXRlbS12aWV3JztcbmltcG9ydCB0eXBlIHsgSUV4cGFuZGFibGVMaXN0Q29udGV4dCB9IGZyb20gJy4uL2ludGVyZmFjZXMvZXhwYW5kYWJsZS1jb250ZXh0JztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuLyoqXG4gKiBAZW4gVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIHN0b3JhZ2UgY2xhc3MgZm9yIGdyb3VwIG1hbmFnZW1lbnQgb2YgbGlzdCBpdGVtcy4gPGJyPlxuICogICAgIFRoaXMgY2xhc3MgZG9lcyBub3QgZGlyZWN0bHkgbWFuaXB1bGF0ZSB0aGUgRE9NLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOCkuOCsOODq+ODvOODl+euoeeQhuOBmeOCiyBVSSDmp4vpgKDmg4XloLHmoLzntI3jgq/jg6njgrkgPGJyPlxuICogICAgIOacrOOCr+ODqeOCueOBr+ebtOaOpeOBryBET00g44KS5pON5L2c44GX44Gq44GEXG4gKi9cbmV4cG9ydCBjbGFzcyBHcm91cFByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgcHJvZmlsZSBpZCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2lkOiBzdHJpbmc7XG4gICAgLyoqIEBpbnRlcm5hbCB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSBpbnN0YW5jZSovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQ7XG4gICAgLyoqIEBpbnRlcm5hbCBwYXJlbnQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgKi9cbiAgICBwcml2YXRlIF9wYXJlbnQ/OiBHcm91cFByb2ZpbGU7XG4gICAgLyoqIEBpbnRlcm5hbCBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBhcnJheSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2NoaWxkcmVuOiBHcm91cFByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiBAaW50ZXJuYWwgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzICovXG4gICAgcHJpdmF0ZSBfZXhwYW5kZWQgPSBmYWxzZTtcbiAgICAvKiogQGludGVybmFsIHJlZ2lzdHJhdGlvbiBzdGF0dXMgZm9yIF9vd25lciAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcgPSAndW5yZWdpc3RlcmVkJztcbiAgICAvKiogQGludGVybmFsIHN0b3JlZCB7QGxpbmsgSXRlbVByb2ZpbGV9IGluZm9ybWF0aW9uICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJRXhwYW5kYWJsZUxpc3RDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgaWQgb2YgdGhlIGluc3RhbmNlLiBzcGVjaWZpZWQgYnkgdGhlIGZyYW1ld29yay5cbiAgICAgKiAgLSBgamFgIOOCpOODs+OCueOCv+ODs+OCueOBriBJRC4g44OV44Os44O844Og44Ov44O844Kv44GM5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQsIGlkOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5faWQgICAgPSBpZDtcbiAgICAgICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IElELlxuICAgICAqIEBqYSBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBlbiBHZXQgc3RhdHVzLiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqIEBqYSDjgrnjg4bjg7zjgr/jgrnjgpLlj5blvpcgJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCdcbiAgICAgKi9cbiAgICBnZXQgc3RhdHVzKCk6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgZXhwYW5kZWQgLyBjb2xsYXBzZWQgc3RhdHVzLlxuICAgICAqIEBqYSDlsZXplovnirbmhYvjgpLliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleHBhbmRlZCwgY29sbGFwc2VkOiBjbG9zZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5bGV6ZaLLCBmYWxzZTog5Y+O5p2fXG4gICAgICovXG4gICAgZ2V0IGlzRXhwYW5kZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHBhbmRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg6KaqIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBwYXJlbnQoKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNoaWxkcmVuIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNoaWxkcmVuKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkcmVuO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbmV4dCBhdmFpbGFibGUgaW5kZXggb2YgdGhlIGxhc3QgaXRlbSBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDlvozjga4gaXRlbSDopoHntKDjga7mrKHjgavkvb/nlKjjgafjgY3jgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gd2l0aEFjdGl2ZUNoaWxkcmVuIFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHNlYXJjaCBpbmNsdWRpbmcgcmVnaXN0ZXJlZCBjaGlsZCBlbGVtZW50c1xuICAgICAqICAtIGBqYWAg55m76Yyy5riI44G/44Gu5a2Q6KaB57Sg44KS5ZCr44KB44Gm5qSc57Si44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGdldE5leHRJdGVtSW5kZXgod2l0aEFjdGl2ZUNoaWxkcmVuID0gZmFsc2UpOiBudW1iZXIge1xuICAgICAgICBsZXQgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgaWYgKHdpdGhBY3RpdmVDaGlsZHJlbikge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCA9PSBpdGVtcyB8fCBpdGVtcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLl9pdGVtcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGl0ZW1zW2l0ZW1zLmxlbmd0aCAtIDFdPy5pbmRleCA/PyAwKSArIDE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSDmnKwgR3JvdXBQcm9maWxlIOOBjOeuoeeQhuOBmeOCiyBpdGVtIOOCkuS9nOaIkOOBl+OBpueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkSXRlbShcbiAgICAgICAgaGVpZ2h0OiBudW1iZXIsXG4gICAgICAgIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG4gICAgICAgIGluZm86IFVua25vd25PYmplY3QsXG4gICAgKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBncm91cDogdGhpcyB9LCBpbmZvKTtcbiAgICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtUHJvZmlsZSh0aGlzLl9vd25lci5jb250ZXh0LCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBfb3duZXIg44Gu566h55CG5LiL44Gr44GC44KL44Go44GN44Gv6YCf44KE44GL44Gr6L+95YqgXG4gICAgICAgIGlmICgncmVnaXN0ZXJlZCcgPT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbSwgdGhpcy5nZXROZXh0SXRlbUluZGV4KCkpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faXRlbXMucHVzaChpdGVtKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBHcm91cFByb2ZpbGV9IGFzIGNoaWxkIGVsZW1lbnQuXG4gICAgICogQGphIOWtkOimgee0oOOBqOOBl+OBpiB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXQge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgLyBpbnN0YW5jZSBhcnJheVxuICAgICAqL1xuICAgIHB1YmxpYyBhZGRDaGlsZHJlbih0YXJnZXQ6IEdyb3VwUHJvZmlsZSB8IEdyb3VwUHJvZmlsZVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNoaWxkcmVuOiBHcm91cFByb2ZpbGVbXSA9IEFycmF5LmlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFt0YXJnZXRdO1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgICAgICBjaGlsZC5zZXRQYXJlbnQodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2hpbGRyZW4ucHVzaCguLi5jaGlsZHJlbik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgaWYgaXQgaGFzIGEgY2hpbGQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMsIGZhbHNlOiB1bmV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJLCBmYWxzZTog54ShXG4gICAgICovXG4gICAgZ2V0IGhhc0NoaWxkcmVuKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9jaGlsZHJlbi5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwIGV4cGFuc2lvbi5cbiAgICAgKiBAamEg44Kw44Or44O844OX5bGV6ZaLXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGV4cGFuZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgncmVnaXN0ZXJlZCcpO1xuICAgICAgICAgICAgaWYgKDAgPCBpdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9vd25lci5zdGF0dXNTY29wZSgnZXhwYW5kaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIuX2FkZEl0ZW0oaXRlbXMsIHRoaXMuZ2V0TmV4dEl0ZW1JbmRleCgpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5bGV6ZaL54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgY29sbGFwc2UuXG4gICAgICogQGphIOOCsOODq+ODvOODl+WPjuadn1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGNvbGxhcHNlKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgndW5yZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gdGhpcy5fb3duZXIuY29udGV4dC5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdjb2xsYXBzaW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rouqvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyDphY3kuIvjgpLmm7TmlrBcbiAgICAgICAgICAgICAgICAgICAgaXRlbXNbMF0uaW5kZXggJiYgdGhpcy5fb3duZXIucmVtb3ZlSXRlbShpdGVtc1swXS5pbmRleCwgaXRlbXMubGVuZ3RoLCBkZWxheSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIOWtkOimgee0oOOBjOOBquOBj+OBpuOCguWPjuadn+eKtuaFi+OBq+OBmeOCi1xuICAgICAgICB0aGlzLl9leHBhbmRlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG93IHNlbGYgaW4gdmlzaWJsZSBhcmVhIG9mIGxpc3QuXG4gICAgICogQGphIOiHqui6q+OCkuODquOCueODiOOBruWPr+imlumgmOWfn+OBq+ihqOekulxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IG9wdGlvbidzIG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICgwIDwgdGhpcy5faXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAobnVsbCAhPSB0aGlzLl9pdGVtc1swXS5pbmRleCkgJiYgYXdhaXQgdGhpcy5fb3duZXIuZW5zdXJlVmlzaWJsZSh0aGlzLl9pdGVtc1swXS5pbmRleCwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zPy5jYWxsYmFjaz8uKHRoaXMuX293bmVyLnNjcm9sbFBvcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVG9nZ2xlIGV4cGFuZCAvIGNvbGxhcHNlLlxuICAgICAqIEBqYSDplovplonjga7jg4jjgrDjg6tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSBzcGVudCByZW1vdmluZyBlbGVtZW50cy4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICogIC0gYGphYCDopoHntKDliYrpmaTjgavosrvjgoTjgZnpgYXlu7bmmYLplpMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyB0b2dnbGUoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2V4cGFuZGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNvbGxhcHNlKGRlbGF5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZXhwYW5kKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgdG8gbGlzdCB2aWV3LiBPbmx5IDFzdCBsYXllciBncm91cCBjYW4gYmUgcmVnaXN0ZXJlZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G455m76YyyLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/55m76Yyy5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIGluc2VydFRvXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGluc2VydGlvbiBwb3NpdGlvbiB3aXRoIGluZGV4XG4gICAgICogIC0gYGphYCDmjL/lhaXkvY3nva7jgpIgaW5kZXgg44Gn5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlZ2lzdGVyKGluc2VydFRvOiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gJ0dyb3VwUHJvZmlsZSNyZWdpc3RlcicgbWV0aG9kIGlzIGFjY2VwdGFibGUgb25seSAxc3QgbGF5ZXIgZ3JvdXAuYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbSh0aGlzLnByZXByb2Nlc3MoJ3JlZ2lzdGVyZWQnKSwgaW5zZXJ0VG8pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdG9yZSB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSBzcGVjaWZpZWQuXG4gICAgICogQGphIOODquOCueODiOODk+ODpeODvOOBuOW+qeWFgy4g56ysMemajuWxpOOCsOODq+ODvOODl+OBruOBv+aMh+ekuuWPr+iDvS5cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzdG9yZSgpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gJ0dyb3VwUHJvZmlsZSNyZXN0b3JlJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMuX2V4cGFuZGVkID8gdGhpcy5faXRlbXMuY29uY2F0KHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ2FjdGl2ZScpKSA6IHRoaXMuX2l0ZW1zLnNsaWNlKCk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsIOimqiBHcm91cCDmjIflrpogKi9cbiAgICBwcml2YXRlIHNldFBhcmVudChwYXJlbnQ6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAgcmVnaXN0ZXIgLyB1bnJlZ2lzdGVyIOOBruWJjeWHpueQhiAqL1xuICAgIHByaXZhdGUgcHJlcHJvY2VzcyhuZXdTdGF0dXM6ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnKTogSXRlbVByb2ZpbGVbXSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGlmIChuZXdTdGF0dXMgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgaXRlbXMucHVzaCguLi50aGlzLl9pdGVtcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gbmV3U3RhdHVzO1xuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCDmk43kvZzlr77osaHjga4gSXRlbVByb2ZpbGUg6YWN5YiX44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBxdWVyeU9wZXJhdGlvblRhcmdldChvcGVyYXRpb246ICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnIHwgJ2FjdGl2ZScpOiBJdGVtUHJvZmlsZVtdIHtcbiAgICAgICAgY29uc3QgZmluZFRhcmdldHMgPSAoZ3JvdXA6IEdyb3VwUHJvZmlsZSk6IEl0ZW1Qcm9maWxlW10gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZ3JvdXAuX2NoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVnaXN0ZXJlZCc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VucmVnaXN0ZXJlZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkLnByZXByb2Nlc3Mob3BlcmF0aW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWN0aXZlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNoaWxkLl9pdGVtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGQuX2l0ZW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIG9wZXJhdGlvbjogJHtvcGVyYXRpb259YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5maW5kVGFyZ2V0cyhjaGlsZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZpbmRUYXJnZXRzKHRoaXMpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFZpZXcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBvd25lcjogSUxpc3RWaWV3O1xuICAgIHJlYWRvbmx5IGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayBMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDmp4vnr4njgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgb3duZXI6IElMaXN0VmlldztcbiAgICBpdGVtOiBJdGVtUHJvZmlsZTtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBpdGVtIGNvbnRhaW5lciBjbGFzcyBoYW5kbGVkIGJ5IHtAbGluayBMaXN0Vmlld30uXG4gKiBAamEge0BsaW5rIExpc3RWaWV3fSDjgYzmibHjgYbjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgrPjg7Pjg4bjg4rjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpc3RJdGVtVmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PlxuICAgIGV4dGVuZHMgVmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElMaXN0SXRlbVZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgeyBvd25lciwgaXRlbSB9ID0gb3B0aW9ucztcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBvd25lcixcbiAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgIH07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKiogT3duZXIg5Y+W5b6XICovXG4gICAgZ2V0IG93bmVyKCk6IElMaXN0VmlldyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5vd25lcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBWaWV3IGNvbXBvbmVudCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuJGVsLmNoaWxkcmVuKCkucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xuICAgICAgICAvLyB0aGlzLiRlbCDjga/lho3liKnnlKjjgZnjgovjgZ/jgoHlrozlhajjgarnoLTmo4Tjga/jgZfjgarjgYRcbiAgICAgICAgdGhpcy5zZXRFbGVtZW50KCdudWxsJyk7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEl0ZW1WaWV3XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IG93biBpdGVtIGluZGV4XG4gICAgICogQGphIOiHqui6q+OBriBpdGVtIOOCpOODs+ODh+ODg+OCr+OCueOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uaXRlbS5pbmRleCE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBzcGVjaWZpZWQgaGVpZ2h0LlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/pq5jjgZXjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLmhlaWdodDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgaWYgY2hpbGQgbm9kZSBleGlzdHMuXG4gICAgICogQGphIGNoaWxkIG5vZGUg44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGhhc0NoaWxkTm9kZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy4kZWw/LmNoaWxkcmVuKCkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaXRlbSdzIGhlaWdodC5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXjgpLmm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdIZWlnaHRcbiAgICAgKiAgLSBgZW5gIG5ldyBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaWsOOBl+OBhOmrmOOBlVxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB1cGRhdGUgb3B0aW9ucyBvYmplY3RcbiAgICAgKiAgLSBgamFgIOabtOaWsOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHVwZGF0ZUhlaWdodChuZXdIZWlnaHQ6IG51bWJlciwgb3B0aW9ucz86IExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy4kZWwgJiYgdGhpcy5oZWlnaHQgIT09IG5ld0hlaWdodCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uaXRlbS51cGRhdGVIZWlnaHQobmV3SGVpZ2h0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmhlaWdodChuZXdIZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBOdWxsYWJsZSxcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICB0eXBlIENvbm5lY3RFdmVudE1hcCxcbiAgICB0eXBlIFRpbWVySGFuZGxlLFxuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RTY3JvbGxlckZhY3RvcnksXG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0U2Nyb2xsZXIsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG50eXBlIFNjcm9sbGVyRXZlbnRNYXAgPSBIVE1MRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwICYgeyAnc2Nyb2xsc3RvcCc6IEV2ZW50OyB9O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBNSU5fU0NST0xMU1RPUF9EVVJBVElPTiA9IDUwLFxufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIHtAbGluayBJTGlzdFNjcm9sbGVyfSBpbXBsZW1lbnRhdGlvbiBjbGFzcyBmb3IgSFRNTEVsZW1lbnQuXG4gKiBAamEgSFRNTEVsZW1lbnQg44KS5a++6LGh44Go44GX44GfIHtAbGluayBJTGlzdFNjcm9sbGVyfSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEVsZW1lbnRTY3JvbGxlciBpbXBsZW1lbnRzIElMaXN0U2Nyb2xsZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyR0YXJnZXQ6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kc2Nyb2xsTWFwOiBET007XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbFN0b3BUcmlnZ2VyOiBET01FdmVudExpc3RlbmVyO1xuICAgIHByaXZhdGUgX3Njcm9sbER1cmF0aW9uPzogbnVtYmVyO1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodGFyZ2V0OiBET01TZWxlY3RvciwgbWFwOiBET01TZWxlY3Rvciwgb3B0aW9uczogTGlzdENvbnRleHRPcHRpb25zKSB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQgPSAkKHRhcmdldCk7XG4gICAgICAgIHRoaXMuXyRzY3JvbGxNYXAgPSB0aGlzLl8kdGFyZ2V0LmNoaWxkcmVuKCkuZmlyc3QoKTtcbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICAgICAgLypcbiAgICAgICAgICogZmlyZSBjdXN0b20gZXZlbnQ6IGBzY3JvbGxzdG9wYFxuICAgICAgICAgKiBgc2Nyb2xsZW5kYCDjga4gU2FmYXJpIOWvvuW/nOW+heOBoVxuICAgICAgICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvRWxlbWVudC9zY3JvbGxlbmRfZXZlbnRcbiAgICAgICAgICovXG4gICAgICAgIGxldCB0aW1lcjogVGltZXJIYW5kbGU7XG4gICAgICAgIHRoaXMuX3Njcm9sbFN0b3BUcmlnZ2VyID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gdGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kdGFyZ2V0LnRyaWdnZXIobmV3IEN1c3RvbUV2ZW50KCdzY3JvbGxzdG9wJywgeyBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH0pKTtcbiAgICAgICAgICAgIH0sIHRoaXMuX3Njcm9sbER1cmF0aW9uID8/IENvbnN0Lk1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqIOOCv+OCpOODl+Wumue+qeitmOWIpeWtkCAqL1xuICAgIHN0YXRpYyBnZXQgVFlQRSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ2NkcDplbGVtZW50LW92ZXJmbG93LXNjcm9sbGVyJztcbiAgICB9XG5cbiAgICAvKiogZmFjdG9yeSDlj5blvpcgKi9cbiAgICBzdGF0aWMgZ2V0RmFjdG9yeSgpOiBMaXN0U2Nyb2xsZXJGYWN0b3J5IHtcbiAgICAgICAgY29uc3QgZmFjdG9yeSA9ICh0YXJnZXQ6IERPTVNlbGVjdG9yLCBtYXA6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpOiBJTGlzdFNjcm9sbGVyID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRWxlbWVudFNjcm9sbGVyKHRhcmdldCwgbWFwLCBvcHRpb25zKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gc2V0IHR5cGUgc2lnbmF0dXJlLlxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhmYWN0b3J5LCB7XG4gICAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogRWxlbWVudFNjcm9sbGVyLlRZUEUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhY3RvcnkgYXMgTGlzdFNjcm9sbGVyRmFjdG9yeTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGVyXG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu5Z6L5oOF5aCx44KS5Y+W5b6XICovXG4gICAgZ2V0IHR5cGUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIEVsZW1lbnRTY3JvbGxlci5UWVBFO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7lj5blvpcgKi9cbiAgICBnZXQgcG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kdGFyZ2V0LnNjcm9sbFRvcCgpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vmnIDlpKflgKTkvY3nva7jgpLlj5blvpcgKi9cbiAgICBnZXQgcG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLl8kc2Nyb2xsTWFwLmhlaWdodCgpIC0gdGhpcy5fJHRhcmdldC5oZWlnaHQoKSwgMCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOeZu+mMsiAqL1xuICAgIG9uKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uPFNjcm9sbGVyRXZlbnRNYXA+KHR5cGUsIGNhbGxiYWNrIGFzIFVua25vd25GdW5jdGlvbik7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOeZu+mMsuino+mZpCAqL1xuICAgIG9mZih0eXBlOiAnc2Nyb2xsJyB8ICdzY3JvbGxzdG9wJywgY2FsbGJhY2s6IERPTUV2ZW50TGlzdGVuZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldC5vZmY8U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChwb3MgPT09IHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxEdXJhdGlvbiA9IChhbmltYXRlID8/IHRoaXMuX29wdGlvbnMuZW5hYmxlQW5pbWF0aW9uKSA/IHRpbWUgPz8gdGhpcy5fb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbiA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKHBvcywgdGhpcy5fc2Nyb2xsRHVyYXRpb24sIHVuZGVmaW5lZCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu54q25oWL5pu05pawICovXG4gICAgdXBkYXRlKCk6IHZvaWQge1xuICAgICAgICAvLyBub29wXG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOOBruegtOajhCAqL1xuICAgIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQ/Lm9mZigpO1xuICAgICAgICAodGhpcy5fJHRhcmdldCBhcyBOdWxsYWJsZTxET00+KSA9ICh0aGlzLl8kc2Nyb2xsTWFwIGFzIE51bGxhYmxlPERPTT4pID0gbnVsbDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgcG9zdCxcbiAgICBub29wLFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VSZXN1bHQsXG4gICAgdG9IZWxwU3RyaW5nLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHtcbiAgICBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMsXG4gICAgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbixcbiAgICBjbGVhclRyYW5zaXRpb24sXG59IGZyb20gJ0BjZHAvdWktdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zLFxuICAgIElMaXN0U2Nyb2xsZXIsXG4gICAgSUxpc3RPcGVyYXRpb24sXG4gICAgSUxpc3RTY3JvbGxhYmxlLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgTGlzdFZpZXdHbG9iYWxDb25maWcgfSBmcm9tICcuLi9nbG9iYWwtY29uZmlnJztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlLCBQYWdlUHJvZmlsZSB9IGZyb20gJy4uL3Byb2ZpbGUnO1xuaW1wb3J0IHsgRWxlbWVudFNjcm9sbGVyIH0gZnJvbSAnLi9lbGVtZW50LXNjcm9sbGVyJztcblxuLyoqIExpc3RDb250ZXh0T3B0aW9ucyDml6LlrprlgKQgKi9cbmNvbnN0IF9kZWZhdWx0T3B0czogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPiA9IHtcbiAgICBzY3JvbGxlckZhY3Rvcnk6IEVsZW1lbnRTY3JvbGxlci5nZXRGYWN0b3J5KCksXG4gICAgZW5hYmxlSGlkZGVuUGFnZTogZmFsc2UsXG4gICAgZW5hYmxlVHJhbnNmb3JtT2Zmc2V0OiB0cnVlLFxuICAgIHNjcm9sbE1hcFJlZnJlc2hJbnRlcnZhbDogMjAwLFxuICAgIHNjcm9sbFJlZnJlc2hEaXN0YW5jZTogMjAwLFxuICAgIHBhZ2VQcmVwYXJlQ291bnQ6IDMsXG4gICAgcGFnZVByZWxvYWRDb3VudDogMSxcbiAgICBlbmFibGVBbmltYXRpb246IHRydWUsXG4gICAgYW5pbWF0aW9uRHVyYXRpb246IDAsXG4gICAgYmFzZURlcHRoOiAnYXV0bycsXG4gICAgaXRlbVRhZ05hbWU6ICdkaXYnLFxuICAgIHJlbW92ZUl0ZW1XaXRoVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICB1c2VEdW1teUluYWN0aXZlU2Nyb2xsTWFwOiBmYWxzZSxcbn07XG5cbi8qKiBpbnZhbGlkIGluc3RhbmNlICovXG5jb25zdCBfJGludmFsaWQgPSAkKCkgYXMgRE9NOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG5cbi8qKiDliJ3mnJ/ljJbmuIjjgb/jgYvmpJzoqLwgKi9cbmZ1bmN0aW9uIHZlcmlmeTxUPih4OiBUIHwgdW5kZWZpbmVkKTogYXNzZXJ0cyB4IGlzIFQge1xuICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OKTtcbiAgICB9XG59XG5cbi8qKiBvdmVyZmxvdy15IOOCkuS/neiovCAqL1xuZnVuY3Rpb24gZW5zdXJlT3ZlcmZsb3dZKCRlbDogRE9NKTogRE9NIHtcbiAgICBjb25zdCBvdmVyZmxvd1kgPSAkZWwuY3NzKCdvdmVyZmxvdy15Jyk7XG4gICAgaWYgKCdoaWRkZW4nID09PSBvdmVyZmxvd1kgfHwgJ3Zpc2libGUnID09PSBvdmVyZmxvd1kpIHtcbiAgICAgICAgJGVsLmNzcygnb3ZlcmZsb3cteScsICdhdXRvJyk7XG4gICAgfVxuICAgIHJldHVybiAkZWw7XG59XG5cbi8qKiBzY3JvbGwtbWFwIGVsZW1lbnQg44KS5L+d6Ki8ICovXG5mdW5jdGlvbiBlbnN1cmVTY3JvbGxNYXAoJHJvb3Q6IERPTSwgbWFwQ2xhc3M6IHN0cmluZyk6IERPTSB7XG4gICAgbGV0ICRtYXAgPSAkcm9vdC5maW5kKGAuJHttYXBDbGFzc31gKTtcbiAgICAvLyAkbWFwIOOBjOeEoeOBhOWgtOWQiOOBr+S9nOaIkOOBmeOCi1xuICAgIGlmICgkbWFwLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICRtYXAgPSAkKGA8ZGl2IGNsYXNzPVwiJHttYXBDbGFzc31cIj48L2Rpdj5gKTtcbiAgICAgICAgJHJvb3QuYXBwZW5kKCRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gJG1hcDtcbn1cblxuLyoqIEBpbnRlcm5hbCDjgqLjgqTjg4bjg6DliYrpmaTmg4XloLEgKi9cbmludGVyZmFjZSBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgIHJlbW92ZWQ6IEl0ZW1Qcm9maWxlW107XG4gICAgZGVsdGE6IG51bWJlcjtcbiAgICB0cmFuc2l0aW9uOiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBzY3JvbGwgcHJvY2Vzc2luZyB0aGF0IG1hbmFnZXMgbWVtb3J5LiBBY2Nlc3NlcyB0aGUgRE9NLlxuICogQGphIOODoeODouODqueuoeeQhuOCkuihjOOBhuOCueOCr+ODreODvOODq+WHpueQhuOBruOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuS4gRE9NIOOBq+OCouOCr+OCu+OCueOBmeOCiy5cbiAqL1xuZXhwb3J0IGNsYXNzIExpc3RDb3JlIGltcGxlbWVudHMgSUxpc3RDb250ZXh0LCBJTGlzdE9wZXJhdGlvbiwgSUxpc3RTY3JvbGxhYmxlLCBJTGlzdEJhY2t1cFJlc3RvcmUge1xuICAgIHByaXZhdGUgXyRyb290OiBET007XG4gICAgcHJpdmF0ZSBfJG1hcDogRE9NO1xuICAgIHByaXZhdGUgX21hcEhlaWdodCA9IDA7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsZXI6IElMaXN0U2Nyb2xsZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKiogVUkg6KGo56S65Lit44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9hY3RpdmUgPSB0cnVlO1xuXG4gICAgLyoqIOWIneacn+OCquODl+OCt+ODp+ODs+OCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3NldHRpbmdzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+O1xuICAgIC8qKiBTY3JvbGwgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbEV2ZW50SGFuZGxlcjogKGV2PzogRXZlbnQpID0+IHZvaWQ7XG4gICAgLyoqIFNjcm9sbCBTdG9wIEV2ZW50IEhhbmRsZXIgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogMeODmuODvOOCuOWIhuOBrumrmOOBleOBruWfuua6luWApCAqL1xuICAgIHByaXZhdGUgX2Jhc2VIZWlnaHQgPSAwO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgSXRlbVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiog566h55CG5LiL44Gr44GC44KLIFBhZ2VQcm9maWxlIOmFjeWIlyAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhZ2VzOiBQYWdlUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog5pyA5paw44Gu6KGo56S66aCY5Z+f5oOF5aCx44KS5qC857SNIChTY3JvbGwg5Lit44Gu5pu05paw5Yem55CG44Gr5L2/55SoKSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCA9IHtcbiAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgIGZyb206IDAsXG4gICAgICAgIHRvOiAwLFxuICAgICAgICBwb3M6IDAsICAgIC8vIHNjcm9sbCBwb3NpdGlvblxuICAgIH07XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggX2l0ZW1zIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSB0aGlzLl8kbWFwID0gXyRpbnZhbGlkO1xuICAgICAgICB0aGlzLl9zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIF9kZWZhdWx0T3B0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbCh0aGlzLl9zY3JvbGxlciEucG9zKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlciA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TY3JvbGxTdG9wKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruWIneacn+WMliAqL1xuICAgIHB1YmxpYyBpbml0aWFsaXplKCRyb290OiBET00sIGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIOaXouOBq+ani+evieOBleOCjOOBpuOBhOOBn+WgtOWQiOOBr+egtOajhFxuICAgICAgICBpZiAodGhpcy5fJHJvb3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuXyRyb290ID0gZW5zdXJlT3ZlcmZsb3dZKCRyb290KTtcbiAgICAgICAgdGhpcy5fJG1hcCAgPSBlbnN1cmVTY3JvbGxNYXAodGhpcy5fJHJvb3QsIHRoaXMuX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHRoaXMuY3JlYXRlU2Nyb2xsZXIoKTtcbiAgICAgICAgdGhpcy5zZXRCYXNlSGVpZ2h0KGhlaWdodCk7XG4gICAgICAgIHRoaXMuc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEICovXG4gICAgcHVibGljIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVzZXRTY3JvbGxlckNvbmRpdGlvbigpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uZGVzdHJveSgpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXMuXyRyb290ID0gdGhpcy5fJG1hcCA9IF8kaW52YWxpZDtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Gu5Z+65rqW5YCk44KS5Y+W5b6XICovXG4gICAgcHVibGljIHNldEJhc2VIZWlnaHQoaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKGhlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbYmFzZSBoaWdodDogJHtoZWlnaHR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fYmFzZUhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL6Kit5a6aICovXG4gICAgcHVibGljIGFzeW5jIHNldEFjdGl2ZVN0YXRlKGFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG4gICAgICAgIGF3YWl0IHRoaXMudHJlYXRTY3JvbGxQb3NpdGlvbigpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL5Yik5a6aICovXG4gICAgZ2V0IGFjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44Gu5L+d5a2YL+W+qeWFgyAqL1xuICAgIHB1YmxpYyBhc3luYyB0cmVhdFNjcm9sbFBvc2l0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuXG4gICAgICAgIGNvbnN0IG9mZnNldCA9ICh0aGlzLl9zY3JvbGxlci5wb3MgLSB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zKTtcbiAgICAgICAgY29uc3QgeyB1c2VEdW1teUluYWN0aXZlU2Nyb2xsTWFwOiB1c2VEdW1teU1hcCB9ID0gdGhpcy5fc2V0dGluZ3M7XG5cbiAgICAgICAgY29uc3QgdXBkYXRlT2Zmc2V0ID0gKCR0YXJnZXQ6IERPTSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2xhdGVZIH0gPSBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMoJHRhcmdldFswXSk7XG4gICAgICAgICAgICBpZiAob2Zmc2V0ICE9PSB0cmFuc2xhdGVZKSB7XG4gICAgICAgICAgICAgICAgJHRhcmdldC5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7b2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9zY3JvbGxlci5zY3JvbGxUbyh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zLCBmYWxzZSwgMCk7XG4gICAgICAgICAgICB0aGlzLl8kbWFwLmNzcyh7ICd0cmFuc2Zvcm0nOiAnJywgJ2Rpc3BsYXknOiAnYmxvY2snIH0pO1xuICAgICAgICAgICAgaWYgKHVzZUR1bW15TWFwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmVwYXJlSW5hY3RpdmVNYXAoKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0ICRtYXAgPSB1c2VEdW1teU1hcCA/IHRoaXMucHJlcGFyZUluYWN0aXZlTWFwKCkgOiB0aGlzLl8kbWFwO1xuICAgICAgICAgICAgdXBkYXRlT2Zmc2V0KCRtYXApO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RDb250ZXh0XG5cbiAgICAvKiogZ2V0IHNjcm9sbC1tYXAgZWxlbWVudCAqL1xuICAgIGdldCAkc2Nyb2xsTWFwKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwO1xuICAgIH1cblxuICAgIC8qKiBnZXQgc2Nyb2xsLW1hcCBoZWlnaHQgW3B4XSAqL1xuICAgIGdldCBzY3JvbGxNYXBIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXAubGVuZ3RoID8gdGhpcy5fbWFwSGVpZ2h0IDogMDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IHtAbGluayBMaXN0Q29udGV4dE9wdGlvbnN9ICovXG4gICAgZ2V0IG9wdGlvbnMoKTogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogdXBkYXRlIHNjcm9sbC1tYXAgaGVpZ2h0IChkZWx0YSBbcHhdKSAqL1xuICAgIHVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kbWFwLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ICs9IE1hdGgudHJ1bmMoZGVsdGEpO1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZS5cbiAgICAgICAgICAgIGlmICh0aGlzLl9tYXBIZWlnaHQgPCAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuXyRtYXAuaGVpZ2h0KHRoaXMuX21hcEhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogdXBkYXRlIGludGVybmFsIHByb2ZpbGUgKi9cbiAgICB1cGRhdGVQcm9maWxlcyhmcm9tOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBfaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGZvciAobGV0IGkgPSBmcm9tLCBuID0gX2l0ZW1zLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgaWYgKDAgPCBpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IF9pdGVtc1tpIC0gMV07XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLmluZGV4ID0gbGFzdC5pbmRleCEgKyAxO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSBsYXN0Lm9mZnNldCArIGxhc3QuaGVpZ2h0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCByZWN5Y2xhYmxlIGVsZW1lbnQgKi9cbiAgICBmaW5kUmVjeWNsZUVsZW1lbnRzKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwLmZpbmQoYC4ke3RoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTfWApO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0Vmlld1xuXG4gICAgLyoqIOWIneacn+WMlua4iOOBv+OBi+WIpOWumiAqL1xuICAgIGdldCBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9zY3JvbGxlcjtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLCBpbmZvOiBVbmtub3duT2JqZWN0LCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hZGRJdGVtKG5ldyBJdGVtUHJvZmlsZSh0aGlzLCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAo5YaF6YOo55SoKSAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbSA6IFtpdGVtXTtcbiAgICAgICAgbGV0IGRlbHRhSGVpZ2h0ID0gMDtcbiAgICAgICAgbGV0IGFkZFRhaWwgPSBmYWxzZTtcblxuICAgICAgICBpZiAobnVsbCA9PSBpbnNlcnRUbyB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbnNlcnRUbykge1xuICAgICAgICAgICAgaW5zZXJ0VG8gPSB0aGlzLl9pdGVtcy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zZXJ0VG8gPT09IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRkVGFpbCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgbWFwIOOBruabtOaWsFxuICAgICAgICBmb3IgKGNvbnN0IGl0IG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBkZWx0YUhlaWdodCArPSBpdC5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGFIZWlnaHQpO1xuXG4gICAgICAgIC8vIOaMv+WFpVxuICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaW5zZXJ0VG8sIDAsIC4uLml0ZW1zKTtcblxuICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICBpZiAoIWFkZFRhaWwpIHtcbiAgICAgICAgICAgIGlmICgwID09PSBpbnNlcnRUbykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbnNlcnRUbyAtIDFdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaQgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIsIHNpemU/OiBudW1iZXIsIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4LCBhcmcyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXgsIGFyZzIsIGFyZzMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6ICovXG4gICAgcHJpdmF0ZSBfcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5OiBudW1iZXIpOiBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgICAgICBjb25zdCByZW1vdmVkOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGxldCBkZWx0YSA9IDA7XG4gICAgICAgIGxldCB0cmFuc2l0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuX2l0ZW1zW2lkeF07XG4gICAgICAgICAgICBkZWx0YSArPSBpdGVtLmhlaWdodDtcbiAgICAgICAgICAgIC8vIOWJiumZpOimgee0oOOBriB6LWluZGV4IOOBruWIneacn+WMllxuICAgICAgICAgICAgaXRlbS5yZXNldERlcHRoKCk7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8g6Ieq5YuV6Kit5a6a44O75YmK6Zmk6YGF5bu25pmC6ZaT44GM6Kit5a6a44GV44KM44GL44Gk44CB44K544Kv44Ot44O844Or44Od44K444K344On44Oz44Gr5aSJ5pu044GM44GC44KL5aC05ZCI44GvIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0aGlzLl9zZXR0aW5ncy5yZW1vdmVJdGVtV2l0aFRyYW5zaXRpb24gJiYgKDAgPCBkZWxheSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLnNjcm9sbFBvcztcbiAgICAgICAgICAgIGNvbnN0IHBvc01heCA9IHRoaXMuc2Nyb2xsUG9zTWF4IC0gZGVsdGE7XG4gICAgICAgICAgICB0cmFuc2l0aW9uID0gKHBvc01heCA8IGN1cnJlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgcmVtb3ZlZCwgZGVsdGEsIHRyYW5zaXRpb24gfTtcbiAgICB9XG5cbiAgICAvKiogaGVscGVyOiDliYrpmaTmmYLjga7mm7TmlrAgKi9cbiAgICBwcml2YXRlIF91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQ6IFJlbW92ZUl0ZW1zQ29udGV4dCwgZGVsYXk6IG51bWJlciwgcHJvZmlsZVVwZGF0ZTogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH0gPSBjb250ZXh0O1xuXG4gICAgICAgIC8vIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjdXN0b21pemUgcG9pbnQ6IOODl+ODreODleOCoeOCpOODq+OBruabtOaWsFxuICAgICAgICBwcm9maWxlVXBkYXRlKCk7XG5cbiAgICAgICAgLy8g44K544Kv44Ot44O844Or6aCY5Z+f44Gu5pu05pawXG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KC1kZWx0YSk7XG4gICAgICAgIC8vIOmBheW7tuWJiumZpFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiByZW1vdmVkKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDog6YCj57aaIGluZGV4IOeJiCAqL1xuICAgIHByaXZhdGUgX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyIHwgdW5kZWZpbmVkLCBkZWxheTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgICAgIHNpemUgPSBzaXplID8/IDE7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcblxuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4ICsgc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3JlbW92ZUl0ZW0oKSwgaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBpbmRleGVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogc2l6ZSB9LCAoXywgaSkgPT4gaW5kZXggKyBpKTtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luZGV4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluZGV4LCBzaXplKTtcbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5kZXgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDogcmFuZG9tIGFjY2VzcyDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtUmFuZG9tbHkoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcbiAgICAgICAgaW5kZXhlcy5zb3J0KChsaHMsIHJocykgPT4gcmhzIC0gbGhzKTsgLy8g6ZmN6aCG44K944O844OIXG5cbiAgICAgICAgZm9yIChjb25zdCBpbmRleCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbcmVtb3ZlSXRlbSgpLCBpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlcywgZGVsYXkpO1xuXG4gICAgICAgIC8vIOabtOaWsFxuICAgICAgICB0aGlzLl91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQsIGRlbGF5LCAoKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpZHhdLnBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpZHhdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBpbmRleGVzW2luZGV4ZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGZpcnN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIHNjcm9sbCBtYXAg44Gu44OI44Op44Oz44K444K344On44Oz6Kit5a6aICovXG4gICAgcHJpdmF0ZSBzZXR1cFNjcm9sbE1hcFRyYW5zaXRpb24oZGVsYXk6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuICAgICAgICBjb25zdCBlbCA9IHRoaXMuXyRtYXBbMF07XG4gICAgICAgIHRoaXMuXyRtYXAudHJhbnNpdGlvbkVuZCgoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRyYW5zaXRpb24oZWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbihlbCwgJ2hlaWdodCcsIGRlbGF5LCAnZWFzZScpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gaXRlbSDjgavoqK3lrprjgZfjgZ/mg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXRJdGVtSW5mbyh0YXJnZXQ6IG51bWJlciB8IEV2ZW50KTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zLCBfY29uZmlnIH0gPSB0aGlzO1xuXG4gICAgICAgIGNvbnN0IHBhcnNlciA9ICgkdGFyZ2V0OiBET00pOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIoJHRhcmdldC5hdHRyKF9jb25maWcuREFUQV9JVEVNX0lOREVYKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKSB8fCAkdGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdjYW5ub3QgZGl0ZWN0IGl0ZW0gZnJvbSBldmVudCBvYmplY3QuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlcigkdGFyZ2V0LnBhcmVudCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpbmRleCA9IHRhcmdldCBpbnN0YW5jZW9mIEV2ZW50ID8gcGFyc2VyKCQodGFyZ2V0LnRhcmdldCBhcyBIVE1MRWxlbWVudCkpIDogTnVtYmVyKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKE51bWJlci5pc05hTihpbmRleCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFt1bnN1cHBvcnRlZCB0eXBlOiAke3R5cGVvZiB0YXJnZXR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPCAwIHx8IF9pdGVtcy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IGdldEl0ZW1JbmZvKCkgW2ludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX2l0ZW1zW2luZGV4XS5pbmZvO1xuICAgIH1cblxuICAgIC8qKiDjgqLjgq/jg4bjgqPjg5bjg5rjg7zjgrjjgpLmm7TmlrAgKi9cbiAgICByZWZyZXNoKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IF9wYWdlcywgX2l0ZW1zLCBfc2V0dGluZ3MsIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQgfSA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0czogUmVjb3JkPG51bWJlciwgJ2FjdGl2YXRlJyB8ICdoaWRlJyB8ICdkZWFjdGl2YXRlJz4gPSB7fTtcbiAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgIGNvbnN0IGhpZ2hQcmlvcml0eUluZGV4OiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGNvbnN0IHN0b3JlTmV4dFBhZ2VTdGF0ZSA9IChpbmRleDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKE1hdGguYWJzKGN1cnJlbnRQYWdlSW5kZXggLSBpbmRleCkgPD0gX3NldHRpbmdzLnBhZ2VQcmVwYXJlQ291bnQpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zZXR0aW5ncy5lbmFibGVIaWRkZW5QYWdlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnaGlkZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2RlYWN0aXZhdGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY3VycmVudCBwYWdlIOOBriDliY3lvozjga8gaGlnaCBwcmlvcml0eSDjgavjgZnjgotcbiAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4ICsgMSA9PT0gaW5kZXggfHwgY3VycmVudFBhZ2VJbmRleCAtIDEgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8g5a++6LGh54Sh44GXXG4gICAgICAgIGlmIChfaXRlbXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoQ291bnQgPSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCArIF9zZXR0aW5ncy5wYWdlUHJlbG9hZENvdW50O1xuICAgICAgICAgICAgY29uc3QgYmVnaW5JbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudDtcbiAgICAgICAgICAgIGNvbnN0IGVuZEluZGV4ID0gY3VycmVudFBhZ2VJbmRleCArIHNlYXJjaENvdW50O1xuXG4gICAgICAgICAgICBsZXQgb3ZlcmZsb3dQcmV2ID0gMCwgb3ZlcmZsb3dOZXh0ID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IHBhZ2VJbmRleCA9IGJlZ2luSW5kZXg7IHBhZ2VJbmRleCA8PSBlbmRJbmRleDsgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd1ByZXYrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd05leHQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93UHJldikge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQgKyAxOyBpIDwgb3ZlcmZsb3dQcmV2OyBpKyssIHBhZ2VJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93TmV4dCkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4IC0gc2VhcmNoQ291bnQgLSAxOyBpIDwgb3ZlcmZsb3dOZXh0OyBpKyssIHBhZ2VJbmRleC0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDkuI3opoHjgavjgarjgaPjgZ8gcGFnZSDjga4g6Z2e5rS75oCn5YyWXG4gICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBfcGFnZXMuZmlsdGVyKHBhZ2UgPT4gJ2luYWN0aXZlJyAhPT0gcGFnZS5zdGF0dXMpKSB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRzW3BhZ2UuaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgcGFnZS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlhKrlhYggcGFnZSDjga4gYWN0aXZhdGVcbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaGlnaFByaW9yaXR5SW5kZXguc29ydCgobGhzLCByaHMpID0+IGxocyAtIHJocykpIHsgLy8g5piH6aCG44K944O844OIXG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCAmJiBfcGFnZXNbaWR4XT8uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g44Gd44Gu44G744GL44GuIHBhZ2Ug44GuIOeKtuaFi+WkieabtFxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXRzKSkge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBOdW1iZXIoa2V5KTtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IHRhcmdldHNbaW5kZXhdO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgX3BhZ2VzW2luZGV4XT8uW2FjdGlvbl0/LigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDmm7TmlrDlvozjgavkvb/nlKjjgZfjgarjgYvjgaPjgZ8gRE9NIOOCkuWJiumZpFxuICAgICAgICB0aGlzLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5yZW1vdmUoKTtcblxuICAgICAgICBjb25zdCBwYWdlQ3VycmVudCA9IF9wYWdlc1tjdXJyZW50UGFnZUluZGV4XTtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5mcm9tICA9IHBhZ2VDdXJyZW50Py5nZXRJdGVtRmlyc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC50byAgICA9IHBhZ2VDdXJyZW50Py5nZXRJdGVtTGFzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ID0gY3VycmVudFBhZ2VJbmRleDtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLmFzc2lnblBhZ2UoTWF0aC5tYXgodGhpcy5fcGFnZXMubGVuZ3RoIC0gMSwgMCkpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkCAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgIHRoaXMuYXNzaWduUGFnZSgpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOeuoei9hOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFnZXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faXRlbXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQoMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsYWJsZVxuXG4gICAgLyoqIHNjcm9sbGVyIOOBrueorumhnuOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxlclR5cGUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy50eXBlO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsUG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8ucG9zID8/IDA7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxQb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy5wb3NNYXggPz8gMDtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpCAqL1xuICAgIHNldFNjcm9sbEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LlttZXRob2RdKCdzY3JvbGwnLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or57WC5LqG44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpCAqL1xuICAgIHNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5bbWV0aG9kXSgnc2Nyb2xsc3RvcCcsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBhc3luYyBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBwb3NpdGlvbiwgdG9vIHNtYWxsLiBbcG9zOiAke3Bvc31dYCk7XG4gICAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX3Njcm9sbGVyLnBvc01heCA8IHBvcykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIHBvc2l0aW9uLCB0b28gYmlnLiBbcG9zOiAke3Bvc31dYCk7XG4gICAgICAgICAgICBwb3MgPSB0aGlzLl9zY3JvbGxlci5wb3NNYXg7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcG9zIOOBruOBv+WFiOmnhuOBkeOBpuabtOaWsFxuICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICBpZiAocG9zICE9PSB0aGlzLl9zY3JvbGxlci5wb3MpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Njcm9sbGVyLnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44GfIGl0ZW0g44Gu6KGo56S644KS5L+d6Ki8ICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShpbmRleDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgX3Njcm9sbGVyLCBfaXRlbXMsIF9zZXR0aW5ncywgX2Jhc2VIZWlnaHQgfSA9IHRoaXM7XG5cbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgX2l0ZW1zLmxlbmd0aCA8PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gZW5zdXJlVmlzaWJsZSgpIFtpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBwYXJ0aWFsT0ssIHNldFRvcCwgYW5pbWF0ZSwgdGltZSwgY2FsbGJhY2sgfSA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgcGFydGlhbE9LOiB0cnVlLFxuICAgICAgICAgICAgc2V0VG9wOiBmYWxzZSxcbiAgICAgICAgICAgIGFuaW1hdGU6IF9zZXR0aW5ncy5lbmFibGVBbmltYXRpb24sXG4gICAgICAgICAgICB0aW1lOiBfc2V0dGluZ3MuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICAgICAgICBjYWxsYmFjazogbm9vcCxcbiAgICAgICAgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgY3VycmVudFNjb3BlID0ge1xuICAgICAgICAgICAgZnJvbTogX3Njcm9sbGVyLnBvcyxcbiAgICAgICAgICAgIHRvOiBfc2Nyb2xsZXIucG9zICsgX2Jhc2VIZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gX2l0ZW1zW2luZGV4XTtcblxuICAgICAgICBjb25zdCB0YXJnZXRTY29wZSA9IHtcbiAgICAgICAgICAgIGZyb206IHRhcmdldC5vZmZzZXQsXG4gICAgICAgICAgICB0bzogdGFyZ2V0Lm9mZnNldCArIHRhcmdldC5oZWlnaHQsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXNJblNjb3BlID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgaWYgKHBhcnRpYWxPSykge1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRTY29wZS5mcm9tIDw9IGN1cnJlbnRTY29wZS5mcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50U2NvcGUuZnJvbSA8PSB0YXJnZXRTY29wZS50bztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0U2NvcGUuZnJvbSA8PSBjdXJyZW50U2NvcGUudG87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFNjb3BlLmZyb20gPD0gdGFyZ2V0U2NvcGUuZnJvbSAmJiB0YXJnZXRTY29wZS50byA8PSBjdXJyZW50U2NvcGUudG87XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZGV0ZWN0UG9zaXRpb24gPSAoKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRTY29wZS5mcm9tIDwgY3VycmVudFNjb3BlLmZyb21cbiAgICAgICAgICAgICAgICA/IHRhcmdldFNjb3BlLmZyb21cbiAgICAgICAgICAgICAgICA6IHRhcmdldC5vZmZzZXQgLSB0YXJnZXQuaGVpZ2h0IC8vIGJvdHRvbSDlkIjjgo/jgZvjga/mg4XloLHkuI3otrPjgavjgojjgorkuI3lj69cbiAgICAgICAgICAgIDtcbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgcG9zOiBudW1iZXI7XG4gICAgICAgIGlmIChzZXRUb3ApIHtcbiAgICAgICAgICAgIHBvcyA9IHRhcmdldFNjb3BlLmZyb207XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJblNjb3BlKCkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9zY3JvbGxlci5wb3MpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub29wXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3MgPSBkZXRlY3RQb3NpdGlvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5zY3JvbGxUbyhwb3MsIGFuaW1hdGUsIHRpbWUpO1xuICAgICAgICBjYWxsYmFjayhwb3MpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0QmFja3VwUmVzdG9yZVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjCAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IHsgaXRlbXM6IHRoaXMuX2l0ZW1zIH07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYwgKi9cbiAgICByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDAgPCB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fYWRkSXRlbSh0aGlzLl9iYWNrdXBba2V5XS5pdGVtcyk7XG5cbiAgICAgICAgaWYgKHJlYnVpbGQpIHtcbiAgICAgICAgICAgIHRoaXMucmVidWlsZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoeOCkueiuuiqjSAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5fYmFja3VwKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuSAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrpogKi9cbiAgICBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiB7IGl0ZW1zOiBJdGVtUHJvZmlsZVtdOyB9KTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEuaXRlbXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IGRhdGE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDnlKjnkrDlooPoqK3lrpogKi9cbiAgICBwcml2YXRlIHNldFNjcm9sbGVyQ29uZGl0aW9uKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub24oJ3Njcm9sbCcsIHRoaXMuX3Njcm9sbEV2ZW50SGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDnlKjnkrDlooPnoLTmo4QgKi9cbiAgICBwcml2YXRlIHJlc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vZmYoJ3Njcm9sbHN0b3AnLCB0aGlzLl9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog5pei5a6a44GuIFNjcm9sbGVyIOOCquODluOCuOOCp+OCr+ODiOOBruS9nOaIkCAqL1xuICAgIHByaXZhdGUgY3JlYXRlU2Nyb2xsZXIoKTogSUxpc3RTY3JvbGxlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncy5zY3JvbGxlckZhY3RvcnkodGhpcy5fJHJvb3QsIHRoaXMuXyRtYXAsIHRoaXMuX3NldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKiog54++5Zyo44GuIFBhZ2UgSW5kZXgg44KS5Y+W5b6XICovXG4gICAgcHJpdmF0ZSBnZXRQYWdlSW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgeyBfc2Nyb2xsZXIsIF9iYXNlSGVpZ2h0LCBfcGFnZXMgfSA9IHRoaXM7XG4gICAgICAgIHZlcmlmeShfc2Nyb2xsZXIpO1xuXG4gICAgICAgIGNvbnN0IHsgcG9zOiBzY3JvbGxQb3MsIHBvc01heDogc2Nyb2xsUG9zTWF4IH0gPSBfc2Nyb2xsZXI7XG5cbiAgICAgICAgY29uc3Qgc2Nyb2xsTWFwU2l6ZSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsYXN0UGFnZSA9IHRoaXMuZ2V0TGFzdFBhZ2UoKTtcbiAgICAgICAgICAgIHJldHVybiBsYXN0UGFnZSA/IGxhc3RQYWdlLm9mZnNldCArIGxhc3RQYWdlLmhlaWdodCA6IF9iYXNlSGVpZ2h0O1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHBvcyA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoMCA9PT0gc2Nyb2xsUG9zTWF4IHx8IHNjcm9sbFBvc01heCA8PSBfYmFzZUhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsUG9zICogc2Nyb2xsTWFwU2l6ZSAvIHNjcm9sbFBvc01heDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICBjb25zdCB2YWxpZFJhbmdlID0gKHBhZ2U6IFBhZ2VQcm9maWxlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYWdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYWdlLm9mZnNldCA8PSBwb3MgJiYgcG9zIDw9IHBhZ2Uub2Zmc2V0ICsgcGFnZS5oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBjYW5kaWRhdGUgPSBNYXRoLmZsb29yKHBvcyAvIF9iYXNlSGVpZ2h0KTtcbiAgICAgICAgaWYgKDAgIT09IGNhbmRpZGF0ZSAmJiBfcGFnZXMubGVuZ3RoIDw9IGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgY2FuZGlkYXRlID0gX3BhZ2VzLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcGFnZSA9IF9wYWdlc1tjYW5kaWRhdGVdO1xuICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgIH0gZWxzZSBpZiAocG9zIDwgcGFnZT8ub2Zmc2V0KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FuZGlkYXRlIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBwYWdlID0gX3BhZ2VzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWdlLmluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYW5kaWRhdGUgKyAxLCBuID0gX3BhZ2VzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHBhZ2UgPSBfcGFnZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgZGV0ZWN0IHBhZ2UgaW5kZXguIGZhbGxiYWNrOiAke19wYWdlcy5sZW5ndGggLSAxfWApO1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgX3BhZ2VzLmxlbmd0aCAtIDEpO1xuICAgIH1cblxuICAgIC8qKiDmnIDlvozjga7jg5rjg7zjgrjjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldExhc3RQYWdlKCk6IFBhZ2VQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYWdlc1t0aGlzLl9wYWdlcy5sZW5ndGggLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OIKi9cbiAgICBwcml2YXRlIG9uU2Nyb2xsKHBvczogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICAvLyBUT0RPOiBpbnRlcnNlY3Rpb25SZWN0IOOCkuS9v+eUqOOBmeOCi+WgtOWQiCwgU2Nyb2xsIOODj+ODs+ODieODqeODvOWFqOiIrOOBr+OBqeOBhuOBguOCi+OBueOBjeOBi+imgeaknOiojlxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHBvcyAtIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MpIDwgdGhpcy5fc2V0dGluZ3Muc2Nyb2xsUmVmcmVzaERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5pbmRleCAhPT0gY3VycmVudFBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+WBnOatouOCpOODmeODs+ODiCAqL1xuICAgIHByaXZhdGUgb25TY3JvbGxTdG9wKHBvczogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOWMuuWIhuOBruOCouOCteOCpOODsyAqL1xuICAgIHByaXZhdGUgYXNzaWduUGFnZShmcm9tPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKGZyb20pO1xuXG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zLCBfcGFnZXMsIF9iYXNlSGVpZ2h0LCBfc2Nyb2xsZXIgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGJhc2VQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICBjb25zdCBuZXh0SXRlbUluZGV4ID0gYmFzZVBhZ2U/LmdldEl0ZW1MYXN0KCk/LmluZGV4ID8/IDA7XG4gICAgICAgIGNvbnN0IGFzaWduZWVJdGVtcyAgPSBfaXRlbXMuc2xpY2UobmV4dEl0ZW1JbmRleCk7XG5cbiAgICAgICAgbGV0IHdvcmtQYWdlID0gYmFzZVBhZ2U7XG4gICAgICAgIGlmIChudWxsID09IHdvcmtQYWdlKSB7XG4gICAgICAgICAgICB3b3JrUGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgX3BhZ2VzLnB1c2god29ya1BhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGFzaWduZWVJdGVtcykge1xuICAgICAgICAgICAgaWYgKF9iYXNlSGVpZ2h0IDw9IHdvcmtQYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHdvcmtQYWdlLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhZ2UgPSBuZXcgUGFnZVByb2ZpbGUoKTtcbiAgICAgICAgICAgICAgICBuZXdQYWdlLmluZGV4ID0gd29ya1BhZ2UuaW5kZXggKyAxO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2Uub2Zmc2V0ID0gd29ya1BhZ2Uub2Zmc2V0ICsgd29ya1BhZ2UuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3UGFnZTtcbiAgICAgICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpdGVtLnBhZ2VJbmRleCA9IHdvcmtQYWdlLmluZGV4O1xuICAgICAgICAgICAgd29ya1BhZ2UucHVzaChpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmtQYWdlLm5vcm1hbGl6ZSgpO1xuXG4gICAgICAgIF9zY3JvbGxlcj8udXBkYXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOWMuuWIhuOBruino+mZpCAqL1xuICAgIHByaXZhdGUgY2xlYXJQYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGFnZXMuc3BsaWNlKGZyb20gPz8gMCk7XG4gICAgfVxuXG4gICAgLyoqIGluYWN0aXZlIOeUqCBNYXAg44Gu55Sf5oiQICovXG4gICAgcHJpdmF0ZSBwcmVwYXJlSW5hY3RpdmVNYXAoKTogRE9NIHtcbiAgICAgICAgY29uc3QgeyBfY29uZmlnLCBfJG1hcCwgX21hcEhlaWdodCB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgJHBhcmVudCA9IF8kbWFwLnBhcmVudCgpO1xuICAgICAgICBsZXQgJGluYWN0aXZlTWFwID0gJHBhcmVudC5maW5kKGAuJHtfY29uZmlnLklOQUNUSVZFX0NMQVNTfWApO1xuXG4gICAgICAgIGlmICgkaW5hY3RpdmVNYXAubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRQYWdlSW5kZXggPSB0aGlzLmdldFBhZ2VJbmRleCgpO1xuICAgICAgICAgICAgY29uc3QgJGxpc3RJdGVtVmlld3MgPSBfJG1hcC5jbG9uZSgpLmNoaWxkcmVuKCkuZmlsdGVyKChfLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmRleCA9IE51bWJlcigkKGVsZW1lbnQpLmF0dHIoX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFBhZ2VJbmRleCAtIDEgPD0gcGFnZUluZGV4ICYmIHBhZ2VJbmRleCA8PSBjdXJyZW50UGFnZUluZGV4ICsgMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkaW5hY3RpdmVNYXAgPSAkKGA8c2VjdGlvbiBjbGFzcz1cIiR7X2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTfSAke19jb25maWcuSU5BQ1RJVkVfQ0xBU1N9XCI+PC9zZWN0aW9uPmApXG4gICAgICAgICAgICAgICAgLmFwcGVuZCgkbGlzdEl0ZW1WaWV3cylcbiAgICAgICAgICAgICAgICAuaGVpZ2h0KF9tYXBIZWlnaHQpO1xuICAgICAgICAgICAgJHBhcmVudC5hcHBlbmQoJGluYWN0aXZlTWFwKTtcbiAgICAgICAgICAgIF8kbWFwLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGluYWN0aXZlTWFwO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgZG9tIGFzICQsXG4gICAgdHlwZSBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBWaWV3LFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUge1xuICAgIExpc3RDb250ZXh0T3B0aW9ucyxcbiAgICBJTGlzdENvbnRleHQsXG4gICAgSUxpc3RWaWV3LFxuICAgIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyxcbiAgICBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Q29yZSB9IGZyb20gJy4vY29yZS9saXN0JztcbmltcG9ydCB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGNvbnRleHQ6IExpc3RDb3JlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGNsYXNzIHRoYXQgc3RvcmVzIHtAbGluayBMaXN0Vmlld30gaW5pdGlhbGl6YXRpb24gaW5mb3JtYXRpb24uXG4gKiBAamEge0BsaW5rIExpc3RWaWV3fSDjga7liJ3mnJ/ljJbmg4XloLHjgpLmoLzntI3jgZnjgovjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RDb250ZXh0T3B0aW9ucywgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIGluaXRpYWxIZWlnaHQ/OiBudW1iZXI7XG59XG5cbi8qKlxuICogQGVuIFZpcnR1YWwgbGlzdCB2aWV3IGNsYXNzIHRoYXQgcHJvdmlkZXMgbWVtb3J5IG1hbmFnZW1lbnQgZnVuY3Rpb25hbGl0eS5cbiAqIEBqYSDjg6Hjg6Ljg6rnrqHnkIbmqZ/og73jgpLmj5DkvpvjgZnjgovku67mg7Pjg6rjgrnjg4jjg5Pjg6Xjg7zjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpc3RWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RWaWV3IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgY29udGV4dDogbmV3IExpc3RDb3JlKG9wdGlvbnMpLFxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuc2V0RWxlbWVudCh0aGlzLiRlbCBhcyBET01TZWxlY3RvcjxURWxlbWVudD4pO1xuICAgIH1cblxuICAgIC8qKiBjb250ZXh0IGFjY2Vzc29yICovXG4gICAgZ2V0IGNvbnRleHQoKTogSUxpc3RDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqIGNvbnN0cnVjdCBvcHRpb24gYWNjZXNzb3IgKi9cbiAgICBnZXQgb3B0aW9ucygpOiBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnM8VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5vcHRpb25zO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFZpZXcgY29tcG9uZW50IG1ldGhvZHM6XG5cbiAgICAvKiogYHRoaXMuZWxgIOabtOaWsOaZguOBruaWsOOBl+OBhCBIVE1MIOOCkuODrOODs+ODgOODquODs+OCsOODreOCuOODg+OCr+OBruWun+ijhemWouaVsC4g44Oi44OH44Or5pu05paw44GoIFZpZXcg44OG44Oz44OX44Os44O844OI44KS6YCj5YuV44GV44Gb44KLLiAqL1xuICAgIGFic3RyYWN0IHJlbmRlciguLi5hcmdzOiB1bmtub3duW10pOiBhbnk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIENoYW5nZSB0aGUgdmlldydzIGVsZW1lbnQgKGB0aGlzLmVsYCBwcm9wZXJ0eSkgYW5kIHJlLWRlbGVnYXRlIHRoZSB2aWV3J3MgZXZlbnRzIG9uIHRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAamEgVmlldyDjgYznrqHovYTjgZnjgovopoHntKAgKGB0aGlzLmVsYCBwcm9wZXJ0eSkg44Gu5aSJ5pu0LiDjgqTjg5njg7Pjg4jlho3oqK3lrprjgoLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFxuICAgICAqICAtIGBlbmAgT2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiOOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHNldEVsZW1lbnQoZWw6IERPTVNlbGVjdG9yPFRFbGVtZW50IHwgc3RyaW5nPik6IHRoaXMge1xuICAgICAgICBpZiAodGhpc1tfcHJvcGVydGllc10pIHtcbiAgICAgICAgICAgIGNvbnN0IHsgY29udGV4dCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIGNvbnRleHQuZGVzdHJveSgpO1xuICAgICAgICAgICAgY29udGV4dC5pbml0aWFsaXplKCRlbCBhcyBET008Tm9kZT4gYXMgRE9NLCB0aGlzLm9wdGlvbnMuaW5pdGlhbEhlaWdodCA/PyAkZWwuaGVpZ2h0KCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci5zZXRFbGVtZW50KGVsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5kZXN0cm95KCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZW1vdmUoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdE9wZXJhdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGl0IGhhcyBiZWVuIGluaXRpYWxpemVkLlxuICAgICAqIEBqYSDliJ3mnJ/ljJbmuIjjgb/jgYvliKTlrppcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBpbml0aWFsaXplZCAvIGZhbHNlOiB1bmluaXRpYWxpemVkXG4gICAgICogIC0gYGphYCB0cnVlOiDliJ3mnJ/ljJbmuIjjgb8gLyBmYWxzZTog5pyq5Yid5pyf5YyWXG4gICAgICovXG4gICAgZ2V0IGlzSW5pdGlhbGl6ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzSW5pdGlhbGl6ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZW0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSBpdGVtIOeZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIGFkZEl0ZW0oaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBJTGlzdEl0ZW1WaWV3Q29uc3RydWN0b3IsIGluZm86IFVua25vd25PYmplY3QsIGluc2VydFRvPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2FkZEl0ZW0obmV3IEl0ZW1Qcm9maWxlKHRoaXMuY29udGV4dCwgTWF0aC50cnVuYyhoZWlnaHQpLCBpbml0aWFsaXplciwgaW5mbyksIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24gKGludGVybmFsIHVzZSkuXG4gICAgICogQGphIGl0ZW0g55m76YyyICjlhoXpg6jnlKgpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAqICAtIGBlbmAge0BsaW5rIEl0ZW1Qcm9maWxlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluc2VydGlvbiBwb3NpdGlvbiBvZiBpdGVtIGJ5IGluZGV4XG4gICAgICogIC0gYGphYCBpdGVtIOOBruaMv+WFpeS9jee9ruOCkuOCpOODs+ODh+ODg+OCr+OCueOBp+aMh+WumlxuICAgICAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5fYWRkSXRlbShpdGVtLCBpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBpbmRleCB0byBzdGFydCByZWxlYXNpbmdcbiAgICAgKiAgLSBgamFgIOino+mZpOmWi+Wni+OBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzaXplXG4gICAgICogIC0gYGVuYCB0b3RhbCBudW1iZXIgb2YgaXRlbXMgdG8gcmVsZWFzZVxuICAgICAqICAtIGBqYWAg6Kej6Zmk44GZ44KLIGl0ZW0g44Gu57eP5pWwIFtkZWZhdWx0OiAxXVxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciwgc2l6ZT86IG51bWJlciwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSB0aGUgc3BlY2lmaWVkIEl0ZW0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBJdGVtIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRhcmdldCBpbmRleCBhcnJheS4gaXQgaXMgbW9yZSBlZmZpY2llbnQgdG8gc3BlY2lmeSByZXZlcnNlIGluZGV4LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Kk44Oz44OH44OD44Kv44K56YWN5YiX44KS5oyH5a6aLiByZXZlcnNlIGluZGV4IOOCkuaMh+WumuOBmeOCi+OBu+OBhuOBjOWKueeOh+eahFxuICAgICAqIEBwYXJhbSBkZWxheVxuICAgICAqICAtIGBlbmAgZGVsYXkgdGltZSB0byBhY3R1YWxseSBkZWxldGUgdGhlIGVsZW1lbnQgW2RlZmF1bHQ6IDAgKGltbWVkaWF0ZSBkZWxldGlvbilcbiAgICAgKiAgLSBgamFgIOWun+mam+OBq+imgee0oOOCkuWJiumZpOOBmeOCiyBkZWxheSB0aW1lIFtkZWZhdWx0OiAwICjljbPmmYLliYrpmaQpXVxuICAgICAqL1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlcltdLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIgfCBudW1iZXJbXSwgYXJnMj86IG51bWJlciwgYXJnMz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbW92ZUl0ZW0oaW5kZXggYXMgbnVtYmVyLCBhcmcyLCBhcmczKTsgLy8gYXZvaWQgdHMoMjM0NSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbmZvcm1hdGlvbiBzZXQgZm9yIHRoZSBzcGVjaWZpZWQgaXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIGl0ZW0g44Gr6Kit5a6a44GX44Gf5oOF5aCx44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBpZGVudGlmaWVyIFtpbmRleCB8IGV2ZW50IG9iamVjdF1cbiAgICAgKiAgLSBgamFgIOitmOWIpeWtkC4gW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqL1xuICAgIGdldEl0ZW1JbmZvKHRhcmdldDogbnVtYmVyIHwgRXZlbnQpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0SXRlbUluZm8odGFyZ2V0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCBhY3RpdmUgcGFnZXMuXG4gICAgICogQGphIOOCouOCr+ODhuOCo+ODluODmuODvOOCuOOCkuabtOaWsFxuICAgICAqL1xuICAgIHJlZnJlc2goKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVmcmVzaCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQnVpbGQgdW5hc3NpZ25lZCBwYWdlcy5cbiAgICAgKiBAamEg5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JXG4gICAgICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVidWlsZCBwYWdlIGFzc2lnbm1lbnRzLlxuICAgICAqIEBqYSDjg5rjg7zjgrjjgqLjgrXjgqTjg7PjgpLlho3mp4vmiJBcbiAgICAgKi9cbiAgICByZWJ1aWxkKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIERlc3Ryb3kgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg566h6L2E44OH44O844K/44KS56C05qOEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiBzdXBlci5yZWxlYXNlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RTY3JvbGxhYmxlXG5cbiAgICAgLyoqXG4gICAgICogQGVuIEdldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zO1xuICAgIH1cblxuICAgICAvKipcbiAgICAgICogQGVuIEdldCBtYXhpbXVtIHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+l1xuICAgICAgKi9cbiAgICBnZXQgc2Nyb2xsUG9zTWF4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFBvc01heDtcbiAgICB9XG5cbiAgICAgLyoqXG4gICAgICogQGVuIFNjcm9sbCBldmVudCBoYW5kbGVyIHNldHRpbmcvY2FuY2VsbGF0aW9uLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6noqK3lrpov6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44O86Zai5pWwXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb246IHNldHRpbmcgLyBvZmY6IGNhbmNlbGluZ1xuICAgICAqICAtIGBqYWAgb246IOioreWumiAvIG9mZjog6Kej6ZmkXG4gICAgICovXG4gICAgc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dGluZy9jYW5jZWxsaW5nIHNjcm9sbCBzdG9wIGV2ZW50IGhhbmRsZXIuXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+e1guS6huOCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxTdG9wSGFuZGxlcihoYW5kbGVyOiBET01FdmVudExpc3RlbmVyLCBtZXRob2Q6ICdvbicgfCAnb2ZmJyk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXIsIG1ldGhvZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzY3JvbGwgcG9zaXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc1xuICAgICAqICAtIGBlbmAgbmV3IHNjcm9sbCBwb3NpdGlvbiB2YWx1ZSBbMCAtIHBvc01heF1cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCueOCr+ODreODvOODq+S9jee9ruOCkuaMh+WumiBbMCAtIHBvc01heF1cbiAgICAgKiBAcGFyYW0gYW5pbWF0ZVxuICAgICAqICAtIGBlbmAgZW5hYmxlL2Rpc2FibGUgYW5pbWF0aW9uXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7mnInnhKFcbiAgICAgKiBAcGFyYW0gdGltZVxuICAgICAqICAtIGBlbmAgdGltZSBzcGVudCBvbiBhbmltYXRpb24gW21zZWNdXG4gICAgICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgc2Nyb2xsVG8ocG9zOiBudW1iZXIsIGFuaW1hdGU/OiBib29sZWFuLCB0aW1lPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVuc3VyZSB2aXNpYmlsaXR5IG9mIGl0ZW0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBnyBpdGVtIOOBruihqOekuuOCkuS/neiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGluZGV4IG9mIGl0ZW1cbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBlbnN1cmVWaXNpYmxlKGluZGV4OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZW5zdXJlVmlzaWJsZShpbmRleCwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlc3RvcmUoa2V5LCByZWJ1aWxkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciBiYWNrdXAgZGF0YSBleGlzdHMuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoeOCkueiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMgLyBmYWxzZTogbm90IGV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJIC8gZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5oYXNCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGlzY2FyZCBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGRpc2NhcmQgZXhpc3RpbmcgZGF0YSAvIGZhbHNlOiBzcGVjaWZpZWQgZGF0YSBkb2VzIG5vdCBleGlzdFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5a2Y5Zyo44GX44Gf44OH44O844K/44KS56C05qOEIC8gZmFsc2U6IOaMh+WumuOBleOCjOOBn+ODh+ODvOOCv+OBr+WtmOWcqOOBl+OBquOBhFxuICAgICAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5jbGVhckJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiBVbmtub3duT2JqZWN0IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0QmFja3VwRGF0YShrZXkpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQGVuIEJhY2t1cCBkYXRhIGNhbiBiZSBzZXQgZXh0ZXJuYWxseS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXlcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZWVkZWQgLyBmYWxzZTogc2NoZW1hIGludmFsaWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDjgrnjgq3jg7zjg57jgYzkuI3mraNcbiAgICAgKi9cbiAgICBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiBVbmtub3duT2JqZWN0KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldEJhY2t1cERhdGEoa2V5LCBkYXRhIGFzIHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0pO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgV3JpdGFibGUgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RWaWV3IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcbmltcG9ydCB7IHR5cGUgTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9ucywgTGlzdEl0ZW1WaWV3IH0gZnJvbSAnLi9saXN0LWl0ZW0tdmlldyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBncm91cDogR3JvdXBQcm9maWxlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyB0byBwYXNzIHRvIHtAbGluayBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3fSBjb25zdHJ1Y3Rpb24uXG4gKiBAamEge0BsaW5rIEV4cGFuZGFibGVMaXN0SXRlbVZpZXd9IOani+evieOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4cGFuZGFibGVMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURnVuY05hbWUgPSBzdHJpbmc+XG4gICAgZXh0ZW5kcyBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBvd25lcjogSUV4cGFuZGFibGVMaXN0VmlldztcbiAgICAvKioge0BsaW5rIEdyb3VwUHJvZmlsZX0gaW5zdGFuY2UgKi9cbiAgICBncm91cDogR3JvdXBQcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIEV4cGFuZGFibGVMaXN0Vmlld30uXG4gKiBAamEge0BsaW5rIEV4cGFuZGFibGVMaXN0Vmlld30g44GM5omx44GG44Oq44K544OI44Ki44Kk44OG44Og44Kz44Oz44OG44OK44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBMaXN0SXRlbVZpZXc8VEVsZW1lbnQsIFRFdmVudD4ge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogRXhwYW5kYWJsZUxpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICBjb25zdCB7IGdyb3VwIH0gPSBvcHRpb25zO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHsgZ3JvdXAgfTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcm90ZWN0ZWQgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMuXG4gICAgICogQGphIOWxlemWi+eKtuaFi+OCkuWIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4cGFuZGVkLCBjb2xsYXBzZWQ6IGNsb3NlXG4gICAgICogIC0gYGphYCB0cnVlOiDlsZXplossIGZhbHNlOiDlj47mnZ9cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzRXhwYW5kZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5ncm91cC5pc0V4cGFuZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nLlxuICAgICAqIEBqYSDlsZXplovkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNFeHBhbmRpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDlj47mnZ/kuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLm93bmVyIGFzIElFeHBhbmRhYmxlTGlzdFZpZXcpLmlzQ29sbGFwc2luZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZyBvciBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDplovplonkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNTd2l0Y2hpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSBpZiBpdCBoYXMgYSBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IGhhc0NoaWxkcmVuKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uZ3JvdXAuaGFzQ2hpbGRyZW47XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBsdWlkLFxuICAgIHN0YXR1c0FkZFJlZixcbiAgICBzdGF0dXNSZWxlYXNlLFxuICAgIHN0YXR1c1Njb3BlLFxuICAgIGlzU3RhdHVzSW4sXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUV4cGFuZE9wZXJhdGlvbixcbiAgICBJTGlzdFN0YXR1c01hbmFnZXIsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElFeHBhbmRhYmxlTGlzdENvbnRleHQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgR3JvdXBQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4gQ29yZSBsb2dpYyBpbXBsZW1lbnRhdGlvbiBjbGFzcyB0aGF0IG1hbmFnZXMgZXhwYW5kaW5nIC8gY29sbGFwc2luZyBzdGF0ZS5cbiAqIEBqYSDplovplonnirbmhYvnrqHnkIbjgpLooYzjgYbjgrPjgqLjg63jgrjjg4Pjgq/lrp/oo4Xjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEV4cGFuZENvcmUgaW1wbGVtZW50c1xuICAgIElFeHBhbmRPcGVyYXRpb24sXG4gICAgSUxpc3RTdGF0dXNNYW5hZ2VyLFxuICAgIElMaXN0QmFja3VwUmVzdG9yZSB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcblxuICAgIC8qKiB7IGlkOiBHcm91cFByb2ZpbGUgfSAqL1xuICAgIHByaXZhdGUgX21hcEdyb3VwczogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPiA9IHt9O1xuICAgIC8qKiDnrKwx6ZqO5bGkIEdyb3VwUHJvZmlsZSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIF9hcnlUb3BHcm91cHM6IEdyb3VwUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggeyBtYXAsIHRvcHMgfSDjgpLmoLzntI0gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9iYWNrdXA6IFJlY29yZDxzdHJpbmcsIHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIG93bmVyIOimqiBWaWV3IOOBruOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG93bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX293bmVyID0gb3duZXI7XG4gICAgfVxuXG4gICAgLyoqIOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9tYXBHcm91cHMgPSB7fTtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gW107XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUV4cGFuZE9wZXJhdGlvblxuXG4gICAgLyoqIOaWsOimjyBHcm91cFByb2ZpbGUg44KS5L2c5oiQICovXG4gICAgbmV3R3JvdXAoaWQ/OiBzdHJpbmcpOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBpZCA9IGlkID8/IGx1aWQoJ2xpc3QtZ3JvdXAnLCA0KTtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fbWFwR3JvdXBzW2lkXSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21hcEdyb3Vwc1tpZF07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZ3JvdXAgPSBuZXcgR3JvdXBQcm9maWxlKHRoaXMuX293bmVyLCBpZCk7XG4gICAgICAgIHRoaXMuX21hcEdyb3Vwc1tpZF0gPSBncm91cDtcbiAgICAgICAgcmV0dXJuIGdyb3VwO1xuICAgIH1cblxuICAgIC8qKiDnmbvpjLLmuIjjgb8gR3JvdXAg44KS5Y+W5b6XICovXG4gICAgZ2V0R3JvdXAoaWQ6IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXBHcm91cHNbaWRdO1xuICAgIH1cblxuICAgIC8qKiDnrKwx6ZqO5bGk44GuIEdyb3VwIOeZu+mMsiAqL1xuICAgIHJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXA6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICAvLyDjgZnjgafjgavnmbvpjLLmuIjjgb/jga7loLTlkIjjga8gcmVzdG9yZSDjgZfjgaYgbGF5b3V0IOOCreODvOOBlOOBqOOBq+W+qeWFg+OBmeOCi+OAglxuICAgICAgICBpZiAoJ3JlZ2lzdGVyZWQnID09PSB0b3BHcm91cC5zdGF0dXMpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IG9yaWVudGF0aW9uIGNoYW5nZWQg5pmC44GuIGxheW91dCDjgq3jg7zlpInmm7Tlr77lv5zjgaDjgYzjgIHjgq3jg7zjgavlpInmm7TjgYznhKHjgYTjgajjgY3jga/kuI3lhbflkIjjgajjgarjgovjgIJcbiAgICAgICAgICAgIC8vIOOBk+OBriBBUEkg44Gr5a6f6KOF44GM5b+F6KaB44GL44KC5ZCr44KB44Gm6KaL55u044GX44GM5b+F6KaBXG4gICAgICAgICAgICB0b3BHcm91cC5yZXN0b3JlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsYXN0R3JvdXAgPSB0aGlzLl9hcnlUb3BHcm91cHNbdGhpcy5fYXJ5VG9wR3JvdXBzLmxlbmd0aCAtIDFdO1xuICAgICAgICBjb25zdCBpbnNlcnRUbyA9IGxhc3RHcm91cD8uZ2V0TmV4dEl0ZW1JbmRleCh0cnVlKSA/PyAwO1xuXG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3Vwcy5wdXNoKHRvcEdyb3VwKTtcbiAgICAgICAgdG9wR3JvdXAucmVnaXN0ZXIoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDnrKwx6ZqO5bGk44GuIEdyb3VwIOOCkuWPluW+lyAqL1xuICAgIGdldFRvcEdyb3VwcygpOiBHcm91cFByb2ZpbGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnlUb3BHcm91cHMuc2xpY2UoMCk7XG4gICAgfVxuXG4gICAgLyoqIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWxlemWiyAoMemajuWxpCkgKi9cbiAgICBhc3luYyBleHBhbmRBbGwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2llczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBwcm9taXNpZXMucHVzaChncm91cC5leHBhbmQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzaWVzKTtcbiAgICB9XG5cbiAgICAvKiog44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5Y+O5p2fICgx6ZqO5bGkKSAqL1xuICAgIGFzeW5jIGNvbGxhcHNlQWxsKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2llczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBwcm9taXNpZXMucHVzaChncm91cC5jb2xsYXBzZShkZWxheSkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2llcyk7XG4gICAgfVxuXG4gICAgLyoqIOWxlemWi+S4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNTdGF0dXNJbignZXhwYW5kaW5nJyk7XG4gICAgfVxuXG4gICAgLyoqIOWPjuadn+S4reOBi+WIpOWumiAqL1xuICAgIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzU3RhdHVzSW4oJ2NvbGxhcHNpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog6ZaL6ZaJ5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0V4cGFuZGluZyB8fCB0aGlzLmlzQ29sbGFwc2luZztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFN0YXR1c01hbmFnZXJcblxuICAgIC8qKiDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4ggKi9cbiAgICBzdGF0dXNBZGRSZWYoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gc3RhdHVzQWRkUmVmKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiCAqL1xuICAgIHN0YXR1c1JlbGVhc2Uoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gc3RhdHVzUmVsZWFzZShzdGF0dXMpO1xuICAgIH1cblxuICAgIC8qKiDlh6bnkIbjgrnjgrPjg7zjg5fmr47jgavnirbmhYvlpInmlbDjgpLoqK3lrpogKi9cbiAgICBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZywgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBzdGF0dXNTY29wZShzdGF0dXMsIGV4ZWN1dG9yKTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44Gf54q25oWL5Lit44Gn44GC44KL44GL56K66KqNICovXG4gICAgaXNTdGF0dXNJbihzdGF0dXM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gaXNTdGF0dXNJbihzdGF0dXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0QmFja3VwUmVzdG9yZVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OCkuODkOODg+OCr+OCouODg+ODlyAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCB7IF9iYWNrdXAgfSA9IHRoaXM7XG4gICAgICAgIF9iYWNrdXBba2V5XSA/Pz0ge1xuICAgICAgICAgICAgbWFwOiB0aGlzLl9tYXBHcm91cHMsXG4gICAgICAgICAgICB0b3BzOiB0aGlzLl9hcnlUb3BHcm91cHMsXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDlhoXpg6jjg4fjg7zjgr/jgpLjg6rjgrnjg4jjgqIgKi9cbiAgICByZXN0b3JlKGtleTogc3RyaW5nLCByZWJ1aWxkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGJhY2t1cCA9IHRoaXMuZ2V0QmFja3VwRGF0YShrZXkpO1xuICAgICAgICBpZiAobnVsbCA9PSBiYWNrdXApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgwIDwgdGhpcy5fYXJ5VG9wR3JvdXBzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuX21hcEdyb3VwcywgYmFja3VwLm1hcCk7XG4gICAgICAgIHRoaXMuX2FyeVRvcEdyb3VwcyA9IGJhY2t1cC50b3BzLnNsaWNlKCk7XG5cbiAgICAgICAgLy8g5bGV6ZaL44GX44Gm44GE44KL44KC44Gu44KS55m76YyyXG4gICAgICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgdGhpcy5fYXJ5VG9wR3JvdXBzKSB7XG4gICAgICAgICAgICBncm91cC5yZXN0b3JlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlho3mp4vnr4njga7kuojntIRcbiAgICAgICAgcmVidWlsZCAmJiB0aGlzLl9vd25lci5yZWJ1aWxkKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7mnInnhKEgKi9cbiAgICBoYXNCYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruegtOajhCAqL1xuICAgIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMuX2JhY2t1cCkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmFja3VwW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgavjgqLjgq/jgrvjgrkgKi9cbiAgICBnZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nKTogeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrpogKi9cbiAgICBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGRhdGEubWFwICYmIEFycmF5LmlzQXJyYXkoZGF0YS50b3BzKSkge1xuICAgICAgICAgICAgdGhpcy5fYmFja3VwW2tleV0gPSBkYXRhO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgV3JpdGFibGUsIFVua25vd25PYmplY3QgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RWaWV3LCBJRXhwYW5kT3BlcmF0aW9uIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEV4cGFuZENvcmUgfSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0IHR5cGUgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IHsgdHlwZSBMaXN0Vmlld0NvbnN0cnVjdE9wdGlvbnMsIExpc3RWaWV3IH0gZnJvbSAnLi9saXN0LXZpZXcnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgY29udGV4dDogRXhwYW5kQ29yZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFZpcnR1YWwgbGlzdCB2aWV3IGNsYXNzIHdpdGggZXhwYW5kaW5nIC8gY29sbGFwc2luZyBmdW5jdGlvbmFsaXR5LlxuICogQGphIOmWi+mWieapn+iDveOCkuWCmeOBiOOBn+S7ruaDs+ODquOCueODiOODk+ODpeODvOOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXhwYW5kYWJsZUxpc3RWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBMaXN0VmlldzxURWxlbWVudCwgVEV2ZW50PiBpbXBsZW1lbnRzIElFeHBhbmRhYmxlTGlzdFZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0ge1xuICAgICAgICAgICAgY29udGV4dDogbmV3IEV4cGFuZENvcmUodGhpcyksXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqIGNvbnRleHQgYWNjZXNzb3IgKi9cbiAgICBnZXQgZXhwYW5kQ29udGV4dCgpOiBJRXhwYW5kT3BlcmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUV4cGFuZGFibGVMaXN0Vmlld1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyB7QGxpbmsgR3JvdXBQcm9maWxlfS4gUmV0dXJuIHRoZSBvYmplY3QgaWYgaXQgaXMgYWxyZWFkeSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDmlrDopo8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5L2c5oiQLiDnmbvpjLLmuIjjgb/jga7loLTlkIjjga/jgZ3jga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgbmV3bHkgY3JlYXRlZCBncm91cCBpZC4gaWYgbm90IHNwZWNpZmllZCwgYXV0b21hdGljIGFsbG9jYXRpb24gd2lsbCBiZSBwZXJmb3JtZWQuXG4gICAgICogIC0gYGphYCDmlrDopo/jgavkvZzmiJDjgZnjgosgR3JvdXAgSUQg44KS5oyH5a6aLiDmjIflrprjgZfjgarjgYTloLTlkIjjga/oh6rli5XlibLjgormjK/jgopcbiAgICAgKi9cbiAgICBuZXdHcm91cChpZD86IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lm5ld0dyb3VwKGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHJlZ2lzdGVyZWQge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOeZu+mMsua4iOOBvyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgR3JvdXAgSUQgdG8gcmV0cmlldmVcbiAgICAgKiAgLSBgamFgIOWPluW+l+OBmeOCiyBHcm91cCBJRCDjgpLmjIflrppcbiAgICAgKi9cbiAgICBnZXRHcm91cChpZDogc3RyaW5nKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0R3JvdXAoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiAxc3QgbGF5ZXIge0BsaW5rIEdyb3VwUHJvZmlsZX0gcmVnaXN0cmF0aW9uLlxuICAgICAqIEBqYSDnrKwx6ZqO5bGk44GuIHtAbGluayBHcm91cFByb2ZpbGV9IOeZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIHRvcEdyb3VwXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RlZCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAg5qeL56+J5riI44G/IHtAbGluayBHcm91cFByb2ZpbGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXA6IEdyb3VwUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlZ2lzdGVyVG9wR3JvdXAodG9wR3JvdXApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgMXN0IGxheWVyIHtAbGluayBHcm91cFByb2ZpbGV9LiA8YnI+XG4gICAgICogICAgIEEgY29weSBhcnJheSBpcyByZXR1cm5lZCwgc28gdGhlIGNsaWVudCBjYW5ub3QgY2FjaGUgaXQuXG4gICAgICogQGphIOesrDHpmo7lsaTjga4ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg44Kz44OU44O86YWN5YiX44GM6L+U44GV44KM44KL44Gf44KB44CB44Kv44Op44Kk44Ki44Oz44OI44Gv44Kt44Oj44OD44K344Ol5LiN5Y+vXG4gICAgICovXG4gICAgZ2V0VG9wR3JvdXBzKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0VG9wR3JvdXBzKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4cGFuZCBhbGwgZ3JvdXBzICgxc3QgbGF5ZXIpXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWxlemWiyAoMemajuWxpClcbiAgICAgKi9cbiAgICBleHBhbmRBbGwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmV4cGFuZEFsbCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb2xsYXBzZSBhbGwgZ3JvdXBzICgxc3QgbGF5ZXIpXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCsOODq+ODvOODl+OCkuWPjuadnyAoMemajuWxpClcbiAgICAgKi9cbiAgICBjb2xsYXBzZUFsbChkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5jb2xsYXBzZUFsbChkZWxheSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcuXG4gICAgICogQGphIOWxlemWi+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0V4cGFuZGluZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNFeHBhbmRpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDlj47mnZ/kuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0NvbGxhcHNpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcgb3IgY29sbGFwc2luZy5cbiAgICAgKiBAamEg6ZaL6ZaJ5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzU3dpdGNoaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc1N3aXRjaGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5jcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gICAgICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gICAgICovXG4gICAgc3RhdHVzQWRkUmVmKHN0YXR1czogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc3RhdHVzQWRkUmVmKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICAgICAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jg4fjgq/jg6rjg6Hjg7Pjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICAgICAqL1xuICAgIHN0YXR1c1JlbGVhc2Uoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN0YXRlIHZhcmlhYmxlIG1hbmFnZW1lbnQgc2NvcGVcbiAgICAgKiBAamEg54q25oWL5aSJ5pWw566h55CG44K544Kz44O844OXXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dmFsIG9mIHNlZWQgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDlr77osaHjga7plqLmlbDjga7miLvjgorlgKRcbiAgICAgKi9cbiAgICBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZywgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnN0YXR1c1Njb3BlKHN0YXR1cywgZXhlY3V0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBpZiBpdCdzIGluIHRoZSBzcGVjaWZpZWQgc3RhdGUuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+eKtuaFi+S4reOBp+OBguOCi+OBi+eiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZTog54q25oWL5YaFIC8gZmFsc2U6IOeKtuaFi+WkllxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IHdpdGhpbiB0aGUgc3RhdHVzIC8gYGZhbHNlYDogb3V0IG9mIHRoZSBzdGF0dXNcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog54q25oWL5YaFIC8gYGZhbHNlYDog54q25oWL5aSWXG4gICAgICovXG4gICAgaXNTdGF0dXNJbihzdGF0dXM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc1N0YXR1c0luKHN0YXR1cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IExpc3RWaWV3XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRGVzdHJveSBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4RcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICBzdXBlci5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVsZWFzZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAoYW55IGlkZW50aWZpZXIpXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7wo5Lu75oSP44Gu6K2Y5Yil5a2QKeOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZXNzIC8gZmFsc2U6IGZhaWx1cmVcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDlpLHmlZdcbiAgICAgKi9cbiAgICBvdmVycmlkZSBiYWNrdXAoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuYmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICogQGVuIEV4ZWN1dGUgYSBiYWNrdXAgb2YgaW50ZXJuYWwgZGF0YS5cbiAgICAgKiBAamEg5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHBhcmFtIHJlYnVpbGRcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdHJ1ZSB0byByZWJ1aWxkIHRoZSBsaXN0IHN0cnVjdHVyZVxuICAgICAqICAtIGBqYWAg44Oq44K544OI5qeL6YCg44KS5YaN5qeL56+J44GZ44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQgPSB0cnVlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlc3RvcmUoa2V5LCByZWJ1aWxkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciBiYWNrdXAgZGF0YSBleGlzdHMuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoeOCkueiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBleGlzdHMgLyBmYWxzZTogbm90IGV4aXN0c1xuICAgICAqICAtIGBqYWAgdHJ1ZTog5pyJIC8gZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIG92ZXJyaWRlIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5oYXNCYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGlzY2FyZCBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGRpc2NhcmQgZXhpc3RpbmcgZGF0YSAvIGZhbHNlOiBzcGVjaWZpZWQgZGF0YSBkb2VzIG5vdCBleGlzdFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5a2Y5Zyo44GX44Gf44OH44O844K/44KS56C05qOEIC8gZmFsc2U6IOaMh+WumuOBleOCjOOBn+ODh+ODvOOCv+OBr+WtmOWcqOOBl+OBquOBhFxuICAgICAqL1xuICAgIG92ZXJyaWRlIGNsZWFyQmFja3VwKGtleT86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5jbGVhckJhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgYmFja3VwIGRhdGEuXG4gICAgICogQGphIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5ICh0aGUgb25lIHVzZWQgZm9yIGBiYWNrdXAoKWApXG4gICAgICogIC0gYGphYCDjg5Djg4Pjgq/jgqLjg4Pjg5fjgq3jg7zjgpLmjIflrpogKGBiYWNrdXAoKWAg44Gr5L2/55So44GX44Gf44KC44GuKVxuICAgICAqL1xuICAgIG92ZXJyaWRlIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiBVbmtub3duT2JqZWN0IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZ2V0QmFja3VwRGF0YShrZXkpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQGVuIEJhY2t1cCBkYXRhIGNhbiBiZSBzZXQgZXh0ZXJuYWxseS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44KS5aSW6YOo44KI44KK6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXlcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cnVlOiBzdWNjZWVkZWQgLyBmYWxzZTogc2NoZW1hIGludmFsaWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOaIkOWKnyAvIGZhbHNlOiDjgrnjgq3jg7zjg57jgYzkuI3mraNcbiAgICAgKi9cbiAgICBvdmVycmlkZSBzZXRCYWNrdXBEYXRhKGtleTogc3RyaW5nLCBkYXRhOiBVbmtub3duT2JqZWN0KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnNldEJhY2t1cERhdGEoa2V5LCBkYXRhIGFzIHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfSk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJzaGVldCIsInBvc3QiLCJub29wIiwic3R5bGVDb3JlIiwic3R5bGVCdXR0b24iLCIkIiwiYXQiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJ0b0hlbHBTdHJpbmciLCJfcHJvcGVydGllcyIsIlZpZXciLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibHVpZCIsInN0YXR1c0FkZFJlZiIsInN0YXR1c1JlbGVhc2UiLCJzdGF0dXNTY29wZSIsImlzU3RhdHVzSW4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBQUE7OztJ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