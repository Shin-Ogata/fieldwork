import {
    UnknownFunction,
    isArray,
    isFunction,
    camelize,
} from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import { NativePromise } from '@cdp/promise';
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
    NavigationSettings,
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
    RouteSubFlowParamsContext,
    RouteContext,
    RouteChangeInfoContext,
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
import { RouteAyncProcessContext } from './async-process';

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
    private _navigationSettings: Required<NavigationSettings>;
    private _lastRoute?: RouteContext;
    private _prevRoute?: RouteContext;
    private _subflowTransitionParams?: PageTransitionParams;
    private _inChangingPage = false;

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
            navigation,
        } = options;

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this._raf = context?.requestAnimationFrame ?? window.requestAnimationFrame;

        this._$el = $(selector, el);
        if (!this._$el.length) {
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector as string}]`);
        }

        this._history = prepareHistory(history, initialPath, context!);
        this._historyChangingHandler = this.onHistoryChanging.bind(this);
        this._historyRefreshHandler  = this.onHistoryRefresh.bind(this);
        this._errorHandler           = this.onHandleError.bind(this);

        this._history.on('changing', this._historyChangingHandler);
        this._history.on('refresh',  this._historyRefreshHandler);
        this._history.on('error',    this._errorHandler);

        // follow anchor
        this._$el.on('click', '[href]', this.onAnchorClicked.bind(this));

        this._cssPrefix = cssPrefix ?? CssName.DEFAULT_PREFIX;
        this._transitionSettings = Object.assign({ default: 'none', reload: 'none' }, transition);
        this._navigationSettings = Object.assign({ method: 'push' }, navigation);

        void this.register(routes!, start);
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
    async register(routes: RouteParameters | RouteParameters[], refresh = false): Promise<this> {
        const prefetchParams: RouteContextParameters[] = [];
        for (const context of toRouteContextParameters(routes)) {
            this._routes[context.path] = context;
            const { content, prefetch } = context;
            content && prefetch && prefetchParams.push(context);
        }

        prefetchParams.length && await this.setPrefetchContents(prefetchParams);
        refresh && await this.go();

        return this;
    }

    /** Navigate to new page. */
    async navigate(to: string, options?: RouteNavigationOptions): Promise<this> {
        try {
            const seed = this.findRouteContextParams(to);
            if (!seed) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
            }

            const opts   = Object.assign({ intent: undefined }, options);
            const url    = buildNavigateUrl(to, opts);
            const route  = toRouteContext(url, this, seed, opts);
            const method = opts.method ?? this._navigationSettings.method;

            try {
                // exec navigate
                await this._history[method](url, route);
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
            const routes = stacks.filter(s => !!s.route).map(s => s.route!);

            // ensrue Route
            await this.register(routes, false);

            await this.suppressEventListenerScope(async () => {
                // push history
                for (const page of stacks) {
                    const { url, transition, reverse } = page;
                    const params = this.findRouteContextParams(url);
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
            const { transition, reverse } = options ?? {};
            const params = Object.assign(
                {
                    transition: this._transitionSettings.default!,
                    reverse: false,
                    origin: this.currentRoute.url,
                },
                subflow,
                {
                    transition,
                    reverse,
                }
            );
            this.evaluateSubFlowParams(params);
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

        const { transition, reverse } = subflow.params;

        this._subflowTransitionParams = Object.assign({ transition, reverse }, params);
        const { additionalDistance, additinalStacks } = subflow.params;
        const distance = subflow.distance + additionalDistance;

        if (additinalStacks?.length) {
            await this.suppressEventListenerScope(() => this.go(-1 * distance));
            await this.pushPageStack(additinalStacks);
        } else {
            await this.go(-1 * distance);
        }
        await this._history.clearForward();

        return this;
    }

    /** Cancel sub-flow transaction. */
    async cancelSubFlow(params?: PageTransitionParams): Promise<this> {
        const subflow = this.findSubFlowParams(true);
        if (!subflow) {
            return this;
        }

        const { transition, reverse } = subflow.params;

        this._subflowTransitionParams = Object.assign({ transition, reverse }, params);
        await this.go(-1 * subflow.distance);
        await this._history.clearForward();

        return this;
    }

    /** Set common transition settnigs. */
    transitionSettings(newSettings?: TransitionSettings): TransitionSettings {
        const oldSettings = { ...this._transitionSettings };
        newSettings && Object.assign(this._transitionSettings, newSettings);
        return oldSettings;
    }

    /** Set common navigation settnigs. */
    navigationSettings(newSettings?: NavigationSettings): NavigationSettings {
        const oldSettings = { ...this._navigationSettings };
        newSettings && Object.assign(this._navigationSettings, newSettings);
        return oldSettings;
    }

    /** Refresh router (specify update level). */
    async refresh(level = RouterRefreshLevel.RELOAD): Promise<this> {
        switch (level) {
            case RouterRefreshLevel.RELOAD:
                return this.go();
            case RouterRefreshLevel.DOM_CLEAR: {
                this.releaseCacheContents(undefined);
                this._prevRoute && (this._prevRoute.el = null!);
                return this.go();
            }
            default:
                console.warn(`unsupported level: ${level}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
                return this;
        }
    }

///////////////////////////////////////////////////////////////////////
// private methods: sub-flow

    /** @internal evaluate sub-flow parameters */
    private evaluateSubFlowParams(subflow: RouteSubFlowParams): void {
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
    private findSubFlowParams(detach: boolean): { distance: number; params: RouteSubFlowParamsContext & { additionalDistance: number; }; } | void {
        const stack = this._history.stack;
        for (let i = stack.length - 1, distance = 0; i >= 0; i--, distance++) {
            if (stack[i].subflow) {
                const params = stack[i].subflow as RouteSubFlowParamsContext & { additionalDistance: number; };
                detach && delete stack[i].subflow;
                return { distance, params };
            }
        }
    }

///////////////////////////////////////////////////////////////////////
// private methods: transition utils

    /** @internal common `RouterEventArg` maker */
    private makeRouteChangeInfo(newState: HistoryState<RouteContext>, oldState: HistoryState<RouteContext> | undefined): RouteChangeInfoContext {
        const intent = newState.intent;
        delete newState.intent; // navigate 時に指定された intent は one time のみ有効にする

        const from = (oldState ?? this._lastRoute) as RouteContext & Record<string, string> | undefined;
        const direction = this._history.direct(newState['@id'], from?.['@id']).direction;
        const asyncProcess = new RouteAyncProcessContext();
        const reload = newState.url === from?.url;
        const { transition, reverse }
            = this._subflowTransitionParams ?? (reload
                ? { transition: this._transitionSettings.reload, reverse: false }
                : ('back' !== direction ? newState : from as RouteContext));

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
    private findRouteContextParams(url: string): RouteContextParameters | void {
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
        if (isFunction((target as Page & Record<string, UnknownFunction> | undefined)?.[method])) {
            const retval = (target as Page & Record<string, UnknownFunction> | undefined)?.[method](arg);
            if (retval instanceof NativePromise && (arg as Route & Record<string, unknown>)['asyncProcess']) {
                (arg as RouteChangeInfoContext).asyncProcess.register(retval);
            }
        }
    }

    /** @internal wait frame */
    private waitFrame(): Promise<void> {
        return waitFrame(1, this._raf);
    }

///////////////////////////////////////////////////////////////////////
// private methods: transition entrance

    /** @internal change page main procedure */
    private async changePage(nextRoute: HistoryState<RouteContext>, prevRoute: HistoryState<RouteContext> | undefined): Promise<void> {
        try {
            this._inChangingPage = true;

            parseUrlParams(nextRoute);

            const changeInfo = this.makeRouteChangeInfo(nextRoute, prevRoute);
            this._subflowTransitionParams = undefined;

            const [
                pageNext, $elNext,
                pagePrev, $elPrev,
            ] = await this.prepareChangeContext(changeInfo);

            // transition core
            const transition = await this.transitionPage(pageNext, $elNext, pagePrev, $elPrev, changeInfo);

            this.updateChangeContext($elNext, $elPrev, changeInfo, transition);

            // 遷移先が subflow 開始点である場合, subflow 解除
            if (nextRoute.url === this.findSubFlowParams(false)?.params.origin) {
                this.findSubFlowParams(true);
                await this._history.clearForward();
            }

            // prefetch content のケア
            await this.treatPrefetchContents();

            this.publish('changed', changeInfo);
        } finally {
            this._inChangingPage = false;
        }
    }

///////////////////////////////////////////////////////////////////////
// private methods: transition prepare

    /** @internal */
    private async prepareChangeContext(changeInfo: RouteChangeInfoContext): Promise<[Page, DOM, Page, DOM]> {
        const nextRoute = changeInfo.to as HistoryState<RouteContext>;
        const prevRoute = changeInfo.from as HistoryState<RouteContext> | undefined;

        const { '@params': nextParams } = nextRoute;
        const { '@params': prevParams } = prevRoute ?? {};

        // page instance
        await ensureRouterPageInstance(nextRoute);
        // page $template
        await ensureRouterPageTemplate(nextParams);

        changeInfo.samePageInstance = prevParams?.page && prevParams.page === nextParams.page;
        const { reload, samePageInstance, asyncProcess } = changeInfo;

        // page $el
        if (!reload && samePageInstance) {
            await this.cloneContent(nextRoute, nextParams, prevRoute!, changeInfo, asyncProcess);
        } else if (!nextRoute.el) {
            await this.loadContent(nextRoute, nextParams, changeInfo, asyncProcess);
        }

        const $elNext = $(nextRoute.el);
        const pageNext = nextParams.page!;

        // mount
        if (!$elNext.isConnected) {
            await this.mountContent($elNext, pageNext, changeInfo, asyncProcess);
        }

        return [
            pageNext, $elNext,                                                                   // next
            (reload && {} || (prevParams?.page ?? {})), (reload && $(null) || $(prevRoute?.el)), // prev
        ];
    }

    /** @internal */
    private async cloneContent(
        nextRoute: RouteContext, nextParams: RouteContextParameters,
        prevRoute: RouteContext,
        changeInfo: RouteChangeInfoContext,
        asyncProcess: RouteAyncProcessContext,
    ): Promise<void> {
        nextRoute.el = prevRoute.el;
        prevRoute.el = nextRoute.el?.cloneNode(true) as HTMLElement;
        $(prevRoute.el).removeAttr('id').insertBefore(nextRoute.el);
        $(nextRoute.el).attr('aria-hidden', true).removeClass([`${this._cssPrefix}-${CssName.PAGE_CURRENT}`, `${this._cssPrefix}-${CssName.PAGE_PREVIOUS}`]);
        this.publish('cloned', changeInfo);
        this.triggerPageCallback('cloned', nextParams.page, changeInfo);
        await asyncProcess.complete();
    }

    /** @internal */
    private async loadContent(
        route: RouteContext, params: RouteContextParameters,
        changeInfo: RouteChangeInfoContext,
        asyncProcess: RouteAyncProcessContext,
    ): Promise<void> {
        let fireEvents = true;

        if (!route.el) {
            const elCache = this._routes[route.path]['@route']?.el;
            fireEvents = !elCache;
            if (elCache) {                              // dom-cache case
                route.el = elCache;
            } else if (params.$template?.isConnected) { // prefetch case
                route.el         = params.$template[0];
                params.$template = params.$template.clone();
            } else {
                route.el = params.$template!.clone()[0];
            }
        }

        // update master cache
        if (route !== this._routes[route.path]['@route']) {
            this._routes[route.path]['@route'] = route;
        }

        if (fireEvents) {
            this.publish('loaded', changeInfo);
            await asyncProcess.complete();
            this.triggerPageCallback('init', params.page, changeInfo);
            await asyncProcess.complete();
        }
    }

    /** @internal */
    private async mountContent(
        $el: DOM, page: Page | undefined,
        changeInfo: RouteChangeInfoContext,
        asyncProcess: RouteAyncProcessContext,
    ): Promise<void> {
        $el.attr('aria-hidden', true);
        this._$el.append($el);
        this.publish('mounted', changeInfo);
        this.triggerPageCallback('mounted', page, changeInfo);
        await asyncProcess.complete();
    }

    /** @internal */
    private unmountContent(route: RouteContext): void {
        const $el = $(route.el);
        const page = route['@params'].page;
        if ($el.isConnected) {
            $el.detach();
            this.publish('unmounted', route);
            this.triggerPageCallback('unmounted', page, route);
        }
        if (route.el) {
            route.el = null!;
            this.publish('unloaded', route);
            this.triggerPageCallback('removed', page, route);
        }
    }

///////////////////////////////////////////////////////////////////////
// private methods: transition core

    /** @internal */
    private async transitionPage(
        pageNext: Page, $elNext: DOM,
        pagePrev: Page, $elPrev: DOM,
        changeInfo: RouteChangeInfoContext,
    ): Promise<string | undefined> {
        const transition = changeInfo.transition ?? this._transitionSettings.default;

        const {
            'enter-from-class': customEnterFromClass,
            'enter-active-class': customEnterActiveClass,
            'enter-to-class': customEnterToClass,
            'leave-from-class': customLeaveFromClass,
            'leave-active-class': customLeaveActiveClass,
            'leave-to-class': customLeaveToClass,
        } = this._transitionSettings;

        // enter-css-class
        const enterFromClass   = customEnterFromClass   ?? `${transition}-${CssName.ENTER_FROM_CLASS}`;
        const enterActiveClass = customEnterActiveClass ?? `${transition}-${CssName.ENTER_ACTIVE_CLASS}`;
        const enterToClass     = customEnterToClass     ?? `${transition}-${CssName.ENTER_TO_CLASS}`;

        // leave-css-class
        const leaveFromClass   = customLeaveFromClass   ?? `${transition}-${CssName.LEAVE_FROM_CLASS}`;
        const leaveActiveClass = customLeaveActiveClass ?? `${transition}-${CssName.LEAVE_ACTIVE_CLASS}`;
        const leaveToClass     = customLeaveToClass     ?? `${transition}-${CssName.LEAVE_TO_CLASS}`;

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
            pageNext, $elNext,
            pagePrev, $elPrev,
            changeInfo,
        );

        return transition;
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

        $elNext
            .addClass([enterFromClass, `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`])
            .removeAttr('aria-hidden')
            .reflow()
            .addClass(enterActiveClass)
        ;
        $elPrev.addClass([leaveFromClass, leaveActiveClass, `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`]);

        this.publish('before-transition', changeInfo);
        this.triggerPageCallback('before-leave', pagePrev, changeInfo);
        this.triggerPageCallback('before-enter', pageNext, changeInfo);
        await changeInfo.asyncProcess.complete();
    }

    /** @internal transition proc : end */
    private async endTransition(
        pageNext: Page, $elNext: DOM,
        pagePrev: Page, $elPrev: DOM,
        changeInfo: RouteChangeInfoContext,
    ): Promise<void> {
        ($elNext[0] !== $elPrev[0]) && $elPrev.attr('aria-hidden', true);
        $elNext.removeClass([`${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`]);
        $elPrev.removeClass([`${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`]);

        this._$el.removeClass([
            `${this._cssPrefix}-${CssName.TRANSITION_RUNNING}`,
            `${this._cssPrefix}-${CssName.TRANSITION_DIRECTION}-${decideTransitionDirection(changeInfo)}`,
        ]);

        this.triggerPageCallback('after-leave', pagePrev, changeInfo);
        this.triggerPageCallback('after-enter', pageNext, changeInfo);
        this.publish('after-transition', changeInfo);
        await changeInfo.asyncProcess.complete();
    }

///////////////////////////////////////////////////////////////////////
// private methods: transition finalize

    /** @internal update page status after transition */
    private updateChangeContext(
        $elNext: DOM,
        $elPrev: DOM,
        changeInfo: RouteChangeInfoContext,
        transition: string | undefined,
    ): void {
        const { from, reload, samePageInstance, direction, to } = changeInfo;
        const prevRoute = from as RouteContext;
        const nextRoute = to as RouteContext;
        const urlChanged = !reload;


        if ($elNext[0] !== $elPrev[0]) {
            // update class
            $elPrev
                .removeClass(`${this._cssPrefix}-${CssName.PAGE_CURRENT}`)
                .addClass(`${this._cssPrefix}-${CssName.PAGE_PREVIOUS}`)
            ;
            $elNext.addClass(`${this._cssPrefix}-${CssName.PAGE_CURRENT}`);

            if (urlChanged && this._prevRoute) {
                this._prevRoute.el?.classList.remove(`${this._cssPrefix}-${CssName.PAGE_PREVIOUS}`);
                this.treatDomCacheContents(nextRoute, this._prevRoute);
            }
        }

        if (urlChanged) {
            this._prevRoute = prevRoute;
            if (samePageInstance) {
                $elPrev.detach();
                $elNext.addClass(`${this._cssPrefix}-${CssName.PAGE_PREVIOUS}`);
                this._prevRoute && (this._prevRoute.el = null!);
            }
        }

        this._lastRoute = this.currentRoute as RouteContext;
        'forward' === direction && transition && (this._lastRoute.transition = transition);
    }

///////////////////////////////////////////////////////////////////////
// private methods: prefetch & dom cache

    /** @internal unset dom cached contents */
    private releaseCacheContents(el: HTMLElement | undefined): void {
        for (const key of Object.keys(this._routes)) {
            const route = this._routes[key]['@route'] as RouteContext | undefined;
            if (route) {
                if (null == el) {
                    this.unmountContent(route);
                } else if (route.el === el) {
                    route.el = null!;
                }
            }
        }
        for (const route of this._history.stack) {
            if ((null == el && route.el) || route.el === el) {
                route.el = null!;
            }
        }
    }

    /** @internal destruction of dom according to condition */
    private treatDomCacheContents(nextRoute: RouteContext, prevRoute: RouteContext): void {
        if (prevRoute.el && prevRoute.el !== this.currentRoute.el) {
            const $el = $(prevRoute.el);
            const cacheLv = $el.data(DomCache.DATA_NAME);
            if (DomCache.CACHE_LEVEL_CONNECT !== cacheLv) {
                const page = prevRoute['@params'].page;
                $el.detach();
                const fireEvents = prevRoute['@params'].page !== nextRoute['@params'].page;
                if (fireEvents) {
                    this.publish('unmounted', prevRoute);
                    this.triggerPageCallback('unmounted', page, prevRoute);
                }
                if (DomCache.CACHE_LEVEL_MEMORY !== cacheLv) {
                    this.releaseCacheContents(prevRoute.el);
                    prevRoute.el = null!;
                    if (fireEvents) {
                        this.publish('unloaded', prevRoute);
                        this.triggerPageCallback('removed', page, prevRoute);
                    }
                }
            }
        }
    }

    /** @internal set dom prefetched contents */
    private async setPrefetchContents(params: RouteContextParameters[]): Promise<void> {
        const toRoute = (param: RouteContextParameters, el: HTMLElement): RouteContext => {
            const ctx = toRouteContext(param.prefetch!, this, param);
            ctx.el = el;
            return ctx;
        };

        const toRouteChangeInfo = (route: RouteContext): RouteChangeInfoContext => {
            return {
                router: this,
                to: route,
                direction: 'none',
                asyncProcess: new RouteAyncProcessContext(),
                reload: false,
            };
        };

        for (const param of params) {
            const elRoute = param['@route']?.el;
            if (!elRoute || (this.currentRoute.el !== elRoute && this._lastRoute?.el !== elRoute && this._prevRoute?.el !== elRoute)) {
                await ensureRouterPageTemplate(param);
                const el = param.$template![0];
                if (!el.isConnected) {
                    const route = toRoute(param, el);
                    await ensureRouterPageInstance(route);
                    const changeInfo = toRouteChangeInfo(route);
                    const { asyncProcess } = changeInfo;
                    // load & init
                    await this.loadContent(route, param, changeInfo, asyncProcess);
                    // mount
                    await this.mountContent($(el), param.page, changeInfo, asyncProcess);
                }
            }
        }
    }

    /** @internal load prefetch dom contents */
    private async treatPrefetchContents(): Promise<void> {
        // 遷移先から prefetch content を検出
        const prefetchParams: RouteContextParameters[] = [];
        const targets = this.currentRoute.el?.querySelectorAll(`[data-${LinkData.PREFETCH}]`) ?? [];
        for (const el of targets) {
            const $el = $(el);
            if (false !== $el.data(LinkData.PREFETCH)) {
                const url = $el.attr('href');
                const params = this.findRouteContextParams(url!);
                if (params) {
                    params.prefetch = url;
                    prefetchParams.push(params);
                }
            }
        }
        await this.setPrefetchContents(prefetchParams);
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    /** @internal `history` `changing` handler */
    private onHistoryChanging(nextState: HistoryState<RouteContext>, cancel: (reason?: unknown) => void, promises: Promise<unknown>[]): void {
        if (this._inChangingPage) {
            cancel(makeResult(RESULT_CODE.ERROR_MVC_ROUTER_BUSY));
            return;
        }
        const changeInfo = this.makeRouteChangeInfo(nextState, undefined);
        this.publish('will-change', changeInfo, cancel);
        promises.push(...changeInfo.asyncProcess.promises);
    }

    /** @internal `history` `refresh` handler */
    private onHistoryRefresh(newState: HistoryState<Partial<RouteContext>>, oldState: HistoryState<RouteContext> | undefined, promises: Promise<unknown>[]): void {
        const ensure = (state: HistoryState<Partial<RouteContext>>): HistoryState<RouteContext> => {
            const url  = `/${state['@id']}`;
            const params = this.findRouteContextParams(url);
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
        const method     = $target.data(LinkData.NAVIAGATE_METHOD) as string;
        const methodOpts = ('push' === method || 'replace' === method ? { method } : {}) as NavigationSettings;

        if ('#' === url) {
            void this.back();
        } else {
            void this.navigate(url!, { transition, ...methodOpts });
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
 * @en Create {@link Router} object.
 * @ja {@link Router} オブジェクトを構築
 *
 * @param selector
 *  - `en` An object or the selector string which becomes origin of {@link DOM}.
 *  - `ja` {@link DOM} のもとになるインスタンスまたはセレクタ文字列
 * @param options
 *  - `en` {@link RouterConstructionOptions} object
 *  - `ja` {@link RouterConstructionOptions} オブジェクト
 */
export function createRouter(selector: DOMSelector<string | HTMLElement>, options?: RouterConstructionOptions): Router {
    return new RouterContext(selector, Object.assign({
        start: true,
    }, options));
}
