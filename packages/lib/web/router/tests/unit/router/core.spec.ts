/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { UnknownFunction } from '@cdp/core-utils';
import { RESULT_CODE } from '@cdp/result';
import { webRoot, clearTemplateCache } from '@cdp/web-utils';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import {
    RouterEventArg,
    RouterView,
    Route,
    RouterConstructionOptions,
    Router,
    createRouter,
    createMemoryHistory,
} from '@cdp/router';
import { prepareIFrameElements, cleanupTestElements } from '../tools';

describe('router/context spec', () => {

    const callbackArgs: any[] = [];

    beforeEach(() => {
        callbackArgs.length = 0;
        clearTemplateCache();
    });

    afterEach(() => {
        cleanupTestElements();
    });

    const onCallback = (...args: any[]): void => { // eslint-disable-line @typescript-eslint/no-unused-vars
        callbackArgs.length = 0;
        callbackArgs.push(...args);
//      console.log(`received: ${JSON.stringify([...args])} \n`);
    };

    const getWindow = (instance: Router): Window => {
        return (instance as any)._history._window as Window;
    };

    const waitFrame = async (instance: Router, frameCount = 1): Promise<void> => {
        const { requestAnimationFrame } = getWindow(instance); // eslint-disable-line @typescript-eslint/unbound-method
        while (frameCount-- > 0) {
            await new Promise<void>(requestAnimationFrame as UnknownFunction);
        }
    };

    const WAIT_FRAME_MARGINE = 5;

    const prepareQueryContext = async (): Promise<{ el: Document | null; window: Window | null; }> => {
        const iframe = await prepareIFrameElements();
        const { history } = iframe.contentWindow as Window;
        history.replaceState(null, '', webRoot);
        return { el: iframe.contentDocument, window: iframe.contentWindow };
    };

    const createRouterWrap = async (options?: RouterConstructionOptions): Promise<Router> => {
        const { el, window } = await prepareQueryContext();
        return createRouter('#test-router', Object.assign({ el, window }, options));
    };

    describe('construction', () => {
        it('check instance', async () => {
            expect(createRouter).toBeDefined();
            const router = await createRouterWrap();
            expect(router).toBeDefined();
            expect(router.el).toBeDefined();
        });

        it('cover history mode', async () => {
            const history = createMemoryHistory('');
            const router = await createRouterWrap({ history });

            expect(router).toBeDefined();
            expect(router.el).toBeDefined();

            const router2 = await createRouterWrap({ history: 'memory' });
            expect(router2).toBeDefined();
            expect(router2.el).toBeDefined();
        });

        it('check creation error: ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND', () => {
            expect(() => createRouter('#test-router'))
                .toThrow(new Error('Router element not found. [selector: #test-router]'));
        });

        it('check creation error: ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const router = await createRouterWrap({ start: false });

            router.on('error', stub.onCallback);
            await router.go();

            expect(stub.onCallback).toHaveBeenCalledWith(jasmine.objectContaining({
                message: 'Route cannot be resolved. [url: /]',
                code: RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED,
                cause: {
                    '@id': '',
                    '@origin': true,
                },
            }));
        });

        it('initial path', async () => {
            const router = await createRouterWrap({
                initialPath: '/initial',
                routes: [{ path: '/initial' }],
            });

            await waitFrame(router);
            expect(router.currentRoute.path).toBe('/initial');
        });
    });

    describe('assistance method', () => {
        it('Router#currentRoute', async () => {
            const router = await createRouterWrap({
                routes: [{ path: '/' }],
            });

            await waitFrame(router);

            expect(router.currentRoute).toEqual(jasmine.objectContaining({
                url: '/',
                path: '/',
                query: {},
                params: {},
                '@id': '',
                '@origin': true,
            } as unknown as Route));
        });

        it('Router#currentRoute no entry', async () => {
            const router = await createRouterWrap();
            expect(router.currentRoute).toEqual({
                '@id': '',
                '@origin': true,
            } as any);
        });

        it('Router#register', async () => {
            const router = await createRouterWrap({ start: false });
            router.register({ path: '/', });
            await router.go();

            expect(router.currentRoute).toEqual(jasmine.objectContaining({
                url: '/',
                path: '/',
                query: {},
                params: {},
                '@id': '',
                '@origin': true,
            } as unknown as Route));
        });
    });

    describe('simple navigate method', () => {
        it('Router#currentRoute', async () => {
            const stub = { onCallback };
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/one' },
                    { path: '/two' }
                ],
            });
            router.on('error', stub.onCallback);

            await waitFrame(router);
            expect(router.currentRoute.path).toBe('/');

            await router.navigate('/one');
            expect(router.currentRoute.path).toBe('/one');

            await router.navigate('/two');
            expect(router.currentRoute.path).toBe('/two');

            await router.navigate('/three');
            expect(router.currentRoute.path).toBe('/two');

            const e = callbackArgs[0];

            expect(e.code).toBe(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED);
            expect(e.message).toBe('Route not found. [to: /three]');
        });

        it('Router#forward and Router#back', async () => {
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/one' },
                    { path: '/two' }
                ],
            });

            await waitFrame(router);
            await router.navigate('/one');
            await router.navigate('/two');
            expect(router.currentRoute.path).toBe('/two');

            await router.back();
            expect(router.currentRoute.path).toBe('/one');
            await router.back();
            expect(router.currentRoute.path).toBe('/');
            await router.back();
            expect(router.currentRoute.path).toBe('/');

            await router.forward();
            expect(router.currentRoute.path).toBe('/one');
            await router.forward();
            expect(router.currentRoute.path).toBe('/two');
            await router.forward();
            expect(router.currentRoute.path).toBe('/two');
        });

        it('nested route parameter', async () => {
            const router = await createRouterWrap({
                initialPath: '/parent',
                routes: [
                    {
                        path: '/parent',
                        routes: [
                            { path: '/child1', },
                            {
                                path: '/child2',
                                routes: [
                                    { path: '/grandchild', },
                                ],
                            },
                        ],
                    },
                ],
            });

            await waitFrame(router);
            expect(router.currentRoute.path).toBe('/parent');
            await router.navigate('/parent/child1');
            expect(router.currentRoute.path).toBe('/parent/child1');
            await router.navigate('/parent/child2');
            expect(router.currentRoute.path).toBe('/parent/child2');
            await router.navigate('/parent/child2/grandchild');
            expect(router.currentRoute.path).toBe('/parent/child2/grandchild');
        });

        it('path query', async () => {
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/query' },
                ],
            });

            await waitFrame(router);

            await router.navigate('/query');
            expect(router.currentRoute.url).toBe('/query');
            expect(router.currentRoute.path).toBe('/query');
            expect(router.currentRoute.query).toEqual({});

            await router.navigate('/query', {
                query: {
                    num: 100,
                    str: 'hoge',
                    bool: true,
                    cood: '10px',
                    nil: null,
                }
            });
            expect(router.currentRoute.url).toBe('/query?num=100&str=hoge&bool=true&cood=10px&nil=null');
            expect(router.currentRoute.path).toBe('/query');
            expect(router.currentRoute.query).toEqual({
                num: 100,
                str: 'hoge',
                bool: true,
                cood: '10px',
                nil: null,
            });
        });

        it('path params', async () => {
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/params/user/:userId/post/:postId' },
                ],
            });

            await waitFrame(router);

            await router.navigate('/params/user/:userId/post/:postId', {
                params: {
                    userId: 100,
                    postId: 12,
                }
            });
            expect(router.currentRoute.url).toBe('/params/user/100/post/12');
            expect(router.currentRoute.path).toBe('/params/user/:userId/post/:postId');
            expect(router.currentRoute.params).toEqual({
                userId: 100,
                postId: 12,
            });
        });

        it('illegal path params', async () => {
            const stub = { onCallback };
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/params/user/:userId/post/:postId' },
                ],
            });
            router.on('error', stub.onCallback);

            await waitFrame(router);

            await router.navigate('/params/user/:userId/post/:postId', {
                params: {
                    postId: 12,
                }
            });

            const e = callbackArgs[0];

            expect(e.code).toBe(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED);
            expect(e.message).toBe('Construct route destination failed. [path: /params/user/:userId/post/:postId, detail: TypeError: Expected "userId" to be a string]');
            expect(e.cause.message).toBe('Expected "userId" to be a string');
        });

        it('navigation cancellation', async () => {
            const cancelCallback = (event: RouterEventArg, cancel: (reason?: unknown) => void): boolean => {
                cancel('[test] changing not allowed');
                return true;
            };

            const stub = { onCallback };

            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/one' },
                ],
            });

            spyOn(stub, 'onCallback').and.callThrough();
            router.on('will-change', cancelCallback);
            router.on('changed', stub.onCallback);

            await waitFrame(router);

            try {
                await router.navigate('/one');
            } catch (e) {
                expect(e).toBe('[test] changing not allowed');
            }

            expect(router.currentRoute.path).toBe('/');

            expect(stub.onCallback).not.toHaveBeenCalled();
        });

        it('check RouteParameters.content creation', async () => {
            const stub = { onCallback };
            const router = await createRouterWrap({
                initialPath: '/string',
                routes: [
                    {
                        path: '/string',
                        content: '<div class="router-view">template from string</div>',
                    },
                    {
                        path: '/ajax',
                        content: {
                            selector: '#test-content-creation',
                            url: '../../.temp/res/router/test.tpl',
                        },
                    },
                    {
                        path: '/ajax/miss-selector',
                        content: {
                            selector: '#test-miss-selector',
                            url: '../../.temp/res/router/test.tpl',
                        },
                    },
                    {
                        path: '/ajax/miss-url',
                        content: {
                            selector: '#test-content-creation',
                            url: '../../.temp/res/router/miss.tpl',
                        },
                    },
                ],
            });
            router.on('error', stub.onCallback);

            await waitFrame(router);

            let $template: DOM = (router.currentRoute as any)['@params'].$template;
            let $el = $(router.currentRoute.el);

            expect($template).toBeDefined();
            expect($template.length).toBe(1);
            expect($template.text()).toBe('template from string');
            expect($el).toBeDefined();
            expect($el.length).toBe(1);
            expect($el.text()).toBe('template from string');
            expect($el !== $template).toBe(true);

            await router.navigate('/ajax');

            $template = (router.currentRoute as any)['@params'].$template;
            $el = $(router.currentRoute.el);

            expect($template).toBeDefined();
            expect($template.length).toBe(1);
            expect($template.text()).toBe('template from ajax');
            expect($el).toBeDefined();
            expect($el.length).toBe(1);
            expect($el.text()).toBe('template from ajax');
            expect($el !== $template).toBe(true);

            await router.navigate('/ajax/miss-selector');

            expect(callbackArgs[0]).toEqual(jasmine.objectContaining({
                message: 'Route navigate failed.',
                code: RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED,
                cause: jasmine.objectContaining({
                    message: 'template load failed. [selector: #test-miss-selector, url: ../../.temp/res/router/test.tpl]',
                }),
            }));

            await router.navigate('/ajax/miss-url');

            const e = callbackArgs[0];
            expect(e.message).toBe('Not Found');
            expect(e.code).toBe(RESULT_CODE.ERROR_AJAX_RESPONSE);
            expect(e.cause.url.includes('res/router/miss.tpl')).toBe(true);
            expect(e.cause.status).toBe(404);
        });

        it('check RouteParameters.component creation', async () => {
            class Page implements RouterView {
                '@route': Route;
                constructor(route: Route) { this['@route'] = route; }
                get name(): string { return 'I was born from an class.'; }
            }

            const syncFactory = (route: Route): RouterView => {
                return {
                    name: 'I was born from an sync-factory.',
                    '@route': route,
                };
            };

            const asyncFactory = async (route: Route): Promise<RouterView> => { // eslint-disable-line @typescript-eslint/require-await
                return {
                    name: 'I was born from an async-factory.',
                    '@route': route,
                };
            };

            const stub = { onCallback };
            const router = await createRouterWrap({
                initialPath: '/object',
                routes: [
                    {
                        path: '/object',
                        component: { name: 'I was born from an object.' },
                    },
                    {
                        path: '/class',
                        component: Page,
                    },
                    {
                        path: '/sync-factory',
                        component: syncFactory,
                    },
                    {
                        path: '/async-factory',
                        component: asyncFactory,
                    },
                ],
            });
            router.on('error', stub.onCallback);

            await waitFrame(router);

            let view: RouterView & { name: string; } = (router.currentRoute as any)['@params'].instance;
            expect(view).toBeDefined();
            expect(view.name).toBe('I was born from an object.');
            expect(view['@route']).toBeDefined();

            await router.navigate('/class');

            view = (router.currentRoute as any)['@params'].instance;
            expect(view).toBeDefined();
            expect(view.name).toBe('I was born from an class.');
            expect(view['@route']).toBeDefined();

            await router.navigate('/sync-factory');

            view = (router.currentRoute as any)['@params'].instance;
            expect(view).toBeDefined();
            expect(view.name).toBe('I was born from an sync-factory.');
            expect(view['@route']).toBeDefined();

            await router.navigate('/async-factory');

            view = (router.currentRoute as any)['@params'].instance;
            expect(view).toBeDefined();
            expect(view.name).toBe('I was born from an async-factory.');
            expect(view['@route']).toBeDefined();
        });
    });
});
