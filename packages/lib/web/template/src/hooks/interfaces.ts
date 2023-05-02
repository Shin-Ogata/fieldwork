export interface IHookStateContext<H = unknown> {
    host: H;
    update: VoidFunction;
}

export type NewHookState<T> = T | ((previousState?: T) => T);
export type HookStateUpdater<T> = (value: NewHookState<T>) => void;

export type HookReducer<S, A> = (state: S, action: A) => S;
