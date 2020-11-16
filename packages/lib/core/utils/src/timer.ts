import { UnknownFunction } from './types';
import { getGlobal } from './config';
import { safe } from './safe';

/**
 * @en Type of handle for timer functions.
 * @ja タイマー関数に使用するハンドル型
 */
export interface TimerHandle { } // eslint-disable-line @typescript-eslint/no-empty-interface

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

/** @internal */
interface TimerContext {
    setTimeout: TimerStartFunction;
    clearTimeout: TimerStopFunction;
    setInterval: TimerStartFunction;
    clearInterval: TimerStopFunction;
}

/** @internal */
const _root = getGlobal() as unknown as TimerContext;
const setTimeout: TimerStartFunction = safe(_root.setTimeout);
const clearTimeout: TimerStopFunction = safe(_root.clearTimeout);
const setInterval: TimerStartFunction = safe(_root.setInterval);
const clearInterval: TimerStopFunction = safe(_root.clearInterval);

export {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
};
