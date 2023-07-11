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

describe('hooks/use-reducer spec', () => {
    const { useReducer } = hooks;
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(useReducer).toBeDefined();
    });

    it('check reducer behaviour', async () => {
        interface State { count: number; }
        type Action = { type: 'increment'; } | { type: 'decrement'; } | { type: 'reset'; };

        const initialState = { count: 3 };

        let dispatch!: UnknownFunction;
        let state!: State;

        const reducer = (state: State, action: Action): State => {
            switch (action.type) {
                case 'increment':
                    return { count: state.count + 1 };
                case 'decrement':
                    return { count: state.count - 1 };
                case 'reset':
                    return initialState;
                default:
                    return state;
            }
        };

        function App(): TemplateResult {
            [state, dispatch] = useReducer(reducer, initialState);
            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(state.count).toBe(3);

        dispatch({ type: 'increment' });
        await waitFrame();

        expect(state.count).toBe(4);

        dispatch({ type: 'decrement' });
        await waitFrame();

        expect(state.count).toBe(3);

        dispatch({ type: 'decrement' });
        await waitFrame();

        expect(state.count).toBe(2);

        dispatch({ type: 'reset' });
        await waitFrame();

        expect(state.count).toBe(3);
    });

    it('check reducer behaviour w/ initializer', async () => {
        interface State { count: number; }
        type Other = State & { otherProp: number; };
        type Action = { type: 'increment'; } | { type: 'decrement'; } | { type: 'reset'; };

        const initialState = { count: 3 };
        const countInitializer = (initState: State): State => {
            return {
                count: initState.count,
                otherProp: 0,
            } as State;
        };
        let dispatch!: UnknownFunction;
        let state!: State;

        const reducer = (state: State, action: Action): State => {
            switch (action.type) {
                case 'increment':
                    return { count: state.count + 1 };
                case 'reset':
                    return initialState;
                default:
                    return state;
            }
        };

        function App(): TemplateResult {
            [state, dispatch] = useReducer(reducer, initialState, countInitializer);
            return html`Test`;
        }

        render(hooks(App), _$dom[0]);
        await waitFrame();

        expect(state.count).toBe(3);
        expect((state as Other).otherProp).toBe(0);

        dispatch({ type: 'increment' });
        await waitFrame();

        expect(state.count).toBe(4);
        expect((state as Other).otherProp).toBeUndefined();

        dispatch({ type: 'reset' });
        await waitFrame();

        expect(state.count).toBe(3);
        expect((state as Other).otherProp).toBeUndefined();
    });
});
