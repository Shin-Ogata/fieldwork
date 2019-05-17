/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeKeys, is, className } from './types';

export function throwIfNil(x: any, message?: string | null): void | never {
    if (x == null) {
        is(message) || (message = `${className(x)} is not a valid value.`);
        throw new TypeError(message);
    }
}

export function throwIfNotTypeOf(type: TypeKeys, x: any, message?: string | null): void | never {
    if (typeof x !== type) {
        is(message) || (message = `Type of ${className(x)} is not ${type}.`);
        throw new TypeError(message);
    }
}

export function throwIfNotArray(x: any, message?: string | null): void | never {
    if (!Array.isArray(x)) {
        is(message) || (message = `${className(x)} is not an Array.`);
        throw new TypeError(message);
    }
}

export function throwIfNotIterable(x: any, message?: string | null): void | never {
    if (!(Symbol.iterator in Object(x))) {
        is(message) || (message = `${className(x)} is not an iterable object.`);
        throw new TypeError(message);
    }
}

export function throwIfNotInstanceOf(C: Function, x: any, message?: string | null): void | never {
    if (!(x instanceof C)) {
        is(message) || (message = `${className(x)} is not an instance of ${C.name}.`);
        throw new TypeError(message);
    }
}

export function throwIfOwnInstanceOf(C: Function, x: any, message?: string | null): void | never {
    if (Object.getPrototypeOf(x) === Object(C.prototype)) {
        is(message) || (message = `The object passed is own instance of ${C.name}.`);
        throw new TypeError(message);
    }
}

export function throwIfNotOwnInstanceOf(C: Function, x: any, message?: string | null): void | never {
    if (Object.getPrototypeOf(x) !== Object(C.prototype)) {
        is(message) || (message = `The object passed is not own instance of ${C.name}.`);
        throw new TypeError(message);
    }
}

export function throwIfNotHasProperty(x: any, p: PropertyKey, message?: string | null): void | never {
    if (!(p in x)) {
        is(message) || (message = `The object passed does not have property ${String(p)}.`);
        throw new TypeError(message);
    }
}

export function throwIfNotHasOwnProperty(x: any, p: PropertyKey, message?: string | null): void | never {
    if (!Object.prototype.hasOwnProperty.call(x, p)) {
        is(message) || (message = `The object passed does not have own property ${String(p)}.`);
        throw new TypeError(message);
    }
}
