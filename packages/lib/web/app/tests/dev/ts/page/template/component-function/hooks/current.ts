import type { IHookStateContext } from './interfaces';

let _currentId = 0;
export let current: IHookStateContext | null;

export const setCurrent = (state: IHookStateContext): void => {
    current = state;
};

export const clearCurrent = (): void => {
    current = null;
    _currentId = 0;
};

export const notify = (): number => {
    return _currentId++;
};
