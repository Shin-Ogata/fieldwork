import {
    TemplateResult,
    html,
    render,
    hooks,
} from '@cdp/template';
import { UnknownFunction } from '@cdp/core-utils';
import { waitFrame } from '@cdp/web-utils';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import { prepare, cleanup } from './tools';

describe('hooks/use-effect spec', () => {
    const { useState, useEffect } = hooks;
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(useEffect).toBeDefined();
    });

    it('memoizes values', async () => {
        let effects = 0;
        let set!: UnknownFunction;

        function App(): TemplateResult {
            const [, setVal] = useState(0);
            set = setVal;

            useEffect(() => {
                effects++;
            }, [1]);

            return html`Test`;
        }

        render(hooks(App), _$dom[0]);

        set(2);
        await waitFrame();

        expect(effects).toBe(1);
    });

    it('can teardown subscriptions', async () => {
        const subs: number[] = [];
        let set!: UnknownFunction;

        function App(): TemplateResult {
            const [val, setVal] = useState(0);
            set = setVal;

            useEffect(() => {
                subs.push(val);
                return () => {
                    subs.splice(subs.indexOf(val), 1);
                };
            });

            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        set(1);
        await waitFrame();

        set(2);
        await waitFrame();

        expect(subs.length).toBe(1);
    });

    it('tears-down on unmount', async () => {
        const subs: number[] = [];

        function App(): TemplateResult {
            const val = Math.random();

            useEffect(() => {
                subs.push(val);
                return () => {
                    subs.splice(subs.indexOf(val), 1);
                };
            });

            return html`Test`;
        }

        const $stage = $('<div class="stage"></div>');
        _$dom[0].appendChild($stage[0]);

        render(hooks.with(_$dom[0], App), $stage[0]);
        await waitFrame();

        $stage.remove();
        await waitFrame();

        expect(subs.length).toBe(0);
    });

    it('useEffect(fn, []) runs the effect only once', async () => {
        let calls = 0;
        let setter!: UnknownFunction;

        function App(): TemplateResult {
            const [age, setAge] = useState(() => 8);
            setter = setAge;

            useEffect(() => {
                calls++;
            }, []);

            return html`<span>${age}</span>`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(calls).toBe(1);
        expect(_$dom.find('span').text()).toBe('8');

        setter(33);
        await waitFrame();

        expect(_$dom.find('span').text()).toBe('33');
        expect(calls).toBe(1);
    });

    it('can be async functions', async () => {
        function App(): void {
            useEffect(async () => { /* noop */ });
        }

        try {
            render(hooks(App), _$dom[0]);
            await waitFrame();
            cleanup();
            expect(true).toBeTrue();
        } catch {
            fail();
        }
    });

    it('does not skip effects when another update is queued during commit phase', async () => {
        let parentEffects = 0;
        let childEffects = 0;
        let parentSet!: UnknownFunction;
        let childSet!: UnknownFunction;

        function Child({ prop }: { prop: unknown; }): TemplateResult {
            const [state, setState] = useState();
            childSet = setState;

            useEffect(() => {
                childEffects++;
            }, [state]);

            return html`${prop} + ${state}`;
        }

        function Parent(): TemplateResult {
            const [state, setState] = useState();
            parentSet = setState;

            useEffect(() => {
                parentEffects++;
            }, [state]);

            return html`${Child({ prop: state })}`;
        }

        render(hooks(Parent), _$dom[0]);
        await waitFrame();

        parentSet(1);
        childSet(1);
        await waitFrame();

        expect(parentEffects).toBe(2);
        expect(childEffects).toBe(2);
    });
});
