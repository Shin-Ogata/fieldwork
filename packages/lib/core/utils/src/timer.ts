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

const root = getGlobal() as unknown as TimerContext;
const _setTimeout: TimerStartFunction = safe(root.setTimeout);
const _clearTimeout: TimerStopFunction = safe(root.clearTimeout);
const _setInterval: TimerStartFunction = safe(root.setInterval);
const _clearInterval: TimerStopFunction = safe(root.clearInterval);

export {
    _setTimeout as setTimeout,
    _clearTimeout as clearTimeout,
    _setInterval as setInterval,
    _clearInterval as clearInterval,
};
