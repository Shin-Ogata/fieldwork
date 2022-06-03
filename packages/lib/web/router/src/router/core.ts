import { path2regexp } from '@cdp/extension-path2regexp';
import { isString } from '@cdp/core-utils';
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
import {
    toQueryStrings,
    parseUrlQuery,
    convertUrlParamType,
} from '@cdp/ajax';
import { document } from '../ssr';
import { normalizeId } from '../history/internal';
import {
    IHistory,
    HistoryState,
    createSessionHistory,
    createMemoryHistory,
} from '../history';
import type {
    RouteChangeInfo,
    RouterEvent,
    Page,
    RouteParameters,
    Route,
    RouterConstructionOptions,
    RouteNavigationOptions,
    Router,
} from './interfaces';
import {
    RouteContextParameters,
    RouteContext,
    toRouteContextParameters,
    toRouteContext,
    ensureRouterPageInstance,
    ensureRouterPageTemplate,
} from './internal';

/** @internal prepare IHistory object */
const prepareHistory = (seed: 'hash' | 'history' | 'memory' | IHistory = 'hash', initialPath?: string, context?: Window): IHistory<RouteContext> => {
    return (isString(seed)
        ? 'memory' === seed ? createMemoryHistory(initialPath || '') : createSessionHistory(initialPath || '', undefined, { mode: seed, context })
        : seed
    ) as IHistory<RouteContext>;
};

/** @internal */
const buildNavigateUrl = (path: string, options: RouteNavigationOptions): string => {
    try {
        path = `/${normalizeId(path)}`;
        const { query, params } = options;
        let url = path2regexp.compile(path)(params || {});
        if (query) {
            url += `?${toQueryStrings(query)}`;
        }
        return url;
    } catch (error) {
        throw makeResult(
            RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED,
            `Construct route destination failed. [path: ${path}, detail: ${error.toString()}]`,
            error,
        );
    }
};

/** @internal */
const parseUrlParams = (route: RouteContext): void => {
    const { url } = route;
    route.query  = url.includes('?') ? parseUrlQuery(normalizeId(url)) : {};
    route.params = {};

    const { regexp, paramKeys } = route['@params'];
    if (paramKeys.length) {
        const params = regexp.exec(url)?.map((value, index) => { return { value, key: paramKeys[index - 1] }; });
        for (const param of params!) { // eslint-disable-line @typescript-eslint/no-non-null-assertion
            if (null != param.key) {
                route.params[param.key] = convertUrlParamType(param.value);
            }
        }
    }
};

//__________________________________________________________________________________________________//

/**
 * @en Router impliment class.
 * @ja Router 実装クラス
 */
class RouterContext extends EventPublisher<RouterEvent> implements Router {
    private readonly _routes: Record<string, RouteContextParameters> = {};
    private readonly _history: IHistory<RouteContext>;
    private readonly _$el: DOM;
    private readonly _$document: DOM<Document>;
    private readonly _historyChangingHandler: typeof RouterContext.prototype.onHistoryChanging;
    private readonly _historyRefreshHandler: typeof RouterContext.prototype.onHistoryRefresh;
    private readonly _errorHandler: typeof RouterContext.prototype.onHandleError;

    /**
     * constructor
     */
    constructor(selector: string, options: RouterConstructionOptions) {
        super();

        const {
            routes,
            start,
            el,
            window,
            history,
            initialPath,
        } = options;

        this._$document = $(window?.document || document);
        this._$el = $(selector, el);
        if (!this._$el.length) {
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector}]`);
        }

        this._history = prepareHistory(history, initialPath, window as Window);
        this._historyChangingHandler = this.onHistoryChanging.bind(this);
        this._historyRefreshHandler  = this.onHistoryRefresh.bind(this);
        this._errorHandler           = this.onHandleError.bind(this);

        this._history.on('changing', this._historyChangingHandler);
        this._history.on('refresh', this._historyRefreshHandler);
        this._history.on('error', this._errorHandler);

        // TODO: follow anchor

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

    /** @en Navigate to new page. */
    async navigate(to: string, options?: RouteNavigationOptions): Promise<this> {
        try {
            const seed = this.findRouteContextParameter(to);
            if (!seed) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
            }

            // TODO: default transition
            const opts  = Object.assign({ transition: undefined, intent: undefined }, options);
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

    /** @internal change content main procedure */
    private async changeConetnt(nextRoute: HistoryState<RouteContext>, prevRoute: HistoryState<RouteContext> | undefined): Promise<void> {
        parseUrlParams(nextRoute);

        const [
            pageNext, $elNext,
            pagePrev, $elPrev,
        ] = await this.prepareChangeContext(nextRoute, prevRoute);

        // TODO:
    }

    /* eslint-disable @typescript-eslint/no-non-null-assertion */

    /** @internal */
    private async prepareChangeContext(
        nextRoute: HistoryState<RouteContext>, prevRoute: HistoryState<RouteContext> | undefined
    ): Promise<[Page, DOM, Page, DOM]> {
        const { '@params': params } = nextRoute;

        // page instance
        await ensureRouterPageInstance(nextRoute);
        // page $template
        await ensureRouterPageTemplate(params);

        // page $el
        if (!nextRoute.el) {
            // TODO: prevRoute から構築する方法も検討
            nextRoute.el = params.$template!.clone()[0];
            this.publish('loaded', this.makeRouteChangeInfo(nextRoute, prevRoute));
            // TODO: trigger
        }

        return [
            nextRoute['@params'].page!, $(nextRoute.el),            // next
            prevRoute?.['@params'].page || {}, $(prevRoute?.el),    // prev
        ];
    }

    /* eslint-enable @typescript-eslint/no-non-null-assertion */

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
            promises.push(this.changeConetnt(ensure(newState), oldState));
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
