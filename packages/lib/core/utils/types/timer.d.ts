import { UnknownFunction } from './types';
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
export declare type TimerStartFunction = (handler: UnknownFunction, timeout?: number, ...args: unknown[]) => TimerHandle;
/**
 * @en Type of timer stop functions.
 * @ja タイマー停止関数の型
 */
export declare type TimerStopFunction = (handle: TimerHandle) => void;
declare const _setTimeout: TimerStartFunction;
declare const _clearTimeout: TimerStopFunction;
declare const _setInterval: TimerStartFunction;
declare const _clearInterval: TimerStopFunction;
export { _setTimeout as setTimeout, _clearTimeout as clearTimeout, _setInterval as setInterval, _clearInterval as clearInterval, };
