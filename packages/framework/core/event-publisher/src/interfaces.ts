import { Arguments } from '@cdp/core-utils';

// re-export
export { Arguments };

/**
 * @es Represents a disposable resource, such as the execution of an [[Observable]].
 * @ja [[Observable]] オブジェクトが返す購読情報コンテキストオブジェクト
 */
export interface Subscription {
    /**
     * @es Status for receiving event
     * @ja 購読可否ステータス
     */
    readonly enable: boolean;

    /**
     * @es Disposes the resources held by the subscription
     * @ja 購読停止
     */
    unsubscribe(): void;
}

/**
 * @es Event supplyer interface definitions
 * @ja イベント供給を行うインターフェイス定義
 */
export interface Observable<Event> {
    /**
     * @es Check whether this object has clients.
     * @ja クライアントが存在するか判定
     *
     * @param channel
     *  - `en` event channel key. (string | symbol)
     *  - `ja` イベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    has<Channel extends keyof Event>(channel?: Channel, listener?: (...args: Arguments<Event[Channel]>) => unknown): boolean;

    /**
     * @es Returns registered channel keys.
     * @ja 登録されているチャネルキーを返却
     */
    channels(): (keyof Event)[];

    /**
     * @es Unsubscribe event(s).
     * @ja イベント購読解除
     *
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *         When not set this parameter, everything is released.
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     *         指定しない場合はすべて解除
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *         When not set this parameter, all same `channel` listeners are released.
     *  - `ja` `channel` に対応したコールバック関数
     *         指定しない場合は同一 `channel` すべてを解除
     */
    off<Channel extends keyof Event>(channel?: Channel | Channel[], listener?: (...args: Arguments<Event[Channel]>) => unknown): void;

    /**
     * @es Subscrive event(s).
     * @ja イベント購読設定
     *
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    on<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription;

    /**
     * @es Subscrive event(s) but it causes the bound callback to only fire once before being removed.
     * @ja 一度だけハンドリング可能なイベント購読設定
     *
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    once<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription;
}
