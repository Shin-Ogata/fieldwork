
import { path2regexp } from '@cdp/extension-path2regexp';
import {
    Writable,
    Class,
    isString,
    isArray,
    isObject,
    isFunction,
    assignValue,
    sleep,
} from '@cdp/core-utils';
import { RESULT_CODE, makeResult } from '@cdp/result';
import {
    toQueryStrings,
    parseUrlQuery,
    convertUrlParamType,
} from '@cdp/ajax';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import { loadTemplateSource, toTemplateElement } from '@cdp/web-utils';
import {
    HistoryDirection,
    IHistory,
    createSessionHistory,
    createMemoryHistory,
} from '../history';
import { normalizeId } from '../history/internal';
import type {
    RouteChangeInfo,
    Page,
    RouteParameters,
    Route,
    RouteSubFlowParams,
    RouteNavigationOptions,
    Router,
} from './interfaces';

/** @internal */
export const enum CssName {
    DEFAULT_PREFIX       = 'cdp',
    TRANSITION_DIRECTION = 'transition-direction',
    TRANSITION_RUNNING   = 'transition-running',
    PAGE_CURRENT         = 'page-current',
    PAGE_PREVIOUS        = 'page-previous',
    ENTER_FROM_CLASS     = 'enter-from',
    ENTER_ACTIVE_CLASS   = 'enter-active',
    ENTER_TO_CLASS       = 'enter-to',
    LEAVE_FROM_CLASS     = 'leave-from',
    LEAVE_ACTIVE_CLASS   = 'leave-active',
    LEAVE_TO_CLASS       = 'leave-to',
}

/** @internal */
export const enum DomCache {
    DATA_NAME           = 'dom-cache',
    CACHE_LEVEL_MEMORY  = 'memory',
    CACHE_LEVEL_CONNECT = 'connect',
}

/** @internal */
export const enum LinkData {
    TRANSITION     = 'transition',
    PREVENT_ROUTER = 'prevent-router',
}

/** @internal */
export const enum Const {
    WAIT_TRANSITION_MARGIN = 100, // msec
}

/** @internal */
export type PageEvent = 'init' | 'mounted' | 'before-enter' | 'after-enter' | 'before-leave' | 'after-leave' | 'unmounted' | 'removed';

//__________________________________________________________________________________________________//

/** @internal flat RouteParameters */
export type RouteContextParameters = Omit<RouteParameters, 'routes'> & {
    /** regexp from path */
    regexp: RegExp;
    /** keys of params */
    paramKeys: string[];
    /** DOM template instance with Page element */
    $template?: DOM;
    /** router page instance from `component` property */
    page?: Page;
};

/** @internal RouteContext */
export type RouteContext = Writable<Route> & RouteNavigationOptions & {
    '@params': RouteContextParameters;
    subflow?: RouteSubFlowParams;
};

//__________________________________________________________________________________________________//

/** @internal RouteContextParameters to RouteContext */
export const toRouteContext = (url: string, router: Router, params: RouteContextParameters, navOptions?: RouteNavigationOptions): RouteContext => {
    // omit unclonable props
    const fromNavigate = !!navOptions;
    const ensureClone = (ctx: unknown): RouteContext => JSON.parse(JSON.stringify(ctx));
    const context = Object.assign(
        {
            url,
            router: fromNavigate ? undefined : router,
        },
        navOptions,
        {
            // force override
            query: {},
            params: {},
            path: params.path,
            '@params': fromNavigate ? undefined : params,
        },
    );
    return fromNavigate ? ensureClone(context) : context as RouteContext;
};

/** @internal convert context params */
export const toRouteContextParameters = (routes: RouteParameters | RouteParameters[] | undefined): RouteContextParameters[] => {
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
            seed.regexp = path2regexp.pathToRegexp(seed.path, keys);
            seed.paramKeys = keys.filter(k => isString(k.name)).map(k => k.name as string);
            return seed;
        });
};

//__________________________________________________________________________________________________//

/** @internal prepare IHistory object */
export const prepareHistory = (seed: 'hash' | 'history' | 'memory' | IHistory = 'hash', initialPath?: string, context?: Window): IHistory<RouteContext> => {
    return (isString(seed)
        ? 'memory' === seed ? createMemoryHistory(initialPath || '') : createSessionHistory(initialPath || '', undefined, { mode: seed, context })
        : seed
    ) as IHistory<RouteContext>;
};

/** @internal */
export const buildNavigateUrl = (path: string, options: RouteNavigationOptions): string => {
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
export const parseUrlParams = (route: RouteContext): void => {
    const { url } = route;
    route.query  = url.includes('?') ? parseUrlQuery(normalizeId(url)) : {};
    route.params = {};

    const { regexp, paramKeys } = route['@params'];
    if (paramKeys.length) {
        const params = regexp.exec(url)?.map((value, index) => { return { value, key: paramKeys[index - 1] }; });
        for (const param of params!) { // eslint-disable-line @typescript-eslint/no-non-null-assertion
            if (null != param.key) {
                assignValue(route.params, param.key, convertUrlParamType(param.value));
            }
        }
    }
};

//__________________________________________________________________________________________________//

/** @internal ensure RouteContextParameters#instance */
export const ensureRouterPageInstance = async (route: RouteContext): Promise<boolean> => {
    const { '@params': params } = route;

    if (params.page) {
        return false; // already created
    }

    const { component, componentOptions } = params;
    if (isFunction(component)) {
        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable
            params.page = await new (component as unknown as Class)(route, componentOptions);
        } catch {
            params.page = await component(route, componentOptions);
        }
    } else if (isObject(component)) {
        params.page = Object.assign({ '@route': route, '@options': componentOptions }, component) as Page;
    } else {
        params.page = { '@route': route, '@options': componentOptions } as Page;
    }

    return true; // newly created
};

/** @internal ensure RouteContextParameters#$template */
export const ensureRouterPageTemplate = async (params: RouteContextParameters): Promise<boolean> => {
    if (params.$template) {
        return false; // already created
    }

    const { content } = params;
    if (null == content) {
        // noop element
        params.$template = $<HTMLElement>();
    } else if (isString(content['selector'])) {
        // from ajax
        const { selector, url } = content as { selector: string; url?: string; };
        const template = toTemplateElement(await loadTemplateSource(selector, { url }));
        if (!template) {
            throw Error(`template load failed. [selector: ${selector}, url: ${url}]`);
        }
        params.$template = $([...template.content.children]) as DOM;
    } else {
        params.$template = $(content as HTMLElement);
    }

    return true; // newly created
};

/** @internal decide transition direction */
export const decideTransitionDirection = (changeInfo: RouteChangeInfo): HistoryDirection => {
    if (changeInfo.reverse) {
        switch (changeInfo.direction) {
            case 'back':
                return 'forward';
            case 'forward':
                return 'back';
            default:
                break;
        }
    }
    return changeInfo.direction;
};

/** @internal check animation property */
const getAnimationSec = ($el: DOM): number => {
    try {
        return parseFloat(getComputedStyle($el[0]).animationDuration);
    } catch {
        return 0;
    }
};

/** @internal check transition property */
const getTransitionSec = ($el: DOM): number => {
    try {
        return parseFloat(getComputedStyle($el[0]).transitionDuration);
    } catch {
        return 0;
    }
};

/** @internal */
const waitForEffect = ($el: DOM, method: 'animationEnd' | 'transitionEnd', durationSec: number): Promise<unknown> => {
    return Promise.race([
        new Promise(resolve => $el[method](resolve)),
        sleep(durationSec * 1000 + Const.WAIT_TRANSITION_MARGIN),
    ]);
};

/** @internal transition execution */
export const processPageTransition = async($el: DOM, fromClass: string, activeClass: string, toClass: string): Promise<void> => {
    $el.removeClass(fromClass);
    $el.addClass(toClass);

    /* eslint-disable no-cond-assign */
    let duration: number;
    if (duration = getAnimationSec($el)) {
        await waitForEffect($el, 'animationEnd', duration);
    } else if (duration = getTransitionSec($el)) {
        await waitForEffect($el, 'transitionEnd', duration);
    }
    /* eslint-enable no-cond-assign */

    $el.removeClass(activeClass);
};
