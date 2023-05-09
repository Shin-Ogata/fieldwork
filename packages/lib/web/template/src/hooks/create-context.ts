import { DirectiveResult, noChange } from '@cdp/extension-template';
import type { IHookContext } from './interfaces';

/** @internal */
export interface HookContextListener {
    onUpdateContext: (value: unknown) => void;
}

// const _mapHooks = new WeakMap<IHookContext, Set<HookContextListener>>();

class HookContext<T> implements IHookContext<T> {
    readonly defaultValue: T | undefined;
    private _value: T;

    constructor(defaultValue?: T) {
        this.provide = this.provide.bind(this);
        this.consume = this.consume.bind(this);
        this.defaultValue = defaultValue;
        this._value = defaultValue as T;
        // _mapHooks.set(this, new Set());
    }

    provide(value: T, template?: DirectiveResult): DirectiveResult {
        if (this._value === value) {
            return noChange;
        }
        this._value = value;
        // const listeners = _mapHooks.get(this) as Set<HookContextListener>;
        // for (const listener of listeners) {
        //     listener.onUpdateContext(this._value);
        // }
        return template || noChange;
    }

    consume(callback: (value: T) => DirectiveResult | void): DirectiveResult | void {
        return callback(this._value);
    }
}

/** @internal */
// export const getContextStack = (context: IHookContext): Set<HookContextListener> => {
//     return _mapHooks.get(context) || new Set();
// };

/** @internal */
export const createContext = <T>(defaultValue?: T): IHookContext<T> => {
    return new HookContext(defaultValue);
};
