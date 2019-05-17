/*!
 * @cdp/core-utils 0.9.0
 *   core framework utilities
 */

declare module '@cdp/core-utils' {
    export * from '@cdp/core-utils/types';
    export * from '@cdp/core-utils/verify';
    export * from '@cdp/core-utils/check';
}

declare module '@cdp/core-utils/types' {
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
        new (...args: any[]): T;
    }
    export function is<O extends Object>(x: Nillable<O>): x is O;
    export function is(x: any): x is Object;
    export function isNil(x: any): x is Nil;
    export function isString(x: any): x is string;
    export function isNumber(x: any): x is number;
    export function isBoolean(x: any): x is boolean;
    export function isSymbol(x: any): x is symbol;
    export function isPrimitive(x: any): x is Primitive;
    export function isObject(x: any): x is object;
    export function isFunction(x: any): x is TypeMap['function'];
    export function typeOf<K extends TypeKeys>(type: K, x: any): x is TypeMap[K];
    export function isIterable<T>(x: Nillable<Iterable<T>>): x is Iterable<T>;
    export function isIterable(x: any): x is Iterable<any>;
    export function instanceOf<T extends Object>(C: Nillable<Type<T>>, x: any): x is T;
    export function ownInstanceOf<T extends Object>(C: Nillable<Type<T>>, x: any): x is T;
    export function className(x: any): string;
    export function sameType(a: any, b: any): boolean;
    export function sameClass(a: any, b: any): boolean;
    /** `pickupKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を返す */
    export function partialize<T extends object, K extends keyof T>(target: T, ...pickupKeys: K[]): { -readonly [P in K]: T[P]; };
}

declare module '@cdp/core-utils/verify' {
    import { TypeKeys } from '@cdp/core-utils/types';
    export function throwIfNil(x: any, message?: string | null): void | never;
    export function throwIfNotTypeOf(type: TypeKeys, x: any, message?: string | null): void | never;
    export function throwIfNotArray(x: any, message?: string | null): void | never;
    export function throwIfNotIterable(x: any, message?: string | null): void | never;
    export function throwIfNotInstanceOf(C: Function, x: any, message?: string | null): void | never;
    export function throwIfOwnInstanceOf(C: Function, x: any, message?: string | null): void | never;
    export function throwIfNotOwnInstanceOf(C: Function, x: any, message?: string | null): void | never;
    export function throwIfNotHasProperty(x: any, p: PropertyKey, message?: string | null): void | never;
    export function throwIfNotHasOwnProperty(x: any, p: PropertyKey, message?: string | null): void | never;
}

declare module '@cdp/core-utils/check' {
    const hoge = "hoge";
    export { hoge };
}

