/* eslint-disable
    no-invalid-this
 ,  @typescript-eslint/no-explicit-any
 ,  @typescript-eslint/ban-types
 ,  @typescript-eslint/explicit-module-boundary-types
 */

const random = Math.random.bind(Math);

/**
 * @en Execute shuffle of an array elements.
 * @ja 配列要素のシャッフル
 *
 * @param array
 *  - `en` source array
 *  - `ja` 入力配列
 * @param destructive
 *  - `en` true: destructive / false: non-destructive (default)
 *  - `ja` true: 破壊的 / false: 非破壊的 (既定)
 */
export function shuffle<T>(array: T[], destructive = false): T[] {
    const source = destructive ? array : array.slice();
    const len = source.length;
    for (let i = len > 0 ? len >>> 0 : 0; i > 1;) {
        const j = i * random() >>> 0;
        const swap = source[--i];
        source[i] = source[j];
        source[j] = swap;
    }
    return source;
}

//__________________________________________________________________________________________________//

/**
 * @en Execute stable sort by merge-sort algorithm.
 * @ja `merge-sort` による安定ソート
 *
 * @param array
 *  - `en` source array
 *  - `ja` 入力配列
 * @param comparator
 *  - `en` sort comparator function
 *  - `ja` ソート関数を指定
 * @param destructive
 *  - `en` true: destructive / false: non-destructive (default)
 *  - `ja` true: 破壊的 / false: 非破壊的 (既定)
 */
export function sort<T>(array: T[], comparator: (lhs: T, rhs: T) => number, destructive = false): T[] {
    const source = destructive ? array : array.slice();
    if (source.length < 2) {
        return source;
    }
    const lhs = sort(source.splice(0, source.length >>> 1), comparator, true);
    const rhs = sort(source.splice(0), comparator, true);
    while (lhs.length && rhs.length) {
        source.push(comparator(lhs[0], rhs[0]) <= 0 ? lhs.shift() as T : rhs.shift() as T);
    }
    return source.concat(lhs, rhs);
}

//__________________________________________________________________________________________________//

/**
 * @en Make unique array.
 * @ja 重複要素のない配列の作成
 *
 * @param array
 *  - `en` source array
 *  - `ja` 入力配列
 */
export function unique<T>(array: T[]): T[] {
    return [...new Set(array)];
}

/**
 * @en Make union array.
 * @ja 配列の和集合を返却
 *
 * @param arrays
 *  - `en` source arrays
 *  - `ja` 入力配列群
 */
export function union<T>(...arrays: T[][]): T[] {
    return unique(arrays.flat());
}

//__________________________________________________________________________________________________//

/**
 * @en Make index array.
 * @ja インデックス配列の作成
 *
 * @param array
 *  - `en` source array
 *  - `ja` 入力配列
 * @param excludes
 *  - `en` exclude index in return value.
 *  - `ja` 戻り値配列に含めないインデックスを指定
 */
export function indices<T>(array: T[], ...excludes: number[]): number[] {
    const retval = [...array.keys()];

    const len = array.length;
    const exList = [...new Set(excludes)].sort((lhs, rhs) => lhs < rhs ? 1 : -1);
    for (const ex of exList) {
        if (0 <= ex && ex < len) {
            retval.splice(ex, 1);
        }
    }

    return retval;
}

//__________________________________________________________________________________________________//

/**
 * @en [[groupBy]]() options definition.
 * @ja [[groupBy]]() に指定するオプション定義
 */
export interface GroupByOptions<
    T extends object,
    TKEYS extends keyof T,
    TSUMKEYS extends keyof T,
    TGROUPKEY extends string
> {
    /**
     * @en `GROUP BY` keys.
     * @ja `GROUP BY` に指定するキー
     */
    keys: Extract<TKEYS, string>[];

    /**
     * @en Aggregatable keys.
     * @ja 集計可能なキー一覧
     */
    sumKeys?: Extract<TSUMKEYS, string>[];

    /**
     * @en Grouped item access key. default: 'items',
     * @ja グルーピングされた要素へのアクセスキー. 既定: 'items'
     */
    groupKey?: TGROUPKEY;
}

/**
 * @en Return type of [[groupBy]]().
 * @ja [[groupBy]]() が返却する型
 */
export type GroupByReturnValue<
    T extends object,
    TKEYS extends keyof T,
    TSUMKEYS extends keyof T = never,
    TGROUPKEY extends string = 'items'
> = Readonly<Record<TKEYS, {}> & Record<TSUMKEYS, {}> & Record<TGROUPKEY, T[]>>;

/**
 * @en Execute `GROUP BY` for array elements.
 * @ja 配列の要素の `GROUP BY` 集合を抽出
 *
 * @param array
 *  - `en` source array
 *  - `ja` 入力配列
 * @param options
 *  - `en` `GROUP BY` options
 *  - `ja` `GROUP BY` オプション
 */
export function groupBy<
    T extends object,
    TKEYS extends keyof T,
    TSUMKEYS extends keyof T = never,
    TGROUPKEY extends string = 'items'
>(array: T[], options: GroupByOptions<T, TKEYS, TSUMKEYS, TGROUPKEY>): GroupByReturnValue<T, TKEYS, TSUMKEYS, TGROUPKEY>[] {
    const { keys, sumKeys, groupKey } = options;
    const _groupKey = groupKey || 'items';
    const _sumKeys: string[] = sumKeys || [];
    _sumKeys.push(_groupKey);

    const hash = array.reduce((res: T, data: T) => {
        // create groupBy internal key
        const _key = keys.reduce((s, k) => s + String(data[k]), '');

        // init keys
        if (!(_key in res)) {
            const keyList = keys.reduce((h, k: string) => {
                h[k] = data[k];
                return h;
            }, {});

            res[_key] = _sumKeys.reduce((h, k: string) => {
                h[k] = 0;
                return h;
            }, keyList);
        }

        const resKey = res[_key];

        // sum properties
        for (const k of _sumKeys) {
            if (_groupKey === k) {
                resKey[k] = resKey[k] || [];
                resKey[k].push(data);
            } else {
                resKey[k] += data[k];
            }
        }

        return res;
    }, {});

    return Object.values(hash);
}

//__________________________________________________________________________________________________//

/**
 * @en Substitution method of `Array.prototype.map()` which also accepts asynchronous callback.
 * @ja 非同期コールバックを指定可能な `Array.prototype.map()` の代替メソッド
 * 
 * @param array
 *  - `en` Array to iterate over.
 *  - `ja` 入力配列
 * @param callback
 *  - `en` Function to apply each item in `array`.
 *  - `ja` イテレーション適用関数
 * @param thisArg
 *  - `en` Value to use as *this* when executing the `callback`.
 *  - `ja` `callback` 実行コンテキスト
 * @returns
 *  - `en` Returns a Promise with the resultant *Array* as value.
 *  - `ja` イテレーション結果配列を格納した Promise オブジェクト
 */
export async function map<T, U>(this: any, array: T[], callback: (value: T, index: number, array: T[]) => U | Promise<U>, thisArg?: any): Promise<U[]> {
    return Promise.all(
        array.map(async (v, i, a) => {
            return await callback.call(thisArg || this, v, i, a);
        })
    );
}

/**
 * @en Substitution method of `Array.prototype.filter()` which also accepts asynchronous callback.
 * @ja 非同期コールバックを指定可能な `Array.prototype.filter()` の代替メソッド
 *
 * @param array
 *  - `en` Array to iterate over.
 *  - `ja` 入力配列
 * @param callback
 *  - `en` Function to apply each item in `array`.
 *  - `ja` イテレーション適用関数
 * @param thisArg
 *  - `en` Value to use as *this* when executing the `callback`.
 *  - `ja` `callback` 実行コンテキスト
 * @returns
 *  - `en` Returns a Promise with the resultant *Array* as value.
 *  - `ja` イテレーション結果配列を格納した Promise オブジェクト
 */
export async function filter<T>(this: any, array: T[], callback: (value: T, index: number, array: T[]) => boolean | Promise<boolean>, thisArg?: any): Promise<T[]> {
    const bits: boolean[] = await map(array, (v, i, a) => callback.call(thisArg || this, v, i, a));
    return array.filter(() => bits.shift());
}

/**
 * @en Substitution method of `Array.prototype.find()` which also accepts asynchronous callback.
 * @ja 非同期コールバックを指定可能な `Array.prototype.find()` の代替メソッド
 *
 * @param array
 *  - `en` Array to iterate over.
 *  - `ja` 入力配列
 * @param callback
 *  - `en` Function to apply each item in `array`.
 *  - `ja` イテレーション適用関数
 * @param thisArg
 *  - `en` Value to use as *this* when executing the `callback`.
 *  - `ja` `callback` 実行コンテキスト
 * @returns
 *  - `en` Returns a Promise with the resultant value.
 *  - `ja` イテレーション結果を格納した Promise オブジェクト
 */
export async function find<T>(this: any, array: T[], callback: (value: T, index: number, array: T[]) => boolean | Promise<boolean>, thisArg?: any): Promise<T | undefined> {
    for (const [i, v] of array.entries()) {
        if (await callback.call(thisArg || this, v, i, array)) {
            return v;
        }
    }
    return undefined;
}

/**
 * @en Substitution method of `Array.prototype.findIndex()` which also accepts asynchronous callback.
 * @ja 非同期コールバックを指定可能な `Array.prototype.findIndex()` の代替メソッド
 *
 * @param array
 *  - `en` Array to iterate over.
 *  - `ja` 入力配列
 * @param callback
 *  - `en` Function to apply each item in `array`.
 *  - `ja` イテレーション適用関数
 * @param thisArg
 *  - `en` Value to use as *this* when executing the `callback`.
 *  - `ja` `callback` 実行コンテキスト
 * @returns
 *  - `en` Returns a Promise with the resultant index value.
 *  - `ja` インデックスを格納した Promise オブジェクト
 */
export async function findIndex<T>(this: any, array: T[], callback: (value: T, index: number, array: T[]) => boolean | Promise<boolean>, thisArg?: any): Promise<number> {
    for (const [i, v] of array.entries()) {
        if (await callback.call(thisArg || this, v, i, array)) {
            return i;
        }
    }
    return -1;
}

/**
 * @en Substitution method of `Array.prototype.some()` which also accepts asynchronous callback.
 * @ja 非同期コールバックを指定可能な `Array.prototype.some()` の代替メソッド
 *
 * @param array
 *  - `en` Array to iterate over.
 *  - `ja` 入力配列
 * @param callback
 *  - `en` Function to apply each item in `array`.
 *  - `ja` イテレーション適用関数
 * @param thisArg
 *  - `en` Value to use as *this* when executing the `callback`.
 *  - `ja` `callback` 実行コンテキスト
 * @returns
 *  - `en` Returns a Promise with the resultant boolean value.
 *  - `ja` 真偽値を格納した Promise オブジェクト
 */
export async function some<T>(this: any, array: T[], callback: (value: T, index: number, array: T[]) => unknown | Promise<unknown>, thisArg?: any): Promise<boolean> {
    for (const [i, v] of array.entries()) {
        if (await callback.call(thisArg || this, v, i, array)) {
            return true;
        }
    }
    return false;
}

/**
 * @en Substitution method of `Array.prototype.every()` which also accepts asynchronous callback.
 * @ja 非同期コールバックを指定可能な `Array.prototype.every()` の代替メソッド
 *
 * @param array
 *  - `en` Array to iterate over.
 *  - `ja` 入力配列
 * @param callback
 *  - `en` Function to apply each item in `array`.
 *  - `ja` イテレーション適用関数
 * @param thisArg
 *  - `en` Value to use as *this* when executing the `callback`.
 *  - `ja` `callback` 実行コンテキスト
 * @returns
 *  - `en` Returns a Promise with the resultant boolean value.
 *  - `ja` 真偽値を格納した Promise オブジェクト
 */
export async function every<T>(this: any, array: T[], callback: (value: T, index: number, array: T[]) => unknown | Promise<unknown>, thisArg?: any): Promise<boolean> {
    for (const [i, v] of array.entries()) {
        if (!await callback.call(thisArg || this, v, i, array)) {
            return false;
        }
    }
    return true;
}

/**
 * @en Substitution method of `Array.prototype.reduce()` which also accepts asynchronous callback.
 * @ja 非同期コールバックを指定可能な `Array.prototype.reduce()` の代替メソッド
 *
 * @param array
 *  - `en` Array to iterate over.
 *  - `ja` 入力配列
 * @param callback
 *  - `en` Function to apply each item in `array`.
 *  - `ja` イテレーション適用関数
 * @param initialValue
 *  - `en` Used as first argument to the first call of `callback`.
 *  - `ja` `callback` に渡される初期値
 * @returns
 *  - `en` Returns a Promise with the resultant *Array* as value.
 *  - `ja` イテレーション結果配列を格納した Promise オブジェクト
 */
export async function reduce<T, U>(
    array: T[],
    callback: (accumulator: U, currentValue: T, currentIndex: number, array: T[]) => U | Promise<U>,
    initialValue?: U
): Promise<U> {
    if (array.length <= 0 && undefined === initialValue) {
        throw TypeError('Reduce of empty array with no initial value');
    }

    const hasInit = (undefined !== initialValue);
    let acc = (hasInit ? initialValue : array[0]) as U;

    for (const [i, v] of array.entries()) {
        if (!(!hasInit && 0 === i)) {
            acc = await callback(acc, v, i, array);
        }
    }

    return acc;
}
