import {
    TemplateResult,
    DirectiveResult,
    html,
    render,
    hooks,
    noChange,
} from '@cdp/template';
import { UnknownFunction, noop } from '@cdp/core-utils';
import { waitFrame } from '@cdp/web-utils';
import { DOM } from '@cdp/dom';
import { prepare, cleanup } from './tools';

describe('hooks/use-context spec', () => {
    const { useState, createContext, useContext } = hooks;
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(createContext).toBeDefined();
        expect(useContext).toBeDefined();
    });

    it('check createContext', () => {
        const context = createContext();
        const { defaultValue, provide, consume } = context;
        expect(defaultValue).toBeUndefined();
        expect(typeof provide).toBe('function');
        expect(typeof consume).toBe('function');

        let value!: number;
        provide(10);
        consume((val: number) => { value = val; });
        expect(value).toBe(10);

        const retval = provide(10);
        expect(retval).toBe(noChange);
    });

    it('check standard use case', async () => {
        const ThemeContext = createContext('dark');

        function App(): TemplateResult {
            const theme = useContext(ThemeContext);
            return html`${theme}`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();
        expect(_$dom.text()).toBe('dark');
    });

    it('check provider update', async () => {
        let setter!: UnknownFunction;

        const ThemeContext = createContext<{ theme: 'dark' | 'light'; setTheme: (theme: 'dark' | 'light') => void; }>({ theme: 'dark', setTheme: noop });

        function Provider(callback: (value: string) => DirectiveResult): DirectiveResult {
            const [theme, setTheme] = useState<'dark' | 'light'>('light');
            ThemeContext.provide({ theme, setTheme });
            return callback(theme);
        }

        function MyConsumer(): string {
            const { theme, setTheme } = useContext(ThemeContext);
            setter = setTheme;
            return theme;
        }


        function App(): TemplateResult {
            return html`
                ${Provider(() => html`
                    ${MyConsumer()}`
                )}
            `;
        }


        render(hooks(App), _$dom[0]);
        await waitFrame();
        expect(_$dom.text()).toBe('light');

        setter('dark');
        await waitFrame();
        expect(_$dom.text()).toBe('dark');
    });

    it('check concept use case', async () => {
        let setter!: UnknownFunction;

        const ThemeContext = createContext('dark');

        const { provide, consume } = ThemeContext;

        function MyConsumer(): string {
            return useContext(ThemeContext);
        }

        function App(): TemplateResult {
            const [theme, setTheme] = useState('light');
            setter = setTheme;

            return html`
                ${provide(theme, () => html`
                    ${MyConsumer()}
                    ${provide('dark' === theme ? 'light' : 'dark', () => html`
                        ${consume((value) => html`<h1>${value}</h1>`)}
                    `)}
                `)}
            `;
        }

        const stripWhiteSpace = /\s+/g;

        render(hooks(App), _$dom[0]);
        await waitFrame();
        expect(_$dom.text().replace(stripWhiteSpace, '')).toBe('lightdark');

        setter('dark');
        await waitFrame();
        expect(_$dom.text().replace(stripWhiteSpace, '')).toBe('darklight');
    });
});
