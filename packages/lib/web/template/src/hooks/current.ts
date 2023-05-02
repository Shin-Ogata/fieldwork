import type { IHookStateContext } from './interfaces';

let _currentId = 0;

/** @internal */
export let current: IHookStateContext | null;

/** @internal */
export const setCurrent = (state: IHookStateContext): void => {
    current = state;
};

/** @internal */
export const clearCurrent = (): void => {
    current = null;
    _currentId = 0;
};

/** @internal */
export const notify = (): number => {
    return _currentId++;
};
