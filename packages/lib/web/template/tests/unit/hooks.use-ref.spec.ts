import {
    TemplateResult,
    html,
    render,
    hooks,
} from '@cdp/template';
import { UnknownFunction } from '@cdp/core-utils';
import { waitFrame } from '@cdp/web-utils';
import { DOM } from '@cdp/dom';
import { prepare, cleanup } from './tools';

describe('hooks/use-ref spec', () => {
    const { useState, useRef } = hooks;
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(useRef).toBeDefined();
    });

    it('always returns the same object', async () => {
        let countRef!: { current: number; };
        let requestRender!: UnknownFunction;
        let timesRendered = 0;

        function App(): TemplateResult {
            timesRendered++;
            countRef = useRef(0);
            [, requestRender] = useState(0);
            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(countRef.current).toBe(0);
        countRef.current++;
        requestRender();

        await waitFrame();
        expect(timesRendered).toBe(2);
        expect(countRef.current).toBe(1);
    });
});
