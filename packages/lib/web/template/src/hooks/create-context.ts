import { type DirectiveResult, noChange } from '@cdp/extension-template';
import { isFunction } from '@cdp/core-utils';
import type { IHookContext } from './interfaces';

class HookContext<T> implements IHookContext<T> {
    readonly defaultValue: T | undefined;
    private _value: T;

    constructor(defaultValue?: T) {
        this.provide = this.provide.bind(this);
        this.consume = this.consume.bind(this);
        this.defaultValue = defaultValue;
        this._value = defaultValue as T;
    }

    provide(value: T, callback?: (value: T) => DirectiveResult): DirectiveResult {
        this._value = value;
        return isFunction(callback) ? callback(value) : noChange;
    }

    consume(callback: (value: T) => DirectiveResult | void): DirectiveResult | void {
        return callback(this._value);
    }
}

/** @internal */
export const createContext = <T>(defaultValue?: T): IHookContext<T> => {
    return new HookContext(defaultValue);
};
