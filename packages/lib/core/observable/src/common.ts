/* eslint-disable @typescript-eslint/no-explicit-any */

import { Subscription, EventBroker } from '@cdp/events';
import { _internal } from './internal';

/**
 * @en Event observation state definition.
 * @ja イベント購読状態定義
 */
export const enum ObservableState {
    /** observable ready */
    ACTIVE   = 'active',
    /** NOT observed, but property changes are recorded. */
    SUSEPNDED = 'suspended',
    /** NOT observed, and not recording property changes. */
    DISABLED = 'disabled',
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
    on(...args: any[]): Subscription;

    /**
     * @en Unsubscribe event(s).
     * @ja イベント購読解除
     */
    off(...args: any[]): void;

    /**
     * @en Suspend or disable the event observation state.
     * @ja イベント購読状態のサスペンド
     *
     * @param noRecord
     *  - `en` `true`: not recording property changes and clear changes. / `false`: property changes are recorded and fired when [[resume]]() callded. (default)
     *  - `ja` `true`: プロパティ変更も記録せず, 現在の記録も破棄 / `false`: プロパティ変更は記録され, [[resume]]() 時に発火する (既定)
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
 * @en Interface able to access to [[EventBroker]] with [[IObservable]].
 * @ja [[IObservable]] の持つ内部 [[EventBroker]] にアクセス可能なインターフェイス
 */
export interface IObservableEventBrokerAccess<T extends {} = any> extends IObservable {
    /**
     * @en Get [[EventBroker]] instance.
     * @ja [[EventBroker]] インスタンスの取得
     */
    getBroker(): EventBroker<T>;
}

/**
 * @en Check the value-type is [[IObservable]].
 * @ja [[IObservable]] 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isObservable(x: any): x is IObservable {
    return Boolean(x && x[_internal]);
}
