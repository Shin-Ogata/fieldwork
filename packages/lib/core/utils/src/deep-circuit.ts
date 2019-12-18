/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    TypedArray,
    isFunction,
    isArray,
    isObject,
    isIterable,
    isTypedArray,
    sameClass,
} from './types';

/** @internal helper for deepEqual() */
function arrayEqual(lhs: unknown[], rhs: unknown[]): boolean {
    const len = lhs.length;
    if (len !== rhs.length) {
        return false;
    }
    for (let i = 0; i < len; i++) {
        if (!deepEqual(lhs[i], rhs[i])) {
            return false;
        }
    }
    return true;
}

/** @internal helper for deepEqual() */
function bufferEqual(lhs: SharedArrayBuffer | ArrayBuffer, rhs: SharedArrayBuffer | ArrayBuffer): boolean {
    const size = lhs.byteLength;
    if (size !== rhs.byteLength) {
        return false;
    }
    let pos = 0;
    if (size - pos >= 8) {
        const len = size >>> 3;
        const f64L = new Float64Array(lhs, 0, len);
        const f64R = new Float64Array(rhs, 0, len);
        for (let i = 0; i < len; i++) {
            if (!Object.is(f64L[i], f64R[i])) {
                return false;
            }
        }
        pos = len << 3;
    }
    if (pos === size) {
        return true;
    }
    const L = new DataView(lhs);
    const R = new DataView(rhs);
    if (size - pos >= 4) {
        if (!Object.is(L.getUint32(pos), R.getUint32(pos))) {
            return false;
        }
        pos += 4;
    }
    if (size - pos >= 2) {
        if (!Object.is(L.getUint16(pos), R.getUint16(pos))) {
            return false;
        }
        pos += 2;
    }
    if (size > pos) {
        if (!Object.is(L.getUint8(pos), R.getUint8(pos))) {
            return false;
        }
        pos += 1;
    }
    return pos === size;
}

/**
 * @en Performs a deep comparison between two values to determine if they are equivalent.
 * @ja 2値の詳細比較をし, 等しいかどうか判定
 */
export function deepEqual(lhs: unknown, rhs: unknown): boolean {
    if (lhs === rhs) {
        return true;
    }
    if (isFunction(lhs) && isFunction(rhs)) {
        return lhs.length === rhs.length && lhs.name === rhs.name;
    }
    if (!isObject(lhs) || !isObject(rhs)) {
        return false;
    }
    { // Primitive Wrapper Objects / Date
        const valueL = lhs.valueOf();
        const valueR = rhs.valueOf();
        if (lhs !== valueL || rhs !== valueR) {
            return valueL === valueR;
        }
    }
    { // RegExp
        const isRegExpL = lhs instanceof RegExp;
        const isRegExpR = rhs instanceof RegExp;
        if (isRegExpL || isRegExpR) {
            return isRegExpL === isRegExpR && String(lhs) === String(rhs);
        }
    }
    { // Array
        const isArrayL = isArray(lhs);
        const isArrayR = isArray(rhs);
        if (isArrayL || isArrayR) {
            return isArrayL === isArrayR && arrayEqual(lhs as any, rhs as any);
        }
    }
    { // ArrayBuffer
        const isBufferL = lhs instanceof ArrayBuffer;
        const isBufferR = rhs instanceof ArrayBuffer;
        if (isBufferL || isBufferR) {
            return isBufferL === isBufferR && bufferEqual(lhs as any, rhs as any);
        }
    }
    { // ArrayBufferView
        const isBufferViewL = ArrayBuffer.isView(lhs);
        const isBufferViewR = ArrayBuffer.isView(rhs);
        if (isBufferViewL || isBufferViewR) {
            return isBufferViewL === isBufferViewR && sameClass(lhs, rhs)
                && bufferEqual((lhs as ArrayBufferView).buffer, (rhs as ArrayBufferView).buffer);
        }
    }
    { // other Iterable
        const isIterableL = isIterable(lhs);
        const isIterableR = isIterable(rhs);
        if (isIterableL || isIterableR) {
            return isIterableL === isIterableR && arrayEqual([...(lhs as any)], [...(rhs as any)]);
        }
    }
    if (sameClass(lhs, rhs)) {
        const keysL = new Set(Object.keys(lhs));
        const keysR = new Set(Object.keys(rhs));
        if (keysL.size !== keysR.size) {
            return false;
        }
        for (const key of keysL) {
            if (!keysR.has(key)) {
                return false;
            }
        }
        for (const key of keysL) {
            if (!deepEqual(lhs[key], rhs[key])) {
                return false;
            }
        }
    } else {
        for (const key in lhs) {
            if (!(key in rhs)) {
                return false;
            }
        }
        const keys = new Set<string>();
        for (const key in rhs) {
            if (!(key in lhs)) {
                return false;
            }
            keys.add(key);
        }
        for (const key of keys) {
            if (!deepEqual(lhs[key], rhs[key])) {
                return false;
            }
        }
    }
    return true;
}

//__________________________________________________________________________________________________//

/** @internal clone RegExp */
function cloneRegExp(regexp: RegExp): RegExp {
    const result = new RegExp(regexp.source, regexp.flags);
    result.lastIndex = regexp.lastIndex;
    return result;
}

/** @internal clone ArrayBuffer */
function cloneArrayBuffer(arrayBuffer: ArrayBuffer): ArrayBuffer {
    const result = new ArrayBuffer(arrayBuffer.byteLength);
    new Uint8Array(result).set(new Uint8Array(arrayBuffer));
    return result;
}

/** @internal clone DataView */
function cloneDataView(dataView: DataView): DataView {
    const buffer = cloneArrayBuffer(dataView.buffer);
    return new DataView(buffer, dataView.byteOffset, dataView.byteLength);
}

/** @internal clone TypedArray */
function cloneTypedArray<T extends TypedArray>(typedArray: T): T {
    const buffer = cloneArrayBuffer(typedArray.buffer);
    return new (typedArray as any).constructor(buffer, typedArray.byteOffset, typedArray.length);
}

/** @internal check necessary to update */
function needUpdate(oldValue: unknown, newValue: unknown, exceptUndefined: boolean): boolean {
    if (oldValue !== newValue) {
        return true;
    } else {
        return (exceptUndefined && undefined === oldValue);
    }
}

/** @internal merge Array */
function mergeArray(target: any[], source: any[]): any[] {
    for (let i = 0, len = source.length; i < len; i++) {
        const oldValue = target[i];
        const newValue = merge(oldValue, source[i]);
        !needUpdate(oldValue, newValue, false) || (target[i] = newValue);
    }
    return target;
}

/** @internal merge Set */
function mergeSet(target: Set<any>, source: Set<any>): Set<any> {
    for (const item of source) {
        target.has(item) || target.add(merge(undefined, item));
    }
    return target;
}

/** @internal merge Map */
function mergeMap(target: Map<any, any>, source: Map<any, any>): Map<any, any> {
    for (const [k, v] of source) {
        const oldValue = target.get(k);
        const newValue = merge(oldValue, v);
        !needUpdate(oldValue, newValue, false) || target.set(k, newValue);
    }
    return target;
}

/** @internal helper for deepMerge() */
function merge(target: unknown, source: unknown): any {
    if (undefined === source || target === source) {
        return target;
    }
    if (!isObject(source)) {
        return source;
    }
    // Primitive Wrapper Objects / Date
    if (source.valueOf() !== source) {
        return deepEqual(target, source) ? target : new (source as any).constructor(source.valueOf());
    }
    // RegExp
    if (source instanceof RegExp) {
        return deepEqual(target, source) ? target : cloneRegExp(source);
    }
    // ArrayBuffer
    if (source instanceof ArrayBuffer) {
        return deepEqual(target, source) ? target : cloneArrayBuffer(source);
    }
    // ArrayBufferView
    if (ArrayBuffer.isView(source)) {
        return deepEqual(target, source) ? target : isTypedArray(source) ? cloneTypedArray(source) : cloneDataView(source as DataView);
    }
    // Array
    if (Array.isArray(source)) {
        return mergeArray(isArray(target) ? target : [], source);
    }
    // Set
    if (source instanceof Set) {
        return mergeSet(target instanceof Set ? target : new Set(), source);
    }
    // Map
    if (source instanceof Map) {
        return mergeMap(target instanceof Map ? target : new Map(), source);
    }

    const obj = isObject(target) ? target : {};
    if (sameClass(target, source)) {
        for (const key of Object.keys(source)) {
            const oldValue = obj[key];
            const newValue = merge(oldValue, source[key]);
            !needUpdate(oldValue, newValue, true) || (obj[key] = newValue);
        }
    } else {
        for (const key in source) {
            const oldValue = obj[key];
            const newValue = merge(oldValue, source[key]);
            !needUpdate(oldValue, newValue, true) || (obj[key] = newValue);
        }
    }
    return obj;
}

/**
 * @en Recursively merges own and inherited enumerable string keyed properties of source objects into the destination object.
 * @ja オブジェクトの再帰的マージを実行
 */
export function deepMerge<T, S1, S2, S3, S4, S5, S6, S7, S8, S9>(
    target: T,
    ...sources: [S1, S2?, S3?, S4?, S5?, S6?, S7?, S8?, S9?, ...any[]]
): T & S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9;
export function deepMerge<X>(target: any, ...sources: any[]): X;
export function deepMerge(target: any, ...sources: any[]): any {
    let result = target;
    for (const source of sources) {
        result = merge(result, source);
    }
    return result;
}

//__________________________________________________________________________________________________//

/**
 * @en Create deep copy instance of source object.
 * @ja ディープコピーオブジェクトの生成
 */
export function deepCopy<T>(src: T): T {
    return deepMerge(undefined, src);
}
