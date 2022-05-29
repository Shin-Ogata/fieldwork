import { path2regexp } from '@cdp/extension-path2regexp';
import {
    isString,
    isArray,
    pick,
} from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import { RESULT_CODE, makeResult } from '@cdp/result';
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
    RouterEventArg,
    RouterEvent,
    RouteParameters,
    Route,
    RouterConstructionOptions,
    RouteNavigationOptions,
    Router,
    RouterView,
} from './interfaces';

/** @internal flat RouteParameters */
type RouteContextParameters = Omit<RouteParameters, 'routes'> & {
    /** regexp from path */
    regexp: RegExp;
    /** keys of params */
    paramKeys: string[];
    /** DOM template instance with View element */
    $template?: DOM<HTMLTemplateElement>;
    /** router view instance from `component` property */
    instance?: RouterView;
};

/** @internal RouteContext */
type RouteContext
    = Route
    & Pick<RouteContextParameters, 'instance'>
    & RouteNavigationOptions;

//__________________________________________________________________________________________________//

/** @internal */
const { pathToRegexp } = path2regexp;

/** @internal RouteContextParameters to RouteContext */
const toRouteContext = (url: string, params: RouteContextParameters, navOptions?: RouteNavigationOptions): RouteContext => {
    return Object.assign({
        url,
        query: {},
        params: {},
    },
    navOptions,
    pick(
        params,
        // RouteParameters
        'path',
        'content',
        'component',
        // RouteContextParameters
        'instance',
    ));
};

/** @internal prepare IHistory object */
const prepareHistory = (seed: 'hash' | 'history' | 'memory' | IHistory = 'hash', initialPath?: string, context?: Window): IHistory<RouteContext> => {
    return (isString(seed)
        ? 'memory' === seed ? createMemoryHistory(initialPath || '') : createSessionHistory(initialPath || '', undefined, { mode: seed, context })
        : seed
    ) as IHistory<RouteContext>;
};

/** @internal convert context params */
const toRouteContextParameters = (routes: RouteParameters | RouteParameters[] | undefined): RouteContextParameters[] => {
    const flatten = (parentPath: string, nested: RouteParameters[]): RouteParameters[] => {
        const retval: RouteParameters[] = [];
        for (const n of nested) {
            n.path = `${parentPath.replace(/\/$/, '')}/${normalizeId(n.path)}`;
            retval.push(n);
            if (n.routes) {
                retval.push(...flatten(n.path, n.routes));
            }
        }
        return retval;
    };

    return flatten('', isArray(routes) ? routes : routes ? [routes] : [])
        .map((seed: RouteContextParameters) => {
            const keys: path2regexp.Key[] = [];
            seed.regexp = pathToRegexp(seed.path, keys);
            seed.paramKeys = keys.filter(k => isString(k.name)).map(k => k.name as string);
            return seed;
        });
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
const parseUrlParams = (ctxparams: RouteContextParameters, route: RouteContext): void => {
    const { url } = route;
    route.query  = url.includes('?') ? parseUrlQuery(normalizeId(url)) : {};
    route.params = {};

    const { regexp, paramKeys } = ctxparams;
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

        const { document: doc } = window || {};

        this._$el = $(selector, el);
        this._$document = $(doc as Document || document);
        if (!this._$el.length) {
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector}]`);
        }

        this._history = prepareHistory(history, initialPath, window as Window);
        this._historyChangingHandler  = this.onHistoryChanging.bind(this);
        this._historyRefreshHandler = this.onHistoryRefresh.bind(this);

        this._history.on('changing', this._historyChangingHandler);
        this._history.on('refresh', this._historyRefreshHandler);

        this.register(routes as RouteParameters[], start);
    }

///////////////////////////////////////////////////////////////////////
// implements: Router

    /** Router's view HTML element */
    get el(): HTMLElement {
        return this._$el[0];
    }

    /** `DOM` instance with router's view HTML element */
    get $el(): DOM {
        return this._$el;
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

    /** @en Navigate to new view. */
    async navigate(to: string, options?: RouteNavigationOptions): Promise<this> {
        const seed = this.findRouteContextParameter(to);
        if (!seed) {
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
        }

        const url  = buildNavigateUrl(to, options || {} as RouteNavigationOptions);
        const route = toRouteContext(url, seed, options);

        // TODO: subflow

        // exec navigate
        await this._history.push(url, route);
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
    private makeRouterEventArg(newState: HistoryState<RouteContext>, oldState?: HistoryState<RouteContext>): RouterEventArg {
        return {
            router: this,
            from: oldState || this.currentRoute,
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
    private changeConetnt(params: RouteContextParameters, newRoute: HistoryState<RouteContext>, oldRoute?: HistoryState<RouteContext>): void {
        parseUrlParams(params, newRoute);
        // TODO:
        console.log(`[new: ${JSON.stringify(newRoute)}, old: ${null == oldRoute ? 'undefined' : JSON.stringify(oldRoute)}]`);
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

        this.publish('will-change', this.makeRouterEventArg(nextState), callback);

        return handled;
    }

    /** @internal `history` `refresh` handler */
    private onHistoryRefresh(newState: HistoryState<Partial<RouteContext>>, oldState: HistoryState<RouteContext> | undefined): void {
        // `RouteContext` を保証する
        const find = (state: HistoryState<Partial<RouteContext>>): { params: RouteContextParameters; route: HistoryState<RouteContext>; } => {
            const url  = `/${state['@id']}`;
            const params = this.findRouteContextParameter(url);
            if (null == params) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, state);
            }
            if (null == state.path) {
                Object.assign(state, toRouteContext(url, params));
            }
            return { params, route: state as HistoryState<RouteContext> };
        };

        try {
            const { params, route } = find(newState);
            this.changeConetnt(params, route, oldState);
        } catch (e) {
            this.publish('error', e);
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
