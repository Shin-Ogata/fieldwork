/* eslint-disable
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/no-non-null-assertion,
    @typescript-eslint/explicit-function-return-type,
 */

import { deepEqual } from '@cdp/core-utils';
import { Hook, makeHook } from './hook';
import type { State, Callable } from './state';

type Effect = (this: State) => void | VoidFunction | Promise<void>;

/** @internal */
export const createEffect = (setEffects: (state: State, cb: Callable) => void) => {
    return makeHook(class extends Hook {
        callback!: Effect;
        lastValues?: unknown[];
        values?: unknown[];
        _teardown!: Promise<void> | VoidFunction | void;

        constructor(id: number, state: State, ignored1: Effect, ignored2?: unknown[]) {
            super(id, state);
            setEffects(state, this);
        }

        update(callback: Effect, values?: unknown[]): void {
            this.callback = callback;
            this.values = values;
        }

        call(): void {
            if (!this.values || this.hasChanged()) {
                this.run();
            }
            this.lastValues = this.values;
        }

        run(): void {
            this.teardown();
            this._teardown = this.callback.call(this.state);
        }

        teardown(): void {
            if ('function' === typeof this._teardown) {
                this._teardown();
            }
        }

        hasChanged(): boolean {
            return !this.lastValues || this.values!.some((value, i) => !deepEqual(this.lastValues![i], value));
        }
    });
};
