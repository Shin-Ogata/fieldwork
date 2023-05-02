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

describe('hooks/use-state spec', () => {
    const { useState } = hooks;
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(useState).toBeDefined();
    });

    it('lazy callback', async () => {
        let setter!: UnknownFunction;

        function App(): TemplateResult {
            const [age, setAge] = useState(() => 8);
            setter = setAge;
            return html`<span>${age}</span>`;
        }

        render(hooks(App), _$dom[0]);
        expect(_$dom.find('span').text()).toBe('8');

        setter(33);
        await waitFrame();
        expect(_$dom.find('span').text()).toBe('33');
    });

    it('updater function should only trigger rerender if state has changed', async () => {
        let setter!: UnknownFunction, runs = 0;

        function App(): TemplateResult {
            runs++;
            const [age, setAge] = useState(8);
            setter = setAge;
            return html`<span>${age}</span>`;
        }

        render(hooks.with(_$dom[0], App), _$dom[0]);
        expect(_$dom.find('span').text()).toBe('8');

        setter(() => 8);
        await waitFrame();
        expect(runs).toBe(1);
    });
});
