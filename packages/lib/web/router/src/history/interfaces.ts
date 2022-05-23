import { PlainObject } from '@cdp/core-utils';
import { Subscribable, Silenceable } from '@cdp/events';
import { Cancelable } from '@cdp/promise';

/**
 * @en History state object.
 * @ja 履歴状態オブジェクト
 */
export type HistoryState<T = PlainObject> = T & {
    '@id': string;
    '@origin'?: boolean;
};

/**
 * @en The event definition fired in [[IHistory]].
 * @ja [[IHistory]] 内から発行されるイベント定義
 */
export interface HistoryEvent<T = PlainObject> {
    /** @args [nextState, cancel] */
    'update': [HistoryState<T>, (reason?: unknown) => void];
    /** @args [newState, oldState] */
    'change': [HistoryState<T>, HistoryState<T>];
}

/**
 * @en History state management options
 * @ja 履歴状態管理用オプション
 */
export type HistorySetStateOptions = Silenceable & Cancelable;

/**
 * @en Definition of [[IHistory.direct]]`()` return type.
 * @ja [[IHistory.direct]]`()` の返却する型
 */
export interface HistoryDirectReturnType<T = PlainObject> {
    direction: 'back' | 'forward' | 'none' | 'missing';
    index?: number;
    state?: HistoryState<T>;
}

/**
 * @en History management interface. This Interface provides the functions similar to the `History API`.
 * @ja 履歴管理インターフェイス. `History API` と類似した機能を提供する.
 */
export interface IHistory<T = PlainObject> extends Subscribable<HistoryEvent<T>> {
    /** history stack length */
    readonly length: number;
    /** current state */
    readonly state: HistoryState<T>;
    /** current id */
    readonly id: string;
    /** current index */
    readonly index: number;
    /** stack pool */
    readonly stack: readonly HistoryState<T>[];
    /** get data by index. */
    at(index: number): HistoryState<T>;
    /** To move backward through history. */
    back(): Promise<number>;
    /** To move forward through history. */
    forward(): Promise<number>;
    /** To move a specific point in history. */
    go(delta?: number): Promise<number>;

    /**
     * @en Register new history.
     * @ja 新規履歴の登録
     *
     * @param id
     *  - `en` Specified stack ID
     *  - `ja` スタックIDを指定
     * @param state
     *  - `en` State object associated with the stack
     *  - `ja` スタック に紐づく状態オブジェクト
     * @param options
     *  - `en` State management options
     *  - `ja` 状態管理用オプションを指定
     */
    push(id: string, state?: T, options?: HistorySetStateOptions): Promise<number>;

    /**
     * @en Replace current history.
     * @ja 現在の履歴の置換
     *
     * @param id
     *  - `en` Specified stack ID
     *  - `ja` スタックIDを指定
     * @param state
     *  - `en` State object associated with the stack
     *  - `ja` スタック に紐づく状態オブジェクト
     * @param options
     *  - `en` State management options
     *  - `ja` 状態管理用オプションを指定
     */
    replace(id: string, state?: T, options?: HistorySetStateOptions): Promise<number>;

    /**
     * @en Clear forward history from current index.
     * @ja 現在の履歴のインデックスより前方の履歴を削除
     */
    clearForward(): void;

    /**
     * @en Return closet index by ID.
     * @ja 指定された ID から最も近い index を返却
     *
     * @param id
     *  - `en` Specified stack ID
     *  - `ja` スタックIDを指定
     * @returns
     *  - `en` closest index
     *  - `ja` 最も近いと判定した index
     */
    closest(id: string): number | undefined;

    /**
     * @en Return closet stack information by ID.
     * @ja 指定された ID から最も近いスタック情報を返却
     */
    direct(id: string): HistoryDirectReturnType<T>;
}
