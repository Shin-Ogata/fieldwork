import type { State, Callable } from './state';
import { layoutEffectsSymbol } from './symbols';
import { createEffect } from './create-effect';

const setLayoutEffects = (state: State, cb: Callable): void => {
    state[layoutEffectsSymbol].push(cb);
};

/** @internal */
export const useLayoutEffect = createEffect(setLayoutEffects);
