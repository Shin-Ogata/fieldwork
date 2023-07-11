import type { IHookState } from './interfaces';
import { current, notify } from './current';
import { hookSymbol } from './symbols';

/**
 * @en Base abstract class for Custom Hook Class.
 * @ja カスタムフッククラスの基底抽象クラス
 */
export abstract class Hook<P extends unknown[] = unknown[], R = unknown, H = unknown> {
    id: number;
    state: IHookState<H>;

    constructor(id: number, state: IHookState<H>) {
        this.id = id;
        this.state = state;
    }

    abstract update(...args: P): R;
    teardown?(): void;
}

/**
 * @en Interface definition for custom hooks.
 * @ja カスタムフックのインターフェイス定義
 */
export type CustomHook<P extends unknown[] = unknown[], R = unknown, H = unknown> = new (id: number, state: IHookState<H>, ...args: P) => Hook<P, R, H>;

const use = <P extends unknown[], R, H = unknown>(Hook: CustomHook<P, R, H>, ...args: P): R => {
    const id = notify();
    const hooks = (current as any)[hookSymbol] as Map<number, Hook>; // eslint-disable-line @typescript-eslint/no-explicit-any

    let hook = hooks.get(id) as Hook<P, R, H> | undefined;
    if (!hook) {
        hook = new Hook(id, current as IHookState<H>, ...args);
        hooks.set(id, hook);
    }

    return hook.update(...args);
};

/**
 * @en Factory function for creating custom hooks.
 * @ja カスタムフック作成用ファクトリ関数
 *
 * @example <br>
 *
 * ```ts
 * import { IHookStateContext, Hook, makeHook } from '@cdp/runtime';
 *
 * export const useMemo = makeHook(class <T> extends Hook {
 *     value: T;
 *     values: unknown[];
 *
 *     constructor(id: number, state: State, fn: () => T, values: unknown[]) {
 *         super(id, state);
 *         this.value = fn();
 *         this.values = values;
 *     }
 *
 *     update(fn: () => T, values: unknown[]): T {
 *         if (this.hasChanged(values)) {
 *             this.values = values;
 *             this.value = fn();
 *         }
 *         return this.value;
 *     }
 *
 *     hasChanged(values: unknown[] = []): boolean {
 *         return values.some((value, i) => this.values[i] !== value);
 *     }
 * });
 * ```
 */
export const makeHook = <P extends unknown[], R, H = unknown>(Hook: CustomHook<P, R, H>): (...args: P) => R => {
    return use.bind(null, Hook);
};
