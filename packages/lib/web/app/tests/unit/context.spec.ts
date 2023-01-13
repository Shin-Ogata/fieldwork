/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-non-null-assertion,
 */

import { safe } from '@cdp/core-utils';
import { RESULT_CODE } from '@cdp/result';
import {
    webRoot,
    clearTemplateCache,
    waitFrame,
} from '@cdp/web-utils';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import {
    Page,
    Route,
    RouteChangeInfo,
} from '@cdp/router';
import {
    Orientation,
    AppContextOptions,
    AppContext,
    registerPage,
} from '@cdp/app';
import { prepareIFrameElements, cleanupTestElements } from './tools';

describe('context spec', () => {

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

    const prepareQueryContext = async (additionalStyle?: string): Promise<{ el: Document | null; window: Window | null; }> => {
        const iframe = await prepareIFrameElements(additionalStyle);
        const { history } = iframe.contentWindow as Window;
        history.replaceState(null, '', webRoot);
        return { el: iframe.contentDocument, window: iframe.contentWindow };
    };

    it('check instance', () => {
        expect(AppContext).toBeDefined();
        expect(registerPage).toBeDefined();
    });

    it('check initialize', async () => {
        try {
            await AppContext();
//          fail();
        } catch (e) {
            expect(e.message).toBe('AppContext should be initialized with options at least once.');
            expect(e.code).toBe(RESULT_CODE.ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED);
        }

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const { el, window } = await prepareQueryContext();
        const app = AppContext({ main: '#test-app', el, window, routes: [{ path: '/' }], reset: true } as AppContextOptions);
        app.on('ready', stub.onCallback);

        await app.ready;

        expect(stub.onCallback).toHaveBeenCalledWith(app);

        const app2 = AppContext();
        expect(app).toBe(app2);
    });

    it('check properties', async () => {
        const { el, window } = await prepareQueryContext();
        // fail for first page routing
        const app = AppContext({ main: '#test-app', el, window, reset: true } as AppContextOptions);
        await app.ready;
        expect(app.router).toBeDefined();
        expect(app.activePage).toBeDefined();
        app.extension = { any: 'true' };
        expect(app.extension).toEqual({ any: 'true' });
    });

    it('check registerPage & localize', async () => {
        class RouterPage implements Page {
            '@route': Route;
            '@options'?: unknown;
            private _$el!: DOM;
            constructor(route: Route) { this['@route'] = route; }
            get name(): string { return 'I was born from an class.'; }
            get $el(): DOM { return this._$el; }
            pageInit(info: RouteChangeInfo): void {
                this._$el = $(info.to.el);
            }
        }

        registerPage({
            path: '/first',
            component: RouterPage,
            content: {
                selector: '#test-content-creation',
                url: '../res/app/test.tpl',
            },
        });

        const { el, window } = await prepareQueryContext();
        const app = AppContext({
            main: '#test-app', el, window,
            initialPath: '/first',
            i18n: {
                lng: 'ja',
                fallbackLng: 'en',
                namespace: 'messages',
                resourcePath: '../res/app/locales/{{ns}}.{{lng}}.json',
                fallbackResources: {
                    'ja': 'ja-JP',
                    'en': 'en-US',
                },
            },
            reset: true,
        } as AppContextOptions);

        await new Promise(resolve => {
            app.router.on('mounted', () => resolve());
        });

        const page = app.activePage as RouterPage;
        expect(page).toBeDefined();
        expect(page.$el.text()).toBe('サポート');
    });

    it('check remove splash screen', async () => {
        const { el, window } = await prepareQueryContext();
        const app = AppContext({ main: '#test-app', el, window, splash: '#splash', routes: [{ path: '/' }], reset: true } as AppContextOptions);
        await app.ready;
        const $splash = $(window?.document.body).find('#splash');
        expect($splash.length).toBe(0);
    });

    it('for coverage: error case', async () => {
        try {
            await AppContext({ reset: true } as AppContextOptions);
            fail();
        } catch (e) {
            expect(e.message).toBe('Router element not found. [selector: #app]');
            expect(e.code).toBe(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND);
        }

        // window.onerror, onunhandledrejection は jasmine が先に拾うため, 確認の詳細は tests/dev で実施
        const { el, window } = await prepareQueryContext();
        const app = AppContext({ main: '#test-app', el, window, routes: [{ path: '/' }], reset: true } as AppContextOptions) as any;
        app.onGlobalError(new ErrorEvent('error', {
            colno: 0,
            error: new Error('test'),
            filename: 'test',
            lineno: 0,
            message: 'test',
        }));
        app.onGlobalUnhandledRejection(new PromiseRejectionEvent('unhandledrejection', {
            promise: null!,
            reason: 'test',
        }));
    });

    it('for coverage: wait ready', async () => {
        const { el, window } = await prepareQueryContext();
        const main = el?.getElementById('test-app');
        expect(main).toBeDefined();

        let win: Window;
        win = safe(win!); // eslint-disable-line prefer-const
        let fireReady: () => void;

        const promise = new Promise(resolve => {
            Object.assign(win, {
                document: {
                    readyState: 'loading',
                    addEventListener: (event: string, callback: () => void) => {
                        if ('DOMContentLoaded' === event) {
                            fireReady = callback;
                            resolve();
                        }
                    },
                },
                requestAnimationFrame: window?.requestAnimationFrame, // eslint-disable-line @typescript-eslint/unbound-method
            });
        });

        const app = AppContext({ main: '#test-app', el, window: win, routes: [{ path: '/' }], reset: true } as AppContextOptions);
        await promise;

        expect(fireReady!).toBeDefined();
        fireReady!();

        await app.ready;
    });

    it('for coverage: orientation LANDSCAPE', async () => {
        const { el, window } = await prepareQueryContext();
        const app = AppContext({ main: '#test-app', el, window, routes: [{ path: '/' }], reset: true } as AppContextOptions);
        expect(app.orientation).toBe(Orientation.LANDSCAPE);
    });

    it('for coverage: orientation PORTRAIT', async () => {
        const { el, window } = await prepareQueryContext('width: 100px; height: 200px');
        const app = AppContext({ main: '#test-app', el, window, routes: [{ path: '/' }], reset: true } as AppContextOptions);
        expect(app.orientation).toBe(Orientation.PORTRAIT);
    });

    it('for coverage: event extension', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const { el, window } = await prepareQueryContext();
        const wait = (): Promise<void> => waitFrame(2, window?.requestAnimationFrame); // eslint-disable-line @typescript-eslint/unbound-method

        const app = AppContext({ main: '#test-app', el, window, routes: [{ path: '/' }], reset: true } as AppContextOptions);

        app.on('backbutton', stub.onCallback);
        app.on('orientationchange', stub.onCallback);

        await app.ready;

        const $doc = $(window?.document);

        $doc.trigger('backbutton' as any);
        await wait();

        const ev = callbackArgs[0] as Event;
        callbackArgs.length = 0;

        expect(ev).toBeDefined();
        expect(ev.type).toBe('backbutton');

        $doc.trigger('orientationchange' as any);
        await wait();

        const orientation = callbackArgs[0] as Orientation;
        const angle = callbackArgs[1] as number;
        callbackArgs.length = 0;

        expect(orientation).toBe(Orientation.LANDSCAPE);
        expect(angle).toBe(0);
    });

    it('for coverage: custom document event ready', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const { el, window } = await prepareQueryContext();
        const wait = (): Promise<void> => waitFrame(2, window?.requestAnimationFrame); // eslint-disable-line @typescript-eslint/unbound-method
        const $doc = $(window?.document);

        const app = AppContext({ main: '#test-app', el, window, documentEventReady: 'deviceready', routes: [{ path: '/' }], reset: true } as AppContextOptions);

        await wait();

        $doc.trigger('deviceready' as any);

        await app.ready;
        expect('finished').toBeDefined();
    });
});
