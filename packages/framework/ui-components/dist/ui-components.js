/*!
 * @cdp/ui-components 0.9.19
 *   ui-componets collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, runtime) { 'use strict';

    /*!
     * @cdp/ui-utils 0.9.19
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
     * @cdp/ui-forms 0.9.19
     *   UI form components
     */


    const sheet$1 = new CSSStyleSheet();sheet$1.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

    const sheet = new CSSStyleSheet();sheet.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

    const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
    void runtime.post(runtime.noop(sheet$1, sheet));

    /*!
     * @cdp/ui-listview 0.9.19
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5qcyIsInNvdXJjZXMiOlsidWktdXRpbHMvcmVzdWx0LWNvZGUtZGVmcy50cyIsInVpLXV0aWxzL3Nzci50cyIsInVpLXV0aWxzL2Nzcy9taXNjLnRzIiwidWktZm9ybXMvaW5kZXgudHMiLCJ1aS1saXN0dmlldy9yZXN1bHQtY29kZS1kZWZzLnRzIiwidWktbGlzdHZpZXcvZ2xvYmFsLWNvbmZpZy50cyIsInVpLWxpc3R2aWV3L3Byb2ZpbGUvaXRlbS50cyIsInVpLWxpc3R2aWV3L3Byb2ZpbGUvcGFnZS50cyIsInVpLWxpc3R2aWV3L3Byb2ZpbGUvZ3JvdXAudHMiLCJ1aS1saXN0dmlldy9saXN0LWl0ZW0tdmlldy50cyIsInVpLWxpc3R2aWV3L2NvcmUvZWxlbWVudC1zY3JvbGxlci50cyIsInVpLWxpc3R2aWV3L2NvcmUvbGlzdC50cyIsInVpLWxpc3R2aWV3L2xpc3Qtdmlldy50cyIsInVpLWxpc3R2aWV3L2V4cGFuZGFibGUtbGlzdC1pdGVtLXZpZXcudHMiLCJ1aS1saXN0dmlldy9jb3JlL2V4cGFuZC50cyIsInVpLWxpc3R2aWV3L2V4cGFuZGFibGUtbGlzdC12aWV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGV4cG9ydCBjb25zdCBlbnVtIENEUF9LTk9XTl9VSV9NT0RVTEUge1xuICAgICAgICAvKiogYEBjZHAvdWktdXRpbHNgICovXG4gICAgICAgIFVUSUxTICAgICA9IDEsXG4gICAgICAgIC8qKiBgQGNkcC91aS1saXN0dmlld2AgKi9cbiAgICAgICAgTElTVFZJRVcgID0gMixcbiAgICAgICAgLyoqIG9mZnNldCBmb3IgdW5rbm93biB1aS1tb2R1bGUgKi9cbiAgICAgICAgT0ZGU0VULFxuICAgIH1cblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfVVRJTFMgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLlVUSUxTKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9VVElMU19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9VVElMU19GQVRBTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX1VUSUxTICsgMSwgJ1VJIHV0aWxzIHNvbWV0aGluZyB3cm9uZy4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZ2V0Q29tcHV0ZWRTdHlsZSA9IHNhZmUoZ2xvYmFsVGhpcy5nZXRDb21wdXRlZFN0eWxlKTtcbiIsImltcG9ydCB7IGdldENvbXB1dGVkU3R5bGUgfSBmcm9tICcuLi9zc3InO1xuXG4vKipcbiAqIEBlbiBDU1MgdmVuZG9yIHByZWZpeCBzdHJpbmcgZGVmaW5pdGlvbi5cbiAqIEBqYSBDU1Mg44OZ44Oz44OA44O844OX44Oq44OV44Kj44OD44Kv44K55paH5a2X5YiX5a6a576pXG4gKi9cbmV4cG9ydCBjb25zdCBjc3NQcmVmaXhlcyA9IFsnLXdlYmtpdC0nLCAnLW1vei0nLCAnLW1zLScsICctby0nLCAnJ107XG5cbi8qKlxuICogQGVuIFN0b3JlcyB0aGUgdmFsdWUgc3BlY2lmaWVkIGluIGNzcyBgdHJhbnNmb3JtKDNkKWAuXG4gKiBAamEgY3NzIGB0cmFuc2Zvcm0oM2QpYCDjgavmjIflrprjgZXjgozjgovlgKTjgpLmoLzntI1cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMge1xuICAgIHRyYW5zbGF0ZVg6IG51bWJlcjtcbiAgICB0cmFuc2xhdGVZOiBudW1iZXI7XG4gICAgdHJhbnNsYXRlWjogbnVtYmVyO1xuICAgIHNjYWxlWDogbnVtYmVyO1xuICAgIHNjYWxlWTogbnVtYmVyO1xuICAgIHNjYWxlWjogbnVtYmVyO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIHRoZSB0cmFuc2Zvcm0gbWF0cml4IHNwZWNpZmllZCBpbiBgRWxlbWVudGAuXG4gKiBAamEgYEVsZW1lbnRgIOOBq+aMh+WumuOBleOCjOOBnyB0cmFuc2Zvcm0g6KGM5YiX44Gu5YCk44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgRWxlbWVudGAgaW5zdGFuY2VcbiAqICAtIGBqYWAg5a++6LGhIGBFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGNvbnN0IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyA9IChlbDogRWxlbWVudCk6IFRyYW5zZm9ybU1hdHJpeFZhbHVlcyA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICBjb25zdCB7IG0xMSwgbTIyLCBtMzMsIG00MSwgbTQyLCBtNDMgfSA9IG5ldyBET01NYXRyaXhSZWFkT25seShzdHlsZS50cmFuc2Zvcm0pO1xuICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zbGF0ZVg6IG00MSxcbiAgICAgICAgdHJhbnNsYXRlWTogbTQyLFxuICAgICAgICB0cmFuc2xhdGVaOiBtNDMsXG4gICAgICAgIHNjYWxlWDogbTExLFxuICAgICAgICBzY2FsZVk6IG0yMixcbiAgICAgICAgc2NhbGVaOiBtMzMsXG4gICAgfTtcbn07XG5cbi8qKlxuICogQGVuIFNldHRpbmcgcHJvcGVydHkgY29udmVyc2lvbiBhbmltYXRpb24gdXNpbmcgY3NzIHRyYW5zaXRpb24gZm9yIHNwZWNpZmllZCBlbGVtZW50LlxuICogQGphIOaMh+Wumuimgee0oOOBq+WvvuOBl+OBpiBjc3MgdHJhbnNpdGlvbiDjgpLnlKjjgYTjgZ/jg5fjg63jg5Hjg4bjgqPlpInmj5vjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7oqK3lrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGFyZ2V0IGBIVE1MRWxlbWVudGAgaW5zdGFuY2VcbiAqICAtIGBqYWAg5a++6LGhIGBIVE1MRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K5XG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZSBbZXg6IGhlaWdodF1cbiAqICAtIGBqYWAg5a++6LGh44OX44Ot44OR44OG44Kj5ZCNIFtleDogaGVpZ2h0XVxuICogQHBhcmFtIG1zZWNcbiAqICAtIGBlbmAgYW5pbWF0aW9uIGR1cmF0aW9uIFttc2VjXVxuICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7PmmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIG5hbWUgW2RlZmF1bHQ6IGVhc2VdXG4gKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsOWQjSBbZGVmYXVsdDogZWFzZV1cbiAqL1xuZXhwb3J0IGNvbnN0IHNldFRyYW5zZm9ybVRyYW5zaXRpb24gPSAoZWw6IEhUTUxFbGVtZW50LCBwcm9wOiBzdHJpbmcsIG1zZWM6IG51bWJlciwgdGltaW5nRnVuY3Rpb24gPSAnZWFzZScpOiB2b2lkID0+IHtcbiAgICBjb25zdCBhbmltYXRpb24gPSBgJHsobXNlYyAvIDEwMDApfXMgJHt0aW1pbmdGdW5jdGlvbn1gO1xuICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCd0cmFuc2l0aW9uJywgYCR7cHJvcH0gJHthbmltYXRpb259LCB0cmFuc2Zvcm0gJHthbmltYXRpb259YCk7XG59O1xuXG5cbi8qKlxuICogQGVuIENsZWFyIGNzcyB0cmFuc2l0aW9uIHNldHRpbmdzIGZvciBzcGVjaWZpZWQgZWxlbWVudC5cbiAqIEBqYSDmjIflrpropoHntKDjga4gY3NzIHRyYW5zaXRpb24g6Kit5a6a44KS6Kej6ZmkXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgSFRNTEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgSFRNTEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgY29uc3QgY2xlYXJUcmFuc2l0aW9uID0gKGVsOiBIVE1MRWxlbWVudCk6IHZvaWQgPT4ge1xuICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd0cmFuc2l0aW9uJyk7XG59O1xuIiwiZXhwb3J0IGNvbnN0IFVJX0ZPUk1TX1NUQVRVUyA9ICdVTkRFUiBDT05TVFJVQ1RJT04nO1xuXG5pbXBvcnQgeyBub29wLCBwb3N0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcblxuaW1wb3J0IHN0eWxlQ29yZSBmcm9tICdAY3NzL3N0cnVjdHVyZS5jc3MnIHdpdGggeyB0eXBlOiAnY3NzJyB9O1xuaW1wb3J0IHN0eWxlQnV0dG9uIGZyb20gJ0Bjc3Mvc3RydWN0dXJlLWJ1dHRvbi5jc3MnIHdpdGggeyB0eXBlOiAnY3NzJyB9O1xuXG52b2lkIHBvc3Qobm9vcChzdHlsZUNvcmUsIHN0eWxlQnV0dG9uKSk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFVJX0xJU1RWSUVXID0gKENEUF9LTk9XTl9NT0RVTEUuT0ZGU0VUICsgQ0RQX0tOT1dOX1VJX01PRFVMRS5MSVNUVklFVykgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgVUlfTElTVFZJRVdfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9JTklUSUFMSVpBVElPTiA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX0xJU1RWSUVXICsgMSwgJ2xpc3R2aWV3IGhhcyBpbnZhbGlkIGluaXRpYWxpemF0aW9uLicpLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAyLCAnbGlzdHZpZXcgZ2l2ZW4gYSBpbnZhbGlkIHBhcmFtLicpLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX09QRVJBVElPTiAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAzLCAnbGlzdHZpZXcgaW52YWxpZCBvcGVyYXRpb24uJyksXG4gICAgfVxufVxuIiwiLyoqXG4gKiBAZW4gR2xvYmFsIGNvbmZpZ3VyYXRpb24gZGVmaW5pdGlvbiBmb3IgbGlzdCB2aWV3cy5cbiAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjga7jgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjg6zjg7zjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgTkFNRVNQQUNFOiBzdHJpbmc7XG4gICAgU0NST0xMX01BUF9DTEFTUzogc3RyaW5nO1xuICAgIElOQUNUSVZFX0NMQVNTOiBzdHJpbmc7XG4gICAgUkVDWUNMRV9DTEFTUzogc3RyaW5nO1xuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IHN0cmluZztcbiAgICBEQVRBX1BBR0VfSU5ERVg6IHN0cmluZztcbiAgICBEQVRBX0lURU1fSU5ERVg6IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZWZhdWx0ViB7XG4gICAgTkFNRVNQQUNFICAgICAgICAgICA9ICdjZHAtdWknLCAvLyBUT0RPOiBuYW1lc3BhY2Ug44GvIHV0aWxzIOOBq+enu+OBmVxuICAgIFNDUk9MTF9NQVBfQ0xBU1MgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXNjcm9sbC1tYXBgLFxuICAgIElOQUNUSVZFX0NMQVNTICAgICAgPSBgJHtOQU1FU1BBQ0V9LWluYWN0aXZlYCxcbiAgICBSRUNZQ0xFX0NMQVNTICAgICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1yZWN5Y2xlYCxcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1pdGVtLWJhc2VgLFxuICAgIERBVEFfUEFHRV9JTkRFWCAgICAgPSAnZGF0YS1wYWdlLWluZGV4JyxcbiAgICBEQVRBX0lURU1fSU5ERVggICAgID0gJ2RhdGEtaXRlbS1pbmRleCcsXG59XG5cbmNvbnN0IF9jb25maWcgPSB7XG4gICAgTkFNRVNQQUNFOiBEZWZhdWx0Vi5OQU1FU1BBQ0UsXG4gICAgU0NST0xMX01BUF9DTEFTUzogRGVmYXVsdFYuU0NST0xMX01BUF9DTEFTUyxcbiAgICBJTkFDVElWRV9DTEFTUzogRGVmYXVsdFYuSU5BQ1RJVkVfQ0xBU1MsXG4gICAgUkVDWUNMRV9DTEFTUzogRGVmYXVsdFYuUkVDWUNMRV9DTEFTUyxcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBEZWZhdWx0Vi5MSVNUSVRFTV9CQVNFX0NMQVNTLFxuICAgIERBVEFfUEFHRV9JTkRFWDogRGVmYXVsdFYuREFUQV9QQUdFX0lOREVYLFxuICAgIERBVEFfSVRFTV9JTkRFWDogRGVmYXVsdFYuREFUQV9JVEVNX0lOREVYLFxufTtcblxuZXhwb3J0IHR5cGUgTGlzdFZpZXdHbG9iYWxDb25maWdBcmcgPSBQYXJ0aWFsPFxuICAgIFBpY2s8TGlzdFZpZXdHbG9iYWxDb25maWdcbiAgICAgICAgLCAnTkFNRVNQQUNFJ1xuICAgICAgICB8ICdTQ1JPTExfTUFQX0NMQVNTJ1xuICAgICAgICB8ICdJTkFDVElWRV9DTEFTUydcbiAgICAgICAgfCAnUkVDWUNMRV9DTEFTUydcbiAgICAgICAgfCAnTElTVElURU1fQkFTRV9DTEFTUydcbiAgICAgICAgfCAnREFUQV9QQUdFX0lOREVYJ1xuICAgICAgICB8ICdEQVRBX0lURU1fSU5ERVgnXG4gICAgPlxuPjtcblxuY29uc3QgZW5zdXJlTmV3Q29uZmlnID0gKG5ld0NvbmZpZzogTGlzdFZpZXdHbG9iYWxDb25maWdBcmcpOiBQYXJ0aWFsPExpc3RWaWV3R2xvYmFsQ29uZmlnPiA9PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBOQU1FU1BBQ0U6IG5zLFxuICAgICAgICBTQ1JPTExfTUFQX0NMQVNTOiBzY3JvbGxtYXAsXG4gICAgICAgIElOQUNUSVZFX0NMQVNTOiBpbmFjdGl2ZSxcbiAgICAgICAgUkVDWUNMRV9DTEFTUzogcmVjeWNsZSxcbiAgICAgICAgTElTVElURU1fQkFTRV9DTEFTUzogaXRlbWJhc2UsXG4gICAgICAgIERBVEFfUEFHRV9JTkRFWDogZGF0YXBhZ2UsXG4gICAgICAgIERBVEFfSVRFTV9JTkRFWDogZGF0YWl0ZW0sXG4gICAgfSA9IG5ld0NvbmZpZztcblxuICAgIGNvbnN0IE5BTUVTUEFDRSA9IG5zO1xuICAgIGNvbnN0IFNDUk9MTF9NQVBfQ0xBU1MgPSBzY3JvbGxtYXAgPz8gKG5zID8gYCR7bnN9LWxpc3R2aWV3LXNjcm9sbC1tYXBgIDogdW5kZWZpbmVkKTtcbiAgICBjb25zdCBJTkFDVElWRV9DTEFTUyA9IGluYWN0aXZlID8/IChucyA/IGAke25zfS1pbmFjdGl2ZWAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IFJFQ1lDTEVfQ0xBU1MgPSByZWN5Y2xlID8/IChucyA/IGAke25zfS1saXN0dmlldy1yZWN5Y2xlYCA6IHVuZGVmaW5lZCk7XG4gICAgY29uc3QgTElTVElURU1fQkFTRV9DTEFTUyA9IGl0ZW1iYXNlID8/IChucyA/IGAke25zfS1saXN0dmlldy1pdGVtLWJhc2VgIDogdW5kZWZpbmVkKTtcblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG5ld0NvbmZpZywge1xuICAgICAgICBOQU1FU1BBQ0UsXG4gICAgICAgIFNDUk9MTF9NQVBfQ0xBU1MsXG4gICAgICAgIElOQUNUSVZFX0NMQVNTLFxuICAgICAgICBSRUNZQ0xFX0NMQVNTLFxuICAgICAgICBMSVNUSVRFTV9CQVNFX0NMQVNTLFxuICAgICAgICBEQVRBX1BBR0VfSU5ERVg6IGRhdGFwYWdlLFxuICAgICAgICBEQVRBX0lURU1fSU5ERVg6IGRhdGFpdGVtLFxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBAZW4gR2V0L1VwZGF0ZSBnbG9iYWwgY29uZmlndXJhdGlvbiBvZiBsaXN0IHZpZXcuXG4gKiBAamEg44Oq44K544OI44OT44Ol44O844Gu44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Os44O844K344On44Oz44Gu5Y+W5b6XL+abtOaWsFxuICovXG5leHBvcnQgY29uc3QgTGlzdFZpZXdHbG9iYWxDb25maWcgPSAobmV3Q29uZmlnPzogTGlzdFZpZXdHbG9iYWxDb25maWdBcmcpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyA9PiB7XG4gICAgaWYgKG5ld0NvbmZpZykge1xuICAgICAgICBlbnN1cmVOZXdDb25maWcobmV3Q29uZmlnKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMobmV3Q29uZmlnKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gbmV3Q29uZmlnW2tleSBhcyBrZXlvZiBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZ10pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgbmV3Q29uZmlnW2tleSBhcyBrZXlvZiBMaXN0Vmlld0dsb2JhbENvbmZpZ0FyZ107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIE9iamVjdC5hc3NpZ24oX2NvbmZpZywgbmV3Q29uZmlnKSk7XG59O1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgfSBmcm9tICdAY2RwL3VpLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9iYXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdEl0ZW1WaWV3LFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcixcbiAgICBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMsXG59IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHsgTGlzdFZpZXdHbG9iYWxDb25maWcgfSBmcm9tICcuLi9nbG9iYWwtY29uZmlnJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIGxpc3QgaXRlbXMuXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgSXRlbVByb2ZpbGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUxpc3RDb250ZXh0O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcjtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5mbzogVW5rbm93bk9iamVjdDtcbiAgICAvKiogQGludGVybmFsIGdsb2JhbCBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4PzogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgYmVsb25naW5nIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9wYWdlSW5kZXg/OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCBnbG9iYWwgb2Zmc2V0ICovXG4gICAgcHJpdmF0ZSBfb2Zmc2V0ID0gMDtcbiAgICAvKiogQGludGVybmFsIGJhc2UgZG9tIGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfJGJhc2U/OiBET007XG4gICAgLyoqIEBpbnRlcm5hbCBJTGlzdEl0ZW1WaWV3IGluc3RhbmNlICovXG4gICAgcHJpdmF0ZSBfaW5zdGFuY2U/OiBJTGlzdEl0ZW1WaWV3O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RWaWV3Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGhlaWdodFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpdGVtJ3MgaGVpZ2h0XG4gICAgICogIC0gYGphYCBpdGVtIOOBruWIneacn+OBrumrmOOBlVxuICAgICAqIEBwYXJhbSBpbml0aWFsaXplclxuICAgICAqICAtIGBlbmAgY29uc3RydWN0b3IgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluZm9cbiAgICAgKiAgLSBgZW5gIGluaXQgcGFyYW1ldGVycyBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7liJ3mnJ/ljJbjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUxpc3RDb250ZXh0LCBoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgX2luZm86IFVua25vd25PYmplY3QpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgICAgICAgPSBvd25lcjtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICAgICAgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVyID0gaW5pdGlhbGl6ZXI7XG4gICAgICAgIHRoaXMuX2luZm8gICAgICAgID0gX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGhlaWdodC4gKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgaXRlbSdzIGdsb2JhbCBpbmRleC4gKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgc2V0IGluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy51cGRhdGVJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgYmVsb25naW5nIHRoZSBwYWdlIGluZGV4LiAqL1xuICAgIGdldCBwYWdlSW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VJbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBzZXQgcGFnZUluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fcGFnZUluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIGdldCBvZmZzZXQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICB9XG5cbiAgICAvKiogU2V0IGdsb2JhbCBvZmZzZXQuICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBpbml0IHBhcmFtZXRlcnMuICovXG4gICAgZ2V0IGluZm8oKTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdGhpcy5wcmVwYXJlQmFzZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgZWw6IHRoaXMuXyRiYXNlLFxuICAgICAgICAgICAgICAgIG93bmVyOiB0aGlzLl9vd25lcixcbiAgICAgICAgICAgICAgICBpdGVtOiB0aGlzLFxuICAgICAgICAgICAgfSwgdGhpcy5faW5mbyk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IG5ldyB0aGlzLl9pbml0aWFsaXplcihvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICgnbm9uZScgPT09IHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSW5kZXgoKTtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICd2aXNpYmxlJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgaXRlbSBpbnZpc2libGUuXG4gICAgICogQGphIGl0ZW0g44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmICdoaWRkZW4nICE9PSB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknKSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmFkZENsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVmcmVzaCB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mm7TmlrBcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlLnJlbmRlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBhY3RpdmF0aW9uIHN0YXR1cyBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfnirbmhYvliKTlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2luc3RhbmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgaGVpZ2h0IGluZm9ybWF0aW9uIG9mIHRoZSBpdGVtLiBDYWxsZWQgZnJvbSB7QGxpbmsgTGlzdEl0ZW1WaWV3fS5cbiAgICAgKiBAamEgaXRlbSDjga7pq5jjgZXmg4XloLHjga7mm7TmlrAuIHtAbGluayBMaXN0SXRlbVZpZXd9IOOBi+OCieOCs+ODvOODq+OBleOCjOOCi+OAglxuICAgICAqL1xuICAgIHB1YmxpYyB1cGRhdGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIsIG9wdGlvbnM/OiBMaXN0SXRlbVVwZGF0ZUhlaWdodE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZGVsdGEgPSBuZXdIZWlnaHQgLSB0aGlzLl9oZWlnaHQ7XG4gICAgICAgIHRoaXMuX2hlaWdodCA9IG5ld0hlaWdodDtcbiAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KGRlbHRhKTtcbiAgICAgICAgaWYgKG9wdGlvbnM/LnJlZmxlY3RBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVByb2ZpbGVzKHRoaXMuX2luZGV4ID8/IDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHotaW5kZXguIENhbGxlZCBmcm9tIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYC5cbiAgICAgKiBAamEgei1pbmRleCDjga7jg6rjgrvjg4Pjg4guIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYCDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXREZXB0aCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ3otaW5kZXgnLCB0aGlzLl9vd25lci5vcHRpb25zLmJhc2VEZXB0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcHJlcGFyZUJhc2VFbGVtZW50KCk6IERPTSB7XG4gICAgICAgIGxldCAkYmFzZTogRE9NO1xuICAgICAgICBjb25zdCAkcmVjeWNsZSA9IHRoaXMuX293bmVyLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5maXJzdCgpO1xuICAgICAgICBjb25zdCBpdGVtVGFnTmFtZSA9IHRoaXMuX293bmVyLm9wdGlvbnMuaXRlbVRhZ05hbWU7XG5cbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybigndGhpcy5fJGJhc2UgaXMgbm90IG51bGwuJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fJGJhc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8ICRyZWN5Y2xlLmxlbmd0aCkge1xuICAgICAgICAgICAgJGJhc2UgPSAkcmVjeWNsZTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUF0dHIoJ3otaW5kZXgnKTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUNsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86ICDopoHmpJzoqI4uIDxsaT4g5YWo6Iis44GvIDxzbG90PiDjgajjganjga7jgojjgYbjgavljZToqr/jgZnjgovjgYs/XG4gICAgICAgICAgICAkYmFzZSA9ICQoYDwke2l0ZW1UYWdOYW1lfSBjbGFzcz1cIiR7dGhpcy5fY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1N9XCI+PC9cIiR7aXRlbVRhZ05hbWV9XCI+YCk7XG4gICAgICAgICAgICAkYmFzZS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuJHNjcm9sbE1hcC5hcHBlbmQoJGJhc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g6auY44GV44Gu5pu05pawXG4gICAgICAgIGlmICgkYmFzZS5oZWlnaHQoKSAhPT0gdGhpcy5faGVpZ2h0KSB7XG4gICAgICAgICAgICAkYmFzZS5oZWlnaHQodGhpcy5faGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkYmFzZTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfSVRFTV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9pbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfSVRFTV9JTkRFWCwgdGhpcy5faW5kZXghKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVBhZ2VJbmRleCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuXyRiYXNlICYmIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9wYWdlSW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgsIHRoaXMuX3BhZ2VJbmRleCEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlT2Zmc2V0KCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fb3duZXIub3B0aW9ucy5lbmFibGVUcmFuc2Zvcm1PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKHRoaXMuXyRiYXNlWzBdKTtcbiAgICAgICAgICAgIGlmICh0cmFuc2xhdGVZICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7dGhpcy5fb2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IHBhcnNlSW50KHRoaXMuXyRiYXNlLmNzcygndG9wJyksIDEwKTtcbiAgICAgICAgICAgIGlmICh0b3AgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndG9wJywgYCR7dGhpcy5fb2Zmc2V0fXB4YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBhdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9pdGVtJztcblxuLyoqXG4gKiBAZW4gQSBjbGFzcyB0aGF0IHN0b3JlcyBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gZm9yIG9uZSBwYWdlIG9mIHRoZSBsaXN0LlxuICogQGphIOODquOCueODiDHjg5rjg7zjgrjliIbjga4gVUkg5qeL6YCg5oOF5aCx44KS5qC857SN44GZ44KL44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBQYWdlUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSBvZmZzZXQgZnJvbSB0b3AgKi9cbiAgICBwcml2YXRlIF9vZmZzZXQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgcGFnZSdzIGhlaWdodCAqL1xuICAgIHByaXZhdGUgX2hlaWdodCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBpdGVtJ3MgcHJvZmlsZSBtYW5hZ2VkIHdpdGggaW4gcGFnZSAqL1xuICAgIHByaXZhdGUgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBwYWdlIHN0YXR1cyAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicgPSAnaW5hY3RpdmUnO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGhlaWdodCAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIHN0YXR1cyAqL1xuICAgIGdldCBzdGF0dXMoKTogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdhY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTWFrZSB0aGUgcGFnZSBpbnZpc2libGUuXG4gICAgICogQGphIHBhZ2Ug44Gu5LiN5Y+v6KaW5YyWXG4gICAgICovXG4gICAgcHVibGljIGhpZGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaGlkZGVuJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaGlkZGVuJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVhY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7pnZ7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdpbmFjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHtAbGluayBJdGVtUHJvZmlsZX0gdG8gdGhlIHBhZ2UuXG4gICAgICogQGphIHtAbGluayBJdGVtUHJvZmlsZX0g44Gu6L+95YqgXG4gICAgICovXG4gICAgcHVibGljIHB1c2goaXRlbTogSXRlbVByb2ZpbGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICs9IGl0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJZiBhbGwge0BsaW5rIEl0ZW1Qcm9maWxlfSB1bmRlciB0aGUgcGFnZSBhcmUgbm90IHZhbGlkLCBkaXNhYmxlIHRoZSBwYWdlJ3Mgc3RhdHVzLlxuICAgICAqIEBqYSDphY3kuIvjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgZnjgbnjgabjgYzmnInlirnjgafjgarjgYTloLTlkIgsIHBhZ2Ug44K544OG44O844K/44K544KS54Sh5Yq544Gr44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIG5vcm1hbGl6ZSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW5hYmxlQWxsID0gdGhpcy5faXRlbXMuZXZlcnkoaXRlbSA9PiBpdGVtLmlzQWN0aXZlKCkpO1xuICAgICAgICBpZiAoIWVuYWJsZUFsbCkge1xuICAgICAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2luYWN0aXZlJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIEl0ZW1Qcm9maWxlfSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6a44GX44GmIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW0oaW5kZXg6IG51bWJlcik6IEl0ZW1Qcm9maWxlIHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX2l0ZW1zLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBmaXJzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDliJ3jga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUZpcnN0KCk6IEl0ZW1Qcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zWzBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDlvozjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUxhc3QoKTogSXRlbVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlbXNbdGhpcy5faXRlbXMubGVuZ3RoIC0gMV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMvYmFzZSc7XG5pbXBvcnQgdHlwZSB7IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciB9IGZyb20gJy4uL2ludGVyZmFjZXMvbGlzdC1pdGVtLXZpZXcnO1xuaW1wb3J0IHR5cGUgeyBJRXhwYW5kYWJsZUxpc3RDb250ZXh0IH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9leHBhbmRhYmxlLWNvbnRleHQnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG4vKipcbiAqIEBlbiBVSSBzdHJ1Y3R1cmUgaW5mb3JtYXRpb24gc3RvcmFnZSBjbGFzcyBmb3IgZ3JvdXAgbWFuYWdlbWVudCBvZiBsaXN0IGl0ZW1zLiA8YnI+XG4gKiAgICAgVGhpcyBjbGFzcyBkb2VzIG5vdCBkaXJlY3RseSBtYW5pcHVsYXRlIHRoZSBET00uXG4gKiBAamEg44Oq44K544OI44Ki44Kk44OG44Og44KS44Kw44Or44O844OX566h55CG44GZ44KLIFVJIOani+mAoOaDheWgseagvOe0jeOCr+ODqeOCuSA8YnI+XG4gKiAgICAg5pys44Kv44Op44K544Gv55u05o6l44GvIERPTSDjgpLmk43kvZzjgZfjgarjgYRcbiAqL1xuZXhwb3J0IGNsYXNzIEdyb3VwUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCBwcm9maWxlIGlkICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaWQ6IHN0cmluZztcbiAgICAvKiogQGludGVybmFsIHtAbGluayBFeHBhbmRhYmxlTGlzdFZpZXd9IGluc3RhbmNlKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsIHBhcmVudCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX3BhcmVudD86IEdyb3VwUHJvZmlsZTtcbiAgICAvKiogQGludGVybmFsIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9IGFycmF5ICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gW107XG4gICAgLyoqIEBpbnRlcm5hbCBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMgKi9cbiAgICBwcml2YXRlIF9leHBhbmRlZCA9IGZhbHNlO1xuICAgIC8qKiBAaW50ZXJuYWwgcmVnaXN0cmF0aW9uIHN0YXR1cyBmb3IgX293bmVyICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJyA9ICd1bnJlZ2lzdGVyZWQnO1xuICAgIC8qKiBAaW50ZXJuYWwgc3RvcmVkIHtAbGluayBJdGVtUHJvZmlsZX0gaW5mb3JtYXRpb24gKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25lclxuICAgICAqICAtIGBlbmAge0BsaW5rIElFeHBhbmRhYmxlTGlzdENvbnRleHR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUV4cGFuZGFibGVMaXN0Q29udGV4dH0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBpZCBvZiB0aGUgaW5zdGFuY2UuIHNwZWNpZmllZCBieSB0aGUgZnJhbWV3b3JrLlxuICAgICAqICAtIGBqYWAg44Kk44Oz44K544K/44Oz44K544GuIElELiDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jgYzmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihvd25lcjogSUV4cGFuZGFibGVMaXN0Q29udGV4dCwgaWQ6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9pZCAgICA9IGlkO1xuICAgICAgICB0aGlzLl9vd25lciA9IG93bmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgSUQuXG4gICAgICogQGphIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQGVuIEdldCBzdGF0dXMuICdyZWdpc3RlcmVkJyB8ICd1bnJlZ2lzdGVyZWQnXG4gICAgICogQGphIOOCueODhuODvOOCv+OCueOCkuWPluW+lyAncmVnaXN0ZXJlZCcgfCAndW5yZWdpc3RlcmVkJ1xuICAgICAqL1xuICAgIGdldCBzdGF0dXMoKTogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBleHBhbmRlZCAvIGNvbGxhcHNlZCBzdGF0dXMuXG4gICAgICogQGphIOWxlemWi+eKtuaFi+OCkuWIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4cGFuZGVkLCBjb2xsYXBzZWQ6IGNsb3NlXG4gICAgICogIC0gYGphYCB0cnVlOiDlsZXplossIGZhbHNlOiDlj47mnZ9cbiAgICAgKi9cbiAgICBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4cGFuZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcGFyZW50IHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDopqoge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHBhcmVudCgpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY2hpbGRyZW4ge0BsaW5rIEdyb3VwUHJvZmlsZX0uXG4gICAgICogQGphIOWtkCB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY2hpbGRyZW4oKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBuZXh0IGF2YWlsYWJsZSBpbmRleCBvZiB0aGUgbGFzdCBpdGVtIGVsZW1lbnQuXG4gICAgICogQGphIOacgOW+jOOBriBpdGVtIOimgee0oOOBruasoeOBq+S9v+eUqOOBp+OBjeOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB3aXRoQWN0aXZlQ2hpbGRyZW4gXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRydWUgdG8gc2VhcmNoIGluY2x1ZGluZyByZWdpc3RlcmVkIGNoaWxkIGVsZW1lbnRzXG4gICAgICogIC0gYGphYCDnmbvpjLLmuIjjgb/jga7lrZDopoHntKDjgpLlkKvjgoHjgabmpJzntKLjgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0TmV4dEl0ZW1JbmRleCh3aXRoQWN0aXZlQ2hpbGRyZW4gPSBmYWxzZSk6IG51bWJlciB7XG4gICAgICAgIGxldCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICBpZiAod2l0aEFjdGl2ZUNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMucXVlcnlPcGVyYXRpb25UYXJnZXQoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsID09IGl0ZW1zIHx8IGl0ZW1zLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMuX2l0ZW1zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaXRlbXNbaXRlbXMubGVuZ3RoIC0gMV0/LmluZGV4ID8/IDApICsgMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIOacrCBHcm91cFByb2ZpbGUg44GM566h55CG44GZ44KLIGl0ZW0g44KS5L2c5oiQ44GX44Gm55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGRJdGVtKFxuICAgICAgICBoZWlnaHQ6IG51bWJlcixcbiAgICAgICAgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvcixcbiAgICAgICAgaW5mbzogVW5rbm93bk9iamVjdCxcbiAgICApOiBHcm91cFByb2ZpbGUge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGdyb3VwOiB0aGlzIH0sIGluZm8pO1xuICAgICAgICBjb25zdCBpdGVtID0gbmV3IEl0ZW1Qcm9maWxlKHRoaXMuX293bmVyLmNvbnRleHQsIE1hdGgudHJ1bmMoaGVpZ2h0KSwgaW5pdGlhbGl6ZXIsIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIF9vd25lciDjga7nrqHnkIbkuIvjgavjgYLjgovjgajjgY3jga/pgJ/jgoTjgYvjgavov73liqBcbiAgICAgICAgaWYgKCdyZWdpc3RlcmVkJyA9PT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtLCB0aGlzLmdldE5leHRJdGVtSW5kZXgoKSk7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQge0BsaW5rIEdyb3VwUHJvZmlsZX0gYXMgY2hpbGQgZWxlbWVudC5cbiAgICAgKiBAamEg5a2Q6KaB57Sg44Go44GX44GmIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldCB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAvIGluc3RhbmNlIGFycmF5XG4gICAgICovXG4gICAgcHVibGljIGFkZENoaWxkcmVuKHRhcmdldDogR3JvdXBQcm9maWxlIHwgR3JvdXBQcm9maWxlW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2hpbGRyZW46IEdyb3VwUHJvZmlsZVtdID0gQXJyYXkuaXNBcnJheSh0YXJnZXQpID8gdGFyZ2V0IDogW3RhcmdldF07XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGNoaWxkLnNldFBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jaGlsZHJlbi5wdXNoKC4uLmNoaWxkcmVuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSBpZiBpdCBoYXMgYSBjaGlsZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg5a2QIHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cywgZmFsc2U6IHVuZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIksIGZhbHNlOiDnhKFcbiAgICAgKi9cbiAgICBnZXQgaGFzQ2hpbGRyZW4oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2NoaWxkcmVuLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXAgZXhwYW5zaW9uLlxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5flsZXplotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZXhwYW5kKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCdyZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICBpZiAoMCA8IGl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX293bmVyLnN0YXR1c1Njb3BlKCdleHBhbmRpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci5fYWRkSXRlbShpdGVtcywgdGhpcy5nZXROZXh0SXRlbUluZGV4KCkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyDlrZDopoHntKDjgYzjgarjgY/jgabjgoLlsZXplovnirbmhYvjgavjgZnjgotcbiAgICAgICAgdGhpcy5fZXhwYW5kZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cCBjb2xsYXBzZS5cbiAgICAgKiBAamEg44Kw44Or44O844OX5Y+O5p2fXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVsYXlcbiAgICAgKiAgLSBgZW5gIGRlbGF5IHRpbWUgc3BlbnQgcmVtb3ZpbmcgZWxlbWVudHMuIFtkZWZhdWx0OiBgYW5pbWF0aW9uRHVyYXRpb25gIHZhbHVlXVxuICAgICAqICAtIGBqYWAg6KaB57Sg5YmK6Zmk44Gr6LK744KE44GZ6YGF5bu25pmC6ZaTLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgY29sbGFwc2UoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KCd1bnJlZ2lzdGVyZWQnKTtcbiAgICAgICAgICAgIGlmICgwIDwgaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsYXkgPSBkZWxheSA/PyB0aGlzLl9vd25lci5jb250ZXh0Lm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb247XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fb3duZXIuc3RhdHVzU2NvcGUoJ2NvbGxhcHNpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHqui6q+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIOmFjeS4i+OCkuabtOaWsFxuICAgICAgICAgICAgICAgICAgICBpdGVtc1swXS5pbmRleCAmJiB0aGlzLl9vd25lci5yZW1vdmVJdGVtKGl0ZW1zWzBdLmluZGV4LCBpdGVtcy5sZW5ndGgsIGRlbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5a2Q6KaB57Sg44GM44Gq44GP44Gm44KC5Y+O5p2f54q25oWL44Gr44GZ44KLXG4gICAgICAgIHRoaXMuX2V4cGFuZGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3cgc2VsZiBpbiB2aXNpYmxlIGFyZWEgb2YgbGlzdC5cbiAgICAgKiBAamEg6Ieq6Lqr44KS44Oq44K544OI44Gu5Y+v6KaW6aCY5Z+f44Gr6KGo56S6XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAge0BsaW5rIExpc3RFbnN1cmVWaXNpYmxlT3B0aW9uc30gb3B0aW9uJ3Mgb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBlbnN1cmVWaXNpYmxlKG9wdGlvbnM/OiBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIChudWxsICE9IHRoaXMuX2l0ZW1zWzBdLmluZGV4KSAmJiBhd2FpdCB0aGlzLl9vd25lci5lbnN1cmVWaXNpYmxlKHRoaXMuX2l0ZW1zWzBdLmluZGV4LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnM/LmNhbGxiYWNrPy4odGhpcy5fb3duZXIuc2Nyb2xsUG9zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUb2dnbGUgZXhwYW5kIC8gY29sbGFwc2UuXG4gICAgICogQGphIOmWi+mWieOBruODiOOCsOODq1xuICAgICAqXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHNwZW50IHJlbW92aW5nIGVsZW1lbnRzLiBbZGVmYXVsdDogYGFuaW1hdGlvbkR1cmF0aW9uYCB2YWx1ZV1cbiAgICAgKiAgLSBgamFgIOimgee0oOWJiumZpOOBq+iyu+OChOOBmemBheW7tuaZgumWky4gW2RlZmF1bHQ6IGBhbmltYXRpb25EdXJhdGlvbmAgdmFsdWVdXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHRvZ2dsZShkZWxheT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5fZXhwYW5kZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29sbGFwc2UoZGVsYXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5leHBhbmQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciB0byBsaXN0IHZpZXcuIE9ubHkgMXN0IGxheWVyIGdyb3VwIGNhbiBiZSByZWdpc3RlcmVkLlxuICAgICAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjgbjnmbvpjLIuIOesrDHpmo7lsaTjgrDjg6vjg7zjg5fjga7jgb/nmbvpjLLlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zZXJ0VG9cbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5zZXJ0aW9uIHBvc2l0aW9uIHdpdGggaW5kZXhcbiAgICAgKiAgLSBgamFgIOaMv+WFpeS9jee9ruOCkiBpbmRleCDjgafmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIoaW5zZXJ0VG86IG51bWJlcik6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3JlZ2lzdGVyJyBtZXRob2QgaXMgYWNjZXB0YWJsZSBvbmx5IDFzdCBsYXllciBncm91cC5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKHRoaXMucHJlcHJvY2VzcygncmVnaXN0ZXJlZCcpLCBpbnNlcnRUbyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN0b3JlIHRvIGxpc3Qgdmlldy4gT25seSAxc3QgbGF5ZXIgZ3JvdXAgY2FuIGJlIHNwZWNpZmllZC5cbiAgICAgKiBAamEg44Oq44K544OI44OT44Ol44O844G45b6p5YWDLiDnrKwx6ZqO5bGk44Kw44Or44O844OX44Gu44G/5oyH56S65Y+v6IO9LlxuICAgICAqL1xuICAgIHB1YmxpYyByZXN0b3JlKCk6IHRoaXMge1xuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSAnR3JvdXBQcm9maWxlI3Jlc3RvcmUnIG1ldGhvZCBpcyBhY2NlcHRhYmxlIG9ubHkgMXN0IGxheWVyIGdyb3VwLmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5fZXhwYW5kZWQgPyB0aGlzLl9pdGVtcy5jb25jYXQodGhpcy5xdWVyeU9wZXJhdGlvblRhcmdldCgnYWN0aXZlJykpIDogdGhpcy5faXRlbXMuc2xpY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLl9hZGRJdGVtKGl0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwg6KaqIEdyb3VwIOaMh+WumiAqL1xuICAgIHByaXZhdGUgc2V0UGFyZW50KHBhcmVudDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICByZWdpc3RlciAvIHVucmVnaXN0ZXIg44Gu5YmN5Yem55CGICovXG4gICAgcHJpdmF0ZSBwcmVwcm9jZXNzKG5ld1N0YXR1czogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcpOiBJdGVtUHJvZmlsZVtdIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAgICAgaWYgKG5ld1N0YXR1cyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKC4uLnRoaXMuX2l0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSBuZXdTdGF0dXM7XG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIOaTjeS9nOWvvuixoeOBriBJdGVtUHJvZmlsZSDphY3liJfjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIHF1ZXJ5T3BlcmF0aW9uVGFyZ2V0KG9wZXJhdGlvbjogJ3JlZ2lzdGVyZWQnIHwgJ3VucmVnaXN0ZXJlZCcgfCAnYWN0aXZlJyk6IEl0ZW1Qcm9maWxlW10ge1xuICAgICAgICBjb25zdCBmaW5kVGFyZ2V0cyA9IChncm91cDogR3JvdXBQcm9maWxlKTogSXRlbVByb2ZpbGVbXSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBncm91cC5fY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndW5yZWdpc3RlcmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGQucHJlcHJvY2VzcyhvcGVyYXRpb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdhY3RpdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY2hpbGQuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZC5faXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0aW9uOiAke29wZXJhdGlvbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmZpbmRUYXJnZXRzKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmluZFRhcmdldHModGhpcyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgVmlldyxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBJTGlzdFZpZXcsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxuICAgIElMaXN0SXRlbVZpZXcsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IEl0ZW1Qcm9maWxlIH0gZnJvbSAnLi9wcm9maWxlJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IG93bmVyOiBJTGlzdFZpZXc7XG4gICAgcmVhZG9ubHkgaXRlbTogSXRlbVByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIExpc3RJdGVtVmlld30gY29uc3RydWN0aW9uLlxuICogQGphIHtAbGluayBMaXN0SXRlbVZpZXd9IOani+evieOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50LCBURnVuY05hbWU+IHtcbiAgICBvd25lcjogSUxpc3RWaWV3O1xuICAgIGl0ZW06IEl0ZW1Qcm9maWxlO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IGl0ZW0gY29udGFpbmVyIGNsYXNzIGhhbmRsZWQgYnkge0BsaW5rIExpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBjOaJseOBhuODquOCueODiOOCouOCpOODhuODoOOCs+ODs+ODhuODiuOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdEl0ZW1WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+XG4gICAgZXh0ZW5kcyBWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUxpc3RJdGVtVmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG93bmVyLCBpdGVtIH0gPSBvcHRpb25zO1xuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk+KSA9IHtcbiAgICAgICAgICAgIG93bmVyLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKiBPd25lciDlj5blvpcgKi9cbiAgICBnZXQgb3duZXIoKTogSUxpc3RWaWV3IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLm93bmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFZpZXcgY29tcG9uZW50IG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy4kZWwuY2hpbGRyZW4oKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy4kZWwub2ZmKCk7XG4gICAgICAgIC8vIHRoaXMuJGVsIOOBr+WGjeWIqeeUqOOBmeOCi+OBn+OCgeWujOWFqOOBquegtOajhOOBr+OBl+OBquOBhFxuICAgICAgICB0aGlzLnNldEVsZW1lbnQoJ251bGwnKTtcbiAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0SXRlbVZpZXdcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgb3duIGl0ZW0gaW5kZXhcbiAgICAgKiBAamEg6Ieq6Lqr44GuIGl0ZW0g44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLmluZGV4ITtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNwZWNpZmllZCBoZWlnaHQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+mrmOOBleOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLml0ZW0uaGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBpZiBjaGlsZCBub2RlIGV4aXN0cy5cbiAgICAgKiBAamEgY2hpbGQgbm9kZSDjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaGFzQ2hpbGROb2RlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLiRlbD8uY2hpbGRyZW4oKS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBpdGVtJ3MgaGVpZ2h0LlxuICAgICAqIEBqYSBpdGVtIOOBrumrmOOBleOCkuabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld0hlaWdodFxuICAgICAqICAtIGBlbmAgbmV3IGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5paw44GX44GE6auY44GVXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBvcHRpb25zIG9iamVjdFxuICAgICAqICAtIGBqYWAg5pu05paw44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzLiRlbCAmJiB0aGlzLmhlaWdodCAhPT0gbmV3SGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5pdGVtLnVwZGF0ZUhlaWdodChuZXdIZWlnaHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy4kZWwuaGVpZ2h0KG5ld0hlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIE51bGxhYmxlLFxuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgdHlwZSBET01FdmVudExpc3RlbmVyLFxuICAgIHR5cGUgQ29ubmVjdEV2ZW50TWFwLFxuICAgIHR5cGUgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdFNjcm9sbGVyRmFjdG9yeSxcbiAgICBMaXN0Q29udGV4dE9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgU2Nyb2xsZXJFdmVudE1hcCA9IEhUTUxFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXAgJiB7ICdzY3JvbGxzdG9wJzogRXZlbnQ7IH07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIE1JTl9TQ1JPTExTVE9QX0RVUkFUSU9OID0gNTAsXG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBIVE1MRWxlbWVudC5cbiAqIEBqYSBIVE1MRWxlbWVudCDjgpLlr77osaHjgajjgZfjgZ8ge0BsaW5rIElMaXN0U2Nyb2xsZXJ9IOWun+ijheOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRWxlbWVudFNjcm9sbGVyIGltcGxlbWVudHMgSUxpc3RTY3JvbGxlciB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJHRhcmdldDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRzY3JvbGxNYXA6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnM7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc2Nyb2xsU3RvcFRyaWdnZXI6IERPTUV2ZW50TGlzdGVuZXI7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsRHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IERPTVNlbGVjdG9yLCBtYXA6IERPTVNlbGVjdG9yLCBvcHRpb25zOiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldCA9ICQodGFyZ2V0KTtcbiAgICAgICAgdGhpcy5fJHNjcm9sbE1hcCA9IHRoaXMuXyR0YXJnZXQuY2hpbGRyZW4oKS5maXJzdCgpO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcblxuICAgICAgICAvKlxuICAgICAgICAgKiBmaXJlIGN1c3RvbSBldmVudDogYHNjcm9sbHN0b3BgXG4gICAgICAgICAqIGBzY3JvbGxlbmRgIOOBriBTYWZhcmkg5a++5b+c5b6F44GhXG4gICAgICAgICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9FbGVtZW50L3Njcm9sbGVuZF9ldmVudFxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IHRpbWVyOiBUaW1lckhhbmRsZTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcFRyaWdnZXIgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSB0aW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuXyR0YXJnZXQudHJpZ2dlcihuZXcgQ3VzdG9tRXZlbnQoJ3Njcm9sbHN0b3AnLCB7IGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUgfSkpO1xuICAgICAgICAgICAgfSwgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPz8gQ29uc3QuTUlOX1NDUk9MTFNUT1BfRFVSQVRJT04pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9uKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxTdG9wVHJpZ2dlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKiog44K/44Kk44OX5a6a576p6K2Y5Yil5a2QICovXG4gICAgc3RhdGljIGdldCBUWVBFKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnY2RwOmVsZW1lbnQtb3ZlcmZsb3ctc2Nyb2xsZXInO1xuICAgIH1cblxuICAgIC8qKiBmYWN0b3J5IOWPluW+lyAqL1xuICAgIHN0YXRpYyBnZXRGYWN0b3J5KCk6IExpc3RTY3JvbGxlckZhY3Rvcnkge1xuICAgICAgICBjb25zdCBmYWN0b3J5ID0gKHRhcmdldDogRE9NU2VsZWN0b3IsIG1hcDogRE9NU2VsZWN0b3IsIG9wdGlvbnM6IExpc3RDb250ZXh0T3B0aW9ucyk6IElMaXN0U2Nyb2xsZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBFbGVtZW50U2Nyb2xsZXIodGFyZ2V0LCBtYXAsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBzZXQgdHlwZSBzaWduYXR1cmUuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGZhY3RvcnksIHtcbiAgICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBFbGVtZW50U2Nyb2xsZXIuVFlQRSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFjdG9yeSBhcyBMaXN0U2Nyb2xsZXJGYWN0b3J5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsZXJcblxuICAgIC8qKiBTY3JvbGxlciDjga7lnovmg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXQgdHlwZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gRWxlbWVudFNjcm9sbGVyLlRZUEU7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruWPluW+lyAqL1xuICAgIGdldCBwb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyR0YXJnZXQuc2Nyb2xsVG9wKCk7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+acgOWkp+WApOS9jee9ruOCkuWPluW+lyAqL1xuICAgIGdldCBwb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuXyRzY3JvbGxNYXAuaGVpZ2h0KCkgLSB0aGlzLl8kdGFyZ2V0LmhlaWdodCgpLCAwKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76YyyICovXG4gICAgb24odHlwZTogJ3Njcm9sbCcgfCAnc2Nyb2xsc3RvcCcsIGNhbGxiYWNrOiBET01FdmVudExpc3RlbmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQub248U2Nyb2xsZXJFdmVudE1hcD4odHlwZSwgY2FsbGJhY2sgYXMgVW5rbm93bkZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI55m76Yyy6Kej6ZmkICovXG4gICAgb2ZmKHR5cGU6ICdzY3JvbGwnIHwgJ3Njcm9sbHN0b3AnLCBjYWxsYmFjazogRE9NRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICB0aGlzLl8kdGFyZ2V0Lm9mZjxTY3JvbGxlckV2ZW50TWFwPih0eXBlLCBjYWxsYmFjayBhcyBVbmtub3duRnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHBvcyA9PT0gdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AoKSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbER1cmF0aW9uID0gKGFuaW1hdGUgPz8gdGhpcy5fb3B0aW9ucy5lbmFibGVBbmltYXRpb24pID8gdGltZSA/PyB0aGlzLl9vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fJHRhcmdldC5zY3JvbGxUb3AocG9zLCB0aGlzLl9zY3JvbGxEdXJhdGlvbiwgdW5kZWZpbmVkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsRHVyYXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKiBTY3JvbGxlciDjga7nirbmhYvmm7TmlrAgKi9cbiAgICB1cGRhdGUoKTogdm9pZCB7XG4gICAgICAgIC8vIG5vb3BcbiAgICB9XG5cbiAgICAvKiogU2Nyb2xsZXIg44Gu56C05qOEICovXG4gICAgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldD8ub2ZmKCk7XG4gICAgICAgICh0aGlzLl8kdGFyZ2V0IGFzIE51bGxhYmxlPERPTT4pID0gKHRoaXMuXyRzY3JvbGxNYXAgYXMgTnVsbGFibGU8RE9NPikgPSBudWxsO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBwb3N0LFxuICAgIG5vb3AsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b0hlbHBTdHJpbmcsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQge1xuICAgIGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyxcbiAgICBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uLFxuICAgIGNsZWFyVHJhbnNpdGlvbixcbn0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0Q29udGV4dCxcbiAgICBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnMsXG4gICAgSUxpc3RTY3JvbGxlcixcbiAgICBJTGlzdE9wZXJhdGlvbixcbiAgICBJTGlzdFNjcm9sbGFibGUsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlLFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Vmlld0dsb2JhbENvbmZpZyB9IGZyb20gJy4uL2dsb2JhbC1jb25maWcnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUsIFBhZ2VQcm9maWxlIH0gZnJvbSAnLi4vcHJvZmlsZSc7XG5pbXBvcnQgeyBFbGVtZW50U2Nyb2xsZXIgfSBmcm9tICcuL2VsZW1lbnQtc2Nyb2xsZXInO1xuXG4vKiogTGlzdENvbnRleHRPcHRpb25zIOaXouWumuWApCAqL1xuY29uc3QgX2RlZmF1bHRPcHRzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+ID0ge1xuICAgIHNjcm9sbGVyRmFjdG9yeTogRWxlbWVudFNjcm9sbGVyLmdldEZhY3RvcnkoKSxcbiAgICBlbmFibGVIaWRkZW5QYWdlOiBmYWxzZSxcbiAgICBlbmFibGVUcmFuc2Zvcm1PZmZzZXQ6IHRydWUsXG4gICAgc2Nyb2xsTWFwUmVmcmVzaEludGVydmFsOiAyMDAsXG4gICAgc2Nyb2xsUmVmcmVzaERpc3RhbmNlOiAyMDAsXG4gICAgcGFnZVByZXBhcmVDb3VudDogMyxcbiAgICBwYWdlUHJlbG9hZENvdW50OiAxLFxuICAgIGVuYWJsZUFuaW1hdGlvbjogdHJ1ZSxcbiAgICBhbmltYXRpb25EdXJhdGlvbjogMCxcbiAgICBiYXNlRGVwdGg6ICdhdXRvJyxcbiAgICBpdGVtVGFnTmFtZTogJ2RpdicsXG4gICAgcmVtb3ZlSXRlbVdpdGhUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHVzZUR1bW15SW5hY3RpdmVTY3JvbGxNYXA6IGZhbHNlLFxufTtcblxuLyoqIGludmFsaWQgaW5zdGFuY2UgKi9cbmNvbnN0IF8kaW52YWxpZCA9ICQoKSBhcyBET007XG5cbi8qKiDliJ3mnJ/ljJbmuIjjgb/jgYvmpJzoqLwgKi9cbmZ1bmN0aW9uIHZlcmlmeTxUPih4OiBUIHwgdW5kZWZpbmVkKTogYXNzZXJ0cyB4IGlzIFQge1xuICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OKTtcbiAgICB9XG59XG5cbi8qKiBvdmVyZmxvdy15IOOCkuS/neiovCAqL1xuZnVuY3Rpb24gZW5zdXJlT3ZlcmZsb3dZKCRlbDogRE9NKTogRE9NIHtcbiAgICBjb25zdCBvdmVyZmxvd1kgPSAkZWwuY3NzKCdvdmVyZmxvdy15Jyk7XG4gICAgaWYgKCdoaWRkZW4nID09PSBvdmVyZmxvd1kgfHwgJ3Zpc2libGUnID09PSBvdmVyZmxvd1kpIHtcbiAgICAgICAgJGVsLmNzcygnb3ZlcmZsb3cteScsICdhdXRvJyk7XG4gICAgfVxuICAgIHJldHVybiAkZWw7XG59XG5cbi8qKiBzY3JvbGwtbWFwIGVsZW1lbnQg44KS5L+d6Ki8ICovXG5mdW5jdGlvbiBlbnN1cmVTY3JvbGxNYXAoJHJvb3Q6IERPTSwgbWFwQ2xhc3M6IHN0cmluZyk6IERPTSB7XG4gICAgbGV0ICRtYXAgPSAkcm9vdC5maW5kKGAuJHttYXBDbGFzc31gKTtcbiAgICAvLyAkbWFwIOOBjOeEoeOBhOWgtOWQiOOBr+S9nOaIkOOBmeOCi1xuICAgIGlmICgkbWFwLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICRtYXAgPSAkKGA8ZGl2IGNsYXNzPVwiJHttYXBDbGFzc31cIj48L2Rpdj5gKTtcbiAgICAgICAgJHJvb3QuYXBwZW5kKCRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gJG1hcDtcbn1cblxuLyoqIEBpbnRlcm5hbCDjgqLjgqTjg4bjg6DliYrpmaTmg4XloLEgKi9cbmludGVyZmFjZSBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgIHJlbW92ZWQ6IEl0ZW1Qcm9maWxlW107XG4gICAgZGVsdGE6IG51bWJlcjtcbiAgICB0cmFuc2l0aW9uOiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIGZvciBzY3JvbGwgcHJvY2Vzc2luZyB0aGF0IG1hbmFnZXMgbWVtb3J5LiBBY2Nlc3NlcyB0aGUgRE9NLlxuICogQGphIOODoeODouODqueuoeeQhuOCkuihjOOBhuOCueOCr+ODreODvOODq+WHpueQhuOBruOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuS4gRE9NIOOBq+OCouOCr+OCu+OCueOBmeOCiy5cbiAqL1xuZXhwb3J0IGNsYXNzIExpc3RDb3JlIGltcGxlbWVudHMgSUxpc3RDb250ZXh0LCBJTGlzdE9wZXJhdGlvbiwgSUxpc3RTY3JvbGxhYmxlLCBJTGlzdEJhY2t1cFJlc3RvcmUge1xuICAgIHByaXZhdGUgXyRyb290OiBET007XG4gICAgcHJpdmF0ZSBfJG1hcDogRE9NO1xuICAgIHByaXZhdGUgX21hcEhlaWdodCA9IDA7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsZXI6IElMaXN0U2Nyb2xsZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKiogVUkg6KGo56S65Lit44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9hY3RpdmUgPSB0cnVlO1xuXG4gICAgLyoqIOWIneacn+OCquODl+OCt+ODp+ODs+OCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3NldHRpbmdzOiBSZXF1aXJlZDxMaXN0Q29udGV4dE9wdGlvbnM+O1xuICAgIC8qKiBTY3JvbGwgRXZlbnQgSGFuZGxlciAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Njcm9sbEV2ZW50SGFuZGxlcjogKGV2PzogRXZlbnQpID0+IHZvaWQ7XG4gICAgLyoqIFNjcm9sbCBTdG9wIEV2ZW50IEhhbmRsZXIgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zY3JvbGxTdG9wRXZlbnRIYW5kbGVyOiAoZXY/OiBFdmVudCkgPT4gdm9pZDtcbiAgICAvKiogMeODmuODvOOCuOWIhuOBrumrmOOBleOBruWfuua6luWApCAqL1xuICAgIHByaXZhdGUgX2Jhc2VIZWlnaHQgPSAwO1xuICAgIC8qKiDnrqHnkIbkuIvjgavjgYLjgosgSXRlbVByb2ZpbGUg6YWN5YiXICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBbXTtcbiAgICAvKiog566h55CG5LiL44Gr44GC44KLIFBhZ2VQcm9maWxlIOmFjeWIlyAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhZ2VzOiBQYWdlUHJvZmlsZVtdID0gW107XG5cbiAgICAvKiog5pyA5paw44Gu6KGo56S66aCY5Z+f5oOF5aCx44KS5qC857SNIChTY3JvbGwg5Lit44Gu5pu05paw5Yem55CG44Gr5L2/55SoKSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2xhc3RBY3RpdmVQYWdlQ29udGV4dCA9IHtcbiAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgIGZyb206IDAsXG4gICAgICAgIHRvOiAwLFxuICAgICAgICBwb3M6IDAsICAgIC8vIHNjcm9sbCBwb3NpdGlvblxuICAgIH07XG5cbiAgICAvKiog44OH44O844K/44GuIGJhY2t1cCDpoJjln58uIGtleSDjgaggX2l0ZW1zIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfT4gPSB7fTtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBMaXN0Q29udGV4dE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSB0aGlzLl8kbWFwID0gXyRpbnZhbGlkO1xuICAgICAgICB0aGlzLl9zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIF9kZWZhdWx0T3B0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblNjcm9sbCh0aGlzLl9zY3JvbGxlciEucG9zKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlciA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TY3JvbGxTdG9wKHRoaXMuX3Njcm9sbGVyIS5wb3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqIOWGhemDqOOCquODluOCuOOCp+OCr+ODiOOBruWIneacn+WMliAqL1xuICAgIHB1YmxpYyBpbml0aWFsaXplKCRyb290OiBET00sIGhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIOaXouOBq+ani+evieOBleOCjOOBpuOBhOOBn+WgtOWQiOOBr+egtOajhFxuICAgICAgICBpZiAodGhpcy5fJHJvb3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuXyRyb290ID0gZW5zdXJlT3ZlcmZsb3dZKCRyb290KTtcbiAgICAgICAgdGhpcy5fJG1hcCAgPSBlbnN1cmVTY3JvbGxNYXAodGhpcy5fJHJvb3QsIHRoaXMuX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHRoaXMuY3JlYXRlU2Nyb2xsZXIoKTtcbiAgICAgICAgdGhpcy5zZXRCYXNlSGVpZ2h0KGhlaWdodCk7XG4gICAgICAgIHRoaXMuc2V0U2Nyb2xsZXJDb25kaXRpb24oKTtcbiAgICB9XG5cbiAgICAvKiog5YaF6YOo44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEICovXG4gICAgcHVibGljIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVzZXRTY3JvbGxlckNvbmRpdGlvbigpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8uZGVzdHJveSgpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXMuXyRyb290ID0gdGhpcy5fJG1hcCA9IF8kaW52YWxpZDtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K444Gu5Z+65rqW5YCk44KS5Y+W5b6XICovXG4gICAgcHVibGljIHNldEJhc2VIZWlnaHQoaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKGhlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0sXG4gICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbYmFzZSBoaWdodDogJHtoZWlnaHR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fYmFzZUhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL6Kit5a6aICovXG4gICAgcHVibGljIGFzeW5jIHNldEFjdGl2ZVN0YXRlKGFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG4gICAgICAgIGF3YWl0IHRoaXMudHJlYXRTY3JvbGxQb3NpdGlvbigpO1xuICAgIH1cblxuICAgIC8qKiBhY3RpdmUg54q25oWL5Yik5a6aICovXG4gICAgZ2V0IGFjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5L2N572u44Gu5L+d5a2YL+W+qeWFgyAqL1xuICAgIHB1YmxpYyBhc3luYyB0cmVhdFNjcm9sbFBvc2l0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuXG4gICAgICAgIGNvbnN0IG9mZnNldCA9ICh0aGlzLl9zY3JvbGxlci5wb3MgLSB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zKTtcbiAgICAgICAgY29uc3QgeyB1c2VEdW1teUluYWN0aXZlU2Nyb2xsTWFwOiB1c2VEdW1teU1hcCB9ID0gdGhpcy5fc2V0dGluZ3M7XG5cbiAgICAgICAgY29uc3QgdXBkYXRlT2Zmc2V0ID0gKCR0YXJnZXQ6IERPTSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2xhdGVZIH0gPSBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMoJHRhcmdldFswXSk7XG4gICAgICAgICAgICBpZiAob2Zmc2V0ICE9PSB0cmFuc2xhdGVZKSB7XG4gICAgICAgICAgICAgICAgJHRhcmdldC5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7b2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9zY3JvbGxlci5zY3JvbGxUbyh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zLCBmYWxzZSwgMCk7XG4gICAgICAgICAgICB0aGlzLl8kbWFwLmNzcyh7ICd0cmFuc2Zvcm0nOiAnJywgJ2Rpc3BsYXknOiAnYmxvY2snIH0pO1xuICAgICAgICAgICAgaWYgKHVzZUR1bW15TWFwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmVwYXJlSW5hY3RpdmVNYXAoKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0ICRtYXAgPSB1c2VEdW1teU1hcCA/IHRoaXMucHJlcGFyZUluYWN0aXZlTWFwKCkgOiB0aGlzLl8kbWFwO1xuICAgICAgICAgICAgdXBkYXRlT2Zmc2V0KCRtYXApO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RDb250ZXh0XG5cbiAgICAvKiogZ2V0IHNjcm9sbC1tYXAgZWxlbWVudCAqL1xuICAgIGdldCAkc2Nyb2xsTWFwKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwO1xuICAgIH1cblxuICAgIC8qKiBnZXQgc2Nyb2xsLW1hcCBoZWlnaHQgW3B4XSAqL1xuICAgIGdldCBzY3JvbGxNYXBIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRtYXAubGVuZ3RoID8gdGhpcy5fbWFwSGVpZ2h0IDogMDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IHtAbGluayBMaXN0Q29udGV4dE9wdGlvbnN9ICovXG4gICAgZ2V0IG9wdGlvbnMoKTogUmVxdWlyZWQ8TGlzdENvbnRleHRPcHRpb25zPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogdXBkYXRlIHNjcm9sbC1tYXAgaGVpZ2h0IChkZWx0YSBbcHhdKSAqL1xuICAgIHVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kbWFwLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ICs9IE1hdGgudHJ1bmMoZGVsdGEpO1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZS5cbiAgICAgICAgICAgIGlmICh0aGlzLl9tYXBIZWlnaHQgPCAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuXyRtYXAuaGVpZ2h0KHRoaXMuX21hcEhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogdXBkYXRlIGludGVybmFsIHByb2ZpbGUgKi9cbiAgICB1cGRhdGVQcm9maWxlcyhmcm9tOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBfaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGZvciAobGV0IGkgPSBmcm9tLCBuID0gX2l0ZW1zLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgaWYgKDAgPCBpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IF9pdGVtc1tpIC0gMV07XG4gICAgICAgICAgICAgICAgX2l0ZW1zW2ldLmluZGV4ID0gbGFzdC5pbmRleCEgKyAxO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSBsYXN0Lm9mZnNldCArIGxhc3QuaGVpZ2h0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfaXRlbXNbaV0uaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIF9pdGVtc1tpXS5vZmZzZXQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCByZWN5Y2xhYmxlIGVsZW1lbnQgKi9cbiAgICBmaW5kUmVjeWNsZUVsZW1lbnRzKCk6IERPTSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kbWFwLmZpbmQoYC4ke3RoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTfWApO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0Vmlld1xuXG4gICAgLyoqIOWIneacn+WMlua4iOOBv+OBi+WIpOWumiAqL1xuICAgIGdldCBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9zY3JvbGxlcjtcbiAgICB9XG5cbiAgICAvKiogaXRlbSDnmbvpjLIgKi9cbiAgICBhZGRJdGVtKGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogSUxpc3RJdGVtVmlld0NvbnN0cnVjdG9yLCBpbmZvOiBVbmtub3duT2JqZWN0LCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hZGRJdGVtKG5ldyBJdGVtUHJvZmlsZSh0aGlzLCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiBpdGVtIOeZu+mMsiAo5YaF6YOo55SoKSAqL1xuICAgIF9hZGRJdGVtKGl0ZW06IEl0ZW1Qcm9maWxlIHwgSXRlbVByb2ZpbGVbXSwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1Qcm9maWxlW10gPSBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbSA6IFtpdGVtXTtcbiAgICAgICAgbGV0IGRlbHRhSGVpZ2h0ID0gMDtcbiAgICAgICAgbGV0IGFkZFRhaWwgPSBmYWxzZTtcblxuICAgICAgICBpZiAobnVsbCA9PSBpbnNlcnRUbyB8fCB0aGlzLl9pdGVtcy5sZW5ndGggPCBpbnNlcnRUbykge1xuICAgICAgICAgICAgaW5zZXJ0VG8gPSB0aGlzLl9pdGVtcy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zZXJ0VG8gPT09IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRkVGFpbCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgbWFwIOOBruabtOaWsFxuICAgICAgICBmb3IgKGNvbnN0IGl0IG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBkZWx0YUhlaWdodCArPSBpdC5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGFIZWlnaHQpO1xuXG4gICAgICAgIC8vIOaMv+WFpVxuICAgICAgICB0aGlzLl9pdGVtcy5zcGxpY2UoaW5zZXJ0VG8sIDAsIC4uLml0ZW1zKTtcblxuICAgICAgICAvLyBwYWdlIOioreWumuOBruino+mZpFxuICAgICAgICBpZiAoIWFkZFRhaWwpIHtcbiAgICAgICAgICAgIGlmICgwID09PSBpbnNlcnRUbykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5faXRlbXNbaW5zZXJ0VG8gLSAxXS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbnNlcnRUbyAtIDFdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvZmZzZXQg44Gu5YaN6KiI566XXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gSXRlbSDjgpLliYrpmaQgKi9cbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXIsIHNpemU/OiBudW1iZXIsIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcbiAgICByZW1vdmVJdGVtKGluZGV4OiBudW1iZXJbXSwgZGVsYXk/OiBudW1iZXIpOiB2b2lkO1xuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSXRlbVJhbmRvbWx5KGluZGV4LCBhcmcyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXgsIGFyZzIsIGFyZzMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGhlbHBlcjog5YmK6Zmk5YCZ6KOc44Go5aSJ5YyW6YeP44Gu566X5Ye6ICovXG4gICAgcHJpdmF0ZSBfcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5OiBudW1iZXIpOiBSZW1vdmVJdGVtc0NvbnRleHQge1xuICAgICAgICBjb25zdCByZW1vdmVkOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgICAgIGxldCBkZWx0YSA9IDA7XG4gICAgICAgIGxldCB0cmFuc2l0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlcykge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuX2l0ZW1zW2lkeF07XG4gICAgICAgICAgICBkZWx0YSArPSBpdGVtLmhlaWdodDtcbiAgICAgICAgICAgIC8vIOWJiumZpOimgee0oOOBriB6LWluZGV4IOOBruWIneacn+WMllxuICAgICAgICAgICAgaXRlbS5yZXNldERlcHRoKCk7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8g6Ieq5YuV6Kit5a6a44O75YmK6Zmk6YGF5bu25pmC6ZaT44GM6Kit5a6a44GV44KM44GL44Gk44CB44K544Kv44Ot44O844Or44Od44K444K344On44Oz44Gr5aSJ5pu044GM44GC44KL5aC05ZCI44GvIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0aGlzLl9zZXR0aW5ncy5yZW1vdmVJdGVtV2l0aFRyYW5zaXRpb24gJiYgKDAgPCBkZWxheSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLnNjcm9sbFBvcztcbiAgICAgICAgICAgIGNvbnN0IHBvc01heCA9IHRoaXMuc2Nyb2xsUG9zTWF4IC0gZGVsdGE7XG4gICAgICAgICAgICB0cmFuc2l0aW9uID0gKHBvc01heCA8IGN1cnJlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgcmVtb3ZlZCwgZGVsdGEsIHRyYW5zaXRpb24gfTtcbiAgICB9XG5cbiAgICAvKiogaGVscGVyOiDliYrpmaTmmYLjga7mm7TmlrAgKi9cbiAgICBwcml2YXRlIF91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQ6IFJlbW92ZUl0ZW1zQ29udGV4dCwgZGVsYXk6IG51bWJlciwgcHJvZmlsZVVwZGF0ZTogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHJlbW92ZWQsIGRlbHRhLCB0cmFuc2l0aW9uIH0gPSBjb250ZXh0O1xuXG4gICAgICAgIC8vIHRyYW5zaXRpb24g6Kit5a6aXG4gICAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwU2Nyb2xsTWFwVHJhbnNpdGlvbihkZWxheSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjdXN0b21pemUgcG9pbnQ6IOODl+ODreODleOCoeOCpOODq+OBruabtOaWsFxuICAgICAgICBwcm9maWxlVXBkYXRlKCk7XG5cbiAgICAgICAgLy8g44K544Kv44Ot44O844Or6aCY5Z+f44Gu5pu05pawXG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsTWFwSGVpZ2h0KC1kZWx0YSk7XG4gICAgICAgIC8vIOmBheW7tuWJiumZpFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiByZW1vdmVkKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDog6YCj57aaIGluZGV4IOeJiCAqL1xuICAgIHByaXZhdGUgX3JlbW92ZUl0ZW1Db250aW51b3VzbHkoaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyIHwgdW5kZWZpbmVkLCBkZWxheTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgICAgIHNpemUgPSBzaXplID8/IDE7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcblxuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4ICsgc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gW3JlbW92ZUl0ZW0oKSwgaW52YWxpZCBpbmRleDogJHtpbmRleH1dYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBpbmRleGVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogc2l6ZSB9LCAoXywgaSkgPT4gaW5kZXggKyBpKTtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX3F1ZXJ5UmVtb3ZlSXRlbXNDb250ZXh0KGluZGV4ZXMsIGRlbGF5KTtcblxuICAgICAgICAvLyDmm7TmlrBcbiAgICAgICAgdGhpcy5fdXBkYXRlV2l0aFJlbW92ZUl0ZW1zQ29udGV4dChjb250ZXh0LCBkZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgIGlmIChudWxsICE9IHRoaXMuX2l0ZW1zW2luZGV4XS5wYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpbmRleF0ucGFnZUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgdGhpcy5faXRlbXMuc3BsaWNlKGluZGV4LCBzaXplKTtcbiAgICAgICAgICAgIC8vIG9mZnNldCDjga7lho3oqIjnrpdcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZmlsZXMoaW5kZXgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiog5oyH5a6a44GX44GfIEl0ZW1Qcm9maWxlIOOCkuWJiumZpDogcmFuZG9tIGFjY2VzcyDniYggKi9cbiAgICBwcml2YXRlIF9yZW1vdmVJdGVtUmFuZG9tbHkoaW5kZXhlczogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGRlbGF5ID0gZGVsYXkgPz8gMDtcbiAgICAgICAgaW5kZXhlcy5zb3J0KChsaHMsIHJocykgPT4gcmhzIC0gbGhzKTsgLy8g6ZmN6aCG44K944O844OIXG5cbiAgICAgICAgZm9yIChjb25zdCBpbmRleCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX2l0ZW1zLmxlbmd0aCA8IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICAgICAgYCR7dG9IZWxwU3RyaW5nKFJFU1VMVF9DT0RFLkVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfUEFSQU0pfSBbcmVtb3ZlSXRlbSgpLCBpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWJiumZpOWAmeijnOOBqOWkieWMlumHj+OBrueul+WHulxuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fcXVlcnlSZW1vdmVJdGVtc0NvbnRleHQoaW5kZXhlcywgZGVsYXkpO1xuXG4gICAgICAgIC8vIOabtOaWsFxuICAgICAgICB0aGlzLl91cGRhdGVXaXRoUmVtb3ZlSXRlbXNDb250ZXh0KGNvbnRleHQsIGRlbGF5LCAoKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlkeCBvZiBpbmRleGVzKSB7XG4gICAgICAgICAgICAgICAgLy8gcGFnZSDoqK3lrprjga7op6PpmaRcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pdGVtc1tpZHhdLnBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGFnZSh0aGlzLl9pdGVtc1tpZHhdLnBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIOmFjeWIl+OBi+OCieWJiumZpFxuICAgICAgICAgICAgICAgIHRoaXMuX2l0ZW1zLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb2Zmc2V0IOOBruWGjeioiOeul1xuICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBpbmRleGVzW2luZGV4ZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2ZpbGVzKGZpcnN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqIHNjcm9sbCBtYXAg44Gu44OI44Op44Oz44K444K344On44Oz6Kit5a6aICovXG4gICAgcHJpdmF0ZSBzZXR1cFNjcm9sbE1hcFRyYW5zaXRpb24oZGVsYXk6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB2ZXJpZnkodGhpcy5fc2Nyb2xsZXIpO1xuICAgICAgICBjb25zdCBlbCA9IHRoaXMuXyRtYXBbMF07XG4gICAgICAgIHRoaXMuXyRtYXAudHJhbnNpdGlvbkVuZCgoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRyYW5zaXRpb24oZWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbihlbCwgJ2hlaWdodCcsIGRlbGF5LCAnZWFzZScpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ8gaXRlbSDjgavoqK3lrprjgZfjgZ/mg4XloLHjgpLlj5blvpcgKi9cbiAgICBnZXRJdGVtSW5mbyh0YXJnZXQ6IG51bWJlciB8IEV2ZW50KTogVW5rbm93bk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHsgX2l0ZW1zLCBfY29uZmlnIH0gPSB0aGlzO1xuXG4gICAgICAgIGNvbnN0IHBhcnNlciA9ICgkdGFyZ2V0OiBET00pOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIoJHRhcmdldC5hdHRyKF9jb25maWcuREFUQV9JVEVNX0lOREVYKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoX2NvbmZpZy5TQ1JPTExfTUFQX0NMQVNTKSB8fCAkdGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdjYW5ub3QgZGl0ZWN0IGl0ZW0gZnJvbSBldmVudCBvYmplY3QuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlcigkdGFyZ2V0LnBhcmVudCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpbmRleCA9IHRhcmdldCBpbnN0YW5jZW9mIEV2ZW50ID8gcGFyc2VyKCQodGFyZ2V0LnRhcmdldCBhcyBIVE1MRWxlbWVudCkpIDogTnVtYmVyKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKE51bWJlci5pc05hTihpbmRleCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IFt1bnN1cHBvcnRlZCB0eXBlOiAke3R5cGVvZiB0YXJnZXR9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPCAwIHx8IF9pdGVtcy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSxcbiAgICAgICAgICAgICAgICBgJHt0b0hlbHBTdHJpbmcoUkVTVUxUX0NPREUuRVJST1JfVUlfTElTVFZJRVdfSU5WQUxJRF9QQVJBTSl9IGdldEl0ZW1JbmZvKCkgW2ludmFsaWQgaW5kZXg6ICR7aW5kZXh9XWBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX2l0ZW1zW2luZGV4XS5pbmZvO1xuICAgIH1cblxuICAgIC8qKiDjgqLjgq/jg4bjgqPjg5bjg5rjg7zjgrjjgpLmm7TmlrAgKi9cbiAgICByZWZyZXNoKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IF9wYWdlcywgX2l0ZW1zLCBfc2V0dGluZ3MsIF9sYXN0QWN0aXZlUGFnZUNvbnRleHQgfSA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0czogUmVjb3JkPG51bWJlciwgJ2FjdGl2YXRlJyB8ICdoaWRlJyB8ICdkZWFjdGl2YXRlJz4gPSB7fTtcbiAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgIGNvbnN0IGhpZ2hQcmlvcml0eUluZGV4OiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGNvbnN0IHN0b3JlTmV4dFBhZ2VTdGF0ZSA9IChpbmRleDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKE1hdGguYWJzKGN1cnJlbnRQYWdlSW5kZXggLSBpbmRleCkgPD0gX3NldHRpbmdzLnBhZ2VQcmVwYXJlQ291bnQpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzW2luZGV4XSA9ICdhY3RpdmF0ZSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zZXR0aW5ncy5lbmFibGVIaWRkZW5QYWdlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0c1tpbmRleF0gPSAnaGlkZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldHNbaW5kZXhdID0gJ2RlYWN0aXZhdGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY3VycmVudCBwYWdlIOOBriDliY3lvozjga8gaGlnaCBwcmlvcml0eSDjgavjgZnjgotcbiAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4ICsgMSA9PT0gaW5kZXggfHwgY3VycmVudFBhZ2VJbmRleCAtIDEgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaGlnaFByaW9yaXR5SW5kZXgucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8g5a++6LGh54Sh44GXXG4gICAgICAgIGlmIChfaXRlbXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoQ291bnQgPSBfc2V0dGluZ3MucGFnZVByZXBhcmVDb3VudCArIF9zZXR0aW5ncy5wYWdlUHJlbG9hZENvdW50O1xuICAgICAgICAgICAgY29uc3QgYmVnaW5JbmRleCA9IGN1cnJlbnRQYWdlSW5kZXggLSBzZWFyY2hDb3VudDtcbiAgICAgICAgICAgIGNvbnN0IGVuZEluZGV4ID0gY3VycmVudFBhZ2VJbmRleCArIHNlYXJjaENvdW50O1xuXG4gICAgICAgICAgICBsZXQgb3ZlcmZsb3dQcmV2ID0gMCwgb3ZlcmZsb3dOZXh0ID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IHBhZ2VJbmRleCA9IGJlZ2luSW5kZXg7IHBhZ2VJbmRleCA8PSBlbmRJbmRleDsgcGFnZUluZGV4KyspIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd1ByZXYrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvd05leHQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0b3JlTmV4dFBhZ2VTdGF0ZShwYWdlSW5kZXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93UHJldikge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4ICsgc2VhcmNoQ291bnQgKyAxOyBpIDwgb3ZlcmZsb3dQcmV2OyBpKyssIHBhZ2VJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfcGFnZXMubGVuZ3RoIDw9IHBhZ2VJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RvcmVOZXh0UGFnZVN0YXRlKHBhZ2VJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoMCA8IG92ZXJmbG93TmV4dCkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBwYWdlSW5kZXggPSBjdXJyZW50UGFnZUluZGV4IC0gc2VhcmNoQ291bnQgLSAxOyBpIDwgb3ZlcmZsb3dOZXh0OyBpKyssIHBhZ2VJbmRleC0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYWdlSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9yZU5leHRQYWdlU3RhdGUocGFnZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDkuI3opoHjgavjgarjgaPjgZ8gcGFnZSDjga4g6Z2e5rS75oCn5YyWXG4gICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBfcGFnZXMuZmlsdGVyKHBhZ2UgPT4gJ2luYWN0aXZlJyAhPT0gcGFnZS5zdGF0dXMpKSB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRzW3BhZ2UuaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgcGFnZS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDlhKrlhYggcGFnZSDjga4gYWN0aXZhdGVcbiAgICAgICAgZm9yIChjb25zdCBpZHggb2YgaGlnaFByaW9yaXR5SW5kZXguc29ydCgobGhzLCByaHMpID0+IGxocyAtIHJocykpIHsgLy8g5piH6aCG44K944O844OIXG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCAmJiBfcGFnZXNbaWR4XT8uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g44Gd44Gu44G744GL44GuIHBhZ2Ug44GuIOeKtuaFi+WkieabtFxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXRzKSkge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBOdW1iZXIoa2V5KTtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IHRhcmdldHNbaW5kZXhdO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgX3BhZ2VzW2luZGV4XT8uW2FjdGlvbl0/LigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyDmm7TmlrDlvozjgavkvb/nlKjjgZfjgarjgYvjgaPjgZ8gRE9NIOOCkuWJiumZpFxuICAgICAgICB0aGlzLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5yZW1vdmUoKTtcblxuICAgICAgICBjb25zdCBwYWdlQ3VycmVudCA9IF9wYWdlc1tjdXJyZW50UGFnZUluZGV4XTtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5mcm9tICA9IHBhZ2VDdXJyZW50Py5nZXRJdGVtRmlyc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgX2xhc3RBY3RpdmVQYWdlQ29udGV4dC50byAgICA9IHBhZ2VDdXJyZW50Py5nZXRJdGVtTGFzdCgpPy5pbmRleCA/PyAwO1xuICAgICAgICBfbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ID0gY3VycmVudFBhZ2VJbmRleDtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiog5pyq44Ki44K144Kk44Oz44Oa44O844K444KS5qeL56+JICovXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLmFzc2lnblBhZ2UoTWF0aC5tYXgodGhpcy5fcGFnZXMubGVuZ3RoIC0gMSwgMCkpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkCAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuY2xlYXJQYWdlKCk7XG4gICAgICAgIHRoaXMuYXNzaWduUGFnZSgpO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIOeuoei9hOODh+ODvOOCv+OCkuegtOajhCAqL1xuICAgIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgaXRlbS5kZWFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFnZXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faXRlbXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5fbWFwSGVpZ2h0ID0gMDtcbiAgICAgICAgdGhpcy5fJG1hcC5oZWlnaHQoMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U2Nyb2xsYWJsZVxuXG4gICAgLyoqIHNjcm9sbGVyIOOBrueorumhnuOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxlclR5cGUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy50eXBlO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLlj5blvpcgKi9cbiAgICBnZXQgc2Nyb2xsUG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxlcj8ucG9zID8/IDA7XG4gICAgfVxuXG4gICAgLyoqIOOCueOCr+ODreODvOODq+S9jee9ruOBruacgOWkp+WApOOCkuWPluW+lyAqL1xuICAgIGdldCBzY3JvbGxQb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbGVyPy5wb3NNYXggPz8gMDtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpCAqL1xuICAgIHNldFNjcm9sbEhhbmRsZXIoaGFuZGxlcjogRE9NRXZlbnRMaXN0ZW5lciwgbWV0aG9kOiAnb24nIHwgJ29mZicpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/LlttZXRob2RdKCdzY3JvbGwnLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or57WC5LqG44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpCAqL1xuICAgIHNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5bbWV0aG9kXSgnc2Nyb2xsc3RvcCcsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vkvY3nva7jgpLmjIflrpogKi9cbiAgICBhc3luYyBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdmVyaWZ5KHRoaXMuX3Njcm9sbGVyKTtcbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBwb3NpdGlvbiwgdG9vIHNtYWxsLiBbcG9zOiAke3Bvc31dYCk7XG4gICAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX3Njcm9sbGVyLnBvc01heCA8IHBvcykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIHBvc2l0aW9uLCB0b28gYmlnLiBbcG9zOiAke3Bvc31dYCk7XG4gICAgICAgICAgICBwb3MgPSB0aGlzLl9zY3JvbGxlci5wb3NNYXg7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcG9zIOOBruOBv+WFiOmnhuOBkeOBpuabtOaWsFxuICAgICAgICB0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQucG9zID0gcG9zO1xuICAgICAgICBpZiAocG9zICE9PSB0aGlzLl9zY3JvbGxlci5wb3MpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Njcm9sbGVyLnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44GfIGl0ZW0g44Gu6KGo56S644KS5L+d6Ki8ICovXG4gICAgYXN5bmMgZW5zdXJlVmlzaWJsZShpbmRleDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEVuc3VyZVZpc2libGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgX3Njcm9sbGVyLCBfaXRlbXMsIF9zZXR0aW5ncywgX2Jhc2VIZWlnaHQgfSA9IHRoaXM7XG5cbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgX2l0ZW1zLmxlbmd0aCA8PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNLFxuICAgICAgICAgICAgICAgIGAke3RvSGVscFN0cmluZyhSRVNVTFRfQ09ERS5FUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX1BBUkFNKX0gZW5zdXJlVmlzaWJsZSgpIFtpbnZhbGlkIGluZGV4OiAke2luZGV4fV1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBwYXJ0aWFsT0ssIHNldFRvcCwgYW5pbWF0ZSwgdGltZSwgY2FsbGJhY2sgfSA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgcGFydGlhbE9LOiB0cnVlLFxuICAgICAgICAgICAgc2V0VG9wOiBmYWxzZSxcbiAgICAgICAgICAgIGFuaW1hdGU6IF9zZXR0aW5ncy5lbmFibGVBbmltYXRpb24sXG4gICAgICAgICAgICB0aW1lOiBfc2V0dGluZ3MuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICAgICAgICBjYWxsYmFjazogbm9vcCxcbiAgICAgICAgfSwgb3B0aW9ucykgYXMgUmVxdWlyZWQ8TGlzdEVuc3VyZVZpc2libGVPcHRpb25zPjtcblxuICAgICAgICBjb25zdCBjdXJyZW50U2NvcGUgPSB7XG4gICAgICAgICAgICBmcm9tOiBfc2Nyb2xsZXIucG9zLFxuICAgICAgICAgICAgdG86IF9zY3JvbGxlci5wb3MgKyBfYmFzZUhlaWdodCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0YXJnZXQgPSBfaXRlbXNbaW5kZXhdO1xuXG4gICAgICAgIGNvbnN0IHRhcmdldFNjb3BlID0ge1xuICAgICAgICAgICAgZnJvbTogdGFyZ2V0Lm9mZnNldCxcbiAgICAgICAgICAgIHRvOiB0YXJnZXQub2Zmc2V0ICsgdGFyZ2V0LmhlaWdodCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpc0luU2NvcGUgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBpZiAocGFydGlhbE9LKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFNjb3BlLmZyb20gPD0gY3VycmVudFNjb3BlLmZyb20pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRTY29wZS5mcm9tIDw9IHRhcmdldFNjb3BlLnRvO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRTY29wZS5mcm9tIDw9IGN1cnJlbnRTY29wZS50bztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50U2NvcGUuZnJvbSA8PSB0YXJnZXRTY29wZS5mcm9tICYmIHRhcmdldFNjb3BlLnRvIDw9IGN1cnJlbnRTY29wZS50bztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkZXRlY3RQb3NpdGlvbiA9ICgpOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFNjb3BlLmZyb20gPCBjdXJyZW50U2NvcGUuZnJvbVxuICAgICAgICAgICAgICAgID8gdGFyZ2V0U2NvcGUuZnJvbVxuICAgICAgICAgICAgICAgIDogdGFyZ2V0Lm9mZnNldCAtIHRhcmdldC5oZWlnaHQgLy8gYm90dG9tIOWQiOOCj+OBm+OBr+aDheWgseS4jei2s+OBq+OCiOOCiuS4jeWPr1xuICAgICAgICAgICAgO1xuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBwb3M6IG51bWJlcjtcbiAgICAgICAgaWYgKHNldFRvcCkge1xuICAgICAgICAgICAgcG9zID0gdGFyZ2V0U2NvcGUuZnJvbTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0luU2NvcGUoKSkge1xuICAgICAgICAgICAgY2FsbGJhY2soX3Njcm9sbGVyLnBvcyk7XG4gICAgICAgICAgICByZXR1cm47IC8vIG5vb3BcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvcyA9IGRldGVjdFBvc2l0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnNjcm9sbFRvKHBvcywgYW5pbWF0ZSwgdGltZSk7XG4gICAgICAgIGNhbGxiYWNrKHBvcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44Gu44OQ44OD44Kv44Ki44OD44OX44KS5a6f6KGMICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0geyBpdGVtczogdGhpcy5faXRlbXMgfTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjCAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoMCA8IHRoaXMuX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hZGRJdGVtKHRoaXMuX2JhY2t1cFtrZXldLml0ZW1zKTtcblxuICAgICAgICBpZiAocmVidWlsZCkge1xuICAgICAgICAgICAgdGhpcy5yZWJ1aWxkKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuX2JhY2t1cFtrZXldO1xuICAgIH1cblxuICAgIC8qKiDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4QgKi9cbiAgICBjbGVhckJhY2t1cChrZXk/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYWNrdXApKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JhY2t1cFtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5ICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumiAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IHsgaXRlbXM6IEl0ZW1Qcm9maWxlW107IH0pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YS5pdGVtcykpIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t1cFtrZXldID0gZGF0YTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+ioreWumiAqL1xuICAgIHByaXZhdGUgc2V0U2Nyb2xsZXJDb25kaXRpb24oKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Njcm9sbGVyPy5vbignc2Nyb2xsJywgdGhpcy5fc2Nyb2xsRXZlbnRIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9uKCdzY3JvbGxzdG9wJywgdGhpcy5fc2Nyb2xsU3RvcEV2ZW50SGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqIFNjcm9sbGVyIOeUqOeSsOWig+egtOajhCAqL1xuICAgIHByaXZhdGUgcmVzZXRTY3JvbGxlckNvbmRpdGlvbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsZXI/Lm9mZignc2Nyb2xsc3RvcCcsIHRoaXMuX3Njcm9sbFN0b3BFdmVudEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zY3JvbGxlcj8ub2ZmKCdzY3JvbGwnLCB0aGlzLl9zY3JvbGxFdmVudEhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8qKiDml6Llrprjga4gU2Nyb2xsZXIg44Kq44OW44K444Kn44Kv44OI44Gu5L2c5oiQICovXG4gICAgcHJpdmF0ZSBjcmVhdGVTY3JvbGxlcigpOiBJTGlzdFNjcm9sbGVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzLnNjcm9sbGVyRmFjdG9yeSh0aGlzLl8kcm9vdCwgdGhpcy5fJG1hcCwgdGhpcy5fc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKiDnj77lnKjjga4gUGFnZSBJbmRleCDjgpLlj5blvpcgKi9cbiAgICBwcml2YXRlIGdldFBhZ2VJbmRleCgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCB7IF9zY3JvbGxlciwgX2Jhc2VIZWlnaHQsIF9wYWdlcyB9ID0gdGhpcztcbiAgICAgICAgdmVyaWZ5KF9zY3JvbGxlcik7XG5cbiAgICAgICAgY29uc3QgeyBwb3M6IHNjcm9sbFBvcywgcG9zTWF4OiBzY3JvbGxQb3NNYXggfSA9IF9zY3JvbGxlcjtcblxuICAgICAgICBjb25zdCBzY3JvbGxNYXBTaXplID0gKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RQYWdlID0gdGhpcy5nZXRMYXN0UGFnZSgpO1xuICAgICAgICAgICAgcmV0dXJuIGxhc3RQYWdlID8gbGFzdFBhZ2Uub2Zmc2V0ICsgbGFzdFBhZ2UuaGVpZ2h0IDogX2Jhc2VIZWlnaHQ7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgY29uc3QgcG9zID0gKCgpID0+IHtcbiAgICAgICAgICAgIGlmICgwID09PSBzY3JvbGxQb3NNYXggfHwgc2Nyb2xsUG9zTWF4IDw9IF9iYXNlSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY3JvbGxQb3MgKiBzY3JvbGxNYXBTaXplIC8gc2Nyb2xsUG9zTWF4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHZhbGlkUmFuZ2UgPSAocGFnZTogUGFnZVByb2ZpbGUgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhZ2Uub2Zmc2V0IDw9IHBvcyAmJiBwb3MgPD0gcGFnZS5vZmZzZXQgKyBwYWdlLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNhbmRpZGF0ZSA9IE1hdGguZmxvb3IocG9zIC8gX2Jhc2VIZWlnaHQpO1xuICAgICAgICBpZiAoMCAhPT0gY2FuZGlkYXRlICYmIF9wYWdlcy5sZW5ndGggPD0gY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICBjYW5kaWRhdGUgPSBfcGFnZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwYWdlID0gX3BhZ2VzW2NhbmRpZGF0ZV07XG4gICAgICAgIGlmICh2YWxpZFJhbmdlKHBhZ2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgfSBlbHNlIGlmIChwb3MgPCBwYWdlPy5vZmZzZXQpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYW5kaWRhdGUgLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIHBhZ2UgPSBfcGFnZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmFuZ2UocGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNhbmRpZGF0ZSArIDEsIG4gPSBfcGFnZXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFnZSA9IF9wYWdlc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSYW5nZShwYWdlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFnZS5pbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBkZXRlY3QgcGFnZSBpbmRleC4gZmFsbGJhY2s6ICR7X3BhZ2VzLmxlbmd0aCAtIDF9YCk7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBfcGFnZXMubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4gICAgLyoqIOacgOW+jOOBruODmuODvOOCuOOCkuWPluW+lyAqL1xuICAgIHByaXZhdGUgZ2V0TGFzdFBhZ2UoKTogUGFnZVByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoMCA8IHRoaXMuX3BhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhZ2VzW3RoaXMuX3BhZ2VzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjgrnjgq/jg63jg7zjg6vjgqTjg5njg7Pjg4gqL1xuICAgIHByaXZhdGUgb25TY3JvbGwocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGludGVyc2VjdGlvblJlY3Qg44KS5L2/55So44GZ44KL5aC05ZCILCBTY3JvbGwg44OP44Oz44OJ44Op44O85YWo6Iis44Gv44Gp44GG44GC44KL44G544GN44GL6KaB5qSc6KiOXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMocG9zIC0gdGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LnBvcykgPCB0aGlzLl9zZXR0aW5ncy5zY3JvbGxSZWZyZXNoRGlzdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbGFzdEFjdGl2ZVBhZ2VDb250ZXh0LmluZGV4ICE9PSBjdXJyZW50UGFnZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44K544Kv44Ot44O844Or5YGc5q2i44Kk44OZ44Oz44OIICovXG4gICAgcHJpdmF0ZSBvblNjcm9sbFN0b3AocG9zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAwIDwgdGhpcy5fcGFnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGFnZUluZGV4ID0gdGhpcy5nZXRQYWdlSW5kZXgoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0QWN0aXZlUGFnZUNvbnRleHQuaW5kZXggIT09IGN1cnJlbnRQYWdlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RBY3RpdmVQYWdlQ29udGV4dC5wb3MgPSBwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu44Ki44K144Kk44OzICovXG4gICAgcHJpdmF0ZSBhc3NpZ25QYWdlKGZyb20/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jbGVhclBhZ2UoZnJvbSk7XG5cbiAgICAgICAgY29uc3QgeyBfaXRlbXMsIF9wYWdlcywgX2Jhc2VIZWlnaHQsIF9zY3JvbGxlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgYmFzZVBhZ2UgPSB0aGlzLmdldExhc3RQYWdlKCk7XG4gICAgICAgIGNvbnN0IG5leHRJdGVtSW5kZXggPSBiYXNlUGFnZT8uZ2V0SXRlbUxhc3QoKT8uaW5kZXggPz8gMDtcbiAgICAgICAgY29uc3QgYXNpZ25lZUl0ZW1zICA9IF9pdGVtcy5zbGljZShuZXh0SXRlbUluZGV4KTtcblxuICAgICAgICBsZXQgd29ya1BhZ2UgPSBiYXNlUGFnZTtcbiAgICAgICAgaWYgKG51bGwgPT0gd29ya1BhZ2UpIHtcbiAgICAgICAgICAgIHdvcmtQYWdlID0gbmV3IFBhZ2VQcm9maWxlKCk7XG4gICAgICAgICAgICBfcGFnZXMucHVzaCh3b3JrUGFnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgYXNpZ25lZUl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoX2Jhc2VIZWlnaHQgPD0gd29ya1BhZ2UuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZSA9IG5ldyBQYWdlUHJvZmlsZSgpO1xuICAgICAgICAgICAgICAgIG5ld1BhZ2UuaW5kZXggPSB3b3JrUGFnZS5pbmRleCArIDE7XG4gICAgICAgICAgICAgICAgbmV3UGFnZS5vZmZzZXQgPSB3b3JrUGFnZS5vZmZzZXQgKyB3b3JrUGFnZS5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgd29ya1BhZ2UgPSBuZXdQYWdlO1xuICAgICAgICAgICAgICAgIF9wYWdlcy5wdXNoKHdvcmtQYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW0ucGFnZUluZGV4ID0gd29ya1BhZ2UuaW5kZXg7XG4gICAgICAgICAgICB3b3JrUGFnZS5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgd29ya1BhZ2Uubm9ybWFsaXplKCk7XG5cbiAgICAgICAgX3Njcm9sbGVyPy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICAvKiog44Oa44O844K45Yy65YiG44Gu6Kej6ZmkICovXG4gICAgcHJpdmF0ZSBjbGVhclBhZ2UoZnJvbT86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9wYWdlcy5zcGxpY2UoZnJvbSA/PyAwKTtcbiAgICB9XG5cbiAgICAvKiogaW5hY3RpdmUg55SoIE1hcCDjga7nlJ/miJAgKi9cbiAgICBwcml2YXRlIHByZXBhcmVJbmFjdGl2ZU1hcCgpOiBET00ge1xuICAgICAgICBjb25zdCB7IF9jb25maWcsIF8kbWFwLCBfbWFwSGVpZ2h0IH0gPSB0aGlzO1xuICAgICAgICBjb25zdCAkcGFyZW50ID0gXyRtYXAucGFyZW50KCk7XG4gICAgICAgIGxldCAkaW5hY3RpdmVNYXAgPSAkcGFyZW50LmZpbmQoYC4ke19jb25maWcuSU5BQ1RJVkVfQ0xBU1N9YCk7XG5cbiAgICAgICAgaWYgKCRpbmFjdGl2ZU1hcC5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhZ2VJbmRleCA9IHRoaXMuZ2V0UGFnZUluZGV4KCk7XG4gICAgICAgICAgICBjb25zdCAkbGlzdEl0ZW1WaWV3cyA9IF8kbWFwLmNsb25lKCkuY2hpbGRyZW4oKS5maWx0ZXIoKF8sIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZGV4ID0gTnVtYmVyKCQoZWxlbWVudCkuYXR0cihfY29uZmlnLkRBVEFfUEFHRV9JTkRFWCkpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZUluZGV4IC0gMSA8PSBwYWdlSW5kZXggJiYgcGFnZUluZGV4IDw9IGN1cnJlbnRQYWdlSW5kZXggKyAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRpbmFjdGl2ZU1hcCA9ICQoYDxzZWN0aW9uIGNsYXNzPVwiJHtfY29uZmlnLlNDUk9MTF9NQVBfQ0xBU1N9ICR7X2NvbmZpZy5JTkFDVElWRV9DTEFTU31cIj48L3NlY3Rpb24+YClcbiAgICAgICAgICAgICAgICAuYXBwZW5kKCRsaXN0SXRlbVZpZXdzKVxuICAgICAgICAgICAgICAgIC5oZWlnaHQoX21hcEhlaWdodCk7XG4gICAgICAgICAgICAkcGFyZW50LmFwcGVuZCgkaW5hY3RpdmVNYXApO1xuICAgICAgICAgICAgXyRtYXAuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkaW5hY3RpdmVNYXA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBkb20gYXMgJCxcbiAgICB0eXBlIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFZpZXcsXG59IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTGlzdENvbnRleHRPcHRpb25zLFxuICAgIElMaXN0Q29udGV4dCxcbiAgICBJTGlzdFZpZXcsXG4gICAgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zLFxuICAgIElMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IExpc3RDb3JlIH0gZnJvbSAnLi9jb3JlL2xpc3QnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eSB7XG4gICAgcmVhZG9ubHkgY29udGV4dDogTGlzdENvcmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgY2xhc3MgdGhhdCBzdG9yZXMge0BsaW5rIExpc3RWaWV3fSBpbml0aWFsaXphdGlvbiBpbmZvcm1hdGlvbi5cbiAqIEBqYSB7QGxpbmsgTGlzdFZpZXd9IOOBruWIneacn+WMluaDheWgseOCkuagvOe0jeOBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCueOCr+ODqeOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEZ1bmNOYW1lID0gc3RyaW5nPlxuICAgIGV4dGVuZHMgTGlzdENvbnRleHRPcHRpb25zLCBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudCwgVEZ1bmNOYW1lPiB7XG4gICAgaW5pdGlhbEhlaWdodD86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBAZW4gVmlydHVhbCBsaXN0IHZpZXcgY2xhc3MgdGhhdCBwcm92aWRlcyBtZW1vcnkgbWFuYWdlbWVudCBmdW5jdGlvbmFsaXR5LlxuICogQGphIOODoeODouODqueuoeeQhuapn+iDveOCkuaPkOS+m+OBmeOCi+S7ruaDs+ODquOCueODiOODk+ODpeODvOOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIFZpZXc8VEVsZW1lbnQsIFRFdmVudD4gaW1wbGVtZW50cyBJTGlzdFZpZXcge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiBuZXcgTGlzdENvcmUob3B0aW9ucyksXG4gICAgICAgIH0gYXMgUHJvcGVydHk7XG5cbiAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuJGVsIGFzIERPTVNlbGVjdG9yPFRFbGVtZW50Pik7XG4gICAgfVxuXG4gICAgLyoqIGNvbnRleHQgYWNjZXNzb3IgKi9cbiAgICBnZXQgY29udGV4dCgpOiBJTGlzdENvbnRleHQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dDtcbiAgICB9XG5cbiAgICAvKiogY29uc3RydWN0IG9wdGlvbiBhY2Nlc3NvciAqL1xuICAgIGdldCBvcHRpb25zKCk6IExpc3RWaWV3Q29uc3RydWN0T3B0aW9uczxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm9wdGlvbnM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gVmlldyBjb21wb25lbnQgbWV0aG9kczpcblxuICAgIC8qKiBgdGhpcy5lbGAg5pu05paw5pmC44Gu5paw44GX44GEIEhUTUwg44KS44Os44Oz44OA44Oq44Oz44Kw44Ot44K444OD44Kv44Gu5a6f6KOF6Zai5pWwLiDjg6Ljg4fjg6vmm7TmlrDjgaggVmlldyDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLpgKPli5XjgZXjgZvjgosuICovXG4gICAgYWJzdHJhY3QgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gQ2hhbmdlIHRoZSB2aWV3J3MgZWxlbWVudCAoYHRoaXMuZWxgIHByb3BlcnR5KSBhbmQgcmUtZGVsZWdhdGUgdGhlIHZpZXcncyBldmVudHMgb24gdGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBqYSBWaWV3IOOBjOeuoei9hOOBmeOCi+imgee0oCAoYHRoaXMuZWxgIHByb3BlcnR5KSDjga7lpInmm7QuIOOCpOODmeODs+ODiOWGjeioreWumuOCguWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsXG4gICAgICogIC0gYGVuYCBPYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OI44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgc2V0RWxlbWVudChlbDogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzW19wcm9wZXJ0aWVzXSkge1xuICAgICAgICAgICAgY29uc3QgeyBjb250ZXh0IH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgY29udGV4dC5kZXN0cm95KCk7XG4gICAgICAgICAgICBjb250ZXh0LmluaXRpYWxpemUoJGVsIGFzIERPTTxOb2RlPiBhcyBET00sIHRoaXMub3B0aW9ucy5pbml0aWFsSGVpZ2h0ID8/ICRlbC5oZWlnaHQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLnNldEVsZW1lbnQoZWwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBSZW1vdmUgdGhpcyB2aWV3IGJ5IHRha2luZyB0aGUgZWxlbWVudCBvdXQgb2YgdGhlIERPTSB3aXRoIHJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEgVmlldyDjgYvjgokgRE9NIOOCkuWIh+OCiumbouOBlywg44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmRlc3Ryb3koKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnJlbW92ZSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0T3BlcmF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgaXQgaGFzIGJlZW4gaW5pdGlhbGl6ZWQuXG4gICAgICogQGphIOWIneacn+WMlua4iOOBv+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGluaXRpYWxpemVkIC8gZmFsc2U6IHVuaW5pdGlhbGl6ZWRcbiAgICAgKiAgLSBgamFgIHRydWU6IOWIneacn+WMlua4iOOBvyAvIGZhbHNlOiDmnKrliJ3mnJ/ljJZcbiAgICAgKi9cbiAgICBnZXQgaXNJbml0aWFsaXplZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuaXNJbml0aWFsaXplZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlbSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIGl0ZW0g55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGl0ZW0gYnkgaW5kZXhcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5oy/5YWl5L2N572u44KS44Kk44Oz44OH44OD44Kv44K544Gn5oyH5a6aXG4gICAgICovXG4gICAgYWRkSXRlbShoZWlnaHQ6IG51bWJlciwgaW5pdGlhbGl6ZXI6IElMaXN0SXRlbVZpZXdDb25zdHJ1Y3RvciwgaW5mbzogVW5rbm93bk9iamVjdCwgaW5zZXJ0VG8/OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYWRkSXRlbShuZXcgSXRlbVByb2ZpbGUodGhpcy5jb250ZXh0LCBNYXRoLnRydW5jKGhlaWdodCksIGluaXRpYWxpemVyLCBpbmZvKSwgaW5zZXJ0VG8pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBlbiBJdGVtIHJlZ2lzdHJhdGlvbiAoaW50ZXJuYWwgdXNlKS5cbiAgICAgKiBAamEgaXRlbSDnmbvpjLIgKOWGhemDqOeUqClcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSXRlbVByb2ZpbGV9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBpbnNlcnRUb1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0aGUgaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGl0ZW0gYnkgaW5kZXhcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5oy/5YWl5L2N572u44KS44Kk44Oz44OH44OD44Kv44K544Gn5oyH5a6aXG4gICAgICovXG4gICAgX2FkZEl0ZW0oaXRlbTogSXRlbVByb2ZpbGUgfCBJdGVtUHJvZmlsZVtdLCBpbnNlcnRUbz86IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Ll9hZGRJdGVtKGl0ZW0sIGluc2VydFRvKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHRoZSBzcGVjaWZpZWQgSXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGhlIGluZGV4IHRvIHN0YXJ0IHJlbGVhc2luZ1xuICAgICAqICAtIGBqYWAg6Kej6Zmk6ZaL5aeL44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gICAgICogQHBhcmFtIHNpemVcbiAgICAgKiAgLSBgZW5gIHRvdGFsIG51bWJlciBvZiBpdGVtcyB0byByZWxlYXNlXG4gICAgICogIC0gYGphYCDop6PpmaTjgZnjgosgaXRlbSDjga7nt4/mlbAgW2RlZmF1bHQ6IDFdXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHRvIGFjdHVhbGx5IGRlbGV0ZSB0aGUgZWxlbWVudCBbZGVmYXVsdDogMCAoaW1tZWRpYXRlIGRlbGV0aW9uKVxuICAgICAqICAtIGBqYWAg5a6f6Zqb44Gr6KaB57Sg44KS5YmK6Zmk44GZ44KLIGRlbGF5IHRpbWUgW2RlZmF1bHQ6IDAgKOWNs+aZguWJiumZpCldXG4gICAgICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyLCBzaXplPzogbnVtYmVyLCBkZWxheT86IG51bWJlcik6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHRoZSBzcGVjaWZpZWQgSXRlbS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIEl0ZW0g44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgdGFyZ2V0IGluZGV4IGFycmF5LiBpdCBpcyBtb3JlIGVmZmljaWVudCB0byBzcGVjaWZ5IHJldmVyc2UgaW5kZXguXG4gICAgICogIC0gYGphYCDlr77osaHjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjgpLmjIflrpouIHJldmVyc2UgaW5kZXgg44KS5oyH5a6a44GZ44KL44G744GG44GM5Yq5546H55qEXG4gICAgICogQHBhcmFtIGRlbGF5XG4gICAgICogIC0gYGVuYCBkZWxheSB0aW1lIHRvIGFjdHVhbGx5IGRlbGV0ZSB0aGUgZWxlbWVudCBbZGVmYXVsdDogMCAoaW1tZWRpYXRlIGRlbGV0aW9uKVxuICAgICAqICAtIGBqYWAg5a6f6Zqb44Gr6KaB57Sg44KS5YmK6Zmk44GZ44KLIGRlbGF5IHRpbWUgW2RlZmF1bHQ6IDAgKOWNs+aZguWJiumZpCldXG4gICAgICovXG4gICAgcmVtb3ZlSXRlbShpbmRleDogbnVtYmVyW10sIGRlbGF5PzogbnVtYmVyKTogdm9pZDtcblxuICAgIHJlbW92ZUl0ZW0oaW5kZXg6IG51bWJlciB8IG51bWJlcltdLCBhcmcyPzogbnVtYmVyLCBhcmczPzogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVtb3ZlSXRlbShpbmRleCBhcyBudW1iZXIsIGFyZzIsIGFyZzMpOyAvLyBhdm9pZCB0cygyMzQ1KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGluZm9ybWF0aW9uIHNldCBmb3IgdGhlIHNwZWNpZmllZCBpdGVtLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gaXRlbSDjgavoqK3lrprjgZfjgZ/mg4XloLHjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGlkZW50aWZpZXIgW2luZGV4IHwgZXZlbnQgb2JqZWN0XVxuICAgICAqICAtIGBqYWAg6K2Y5Yil5a2QLiBbaW5kZXggfCBldmVudCBvYmplY3RdXG4gICAgICovXG4gICAgZ2V0SXRlbUluZm8odGFyZ2V0OiBudW1iZXIgfCBFdmVudCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRJdGVtSW5mbyh0YXJnZXQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWZyZXNoIGFjdGl2ZSBwYWdlcy5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW44Oa44O844K444KS5pu05pawXG4gICAgICovXG4gICAgcmVmcmVzaCgpOiB0aGlzIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWZyZXNoKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBCdWlsZCB1bmFzc2lnbmVkIHBhZ2VzLlxuICAgICAqIEBqYSDmnKrjgqLjgrXjgqTjg7Pjg5rjg7zjgrjjgpLmp4vnr4lcbiAgICAgKi9cbiAgICB1cGRhdGUoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQudXBkYXRlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWJ1aWxkIHBhZ2UgYXNzaWdubWVudHMuXG4gICAgICogQGphIOODmuODvOOCuOOCouOCteOCpOODs+OCkuWGjeani+aIkFxuICAgICAqL1xuICAgIHJlYnVpbGQoKTogdGhpcyB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVidWlsZCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRGVzdHJveSBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDnrqHovYTjg4fjg7zjgr/jgpLnoLTmo4RcbiAgICAgKi9cbiAgICBvdmVycmlkZSByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnJlbGVhc2UoKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnJlbGVhc2UoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdFNjcm9sbGFibGVcblxuICAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHNjcm9sbFBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zY3JvbGxQb3M7XG4gICAgfVxuXG4gICAgIC8qKlxuICAgICAgKiBAZW4gR2V0IG1heGltdW0gc2Nyb2xsIHBvc2l0aW9uLlxuICAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44Gu5pyA5aSn5YCk44KS5Y+W5b6XXG4gICAgICAqL1xuICAgIGdldCBzY3JvbGxQb3NNYXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsUG9zTWF4O1xuICAgIH1cblxuICAgICAvKipcbiAgICAgKiBAZW4gU2Nyb2xsIGV2ZW50IGhhbmRsZXIgc2V0dGluZy9jYW5jZWxsYXRpb24uXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OCpOODmeODs+ODiOODj+ODs+ODieODqeioreWumi/op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njg7zplqLmlbBcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvbjogc2V0dGluZyAvIG9mZjogY2FuY2VsaW5nXG4gICAgICogIC0gYGphYCBvbjog6Kit5a6aIC8gb2ZmOiDop6PpmaRcbiAgICAgKi9cbiAgICBzZXRTY3JvbGxIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0U2Nyb2xsSGFuZGxlcihoYW5kbGVyLCBtZXRob2QpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXR0aW5nL2NhbmNlbGxpbmcgc2Nyb2xsIHN0b3AgZXZlbnQgaGFuZGxlci5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or57WC5LqG44Kk44OZ44Oz44OI44OP44Oz44OJ44Op6Kit5a6aL+ino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeODvOmWouaVsFxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9uOiBzZXR0aW5nIC8gb2ZmOiBjYW5jZWxpbmdcbiAgICAgKiAgLSBgamFgIG9uOiDoqK3lrpogLyBvZmY6IOino+mZpFxuICAgICAqL1xuICAgIHNldFNjcm9sbFN0b3BIYW5kbGVyKGhhbmRsZXI6IERPTUV2ZW50TGlzdGVuZXIsIG1ldGhvZDogJ29uJyB8ICdvZmYnKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0U2Nyb2xsU3RvcEhhbmRsZXIoaGFuZGxlciwgbWV0aG9kKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNjcm9sbCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zXG4gICAgICogIC0gYGVuYCBuZXcgc2Nyb2xsIHBvc2l0aW9uIHZhbHVlIFswIC0gcG9zTWF4XVxuICAgICAqICAtIGBqYWAg5paw44GX44GE44K544Kv44Ot44O844Or5L2N572u44KS5oyH5a6aIFswIC0gcG9zTWF4XVxuICAgICAqIEBwYXJhbSBhbmltYXRlXG4gICAgICogIC0gYGVuYCBlbmFibGUvZGlzYWJsZSBhbmltYXRpb25cbiAgICAgKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+OBruacieeEoVxuICAgICAqIEBwYXJhbSB0aW1lXG4gICAgICogIC0gYGVuYCB0aW1lIHNwZW50IG9uIGFuaW1hdGlvbiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBzY3JvbGxUbyhwb3M6IG51bWJlciwgYW5pbWF0ZT86IGJvb2xlYW4sIHRpbWU/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2Nyb2xsVG8ocG9zLCBhbmltYXRlLCB0aW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW5zdXJlIHZpc2liaWxpdHkgb2YgaXRlbSBieSBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44GfIGl0ZW0g44Gu6KGo56S644KS5L+d6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgaW5kZXggb2YgaXRlbVxuICAgICAqICAtIGBqYWAgaXRlbSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3BlY2lmeSB7QGxpbmsgTGlzdEVuc3VyZVZpc2libGVPcHRpb25zfSBvYmplY3RcbiAgICAgKiAgLSBgamFgIHtAbGluayBMaXN0RW5zdXJlVmlzaWJsZU9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIGVuc3VyZVZpc2libGUoaW5kZXg6IG51bWJlciwgb3B0aW9ucz86IExpc3RFbnN1cmVWaXNpYmxlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5lbnN1cmVWaXNpYmxlKGluZGV4LCBvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJTGlzdEJhY2t1cFJlc3RvcmVcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5IChhbnkgaWRlbnRpZmllcilcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvCjku7vmhI/jga7orZjliKXlrZAp44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5iYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcGFyYW0gcmVidWlsZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHJlYnVpbGQgdGhlIGxpc3Qgc3RydWN0dXJlXG4gICAgICogIC0gYGphYCDjg6rjgrnjg4jmp4vpgKDjgpLlho3mp4vnr4njgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZCA9IHRydWUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIGJhY2t1cCBkYXRhIGV4aXN0cy5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cyAvIGZhbHNlOiBub3QgZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIkgLyBmYWxzZTog54ShXG4gICAgICovXG4gICAgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEaXNjYXJkIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZGlzY2FyZCBleGlzdGluZyBkYXRhIC8gZmFsc2U6IHNwZWNpZmllZCBkYXRhIGRvZXMgbm90IGV4aXN0XG4gICAgICogIC0gYGphYCB0cnVlOiDlrZjlnKjjgZfjgZ/jg4fjg7zjgr/jgpLnoLTmo4QgLyBmYWxzZTog5oyH5a6a44GV44KM44Gf44OH44O844K/44Gv5a2Y5Zyo44GX44Gq44GEXG4gICAgICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICovXG4gICAgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IFVua25vd25PYmplY3QgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmFja3VwIGRhdGEgY2FuIGJlIHNldCBleHRlcm5hbGx5LlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2NlZWRlZCAvIGZhbHNlOiBzY2hlbWEgaW52YWxpZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOOCueOCreODvOODnuOBjOS4jeato1xuICAgICAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IFVua25vd25PYmplY3QpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0QmFja3VwRGF0YShrZXksIGRhdGEgYXMgeyBpdGVtczogSXRlbVByb2ZpbGVbXTsgfSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdFZpZXcgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IHsgdHlwZSBMaXN0SXRlbVZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zLCBMaXN0SXRlbVZpZXcgfSBmcm9tICcuL2xpc3QtaXRlbS12aWV3JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHkge1xuICAgIHJlYWRvbmx5IGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIEV4cGFuZGFibGVMaXN0SXRlbVZpZXd9IGNvbnN0cnVjdGlvbi5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RJdGVtVmlld30g5qeL56+J44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhwYW5kYWJsZUxpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRGdW5jTmFtZSA9IHN0cmluZz5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQsIFRGdW5jTmFtZT4ge1xuICAgIG93bmVyOiBJRXhwYW5kYWJsZUxpc3RWaWV3O1xuICAgIC8qKiB7QGxpbmsgR3JvdXBQcm9maWxlfSBpbnN0YW5jZSAqL1xuICAgIGdyb3VwOiBHcm91cFByb2ZpbGU7XG59XG5cbi8qKlxuICogQGVuIExpc3QgaXRlbSBjb250YWluZXIgY2xhc3MgaGFuZGxlZCBieSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fS5cbiAqIEBqYSB7QGxpbmsgRXhwYW5kYWJsZUxpc3RWaWV3fSDjgYzmibHjgYbjg6rjgrnjg4jjgqLjgqTjg4bjg6DjgrPjg7Pjg4bjg4rjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV4cGFuZGFibGVMaXN0SXRlbVZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIExpc3RJdGVtVmlldzxURWxlbWVudCwgVEV2ZW50PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeHBhbmRhYmxlTGlzdEl0ZW1WaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHsgZ3JvdXAgfSA9IG9wdGlvbnM7XG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eT4pID0geyBncm91cCB9IGFzIFByb3BlcnR5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGV4cGFuZGVkIC8gY29sbGFwc2VkIHN0YXR1cy5cbiAgICAgKiBAamEg5bGV6ZaL54q25oWL44KS5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhwYW5kZWQsIGNvbGxhcHNlZDogY2xvc2VcbiAgICAgKiAgLSBgamFgIHRydWU6IOWxlemWiywgZmFsc2U6IOWPjuadn1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmdyb3VwLmlzRXhwYW5kZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIHRoZSBsaXN0IGlzIGR1cmluZyBleHBhbmRpbmcuXG4gICAgICogQGphIOWxlemWi+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNFeHBhbmRpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc0V4cGFuZGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOWPjuadn+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNDb2xsYXBzaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKHRoaXMub3duZXIgYXMgSUV4cGFuZGFibGVMaXN0VmlldykuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbGlzdCBpcyBkdXJpbmcgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOmWi+mWieS4reOBi+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcy5vd25lciBhcyBJRXhwYW5kYWJsZUxpc3RWaWV3KS5pc1N3aXRjaGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIGlmIGl0IGhhcyBhIGNoaWxkIHtAbGluayBHcm91cFByb2ZpbGV9LlxuICAgICAqIEBqYSDlrZAge0BsaW5rIEdyb3VwUHJvZmlsZX0g44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZXhpc3RzLCBmYWxzZTogdW5leGlzdHNcbiAgICAgKiAgLSBgamFgIHRydWU6IOaciSwgZmFsc2U6IOeEoVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgaGFzQ2hpbGRyZW4oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5ncm91cC5oYXNDaGlsZHJlbjtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIGx1aWQsXG4gICAgc3RhdHVzQWRkUmVmLFxuICAgIHN0YXR1c1JlbGVhc2UsXG4gICAgc3RhdHVzU2NvcGUsXG4gICAgaXNTdGF0dXNJbixcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB0eXBlIHtcbiAgICBJRXhwYW5kT3BlcmF0aW9uLFxuICAgIElMaXN0U3RhdHVzTWFuYWdlcixcbiAgICBJTGlzdEJhY2t1cFJlc3RvcmUsXG4gICAgSUV4cGFuZGFibGVMaXN0Q29udGV4dCxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBHcm91cFByb2ZpbGUgfSBmcm9tICcuLi9wcm9maWxlJztcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBDb3JlIGxvZ2ljIGltcGxlbWVudGF0aW9uIGNsYXNzIHRoYXQgbWFuYWdlcyBleHBhbmRpbmcgLyBjb2xsYXBzaW5nIHN0YXRlLlxuICogQGphIOmWi+mWieeKtuaFi+euoeeQhuOCkuihjOOBhuOCs+OCouODreOCuOODg+OCr+Wun+ijheOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRXhwYW5kQ29yZSBpbXBsZW1lbnRzXG4gICAgSUV4cGFuZE9wZXJhdGlvbixcbiAgICBJTGlzdFN0YXR1c01hbmFnZXIsXG4gICAgSUxpc3RCYWNrdXBSZXN0b3JlIHtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX293bmVyOiBJRXhwYW5kYWJsZUxpc3RDb250ZXh0O1xuXG4gICAgLyoqIHsgaWQ6IEdyb3VwUHJvZmlsZSB9ICovXG4gICAgcHJpdmF0ZSBfbWFwR3JvdXBzOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+ID0ge307XG4gICAgLyoqIOesrDHpmo7lsaQgR3JvdXBQcm9maWxlIOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgX2FyeVRvcEdyb3VwczogR3JvdXBQcm9maWxlW10gPSBbXTtcblxuICAgIC8qKiDjg4fjg7zjgr/jga4gYmFja3VwIOmgmOWfny4ga2V5IOOBqCB7IG1hcCwgdG9wcyB9IOOCkuagvOe0jSAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2JhY2t1cDogUmVjb3JkPHN0cmluZywgeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9PiA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0gb3duZXIg6KaqIFZpZXcg44Gu44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElFeHBhbmRhYmxlTGlzdENvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgPSBvd25lcjtcbiAgICB9XG5cbiAgICAvKiog44OH44O844K/44KS56C05qOEICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX21hcEdyb3VwcyA9IHt9O1xuICAgICAgICB0aGlzLl9hcnlUb3BHcm91cHMgPSBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRXhwYW5kT3BlcmF0aW9uXG5cbiAgICAvKiog5paw6KaPIEdyb3VwUHJvZmlsZSDjgpLkvZzmiJAgKi9cbiAgICBuZXdHcm91cChpZD86IHN0cmluZyk6IEdyb3VwUHJvZmlsZSB7XG4gICAgICAgIGlkID0gaWQgPz8gbHVpZCgnbGlzdC1ncm91cCcsIDQpO1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9tYXBHcm91cHNbaWRdKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbWFwR3JvdXBzW2lkXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBncm91cCA9IG5ldyBHcm91cFByb2ZpbGUodGhpcy5fb3duZXIsIGlkKTtcbiAgICAgICAgdGhpcy5fbWFwR3JvdXBzW2lkXSA9IGdyb3VwO1xuICAgICAgICByZXR1cm4gZ3JvdXA7XG4gICAgfVxuXG4gICAgLyoqIOeZu+mMsua4iOOBvyBHcm91cCDjgpLlj5blvpcgKi9cbiAgICBnZXRHcm91cChpZDogc3RyaW5nKTogR3JvdXBQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21hcEdyb3Vwc1tpZF07XG4gICAgfVxuXG4gICAgLyoqIOesrDHpmo7lsaTjga4gR3JvdXAg55m76YyyICovXG4gICAgcmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIC8vIOOBmeOBp+OBq+eZu+mMsua4iOOBv+OBruWgtOWQiOOBryByZXN0b3JlIOOBl+OBpiBsYXlvdXQg44Kt44O844GU44Go44Gr5b6p5YWD44GZ44KL44CCXG4gICAgICAgIGlmICgncmVnaXN0ZXJlZCcgPT09IHRvcEdyb3VwLnN0YXR1cykge1xuICAgICAgICAgICAgLy8gVE9ETzogb3JpZW50YXRpb24gY2hhbmdlZCDmmYLjga4gbGF5b3V0IOOCreODvOWkieabtOWvvuW/nOOBoOOBjOOAgeOCreODvOOBq+WkieabtOOBjOeEoeOBhOOBqOOBjeOBr+S4jeWFt+WQiOOBqOOBquOCi+OAglxuICAgICAgICAgICAgLy8g44GT44GuIEFQSSDjgavlrp/oo4XjgYzlv4XopoHjgYvjgoLlkKvjgoHjgabopovnm7TjgZfjgYzlv4XopoFcbiAgICAgICAgICAgIHRvcEdyb3VwLnJlc3RvcmUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxhc3RHcm91cCA9IHRoaXMuX2FyeVRvcEdyb3Vwc1t0aGlzLl9hcnlUb3BHcm91cHMubGVuZ3RoIC0gMV07XG4gICAgICAgIGNvbnN0IGluc2VydFRvID0gbGFzdEdyb3VwPy5nZXROZXh0SXRlbUluZGV4KHRydWUpID8/IDA7XG5cbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzLnB1c2godG9wR3JvdXApO1xuICAgICAgICB0b3BHcm91cC5yZWdpc3RlcihpbnNlcnRUbyk7XG4gICAgfVxuXG4gICAgLyoqIOesrDHpmo7lsaTjga4gR3JvdXAg44KS5Y+W5b6XICovXG4gICAgZ2V0VG9wR3JvdXBzKCk6IEdyb3VwUHJvZmlsZVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FyeVRvcEdyb3Vwcy5zbGljZSgwKTtcbiAgICB9XG5cbiAgICAvKiog44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5bGV6ZaLICgx6ZqO5bGkKSAqL1xuICAgIGFzeW5jIGV4cGFuZEFsbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzaWVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIHByb21pc2llcy5wdXNoKGdyb3VwLmV4cGFuZCgpKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNpZXMpO1xuICAgIH1cblxuICAgIC8qKiDjgZnjgbnjgabjga7jgrDjg6vjg7zjg5fjgpLlj47mnZ8gKDHpmo7lsaQpICovXG4gICAgYXN5bmMgY29sbGFwc2VBbGwoZGVsYXk/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzaWVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIHByb21pc2llcy5wdXNoKGdyb3VwLmNvbGxhcHNlKGRlbGF5KSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzaWVzKTtcbiAgICB9XG5cbiAgICAvKiog5bGV6ZaL5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1N0YXR1c0luKCdleHBhbmRpbmcnKTtcbiAgICB9XG5cbiAgICAvKiog5Y+O5p2f5Lit44GL5Yik5a6aICovXG4gICAgZ2V0IGlzQ29sbGFwc2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNTdGF0dXNJbignY29sbGFwc2luZycpO1xuICAgIH1cblxuICAgIC8qKiDplovplonkuK3jgYvliKTlrpogKi9cbiAgICBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzRXhwYW5kaW5nIHx8IHRoaXMuaXNDb2xsYXBzaW5nO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElMaXN0U3RhdHVzTWFuYWdlclxuXG4gICAgLyoqIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiCAqL1xuICAgIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKiog54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBzdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxuXG4gICAgLyoqIOWHpueQhuOCueOCs+ODvOODl+avjuOBq+eKtuaFi+WkieaVsOOCkuioreWumiAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHN0YXR1c1Njb3BlKHN0YXR1cywgZXhlY3V0b3IpO1xuICAgIH1cblxuICAgIC8qKiDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo0gKi9cbiAgICBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBpc1N0YXR1c0luKHN0YXR1cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUxpc3RCYWNrdXBSZXN0b3JlXG5cbiAgICAvKiog5YaF6YOo44OH44O844K/44KS44OQ44OD44Kv44Ki44OD44OXICovXG4gICAgYmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHsgX2JhY2t1cCB9ID0gdGhpcztcbiAgICAgICAgX2JhY2t1cFtrZXldID8/PSB7XG4gICAgICAgICAgICBtYXA6IHRoaXMuX21hcEdyb3VwcyxcbiAgICAgICAgICAgIHRvcHM6IHRoaXMuX2FyeVRvcEdyb3VwcyxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOWGhemDqOODh+ODvOOCv+OCkuODquOCueODiOOCoiAqL1xuICAgIHJlc3RvcmUoa2V5OiBzdHJpbmcsIHJlYnVpbGQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYmFja3VwID0gdGhpcy5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgICAgIGlmIChudWxsID09IGJhY2t1cCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCB0aGlzLl9hcnlUb3BHcm91cHMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5fbWFwR3JvdXBzLCBiYWNrdXAubWFwKTtcbiAgICAgICAgdGhpcy5fYXJ5VG9wR3JvdXBzID0gYmFja3VwLnRvcHMuc2xpY2UoKTtcblxuICAgICAgICAvLyDlsZXplovjgZfjgabjgYTjgovjgoLjga7jgpLnmbvpjLJcbiAgICAgICAgZm9yIChjb25zdCBncm91cCBvZiB0aGlzLl9hcnlUb3BHcm91cHMpIHtcbiAgICAgICAgICAgIGdyb3VwLnJlc3RvcmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWGjeani+evieOBruS6iOe0hFxuICAgICAgICByZWJ1aWxkICYmIHRoaXMuX293bmVyLnJlYnVpbGQoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBruacieeEoSAqL1xuICAgIGhhc0JhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICB9XG5cbiAgICAvKiog44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu56C05qOEICovXG4gICAgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5fYmFja3VwKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gdGhpcy5fYmFja3VwW2tleV0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iYWNrdXBba2V5XTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OBq+OCouOCr+OCu+OCuSAqL1xuICAgIGdldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcpOiB7IG1hcDogUmVjb3JkPHN0cmluZywgR3JvdXBQcm9maWxlPjsgdG9wczogR3JvdXBQcm9maWxlW107IH0ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYmFja3VwW2tleV07XG4gICAgfVxuXG4gICAgLyoqIOODkOODg+OCr+OCouODg+ODl+ODh+ODvOOCv+OCkuWklumDqOOCiOOCiuioreWumiAqL1xuICAgIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IHsgbWFwOiBSZWNvcmQ8c3RyaW5nLCBHcm91cFByb2ZpbGU+OyB0b3BzOiBHcm91cFByb2ZpbGVbXTsgfSk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoZGF0YS5tYXAgJiYgQXJyYXkuaXNBcnJheShkYXRhLnRvcHMpKSB7XG4gICAgICAgICAgICB0aGlzLl9iYWNrdXBba2V5XSA9IGRhdGE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSwgVW5rbm93bk9iamVjdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgdHlwZSB7IElFeHBhbmRhYmxlTGlzdFZpZXcsIElFeHBhbmRPcGVyYXRpb24gfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgRXhwYW5kQ29yZSB9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQgdHlwZSB7IEdyb3VwUHJvZmlsZSB9IGZyb20gJy4vcHJvZmlsZSc7XG5pbXBvcnQgeyB0eXBlIExpc3RWaWV3Q29uc3RydWN0T3B0aW9ucywgTGlzdFZpZXcgfSBmcm9tICcuL2xpc3Qtdmlldyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5IHtcbiAgICByZWFkb25seSBjb250ZXh0OiBFeHBhbmRDb3JlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVmlydHVhbCBsaXN0IHZpZXcgY2xhc3Mgd2l0aCBleHBhbmRpbmcgLyBjb2xsYXBzaW5nIGZ1bmN0aW9uYWxpdHkuXG4gKiBAamEg6ZaL6ZaJ5qmf6IO944KS5YKZ44GI44Gf5Luu5oOz44Oq44K544OI44OT44Ol44O844Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFeHBhbmRhYmxlTGlzdFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD5cbiAgICBleHRlbmRzIExpc3RWaWV3PFRFbGVtZW50LCBURXZlbnQ+IGltcGxlbWVudHMgSUV4cGFuZGFibGVMaXN0VmlldyB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogTGlzdFZpZXdDb25zdHJ1Y3RPcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PikgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiBuZXcgRXhwYW5kQ29yZSh0aGlzKSxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTtcbiAgICB9XG5cbiAgICAvKiogY29udGV4dCBhY2Nlc3NvciAqL1xuICAgIGdldCBleHBhbmRDb250ZXh0KCk6IElFeHBhbmRPcGVyYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRXhwYW5kYWJsZUxpc3RWaWV3XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IHtAbGluayBHcm91cFByb2ZpbGV9LiBSZXR1cm4gdGhlIG9iamVjdCBpZiBpdCBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQuXG4gICAgICogQGphIOaWsOimjyB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLkvZzmiJAuIOeZu+mMsua4iOOBv+OBruWgtOWQiOOBr+OBneOBruOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBuZXdseSBjcmVhdGVkIGdyb3VwIGlkLiBpZiBub3Qgc3BlY2lmaWVkLCBhdXRvbWF0aWMgYWxsb2NhdGlvbiB3aWxsIGJlIHBlcmZvcm1lZC5cbiAgICAgKiAgLSBgamFgIOaWsOimj+OBq+S9nOaIkOOBmeOCiyBHcm91cCBJRCDjgpLmjIflrpouIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+iHquWLleWJsuOCiuaMr+OCilxuICAgICAqL1xuICAgIG5ld0dyb3VwKGlkPzogc3RyaW5nKTogR3JvdXBQcm9maWxlIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQubmV3R3JvdXAoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcmVnaXN0ZXJlZCB7QGxpbmsgR3JvdXBQcm9maWxlfS5cbiAgICAgKiBAamEg55m76Yyy5riI44G/IHtAbGluayBHcm91cFByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IHRoZSBHcm91cCBJRCB0byByZXRyaWV2ZVxuICAgICAqICAtIGBqYWAg5Y+W5b6X44GZ44KLIEdyb3VwIElEIOOCkuaMh+WumlxuICAgICAqL1xuICAgIGdldEdyb3VwKGlkOiBzdHJpbmcpOiBHcm91cFByb2ZpbGUgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRHcm91cChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIDFzdCBsYXllciB7QGxpbmsgR3JvdXBQcm9maWxlfSByZWdpc3RyYXRpb24uXG4gICAgICogQGphIOesrDHpmo7lsaTjga4ge0BsaW5rIEdyb3VwUHJvZmlsZX0g55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9wR3JvdXBcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGVkIHtAbGluayBHcm91cFByb2ZpbGV9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCDmp4vnr4nmuIjjgb8ge0BsaW5rIEdyb3VwUHJvZmlsZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cDogR3JvdXBQcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVnaXN0ZXJUb3BHcm91cCh0b3BHcm91cCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCAxc3QgbGF5ZXIge0BsaW5rIEdyb3VwUHJvZmlsZX0uIDxicj5cbiAgICAgKiAgICAgQSBjb3B5IGFycmF5IGlzIHJldHVybmVkLCBzbyB0aGUgY2xpZW50IGNhbm5vdCBjYWNoZSBpdC5cbiAgICAgKiBAamEg56ysMemajuWxpOOBriB7QGxpbmsgR3JvdXBQcm9maWxlfSDjgpLlj5blvpcgPGJyPlxuICAgICAqICAgICDjgrPjg5Tjg7zphY3liJfjgYzov5TjgZXjgozjgovjgZ/jgoHjgIHjgq/jg6njgqTjgqLjg7Pjg4jjga/jgq3jg6Pjg4Pjgrfjg6XkuI3lj69cbiAgICAgKi9cbiAgICBnZXRUb3BHcm91cHMoKTogR3JvdXBQcm9maWxlW10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRUb3BHcm91cHMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhwYW5kIGFsbCBncm91cHMgKDFzdCBsYXllcilcbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5bGV6ZaLICgx6ZqO5bGkKVxuICAgICAqL1xuICAgIGV4cGFuZEFsbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuZXhwYW5kQWxsKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbGxhcHNlIGFsbCBncm91cHMgKDFzdCBsYXllcilcbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kw44Or44O844OX44KS5Y+O5p2fICgx6ZqO5bGkKVxuICAgICAqL1xuICAgIGNvbGxhcHNlQWxsKGRlbGF5PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNvbGxhcHNlQWxsKGRlbGF5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZy5cbiAgICAgKiBAamEg5bGV6ZaL5Lit44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRXhwYW5kaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5pc0V4cGFuZGluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGNvbGxhcHNpbmcuXG4gICAgICogQGphIOWPjuadn+S4reOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0NvbGxhcHNpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzQ29sbGFwc2luZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGxpc3QgaXMgZHVyaW5nIGV4cGFuZGluZyBvciBjb2xsYXBzaW5nLlxuICAgICAqIEBqYSDplovplonkuK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNTd2l0Y2hpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzU3dpdGNoaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbmNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAgICAgKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44Kk44Oz44Kv44Oq44Oh44Oz44OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gICAgICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAgICAgKi9cbiAgICBzdGF0dXNBZGRSZWYoc3RhdHVzOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5zdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gICAgICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICAgICAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gICAgICovXG4gICAgc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LnN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhdGUgdmFyaWFibGUgbWFuYWdlbWVudCBzY29wZVxuICAgICAqIEBqYSDnirbmhYvlpInmlbDnrqHnkIbjgrnjgrPjg7zjg5dcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0dXNcbiAgICAgKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAgICAgKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR2YWwgb2Ygc2VlZCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBrumWouaVsOOBruaIu+OCiuWApFxuICAgICAqL1xuICAgIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc3RhdHVzU2NvcGUoc3RhdHVzLCBleGVjdXRvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGlmIGl0J3MgaW4gdGhlIHNwZWNpZmllZCBzdGF0ZS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf54q25oWL5Lit44Gn44GC44KL44GL56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdHVzXG4gICAgICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gICAgICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlOiDnirbmhYvlhoUgLyBmYWxzZTog54q25oWL5aSWXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogd2l0aGluIHRoZSBzdGF0dXMgLyBgZmFsc2VgOiBvdXQgb2YgdGhlIHN0YXR1c1xuICAgICAqICAtIGBqYWAgYHRydWVgOiDnirbmhYvlhoUgLyBgZmFsc2VgOiDnirbmhYvlpJZcbiAgICAgKi9cbiAgICBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmlzU3RhdHVzSW4oc3RhdHVzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogTGlzdFZpZXdcblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBEZXN0cm95IGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOeuoei9hOODh+ODvOOCv+OCkuegtOajhFxuICAgICAqL1xuICAgIG92ZXJyaWRlIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHN1cGVyLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5yZWxlYXNlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqIEBlbiBFeGVjdXRlIGEgYmFja3VwIG9mIGludGVybmFsIGRhdGEuXG4gICAgICogQGphIOWGhemDqOODh+ODvOOCv+OBruODkOODg+OCr+OCouODg+ODl+OCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3BlY2lmeSBiYWNrdXAga2V5IChhbnkgaWRlbnRpZmllcilcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvCjku7vmhI/jga7orZjliKXlrZAp44KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2Nlc3MgLyBmYWxzZTogZmFpbHVyZVxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOWkseaVl1xuICAgICAqL1xuICAgIG92ZXJyaWRlIGJhY2t1cChrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5iYWNrdXAoa2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKiBAZW4gRXhlY3V0ZSBhIGJhY2t1cCBvZiBpbnRlcm5hbCBkYXRhLlxuICAgICAqIEBqYSDlhoXpg6jjg4fjg7zjgr/jga7jg5Djg4Pjgq/jgqLjg4Pjg5fjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcGFyYW0gcmVidWlsZFxuICAgICAqICAtIGBlbmAgc3BlY2lmeSB0cnVlIHRvIHJlYnVpbGQgdGhlIGxpc3Qgc3RydWN0dXJlXG4gICAgICogIC0gYGphYCDjg6rjgrnjg4jmp4vpgKDjgpLlho3mp4vnr4njgZnjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogc3VjY2VzcyAvIGZhbHNlOiBmYWlsdXJlXG4gICAgICogIC0gYGphYCB0cnVlOiDmiJDlip8gLyBmYWxzZTog5aSx5pWXXG4gICAgICovXG4gICAgb3ZlcnJpZGUgcmVzdG9yZShrZXk6IHN0cmluZywgcmVidWlsZCA9IHRydWUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQucmVzdG9yZShrZXksIHJlYnVpbGQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIGJhY2t1cCBkYXRhIGV4aXN0cy5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gu5pyJ54Sh44KS56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IGV4aXN0cyAvIGZhbHNlOiBub3QgZXhpc3RzXG4gICAgICogIC0gYGphYCB0cnVlOiDmnIkgLyBmYWxzZTog54ShXG4gICAgICovXG4gICAgb3ZlcnJpZGUgaGFzQmFja3VwKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0Lmhhc0JhY2t1cChrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEaXNjYXJkIGJhY2t1cCBkYXRhLlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jga7noLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleSAodGhlIG9uZSB1c2VkIGZvciBgYmFja3VwKClgKVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aIChgYmFja3VwKClgIOOBq+S9v+eUqOOBl+OBn+OCguOBrilcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJ1ZTogZGlzY2FyZCBleGlzdGluZyBkYXRhIC8gZmFsc2U6IHNwZWNpZmllZCBkYXRhIGRvZXMgbm90IGV4aXN0XG4gICAgICogIC0gYGphYCB0cnVlOiDlrZjlnKjjgZfjgZ/jg4fjg7zjgr/jgpLnoLTmo4QgLyBmYWxzZTog5oyH5a6a44GV44KM44Gf44OH44O844K/44Gv5a2Y5Zyo44GX44Gq44GEXG4gICAgICovXG4gICAgb3ZlcnJpZGUgY2xlYXJCYWNrdXAoa2V5Pzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb250ZXh0LmNsZWFyQmFja3VwKGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyBiYWNrdXAgZGF0YS5cbiAgICAgKiBAamEg44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzcGVjaWZ5IGJhY2t1cCBrZXkgKHRoZSBvbmUgdXNlZCBmb3IgYGJhY2t1cCgpYClcbiAgICAgKiAgLSBgamFgIOODkOODg+OCr+OCouODg+ODl+OCreODvOOCkuaMh+WumiAoYGJhY2t1cCgpYCDjgavkvb/nlKjjgZfjgZ/jgoLjga4pXG4gICAgICovXG4gICAgb3ZlcnJpZGUgZ2V0QmFja3VwRGF0YShrZXk6IHN0cmluZyk6IFVua25vd25PYmplY3QgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29udGV4dC5nZXRCYWNrdXBEYXRhKGtleSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmFja3VwIGRhdGEgY2FuIGJlIHNldCBleHRlcm5hbGx5LlxuICAgICAqIEBqYSDjg5Djg4Pjgq/jgqLjg4Pjg5fjg4fjg7zjgr/jgpLlpJbpg6jjgojjgoroqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHNwZWNpZnkgYmFja3VwIGtleVxuICAgICAqICAtIGBqYWAg44OQ44OD44Kv44Ki44OD44OX44Kt44O844KS5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRydWU6IHN1Y2NlZWRlZCAvIGZhbHNlOiBzY2hlbWEgaW52YWxpZFxuICAgICAqICAtIGBqYWAgdHJ1ZTog5oiQ5YqfIC8gZmFsc2U6IOOCueOCreODvOODnuOBjOS4jeato1xuICAgICAqL1xuICAgIG92ZXJyaWRlIHNldEJhY2t1cERhdGEoa2V5OiBzdHJpbmcsIGRhdGE6IFVua25vd25PYmplY3QpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnRleHQuc2V0QmFja3VwRGF0YShrZXksIGRhdGEgYXMgeyBtYXA6IFJlY29yZDxzdHJpbmcsIEdyb3VwUHJvZmlsZT47IHRvcHM6IEdyb3VwUHJvZmlsZVtdOyB9KTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsic2FmZSIsInBvc3QiLCJub29wIiwic3R5bGVDb3JlIiwic3R5bGVCdXR0b24iLCIkIiwiYXQiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJ0b0hlbHBTdHJpbmciLCJfcHJvcGVydGllcyIsIlZpZXciLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibHVpZCIsInN0YXR1c0FkZFJlZiIsInN0YXR1c1JlbGVhc2UiLCJzdGF0dXNTY29wZSIsImlzU3RhdHVzSW4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lB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