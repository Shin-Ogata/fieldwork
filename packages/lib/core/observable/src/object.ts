/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    NonFunctionPropertyNames,
    isString,
    isArray,
    verify,
    post,
    deepMerge,
} from '@cdp/core-utils';
import { EventBroker, Subscription } from '@cdp/event-publisher';
import {
    _internal,
    _notify,
    _stockChange,
    _notifyChanges,
    verifyObservable,
} from './internal';
import { IObservable } from './common';

/** @internal */
interface InternalProps {
    active: boolean;
    readonly changeMap: Map<PropertyKey, any>;
    readonly broker: EventBroker<any>;
}

/** @internal */
const _proxyHandler: ProxyHandler<ObservableObject> = {
    set(target, p, value, receiver) {
        if (!isString(p)) {
            return Reflect.set(target, p, value, receiver);
        }
        const oldValue = target[p];
        if (value !== oldValue) {
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
    private readonly [_internal]: InternalProps;

    /**
     * constructor
     *
     * @param active
     *  - `en` initial state. default: active = true
     *  - `ja` 初期状態 既定: active = true
     */
    constructor(active = true) {
        verify('instanceOf', ObservableObject, this);
        const internal: InternalProps = {
            active,
            changeMap: new Map(),
            broker: new EventBroker<this>(),
        };
        Object.defineProperty(this, _internal, { value: Object.seal(internal) });
        return new Proxy(this, _proxyHandler);
    }

///////////////////////////////////////////////////////////////////////
// implements: IObservable

    /**
     * @en Subscriable state
     * @ja 購読可能状態
     */
    get isActive(): boolean {
        verifyObservable(this);
        return this[_internal].active;
    }

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
    on<K extends ObservableKeys<this>>(property: K | K[], listener: (newValue: this[K], oldValue: this[K], key: K) => any): Subscription {
        verifyObservable(this);
        const { changeMap, broker } = this[_internal];
        const result = broker.on(property, listener);
        if (0 < changeMap.size) {
            const props = isArray(property) ? property : [property];
            for (const prop of props) {
                changeMap.has(prop) || changeMap.set(prop, this[prop]);
            }
        }
        return result;
    }

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
    off<K extends ObservableKeys<this>>(property?: K | K[], listener?: (newValue: this[K], oldValue: this[K], key: K) => any): void {
        verifyObservable(this);
        this[_internal].broker.off(property, listener);
    }

    /**
     * @en Suspension of the event subscription state.
     * @ja イベント購読状態のサスペンド
     */
    suspend(): this {
        verifyObservable(this);
        this[_internal].active = false;
        return this;
    }

    /**
     * @en Resume of the event subscription state.
     * @ja イベント購読状態のリジューム
     */
    resume(): this {
        verifyObservable(this);
        const internal = this[_internal];
        if (!internal.active) {
            internal.active = true;
            post(() => this[_notifyChanges]());
        }
        return this;
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
    public static from<T extends {}>(src: T): ObservableObject & T {
        const observable = deepMerge(new class extends ObservableObject { }(false), src);
        observable.resume();
        return observable;
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
            const newValue = this[key];
            const oldValue = changeMap.has(key) ? changeMap.get(key) : newValue;
            keyValue.set(key, [newValue, oldValue]);
        }
        0 < keyValue.size && this[_notify](keyValue);
    }

///////////////////////////////////////////////////////////////////////
// private mehtods:

    /** @internal */
    private [_stockChange](p: string, oldValue: any): void {
        const { active, changeMap, broker } = this[_internal];
        if (0 === changeMap.size) {
            changeMap.set(p, oldValue);
            for (const k of broker.channels()) {
                changeMap.has(k) || changeMap.set(k, this[k]);
            }
            if (active) {
                post(() => this[_notifyChanges]());
            }
        } else {
            changeMap.has(p) || changeMap.set(p, oldValue);
        }
    }

    /** @internal */
    private [_notifyChanges](): void {
        const { active, changeMap } = this[_internal];
        if (!active) {
            return;
        }
        const keyValuePairs = new Map<PropertyKey, [any, any]>();
        for (const [key, oldValue] of changeMap) {
            const curValue = this[key];
            if (oldValue !== curValue) {
                keyValuePairs.set(key, [curValue, oldValue]);
            }
        }
        this[_notify](keyValuePairs);
    }

    /** @internal */
    private [_notify](keyValue: Map<PropertyKey, [any, any]>): void {
        const { changeMap, broker } = this[_internal];
        changeMap.clear();
        for (const [key, values] of keyValue) {
            (broker as any).publish(key, ...values, key);
        }
    }
}
