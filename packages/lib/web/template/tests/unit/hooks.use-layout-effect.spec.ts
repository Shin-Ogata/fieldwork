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

describe('hooks/use-layout-effect spec', () => {
    const {
        useState,
        useEffect,
        useLayoutEffect,
    } = hooks;

    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(useLayoutEffect).toBeDefined();
    });

    it('is called', async () => {
        let ran = false;

        function App(): TemplateResult {
            useLayoutEffect(() => {
                ran = true;
            });
            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(ran).toBeTrue();
    });

    it('is called before useEffect', async () => {
        let effects = true;

        function App(): TemplateResult {
            useEffect(() => {
                effects = true;
            });

            useLayoutEffect(() => {
                effects = false;
            });

            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(effects).toBeTrue();
    });

    it('memoizes values', async () => {
        let effects = 0;
        let set!: UnknownFunction;

        function App(): TemplateResult {
            const [, setVal] = useState(0);
            set = setVal;

            useLayoutEffect(() => {
                effects++;
            }, [1]);

            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

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

            useLayoutEffect(() => {
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

            useLayoutEffect(() => {
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

    it('useLayoutEffect(fn) runs the effect after each render', async () => {
        let calls = 0;
        let setter!: UnknownFunction;

        function App(): TemplateResult {
            const [age, setAge] = useState(() => 8);
            setter = setAge;

            useLayoutEffect(() => {
                calls++;
            });

            return html`<span>${age}</span>`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(calls).toBe(1);

        setter(33);
        await waitFrame();

        expect(_$dom.find('span').text()).toBe('33');
        expect(calls).toBe(2);
    });

    it('useLayoutEffect(fn, []) runs the effect only once', async () => {
        let calls = 0;
        let setter!: UnknownFunction;

        function App(): TemplateResult {
            const [age, setAge] = useState(() => 8);
            setter = setAge;

            useLayoutEffect(() => {
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
});
