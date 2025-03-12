import type { HookReducer } from './interfaces';
import { Hook, makeHook } from './hook';
import type { State } from './state';

/** @internal */
export const useReducer = makeHook(class <S, I, A> extends Hook {
    reducer!: HookReducer<S, A>;
    currentState: S;

    constructor(id: number, state: State, _: HookReducer<S, A>, initialState: I, init?: (_: I) => S) {
        super(id, state);
        this.dispatch = this.dispatch.bind(this);
        this.currentState = undefined !== init ? init(initialState) : initialState as unknown as S;
    }

    update(reducer: HookReducer<S, A>): readonly [S, (action: A) => void] {
        this.reducer = reducer;
        return [this.currentState, this.dispatch]; // eslint-disable-line @typescript-eslint/unbound-method
    }

    dispatch(action: A): void {
        this.currentState = this.reducer(this.currentState, action);
        this.state.update();
    }
});
