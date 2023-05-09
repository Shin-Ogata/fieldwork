import type { IHookState } from './interfaces';

let _currentId = 0;

/** @internal */
export let current: IHookState | null;

/** @internal */
export const setCurrent = (state: IHookState): void => {
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
