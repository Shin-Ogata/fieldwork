import { UnknownObject } from './types';
/**
 * @en Set by specifying key and value for the object. (prototype pollution countermeasure)
 * @ja オブジェクトに key, value を指定して設定 (プロトタイプ汚染対策)
 */
export declare function assignValue(target: UnknownObject, key: string | number | symbol, value: unknown): void;
/**
 * @en Performs a deep comparison between two values to determine if they are equivalent.
 * @ja 2値の詳細比較をし, 等しいかどうか判定
 */
export declare function deepEqual(lhs: unknown, rhs: unknown): boolean;
/**
 * @en Recursively merges own and inherited enumerable string keyed properties of source objects into the destination object.
 * @ja オブジェクトの再帰的マージを実行
 */
export declare function deepMerge<T, S1, S2, S3, S4, S5, S6, S7, S8, S9>(target: T, ...sources: [S1, S2?, S3?, S4?, S5?, S6?, S7?, S8?, S9?, ...unknown[]]): T & S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9;
export declare function deepMerge<X>(target: unknown, ...sources: unknown[]): X;
/**
 * @en Create deep copy instance of source object.
 * @ja ディープコピーオブジェクトの生成
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
 */
export declare function deepCopy<T>(src: T): T;
