import {
    type TemplateResult,
    html,
    render,
    hooks,
} from '@cdp/template';
import { type UnknownFunction, noop } from '@cdp/core-utils';
import { waitFrame } from '@cdp/web-utils';
import type { DOM } from '@cdp/dom';
import { prepare, cleanup } from './tools';

describe('hooks/use-callback spec', () => {
    const { useCallback } = hooks;
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(useCallback).toBeDefined();
    });

    it('should return the same value when the inputs are the same', async () => {
        const stub = { onCallback: noop };
        spyOn(stub, 'onCallback').and.callThrough();

        let memoizedFn!: UnknownFunction;

        function App(): TemplateResult {
            memoizedFn = useCallback(stub.onCallback, []);
            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(memoizedFn).toBeInstanceOf(Function);
        memoizedFn();
        expect(stub.onCallback).toHaveBeenCalledTimes(1);
    });
});
