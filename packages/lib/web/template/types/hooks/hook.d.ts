import type { IHookStateContext } from './interfaces';
/**
 * @en Base abstract class for Custom Hook Class.
 * @ja カスタムフッククラスの基底抽象クラス
 */
export declare abstract class Hook<P extends unknown[] = unknown[], R = unknown, H = unknown> {
    id: number;
    state: IHookStateContext<H>;
    constructor(id: number, state: IHookStateContext<H>);
    abstract update(...args: P): R;
    teardown?(): void;
}
/**
 * @en Interface definition for custom hooks.
 * @ja カスタムフックのインターフェイス定義
 */
export interface CustomHook<P extends unknown[] = unknown[], R = unknown, H = unknown> {
    new (id: number, state: IHookStateContext<H>, ...args: P): Hook<P, R, H>;
}
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
export declare const makeHook: <P extends unknown[], R, H = unknown>(Hook: CustomHook<P, R, H>) => (...args: P) => R;
