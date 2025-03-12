/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { sleep } from '@cdp/core-utils';
import { RESULT_CODE } from '@cdp/result';
import {
    webRoot,
    clearTemplateCache,
    waitFrame as _waitFrame,
} from '@cdp/web-utils';
import {
    type DOM,
    dom as $,
} from '@cdp/dom';
import {
    type RouteChangeInfo,
    type Page,
    type Route,
    RouterRefreshLevel,
    type RouterConstructionOptions,
    type Router,
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

    const onCallback = (...args: any[]): void => {
        callbackArgs.length = 0;
        callbackArgs.push(...args);
//      console.log(`received: ${JSON.stringify([...args])} \n`);
    };

    const getWindow = (instance: Router): Window => {
        return (instance as any)._history._window as Window;
    };

    const WAIT_FRAME_MARGINE = 5;

    const waitFrame = async (instance: Router, frameCount = WAIT_FRAME_MARGINE): Promise<void> => {
        const { requestAnimationFrame } = getWindow(instance); // eslint-disable-line @typescript-eslint/unbound-method
        await _waitFrame(frameCount, requestAnimationFrame);
    };

    const evClick = (): Event => new Event('click', { cancelable: true, bubbles: true });

    const prepareQueryContext = async (): Promise<{ el: Document | null; window: Window | null; }> => {
        const iframe = await prepareIFrameElements();
        const { history } = iframe.contentWindow!;
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
                message: 'Route cannot be resolved. [path: /]',
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

        it('transition settings', async () => {
            const router = await createRouterWrap({
                routes: [{ path: '/' }],
                transition: {
                    default: 'fade',
                    'enter-active-class': 'animate__animated animate__tada',
                    'leave-active-class': 'animate__animated animate__bounceOutRight',
                },
            });

            await waitFrame(router);

            const old = router.transitionSettings({ default: 'slide' });
            expect(old).toEqual({
                default: 'fade',
                reload: 'none',
                'enter-active-class': 'animate__animated animate__tada',
                'leave-active-class': 'animate__animated animate__bounceOutRight',
            });

            const old2 = router.transitionSettings(old);
            expect(old2).toEqual({
                default: 'slide',
                reload: 'none',
                'enter-active-class': 'animate__animated animate__tada',
                'leave-active-class': 'animate__animated animate__bounceOutRight',
            });
        });

        it('navigation settings', async () => {
            const router = await createRouterWrap({
                routes: [{ path: '/' }],
            });

            await waitFrame(router);

            const old = router.navigationSettings({ method: 'replace' });
            expect(old).toEqual({
                method: 'push',
            });

            const old2 = router.navigationSettings(old);
            expect(old2).toEqual({
                method: 'replace',
            });
        });

        it('additionalStack settings', async () => {
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/one' },
                    { path: '/two' },
                ],
                additionalStacks: [
                    { path: '/one' },
                    { path: '/two' }
                ]
            });

            await waitFrame(router);

            expect(router.currentRoute.path).toBe('/two');
            expect((router as any)._history.stack.length).toBe(3);
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
            void router.register({ path: '/', });
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

        it('Router#register w/ refresh', async () => {
            const router = await createRouterWrap({ start: false });
            void router.register({ path: '/', }, true);

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
                    { path: '/two', content: '<div class="router-page"></div>' }
                ],
            });

            await waitFrame(router);
            await router.navigate('/one');
            await router.navigate('/two');
            expect(router.currentRoute.path).toBe('/two');

            expect(router.canBack).toBe(true);
            await router.back();
            expect(router.currentRoute.path).toBe('/one');
            expect(router.canBack).toBe(true);
            await router.back();
            expect(router.currentRoute.path).toBe('/');
            expect(router.canBack).toBe(false);
            await router.back();
            expect(router.currentRoute.path).toBe('/');

            expect(router.canForward).toBe(true);
            await router.forward();
            expect(router.canForward).toBe(true);
            expect(router.currentRoute.path).toBe('/one');
            expect(router.canForward).toBe(true);
            await router.forward();
            expect(router.currentRoute.path).toBe('/two');
            expect(router.canForward).toBe(false);
            await router.forward();
            expect(router.currentRoute.path).toBe('/two');

            // check assignStateElement()
            await router.back();
            await router.navigate('/two');
            expect(router.currentRoute.path).toBe('/two');
        });

        it('Router#traverseTo', async () => {
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

            await router.traverseTo('/');
            expect(router.currentRoute.path).toBe('/');

            await router.traverseTo('/one');
            expect(router.currentRoute.path).toBe('/one');

            await router.traverseTo('/three');
            expect(router.currentRoute.path).toBe('/one');
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
                    { path: '/', content: '<div class="router-page root"></div>' },
                    { path: '/params/user/:userId/post/:postId', content: '<div class="router-page"></div>' },
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

            // check same page instance
            await router.navigate('/params/user/:userId/post/:postId', {
                params: {
                    userId: 200,
                    postId: 24,
                }
            });

            expect(router.currentRoute.url).toBe('/params/user/200/post/24');
            expect(router.currentRoute.path).toBe('/params/user/:userId/post/:postId');
            expect(router.currentRoute.params).toEqual({
                userId: 200,
                postId: 24,
            });

            await router.navigate('/');

            await router.navigate('/params/user/:userId/post/:postId', {
                params: {
                    userId: 300,
                    postId: 36,
                }
            });

            expect(router.currentRoute.url).toBe('/params/user/300/post/36');
            expect(router.currentRoute.path).toBe('/params/user/:userId/post/:postId');
            expect(router.currentRoute.params).toEqual({
                userId: 300,
                postId: 36,
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
            expect(e.message).toBe('Construct route destination failed. [path: /params/user/:userId/post/:postId, detail: TypeError: Missing parameters: userId]');
            expect(e.cause.message).toBe('Missing parameters: userId');
        });

        it('illegal path params2', async () => {
            const stub = { onCallback };
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/params{/:mode}?' }, // "?" is no longer supported.
                ],
            });
            router.on('error', stub.onCallback);

            await waitFrame(router);

            await router.navigate('/params/normal');

            const e = callbackArgs[0];

            expect(e.code).toBe(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED);
            expect(e.message).toBe('Route navigate failed.');
            expect(e.cause.message).toBe(`Cannot read properties of undefined (reading 'test')`);
        });

        it('navigation cancellation', async () => {
            const cancelCallback = (event: RouteChangeInfo, cancel: (reason?: unknown) => void): boolean => {
                cancel('[test] changing not allowed');
                return true;
            };

            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/one' },
                ],
            });

            await waitFrame(router);

            router.on('will-change', cancelCallback);
            router.on('changed', stub.onCallback);

            await router.navigate('/one');

            expect(router.currentRoute.path).toBe('/');
            expect(stub.onCallback).not.toHaveBeenCalled();
        });

        it('wait client process', async () => {
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    {
                        path: '/one',
                        component: {
                            pageInit() {
                                // you can return the promise instance for waiting client side procedure.
                                return Promise.resolve();
                            }
                        },
                    },
                ],
            });

            await waitFrame(router);

            let processed = false;
            router.on('before-transition', (changeInfo: RouteChangeInfo) => {
                // you can register the promise instance when using pub-sub infrasturcture
                changeInfo.asyncProcess.register((async () => { // eslint-disable-line @typescript-eslint/require-await
                    processed = true;
                })());
            });

            await router.navigate('/one');
            expect(processed).toBe(true);
        });

        it('supress navigate in change-page proc', async () => {
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    {
                        path: '/one',
                        component: {
                            pageAfterEnter() {
                                return sleep(100);
                            }
                        },
                    },
                ],
            });

            await waitFrame(router);

            router.on('before-transition', (info) => {
                expect(info.to.path).toBe('/one');
                void router.back();
            });

            await router.navigate('/one');
            expect(router.currentRoute.path).toBe('/one');
        });

        it('check RouteParameters.content creation', async () => {
            const { el, window: win } = await prepareQueryContext();

            const elTemplate = document.createElement('template');
            elTemplate.innerHTML = '<div class="router-page" style="position: absolute; width: 10px; height: 10px;">template from template-element</div>';

            const stub = { onCallback };
            const router = createRouter('#test-router', Object.assign({ el, win }, {
                initialPath: '/string',
                routes: [
                    {
                        path: '/string',
                        content: '<div class="router-page" style="position: absolute; width: 10px; height: 10px;">template from string</div>',
                    },
                    {
                        path: '/dom',
                        content: $('<div class="router-page" style="position: absolute; width: 10px; height: 10px;">template from DOM</div>'),
                    },
                    {
                        path: '/function',
                        content () {
                            return '<div class="router-page" style="position: absolute; width: 10px; height: 10px;">template from function</div>';
                        },
                    },
                    {
                        path: '/template-el',
                        content: elTemplate,
                    },
                    {
                        path: '/dom-connected',
                        content: $('#test-initial-page', win?.document),
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
            }));
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

            await router.navigate('/dom');

            $template = (router.currentRoute as any)['@params'].$template;
            $el = $(router.currentRoute.el);

            expect($template).toBeDefined();
            expect($template.length).toBe(1);
            expect($template.text()).toBe('template from DOM');
            expect($el).toBeDefined();
            expect($el.length).toBe(1);
            expect($el.text()).toBe('template from DOM');
            expect($el !== $template).toBe(true);

            await router.navigate('/function');

            $template = (router.currentRoute as any)['@params'].$template;
            $el = $(router.currentRoute.el);

            expect($template).toBeDefined();
            expect($template.length).toBe(1);
            expect($template.text()).toBe('template from function');
            expect($el).toBeDefined();
            expect($el.length).toBe(1);
            expect($el.text()).toBe('template from function');
            expect($el !== $template).toBe(true);

            await router.navigate('/template-el');

            $template = (router.currentRoute as any)['@params'].$template;
            $el = $(router.currentRoute.el);

            expect($template).toBeDefined();
            expect($template.length).toBe(1);
            expect($template.text()).toBe('template from template-element');
            expect($el).toBeDefined();
            expect($el.length).toBe(1);
            expect($el.text()).toBe('template from template-element');
            expect($el !== $template).toBe(true);

            await router.navigate('/dom-connected');

            $template = (router.currentRoute as any)['@params'].$template;
            $el = $(router.currentRoute.el);

            expect($template).toBeDefined();
            expect($template.length).toBe(1);
            expect($template.text()).toBe('template from connected DOM');
            expect($el).toBeDefined();
            expect($el.length).toBe(1);
            expect($el.text()).toBe('template from connected DOM');
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
            const changes: RouteChangeInfo[] = [];
            class RouterPage implements Page {
                '@route': Route;
                '@options'?: unknown;
                constructor(route: Route) { this['@route'] = route; }
                get name(): string { return 'I was born from an class.'; }
                pageInit(info: RouteChangeInfo): void {
                    changes.push(info);
                }
            }

            const syncFactory = (route: Route): RouterPage => {
                return {
                    name: 'I was born from an sync-factory.',
                    '@route': route,
                    pageInit(info: RouteChangeInfo) {
                        changes.push(info);
                    }
                };
            };

            const asyncFactory = async (route: Route, options?: unknown): Promise<RouterPage> => { // eslint-disable-line @typescript-eslint/require-await
                return {
                    name: 'I was born from an async-factory.',
                    '@route': route,
                    '@options': options,
                } as RouterPage;
            };

            const stub = { onCallback };
            const router = await createRouterWrap({
                initialPath: '/object',
                routes: [
                    {
                        path: '/object',
                        component: { name: 'I was born from an object.', pageInit(info: RouteChangeInfo) { changes.push(info); } },
                    },
                    {
                        path: '/class',
                        component: RouterPage,
                    },
                    {
                        path: '/sync-factory',
                        component: syncFactory,
                    },
                    {
                        path: '/async-factory',
                        component: asyncFactory,
                        componentOptions: { className: 'test' },
                    },
                ],
            });
            router.on('error', stub.onCallback);

            await waitFrame(router);

            let page: Page & { name: string; } = (router.currentRoute as any)['@params'].page;
            expect(page).toBeDefined();
            expect(page.name).toBe('I was born from an object.');
            expect(page['@route']).toBeDefined();
            expect(changes.length).toBe(1);

            await router.navigate('/class');

            page = (router.currentRoute as any)['@params'].page;
            expect(page).toBeDefined();
            expect(page.name).toBe('I was born from an class.');
            expect(page['@route']).toBeDefined();
            expect(changes.length).toBe(2);

            await router.navigate('/sync-factory');

            page = (router.currentRoute as any)['@params'].page;
            expect(page).toBeDefined();
            expect(page.name).toBe('I was born from an sync-factory.');
            expect(page['@route']).toBeDefined();
            expect(changes.length).toBe(3);

            await router.navigate('/async-factory');

            page = (router.currentRoute as any)['@params'].page;
            expect(page).toBeDefined();
            expect(page.name).toBe('I was born from an async-factory.');
            expect(page['@route']).toBeDefined();
            expect(page['@options']).toEqual({ className: 'test' });
            expect(changes.length).toBe(3);
        });

        it('illegal case', async () => {
            const stub = { onCallback };
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/one' },
                ],
            });
            router.on('error', stub.onCallback);

            await waitFrame(router);
            expect(router.currentRoute.path).toBe('/');

            // for coverage
            delete (router as any)._lastRoute['@params'].page;

            await router.navigate('/one');
            expect(router.currentRoute.path).toBe('/one');
        });
    });

    describe('navigate transition', () => {
        it('check animation', async () => {
            const styleText = `
@keyframes fadein {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes fadeout {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

.fade-leave-active {
    opacity: 0;
    animation-duration: 500ms;
    animation-name: fadeout;
}

.fade-enter-active {
    opacity: 1;
    animation-duration: 500ms;
    animation-name: fadein;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}`;

            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    {
                        path: '/',
                        content: '<div class="router-page">first page</div>',
                    },
                    {
                        path: '/next',
                        content: '<div class="router-page">second page</div>',
                    },
                ],
            });
            router.on(['before-transition', 'after-transition'], stub.onCallback);

            const win = getWindow(router);
            const style = win.document.createElement('style');
            style.textContent = styleText;
            win.document.head.append(style);

            await waitFrame(router);

            await router.navigate('/next', { transition: 'fade' });

            expect(stub.onCallback).toHaveBeenCalled();
        });

        it('check transition', async () => {
            const styleText = `
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}`;

            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    {
                        path: '/',
                        content: '<div class="router-page">first page</div>',
                    },
                    {
                        path: '/next',
                        content: '<div class="router-page">second page</div>',
                    },
                ],
            });
            router.on(['before-transition', 'after-transition'], stub.onCallback);

            const win = getWindow(router);
            const style = win.document.createElement('style');
            style.textContent = styleText;
            win.document.head.append(style);

            await waitFrame(router);

            await router.navigate('/next', { transition: 'fade' });

            expect(stub.onCallback).toHaveBeenCalled();
        });

        it('check transition reverse', async () => {
            const styleText = `
.fade-enter-active,
.fade-leave-active {
    transition: opacity 500ms ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}`;

            const router = await createRouterWrap({
                initialPath: '/first',
                routes: [
                    {
                        path: '/first',
                        content: '<div class="router-page">first page</div>',
                    },
                    {
                        path: '/second',
                        content: '<div class="router-page">second page</div>',
                    },
                ],
            });
            const win = getWindow(router);
            const style = win.document.createElement('style');
            style.textContent = styleText;
            win.document.head.append(style);

            await waitFrame(router);

            router.on('before-transition', () => {
                expect(router.el.classList.contains('cdp-transition-running')).toBe(true);
                expect(router.el.classList.contains('cdp-transition-direction-back')).toBe(true);
            });

            await router.navigate('/second', { transition: 'fade', reverse: true });

            router.off();

            router.on('before-transition', () => {
                expect(router.el.classList.contains('cdp-transition-running')).toBe(true);
                expect(router.el.classList.contains('cdp-transition-direction-forward')).toBe(true);
            });

            await router.back();
        });
    });

    describe('anchor handling', () => {
        it('check anchor navigate', async () => {
            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    {
                        path: '/',
                        content: `
<div class="router-page">
    first page
    <a href="/next" id="to-next">Next Page</a>
</div>`,
                    },
                    {
                        path: '/next',
                        content: '<div class="router-page">second page</div>',
                    },
                ],
            });

            await waitFrame(router);

            const $button = $(router.el).find('#to-next');
            expect($button.length).toBe(1);

            $button[0].dispatchEvent(evClick());
            await waitFrame(router);

            expect(router.currentRoute.path).toBe('/next');
        });

        it('check anchor navigate back', async () => {
            const router = await createRouterWrap({
                initialPath: '/first',
                routes: [
                    {
                        path: '/first',
                        content: '<div class="router-page">first page</div>',
                    },
                    {
                        path: '/second',
                        content: `
<div class="router-page">
    second page
    <a href="#" id="to-back">Second Page</a>
</div>`,
                    },
                ],
            });

            await waitFrame(router);
            await router.navigate('/second');

            const $button = $(router.el).find('#to-back');
            expect($button.length).toBe(1);

            $button[0].dispatchEvent(evClick());
            await waitFrame(router);

            expect(router.currentRoute.path).toBe('/first');
        });

        it('check anchor navigate replace', async () => {
            const router = await createRouterWrap({
                initialPath: '/first',
                routes: [
                    {
                        path: '/first',
                        content: `
<div class="router-page">
    first page
    <a href="/second" id="nav-replace" data-navigate-method="replace">Second Page</a>
</div>`,
                    },
                    {
                        path: '/second',
                        content: '<div class="router-page">second page</div>',
                    },
                ],
            });

            await waitFrame(router);

            const $button = $(router.el).find('#nav-replace');
            expect($button.length).toBe(1);

            $button[0].dispatchEvent(evClick());
            await waitFrame(router);

            expect(router.currentRoute.path).toBe('/second');
            expect((router as any)._history.stack.length).toBe(1);
        });

        it('check anchor navigate no handle', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    {
                        path: '/',
                        content: `
<div class="router-page">
    first page
    <a href="https://example.com" id="to-outside" data-prevent-router="true">Outside Page</a>
</div>`,
                    },
                ],
            });

            router.on('error', stub.onCallback);

            await waitFrame(router);

            const $preventRouter = $(router.el).find('#to-outside');
            expect($preventRouter.length).toBe(1);

            $preventRouter[0].dispatchEvent(evClick());

            await waitFrame(router);

            expect(stub.onCallback).not.toHaveBeenCalled();
        });
    });

    describe('dom-cache management', () => {
        it('Lv: memory', async () => {
            const router = await createRouterWrap({
                initialPath: '/first',
                routes: [
                    {
                        path: '/first',
                        content: '<div class="router-page">first page</div>',
                    },
                    {
                        path: '/second',
                        content: '<div class="router-page" data-dom-cache="memory">second page</div>',
                    },
                    {
                        path: '/third',
                        content: '<div class="router-page">third page</div>',
                    },
                    {
                        path: '/fourth',
                        content: '<div class="router-page">fourth page</div>',
                    },
                ],
            });

            await waitFrame(router);

            await router.navigate('/second');
            await router.navigate('/third');
            await router.navigate('/fourth');
            expect(router.currentRoute.path).toBe('/fourth');

            let stack = (router as any)._history.stack;

            expect(stack[0].el).toBeFalsy();
            expect(stack[1].el).toBeTruthy();
            expect(stack[1].el.isConnected).toBe(false);
            expect(stack[2].el).toBeTruthy();
            expect(stack[2].el.isConnected).toBe(true);
            expect(stack[3].el).toBeTruthy();
            expect(stack[3].el.isConnected).toBe(true);

            await router.back();
            await router.back();
            await router.back();
            expect(router.currentRoute.path).toBe('/first');

            stack = (router as any)._history.stack;

            expect(stack[0].el).toBeTruthy();
            expect(stack[0].el.isConnected).toBe(true);
            expect(stack[1].el).toBeTruthy();
            expect(stack[1].el.isConnected).toBe(true);
            expect(stack[2].el).toBeFalsy();
            expect(stack[3].el).toBeFalsy();
        });

        it('Lv: connect', async () => {
            const router = await createRouterWrap({
                initialPath: '/first',
                routes: [
                    {
                        path: '/first',
                        content: '<div class="router-page">first page</div>',
                    },
                    {
                        path: '/second',
                        content: '<div class="router-page" data-dom-cache="connect">second page</div>',
                    },
                    {
                        path: '/third',
                        content: '<div class="router-page">third page</div>',
                    },
                    {
                        path: '/fourth',
                        content: '<div class="router-page">fourth page</div>',
                    },
                ],
            });

            await waitFrame(router);

            await router.navigate('/second');
            await router.navigate('/third');
            await router.navigate('/fourth');
            expect(router.currentRoute.path).toBe('/fourth');

            let stack = (router as any)._history.stack;

            expect(stack[0].el).toBeFalsy();
            expect(stack[1].el).toBeTruthy();
            expect(stack[1].el.isConnected).toBe(true);
            expect(stack[2].el).toBeTruthy();
            expect(stack[2].el.isConnected).toBe(true);
            expect(stack[3].el).toBeTruthy();
            expect(stack[3].el.isConnected).toBe(true);

            await router.back();
            await router.back();
            await router.back();
            expect(router.currentRoute.path).toBe('/first');

            stack = (router as any)._history.stack;

            expect(stack[0].el).toBeTruthy();
            expect(stack[0].el.isConnected).toBe(true);
            expect(stack[1].el).toBeTruthy();
            expect(stack[1].el.isConnected).toBe(true);
            expect(stack[2].el).toBeFalsy();
            expect(stack[3].el).toBeFalsy();
        });
    });

    describe('page stack management', () => {
        it('standard', async () => {
            const router = await createRouterWrap({
                initialPath: '/',
                routes: [{ path: '/' }],
                start: false,
            });

            await router.pushPageStack([
                {
                    path: '/one',
                    route: { path: '/one' },
                },
                {
                    path: '/two/user/100',
                    route: { path: '/two/user/:userId' },
                    transition: 'fade',
                },
                {
                    path: '/three',
                    route: { path: '/three' },
                },
            ]);

            expect(router.currentRoute.path).toBe('/three');

            await router.back();
            expect(router.currentRoute.url).toBe('/two/user/100');

            router.on('before-transition', (changeInfo: RouteChangeInfo) => {
                expect(changeInfo.transition).toBe('fade');
                expect(changeInfo.reverse).toBeUndefined();
            });

            await router.back();

            expect((router as any)._history.stack.length).toBe(4);
        });

        it('noNavigate', async () => {
            const router = await createRouterWrap({
                initialPath: '/first',
                routes: [{ path: '/first' }],
            });

            await router.pushPageStack({
                path: '/next',
                route: { path: '/next' }
            }, { noNavigate: true });

            expect(router.currentRoute.path).toBe('/next');
            expect((router as any)._history.stack.length).toBe(2);
        });

        it('traverseTo', async () => {
            const router = await createRouterWrap({
                initialPath: '/first',
                routes: [{ path: '/first' }],
            });

            await router.pushPageStack({
                path: '/next',
                route: { path: '/next' }
            }, { traverseTo: '/first' });

            expect(router.currentRoute.path).toBe('/first');
            expect((router as any)._history.stack.length).toBe(2);
        });

        it('miss route', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const router = await createRouterWrap({
                initialPath: '/first',
                routes: [
                    { path: '/first' },
                    { path: '/second' },
                ],
                start: false,
            });
            router.on('error', stub.onCallback);

            await router.pushPageStack({ path: '/next' });

            expect(stub.onCallback).toHaveBeenCalled();
            const e = callbackArgs[0];
            expect(e.message).toBe('Route cannot be resolved. [path: /next]');
            expect(e.cause).toEqual({ path: '/next' });
        });
    });

    describe('sub-flow management', () => {
        it('standard usecase', async () => {
            const router = await createRouterWrap({
                initialPath: '/main/A',
                routes: [
                    { path: '/main/A' },
                    { path: '/main/B' },
                    { path: '/sub/a' },
                    { path: '/sub/b' },
                ],
            });

            await waitFrame(router);
            expect(router.currentRoute.path).toBe('/main/A');
            expect(router.isInSubFlow).toBe(false);

            await router.navigate('/main/B');
            expect(router.currentRoute.path).toBe('/main/B');
            expect(router.isInSubFlow).toBe(false);

            await router.beginSubFlow('/sub/a');
            expect(router.currentRoute.path).toBe('/sub/a');
            expect(router.isInSubFlow).toBe(true);

            await router.back();
            expect(router.currentRoute.path).toBe('/main/B');
            expect(router.isInSubFlow).toBe(false);

            await router.beginSubFlow('/sub/a');
            expect(router.currentRoute.path).toBe('/sub/a');
            expect(router.isInSubFlow).toBe(true);

            await router.navigate('/sub/b');
            expect(router.currentRoute.path).toBe('/sub/b');
            expect(router.isInSubFlow).toBe(true);

            await router.commitSubFlow();
            expect(router.currentRoute.path).toBe('/main/B');
            expect(router.isInSubFlow).toBe(false);
            expect((router as any)._history.stack.length).toBe(2);
        });

        it('standard usecase w/ base & additional stack', async () => {
            const router = await createRouterWrap({
                initialPath: '/main/A',
                routes: [
                    { path: '/main/A' },
                    { path: '/main/B' },
                    { path: '/sub/a' },
                    { path: '/sub/b' },
                ],
            });

            await waitFrame(router);
            expect(router.currentRoute.path).toBe('/main/A');
            expect(router.isInSubFlow).toBe(false);

            await router.navigate('/main/B');
            expect(router.currentRoute.path).toBe('/main/B');
            expect(router.isInSubFlow).toBe(false);

            await router.beginSubFlow('/sub/a', {
                base: '/main/A',
                additionalStacks: [
                    {
                        path: 'add/one',
                        route: { path: 'add/one' }
                    },
                    {
                        path: 'add/two',
                        route: { path: 'add/two' }
                    },
                ],
            });
            expect(router.currentRoute.path).toBe('/sub/a');
            expect(router.isInSubFlow).toBe(true);

            await router.navigate('/sub/b');
            expect(router.currentRoute.path).toBe('/sub/b');
            expect(router.isInSubFlow).toBe(true);

            await router.commitSubFlow();
            expect(router.currentRoute.path).toBe('/add/two');
            expect(router.isInSubFlow).toBe(false);
            expect((router as any)._history.stack.length).toBe(3);

            await router.back();
            expect(router.currentRoute.path).toBe('/add/one');
            expect(router.isInSubFlow).toBe(false);

            await router.back();
            expect(router.currentRoute.path).toBe('/main/A');
            expect(router.isInSubFlow).toBe(false);
        });

        it('cancel sub-flow', async () => {
            const router = await createRouterWrap({
                initialPath: '/main/A',
                routes: [
                    { path: '/main/A' },
                    { path: '/main/B' },
                    { path: '/sub/a' },
                    { path: '/sub/b' },
                ],
            });

            await waitFrame(router);
            expect(router.currentRoute.path).toBe('/main/A');
            expect(router.isInSubFlow).toBe(false);

            await router.navigate('/main/B');
            expect(router.currentRoute.path).toBe('/main/B');
            expect(router.isInSubFlow).toBe(false);

            await router.beginSubFlow('/sub/a', {
                base: '/main/A',
                additionalStacks: [
                    {
                        path: 'add/one',
                        route: { path: 'add/one' }
                    },
                    {
                        path: 'add/two',
                        route: { path: 'add/two' }
                    },
                ],
            });
            expect(router.currentRoute.path).toBe('/sub/a');
            expect(router.isInSubFlow).toBe(true);

            await router.navigate('/sub/b');
            expect(router.currentRoute.path).toBe('/sub/b');
            expect(router.isInSubFlow).toBe(true);

            await router.cancelSubFlow();
            expect(router.currentRoute.path).toBe('/main/B');
            expect(router.isInSubFlow).toBe(false);
            expect((router as any)._history.stack.length).toBe(2);
        });

        it('unusual case', async () => {
            const stub = { onCallback };
            const router = await createRouterWrap({
                initialPath: '/main/A',
                routes: [
                    { path: '/main/A' },
                    { path: '/main/B' },
                ],
            });
            router.on('error', stub.onCallback);

            await waitFrame(router);

            try {
                await router.commitSubFlow();
            } catch {
                fail('UNEXPECTED FLOW');
            }

            try {
                await router.cancelSubFlow();
            } catch {
                fail('UNEXPECTED FLOW');
            }

            try {
                await router.beginSubFlow('/sub/a', { base: 'invalid' });
            } catch {
                fail('UNEXPECTED FLOW');
            }

            const e = callbackArgs[0];

            expect(e.code).toBe(RESULT_CODE.ERROR_MVC_ROUTER_INVALID_SUBFLOW_BASE_URL);
            expect(e.message).toBe('Invalid sub-flow base url. [url: invalid]');
        });
    });

    describe('refresh method', () => {
        it('Router#refresh(1, 2, 3)', async () => {
            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    { path: '/', content: '<div class="router-page" data-dom-cache="connect"></div>' },
                    { path: '/one', content: '<div class="router-page"></div>' },
                    { path: '/two', content: '<div class="router-page" data-dom-cache="memory"></div>' },
                    { path: '/three', content: '<div class="router-page"></div>' },
                ],
            });

            await waitFrame(router);

            await router.navigate('/one');
            await router.navigate('/two');
            await router.navigate('/three');
            await router.back();
            expect(router.currentRoute.path).toBe('/two');

            await router.refresh();
            expect(router.currentRoute.path).toBe('/two');

            await router.refresh(RouterRefreshLevel.DOM_CLEAR);
            expect(router.currentRoute.path).toBe('/two');

            try {
                await router.refresh(3 as RouterRefreshLevel);
                expect(router.currentRoute.path).toBe('/two');
            } catch (e) {
                fail(e);
            }
        });

        it('treat w/ history', async () => {
            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    { path: '/', content: '<div class="router-page"></div>' },
                    { path: '/cache', content: '<div class="router-page" data-dom-cache="connect"></div>' },
                ],
            });

            await waitFrame(router);
            await router.navigate('/cache');
            await router.refresh(RouterRefreshLevel.DOM_CLEAR);
            await router.back();
            await router.navigate('/cache');
            await router.refresh(RouterRefreshLevel.DOM_CLEAR);
            await router.back();
            expect(router.currentRoute.path).toBe('/');
        });
    });

    describe('prefetch method', () => {
        it('check prefetch from anchor data-prefetch="true"', async () => {
            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    {
                        path: '/',
                        content: `
<div class="router-page">
    first page
    <a href="/next" id="to-next" data-prefetch="true">Next Page</a>
</div>`,
                    },
                    {
                        path: '/next',
                        content: '<div class="router-page">second page</div>',
                    },
                ],
            });

            await waitFrame(router);

            const loaded = $(router.el).children().length;
            expect(loaded).toBe(3); // `test-initial-page`, `/`, `/next`

            const $button = $(router.el).find('#to-next');
            expect($button.length).toBe(1);

            $button[0].dispatchEvent(evClick());
            await waitFrame(router);

            expect(router.currentRoute.path).toBe('/next');

            await router.back();
            expect(router.currentRoute.path).toBe('/');
        });

        it('check prefetch from anchor data-prefetch="false"', async () => {
            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    {
                        path: '/',
                        content: `
<div class="router-page">
    first page
    <a href="/next" id="to-next" data-prefetch="false">Next Page</a>
</div>`,
                    },
                    {
                        path: '/next',
                        content: '<div class="router-page">second page</div>',
                    },
                ],
            });

            await waitFrame(router);

            const loaded = $(router.el).children().length;
            expect(loaded).toBe(2); // `test-initial-page`, `/`

            const $button = $(router.el).find('#to-next');
            expect($button.length).toBe(1);

            $button[0].dispatchEvent(evClick());
            await waitFrame(router);

            expect(router.currentRoute.path).toBe('/next');
        });

        it('check prefetch from anchor data-prefetch & duplicate, invalid case', async () => {
            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    {
                        path: '/',
                        content: `
<div class="router-page">
    first page
    <a href="/next" id="to-next" data-prefetch>Next Page</a>
    <a href="/next" id="to-next-duplicate" data-prefetch>Next Page</a>
    <a href="/invalid" id="to-next-invalid" data-prefetch>Next Page</a>
</div>`,
                    },
                    {
                        path: '/next',
                        content: '<div class="router-page">second page</div>',
                    },
                ],
            });

            await waitFrame(router);

            const loaded = $(router.el).children().length;
            expect(loaded).toBe(3); // `test-initial-page`, `/`, `/next`

            const $button = $(router.el).find('#to-next-duplicate');
            expect($button.length).toBe(1);

            $button[0].dispatchEvent(evClick());
            await waitFrame(router);

            expect(router.currentRoute.path).toBe('/next');
        });

        it('check prefetch from register', async () => {
            const router = await createRouterWrap({
                initialPath: '/',
                routes: [
                    {
                        path: '/',
                        content: '<div class="router-page">first page</div>'
                    },
                    {
                        path: '/next',
                        content: '<div class="router-page">second page</div>',
                        prefetch: '/next',
                    },
                ],
            });

            await waitFrame(router);

            const loaded = $(router.el).children().length;
            expect(loaded).toBe(3); // `test-initial-page`, `/`, `/next`

            await router.navigate('/next');
            expect(router.currentRoute.path).toBe('/next');
        });
    });
});
