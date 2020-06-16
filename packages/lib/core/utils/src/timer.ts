/* eslint-disable
    @typescript-eslint/no-empty-interface
 ,  @typescript-eslint/no-explicit-any
 ,  @typescript-eslint/ban-types
 */

import { getGlobal } from './config';
import { safe } from './safe';

/**
 * @en Type of handle for timer functions.
 * @ja タイマー関数に使用するハンドル型
 */
export interface TimerHandle { }

/**
 * @en Type of timer start functions.
 * @ja タイマー開始関数の型
 */
export type TimerStartFunction = (handler: Function, timeout?: number, ...args: any[]) => TimerHandle;

/**
 * @en Type of timer stop functions.
 * @ja タイマー停止関数の型
 */
export type TimerStopFunction = (handle: TimerHandle) => void;

const root: any = getGlobal();
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
