/* eslint-disable @typescript-eslint/no-explicit-any */

import { deepEqual } from './deep-circuit';
import {
    Nil,
    Writable,
    isArray,
    isObject,
    isFunction,
    className,
} from './types';

/**
 * @en Check whether input source has a property.
 * @ja 入力元がプロパティを持っているか判定
 *
 * @param src
 */
export function has(src: unknown, propName: string): boolean {
    return null != src && isObject(src) && (propName in src);
}

/**
 * @en Get shallow copy of `target` which has only `pickKeys`.
 * @ja `pickKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を取得
 *
 * @param target
 *  - `en` copy source object
 *  - `ja` コピー元オブジェクト
 * @param pickKeys
 *  - `en` copy target keys
 *  - `ja` コピー対象のキー一覧
 */
export function pick<T extends object, K extends keyof T>(target: T, ...pickKeys: K[]): Writable<Pick<T, K>> {
    if (!target || !isObject(target)) {
        throw new TypeError(`${className(target)} is not an object.`);
    }
    return pickKeys.reduce((obj, key) => {
        key in target && (obj[key] = target[key]);
        return obj;
    }, {} as Writable<Pick<T, K>>);
}

/**
 * @en Get shallow copy of `target` without `omitKeys`.
 * @ja `omitKeys` で指定されたプロパティ以外のキーを持つ `target` の Shallow Copy を取得
 *
 * @param target
 *  - `en` copy source object
 *  - `ja` コピー元オブジェクト
 * @param omitKeys
 *  - `en` omit target keys
 *  - `ja` 削除対象のキー一覧
 */
export function omit<T extends object, K extends keyof T>(target: T, ...omitKeys: K[]): Writable<Omit<T, K>> {
    if (!target || !isObject(target)) {
        throw new TypeError(`${className(target)} is not an object.`);
    }
    const obj = {} as Writable<Omit<T, K>>;
    for (const key of Object.keys(target)) {
        !omitKeys.includes(key as K) && (obj[key] = target[key]);
    }
    return obj;
}

/**
 * @en Invert the keys and values of an object. The values must be serializable.
 * @ja オブジェクトのキーと値を逆転する. すべての値がユニークであることが前提
 *
 * @param target
 *  - `en` target object
 *  - `ja` 対象オブジェクト
 */
export function invert<T extends object = any>(target: object): T {
    const result = {};
    for (const key of Object.keys(target)) {
        result[target[key]] = key;
    }
    return result as T;
}

/**
 * @en Get shallow copy of difference between `base` and `src`.
 * @ja `base` と `src` の差分プロパティをもつオブジェクトの Shallow Copy を取得
 *
 * @param base
 *  - `en` base object
 *  - `ja` 基準となるオブジェクト
 * @param src
 *  - `en` source object
 *  - `ja` コピー元オブジェクト
 */
export function diff<T extends object>(base: T, src: Partial<T>): Partial<T> {
    if (!base || !isObject(base)) {
        throw new TypeError(`${className(base)} is not an object.`);
    }
    if (!src || !isObject(src)) {
        throw new TypeError(`${className(src)} is not an object.`);
    }

    const retval: Partial<T> = {};

    for (const key of Object.keys(src)) {
        if (!deepEqual(base[key], src[key])) {
            retval[key] = src[key];
        }
    }

    return retval;
}

/**
 * @en If the value of the named property is a function then invoke it; otherwise, return it.
 * @ja object の property がメソッドならその実行結果を, プロパティならその値を返却
 *
 * @param target
 * - `en` Object to maybe invoke function `property` on.
 * - `ja` 評価するオブジェクト
 * @param property
 * - `en` The function by name to invoke on `object`.
 * - `ja` 評価するプロパティ名
 * @param fallback
 * - `en` The value to be returned in case `property` doesn't exist or is undefined.
 * - `ja` 存在しなかった場合の fallback 値
 */
export function result<T = any>(target: object | Nil, property: string | string[], fallback?: T): T {
    const props = isArray(property) ? property : [property];
    if (!props.length) {
        return isFunction(fallback) ? fallback.call(target) : fallback;
    }

    const resolve = (o: unknown, p: unknown): any => {
        return isFunction(p) ? p.call(o) : p;
    };

    let obj: any = target;
    for (const name of props) {
        const prop = null == obj ? undefined : obj[name];
        if (undefined === prop) {
            return resolve(obj, fallback);
        }
        obj = resolve(obj, prop);
    }
    return obj;
}
