import {
    UnknownFunction,
    isArray,
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
    DOMSelector,
} from '@cdp/dom';
import { waitFrame } from '@cdp/web-utils';
import { window } from '../ssr';
import { normalizeId } from '../history/internal';
import type { IHistory, HistoryState } from '../history';
import {
    PageTransitionParams,
    RouterEvent,
    Page,
    RouteParameters,
    Route,
    TransitionSettings,
    PageStack,
    RouterConstructionOptions,
    RouteSubFlowParams,
    RouteNavigationOptions,
    RouterRefreshLevel,
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
    decideTransitionDirection,
    processPageTransition,
} from './internal';
import { RouteAyncProcessContext, RouteChangeInfoContext } from './async-process';

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
    private _lastRoute?: RouteContext;
    private _prevRoute?: RouteContext;
    private _tempTransitionParams?: PageTransitionParams;

    /**
     * constructor
     */
    constructor(selector: DOMSelector<string | HTMLElement>, options: RouterConstructionOptions) {
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
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector as string}]`);
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
        this._transitionSettings = Object.assign({ default: 'none', reload: 'none' }, transition);

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

    /** Check state is in sub-flow */
    get isInSubFlow(): boolean {
        return !!this.findSubFlowParams(false);
    }

    /** Check it can go back in history */
    get canBack(): boolean {
        return this._history.canBack;
    }

    /** Check it can go forward in history */
    get canForward(): boolean {
        return this._history.canForward;
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

            const opts  = Object.assign({ intent: undefined }, options);
            const url   = buildNavigateUrl(to, opts);
            const route = toRouteContext(url, this, seed, opts);

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

    /** Add page stack starting from the current history. */
    async pushPageStack(stack: PageStack | PageStack[], noNavigate?: boolean): Promise<this> {
        try {
            const stacks = isArray(stack) ? stack : [stack];
            const routes = stacks.filter(s => !!s.route).map(s => s.route as RouteParameters);

            // ensrue Route
            this.register(routes, false);

            await this.suppressEventListenerScope(async () => {
                // push history
                for (const page of stacks) {
                    const { url, transition, reverse } = page;
                    const params = this.findRouteContextParameter(url);
                    if (null == params) {
                        throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, page);
                    }
                    // silent registry
                    const route = toRouteContext(url, this, params, { intent: undefined });
                    route.transition = transition;
                    route.reverse    = reverse;
                    void this._history.push(url, route, { silent: true });
                }

                await this.waitFrame();

                if (noNavigate) {
                    await this._history.go(-1 * stacks.length);
                }
            });

            if (!noNavigate) {
                await this.go();
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

    /** To move a specific point in history by stack ID. */
    async traverseTo(id: string): Promise<this> {
        await this._history.traverseTo(id);
        return this;
    }

    /** Begin sub-flow transaction. */
    async beginSubFlow(to: string, subflow?: RouteSubFlowParams, options?: RouteNavigationOptions): Promise<this> {
        try {
            const params = Object.assign({}, subflow || {});
            this.evaluationSubFlowParams(params);
            (this.currentRoute as RouteContext).subflow = params;
            await this.navigate(to, options);
        } catch (e) {
            this.onHandleError(e);
        }
        return this;
    }

    /** Commit sub-flow transaction. */
    async commitSubFlow(params?: PageTransitionParams): Promise<this> {
        const subflow = this.findSubFlowParams(true);
        if (!subflow) {
            return this;
        }

        // `reverse`: 履歴上は `back` 方向になるため, I/F 指定方向と反転するように調整
        this._tempTransitionParams = Object.assign({}, params, { reverse: !params?.reverse });
        const { additionalDistance, additinalStacks } = subflow.params;
        const distance = subflow.distance + additionalDistance;

        if (additinalStacks?.length) {
            await this.suppressEventListenerScope(() => this.go(-1 * distance));
            await this.pushPageStack(additinalStacks);
        } else {
            await this.go(-1 * distance);
        }
        this._history.clearForward();

        return this;
    }

    /** Cancel sub-flow transaction. */
    async cancelSubFlow(params?: PageTransitionParams): Promise<this> {
        const subflow = this.findSubFlowParams(true);
        if (!subflow) {
            return this;
        }

        // `reverse`: 履歴上は `back` 方向になるため, I/F 指定方向と反転するように調整. default: true
        this._tempTransitionParams = Object.assign({}, params, { reverse: !Object.assign({ reverse: true }, params).reverse });
        await this.go(-1 * subflow.distance);
        this._history.clearForward();

        return this;
    }

    /** Set common transition settnigs. */
    setTransitionSettings(newSettings: TransitionSettings): TransitionSettings {
        const oldSettings = this._transitionSettings;
        this._transitionSettings = { ...newSettings };
        return oldSettings;
    }

    /** Refresh router (specify update level). */
    async refresh(level = RouterRefreshLevel.RELOAD): Promise<this> {
        switch (level) {
            case RouterRefreshLevel.RELOAD:
                return this.go();
            case RouterRefreshLevel.DOM_CLEAR: {
                for (const route of this._history.stack) {
                    const $el = $(route.el);
                    const page = route['@params'].page;
                    if ($el.isConnected) {
                        $el.detach();
                        this.publish('unmounted', route);
                        this.triggerPageCallback('unmounted', page, route);
                    }
                    if (route.el) {
                        route.el = null!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        this.publish('unloaded', route);
                        this.triggerPageCallback('removed', page, route);
                    }
                }
                this._prevRoute && (this._prevRoute.el = null!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                return this.go();
            }
            default:
                console.warn(`unsupported level: ${level}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
                return this;
        }
    }

///////////////////////////////////////////////////////////////////////
// private methods: sub-flow

    /** @internal evaluation sub-flow parameters */
    private evaluationSubFlowParams(subflow: RouteSubFlowParams): void {
        let additionalDistance = 0;

        if (subflow.base) {
            const baseId = normalizeId(subflow.base);
            let found = false;
            const { index, stack } = this._history;
            for (let i = index; i >= 0; i--, additionalDistance++) {
                if (stack[i]['@id'] === baseId) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_INVALID_SUBFLOW_BASE_URL, `Invalid sub-flow base url. [url: ${subflow.base}]`);
            }
        } else {
            subflow.base = this.currentRoute.url;
        }

        Object.assign(subflow, { additionalDistance });
    }

    /** @internal find sub-flow parameters */
    private findSubFlowParams(detach: boolean): { distance: number; params: RouteSubFlowParams & { additionalDistance: number; }; } | void {
        const stack = this._history.stack;
        for (let i = stack.length - 1, distance = 0; i >= 0; i--, distance++) {
            if (stack[i].subflow) {
                const params = stack[i].subflow as RouteSubFlowParams & { additionalDistance: number; };
                detach && delete stack[i].subflow;
                return { distance, params };
            }
        }
    }

///////////////////////////////////////////////////////////////////////
// private methods: transition

    /** @internal common `RouterEventArg` maker */
    private makeRouteChangeInfo(newState: HistoryState<RouteContext>, oldState: HistoryState<RouteContext> | undefined): RouteChangeInfoContext {
        const intent = newState.intent;
        delete newState.intent; // navigate 時に指定された intent は one time のみ有効にする

        const from = oldState || this._lastRoute;
        const direction = this._history.direct(newState['@id'], from?.['@id']).direction;
        const asyncProcess = new RouteAyncProcessContext();
        const reload = newState.url === from?.url;
        const { transition, reverse }
            = this._tempTransitionParams || reload
                ? { transition: this._transitionSettings.reload, reverse: false }
                : ('back' !== direction ? newState : from as RouteContext);

        return {
            router: this,
            from,
            to: newState,
            direction,
            asyncProcess,
            reload,
            transition,
            reverse,
            intent,
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
    private triggerPageCallback(event: PageEvent, target: Page | undefined, arg: Route | RouteChangeInfoContext): void {
        const method = camelize(`page-${event}`);
        if (isFunction(target?.[method])) {
            const retval = target?.[method](arg);
            if (retval instanceof Promise && arg['asyncProcess']) {
                (arg as RouteChangeInfoContext).asyncProcess.register(retval);
            }
        }
    }

    /** @internal wait frame */
    private waitFrame(): Promise<void> {
        return waitFrame(1, this._raf);
    }

    /** @internal change page main procedure */
    private async changePage(nextRoute: HistoryState<RouteContext>, prevRoute: HistoryState<RouteContext> | undefined): Promise<void> {
        parseUrlParams(nextRoute);

        const changeInfo = this.makeRouteChangeInfo(nextRoute, prevRoute);
        this._tempTransitionParams = undefined;

        const [
            pageNext, $elNext,
            pagePrev, $elPrev,
        ] = await this.prepareChangeContext(changeInfo);

        // transition core
        await this.transitionPage(pageNext, $elNext, pagePrev, $elPrev, changeInfo);

        this.updateChangeContext(
            $elNext, $elPrev,
            changeInfo.from as RouteContext,
            !changeInfo.reload,
        );

        this.publish('changed', changeInfo);
    }

    /* eslint-disable @typescript-eslint/no-non-null-assertion */

    /** @internal */
    private async prepareChangeContext(changeInfo: RouteChangeInfoContext): Promise<[Page, DOM, Page, DOM]> {
        const nextRoute = changeInfo.to as HistoryState<RouteContext>;
        const prevRoute = changeInfo.from as HistoryState<RouteContext> | undefined;

        const { '@params': params } = nextRoute;

        // page instance
        await ensureRouterPageInstance(nextRoute);
        // page $template
        await ensureRouterPageTemplate(params);

        // page $el
        if (!nextRoute.el) {
            if (params.$template?.isConnected) {
                nextRoute.el     = params.$template[0];
                params.$template = params.$template.clone();
            } else {
                nextRoute.el = params.$template!.clone()[0];
            }
            this.publish('loaded', changeInfo);
            await changeInfo.asyncProcess.complete();
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            this.triggerPageCallback('init', nextRoute['@params'].page!, changeInfo);
            await changeInfo.asyncProcess.complete();
        }

        const $elNext = $(nextRoute.el);
        const pageNext = nextRoute['@params'].page!;

        // mount
        if (!$elNext.isConnected) {
            $elNext.attr('aria-hidden', true);
            this._$el.append($elNext);
            this.publish('mounted', changeInfo);
            this.triggerPageCallback('mounted', pageNext, changeInfo);
            await changeInfo.asyncProcess.complete();
        }

        return [
            pageNext, $elNext,                                      // next
            prevRoute?.['@params']?.page || {}, $(prevRoute?.el),   // prev
        ];
    }

    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    /** @internal */
    private async transitionPage(
        pageNext: Page, $elNext: DOM,
        pagePrev: Page, $elPrev: DOM,
        changeInfo: RouteChangeInfoContext,
    ): Promise<void> {
        const transition = changeInfo.transition || this._transitionSettings.default;

        const {
            'enter-from-class': customEnterFromClass,
            'enter-active-class': customEnterActiveClass,
            'enter-to-class': customEnterToClass,
            'leave-from-class': customLeaveFromClass,
            'leave-active-class': customLeaveActiveClass,
            'leave-to-class': customLeaveToClass,
        } = this._transitionSettings;

        // enter-css-class
        const enterFromClass   = customEnterFromClass   || `${transition}-${CssName.ENTER_FROM_CLASS}`;
        const enterActiveClass = customEnterActiveClass || `${transition}-${CssName.ENTER_ACTIVE_CLASS}`;
        const enterToClass     = customEnterToClass     || `${transition}-${CssName.ENTER_TO_CLASS}`;

        // leave-css-class
        const leaveFromClass   = customLeaveFromClass   || `${transition}-${CssName.LEAVE_FROM_CLASS}`;
        const leaveActiveClass = customLeaveActiveClass || `${transition}-${CssName.LEAVE_ACTIVE_CLASS}`;
        const leaveToClass     = customLeaveToClass     || `${transition}-${CssName.LEAVE_TO_CLASS}`;

        await this.beginTransition(
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

        await this.endTransition(
            pageNext, $elNext, enterToClass,
            pagePrev, $elPrev, leaveToClass,
            changeInfo,
        );
    }

    /** @internal transition proc : begin */
    private async beginTransition(
        pageNext: Page, $elNext: DOM, enterFromClass: string, enterActiveClass: string,
        pagePrev: Page, $elPrev: DOM, leaveFromClass: string, leaveActiveClass: string,
        changeInfo: RouteChangeInfoContext,
    ): Promise<void> {
        this._$el.addClass([
            `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`,
            `${this._cssPrefix}-${CssName.TRANSITION_DIRECTION}-${decideTransitionDirection(changeInfo)}`,
        ]);
        $elNext.removeAttr('aria-hidden');
        $elNext.addClass([enterFromClass, enterActiveClass, `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`]);
        $elPrev.addClass([leaveFromClass, leaveActiveClass, `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`]);

        this.publish('before-transition', changeInfo);
        this.triggerPageCallback('before-enter', pageNext, changeInfo);
        !changeInfo.reload && this.triggerPageCallback('before-leave', pagePrev, changeInfo);
        await changeInfo.asyncProcess.complete();
    }

    /** @internal transition proc : end */
    private async endTransition(
        pageNext: Page, $elNext: DOM, enterToClass: string,
        pagePrev: Page, $elPrev: DOM, leaveToClass: string,
        changeInfo: RouteChangeInfoContext,
    ): Promise<void> {
        $elNext.removeClass([enterToClass, `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`]);
        $elPrev.removeClass([leaveToClass, `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`]);
        ($elNext[0] !== $elPrev[0]) && $elPrev.attr('aria-hidden', true);

        this._$el.removeClass([
            `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`,
            `${this._cssPrefix}-${CssName.TRANSITION_DIRECTION}-${changeInfo.direction}`,
        ]);

        this.publish('after-transition', changeInfo);
        this.triggerPageCallback('after-enter', pageNext, changeInfo);
        !changeInfo.reload && this.triggerPageCallback('after-leave', pagePrev, changeInfo);
        await changeInfo.asyncProcess.complete();
    }

    /** @internal update page status after transition */
    private updateChangeContext($elNext: DOM, $elPrev: DOM, prevRoute: RouteContext | undefined, urlChanged: boolean): void {
        if ($elNext[0] !== $elPrev[0]) {
            // update class
            $elPrev.removeClass(`${this._cssPrefix}-${CssName.PAGE_CURRENT}`);
            $elNext.addClass(`${this._cssPrefix}-${CssName.PAGE_CURRENT}`);
            $elPrev.addClass(`${this._cssPrefix}-${CssName.PAGE_PREVIOUS}`);

            if (this._prevRoute) {
                const $el = $(this._prevRoute.el);
                $el.removeClass(`${this._cssPrefix}-${CssName.PAGE_PREVIOUS}`);
                if (this._prevRoute.el !== this.currentRoute.el) {
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
            }
        }

        if (urlChanged) {
            this._prevRoute = prevRoute;
        }

        this._lastRoute = this.currentRoute as RouteContext;
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    /** @internal `history` `changing` handler */
    private onHistoryChanging(nextState: HistoryState<RouteContext>, cancel: (reason?: unknown) => void, promises: Promise<unknown>[]): void {
        const changeInfo = this.makeRouteChangeInfo(nextState, undefined);
        this.publish('will-change', changeInfo, cancel);
        promises.push(...changeInfo.asyncProcess.promises);
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
            if (!state.el) {
                // id に紐づく要素がすでに存在する場合は割り当て
                state.el = this._history.direct(state['@id'])?.state?.el;
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

    /** @internal silent event listner scope */
    private async suppressEventListenerScope(executor: () => Promise<unknown>): Promise<unknown> {
        try {
            this._history.off('changing', this._historyChangingHandler);
            this._history.off('refresh',  this._historyRefreshHandler);
            this._history.off('error',    this._errorHandler);
            return await executor();
        } finally {
            this._history.on('changing', this._historyChangingHandler);
            this._history.on('refresh',  this._historyRefreshHandler);
            this._history.on('error',    this._errorHandler);
        }
    }
}

//__________________________________________________________________________________________________//

/**
 * @en Create [[Router]] object.
 * @ja [[Router]] オブジェクトを構築
 *
 * @param selector
 *  - `en` An object or the selector string which becomes origin of [[DOM]].
 *  - `ja` [[DOM]] のもとになるインスタンスまたはセレクタ文字列
 * @param options
 *  - `en` [[RouterConstructionOptions]] object
 *  - `ja` [[RouterConstructionOptions]] オブジェクト
 */
export function createRouter(selector: DOMSelector<string | HTMLElement>, options?: RouterConstructionOptions): Router {
    return new RouterContext(selector, Object.assign({
        start: true,
    }, options));
}
