/**
 * @en Convert to [[IStorage]] stocked type. <br>
 *     Ensure not to return `undefined` value.
 * @ja [[IStorage]] 格納形式に変換 <br>
 *     `undefined` を返却しないことを保証
 */
export declare function dropUndefined<T>(value: T | null | undefined, nilSerialize?: boolean): T | 'null' | 'undefined' | null;
/**
 * @en Deserialize from [[IStorage]] stocked type. <br>
 *     Convert from 'null' or 'undefined' string to original type.
 * @ja 'null' or 'undefined' をもとの型に戻す
 */
export declare function restoreNil<T>(value: T | 'null' | 'undefined'): T | null | undefined;
