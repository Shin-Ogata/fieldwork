/*!
 * @cdp/ui-components 0.9.18
 *   ui-componets collection
 */

import { safe, isFunction, i18n, post, noop, dom, at } from '@cdp/runtime';

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

// TODO: test
const UI_UTILS_STATUS = 'UNDER CONSTRUCTION';
isFunction(i18n.t) && console.log('okok');

/*!
 * @cdp/ui-forms 0.9.18
 *   UI form components
 */


const styleCore = "div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}";

const styleButton = "div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}";

const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
void post(noop(styleCore, styleButton));

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
            $base = dom(`<${itemTagName} class="${this._config.LISTITEM_BASE_CLASS}"></"${itemTagName}">`);
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
        return at(this._items, index);
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

export { ItemProfile, ListViewGlobalConfig, PageProfile, UI_FORMS_STATUS, UI_LISTVIEW_STATUS, UI_UTILS_STATUS, cssPrefixes, getTransformMatrixValues };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5tanMiLCJzb3VyY2VzIjpbInVpLXV0aWxzL3Jlc3VsdC1jb2RlLWRlZnMudHMiLCJ1aS11dGlscy9zc3IudHMiLCJ1aS11dGlscy9jc3MvbWlzYy50cyIsInVpLXV0aWxzL2luZGV4LnRzIiwidWktZm9ybXMvaW5kZXgudHMiLCJ1aS1saXN0dmlldy9yZXN1bHQtY29kZS1kZWZzLnRzIiwidWktbGlzdHZpZXcvZ2xvYmFsLWNvbmZpZy50cyIsInVpLWxpc3R2aWV3L3Byb2ZpbGUvaXRlbS50cyIsInVpLWxpc3R2aWV3L3Byb2ZpbGUvcGFnZS50cyIsInVpLWxpc3R2aWV3L2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGV4cG9ydCBjb25zdCBlbnVtIENEUF9LTk9XTl9VSV9NT0RVTEUge1xuICAgICAgICAvKiogYEBjZHAvdWktdXRpbHNgICovXG4gICAgICAgIFVUSUxTICAgICA9IDEsXG4gICAgICAgIC8qKiBgQGNkcC91aS1saXN0dmlld2AgKi9cbiAgICAgICAgTElTVFZJRVcgID0gMixcbiAgICAgICAgLyoqIG9mZnNldCBmb3IgdW5rbm93biB1aS1tb2R1bGUgKi9cbiAgICAgICAgT0ZGU0VULFxuICAgIH1cblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfVVRJTFMgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLlVUSUxTKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9VVElMU19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9VVElMU19GQVRBTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX1VUSUxTICsgMSwgJ1VJIHV0aWxzIHNvbWV0aGluZyB3cm9uZy4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZ2V0Q29tcHV0ZWRTdHlsZSA9IHNhZmUoZ2xvYmFsVGhpcy5nZXRDb21wdXRlZFN0eWxlKTtcbiIsImltcG9ydCB7IGdldENvbXB1dGVkU3R5bGUgfSBmcm9tICcuLi9zc3InO1xuXG4vKipcbiAqIEBlbiBDU1MgdmVuZG9yIHByZWZpeCBzdHJpbmcgZGVmaW5pdGlvbi5cbiAqIEBqYSBDU1Mg44OZ44Oz44OA44O844OX44Oq44OV44Kj44OD44Kv44K55paH5a2X5YiX5a6a576pXG4gKi9cbmV4cG9ydCBjb25zdCBjc3NQcmVmaXhlcyA9IFsnLXdlYmtpdC0nLCAnLW1vei0nLCAnLW1zLScsICctby0nLCAnJ107XG5cbi8qKlxuICogQGVuIFN0b3JlcyB0aGUgdmFsdWUgc3BlY2lmaWVkIGluIGNzcyBgdHJhbnNmb3JtKDNkKWAuXG4gKiBAamEgY3NzIGB0cmFuc2Zvcm0oM2QpYCDjgavmjIflrprjgZXjgozjgovlgKTjgpLmoLzntI1cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMge1xuICAgIHRyYW5zbGF0ZVg6IG51bWJlcjtcbiAgICB0cmFuc2xhdGVZOiBudW1iZXI7XG4gICAgdHJhbnNsYXRlWjogbnVtYmVyO1xuICAgIHNjYWxlWDogbnVtYmVyO1xuICAgIHNjYWxlWTogbnVtYmVyO1xuICAgIHNjYWxlWjogbnVtYmVyO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIHRoZSB0cmFuc2Zvcm0gbWF0cml4IHNwZWNpZmllZCBpbiBgRWxlbWVudGAuXG4gKiBAamEgYEVsZW1lbnRgIOOBq+aMh+WumuOBleOCjOOBnyB0cmFuc2Zvcm0g6KGM5YiX44Gu5YCk44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgRWxlbWVudGAgaW5zdGFuY2VcbiAqICAtIGBqYWAg5a++6LGhIGBFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGNvbnN0IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyA9IChlbDogRWxlbWVudCk6IFRyYW5zZm9ybU1hdHJpeFZhbHVlcyA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICBjb25zdCB7IG0xMSwgbTIyLCBtMzMsIG00MSwgbTQyLCBtNDMgfSA9IG5ldyBET01NYXRyaXhSZWFkT25seShzdHlsZS50cmFuc2Zvcm0pO1xuICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zbGF0ZVg6IG00MSxcbiAgICAgICAgdHJhbnNsYXRlWTogbTQyLFxuICAgICAgICB0cmFuc2xhdGVaOiBtNDMsXG4gICAgICAgIHNjYWxlWDogbTExLFxuICAgICAgICBzY2FsZVk6IG0yMixcbiAgICAgICAgc2NhbGVaOiBtMzMsXG4gICAgfTtcbn07XG4iLCJpbXBvcnQgJy4vcmVzdWx0LWNvZGUtZGVmcyc7XG5leHBvcnQgKiBmcm9tICcuL2Nzcyc7XG5cbi8vIFRPRE86IHRlc3RcbmV4cG9ydCBjb25zdCBVSV9VVElMU19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcbmltcG9ydCB7IGkxOG4sIGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaXNGdW5jdGlvbihpMThuLnQpICYmICBjb25zb2xlLmxvZygnb2tvaycpO1xuIiwiZXhwb3J0IGNvbnN0IFVJX0ZPUk1TX1NUQVRVUyA9ICdVTkRFUiBDT05TVFJVQ1RJT04nO1xuXG5pbXBvcnQgeyBub29wLCBwb3N0IH0gZnJvbSAnQGNkcC9ydW50aW1lJztcblxuaW1wb3J0IHN0eWxlQ29yZSBmcm9tICdAY3NzL3N0cnVjdHVyZS5jc3MnIGFzc2VydCB7IHR5cGU6ICdjc3MnIH07XG5pbXBvcnQgc3R5bGVCdXR0b24gZnJvbSAnQGNzcy9zdHJ1Y3R1cmUtYnV0dG9uLmNzcycgYXNzZXJ0IHsgdHlwZTogJ2NzcycgfTtcbnZvaWQgcG9zdChub29wKHN0eWxlQ29yZSwgc3R5bGVCdXR0b24pKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfTElTVFZJRVcgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLkxJU1RWSUVXKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9MSVNUVklFV19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9MSVNUVklFV19JTlZBTElEX0lOSVRJQUxJWkFUSU9OID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfTElTVFZJRVcgKyAxLCAnbGlzdHZpZXcgaGFzIGludmFsaWQgaW5pdGlhbGl6YXRpb24uJyksXG4gICAgfVxufVxuIiwiLyoqXG4gKiBAZW4gR2xvYmFsIGNvbmZpZ3VyYXRpb24gZGVmaW5pdGlvbiBmb3IgbGlzdCB2aWV3cy5cbiAqIEBqYSDjg6rjgrnjg4jjg5Pjg6Xjg7zjga7jgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjg6zjg7zjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgTkFNRVNQQUNFOiBzdHJpbmc7XG4gICAgV1JBUFBFUl9DTEFTUzogc3RyaW5nO1xuICAgIFdSQVBQRVJfU0VMRUNUT1I6IHN0cmluZztcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBzdHJpbmc7XG4gICAgU0NST0xMX01BUF9TRUxFQ1RPUjogc3RyaW5nO1xuICAgIElOQUNUSVZFX0NMQVNTOiBzdHJpbmc7XG4gICAgSU5BQ1RJVkVfQ0xBU1NfU0VMRUNUT1I6IHN0cmluZztcbiAgICBSRUNZQ0xFX0NMQVNTOiBzdHJpbmc7XG4gICAgUkVDWUNMRV9DTEFTU19TRUxFQ1RPUjogc3RyaW5nO1xuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1M6IHN0cmluZztcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTX1NFTEVDVE9SOiBzdHJpbmc7XG4gICAgREFUQV9QQUdFX0lOREVYOiBzdHJpbmc7XG4gICAgREFUQV9DT05UQUlORVJfSU5ERVg6IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZWZhdWx0ViB7XG4gICAgTkFNRVNQQUNFICAgICAgICAgICAgICAgICAgICA9ICdjZHAtdWknLFxuICAgIFdSQVBQRVJfQ0xBU1MgICAgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXdyYXBwZXJgLFxuICAgIFdSQVBQRVJfU0VMRUNUT1IgICAgICAgICAgICAgPSBgLiR7V1JBUFBFUl9DTEFTU31gLFxuICAgIFNDUk9MTF9NQVBfQ0xBU1MgICAgICAgICAgICAgPSBgJHtOQU1FU1BBQ0V9LWxpc3R2aWV3LXNjcm9sbC1tYXBgLFxuICAgIFNDUk9MTF9NQVBfU0VMRUNUT1IgICAgICAgICAgPSBgLiR7U0NST0xMX01BUF9DTEFTU31gLFxuICAgIElOQUNUSVZFX0NMQVNTICAgICAgICAgICAgICAgPSAnaW5hY3RpdmUnLFxuICAgIElOQUNUSVZFX0NMQVNTX1NFTEVDVE9SICAgICAgPSBgLiR7SU5BQ1RJVkVfQ0xBU1N9YCxcbiAgICBSRUNZQ0xFX0NMQVNTICAgICAgICAgICAgICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1yZWN5Y2xlYCxcbiAgICBSRUNZQ0xFX0NMQVNTX1NFTEVDVE9SICAgICAgID0gYC4ke1JFQ1lDTEVfQ0xBU1N9YCxcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTICAgICAgICAgID0gYCR7TkFNRVNQQUNFfS1saXN0dmlldy1pdGVtLWJhc2VgLFxuICAgIExJU1RJVEVNX0JBU0VfQ0xBU1NfU0VMRUNUT1IgPSBgLiR7TElTVElURU1fQkFTRV9DTEFTU31gLFxuICAgIERBVEFfUEFHRV9JTkRFWCAgICAgICAgICAgICAgPSBgZGF0YS0ke05BTUVTUEFDRX0tcGFnZS1pbmRleGAsXG4gICAgREFUQV9DT05UQUlORVJfSU5ERVggICAgICAgICA9IGBkYXRhLSR7TkFNRVNQQUNFfS1jb250YWluZXItaW5kZXhgLFxufVxuXG5jb25zdCBfY29uZmlnID0ge1xuICAgIE5BTUVTUEFDRTogRGVmYXVsdFYuTkFNRVNQQUNFLFxuICAgIFdSQVBQRVJfQ0xBU1M6IERlZmF1bHRWLldSQVBQRVJfQ0xBU1MsXG4gICAgV1JBUFBFUl9TRUxFQ1RPUjogRGVmYXVsdFYuV1JBUFBFUl9TRUxFQ1RPUixcbiAgICBTQ1JPTExfTUFQX0NMQVNTOiBEZWZhdWx0Vi5TQ1JPTExfTUFQX0NMQVNTLFxuICAgIFNDUk9MTF9NQVBfU0VMRUNUT1I6IERlZmF1bHRWLlNDUk9MTF9NQVBfU0VMRUNUT1IsXG4gICAgSU5BQ1RJVkVfQ0xBU1M6IERlZmF1bHRWLklOQUNUSVZFX0NMQVNTLFxuICAgIElOQUNUSVZFX0NMQVNTX1NFTEVDVE9SOiBEZWZhdWx0Vi5JTkFDVElWRV9DTEFTU19TRUxFQ1RPUixcbiAgICBSRUNZQ0xFX0NMQVNTOiBEZWZhdWx0Vi5SRUNZQ0xFX0NMQVNTLFxuICAgIFJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1I6IERlZmF1bHRWLlJFQ1lDTEVfQ0xBU1NfU0VMRUNUT1IsXG4gICAgTElTVElURU1fQkFTRV9DTEFTUzogRGVmYXVsdFYuTElTVElURU1fQkFTRV9DTEFTUyxcbiAgICBMSVNUSVRFTV9CQVNFX0NMQVNTX1NFTEVDVE9SOiBEZWZhdWx0Vi5MSVNUSVRFTV9CQVNFX0NMQVNTX1NFTEVDVE9SLFxuICAgIERBVEFfUEFHRV9JTkRFWDogRGVmYXVsdFYuREFUQV9QQUdFX0lOREVYLFxuICAgIERBVEFfQ09OVEFJTkVSX0lOREVYOiBEZWZhdWx0Vi5EQVRBX0NPTlRBSU5FUl9JTkRFWCxcbn07XG5cbi8qKlxuICogQGVuIEdldC9VcGRhdGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gb2YgbGlzdCB2aWV3LlxuICogQGphIOODquOCueODiOODk+ODpeODvOOBruOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOODrOODvOOCt+ODp+ODs+OBruWPluW+ly/mm7TmlrBcbiAqL1xuZXhwb3J0IGNvbnN0IExpc3RWaWV3R2xvYmFsQ29uZmlnID0gKG5ld0NvbmZpZz86IFBhcnRpYWw8TGlzdFZpZXdHbG9iYWxDb25maWc+KTogTGlzdFZpZXdHbG9iYWxDb25maWcgPT4ge1xuICAgIGlmIChuZXdDb25maWcpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMobmV3Q29uZmlnKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gbmV3Q29uZmlnW2tleSBhcyBrZXlvZiBMaXN0Vmlld0dsb2JhbENvbmZpZ10pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgbmV3Q29uZmlnW2tleSBhcyBrZXlvZiBMaXN0Vmlld0dsb2JhbENvbmZpZ107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIF9jb25maWcsIG5ld0NvbmZpZyk7XG59O1xuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmltcG9ydCB7IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyB9IGZyb20gJ0BjZHAvdWktdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIElMaXN0Q29udGV4dCxcbiAgICBJTGlzdEl0ZW1WaWV3LFxuICAgIExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBMaXN0Vmlld0dsb2JhbENvbmZpZyB9IGZyb20gJy4uL2dsb2JhbC1jb25maWcnO1xuXG4vKipcbiAqIEBlbiBBIGNsYXNzIHRoYXQgc3RvcmVzIFVJIHN0cnVjdHVyZSBpbmZvcm1hdGlvbiBmb3IgbGlzdCBpdGVtcy5cbiAqIEBqYSDjg6rjgrnjg4jjgqLjgqTjg4bjg6Djga4gVUkg5qeL6YCg5oOF5aCx44KS5qC857SN44GZ44KL44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBJdGVtUHJvZmlsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX293bmVyOiBJTGlzdENvbnRleHQ7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2hlaWdodDogbnVtYmVyO1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9pbml0aWFsaXplcjogbmV3IChvcHRpb25zPzogVW5rbm93bk9iamVjdCkgPT4gSUxpc3RJdGVtVmlldztcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfaW5mbzogVW5rbm93bk9iamVjdDtcbiAgICAvKiogQGludGVybmFsIGdsb2JhbCBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcbiAgICAvKiogQGludGVybmFsIGJlbG9uZ2luZyBwYWdlIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfcGFnZUluZGV4ID0gMDtcbiAgICAvKiogQGludGVybmFsIGdsb2JhbCBvZmZzZXQgKi9cbiAgICBwcml2YXRlIF9vZmZzZXQgPSAwO1xuICAgIC8qKiBAaW50ZXJuYWwgYmFzZSBkb20gaW5zdGFuY2UgKi9cbiAgICBwcml2YXRlIF8kYmFzZT86IERPTTtcbiAgICAvKiogQGludGVybmFsIElMaXN0SXRlbVZpZXcgaW5zdGFuY2UgKi9cbiAgICBwcml2YXRlIF9pbnN0YW5jZT86IElMaXN0SXRlbVZpZXc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG93bmVyXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSUxpc3RWaWV3Q29udGV4dH0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdFZpZXdDb250ZXh0fSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGl0ZW0ncyBoZWlnaHRcbiAgICAgKiAgLSBgamFgIGl0ZW0g44Gu5Yid5pyf44Gu6auY44GVXG4gICAgICogQHBhcmFtIGluaXRpYWxpemVyXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3RvciBmb3Ige0BsaW5rIElMaXN0SXRlbVZpZXd9J3Mgc3ViY2xhc3NcbiAgICAgKiAgLSBgamFgIHtAbGluayBJTGlzdEl0ZW1WaWV3fSDjga7jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5mb1xuICAgICAqICAtIGBlbmAgaW5pdCBwYXJhbWV0ZXJzIGZvciB7QGxpbmsgSUxpc3RJdGVtVmlld30ncyBzdWJjbGFzc1xuICAgICAqICAtIGBqYWAge0BsaW5rIElMaXN0SXRlbVZpZXd9IOOBruOCteODluOCr+ODqeOCueOBruWIneacn+WMluODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG93bmVyOiBJTGlzdENvbnRleHQsIGhlaWdodDogbnVtYmVyLCBpbml0aWFsaXplcjogbmV3IChvcHRpb25zPzogVW5rbm93bk9iamVjdCkgPT4gSUxpc3RJdGVtVmlldywgX2luZm86IFVua25vd25PYmplY3QpIHtcbiAgICAgICAgdGhpcy5fb3duZXIgICAgICAgPSBvd25lcjtcbiAgICAgICAgdGhpcy5faGVpZ2h0ICAgICAgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVyID0gaW5pdGlhbGl6ZXI7XG4gICAgICAgIHRoaXMuX2luZm8gICAgICAgID0gX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWN0aXZhdGUgb2YgdGhlIGl0ZW0uXG4gICAgICogQGphIGl0ZW0g44Gu5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UgPSB0aGlzLnByZXBhcmVCYXNlRWxlbWVudCgpO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgICAgIGVsOiB0aGlzLl8kYmFzZSxcbiAgICAgICAgICAgICAgICBvd25lcjogdGhpcy5fb3duZXIsXG4gICAgICAgICAgICAgICAgbGluZVByb2ZpbGU6IHRoaXMsXG4gICAgICAgICAgICB9LCB0aGlzLl9pbmZvKTtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlID0gbmV3IHRoaXMuX2luaXRpYWxpemVyKG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCdub25lJyA9PT0gdGhpcy5fJGJhc2UuY3NzKCdkaXNwbGF5JykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VJbmRleCgpO1xuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgJ3Zpc2libGUnICE9PSB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknKSkge1xuICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNYWtlIHRoZSBpdGVtIGludmlzaWJsZS5cbiAgICAgKiBAamEgaXRlbSDjga7kuI3lj6/oppbljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGlkZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgJ2hpZGRlbicgIT09IHRoaXMuXyRiYXNlLmNzcygndmlzaWJpbGl0eScpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVhY3RpdmF0ZSBvZiB0aGUgaXRlbS5cbiAgICAgKiBAamEgaXRlbSDjga7pnZ7mtLvmgKfljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZT8uYWRkQ2xhc3ModGhpcy5fY29uZmlnLlJFQ1lDTEVfQ0xBU1MpO1xuICAgICAgICAgICAgdGhpcy5fJGJhc2U/LmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWZyZXNoIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBruabtOaWsFxuICAgICAqL1xuICAgIHB1YmxpYyByZWZyZXNoKCk6IHZvaWQge1xuICAgICAgICBpZiAobnVsbCAhPSB0aGlzLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UucmVuZGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGFjdGl2YXRpb24gc3RhdHVzIG9mIHRoZSBpdGVtLlxuICAgICAqIEBqYSBpdGVtIOOBrua0u+aAp+eKtuaFi+WIpOWumlxuICAgICAqL1xuICAgIHB1YmxpYyBpc0FjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5faW5zdGFuY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBoZWlnaHQgaW5mb3JtYXRpb24gb2YgdGhlIGl0ZW0uIENhbGxlZCBmcm9tIHtAbGluayBMaXN0SXRlbVZpZXd9LlxuICAgICAqIEBqYSBpdGVtIOOBrumrmOOBleaDheWgseOBruabtOaWsC4ge0BsaW5rIExpc3RJdGVtVmlld30g44GL44KJ44Kz44O844Or44GV44KM44KL44CCXG4gICAgICovXG4gICAgcHVibGljIHVwZGF0ZUhlaWdodChuZXdIZWlnaHQ6IG51bWJlciwgb3B0aW9ucz86IExpc3RJdGVtVXBkYXRlSGVpZ2h0T3B0aW9ucyk6IHZvaWQge1xuICAgICAgICBjb25zdCBkZWx0YSA9IG5ld0hlaWdodCAtIHRoaXMuX2hlaWdodDtcbiAgICAgICAgdGhpcy5faGVpZ2h0ID0gbmV3SGVpZ2h0O1xuICAgICAgICB0aGlzLl9vd25lci51cGRhdGVTY3JvbGxNYXBIZWlnaHQoZGVsdGEpO1xuICAgICAgICBpZiAob3B0aW9ucz8ucmVmbGVjdEFsbCkge1xuICAgICAgICAgICAgdGhpcy5fb3duZXIudXBkYXRlUHJvZmlsZXModGhpcy5faW5kZXgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHotaW5kZXguIENhbGxlZCBmcm9tIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYC5cbiAgICAgKiBAamEgei1pbmRleCDjga7jg6rjgrvjg4Pjg4guIHtAbGluayBTY3JvbGxNYW5hZ2VyfWAucmVtb3ZlSXRlbSgpYCDjgYvjgonjgrPjg7zjg6vjgZXjgozjgovjgIJcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXREZXB0aCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gdGhpcy5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlPy5jc3MoJ3otaW5kZXgnLCB0aGlzLl9vd25lci5vcHRpb25zLmJhc2VEZXB0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKiogR2V0IHRoZSBpdGVtJ3MgaGVpZ2h0LiAqL1xuICAgIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgICB9XG5cbiAgICAvKiogR2V0IHRoZSBpdGVtJ3MgZ2xvYmFsIGluZGV4LiAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFNldCB0aGUgaXRlbSdzIGdsb2JhbCBpbmRleC4gKi9cbiAgICBzZXQgaW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnVwZGF0ZUluZGV4KCk7XG4gICAgfVxuXG4gICAgLyoqIEdldCBiZWxvbmdpbmcgdGhlIHBhZ2UgaW5kZXguICovXG4gICAgZ2V0IHBhZ2VJbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFnZUluZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgYmVsb25naW5nIHRoZSBwYWdlIGluZGV4LiAqL1xuICAgIHNldCBwYWdlSW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9wYWdlSW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSW5kZXgoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGdsb2JhbCBvZmZzZXQuICovXG4gICAgZ2V0IG9mZnNldCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBTZXQgZ2xvYmFsIG9mZnNldC4gKi9cbiAgICBzZXQgb2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICAgICAgdGhpcy51cGRhdGVPZmZzZXQoKTtcbiAgICB9XG5cbiAgICAvKiogR2V0IGluaXQgcGFyYW1ldGVycy4gKi9cbiAgICBnZXQgaW5mbygpOiBVbmtub3duT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZm87XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgX2NvbmZpZygpOiBMaXN0Vmlld0dsb2JhbENvbmZpZyB7XG4gICAgICAgIHJldHVybiBMaXN0Vmlld0dsb2JhbENvbmZpZygpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHByZXBhcmVCYXNlRWxlbWVudCgpOiBET00ge1xuICAgICAgICBsZXQgJGJhc2U6IERPTTtcbiAgICAgICAgY29uc3QgJHJlY3ljbGUgPSB0aGlzLl9vd25lci5maW5kUmVjeWNsZUVsZW1lbnRzKCkuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgaXRlbVRhZ05hbWUgPSB0aGlzLl9vd25lci5vcHRpb25zLml0ZW1UYWdOYW1lO1xuXG4gICAgICAgIGlmIChudWxsICE9IHRoaXMuXyRiYXNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ3RoaXMuXyRiYXNlIGlzIG5vdCBudWxsLicpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuXyRiYXNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKDAgPCAkcmVjeWNsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICRiYXNlID0gJHJlY3ljbGU7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVBdHRyKCd6LWluZGV4Jyk7XG4gICAgICAgICAgICAkYmFzZS5yZW1vdmVDbGFzcyh0aGlzLl9jb25maWcuUkVDWUNMRV9DTEFTUyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUT0RPOiAg6KaL55u044GX5LqI5a6aLiA8bGk+IOWFqOiIrOOBryA8c2xvdD4g44Go5ZCM5by36Kq/44GZ44KL44GLP1xuICAgICAgICAgICAgJGJhc2UgPSAkKGA8JHtpdGVtVGFnTmFtZX0gY2xhc3M9XCIke3RoaXMuX2NvbmZpZy5MSVNUSVRFTV9CQVNFX0NMQVNTfVwiPjwvXCIke2l0ZW1UYWdOYW1lfVwiPmApO1xuICAgICAgICAgICAgJGJhc2UuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuX293bmVyLiRzY3JvbGxNYXAuYXBwZW5kKCRiYXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOmrmOOBleOBruabtOaWsFxuICAgICAgICBpZiAoJGJhc2UuaGVpZ2h0KCkgIT09IHRoaXMuX2hlaWdodCkge1xuICAgICAgICAgICAgJGJhc2UuaGVpZ2h0KHRoaXMuX2hlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpbmRleCDjga7oqK3lrppcbiAgICAgICAgdGhpcy51cGRhdGVJbmRleCgpO1xuICAgICAgICAvLyBvZmZzZXQg44Gu5pu05pawXG4gICAgICAgIHRoaXMudXBkYXRlT2Zmc2V0KCk7XG5cbiAgICAgICAgcmV0dXJuICRiYXNlO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZUluZGV4KCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9DT05UQUlORVJfSU5ERVgpICE9PSBTdHJpbmcodGhpcy5faW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLl8kYmFzZS5hdHRyKHRoaXMuX2NvbmZpZy5EQVRBX0NPTlRBSU5FUl9JTkRFWCwgdGhpcy5faW5kZXgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlUGFnZUluZGV4KCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fJGJhc2UgJiYgdGhpcy5fJGJhc2UuYXR0cih0aGlzLl9jb25maWcuREFUQV9QQUdFX0lOREVYKSAhPT0gU3RyaW5nKHRoaXMuX3BhZ2VJbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuXyRiYXNlLmF0dHIodGhpcy5fY29uZmlnLkRBVEFfUEFHRV9JTkRFWCwgdGhpcy5fcGFnZUluZGV4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZU9mZnNldCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl8kYmFzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX293bmVyLm9wdGlvbnMuZW5hYmxlVHJhbnNmb3JtT2Zmc2V0KSB7XG4gICAgICAgICAgICBjb25zdCB7IHRyYW5zbGF0ZVkgfSA9IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyh0aGlzLl8kYmFzZVswXSk7XG4gICAgICAgICAgICBpZiAodHJhbnNsYXRlWSAhPT0gdGhpcy5fb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGJhc2UuY3NzKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlM2QoMCwke3RoaXMuX29mZnNldH1weCwwYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0b3AgPSBwYXJzZUludCh0aGlzLl8kYmFzZS5jc3MoJ3RvcCcpLCAxMCk7XG4gICAgICAgICAgICBpZiAodG9wICE9PSB0aGlzLl9vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kYmFzZS5jc3MoJ3RvcCcsIGAke3RoaXMuX29mZnNldH1weGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgYXQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuaW1wb3J0IHsgSXRlbVByb2ZpbGUgfSBmcm9tICcuL2l0ZW0nO1xuXG4vKipcbiAqIEBlbiBBIGNsYXNzIHRoYXQgc3RvcmVzIFVJIHN0cnVjdHVyZSBpbmZvcm1hdGlvbiBmb3Igb25lIHBhZ2Ugb2YgdGhlIGxpc3QuXG4gKiBAamEg44Oq44K544OIMeODmuODvOOCuOWIhuOBriBVSSDmp4vpgKDmg4XloLHjgpLmoLzntI3jgZnjgovjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFBhZ2VQcm9maWxlIHtcbiAgICAvKiogcGFnZSBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcbiAgICAvKiogcGFnZSBvZmZzZXQgZnJvbSB0b3AgKi9cbiAgICBwcml2YXRlIF9vZmZzZXQgPSAwO1xuICAgIC8qKiBwYWdlJ3MgaGVpZ2h0ICovXG4gICAgcHJpdmF0ZSBfaGVpZ2h0ID0gMDtcbiAgICAvKiogaXRlbSdzIHByb2ZpbGUgbWFuYWdlZCB3aXRoIGluIHBhZ2UgKi9cbiAgICBwcml2YXRlIF9pdGVtczogSXRlbVByb2ZpbGVbXSA9IFtdO1xuICAgIC8qKiBwYWdlIHN0YXR1cyAqL1xuICAgIHByaXZhdGUgX3N0YXR1czogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnIHwgJ2hpZGRlbicgPSAnaW5hY3RpdmUnO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWN0aXZhdGUgb2YgdGhlIHBhZ2UuXG4gICAgICogQGphIHBhZ2Ug44Gu5rS75oCn5YyWXG4gICAgICovXG4gICAgcHVibGljIGFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2FjdGl2ZScgIT09IHRoaXMuX3N0YXR1cykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuX2l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdhY3RpdmUnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNYWtlIHRoZSBwYWdlIGludmlzaWJsZS5cbiAgICAgKiBAamEgcGFnZSDjga7kuI3lj6/oppbljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGlkZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCdoaWRkZW4nICE9PSB0aGlzLl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLl9pdGVtcykge1xuICAgICAgICAgICAgICAgIGl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3N0YXR1cyA9ICdoaWRkZW4nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWFjdGl2YXRlIG9mIHRoZSBwYWdlLlxuICAgICAqIEBqYSBwYWdlIOOBrumdnua0u+aAp+WMllxuICAgICAqL1xuICAgIHB1YmxpYyBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAoJ2luYWN0aXZlJyAhPT0gdGhpcy5fc3RhdHVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5faXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaW5hY3RpdmUnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQge0BsaW5rIEl0ZW1Qcm9maWxlfSB0byB0aGUgcGFnZS5cbiAgICAgKiBAamEge0BsaW5rIEl0ZW1Qcm9maWxlfSDjga7ov73liqBcbiAgICAgKi9cbiAgICBwdWJsaWMgcHVzaChpdGVtOiBJdGVtUHJvZmlsZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB0aGlzLl9oZWlnaHQgKz0gaXRlbS5oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIElmIGFsbCB7QGxpbmsgSXRlbVByb2ZpbGV9IHVuZGVyIHRoZSBwYWdlIGFyZSBub3QgdmFsaWQsIGRpc2FibGUgdGhlIHBhZ2UncyBzdGF0dXMuXG4gICAgICogQGphIOmFjeS4i+OBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOBmeOBueOBpuOBjOacieWKueOBp+OBquOBhOWgtOWQiCwgcGFnZSDjgrnjg4bjg7zjgr/jgrnjgpLnhKHlirnjgavjgZnjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgbm9ybWFsaXplKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbmFibGVBbGwgPSB0aGlzLl9pdGVtcy5ldmVyeShpdGVtID0+IGl0ZW0uaXNBY3RpdmUoKSk7XG4gICAgICAgIGlmICghZW5hYmxlQWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0dXMgPSAnaW5hY3RpdmUnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgSXRlbVByb2ZpbGV9IGJ5IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgaYge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbShpbmRleDogbnVtYmVyKTogSXRlbVByb2ZpbGUge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5faXRlbXMsIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGZpcnN0IHtAbGluayBJdGVtUHJvZmlsZX0uXG4gICAgICogQGphIOacgOWIneOBriB7QGxpbmsgSXRlbVByb2ZpbGV9IOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRJdGVtRmlyc3QoKTogSXRlbVByb2ZpbGUge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRJdGVtKDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCB7QGxpbmsgSXRlbVByb2ZpbGV9LlxuICAgICAqIEBqYSDmnIDlvozjga4ge0BsaW5rIEl0ZW1Qcm9maWxlfSDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0SXRlbUxhc3QoKTogSXRlbVByb2ZpbGUge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRJdGVtKHRoaXMuX2l0ZW1zLmxlbmd0aCAtIDEpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKiBHZXQgdGhlIHBhZ2UgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIHBhZ2UgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIHBhZ2Ugb2Zmc2V0ICovXG4gICAgZ2V0IG9mZnNldCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0O1xuICAgIH1cblxuICAgIC8qKiBTZXQgdGhlIHBhZ2Ugb2Zmc2V0ICovXG4gICAgc2V0IG9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBoZWlnaHQgKi9cbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gICAgfVxuXG4gICAgLyoqIEdldCB0aGUgcGFnZSBzdGF0dXMgKi9cbiAgICBnZXQgc3RhdHVzKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXM7XG4gICAgfVxufVxuIiwiaW1wb3J0ICcuL3Jlc3VsdC1jb2RlLWRlZnMnO1xuZXhwb3J0ICogZnJvbSAnLi9pbnRlcmZhY2VzJztcbmV4cG9ydCAqIGZyb20gJy4vZ2xvYmFsLWNvbmZpZyc7XG5leHBvcnQgKiBmcm9tICcuL3Byb2ZpbGUnO1xuXG4vLyBUT0RPOiB0ZXN0XG5leHBvcnQgY29uc3QgVUlfTElTVFZJRVdfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBOzs7QUFHRztBQUVILENBQUEsWUFBcUI7QUFlakI7OztBQUdHO0FBQ0gsSUFBQSxJQUdDLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQSxDQUFBO0FBSEQsSUFBQSxDQUFB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