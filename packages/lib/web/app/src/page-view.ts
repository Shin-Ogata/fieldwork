import { ViewConstructionOptions, View } from '@cdp/view';
import {
    Router,
    Route,
    RouteChangeInfo,
    HistoryDirection,
    Page,
} from '@cdp/router';
import { CssName, hasPartialClassName } from './internal';

/** @internal */ const _properties = Symbol('page-view:properties');

/** @internal */
interface Property {
    readonly router: Router;
    route?: Route;
}

//__________________________________________________________________________________________________//

/**
 * @en Base class definition of [[View]] that can be specified in as [[Page]] of [[Router]].
 * @ja [[Router]] の [[Page]] に指定可能な [[View]] の基底クラス定義
 */
export abstract class PageView<TElement extends Element = HTMLElement, TEvent extends object = object>
    extends View<TElement, TEvent> implements Page {

    /** @internal */
    private readonly [_properties]: Property;

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
    constructor(router: Router, options?: ViewConstructionOptions<TElement>) {
        super(options);
        this[_properties] = { router };
    }

///////////////////////////////////////////////////////////////////////
// accessor: public properties

    /**
     * @en Check the page is active.
     * @ja ページがアクティブであるか判定
     */
    get active(): boolean {
        const { el } = this;
        return el ? hasPartialClassName(el, CssName.PAGE_CURRENT) : false;
    }

    /**
     * @en Route data associated with the page.
     * @ja ページに紐づくルートデータ
     */
    get route(): Route | undefined {
        return this[_properties].route;
    }

///////////////////////////////////////////////////////////////////////
// event handlers: utilized page event

    /* eslint-disable @typescript-eslint/no-unused-vars */

    /**
     * @overridable
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    onPageInit(thisPage: Route): void { /* overridable */ }

    /**
     * @overridable
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    onPageMounted(thisPage: Route): void { /* overridable */ }

    /**
     * @overridable
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    onPageBeforeEnter(thisPage: Route, prevPage: Route | undefined, direction: HistoryDirection, intent?: unknown): void { /* overridable */ }

    /**
     * @overridable
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    onPageAfterEnter(thisPage: Route, prevPage: Route | undefined, direction: HistoryDirection, intent?: unknown): void { /* overridable */ }

    /**
     * @overridable
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    onPageBeforeLeave(thisPage: Route, nextPage: Route, direction: HistoryDirection, intent?: unknown): void { /* overridable */ }

    /**
     * @overridable
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    onPageAfterLeave(thisPage: Route, nextPage: Route, direction: HistoryDirection, intent?: unknown): void { /* overridable */ }

    /**
     * @overridable
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    onPageUnmounted(thisPage: Route): void { /* overridable */ }

    /**
     * @overridable
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    onPageRemoved(thisPage: Route): void { /* overridable */ }

    /* eslint-enable @typescript-eslint/no-unused-vars */

///////////////////////////////////////////////////////////////////////
// implements: Page

    /**
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    pageInit(info: RouteChangeInfo): void {
        const { to } = info;
        this[_properties].route = to;
        this.onPageInit(to);
    }

    /**
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    pageMounted(info: RouteChangeInfo): void {
        const { to } = info;
        this[_properties].route = to;
        const { el } = to;
        if (el !== this.el as unknown) {
            this.setElement(el as unknown as TElement);
        }
        this.onPageMounted(to);
    }

    /**
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    pageBeforeEnter(info: RouteChangeInfo): void {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        this.onPageBeforeEnter(to, from, direction, intent);
    }

    /**
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    pageAfterEnter(info: RouteChangeInfo): void {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        this.onPageAfterEnter(to, from, direction, intent);
    }

    /**
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    pageBeforeLeave(info: RouteChangeInfo): void {
        const { to, from, direction, intent } = info;
        this[_properties].route = from as Route;
        this.onPageBeforeLeave(from as Route, to, direction, intent);
    }

    /**
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    pageAfterLeave(info: RouteChangeInfo): void {
        const { to, from, direction, intent } = info;
        this[_properties].route = from as Route;
        this.onPageAfterLeave(from as Route, to, direction, intent);
    }

    /**
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    pageUnmounted(info: Route): void {
        this.onPageUnmounted(info);
    }

    /**
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    pageRemoved(info: Route): void {
        this.release();
        this.onPageRemoved(info);
        this[_properties].route = undefined;
    }
}
