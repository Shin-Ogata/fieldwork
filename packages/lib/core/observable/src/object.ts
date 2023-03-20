/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    UnknownObject,
    NonFunctionProperties,
    NonFunctionPropertyNames,
    isString,
    isArray,
    verify,
    post,
    deepMerge,
    deepEqual,
} from '@cdp/core-utils';
import { Subscription, EventBroker } from '@cdp/events';
import {
    EventBrokerProxy,
    _internal,
    _notify,
    _stockChange,
    _notifyChanges,
    verifyObservable,
} from './internal';
import { ObservableState, IObservable } from './common';

/** @internal */
interface InternalProps {
    state: ObservableState;
    changed: boolean;
    readonly changeMap: Map<PropertyKey, any>;
    readonly broker: EventBrokerProxy<any>;
}

/** @internal */
const _proxyHandler: ProxyHandler<ObservableObject> = {
    set(target, p, value, receiver) {
        if (!isString(p)) {
            return Reflect.set(target, p, value, receiver);
        }
        const oldValue = (target as any)[p];
        if (ObservableState.DISABLED !== target[_internal].state && value !== oldValue) {
            target[_stockChange](p, oldValue);
        }
        return Reflect.set(target, p, value, receiver);
    },
};
Object.freeze(_proxyHandler);

//__________________________________________________________________________________________________//

/**
 * @en Observable key type definition.
 * @ja 購読可能なキーの型定義
 */
export type ObservableKeys<T extends ObservableObject> = NonFunctionPropertyNames<T>;

//__________________________________________________________________________________________________//

/**
 * @en The object class which change can be observed.
 * @ja オブジェクトの変更を監視できるオブジェクトクラス
 *
 * @example <br>
 *
 * - Basic Usage
 *
 * ```ts
 * class Example extends ObservableObject {
 *   public a: number = 0;
 *   public b: number = 0;
 *   public get sum(): number {
 *       return this.a + this.b;
 *   }
 * }
 *
 * const observable = new Example();
 *
 * function onNumChange(newValue: number, oldValue: number, key: string) {
 *   console.log(`${key} changed from ${oldValue} to ${newValue}.`);
 * }
 * observable.on(['a', 'b'], onNumChange);
 *
 * // update
 * observable.a = 100;
 * observable.b = 200;
 *
 * // console out from `async` event loop.
 * // => 'a changed from 0 to 100.'
 * // => 'b changed from 0 to 200.'
 *
 * :
 *
 * function onSumChange(newValue: number, oldValue: number) {
 *   console.log(`sum changed from ${oldValue} to ${newVaue}.`);
 * }
 * observable.on('sum', onSumChange);
 *
 * // update
 * observable.a = 100; // nothing reaction because of no change properties.
 * observable.a = 200;
 *
 * // console out from `async` event loop.
 * // => 'sum changed from 300 to 400.'
 * ```
 */
export abstract class ObservableObject implements IObservable {
    /** @internal */
    private readonly [_internal]!: InternalProps;

    /**
     * constructor
     *
     * @param state
     *  - `en` initial state. default: [[ObservableState.ACTIVE]]
     *  - `ja` 初期状態 既定: [[ObservableState.ACTIVE]]
     */
    constructor(state = ObservableState.ACTIVE) {
        verify('instanceOf', ObservableObject, this);
        const internal: InternalProps = {
            state,
            changed: false,
            changeMap: new Map(),
            broker: new EventBrokerProxy<this>(),
        };
        Object.defineProperty(this, _internal, { value: Object.seal(internal) });
        return new Proxy(this, _proxyHandler);
    }

///////////////////////////////////////////////////////////////////////
// implements: IObservable

    /**
     * @en Subscrive property changes.
     * @ja プロパティ変更購読設定 (全プロパティ監視)
     *
     * @param property
     *  - `en` wild cord signature.
     *  - `ja` ワイルドカード
     * @param listener
     *  - `en` callback function of the property change.
     *  - `ja` プロパティ変更通知コールバック関数
     */
    on(property: '@', listener: (context: ObservableObject) => unknown): Subscription;

    /**
     * @en Subscrive property change(s).
     * @ja プロパティ変更購読設定
     *
     * @param property
     *  - `en` target property.
     *  - `ja` 対象のプロパティ
     * @param listener
     *  - `en` callback function of the property change.
     *  - `ja` プロパティ変更通知コールバック関数
     */
    on<K extends ObservableKeys<this>>(property: K | K[], listener: (newValue: this[K], oldValue: this[K], key: K) => unknown): Subscription;

    on<K extends ObservableKeys<this>>(property: K | K[], listener: (newValue: this[K], oldValue: this[K], key: K) => unknown): Subscription {
        verifyObservable(this);
        const { changeMap, broker } = this[_internal];
        const result = broker.get().on(property, listener);
        if (0 < changeMap.size) {
            const props = isArray(property) ? property : [property];
            for (const prop of props) {
                changeMap.has(prop) || changeMap.set(prop, this[prop]);
            }
        }
        return result;
    }

    /**
     * @en Unsubscribe property changes)
     * @ja プロパティ変更購読解除 (全プロパティ監視)
     *
     * @param property
     *  - `en` wild cord signature.
     *  - `ja` ワイルドカード
     * @param listener
     *  - `en` callback function of the property change.
     *  - `ja` プロパティ変更通知コールバック関数
     */
    off(property: '@', listener?: (context: ObservableObject) => any): void;

    /**
     * @en Unsubscribe property change(s).
     * @ja プロパティ変更購読解除
     *
     * @param property
     *  - `en` target property.
     *         When not set this parameter, everything is released.
     *  - `ja` 対象のプロパティ
     *         指定しない場合はすべて解除
     * @param listener
     *  - `en` callback function of the property change.
     *         When not set this parameter, all same `channel` listeners are released.
     *  - `ja` プロパティ変更通知コールバック関数
     *         指定しない場合は同一 `channel` すべてを解除
     */
    off<K extends ObservableKeys<this>>(property?: K | K[], listener?: (newValue: this[K], oldValue: this[K], key: K) => unknown): void;

    off<K extends ObservableKeys<this>>(property?: K | K[], listener?: (newValue: this[K], oldValue: this[K], key: K) => unknown): void {
        verifyObservable(this);
        this[_internal].broker.get().off(property, listener);
    }

    /**
     * @en Suspend or disable the event observation state.
     * @ja イベント購読状態のサスペンド
     *
     * @param noRecord
     *  - `en` `true`: not recording property changes and clear changes. / `false`: property changes are recorded and fired when [[resume]]() callded. (default)
     *  - `ja` `true`: プロパティ変更も記録せず, 現在の記録も破棄 / `false`: プロパティ変更は記録され, [[resume]]() 時に発火する (既定)
     */
    suspend(noRecord = false): this {
        verifyObservable(this);
        this[_internal].state = noRecord ? ObservableState.DISABLED : ObservableState.SUSEPNDED;
        if (noRecord) {
            this[_internal].changeMap.clear();
        }
        return this;
    }

    /**
     * @en Resume the event observation state.
     * @ja イベント購読状態のリジューム
     */
    resume(): this {
        verifyObservable(this);
        const internal = this[_internal];
        if (ObservableState.ACTIVE !== internal.state) {
            internal.state = ObservableState.ACTIVE;
            void post(() => this[_notifyChanges]());
        }
        return this;
    }

    /**
     * @en observation state
     * @ja 購読可能状態
     */
    getObservableState(): ObservableState {
        verifyObservable(this);
        return this[_internal].state;
    }

///////////////////////////////////////////////////////////////////////
// implements: IObservableEventBrokerAccess

    /** @internal */
    getBroker(): EventBroker<NonFunctionProperties<this>> {
        const { broker } = this[_internal];
        return broker.get();
    }

///////////////////////////////////////////////////////////////////////
// static methods:

    /**
     * @en Create [[ObservableObject]] from any object.
     * @ja 任意のオブジェクトから [[ObservableObject]] を生成
     *
     * @example <br>
     *
     * ```ts
     * const observable = ObservableObject.from({ a: 1, b: 1 });
     * function onNumChange(newValue: number, oldValue: number, key: string) {
     *   console.log(`${key} changed from ${oldValue} to ${newValue}.`);
     * }
     * observable.on(['a', 'b'], onNumChange);
     *
     * // update
     * observable.a = 100;
     * observable.b = 200;
     *
     * // console out from `async` event loop.
     * // => 'a changed from 1 to 100.'
     * // => 'b changed from 1 to 200.'
     * ```
     */
    public static from<T extends object>(src: T): ObservableObject & T {
        const observable = deepMerge(new class extends ObservableObject { }(ObservableState.DISABLED), src);
        observable.resume();
        return observable as any;
    }

///////////////////////////////////////////////////////////////////////
// protected mehtods:

    /**
     * @en Force notify property change(s) in spite of active state.
     * @ja アクティブ状態にかかわらず強制的にプロパティ変更通知を発行
     */
    protected notify(...properties: string[]): void {
        verifyObservable(this);
        if (0 === properties.length) {
            return;
        }
        const { changeMap } = this[_internal];
        const keyValue = new Map<PropertyKey, [any, any]>();
        for (const key of properties) {
            const newValue = (this as UnknownObject)[key];
            const oldValue = changeMap.has(key) ? changeMap.get(key) : newValue;
            keyValue.set(key, [newValue, oldValue]);
        }
        0 < keyValue.size && this[_notify](keyValue);
    }

///////////////////////////////////////////////////////////////////////
// private mehtods:

    /** @internal */
    private [_stockChange](p: string, oldValue: any): void {
        const { state, changeMap, broker } = this[_internal];
        this[_internal].changed = true;
        if (0 === changeMap.size) {
            changeMap.set(p, oldValue);
            for (const k of broker.get().channels()) {
                changeMap.has(k) || changeMap.set(k, (this as UnknownObject)[k]);
            }
            if (ObservableState.ACTIVE === state) {
                void post(() => this[_notifyChanges]());
            }
        } else {
            changeMap.has(p) || changeMap.set(p, oldValue);
        }
    }

    /** @internal */
    private [_notifyChanges](): void {
        const { state, changeMap } = this[_internal];
        if (ObservableState.ACTIVE !== state) {
            return;
        }
        const keyValuePairs = new Map<PropertyKey, [any, any]>();
        for (const [key, oldValue] of changeMap) {
            const curValue = (this as UnknownObject)[key];
            if (!deepEqual(oldValue, curValue)) {
                keyValuePairs.set(key, [curValue, oldValue]);
            }
        }
        this[_notify](keyValuePairs);
    }

    /** @internal */
    private [_notify](keyValue: Map<PropertyKey, [any, any]>): void {
        const { changed, changeMap, broker } = this[_internal];
        changeMap.clear();
        this[_internal].changed = false;
        const eventBroker = broker.get();
        for (const [key, values] of keyValue) {
            (eventBroker as any).trigger(key, ...values, key);
        }
        if (changed) {
            eventBroker.trigger('@', this);
        }
    }
}
