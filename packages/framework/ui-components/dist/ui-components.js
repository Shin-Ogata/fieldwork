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

    // TODO: test
    const UI_UTILS_STATUS = 'UNDER CONSTRUCTION';
    runtime.isFunction(runtime.i18n.t) && console.log('okok');

    /*!
     * @cdp/ui-forms 0.9.18
     *   UI form components
     */


    const styleCore = "div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}";

    const styleButton = "div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}";

    const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
    void runtime.post(runtime.noop(styleCore, styleButton));

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
                // TODO:  見直し予定. <li> 全般は <slot> と同強調するか?
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
        /** page index */
        _index = 0;
        /** page offset from top */
        _offset = 0;
        /** page's height */
        _height = 0;
        /** item's profile managed with in page */
        _items = [];
        /** page status */
        _status = 'inactive';
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
            return this.getItem(0);
        }
        /**
         * @en Get last {@link ItemProfile}.
         * @ja 最後の {@link ItemProfile} を取得
         */
        getItemLast() {
            return this.getItem(this._items.length - 1);
        }
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
    }

    // TODO: test
    const UI_LISTVIEW_STATUS = 'UNDER CONSTRUCTION';

    exports.ItemProfile = ItemProfile;
    exports.ListViewGlobalConfig = ListViewGlobalConfig;
    exports.PageProfile = PageProfile;
    exports.UI_FORMS_STATUS = UI_FORMS_STATUS;
    exports.UI_LISTVIEW_STATUS = UI_LISTVIEW_STATUS;
    exports.UI_UTILS_STATUS = UI_UTILS_STATUS;
    exports.cssPrefixes = cssPrefixes;
    exports.getTransformMatrixValues = getTransformMatrixValues;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5qcyIsInNvdXJjZXMiOlsidWktdXRpbHMvcmVzdWx0LWNvZGUtZGVmcy50cyIsInVpLXV0aWxzL3Nzci50cyIsInVpLXV0aWxzL2Nzcy9taXNjLnRzIiwidWktdXRpbHMvaW5kZXgudHMiLCJ1aS1mb3Jtcy9pbmRleC50cyIsInVpLWxpc3R2aWV3L3Jlc3VsdC1jb2RlLWRlZnMudHMiLCJ1aS1saXN0dmlldy9nbG9iYWwtY29uZmlnLnRzIiwidWktbGlzdHZpZXcvcHJvZmlsZS9pdGVtLnRzIiwidWktbGlzdHZpZXcvcHJvZmlsZS9wYWdlLnRzIiwidWktbGlzdHZpZXcvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gQ0RQX0tOT1dOX1VJX01PRFVMRSB7XG4gICAgICAgIC8qKiBgQGNkcC91aS11dGlsc2AgKi9cbiAgICAgICAgVVRJTFMgICAgID0gMSxcbiAgICAgICAgLyoqIGBAY2RwL3VpLWxpc3R2aWV3YCAqL1xuICAgICAgICBMSVNUVklFVyAgPSAyLFxuICAgICAgICAvKiogb2Zmc2V0IGZvciB1bmtub3duIHVpLW1vZHVsZSAqL1xuICAgICAgICBPRkZTRVQsXG4gICAgfVxuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBVSV9VVElMUyA9IChDRFBfS05PV05fTU9EVUxFLk9GRlNFVCArIENEUF9LTk9XTl9VSV9NT0RVTEUuVVRJTFMpICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIFVJX1VUSUxTX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX1VJX1VUSUxTX0ZBVEFMID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfVVRJTFMgKyAxLCAnVUkgdXRpbHMgc29tZXRoaW5nIHdyb25nLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBnZXRDb21wdXRlZFN0eWxlID0gc2FmZShnbG9iYWxUaGlzLmdldENvbXB1dGVkU3R5bGUpO1xuIiwiaW1wb3J0IHsgZ2V0Q29tcHV0ZWRTdHlsZSB9IGZyb20gJy4uL3Nzcic7XG5cbi8qKlxuICogQGVuIENTUyB2ZW5kb3IgcHJlZml4IHN0cmluZyBkZWZpbml0aW9uLlxuICogQGphIENTUyDjg5njg7Pjg4Djg7zjg5fjg6rjg5XjgqPjg4Pjgq/jgrnmloflrZfliJflrprnvqlcbiAqL1xuZXhwb3J0IGNvbnN0IGNzc1ByZWZpeGVzID0gWyctd2Via2l0LScsICctbW96LScsICctbXMtJywgJy1vLScsICcnXTtcblxuLyoqXG4gKiBAZW4gU3RvcmVzIHRoZSB2YWx1ZSBzcGVjaWZpZWQgaW4gY3NzIGB0cmFuc2Zvcm0oM2QpYC5cbiAqIEBqYSBjc3MgYHRyYW5zZm9ybSgzZClgIOOBq+aMh+WumuOBleOCjOOCi+WApOOCkuagvOe0jVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zZm9ybU1hdHJpeFZhbHVlcyB7XG4gICAgdHJhbnNsYXRlWDogbnVtYmVyO1xuICAgIHRyYW5zbGF0ZVk6IG51bWJlcjtcbiAgICB0cmFuc2xhdGVaOiBudW1iZXI7XG4gICAgc2NhbGVYOiBudW1iZXI7XG4gICAgc2NhbGVZOiBudW1iZXI7XG4gICAgc2NhbGVaOiBudW1iZXI7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdmFsdWUgb2YgdGhlIHRyYW5zZm9ybSBtYXRyaXggc3BlY2lmaWVkIGluIGBFbGVtZW50YC5cbiAqIEBqYSBgRWxlbWVudGAg44Gr5oyH5a6a44GV44KM44GfIHRyYW5zZm9ybSDooYzliJfjga7lgKTjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGFyZ2V0IGBFbGVtZW50YCBpbnN0YW5jZVxuICogIC0gYGphYCDlr77osaEgYEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgY29uc3QgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzID0gKGVsOiBFbGVtZW50KTogVHJhbnNmb3JtTWF0cml4VmFsdWVzID0+IHtcbiAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoZWwpO1xuICAgIGNvbnN0IHsgbTExLCBtMjIsIG0zMywgbTQxLCBtNDIsIG00MyB9ID0gbmV3IERPTU1hdHJpeFJlYWRPbmx5KHN0eWxlLnRyYW5zZm9ybSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHJhbnNsYXRlWDogbTQxLFxuICAgICAgICB0cmFuc2xhdGVZOiBtNDIsXG4gICAgICAgIHRyYW5zbGF0ZVo6IG00MyxcbiAgICAgICAgc2NhbGVYOiBtMTEsXG4gICAgICAgIHNjYWxlWTogbTIyLFxuICAgICAgICBzY2FsZVo6IG0zMyxcbiAgICB9O1xufTtcbiIsImltcG9ydCAnLi9yZXN1bHQtY29kZS1kZWZzJztcbmV4cG9ydCAqIGZyb20gJy4vY3NzJztcblxuLy8gVE9ETzogdGVzdFxuZXhwb3J0IGNvbnN0IFVJX1VUSUxTX1NUQVRVUyA9ICdVTkRFUiBDT05TVFJVQ1RJT04nO1xuaW1wb3J0IHsgaTE4biwgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pc0Z1bmN0aW9uKGkxOG4udCkgJiYgIGNvbnNvbGUubG9nKCdva29rJyk7XG4iLCJleHBvcnQgY29uc3QgVUlfRk9STVNfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG5cbmltcG9ydCB7IG5vb3AsIHBvc3QgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuXG5pbXBvcnQgc3R5bGVDb3JlIGZyb20gJ0Bjc3Mvc3RydWN0dXJlLmNzcycgYXNzZXJ0IHsgdHlwZTogJ2NzcycgfTtcbmltcG9ydCBzdHlsZUJ1dHRvbiBmcm9tICdAY3NzL3N0cnVjdHVyZS1idXR0b24uY3NzJyBhc3NlcnQgeyB0eXBlOiAnY3NzJyB9O1xudm9pZCBwb3N0KG5vb3Aoc3R5bGVDb3JlLCBzdHlsZUJ1dHRvbikpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBVSV9MSVNUVklFVyA9IChDRFBfS05PV05fTU9EVUxFLk9GRlNFVCArIENEUF9LTk9XTl9VSV9NT0RVTEUuTElTVFZJRVcpICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIFVJX0xJU1RWSUVXX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX1VJX0xJU1RWSUVXX0lOVkFMSURfSU5JVElBTElaQVRJT04gPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9MSVNUVklFVyArIDEsICdsaXN0dmlldyBoYXMgaW52YWxpZCBpbml0aWFsaXphdGlvbi4nKSxcbiAgICB9XG59XG4iLCIvKipcbiAqIEBlbiBHbG9iYWwgY29uZmlndXJhdGlvbiBkZWZpbml0aW9uIGZvciBsaXN0IHZpZXdzLlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICBOQU1FU1BBQ0U6IHN0cmluZztcbiAgICBXUkFQUEVSX0NMQVNTOiBzdHJpbmc7XG4gICAgV1JBUFBFUl9TRUxFQ1RPUjogc3RyaW5nO1xuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IHN0cmluZztcbiAgICBTQ1JPTExfTUFQX1NFTEVDVE9SOiBzdHJpbmc7XG4gICAgSU5BQ1RJVkVfQ0xBU1M6IHN0cmluZztcbiAgICBJTkFDVElWRV9DTEFTU19TRUxFQ1RPUjogc3RyaW5nO1xuICAgIFJFQ1lDTEVfQ0xBU1M6IHN0cmluZztcbiAgICBSRUNZQ0xFX0NMQVNTX1NFTEVDVE9SOiBzdHJpbmc7XG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogc3RyaW5nO1xuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1NfU0VMRUNUT1I6IHN0cmluZztcbiAgICBEQVRBX1BBR0VfSU5ERVg6IHN0cmluZztcbiAgICBEQVRBX0NPTlRBSU5FUl9JTkRFWDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHRWIHtcbiAgICBOQU1FU1BBQ0UgICAgICAgICAgICAgICAgICAgID0gJ2NkcC11aScsXG4gICAgV1JBUFBFUl9DTEFTUyAgICAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctd3JhcHBlcmAsXG4gICAgV1JBUFBFUl9TRUxFQ1RPUiAgICAgICAgICAgICA9IGAuJHtXUkFQUEVSX0NMQVNTfWAsXG4gICAgU0NST0xMX01BUF9DTEFTUyAgICAgICAgICAgICA9IGAke05BTUVTUEFDRX0tbGlzdHZpZXctc2Nyb2xsLW1hcGAsXG4gICAgU0NST0xMX01BUF9TRUxFQ1RPUiAgICAgICAgICA9IGAuJHtTQ1JPTExfTUFQX0NMQVNTfWAsXG4gICAgSU5BQ1RJVkVfQ0xBU1MgICAgICAgICAgICAgICA9ICdpbmFjdGl2ZScsXG4gICAgSU5BQ1RJVkVfQ0xBU1NfU0VMRUNUT1IgICAgICA9IGAuJHtJTkFDVElWRV9DTEFTU31gLFxuICAgIFJFQ1lDTEVfQ0xBU1MgICAgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXJlY3ljbGVgLFxuICAgIFJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1IgICAgICAgPSBgLiR7UkVDWUNMRV9DTEFTU31gLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1MgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LWl0ZW0tYmFzZWAsXG4gICAgTElTVElURU1fQkFTRV9DTEFTU19TRUxFQ1RPUiA9IGAuJHtMSVNUSVRFTV9CQVNFX0NMQVNTfWAsXG4gICAgREFUQV9QQUdFX0lOREVYICAgICAgICAgICAgICA9IGBkYXRhLSR7TkFNRVNQQUNFfS1wYWdlLWluZGV4YCxcbiAgICBEQVRBX0NPTlRBSU5FUl9JTkRFWCAgICAgICAgID0gYGRhdGEtJHtOQU1FU1BBQ0V9LWNvbnRhaW5lci1pbmRleGAsXG59XG5cbmNvbnN0IF9jb25maWcgPSB7XG4gICAgTkFNRVNQQUNFOiBEZWZhdWx0Vi5OQU1FU1BBQ0UsXG4gICAgV1JBUFBFUl9DTEFTUzogRGVmYXVsdFYuV1JBUFBFUl9DTEFTUyxcbiAgICBXUkFQUEVSX1NFTEVDVE9SOiBEZWZhdWx0Vi5XUkFQUEVSX1NFTEVDVE9SLFxuICAgIFNDUk9MTF9NQVBfQ0xBU1M6IERlZmF1bHRWLlNDUk9MTF9NQVBfQ0xBU1MsXG4gICAgU0NST0xMX01BUF9TRUxFQ1RPUjogRGVmYXVsdFYuU0NST0xMX01BUF9TRUxFQ1RPUixcbiAgICBJTkFDVElWRV9DTEFTUzogRGVmYXVsdFYuSU5BQ1RJVkVfQ0xBU1MsXG4gICAgSU5BQ1RJVkVfQ0xBU1NfU0VMRUNUT1I6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTX1NFTEVDVE9SLFxuICAgIFJFQ1lDTEVfQ0xBU1M6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1MsXG4gICAgUkVDWUNMRV9DTEFTU19TRUxFQ1RPUjogRGVmYXVsdFYuUkVDWUNMRV9DTEFTU19TRUxFQ1RPUixcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTOiBEZWZhdWx0Vi5MSVNUSVRFTV9CQVNFX0NMQVNTLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1NfU0VMRUNUT1I6IERlZmF1bHRWLkxJU1RJVEVNX0JBU0VfQ0xBU1NfU0VMRUNUT1IsXG4gICAgREFUQV9QQUdFX0lOREVYOiBEZWZhdWx0Vi5EQVRBX1BBR0VfSU5ERVgsXG4gICAgREFUQV9DT05UQUlORVJfSU5ERVg6IERlZmF1bHRWLkRBVEFfQ09OVEFJTkVSX0lOREVYLFxufTtcblxuLyoqXG4gKiBAZW4gR2V0L1VwZGF0ZSBnbG9iYWwgY29uZmlndXJhdGlvbiBvZiBsaXN0IHZpZXcuXG4gKiBAamEg44Oq44K544OI44OT44Ol44O844Gu44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Os44O844K344On44Oz44Gu5Y+W5b6XL+abtOaWsFxuICovXG5leHBvcnQgY29uc3QgTGlzdFZpZXdHbG9iYWxDb25maWcgPSAobmV3Q29uZmlnPzogUGFydGlhbDxMaXN0Vmlld0dsb2JhbENvbmZpZz4pOiBMaXN0Vmlld0dsb2JhbENvbmZpZyA9PiB7XG4gICAgaWYgKG5ld0NvbmZpZykge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhuZXdDb25maWcpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBuZXdDb25maWdba2V5IGFzIGtleW9mIExpc3RWaWV3R2xvYmFsQ29uZmlnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgX2NvbmZpZywgbmV3Q29uZmlnKTtcbn07XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25PYmplY3QsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHsgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzIH0gZnJvbSAnQGNkcC91aS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUxpc3RDb250ZXh0LFxuICAgIElMaXN0SXRlbVZpZXcsXG4gICAgTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IExpc3RWaWV3R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vZ2xvYmFsLWNvbmZpZyc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBsaXN0IGl0ZW1zLlxuICogQGphIOODquOCueODiOOCouOCpOODhuODoOOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEl0ZW1Qcm9maWxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3duZXI6IElMaXN0Q29udGV4dDtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2luaXRpYWxpemVyOiBuZXcgKG9wdGlvbnM/OiBVbmtub3duT2JqZWN0KSA9PiBJTGlzdEl0ZW1WaWV3O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pbmZvOiBVbmtub3duT2JqZWN0O1xuICAgIC8qKiBAaW50ZXJuYWwgZ2xvYmFsIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgYmVsb25naW5nIHBhZ2UgaW5kZXggKi9cbiAgICBwcml2YXRlIF9wYWdlSW5kZXggPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgZ2xvYmFsIG9mZnNldCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIEBpbnRlcm5hbCBiYXNlIGRvbSBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgXyRiYXNlPzogRE9NO1xuICAgIC8qKiBAaW50ZXJuYWwgSUxpc3RJdGVtVmlldyBpbnN0YW5jZSAqL1xuICAgIHByaXZhdGUgX2luc3RhbmNlPzogSUxpc3RJdGVtVmlldztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duZXJcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJTGlzdFZpZXdDb250ZXh0fSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0Vmlld0NvbnRleHR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBoZWlnaHRcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaXRlbSdzIGhlaWdodFxuICAgICAqICAtIGBqYWAgaXRlbSDjga7liJ3mnJ/jga7pq5jjgZVcbiAgICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXJcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdG9yIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbmZvXG4gICAgICogIC0gYGVuYCBpbml0IHBhcmFtZXRlcnMgZm9yIHtAbGluayBJTGlzdEl0ZW1WaWV3fSdzIHN1YmNsYXNzXG4gICAgICogIC0gYGphYCB7QGxpbmsgSUxpc3RJdGVtVmlld30g44Gu44K144OW44Kv44Op44K544Gu5Yid5pyf5YyW44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3duZXI6IElMaXN0Q29udGV4dCwgaGVpZ2h0OiBudW1iZXIsIGluaXRpYWxpemVyOiBuZXcgKG9wdGlvbnM/OiBVbmtub3duT2JqZWN0KSA9PiBJTGlzdEl0ZW1WaWV3LCBfaW5mbzogVW5rbm93bk9iamVjdCkge1xuICAgICAgICB0aGlzLl9vd25lciAgICAgICA9IG93bmVyO1xuICAgICAgICB0aGlzLl9oZWlnaHQgICAgICA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZXIgPSBpbml0aWFsaXplcjtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgICAgPSBfaW5mbztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZSA9IHRoaXMucHJlcGFyZUJhc2VFbGVtZW50KCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgZWw6IHRoaXMuXyRiYXNlLFxuICAgICAgICAgICAgICAgIG93bmVyOiB0aGlzLl9vd25lcixcbiAgICAgICAgICAgICAgICBsaW5lUHJvZmlsZTogdGhpcyxcbiAgICAgICAgICAgIH0sIHRoaXMuX2luZm8pO1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSBuZXcgdGhpcy5faW5pdGlhbGl6ZXIob3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoJ25vbmUnID09PSB0aGlzLl8kYmFzZS5jc3MoJ2Rpc3BsYXknKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUluZGV4KCk7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAndmlzaWJsZScgIT09IHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIGl0ZW0gaW52aXNpYmxlLlxuICAgICAqIEBqYSBpdGVtIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiAnaGlkZGVuJyAhPT0gdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JykpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5hZGRDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZnJlc2ggdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5pu05pawXG4gICAgICovXG4gICAgcHVibGljIHJlZnJlc2goKTogdm9pZCB7XG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnN0YW5jZS5yZW5kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgYWN0aXZhdGlvbiBzdGF0dXMgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5rS75oCn54q25oWL5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLl9pbnN0YW5jZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGhlaWdodCBpbmZvcm1hdGlvbiBvZiB0aGUgaXRlbS4gQ2FsbGVkIGZyb20ge0BsaW5rIExpc3RJdGVtVmlld30uXG4gICAgICogQGphIGl0ZW0g44Gu6auY44GV5oOF5aCx44Gu5pu05pawLiB7QGxpbmsgTGlzdEl0ZW1WaWV3fSDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgdXBkYXRlSGVpZ2h0KG5ld0hlaWdodDogbnVtYmVyLCBvcHRpb25zPzogTGlzdEl0ZW1VcGRhdGVIZWlnaHRPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gbmV3SGVpZ2h0IC0gdGhpcy5faGVpZ2h0O1xuICAgICAgICB0aGlzLl9oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgICAgIHRoaXMuX293bmVyLnVwZGF0ZVNjcm9sbE1hcEhlaWdodChkZWx0YSk7XG4gICAgICAgIGlmIChvcHRpb25zPy5yZWZsZWN0QWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9vd25lci51cGRhdGVQcm9maWxlcyh0aGlzLl9pbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgei1pbmRleC4gQ2FsbGVkIGZyb20ge0BsaW5rIFNjcm9sbE1hbmFnZXJ9YC5yZW1vdmVJdGVtKClgLlxuICAgICAqIEBqYSB6LWluZGV4IOOBruODquOCu+ODg+ODiC4ge0BsaW5rIFNjcm9sbE1hbmFnZXJ9YC5yZW1vdmVJdGVtKClgIOOBi+OCieOCs+ODvOODq+OBleOCjOOCi+OAglxuICAgICAqL1xuICAgIHB1YmxpYyByZXNldERlcHRoKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmNzcygnei1pbmRleCcsIHRoaXMuX293bmVyLm9wdGlvbnMuYmFzZURlcHRoKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBoZWlnaHQuICovXG4gICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIGl0ZW0ncyBnbG9iYWwgaW5kZXguICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogU2V0IHRoZSBpdGVtJ3MgZ2xvYmFsIGluZGV4LiAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudXBkYXRlSW5kZXgoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGJlbG9uZ2luZyB0aGUgcGFnZSBpbmRleC4gKi9cbiAgICBnZXQgcGFnZUluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYWdlSW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCBiZWxvbmdpbmcgdGhlIHBhZ2UgaW5kZXguICovXG4gICAgc2V0IHBhZ2VJbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX3BhZ2VJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VJbmRleCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgZ2xvYmFsIG9mZnNldC4gKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCBnbG9iYWwgb2Zmc2V0LiAqL1xuICAgIHNldCBvZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICB0aGlzLnVwZGF0ZU9mZnNldCgpO1xuICAgIH1cblxuICAgIC8qKiBHZXQgaW5pdCBwYXJhbWV0ZXJzLiAqL1xuICAgIGdldCBpbmZvKCk6IFVua25vd25PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5mbztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBfY29uZmlnKCk6IExpc3RWaWV3R2xvYmFsQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIExpc3RWaWV3R2xvYmFsQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcHJlcGFyZUJhc2VFbGVtZW50KCk6IERPTSB7XG4gICAgICAgIGxldCAkYmFzZTogRE9NO1xuICAgICAgICBjb25zdCAkcmVjeWNsZSA9IHRoaXMuX293bmVyLmZpbmRSZWN5Y2xlRWxlbWVudHMoKS5maXJzdCgpO1xuICAgICAgICBjb25zdCBpdGVtVGFnTmFtZSA9IHRoaXMuX293bmVyLm9wdGlvbnMuaXRlbVRhZ05hbWU7XG5cbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5fJGJhc2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybigndGhpcy5fJGJhc2UgaXMgbm90IG51bGwuJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fJGJhc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoMCA8ICRyZWN5Y2xlLmxlbmd0aCkge1xuICAgICAgICAgICAgJGJhc2UgPSAkcmVjeWNsZTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUF0dHIoJ3otaW5kZXgnKTtcbiAgICAgICAgICAgICRiYXNlLnJlbW92ZUNsYXNzKHRoaXMuX2NvbmZpZy5SRUNZQ0xFX0NMQVNTKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86ICDopovnm7TjgZfkuojlrpouIDxsaT4g5YWo6Iis44GvIDxzbG90PiDjgajlkIzlvLfoqr/jgZnjgovjgYs/XG4gICAgICAgICAgICAkYmFzZSA9ICQoYDwke2l0ZW1UYWdOYW1lfSBjbGFzcz1cIiR7dGhpcy5fY29uZmlnLkxJU1RJVEVNX0JBU0VfQ0xBU1N9XCI+PC9cIiR7aXRlbVRhZ05hbWV9XCI+YCk7XG4gICAgICAgICAgICAkYmFzZS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fb3duZXIuJHNjcm9sbE1hcC5hcHBlbmQoJGJhc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g6auY44GV44Gu5pu05pawXG4gICAgICAgIGlmICgkYmFzZS5oZWlnaHQoKSAhPT0gdGhpcy5faGVpZ2h0KSB7XG4gICAgICAgICAgICAkYmFzZS5oZWlnaHQodGhpcy5faGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGluZGV4IOOBruioreWumlxuICAgICAgICB0aGlzLnVwZGF0ZUluZGV4KCk7XG4gICAgICAgIC8vIG9mZnNldCDjga7mm7TmlrBcbiAgICAgICAgdGhpcy51cGRhdGVPZmZzZXQoKTtcblxuICAgICAgICByZXR1cm4gJGJhc2U7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0NPTlRBSU5FUl9JTkRFWCkgIT09IFN0cmluZyh0aGlzLl9pbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfQ09OVEFJTkVSX0lOREVYLCB0aGlzLl9pbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1cGRhdGVQYWdlSW5kZXgoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl8kYmFzZSAmJiB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX1BBR0VfSU5ERVgpICE9PSBTdHJpbmcodGhpcy5fcGFnZUluZGV4KSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9QQUdFX0lOREVYLCB0aGlzLl9wYWdlSW5kZXgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlT2Zmc2V0KCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fb3duZXIub3B0aW9ucy5lbmFibGVUcmFuc2Zvcm1PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNsYXRlWSB9ID0gZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzKHRoaXMuXyRiYXNlWzBdKTtcbiAgICAgICAgICAgIGlmICh0cmFuc2xhdGVZICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUzZCgwLCR7dGhpcy5fb2Zmc2V0fXB4LDBgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IHBhcnNlSW50KHRoaXMuXyRiYXNlLmNzcygndG9wJyksIDEwKTtcbiAgICAgICAgICAgIGlmICh0b3AgIT09IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRiYXNlLmNzcygndG9wJywgYCR7dGhpcy5fb2Zmc2V0fXB4YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBhdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5pbXBvcnQgeyBJdGVtUHJvZmlsZSB9IGZyb20gJy4vaXRlbSc7XG5cbi8qKlxuICogQGVuIEEgY2xhc3MgdGhhdCBzdG9yZXMgVUkgc3RydWN0dXJlIGluZm9ybWF0aW9uIGZvciBvbmUgcGFnZSBvZiB0aGUgbGlzdC5cbiAqIEBqYSDjg6rjgrnjg4gx44Oa44O844K45YiG44GuIFVJIOani+mAoOaDheWgseOCkuagvOe0jeOBmeOCi+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgUGFnZVByb2ZpbGUge1xuICAgIC8qKiBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuICAgIC8qKiBwYWdlIG9mZnNldCBmcm9tIHRvcCAqL1xuICAgIHByaXZhdGUgX29mZnNldCA9IDA7XG4gICAgLyoqIHBhZ2UncyBoZWlnaHQgKi9cbiAgICBwcml2YXRlIF9oZWlnaHQgPSAwO1xuICAgIC8qKiBpdGVtJ3MgcHJvZmlsZSBtYW5hZ2VkIHdpdGggaW4gcGFnZSAqL1xuICAgIHByaXZhdGUgX2l0ZW1zOiBJdGVtUHJvZmlsZVtdID0gW107XG4gICAgLyoqIHBhZ2Ugc3RhdHVzICovXG4gICAgcHJpdmF0ZSBfc3RhdHVzOiAnYWN0aXZlJyB8ICdpbmFjdGl2ZScgfCAnaGlkZGVuJyA9ICdpbmFjdGl2ZSc7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY3RpdmF0ZSBvZiB0aGUgcGFnZS5cbiAgICAgKiBAamEgcGFnZSDjga7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnYWN0aXZlJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2FjdGl2ZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1ha2UgdGhlIHBhZ2UgaW52aXNpYmxlLlxuICAgICAqIEBqYSBwYWdlIOOBruS4jeWPr+imluWMllxuICAgICAqL1xuICAgIHB1YmxpYyBoaWRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2hpZGRlbicgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc3RhdHVzID0gJ2hpZGRlbic7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlYWN0aXZhdGUgb2YgdGhlIHBhZ2UuXG4gICAgICogQGphIHBhZ2Ug44Gu6Z2e5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGlmICgnaW5hY3RpdmUnICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdpbmFjdGl2ZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB7QGxpbmsgSXRlbVByb2ZpbGV9IHRvIHRoZSBwYWdlLlxuICAgICAqIEBqYSB7QGxpbmsgSXRlbVByb2ZpbGV9IOOBrui/veWKoFxuICAgICAqL1xuICAgIHB1YmxpYyBwdXNoKGl0ZW06IEl0ZW1Qcm9maWxlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2l0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIHRoaXMuX2hlaWdodCArPSBpdGVtLmhlaWdodDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSWYgYWxsIHtAbGluayBJdGVtUHJvZmlsZX0gdW5kZXIgdGhlIHBhZ2UgYXJlIG5vdCB2YWxpZCwgZGlzYWJsZSB0aGUgcGFnZSdzIHN0YXR1cy5cbiAgICAgKiBAamEg6YWN5LiL44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44GZ44G544Gm44GM5pyJ5Yq544Gn44Gq44GE5aC05ZCILCBwYWdlIOOCueODhuODvOOCv+OCueOCkueEoeWKueOBq+OBmeOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBub3JtYWxpemUoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuYWJsZUFsbCA9IHRoaXMuX2l0ZW1zLmV2ZXJ5KGl0ZW0gPT4gaXRlbS5pc0FjdGl2ZSgpKTtcbiAgICAgICAgaWYgKCFlbmFibGVBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXR1cyA9ICdpbmFjdGl2ZSc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBJdGVtUHJvZmlsZX0gYnkgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumuOBl+OBpiB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtKGluZGV4OiBudW1iZXIpOiBJdGVtUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLl9pdGVtcywgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZmlyc3Qge0BsaW5rIEl0ZW1Qcm9maWxlfS5cbiAgICAgKiBAamEg5pyA5Yid44GuIHtAbGluayBJdGVtUHJvZmlsZX0g44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldEl0ZW1GaXJzdCgpOiBJdGVtUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldEl0ZW0oMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBsYXN0IHtAbGluayBJdGVtUHJvZmlsZX0uXG4gICAgICogQGphIOacgOW+jOOBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtTGFzdCgpOiBJdGVtUHJvZmlsZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldEl0ZW0odGhpcy5faXRlbXMubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBpbmRleCAqL1xuICAgIHNldCBpbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBnZXQgb2Zmc2V0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgcGFnZSBvZmZzZXQgKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIGhlaWdodCAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBwYWdlIHN0YXR1cyAqL1xuICAgIGdldCBzdGF0dXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgICB9XG59XG4iLCJpbXBvcnQgJy4vcmVzdWx0LWNvZGUtZGVmcyc7XG5leHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0ICogZnJvbSAnLi9nbG9iYWwtY29uZmlnJztcbmV4cG9ydCAqIGZyb20gJy4vcHJvZmlsZSc7XG5cbi8vIFRPRE86IHRlc3RcbmV4cG9ydCBjb25zdCBVSV9MSVNUVklFV19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsImkxOG4iLCJwb3N0Iiwibm9vcCIsIiQiLCJhdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBZWpCOzs7SUFHRztJQUNILElBQUEs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