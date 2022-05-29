/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { UnknownFunction } from '@cdp/core-utils';
import { RESULT_CODE } from '@cdp/result';
import {
    RouterEventArg,
    Route,
    RouterConstructionOptions,
    Router,
    createRouter,
    createMemoryHistory,
} from '@cdp/router';
import { prepareIFrameElements, cleanupTestElements } from '../tools';

describe('router/context spec', () => {

    let count: number;

    beforeEach(() => {
        count = 0;
    });

    afterEach(() => {
        cleanupTestElements();
    });

    const onCallback = (...args: any[]): void => { // eslint-disable-line @typescript-eslint/no-unused-vars
        count++;
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
            expect(router.$el).toBeDefined();
            expect(router.$el.length).toBe(1);
            expect(router.el).toBeDefined();
        });

        it('cover history mode', async () => {
            const history = createMemoryHistory('');
            const router = await createRouterWrap({ history });

            expect(router).toBeDefined();
            expect(router.$el).toBeDefined();

            const router2 = await createRouterWrap({ history: 'memory' });
            expect(router2).toBeDefined();
            expect(router2.$el).toBeDefined();
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

            expect(router.currentRoute).toEqual({
                url: '/',
                path: '/',
                query: {},
                params: {},
                '@id': '',
                '@origin': true,
            } as Route);
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

            expect(router.currentRoute).toEqual({
                url: '/',
                path: '/',
                query: {},
                params: {},
                '@id': '',
                '@origin': true,
            } as Route);
        });
    });

    describe('simple navigate method', () => {
        it('Router#currentRoute', async () => {
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/one' },
                    { path: '/two' }
                ],
            });

            await waitFrame(router);
            expect(router.currentRoute.path).toBe('/');

            await router.navigate('/one');
            expect(router.currentRoute.path).toBe('/one');

            await router.navigate('/two');
            expect(router.currentRoute.path).toBe('/two');

            try {
                await router.navigate('/three');
                fail();
            } catch (e) {
                expect(e.message).toBe('Route not found. [to: /three]');
            }
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
            const router = await createRouterWrap({
                routes: [
                    { path: '/' },
                    { path: '/params/user/:userId/post/:postId' },
                ],
            });

            await waitFrame(router);

            try {
                await router.navigate('/params/user/:userId/post/:postId', {
                    params: {
                        postId: 12,
                    }
                });
                fail();
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED);
                expect(e.message).toBe('Construct route destination failed. [path: /params/user/:userId/post/:postId, detail: TypeError: Expected "userId" to be a string]');
                expect(e.cause.message).toBe('Expected "userId" to be a string');
            }
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
            expect(count).toBe(0);
        });
    });
});
