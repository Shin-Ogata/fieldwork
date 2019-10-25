import { Subscription } from '@cdp/event-publisher';
/**
 * @en Observable common interface.
 * @ja Observable 共通インターフェイス
 */
export interface IObservable {
    /**
     * @en Subscriable state
     * @ja 購読可能状態
     */
    readonly isActive: boolean;
    /**
     * @en Subscrive event(s).
     * @ja イベント購読設定
     */
    on(...args: any[]): Subscription;
    /**
     * @en Unsubscribe event(s).
     * @ja イベント購読解除
     */
    off(...args: any[]): void;
    /**
     * @en Suspension of the event subscription state.
     * @ja イベント購読状態のサスペンド
     */
    suspend(): this;
    /**
     * @en Resume of the event subscription state.
     * @ja イベント購読状態のリジューム
     */
    resume(): this;
}
/**
 * @en Check the value-type is [[IObservable]].
 * @ja [[IObservable]] 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isObservable(x: any): x is IObservable;
