import { deepEqual } from '@cdp/core-utils';
import type { NewHookState, HookStateUpdater } from './interfaces';
import { Hook, makeHook } from './hook';
import type { State } from './state';

/** @internal */
export const useState = makeHook(class <T> extends Hook {
    args!: readonly [T, HookStateUpdater<T>];

    constructor(id: number, state: State, initialValue: T) {
        super(id, state);
        this.updater = this.updater.bind(this);

        if ('function' === typeof initialValue) {
            initialValue = initialValue();
        }

        this.makeArgs(initialValue);
    }

    update(): readonly [T, HookStateUpdater<T>] {
        return this.args;
    }

    updater(value: NewHookState<T>): void {
        const [previousValue] = this.args;
        if ('function' === typeof value) {
            const updaterFn = value as (previousState?: T) => T;
            value = updaterFn(previousValue);
        }

        if (deepEqual(previousValue, value)) {
            return;
        }

        this.makeArgs(value);
        this.state.update();
    }

    makeArgs(value: T): void {
        this.args = Object.freeze([value, this.updater] as const); // eslint-disable-line @typescript-eslint/unbound-method
    }
}) as <T>(initialState?: T) => readonly [
    T extends ((...args: unknown[]) => infer R) ? R : T,
    HookStateUpdater<T extends ((...args: unknown[]) => infer S) ? S : T>
];
