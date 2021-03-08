import { EventBroker, Subscription } from '@cdp/events';

/** @internal */ export const _cancel = Symbol('cancel');
/** @internal */ export const _close  = Symbol('close');

/**
 * @en CancelToken state definitions.
 * @ja CancelToken の状態定義
 *
 * @internal
 */
export const enum CancelTokenState {
    /** キャンセル受付可能 */
    OPEN        = 0x0,
    /** キャンセル受付済み */
    REQUESTED   = 0x1,
    /** キャンセル受付不可 */
    CLOSED      = 0x2,
}

/**
 * @en Cancel event definitions.
 * @ja キャンセルイベント定義
 *
 * @internal
 */
export interface CancelEvent<T> {
    cancel: [T];
}

/**
 * @en Internal CancelToken interface.
 * @ja CancelToken の内部インターフェイス定義
 *
 * @internal
 */
export interface CancelTokenContext<T = unknown> {
    readonly broker: EventBroker<CancelEvent<T>>;
    readonly subscriptions: Set<Subscription>;
    reason: T | undefined;
    status: CancelTokenState;
}

/**
 * @en Invalid subscription object declaration.
 * @ja 無効な Subscription オブジェクト
 *
 * @internal
 */
export const invalidSubscription = Object.freeze({
    enable: false,
    unsubscribe() { /* noop */ }
}) as Subscription;
