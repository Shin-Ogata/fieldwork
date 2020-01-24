/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import {
    isString,
    isSymbol,
    className,
} from '@cdp/core-utils';
import { EventBroker } from '@cdp/events';

/** @internal EventBrokerProxy */
export class EventBrokerProxy<Event extends {}> {
    private _broker?: EventBroker<Event>;
    public get(): EventBroker<Event> {
        return this._broker || (this._broker = new EventBroker());
    }
}

/** @internal */
export const _internal = Symbol('internal');
/** @internal */
export const _notify = Symbol('notify');
/** @internal */
export const _stockChange = Symbol('stock-change');
/** @internal */
export const _notifyChanges = Symbol('notify-changes');

/** @internal */
export function verifyObservable(x: any): void | never {
    if (!x || !x[_internal]) {
        throw new TypeError(`The object passed is not an IObservable.`);
    }
}

/** @internal */
export function verifyValidKey(key: unknown): void | never {
    if (isString(key) || isSymbol(key)) {
        return;
    }
    throw new TypeError(`Type of ${className(key)} is not a valid key.`);
}
