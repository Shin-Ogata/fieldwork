/**
 * @en Convert to [[IStorage]] stocked type. <br>
 *     Ensure not to return `undefined` value.
 * @ja [[IStorage]] 格納形式に変換 <br>
 *     `undefined` を返却しないことを保証
 */
export function dropUndefined<T>(value: T | null | undefined, nilSerialize = false): T | 'null' | 'undefined' | null {
    return null != value ? value : (nilSerialize ? String(value) : null) as T | 'null' | 'undefined' | null;
}

/**
 * @en Deserialize from [[IStorage]] stocked type. <br>
 *     Convert from 'null' or 'undefined' string to original type.
 * @ja 'null' or 'undefined' をもとの型に戻す
 */
export function restoreNil<T>(value: T | 'null' | 'undefined'): T | null | undefined {
    if ('null' === value) {
        return null;
    } else if ('undefined' === value) {
        return undefined;
    } else {
        return value;
    }
}
