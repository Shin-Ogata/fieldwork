import {
    type UnknownObject,
    type DOM,
    type DOMEventListener,
    post,
    noop,
    RESULT_CODE,
    makeResult,
    toHelpString,
    dom as $,
} from '@cdp/runtime';
import {
    getTransformMatrixValues,
    setTransformTransition,
    clearTransition,
} from '@cdp/ui-utils';
import type {
    ListContextOptions,
    IListContext,
    ListEnsureVisibleOptions,
    IListScroller,
    IListOperation,
    IListScrollable,
    IListBackupRestore,
    IListItemViewConstructor,
} from '../interfaces';
import { ListViewGlobalConfig } from '../global-config';
import { ItemProfile, PageProfile } from '../profile';
import { ElementScroller } from './element-scroller';

/** ListContextOptions 既定値 */
const _defaultOpts: Required<ListContextOptions> = {
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
const _$invalid = $() as DOM;

/** 初期化済みか検証 */
function verify<T>(x: T | undefined): asserts x is T {
    if (null == x) {
        throw makeResult(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_INITIALIZATION);
    }
}

/** overflow-y を保証 */
function ensureOverflowY($el: DOM): DOM {
    const overflowY = $el.css('overflow-y');
    if ('hidden' === overflowY || 'visible' === overflowY) {
        $el.css('overflow-y', 'auto');
    }
    return $el;
}

/** scroll-map element を保証 */
function ensureScrollMap($root: DOM, mapClass: string): DOM {
    let $map = $root.find(`.${mapClass}`);
    // $map が無い場合は作成する
    if ($map.length <= 0) {
        $map = $(`<div class="${mapClass}"></div>`);
        $root.append($map);
    }
    return $map;
}

/** @internal アイテム削除情報 */
interface RemoveItemsContext {
    removed: ItemProfile[];
    delta: number;
    transition: boolean;
}

//__________________________________________________________________________________________________//

/**
 * @internal
 * @en Core logic implementation class for scroll processing that manages memory. Accesses the DOM.
 * @ja メモリ管理を行うスクロール処理のコアロジック実装クラス. DOM にアクセスする.
 */
export class ListCore implements IListContext, IListOperation, IListScrollable, IListBackupRestore {
    private _$root: DOM;
    private _$map: DOM;
    private _mapHeight = 0;
    private _scroller: IListScroller | undefined;

    /** UI 表示中に true */
    private _active = true;

    /** 初期オプションを格納 */
    private readonly _settings: Required<ListContextOptions>;
    /** Scroll Event Handler */
    private readonly _scrollEventHandler: (ev?: Event) => void;
    /** Scroll Stop Event Handler */
    private readonly _scrollStopEventHandler: (ev?: Event) => void;
    /** 1ページ分の高さの基準値 */
    private _baseHeight = 0;
    /** 管理下にある ItemProfile 配列 */
    private readonly _items: ItemProfile[] = [];
    /** 管理下にある PageProfile 配列 */
    private readonly _pages: PageProfile[] = [];

    /** 最新の表示領域情報を格納 (Scroll 中の更新処理に使用) */
    private readonly _lastActivePageContext = {
        index: 0,
        from: 0,
        to: 0,
        pos: 0,    // scroll position
    };

    /** データの backup 領域. key と _items を格納 */
    private readonly _backup: Record<string, { items: ItemProfile[]; }> = {};

    /** constructor */
    constructor(options?: ListContextOptions) {
        this._$root = this._$map = _$invalid;
        this._settings = Object.assign({}, _defaultOpts, options);

        this._scrollEventHandler = () => {
            this.onScroll(this._scroller!.pos);
        };
        this._scrollStopEventHandler = (): void => {
            this.onScrollStop(this._scroller!.pos);
        };
    }

///////////////////////////////////////////////////////////////////////
// public methods:

    /** 内部オブジェクトの初期化 */
    public initialize($root: DOM, height: number): void {
        // 既に構築されていた場合は破棄
        if (this._$root.length) {
            this.destroy();
        }

        this._$root = ensureOverflowY($root);
        this._$map  = ensureScrollMap(this._$root, this._config.SCROLL_MAP_CLASS);

        this._scroller = this.createScroller();
        this.setBaseHeight(height);
        this.setScrollerCondition();
    }

    /** 内部オブジェクトの破棄 */
    public destroy(): void {
        this.resetScrollerCondition();
        this._scroller?.destroy();
        this._scroller = undefined;
        this.release();
        this._$root = this._$map = _$invalid;
    }

    /** ページの基準値を取得 */
    public setBaseHeight(height: number): void {
        if (height <= 0) {
            throw makeResult(
                RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM,
                `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [base hight: ${height}]`
            );
        }
        this._baseHeight = height;
        this._scroller?.update();
    }

    /** active 状態設定 */
    public async setActiveState(active: boolean): Promise<void> {
        this._active = active;
        await this.treatScrollPosition();
    }

    /** active 状態判定 */
    get active(): boolean {
        return this._active;
    }

    /** スクロール位置の保存/復元 */
    public async treatScrollPosition(): Promise<void> {
        verify(this._scroller);

        const offset = (this._scroller.pos - this._lastActivePageContext.pos);
        const { useDummyInactiveScrollMap: useDummyMap } = this._settings;

        const updateOffset = ($target: DOM): void => {
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
        } else {
            const $map = useDummyMap ? this.prepareInactiveMap() : this._$map;
            updateOffset($map);
        }
    }

///////////////////////////////////////////////////////////////////////
// implements: IListContext

    /** get scroll-map element */
    get $scrollMap(): DOM {
        return this._$map;
    }

    /** get scroll-map height [px] */
    get scrollMapHeight(): number {
        return this._$map.length ? this._mapHeight : 0;
    }

    /** get {@link ListContextOptions} */
    get options(): Required<ListContextOptions> {
        return this._settings;
    }

    /** update scroll-map height (delta [px]) */
    updateScrollMapHeight(delta: number): void {
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
    updateProfiles(from: number): void {
        const { _items } = this;
        for (let i = from, n = _items.length; i < n; i++) {
            if (0 < i) {
                const last = _items[i - 1];
                _items[i].index = last.index! + 1;
                _items[i].offset = last.offset + last.height;
            } else {
                _items[i].index = 0;
                _items[i].offset = 0;
            }
        }
    }

    /** get recyclable element */
    findRecycleElements(): DOM {
        return this._$map.find(`.${this._config.RECYCLE_CLASS}`);
    }

///////////////////////////////////////////////////////////////////////
// implements: IListView

    /** 初期化済みか判定 */
    get isInitialized(): boolean {
        return !!this._scroller;
    }

    /** item 登録 */
    addItem(height: number, initializer: IListItemViewConstructor, info: UnknownObject, insertTo?: number): void {
        this._addItem(new ItemProfile(this, Math.trunc(height), initializer, info), insertTo);
    }

    /** item 登録 (内部用) */
    _addItem(item: ItemProfile | ItemProfile[], insertTo?: number): void {
        const items: ItemProfile[] = Array.isArray(item) ? item : [item];
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
            } else if (null != this._items[insertTo - 1].pageIndex) {
                this.clearPage(this._items[insertTo - 1].pageIndex);
            }
        }

        // offset の再計算
        this.updateProfiles(insertTo);
    }

    /** 指定した Item を削除 */
    removeItem(index: number, size?: number, delay?: number): void;
    removeItem(index: number[], delay?: number): void;
    removeItem(index: number | number[], arg2?: number, arg3?: number): void {
        if (Array.isArray(index)) {
            this._removeItemRandomly(index, arg2);
        } else {
            this._removeItemContinuously(index, arg2, arg3);
        }
    }

    /** helper: 削除候補と変化量の算出 */
    private _queryRemoveItemsContext(indexes: number[], delay: number): RemoveItemsContext {
        const removed: ItemProfile[] = [];
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
    private _updateWithRemoveItemsContext(context: RemoveItemsContext, delay: number, profileUpdate: () => void): void {
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
    private _removeItemContinuously(index: number, size: number | undefined, delay: number | undefined): void {
        size = size ?? 1;
        delay = delay ?? 0;

        if (index < 0 || this._items.length < index + size) {
            throw makeResult(
                RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM,
                `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [removeItem(), invalid index: ${index}]`
            );
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
    private _removeItemRandomly(indexes: number[], delay?: number): void {
        delay = delay ?? 0;
        indexes.sort((lhs, rhs) => rhs - lhs); // 降順ソート

        for (const index of indexes) {
            if (index < 0 || this._items.length < index) {
                throw makeResult(
                    RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM,
                    `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [removeItem(), invalid index: ${index}]`
                );
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
    private setupScrollMapTransition(delay: number): void {
        verify(this._scroller);
        const el = this._$map[0];
        this._$map.transitionEnd(() => {
            clearTransition(el);
        });
        setTransformTransition(el, 'height', delay, 'ease');
    }

    /** 指定した item に設定した情報を取得 */
    getItemInfo(target: number | Event): UnknownObject {
        const { _items, _config } = this;

        const parser = ($target: DOM): number => {
            if ($target.hasClass(_config.LISTITEM_BASE_CLASS)) {
                return Number($target.attr(_config.DATA_ITEM_INDEX));
            } else if ($target.hasClass(_config.SCROLL_MAP_CLASS) || $target.length <= 0) {
                console.warn('cannot ditect item from event object.');
                return NaN;
            } else {
                return parser($target.parent());
            }
        };

        const index = target instanceof Event ? parser($(target.target as HTMLElement)) : Number(target);

        if (Number.isNaN(index)) {
            throw makeResult(
                RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM,
                `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} [unsupported type: ${typeof target}]`
            );
        } else if (index < 0 || _items.length <= index) {
            throw makeResult(
                RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM,
                `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} getItemInfo() [invalid index: ${index}]`
            );
        }

        return _items[index].info;
    }

    /** アクティブページを更新 */
    refresh(): this {
        const { _pages, _items, _settings, _lastActivePageContext } = this;

        const targets: Record<number, 'activate' | 'hide' | 'deactivate'> = {};
        const currentPageIndex = this.getPageIndex();
        const highPriorityIndex: number[] = [];

        const storeNextPageState = (index: number): void => {
            if (index === currentPageIndex) {
                targets[index] = 'activate';
                highPriorityIndex.push(index);
            } else if (Math.abs(currentPageIndex - index) <= _settings.pagePrepareCount) {
                targets[index] = 'activate';
            } else if (_settings.enableHiddenPage) {
                targets[index] = 'hide';
            } else {
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
        _lastActivePageContext.from  = pageCurrent?.getItemFirst()?.index ?? 0;
        _lastActivePageContext.to    = pageCurrent?.getItemLast()?.index ?? 0;
        _lastActivePageContext.index = currentPageIndex;

        return this;
    }

    /** 未アサインページを構築 */
    update(): this {
        this.assignPage(Math.max(this._pages.length - 1, 0));
        this.refresh();
        return this;
    }

    /** ページアサインを再構成 */
    rebuild(): this {
        this.clearPage();
        this.assignPage();
        this.refresh();
        return this;
    }

    /** 管轄データを破棄 */
    release(): this {
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
    get scrollerType(): string | undefined {
        return this._scroller?.type;
    }

    /** スクロール位置を取得 */
    get scrollPos(): number {
        return this._scroller?.pos ?? 0;
    }

    /** スクロール位置の最大値を取得 */
    get scrollPosMax(): number {
        return this._scroller?.posMax ?? 0;
    }

    /** スクロールイベントハンドラ設定/解除 */
    setScrollHandler(handler: DOMEventListener, method: 'on' | 'off'): void {
        this._scroller?.[method]('scroll', handler);
    }

    /** スクロール終了イベントハンドラ設定/解除 */
    setScrollStopHandler(handler: DOMEventListener, method: 'on' | 'off'): void {
        this._scroller?.[method]('scrollstop', handler);
    }

    /** スクロール位置を指定 */
    async scrollTo(pos: number, animate?: boolean, time?: number): Promise<void> {
        verify(this._scroller);
        if (pos < 0) {
            console.warn(`invalid position, too small. [pos: ${pos}]`);
            pos = 0;
        } else if (this._scroller.posMax < pos) {
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
    async ensureVisible(index: number, options?: ListEnsureVisibleOptions): Promise<void> {
        const { _scroller, _items, _settings, _baseHeight } = this;

        verify(_scroller);
        if (index < 0 || _items.length <= index) {
            throw makeResult(
                RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM,
                `${toHelpString(RESULT_CODE.ERROR_UI_LISTVIEW_INVALID_PARAM)} ensureVisible() [invalid index: ${index}]`
            );
        }

        const { partialOK, setTop, animate, time, callback } = Object.assign({
            partialOK: true,
            setTop: false,
            animate: _settings.enableAnimation,
            time: _settings.animationDuration,
            callback: noop,
        }, options) as Required<ListEnsureVisibleOptions>;

        const currentScope = {
            from: _scroller.pos,
            to: _scroller.pos + _baseHeight,
        };

        const target = _items[index];

        const targetScope = {
            from: target.offset,
            to: target.offset + target.height,
        };

        const isInScope = (): boolean => {
            if (partialOK) {
                if (targetScope.from <= currentScope.from) {
                    return currentScope.from <= targetScope.to;
                } else {
                    return targetScope.from <= currentScope.to;
                }
            } else {
                return currentScope.from <= targetScope.from && targetScope.to <= currentScope.to;
            }
        };

        const detectPosition = (): number => {
            return targetScope.from < currentScope.from
                ? targetScope.from
                : target.offset - target.height // bottom 合わせは情報不足により不可
            ;
        };

        let pos: number;
        if (setTop) {
            pos = targetScope.from;
        } else if (isInScope()) {
            callback(_scroller.pos);
            return; // noop
        } else {
            pos = detectPosition();
        }

        await this.scrollTo(pos, animate, time);
        callback(pos);
    }

///////////////////////////////////////////////////////////////////////
// implements: IListBackupRestore

    /** 内部データのバックアップを実行 */
    backup(key: string): boolean {
        this._backup[key] = { items: this._items };
        return true;
    }

    /** 内部データのバックアップを実行 */
    restore(key: string, rebuild: boolean): boolean {
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
    hasBackup(key: string): boolean {
        return null != this._backup[key];
    }

    /** バックアップデータの破棄 */
    clearBackup(key?: string): boolean {
        if (null == key) {
            for (const key of Object.keys(this._backup)) {
                delete this._backup[key];
            }
            return true;
        } else if (null != this._backup[key]) {
            delete this._backup[key];
            return true;
        } else {
            return false;
        }
    }

    /** バックアップデータにアクセス */
    getBackupData(key: string): { items: ItemProfile[]; } | undefined {
        return this._backup[key];
    }

    /** バックアップデータを外部より設定 */
    setBackupData(key: string, data: { items: ItemProfile[]; }): boolean {
        if (Array.isArray(data.items)) {
            this._backup[key] = data;
            return true;
        }
        return false;
    }

///////////////////////////////////////////////////////////////////////
// internal:

    /** @internal */
    private get _config(): ListViewGlobalConfig {
        return ListViewGlobalConfig();
    }

    /** Scroller 用環境設定 */
    private setScrollerCondition(): void {
        this._scroller?.on('scroll', this._scrollEventHandler);
        this._scroller?.on('scrollstop', this._scrollStopEventHandler);
    }

    /** Scroller 用環境破棄 */
    private resetScrollerCondition(): void {
        this._scroller?.off('scrollstop', this._scrollStopEventHandler);
        this._scroller?.off('scroll', this._scrollEventHandler);
    }

    /** 既定の Scroller オブジェクトの作成 */
    private createScroller(): IListScroller {
        return this._settings.scrollerFactory(this._$root, this._$map, this._settings);
    }

    /** 現在の Page Index を取得 */
    private getPageIndex(): number {
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
            } else {
                return scrollPos * scrollMapSize / scrollPosMax;
            }
        })();

        const validRange = (page: PageProfile | undefined): boolean => {
            if (null == page) {
                return false;
            } else if (page.offset <= pos && pos <= page.offset + page.height) {
                return true;
            } else {
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
        } else if (pos < page?.offset) {
            for (let i = candidate - 1; i >= 0; i--) {
                page = _pages[i];
                if (validRange(page)) {
                    return page.index;
                }
            }
        } else {
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
    private getLastPage(): PageProfile | undefined {
        if (0 < this._pages.length) {
            return this._pages[this._pages.length - 1];
        } else {
            return undefined;
        }
    }

    /** スクロールイベント*/
    private onScroll(pos: number): void {
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
    private onScrollStop(pos: number): void {
        if (this._active && 0 < this._pages.length) {
            const currentPageIndex = this.getPageIndex();
            if (this._lastActivePageContext.index !== currentPageIndex) {
                this.refresh();
            }
            this._lastActivePageContext.pos = pos;
        }
    }

    /** ページ区分のアサイン */
    private assignPage(from?: number): void {
        this.clearPage(from);

        const { _items, _pages, _baseHeight, _scroller } = this;
        const basePage = this.getLastPage();
        const nextItemIndex = basePage?.getItemLast()?.index ?? 0;
        const asigneeItems  = _items.slice(nextItemIndex);

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
    private clearPage(from?: number): void {
        this._pages.splice(from ?? 0);
    }

    /** inactive 用 Map の生成 */
    private prepareInactiveMap(): DOM {
        const { _config, _$map, _mapHeight } = this;
        const $parent = _$map.parent();
        let $inactiveMap = $parent.find(`.${_config.INACTIVE_CLASS}`);

        if ($inactiveMap.length <= 0) {
            const currentPageIndex = this.getPageIndex();
            const $listItemViews = _$map.clone().children().filter((_, element: HTMLElement) => {
                const pageIndex = Number($(element).attr(_config.DATA_PAGE_INDEX));
                if (currentPageIndex - 1 <= pageIndex && pageIndex <= currentPageIndex + 1) {
                    return true;
                } else {
                    return false;
                }
            });
            $inactiveMap = $(`<section class="${_config.SCROLL_MAP_CLASS} ${_config.INACTIVE_CLASS}"></section>`)
                .append($listItemViews)
                .height(_mapHeight);
            $parent.append($inactiveMap);
            _$map.css('display', 'none');
        }

        return $inactiveMap;
    }
}
