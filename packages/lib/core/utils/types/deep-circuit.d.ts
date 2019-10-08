/**
 * @en Performs a deep comparison between two values to determine if they are equivalent.
 * @ja 2値の詳細比較をし, 等しいかどうか判定
 */
export declare function deepEqual(lhs: unknown, rhs: unknown): boolean;
/**
 * @en Recursively merges own and inherited enumerable string keyed properties of source objects into the destination object.
 * @ja オブジェクトの再帰的マージを実行
 */
export declare function deepMerge<T, S1, S2, S3, S4, S5, S6, S7, S8, S9>(target: T, ...sources: [S1, S2?, S3?, S4?, S5?, S6?, S7?, S8?, S9?, ...any[]]): T & S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9;
export declare function deepMerge<X>(target: any, ...sources: any[]): X;
/**
 * @en Create deep copy instance of source object.
 * @ja ディープコピーオブジェクトの生成
 */
export declare function deepCopy<T>(src: T): T;
