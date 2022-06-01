
import { path2regexp } from '@cdp/extension-path2regexp';
import {
    Writable,
    Class,
    isString,
    isArray,
    isObject,
    isFunction,
} from '@cdp/core-utils';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import { loadTemplateSource, toTemplateElement } from '@cdp/web-utils';
import { normalizeId } from '../history/internal';
import type {
    RouteParameters,
    Route,
    RouteNavigationOptions,
    Router,
    RouterView,
} from './interfaces';

/** @internal flat RouteParameters */
export type RouteContextParameters = Omit<RouteParameters, 'routes'> & {
    /** regexp from path */
    regexp: RegExp;
    /** keys of params */
    paramKeys: string[];
    /** DOM template instance with View element */
    $template?: DOM;
    /** router view instance from `component` property */
    instance?: RouterView;
};

/** @internal RouteContext */
export type RouteContext = Writable<Route> & RouteNavigationOptions & {
    '@params': RouteContextParameters;
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

/** @internal ensure RouteContextParameters#$template */
export const ensureRouterViewTemplate = async (params: RouteContextParameters): Promise<boolean> => {
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

/** @internal ensure RouteContextParameters#instance */
export const ensureRouterViewInstance = async (route: RouteContext): Promise<boolean> => {
    const { '@params': params } = route;

    if (params.instance) {
        return false; // already created
    }

    const { component } = params;
    if (isFunction(component)) {
        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable
            params.instance = await new (component as unknown as Class)(route);
        } catch {
            params.instance = await component(route);
        }
    } else if (isObject(component)) {
        params.instance = Object.assign({ '@route': route }, component);
    } else {
        params.instance = { '@route': route };
    }

    return true; // newly created
};
