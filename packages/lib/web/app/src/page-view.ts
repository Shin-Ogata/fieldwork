import { type ViewConstructionOptions, View } from '@cdp/view';
import type {
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
    route?: Route;
}

//__________________________________________________________________________________________________//

/**
 * @en Base class definition of {@link View} that can be specified in as {@link Page} of {@link Router}.
 * @ja {@link Router} の {@link Page} に指定可能な {@link View} の基底クラス定義
 */
export abstract class PageView<TElement extends Element = HTMLElement, TEvent extends object = object>
    extends View<TElement, TEvent> implements Page {

    /** @internal */
    private readonly [_properties]: Property;

    /**
     * constructor
     *
     * @param route
     *  - `en` route context
     *  - `ja` ルートコンテキスト
     * @param options
     *  - `en` {@link View} construction options.
     *  - `ja` {@link View} 構築オプション
     */
    constructor(route?: Route, options?: ViewConstructionOptions<TElement>) {
        super(options);
        this[_properties] = { route };
    }

///////////////////////////////////////////////////////////////////////
// accessor: properties

    /**
     * @en Check the page is active.
     * @ja ページがアクティブであるか判定
     */
    get active(): boolean {
        return hasPartialClassName(this.el, CssName.PAGE_CURRENT);
    }

    /**
     * @en Route data associated with the page (public).
     * @ja ページに紐づくルートデータ (公開用)
     */
    get ['@route'](): Route | undefined {
        return this[_properties].route;
    }

    /**
     * @en {@link Router} instance
     * @ja {@link Router} インスタンス
     */
    protected get _route(): Route | undefined {
        return this['@route'];
    }

    /**
     * @en {@link Router} instance
     * @ja {@link Router} インスタンス
     */
    protected get _router(): Router | undefined {
        return this[_properties].route?.router;
    }

///////////////////////////////////////////////////////////////////////
// implements: View

    /** @override */
    render(...args: unknown[]): any { /* overridable */ } // eslint-disable-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any

///////////////////////////////////////////////////////////////////////
// event handlers: utilized page event

    /* eslint-disable @typescript-eslint/no-unused-vars */

    /**
     * @override
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    protected onPageInit(thisPage: Route): void | Promise<void> { /* overridable */ }

    /**
     * @override
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    protected onPageMounted(thisPage: Route): void | Promise<void> { /* overridable */ }

    /**
     * @override
     * @en Triggered immediately after the page's HTMLElement is cloned and inserted into the DOM.
     * @ja ページの HTMLElement が複製され DOM に挿入された直後に発火
     */
    protected onPageCloned(thisPage: Route, prevPage: Route): void | Promise<void> { /* overridable */ }

    /**
     * @override
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    protected onPageBeforeEnter(thisPage: Route, prevPage: Route | undefined, direction: HistoryDirection, intent?: unknown): void | Promise<void> { /* overridable */ }

    /**
     * @override
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    protected onPageAfterEnter(thisPage: Route, prevPage: Route | undefined, direction: HistoryDirection, intent?: unknown): void | Promise<void> { /* overridable */ }

    /**
     * @override
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    protected onPageBeforeLeave(thisPage: Route, nextPage: Route, direction: HistoryDirection, intent?: unknown): void | Promise<void> { /* overridable */ }

    /**
     * @override
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    protected onPageAfterLeave(thisPage: Route, nextPage: Route, direction: HistoryDirection, intent?: unknown): void | Promise<void> { /* overridable */ }

    /**
     * @override
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    protected onPageUnmounted(thisPage: Route): void { /* overridable */ }

    /**
     * @override
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    protected onPageRemoved(thisPage: Route): void { /* overridable */ }

    /* eslint-enable @typescript-eslint/no-unused-vars */

///////////////////////////////////////////////////////////////////////
// implements: Page

    /**
     * @internal
     * @en Triggered when the page's HTMLElement is newly constructed by router.
     * @ja ページの HTMLElement がルーターによって新規に構築されたときに発火
     */
    pageInit(info: RouteChangeInfo): void | Promise<void> {
        const { to } = info;
        this[_properties].route = to;
        const { el } = to;
        if (el !== this.el as unknown) {
            this.setElement(el as unknown as TElement);
        }
        return this.onPageInit(to);
    }

    /**
     * @internal
     * @en Triggered immediately after the page's HTMLElement is inserted into the DOM.
     * @ja ページの HTMLElement が DOM に挿入された直後に発火
     */
    pageMounted(info: RouteChangeInfo): void | Promise<void> {
        const { to } = info;
        this[_properties].route = to;
        return this.onPageMounted(to);
    }

    /**
     * @internal
     * @en Triggered immediately after the page's HTMLElement is cloned and inserted into the DOM.
     * @ja ページの HTMLElement が複製され DOM に挿入された直後に発火
     */
    pageCloned(info: RouteChangeInfo): void | Promise<void> {
        const { to, from } = info;
        this[_properties].route = to;
        return this.onPageCloned(to, from!);
    }

    /**
     * @internal
     * @en Triggered when the page is ready to be activated after initialization.
     * @ja 初期化後, ページがアクティベート可能な状態になると発火
     */
    pageBeforeEnter(info: RouteChangeInfo): void | Promise<void> {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        return this.onPageBeforeEnter(to, from, direction, intent);
    }

    /**
     * @internal
     * @en Triggered when the page is fully displayed.
     * @ja ページが完全に表示されると発火
     */
    pageAfterEnter(info: RouteChangeInfo): void | Promise<void> {
        const { to, from, direction, intent } = info;
        this[_properties].route = to;
        return this.onPageAfterEnter(to, from, direction, intent);
    }

    /**
     * @internal
     * @en Triggered just before the page goes hidden.
     * @ja ページが非表示に移行する直前に発火
     */
    pageBeforeLeave(info: RouteChangeInfo): void | Promise<void> {
        const { to, from, direction, intent } = info;
        this[_properties].route = from!;
        return this.onPageBeforeLeave(from!, to, direction, intent);
    }

    /**
     * @internal
     * @en Triggered immediately after the page is hidden.
     * @ja ページが非表示になった直後に発火
     */
    pageAfterLeave(info: RouteChangeInfo): void | Promise<void> {
        const { to, from, direction, intent } = info;
        this[_properties].route = from!;
        return this.onPageAfterLeave(from!, to, direction, intent);
    }

    /**
     * @internal
     * @en Triggered immediately after the page's HTMLElement is detached from the DOM.
     * @ja ページの HTMLElement が DOM から切り離された直後に発火
     */
    pageUnmounted(info: Route): void {
        this.onPageUnmounted(info);
    }

    /**
     * @internal
     * @en Triggered when the page's HTMLElement is destroyed by the router.
     * @ja ページの HTMLElement がルーターによって破棄されたときに発火
     */
    pageRemoved(info: Route): void {
        this.release();
        this[_properties].route = undefined;
        this.onPageRemoved(info);
    }
}
