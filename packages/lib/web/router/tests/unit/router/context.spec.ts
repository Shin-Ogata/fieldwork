/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    createRouter,
    createMemoryHistory,
} from '@cdp/router';
import { prepareIFrameElements, cleanupTestElements } from '../tools';

describe('router/context spec', () => {

    afterEach(() => {
        cleanupTestElements();
    });

    it('check instance', async () => {
        const iframe = await prepareIFrameElements();
        expect(createRouter).toBeDefined();
        const router = createRouter('#test-router', { el: iframe.contentDocument, document: iframe.contentDocument });
        expect(router).toBeDefined();
        expect(router.$el).toBeDefined();
        expect(router.$el.length).toBe(1);
        expect(router.el).toBeDefined();
    });

    it('cover history mode', async () => {
        const history = createMemoryHistory('');
        const iframe = await prepareIFrameElements();

        const router = createRouter('#test-router', { history, el: iframe.contentDocument, document: iframe.contentDocument });
        expect(router).toBeDefined();
        expect(router.$el).toBeDefined();

        const router2 = createRouter('#test-router', { history: 'memory', el: iframe.contentDocument, document: iframe.contentDocument });
        expect(router2).toBeDefined();
        expect(router2.$el).toBeDefined();
    });

    it('check creation error', () => {
        expect(() => createRouter('#test-router'))
            .toThrow(new Error('Router element not found. [selector: #test-router]'));
    });

});
