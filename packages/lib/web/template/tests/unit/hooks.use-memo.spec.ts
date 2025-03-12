import {
    type TemplateResult,
    html,
    render,
    hooks,
} from '@cdp/template';
import type { UnknownFunction } from '@cdp/core-utils';
import { waitFrame } from '@cdp/web-utils';
import type { DOM } from '@cdp/dom';
import { prepare, cleanup } from './tools';

describe('hooks/use-memo spec', () => {
    const { useState, useMemo } = hooks;
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(useMemo).toBeDefined();
    });

    it('should return the same value when the inputs are the same', async () => {
        let memoizedValue!: number;
        let requestRender!: UnknownFunction;
        let timesRendered = 0;
        const value = 2;

        function App(): TemplateResult {
            [, requestRender] = useState(0);
            timesRendered++;
            memoizedValue = useMemo(() => value * 2, [value]);
            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(memoizedValue).toBe(4);

        requestRender();
        await waitFrame();

        expect(memoizedValue).toBe(4);
        expect(timesRendered).toBe(2);
    });

    it('should return a new value when the inputs are different', async () => {
        let memoizedValue!: number;
        let set!: UnknownFunction;
        let timesRendered = 0;

        function App(): TemplateResult {
            const [value, setValue] = useState(2);
            set = setValue;
            timesRendered++;
            memoizedValue = useMemo(() => value * 2, [value]);
            return html`Test`;
        }

        render(hooks(App, 2), _$dom[0]);
        await waitFrame();

        expect(memoizedValue).toBe(4);

        set(3);
        await waitFrame();
        expect(memoizedValue).toBe(6);
        expect(timesRendered).toBe(2);
    });

    it('for coverage: fail-safe array', async () => {
        let memoizedValue!: number;
        let requestRender!: UnknownFunction;
        const value = 2;

        function App(): TemplateResult {
            [, requestRender] = useState(0);
            memoizedValue = useMemo(() => value * 2, undefined as unknown as number[]);
            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(memoizedValue).toBe(4);

        requestRender();
        await waitFrame();

        expect(memoizedValue).toBe(4);
    });
});
