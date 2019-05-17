/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */

export type Nil = void | null | undefined;

export type Nillable<T extends Object> = T | Nil;

export type Primitive = string | number | boolean | symbol | null | undefined;

export interface TypeMap {
    string: string;
    number: number;
    boolean: boolean;
    symbol: symbol;
    undefined: void | undefined;
    object: object | null;
    function(...args: any[]): any;
}

export type TypeKeys = keyof TypeMap;

export interface Type<T extends Object> extends Function {
    readonly prototype: T;
}

export interface Constructor<T> extends Type<T> {
    new(...args: any[]): T;
}

export function is<O extends Object>(x: Nillable<O>): x is O;
export function is(x: any): x is Object;
export function is(x: any) {
    return x != null;
}

export function isNil(x: any): x is Nil {
    return x == null;
}

export function isString(x: any): x is string {
    return typeof x === 'string';
}

export function isNumber(x: any): x is number {
    return typeof x === 'number';
}

export function isBoolean(x: any): x is boolean {
    return typeof x === 'boolean';
}

export function isSymbol(x: any): x is symbol {
    return typeof x === 'symbol';
}

export function isPrimitive(x: any): x is Primitive {
    return !x || typeof x !== 'function' && typeof x !== 'object';
}

export function isObject(x: any): x is object {
    return Boolean(x) && typeof x === 'object';
}

export function isFunction(x: any): x is TypeMap['function'] {
    return typeof x === 'function';
}

export function typeOf<K extends TypeKeys>(type: K, x: any): x is TypeMap[K] {
    return typeof x === type;
}

export function isIterable<T>(x: Nillable<Iterable<T>>): x is Iterable<T>;
export function isIterable(x: any): x is Iterable<any>;
export function isIterable(x: any) {
    return Symbol.iterator in Object(x);
}

export function instanceOf<T extends Object>(C: Nillable<Type<T>>, x: any): x is T {
    return typeof C === 'function' && x instanceof C;
}

export function ownInstanceOf<T extends Object>(C: Nillable<Type<T>>, x: any): x is T {
    return typeof C === 'function' && Object.getPrototypeOf(x) === Object(C.prototype);
}

export function className(x: any): string {
    if (x != null) {
        const toStringTagName = x[Symbol.toStringTag];
        if (isString(toStringTagName)) {
            return toStringTagName;
        }
        const C = x.constructor;
        if (isFunction(C) && C === (Object(C.prototype) as Object).constructor) {
            return C.name;
        }
    }
    return (Object.prototype.toString.call(x) as string).slice(8, -1);
}

export function sameType(a: any, b: any): boolean {
    return typeof a === typeof b;
}

export function sameClass(a: any, b: any): boolean {
    return a != null && b != null && Object.getPrototypeOf(a) === Object.getPrototypeOf(b);
}

/** `pickupKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を返す */
export function partialize<T extends object, K extends keyof T>(target: T, ...pickupKeys: K[]) {
    if (!target || !isObject(target)) {
        throw new TypeError(`${className(target)} is not an object.`);
    }
    return pickupKeys.reduce((obj, key) => {
        key in target && (obj[key] = target[key]);
        return obj;
    }, {} as { -readonly [P in K]: T[P]; });    // eslint-disable-line @typescript-eslint/no-object-literal-type-assertion
}
