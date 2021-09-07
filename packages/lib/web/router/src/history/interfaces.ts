/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import { PlainObject } from '@cdp/core-utils';
import { Subscribable, Silenceable } from '@cdp/events';

/**
 * @en The event definition fired in [[IHistory]].
 * @ja [[IHistory]] 内から発行されるイベント定義
 */
export interface HistoryEvent<T = PlainObject> {
    'popstate': T;
    'hashchange': [string, string];
}

/**
 * @en History management interface.
 * @ja 履歴管理インターフェイス
 */
export interface IHistory<T = PlainObject> extends Subscribable<HistoryEvent<T>> {
///////////////////////////////////////////////////////////////////////
// History API like:
    readonly length: number;
    readonly index: number;
    readonly state: T;
    back(): number;
    forward(): number;
    go(delta?: number): number;
    pushState(data: T, url?: string | URL | null): number;
    replaceState(data: T, url?: string | URL | null): number;
}

//__________________________________________________________________________________________________//
