/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import { deepEqual } from '@cdp/core-utils';
import { makeHook, Hook } from './hook';
import type { State } from './state';

type NewState<T> = T | ((previousState?: T) => T);
type StateUpdater<T> = (value: NewState<T>) => void;

/**
 * @en Return a stateful value and a function to update it.
 * @ja ステートフルな値と、それを更新するための関数を返却
 *
 * @param initialState
 *  - `en` The value you want the state to be initially.
 *  - `ja` 状態の初期化値
 * @returns
 *  - `en` returns an array with exactly two values. [`currentState`, `updateFunction`]
 *  - `ja` 2つの値を持つ配列を返却 [`currentState`, `updateFunction`]
 */
export const useState = makeHook(class <T> extends Hook {
    args!: readonly [T, StateUpdater<T>];

    constructor(id: number, state: State, initialValue: T) {
        super(id, state);
        this.updater = this.updater.bind(this);

        if ('function' === typeof initialValue) {
            initialValue = initialValue();
        }

        this.makeArgs(initialValue);
    }

    update(): readonly [T, StateUpdater<T>] {
        return this.args;
    }

    updater(value: NewState<T>): void {
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
    T extends ((...args: any[]) => infer R) ? R : T,
    StateUpdater<T extends ((...args: any[]) => infer S) ? S : T>
];
