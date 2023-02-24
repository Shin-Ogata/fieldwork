import { PlainObject } from '@cdp/core-utils';
import type { IHistory, HistorySetStateOptions } from './interfaces';
/**
 * @en [[createSessionHistory]]() options.
 * @ja [[createSessionHistory]]() に渡すオプション
 *
 */
export interface SessionHistoryCreateOptions {
    context?: Window;
    mode?: 'hash' | 'history';
}
/**
 * @en Create browser session history management object.
 * @ja ブラウザセッション管理オブジェクトを構築
 *
 * @param id
 *  - `en` Specified stack ID
 *  - `ja` スタックIDを指定
 * @param state
 *  - `en` State object associated with the stack
 *  - `ja` スタック に紐づく状態オブジェクト
 * @param options
 *  - `en` [[SessionHistoryCreateOptions]] object
 *  - `ja` [[SessionHistoryCreateOptions]] オブジェクト
 */
export declare function createSessionHistory<T = PlainObject>(id?: string, state?: T, options?: SessionHistoryCreateOptions): IHistory<T>;
/**
 * @en Reset browser session history.
 * @ja ブラウザセッション履歴のリセット
 *
 * @param instance
 *  - `en` `SessionHistory` instance
 *  - `ja` `SessionHistory` インスタンスを指定
 */
export declare function resetSessionHistory<T = PlainObject>(instance: IHistory<T>, options?: HistorySetStateOptions): Promise<void>;
/**
 * @en Dispose browser session history management object.
 * @ja ブラウザセッション管理オブジェクトの破棄
 *
 * @param instance
 *  - `en` `SessionHistory` instance
 *  - `ja` `SessionHistory` インスタンスを指定
 */
export declare function disposeSessionHistory<T = PlainObject>(instance: IHistory<T>): void;
