import type { DirectiveResult } from '@cdp/extension-template';

export interface IHookState<H = unknown> {
    host: H;
    update: VoidFunction;
}

export type NewHookState<T> = T | ((previousState?: T) => T);
export type HookStateUpdater<T> = (value: NewHookState<T>) => void;

export type HookReducer<S, A> = (state: S, action: A) => S;

export interface IHookContext<T = unknown> {
    provide: (value: T, callback?: (value: T) => DirectiveResult) => DirectiveResult;
    consume: (callback: (value: T) => DirectiveResult | void) => DirectiveResult | void;
    readonly defaultValue: T | undefined;
}
