/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/await-thenable,
 */

import { RESULT_CODE } from '@cdp/result';
import { webRoot, clearTemplateCache } from '@cdp/web-utils';
import { Route, Router } from '@cdp/router';
import {
    AppContextOptions,
    AppContext,
    PageView,
} from '@cdp/app';
import { prepareIFrameElements, cleanupTestElements } from './tools';

describe('page-view spec', () => {

    beforeEach(() => {
        clearTemplateCache();
    });

    afterEach(() => {
        cleanupTestElements();
    });

    const prepareQueryContext = async (): Promise<{ el: Document | null; window: Window | null; }> => {
        const iframe = await prepareIFrameElements();
        const { history } = iframe.contentWindow!;
        history.replaceState(null, '', webRoot);
        return { el: iframe.contentDocument, window: iframe.contentWindow };
    };

    class TestView extends PageView {
        get path(): string {
            return this._route!.path;
        }
        get url(): string {
            return this._route!.url;
        }
        get router(): Router | undefined {
            return this._router;
        }
    }

    it('check instance', () => {
        expect(PageView).toBeDefined();
    });

    it('for coverage: init fail', async () => {
        try {
            await AppContext();
//          fail();
        } catch (e) {
            expect(e.message).toBe('AppContext should be initialized with options at least once.');
            expect(e.code).toBe(RESULT_CODE.ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED);
        }
        expect(AppContext).toBeDefined();
    });

    it('check life-cycle', async () => {
        const { el, window } = await prepareQueryContext();
        const app = AppContext({
            initialPath: '/one',
            main: '#test-app',
            el,
            window,
            routes: [
                {
                    path: '/one',
                    component: TestView,
                    content: '<div class="router-page" style="position: absolute; width: 10px; height: 10px;">ONE</div>',
                },
                {
                    path: '/two',
                    component: TestView,
                    content: '<div class="router-page" style="position: absolute; width: 10px; height: 10px;">TWO</div>',
                },
                {
                    path: '/three',
                    component: TestView,
                    content: '<div class="router-page" style="position: absolute; width: 10px; height: 10px;">THREE</div>',
                },
            ],
            reset: true,
        } as AppContextOptions);

        await app.ready;

        const view1 = app.activePage as TestView;
        expect(view1.path).toBe('/one');
        expect(view1.$el.text()).toBe('ONE');
        expect(view1.router === app.router).toBe(true);
        expect(view1.active).toBe(true);

        await app.router.navigate('/two');

        const view2 = app.activePage as TestView;
        expect(view2.path).toBe('/two');
        expect(view2.$el.text()).toBe('TWO');
        expect(view2.router === app.router).toBe(true);
        expect(view2.active).toBe(true);
        expect(view1.active).toBe(false);

        await app.router.navigate('/three');

        const view3 = app.activePage as TestView;
        expect(view3.path).toBe('/three');
        expect(view3.$el.text()).toBe('THREE');
        expect(view3.router === app.router).toBe(true);
        expect(view3.active).toBe(true);
        expect(view2.active).toBe(false);
        expect(view1.active).toBe(false);

        await app.router.back();

        expect(view3.active).toBe(false);
        expect(view2.active).toBe(true);
        expect(view1.active).toBe(false);
    });

    it('check same page instance', async () => {
        const { el, window } = await prepareQueryContext();
        const app = AppContext({
            initialPath: '/one',
            main: '#test-app',
            el,
            window,
            routes: [
                {
                    path: '/one',
                    component: TestView,
                    content: '<div class="router-page" style="position: absolute; width: 10px; height: 10px;">ONE</div>',
                },
                {
                    /*
                     * path-to-regexp v7+
                     * あいまいなパス表記の厳格化
                     * https://github.com/pillarjs/path-to-regexp#errors
                     */
                    path: '/two{/:mode}?',
//                  path: '/two/:mode?',
                    component: TestView,
                    content: '<div class="router-page" style="position: absolute; width: 10px; height: 10px;">TWO</div>',
                },
            ],
            reset: true,
        } as AppContextOptions);

        await app.ready;

        const view1 = app.activePage as TestView;
        expect(view1.path).toBe('/one');
        expect(view1.$el.text()).toBe('ONE');
        expect(view1.router === app.router).toBe(true);
        expect(view1.active).toBe(true);

        await app.router.navigate('/two/normal');

        const view2 = app.activePage as TestView;
        expect(view2.path).toBe('/two{/:mode}?');
        expect(view2.url).toBe('/two/normal');
        expect(view2.$el.text()).toBe('TWO');
        expect(view2.router === app.router).toBe(true);
        expect(view2.active).toBe(true);
        expect(view1.active).toBe(false);

        await app.router.navigate('/two/alternative');

        const view3 = app.activePage as TestView;
        expect(view3.path).toBe('/two{/:mode}?');
        expect(view3.url).toBe('/two/alternative');
        expect(view3.$el.text()).toBe('TWO');
        expect(view3.router === app.router).toBe(true);
        expect(view3.active).toBe(true);
        expect(view3).toBe(view2);
        expect(view1.active).toBe(false);
    });

    it('for coverage', async () => {
        const { el, window } = await prepareQueryContext();
        const app = AppContext({ main: '#test-app', el, window, reset: true } as AppContextOptions);
        const route: Route = {
            url: 'test://test.com',
            path: 'temp',
            query: {},
            params: {},
            router: app.router,
            el: app.router.el,
        };

        try {
            const view = new TestView(route, { el: app.router.el });
            (view as any).pageInit({ to: route });
            view.render();
        } catch {
            fail();
        }
    });
});
