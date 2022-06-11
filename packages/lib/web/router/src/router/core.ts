import {
    UnknownFunction,
    isFunction,
    camelize,
} from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import {
    RESULT_CODE,
    isResult,
    makeResult,
} from '@cdp/result';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import { waitFrame } from '@cdp/web-utils';
import { window } from '../ssr';
import { normalizeId } from '../history/internal';
import type { IHistory, HistoryState } from '../history';
import type {
    RouteChangeInfo,
    RouterEvent,
    Page,
    RouteParameters,
    Route,
    TransitionSettings,
    RouterConstructionOptions,
    RouteNavigationOptions,
    Router,
} from './interfaces';
import {
    CssName,
    DomCache,
    LinkData,
    PageEvent,
    RouteContextParameters,
    RouteContext,
    toRouteContextParameters,
    toRouteContext,
    prepareHistory,
    buildNavigateUrl,
    parseUrlParams,
    ensureRouterPageInstance,
    ensureRouterPageTemplate,
    processPageTransition,
} from './internal';

//__________________________________________________________________________________________________//

/**
 * @en Router impliment class.
 * @ja Router 実装クラス
 */
class RouterContext extends EventPublisher<RouterEvent> implements Router {
    private readonly _routes: Record<string, RouteContextParameters> = {};
    private readonly _history: IHistory<RouteContext>;
    private readonly _$el: DOM;
    private readonly _raf: UnknownFunction;
    private readonly _historyChangingHandler: typeof RouterContext.prototype.onHistoryChanging;
    private readonly _historyRefreshHandler: typeof RouterContext.prototype.onHistoryRefresh;
    private readonly _errorHandler: typeof RouterContext.prototype.onHandleError;
    private readonly _cssPrefix: string;
    private _transitionSettings: TransitionSettings;
    private _prevRoute?: RouteContext;

    /**
     * constructor
     */
    constructor(selector: string, options: RouterConstructionOptions) {
        super();

        const {
            routes,
            start,
            el,
            window: context,
            history,
            initialPath,
            cssPrefix,
            transition,
        } = options;

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this._raf = context?.requestAnimationFrame || window.requestAnimationFrame;

        this._$el = $(selector, el);
        if (!this._$el.length) {
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector}]`);
        }

        this._history = prepareHistory(history, initialPath, context as Window);
        this._historyChangingHandler = this.onHistoryChanging.bind(this);
        this._historyRefreshHandler  = this.onHistoryRefresh.bind(this);
        this._errorHandler           = this.onHandleError.bind(this);

        this._history.on('changing', this._historyChangingHandler);
        this._history.on('refresh',  this._historyRefreshHandler);
        this._history.on('error',    this._errorHandler);

        // follow anchor
        this._$el.on('click', '[href]', this.onAnchorClicked.bind(this));

        this._cssPrefix = cssPrefix || CssName.DEFAULT_PREFIX;
        this._transitionSettings = Object.assign({ default: 'none' }, transition);

        this.register(routes as RouteParameters[], start);
    }

///////////////////////////////////////////////////////////////////////
// implements: Router

    /** Router's view HTML element */
    get el(): HTMLElement {
        return this._$el[0];
    }

    /** Object with current route data */
    get currentRoute(): Route {
        return this._history.state;
    }

    /** Route registration */
    register(routes: RouteParameters | RouteParameters[], refresh = false): this {
        for (const context of toRouteContextParameters(routes)) {
            this._routes[context.path] = context;
        }
        refresh && void this.go();
        return this;
    }

    /** Navigate to new page. */
    async navigate(to: string, options?: RouteNavigationOptions): Promise<this> {
        try {
            const seed = this.findRouteContextParameter(to);
            if (!seed) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
            }

            const opts  = Object.assign({ transition: this._transitionSettings.default, intent: undefined }, options);
            const url   = buildNavigateUrl(to, opts);
            const route = toRouteContext(url, this, seed, opts);

            // TODO: subflow

            try {
                // exec navigate
                await this._history.push(url, route);
            } catch {
                // noop
            }
        } catch (e) {
            this.onHandleError(e);
        }

        return this;
    }

    /** To move backward through history. */
    back(): Promise<this> {
        return this.go(-1);
    }

    /** To move forward through history. */
    forward(): Promise<this> {
        return this.go(1);
    }

    /** To move a specific point in history. */
    async go(delta?: number): Promise<this> {
        await this._history.go(delta);
        return this;
    }

    /** Set common transition settnigs. */
    setTransitionSettings(newSettings: TransitionSettings): TransitionSettings {
        const oldSettings = this._transitionSettings;
        this._transitionSettings = { ...newSettings };
        return oldSettings;
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    /** @internal common `RouterEventArg` maker */
    private makeRouteChangeInfo(newState: HistoryState<RouteContext>, oldState: HistoryState<RouteContext> | undefined): RouteChangeInfo {
        return {
            router: this,
            from: oldState,
            to: newState,
            direction: this._history.direct(newState['@id']).direction,
        };
    }

    /** @internal find route by url */
    private findRouteContextParameter(url: string): RouteContextParameters | void {
        const key = `/${normalizeId(url.split('?')[0])}`;
        for (const path of Object.keys(this._routes)) {
            const { regexp } = this._routes[path];
            if (regexp.test(key)) {
                return this._routes[path];
            }
        }
    }

    /** @internal trigger page event */
    private triggerPageCallback(event: PageEvent, target: Page | undefined, arg: Route | RouteChangeInfo): void {
        const method = camelize(`page-${event}`);
        isFunction(target?.[method]) && target?.[method](arg);
    }

    /** @internal wait frame */
    private waitFrame(): Promise<void> {
        return waitFrame(1, this._raf);
    }

    /** @internal change page main procedure */
    private async changePage(nextRoute: HistoryState<RouteContext>, prevRoute: HistoryState<RouteContext> | undefined): Promise<void> {
        parseUrlParams(nextRoute);

        const changeInfo = this.makeRouteChangeInfo(nextRoute, prevRoute);

        const [
            pageNext, $elNext,
            pagePrev, $elPrev,
        ] = await this.prepareChangeContext(changeInfo);

        // transition core
        await this.transitionPage(pageNext, $elNext, pagePrev, $elPrev, changeInfo);

        this.updateChangeContext($elNext, $elPrev, prevRoute);

        this.publish('changed', changeInfo);
    }

    /* eslint-disable @typescript-eslint/no-non-null-assertion */

    /** @internal */
    private async prepareChangeContext(changeInfo: RouteChangeInfo): Promise<[Page, DOM, Page, DOM]> {
        const nextRoute = changeInfo.to as HistoryState<RouteContext>;
        const prevRoute = changeInfo.from as HistoryState<RouteContext> | undefined;

        const { '@params': params } = nextRoute;

        // page instance
        await ensureRouterPageInstance(nextRoute);
        // page $template
        await ensureRouterPageTemplate(params);

        // page $el
        if (!nextRoute.el) {
            nextRoute.el = params.$template!.clone()[0];
            this.publish('loaded', changeInfo);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            this.triggerPageCallback('init', nextRoute['@params'].page!, changeInfo);
        }

        const $elNext = $(nextRoute.el);
        const pageNext = nextRoute['@params'].page!;

        // mount
        if (!$elNext.isConnected) {
            $elNext.attr('aria-hidden', true);
            this._$el.append($elNext);
            this.publish('mounted', changeInfo);
            this.triggerPageCallback('mounted', pageNext, changeInfo);
        }

        return [
            pageNext, $elNext,                                      // next
            prevRoute?.['@params'].page || {}, $(prevRoute?.el),    // prev
        ];
    }

    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    /** @internal */
    private async transitionPage(
        pageNext: Page, $elNext: DOM,
        pagePrev: Page, $elPrev: DOM,
        changeInfo: RouteChangeInfo,
    ): Promise<void> {
        const transition = (changeInfo.to as RouteContext).transition || 'none';

        const {
            'enter-from-class': customEnterFromClass,
            'enter-active-class': customEnterActiveClass,
            'enter-to-class': customEnterToClass,
            'leave-from-class': customLeaveFromClass,
            'leave-active-class': customLeaveActiveClass,
            'leave-to-class': customLeaveToClass,
        } = this._transitionSettings;

        // enter-css-class
        const enterFromClass   = customEnterFromClass   || `${transition}${CssName.SUFFIX_ENTER_FROM}`;
        const enterActiveClass = customEnterActiveClass || `${transition}${CssName.SUFFIX_ENTER_ACTIVE}`;
        const enterToClass     = customEnterToClass     || `${transition}${CssName.SUFFIX_ENTER_TO}`;

        // leave-css-class
        const leaveFromClass   = customLeaveFromClass   || `${transition}${CssName.SUFFIX_LEAVE_FROM}`;
        const leaveActiveClass = customLeaveActiveClass || `${transition}${CssName.SUFFIX_LEAVE_ACTIVE}`;
        const leaveToClass     = customLeaveToClass     || `${transition}${CssName.SUFFIX_LEAVE_TO}`;

        this.beginTransition(
            pageNext, $elNext, enterFromClass, enterActiveClass,
            pagePrev, $elPrev, leaveFromClass, leaveActiveClass,
            changeInfo,
        );

        await this.waitFrame();

        // transision execution
        await Promise.all([
            processPageTransition($elNext, enterFromClass, enterActiveClass, enterToClass),
            processPageTransition($elPrev, leaveFromClass, leaveActiveClass, leaveToClass),
        ]);

        await this.waitFrame();

        this.endTransition(
            pageNext, $elNext, enterToClass,
            pagePrev, $elPrev, leaveToClass,
            changeInfo,
        );
    }

    /** @internal transition proc : begin */
    private beginTransition(
        pageNext: Page, $elNext: DOM, enterFromClass: string, enterActiveClass: string,
        pagePrev: Page, $elPrev: DOM, leaveFromClass: string, leaveActiveClass: string,
        changeInfo: RouteChangeInfo,
    ): void {
        this._$el.addClass([
            `${this._cssPrefix}${CssName.TRANSITION_RUNNING}`,
            `${this._cssPrefix}${CssName.TRANSITION_DIRECTION}${changeInfo.direction}`,
        ]);
        $elNext.removeAttr('aria-hidden');
        $elNext.addClass([enterFromClass, enterActiveClass]);
        $elPrev.addClass([leaveFromClass, leaveActiveClass]);

        this.publish('before-transition', changeInfo);
        this.triggerPageCallback('before-enter', pageNext, changeInfo);
        this.triggerPageCallback('before-leave', pagePrev, changeInfo);
    }

    /** @internal transition proc : end */
    private endTransition(
        pageNext: Page, $elNext: DOM, enterToClass: string,
        pagePrev: Page, $elPrev: DOM, leaveToClass: string,
        changeInfo: RouteChangeInfo,
    ): void {
        $elNext.removeClass(enterToClass);
        $elPrev.removeClass(leaveToClass);
        $elPrev.attr('aria-hidden', true);

        this._$el.removeClass([
            `${this._cssPrefix}${CssName.TRANSITION_RUNNING}`,
            `${this._cssPrefix}${CssName.TRANSITION_DIRECTION}${changeInfo.direction}`,
        ]);

        this.publish('after-transition', changeInfo);
        this.triggerPageCallback('after-enter', pageNext, changeInfo);
        this.triggerPageCallback('after-leave', pagePrev, changeInfo);
    }

    /** @internal update page status after transition */
    private updateChangeContext($elNext: DOM, $elPrev: DOM, prevRoute: RouteContext | undefined): void {
        // update class
        $elPrev.removeClass(`${this._cssPrefix}${CssName.PAGE_CURRENT}`);
        $elNext.addClass(`${this._cssPrefix}${CssName.PAGE_CURRENT}`);
        $elPrev.addClass(`${this._cssPrefix}${CssName.PAGE_PREVIOUS}`);

        if (this._prevRoute) {
            const $el = $(this._prevRoute.el);
            $el.removeClass(`${this._cssPrefix}${CssName.PAGE_PREVIOUS}`);
            const cacheLv = $el.data(DomCache.DATA_NAME);
            if (DomCache.CACHE_LEVEL_CONNECT !== cacheLv) {
                $el.detach();
                const page = this._prevRoute['@params'].page;
                this.publish('unmounted', this._prevRoute);
                this.triggerPageCallback('unmounted', page, this._prevRoute);
                if (DomCache.CACHE_LEVEL_MEMORY !== cacheLv) {
                    this._prevRoute.el = null!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    this.publish('unloaded', this._prevRoute);
                    this.triggerPageCallback('removed', page, this._prevRoute);
                }
            }
        }
        this._prevRoute = prevRoute;
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    /** @internal `history` `changing` handler */
    private onHistoryChanging(nextState: HistoryState<RouteContext>, cancel: (reason?: unknown) => void): boolean {
        let handled = false;
        const callback = (reason?: unknown): void => {
            handled = true;
            cancel(reason);
        };

        this.publish('will-change', this.makeRouteChangeInfo(nextState, undefined), callback);

        return handled;
    }

    /** @internal `history` `refresh` handler */
    private onHistoryRefresh(newState: HistoryState<Partial<RouteContext>>, oldState: HistoryState<RouteContext> | undefined, promises: Promise<unknown>[]): void {
        const ensure = (state: HistoryState<Partial<RouteContext>>): HistoryState<RouteContext> => {
            const url  = `/${state['@id']}`;
            const params = this.findRouteContextParameter(url);
            if (null == params) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, state);
            }
            if (null == state['@params']) {
                // RouteContextParameter を assign
                Object.assign(state, toRouteContext(url, this, params));
            }
            return state as HistoryState<RouteContext>;
        };

        try {
            // scheduling `refresh` done.
            promises.push(this.changePage(ensure(newState), oldState));
        } catch (e) {
            this.onHandleError(e);
        }
    }

    /** @internal error handler */
    private onHandleError(error: unknown): void {
        this.publish(
            'error',
            isResult(error) ? error : makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, 'Route navigate failed.', error)
        );
        console.error(error);
    }

    /** @internal anchor click handler */
    private onAnchorClicked(event: MouseEvent): void {
        const $target = $(event.target as Element).closest('[href]');
        if ($target.data(LinkData.PREVENT_ROUTER)) {
            return;
        }

        event.preventDefault();

        const url        = $target.attr('href');
        const transition = $target.data(LinkData.TRANSITION) as string;

        if ('#' === url) {
            void this.back();
        } else {
            void this.navigate(url as string, { transition });
        }
    }
}

//__________________________________________________________________________________________________//

/**
 * @en Create [[Router]] object.
 * @ja [[Router]] オブジェクトを構築
 *
 * @param selector
 *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
 *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
 * @param options
 *  - `en` [[RouterConstructionOptions]] object
 *  - `ja` [[RouterConstructionOptions]] オブジェクト
 */
export function createRouter(selector: string, options?: RouterConstructionOptions): Router {
    return new RouterContext(selector, Object.assign({
        start: true,
    }, options));
}
