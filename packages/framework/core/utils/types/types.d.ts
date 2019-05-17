export declare type Nil = void | null | undefined;
export declare type Nillable<T extends Object> = T | Nil;
export declare type Primitive = string | number | boolean | symbol | null | undefined;
export interface TypeMap {
    string: string;
    number: number;
    boolean: boolean;
    symbol: symbol;
    undefined: void | undefined;
    object: object | null;
    function(...args: any[]): any;
}
export declare type TypeKeys = keyof TypeMap;
export interface Type<T extends Object> extends Function {
    readonly prototype: T;
}
export interface Constructor<T> extends Type<T> {
    new (...args: any[]): T;
}
export declare function is<O extends Object>(x: Nillable<O>): x is O;
export declare function is(x: any): x is Object;
export declare function isNil(x: any): x is Nil;
export declare function isString(x: any): x is string;
export declare function isNumber(x: any): x is number;
export declare function isBoolean(x: any): x is boolean;
export declare function isSymbol(x: any): x is symbol;
export declare function isPrimitive(x: any): x is Primitive;
export declare function isObject(x: any): x is object;
export declare function isFunction(x: any): x is TypeMap['function'];
export declare function typeOf<K extends TypeKeys>(type: K, x: any): x is TypeMap[K];
export declare function isIterable<T>(x: Nillable<Iterable<T>>): x is Iterable<T>;
export declare function isIterable(x: any): x is Iterable<any>;
export declare function instanceOf<T extends Object>(C: Nillable<Type<T>>, x: any): x is T;
export declare function ownInstanceOf<T extends Object>(C: Nillable<Type<T>>, x: any): x is T;
export declare function className(x: any): string;
export declare function sameType(a: any, b: any): boolean;
export declare function sameClass(a: any, b: any): boolean;
/** `pickupKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を返す */
export declare function partialize<T extends object, K extends keyof T>(target: T, ...pickupKeys: K[]): { -readonly [P in K]: T[P]; };
