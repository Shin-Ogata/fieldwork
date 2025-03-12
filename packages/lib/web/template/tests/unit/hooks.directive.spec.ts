import {
    type TemplateResult,
    html,
    render,
    hooks,
} from '@cdp/template';
import {
    type AnyObject,
    isFunction,
    noop,
} from '@cdp/core-utils';
import type { DOM } from '@cdp/dom';
import {
    prepare,
    cleanup,
    innerHTML,
} from './tools';

describe('hooks/directive spec', () => {
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('same instance multi render', () => {
        function App(): TemplateResult {
            return html`Test`;
        }

        for (let i = 0; i < 2; i++) {
            render(hooks(App), _$dom[0]);
        }

        expect(innerHTML(_$dom)).toBe('Test');
    });

    it('for coverage: no _$parent.parentNode case', () => {
        const context = hooks(noop) as AnyObject;
        for (const stuff in context) {
            if (isFunction(context[stuff].prototype?.observe)) {
                expect(() => {
                    context[stuff].prototype.observe();
                }).not.toThrow();
            }
        }
    });
});
