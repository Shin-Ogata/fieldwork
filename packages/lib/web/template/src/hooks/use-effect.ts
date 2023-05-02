import type { State, Callable } from './state';
import { effectsSymbol } from './symbols';
import { createEffect } from './create-effect';

/** @internal */
export const setEffects = (state: State, cb: Callable): void => {
    state[effectsSymbol].push(cb);
};

/** @internal */
export const useEffect = createEffect(setEffects);
