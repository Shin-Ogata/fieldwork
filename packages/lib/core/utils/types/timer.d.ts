import type { UnknownFunction } from './types';
/**
 * @en Type of handle for timer functions.
 * @ja タイマー関数に使用するハンドル型
 */
export interface TimerHandle {
}
/**
 * @en Type of timer start functions.
 * @ja タイマー開始関数の型
 */
export type TimerStartFunction = (handler: UnknownFunction, timeout?: number, ...args: unknown[]) => TimerHandle;
/**
 * @en Type of timer stop functions.
 * @ja タイマー停止関数の型
 */
export type TimerStopFunction = (handle: TimerHandle) => void;
declare const setTimeout: TimerStartFunction;
declare const clearTimeout: TimerStopFunction;
declare const setInterval: TimerStartFunction;
declare const clearInterval: TimerStopFunction;
export { setTimeout, clearTimeout, setInterval, clearInterval, };
