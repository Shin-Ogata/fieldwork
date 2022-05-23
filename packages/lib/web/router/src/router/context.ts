export * from '@cdp/extension-path2regexp';
import {
    PlainObject,
    isString,
    isArray,
    pick,
} from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import {
    RESULT_CODE,
    makeResult,
} from '@cdp/result';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
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
    Router,
} from './interfaces';

/** @internal RouteContext */
interface RouteContext extends Route {
    /** router view instance from `component` property */
    instance?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** @internal flat RouteParameters */
type RouteContextParameters = Omit<RouteParameters, 'routes'>;

//__________________________________________________________________________________________________//

/** @internal RouteContextParameters to RouteContext */
const toRouteContext = (params: RouteContextParameters): RouteContext => {
    return pick(
        params,
        'path',
        'component',
    ) as RouteContext; // TODO: parameter どうするか?
};

/** @internal prepare IHistory object */
const prepareHistory = (seed: 'hash' | 'history' | 'memory' | IHistory = 'hash', route?: RouteContext): IHistory<RouteContext> => {
    // TODO: path は /page/user/:userId/post/:postId/ があるからダメ?
    const path = route?.path || '';
    return (isString(seed)
        ? 'memory' === seed ? createMemoryHistory(path, route) : createSessionHistory(path, route, { mode: seed })
        : seed
    ) as IHistory<RouteContext>;
};

/** @internal prepare IHistory object */
const toRouteContextParameters = (routes: RouteParameters | RouteParameters[] | undefined): RouteContextParameters[] => {
    const flatten = (parentPath: string, nested: RouteParameters[]): RouteParameters[] => {
        const retval: RouteParameters[] = [];
        for (const n of nested) {
            if (n.routes) {
                retval.push(...flatten(n.path, n.routes));
            } else {
                n.path = `${parentPath.replace(/\/$/, '')}/${normalizeId(n.path)}`;
                retval.push(n);
            }
        }
        return retval;
    };

    return flatten('', isArray(routes) ? routes : routes ? [routes] : []);
};

//__________________________________________________________________________________________________//

/**
 * @en Router impliment class.
 * @ja Router 実装クラス
 */
class RouterContext extends EventPublisher<RouterEvent> implements Router {
    private readonly _routes: RouteContextParameters[] = [];
    private readonly _history: IHistory<RouteContext>;
    private readonly _$el: DOM;
    private readonly _$document: DOM<Document>;
    private readonly _historyUpdateHandler: typeof RouterContext.prototype.onHistoryUpdate;
    private readonly _historyChangedHandler: typeof RouterContext.prototype.onHistoryChanged;

    /**
     * constructor
     */
    constructor(selector: string, options: RouterConstructionOptions) {
        super();

        const {
            routes,
            el,
            document: doc,
            history,
        } = options;

        this._$el = $(selector, el);
        this._$document = $(doc as Document || document);
        if (!this._$el.length) {
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector}]`);
        }

        this._routes.push(...toRouteContextParameters(routes));

        this._history = prepareHistory(history, this._routes[0] ? toRouteContext(this._routes[0]) : undefined);
        this._historyUpdateHandler  = this.onHistoryUpdate.bind(this);
        this._historyChangedHandler = this.onHistoryChanged.bind(this);


        this._history.on('update', this._historyUpdateHandler);
        this._history.on('change', this._historyChangedHandler);
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
    register(routes: RouteParameters | RouteParameters[]): this {
        this._routes.push(...toRouteContextParameters(routes));
        // TODO: start / restart ?
        return this;
    }

    /** To move backward through history. */
    back(): this {
        this.go(-1);
        return this;
    }

    /** To move forward through history. */
    forward(): this {
        this.go(1);
        return this;
    }

    /** To move a specific point in history. */
    go(delta?: number): this {
        void this._history.go(delta);
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

    /** @internal change content main procedure */
    private changeConetnt(newState: HistoryState<RouteContext>, oldState?: HistoryState<RouteContext>): void {
        try {
            // TODO:
        } catch (e) {
            this.publish('error', e);
        }
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    /** @internal `history` `update` handler */
    private onHistoryUpdate(nextState: HistoryState<RouteContext>, cancel: (reason?: unknown) => void): boolean {
        let handled = false;
        const callback = (reason?: unknown): void => {
            handled = true;
            cancel(reason);
        };

        this.publish('will-change', this.makeRouterEventArg(nextState), callback);

        return handled;
    }

    /** @internal `history` `changed` handler */
    private onHistoryChanged(newState: HistoryState<RouteContext>, oldState: HistoryState<RouteContext>): void {
        this.changeConetnt(newState, oldState);
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
    return new RouterContext(selector, options || {});
}
