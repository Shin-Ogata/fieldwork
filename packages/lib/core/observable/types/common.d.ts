import type { Subscription, EventBroker } from '@cdp/events';
/**
 * @en Event observation state definition.
 * @ja イベント購読状態定義
 */
export declare const enum ObservableState {
    /** observable ready */
    ACTIVE = "active",
    /** NOT observed, but property changes are recorded. */
    SUSEPNDED = "suspended",
    /** NOT observed, and not recording property changes. */
    DISABLED = "disabled"
}
/**
 * @en Observable common interface.
 * @ja Observable 共通インターフェイス
 */
export interface IObservable {
    /**
     * @en Subscrive event(s).
     * @ja イベント購読設定
     */
    on(...args: unknown[]): Subscription;
    /**
     * @en Unsubscribe event(s).
     * @ja イベント購読解除
     */
    off(...args: unknown[]): void;
    /**
     * @en Suspend or disable the event observation state.
     * @ja イベント購読状態のサスペンド
     *
     * @param noRecord
     *  - `en` `true`: not recording property changes and clear changes. / `false`: property changes are recorded and fired when {@link resume}() callded. (default)
     *  - `ja` `true`: プロパティ変更も記録せず, 現在の記録も破棄 / `false`: プロパティ変更は記録され, {@link resume}() 時に発火する (既定)
     */
    suspend(noRecord?: boolean): this;
    /**
     * @en Resume the event observation state.
     * @ja イベント購読状態のリジューム
     */
    resume(): this;
    /**
     * @en observation state
     * @ja 購読可能状態
     */
    getObservableState(): ObservableState;
}
/**
 * @en Interface able to access to {@link EventBroker} with {@link IObservable}.
 * @ja {@link IObservable} の持つ内部 {@link EventBroker} にアクセス可能なインターフェイス
 */
export interface IObservableEventBrokerAccess<T extends object = any> extends IObservable {
    /**
     * @en Get {@link EventBroker} instance.
     * @ja {@link EventBroker} インスタンスの取得
     */
    getBroker(): EventBroker<T>;
}
/**
 * @en Check the value-type is {@link IObservable}.
 * @ja {@link IObservable} 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isObservable(x: unknown): x is IObservable;
