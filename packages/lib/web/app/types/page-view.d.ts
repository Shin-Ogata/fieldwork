import { ViewConstructionOptions, View } from '@cdp/view';
import { Router, Route, RouteChangeInfo, HistoryDirection, Page } from '@cdp/router';
/**
 * @en Base class definition of [[View]] that can be specified in as [[Page]] of [[Router]].
 * @ja [[Router]] の [[Page]] に指定可能な [[View]] の基底クラス定義
 */
export declare abstract class PageView<TElement extends Element = HTMLElement, TEvent extends object = object> extends View<TElement, TEvent> implements Page {
    /**
     * constructor
     *
     * @param router
     *  - `en` router instance
     *  - `ja` ルーターインスタンス
     * @param options
     *  - `en` [[View]] construction options.
     *  - `ja` [[View]] 構築オプション
     */
    constructor(router: Router, options?: ViewConstructionOptions<TElement>);
    /**
     * @en Check the page is active.
     * @ja ページがアクティブであるか判定
     */
    get active(): boolean;
    /**
     * @en Route data associated with the page.
     * @ja ページに紐づくルートデータ
     */
    get route(): Route | undefined;
    /**
     * @overridable
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    onPageInit(thisPage: Route): void;
    /**
     * @overridable
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    onPageMounted(thisPage: Route): void;
    /**
     * @overridable
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    onPageBeforeEnter(thisPage: Route, prevPage: Route | undefined, direction: HistoryDirection, intent?: unknown): void;
    /**
     * @overridable
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    onPageAfterEnter(thisPage: Route, prevPage: Route | undefined, direction: HistoryDirection, intent?: unknown): void;
    /**
     * @overridable
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    onPageBeforeLeave(thisPage: Route, nextPage: Route, direction: HistoryDirection, intent?: unknown): void;
    /**
     * @overridable
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    onPageAfterLeave(thisPage: Route, nextPage: Route, direction: HistoryDirection, intent?: unknown): void;
    /**
     * @overridable
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    onPageUnmounted(thisPage: Route): void;
    /**
     * @overridable
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    onPageRemoved(thisPage: Route): void;
    /**
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    pageInit(info: RouteChangeInfo): void;
    /**
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    pageMounted(info: RouteChangeInfo): void;
    /**
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    pageBeforeEnter(info: RouteChangeInfo): void;
    /**
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    pageAfterEnter(info: RouteChangeInfo): void;
    /**
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    pageBeforeLeave(info: RouteChangeInfo): void;
    /**
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    pageAfterLeave(info: RouteChangeInfo): void;
    /**
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    pageUnmounted(info: Route): void;
    /**
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    pageRemoved(info: Route): void;
}
