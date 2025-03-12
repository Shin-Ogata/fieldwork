import { type UnknownFunction, type Primitive, type TypedData } from './types';
/**
 * @en Ensure asynchronous execution.
 * @ja 非同期実行を保証
 *
 * @example <br>
 *
 * ```ts
 * void post(() => exec(arg));
 * ```
 *
 * @param executor
 *  - `en` implement as function scope.
 *  - `ja` 関数スコープとして実装
*/
export declare function post<T>(executor: () => T): Promise<T>;
/**
 * @en Generic No-Operation.
 * @ja 汎用 No-Operation
 */
export declare function noop(...args: unknown[]): any;
/**
 * @en Wait for the designation elapse.
 * @ja 指定時間処理を待機
 *
 * @param elapse
 *  - `en` wait elapse [msec].
 *  - `ja` 待機時間 [msec]
 */
export declare function sleep(elapse: number): Promise<void>;
/**
 * @en Option interface for {@link debounce}().
 * @ja {@link debounce}() に指定するオプションインターフェイス
 */
export interface DebounceOptions {
    /**
     * @en the maximum time `func` is allowed to be delayed before it's invoked.
     * @ja コールバックの呼び出しを待つ最大時間
     */
    maxWait?: number;
    /**
     * @en Specify `true` if you want to call the callback leading edge of the waiting time. (default: false)
     * @ja 待ち時間に対してコールバックを先呼び実行する場合は `true` を指定. (default: false)
     */
    leading?: boolean;
    /**
     * @en Specify `true` if you want to call the callback trailing edge of the waiting time. (default: true)
     * @ja 待ち時間に対してコールバックを後呼び実行する場合は `true` を指定. (default: true)
     */
    trailing?: boolean;
}
export type DebouncedFunction<T extends UnknownFunction> = T & {
    cancel(): void;
    flush(): ReturnType<T>;
    pending(): boolean;
};
/**
 * @en Returns a function, that, as long as it continues to be invoked, will not be triggered.
 * @ja 呼び出されてから wait [msec] 経過するまで実行しない関数を返却
 *
 * @param executor
 *  - `en` seed function.
 *  - `ja` 対象の関数
 * @param wait
 *  - `en` wait elapse [msec].
 *  - `ja` 待機時間 [msec]
 * @param options
 *  - `en` specify {@link DebounceOptions} object or `true` to fire the callback immediately.
 *  - `ja` {@link DebounceOptions} object もしくは即時にコールバックを発火するときは `true` を指定.
 */
export declare function debounce<T extends UnknownFunction>(executor: T, wait: number, options?: DebounceOptions | boolean): DebouncedFunction<T>;
/**
 * @en Option interface for {@link throttle}().
 * @ja {@link throttle}() に指定するオプションインターフェイス
 */
export interface ThrottleOptions {
    /**
     * @en Specify `true` if you want to call the callback leading edge of the waiting time. (default: true)
     * @ja 待ち時間に対してコールバックを先呼び実行する場合は `true` を指定. (default: true)
     */
    leading?: boolean;
    /**
     * @en Specify `true` if you want to call the callback trailing edge of the waiting time. (default: true)
     * @ja 待ち時間に対してコールバックを後呼び実行する場合は `true` を指定. (default: true)
     */
    trailing?: boolean;
}
/**
 * @en Returns a function, that, when invoked, will only be triggered at most once during a given time.
 * @ja 関数の実行を wait [msec] に1回に制限
 *
 * @example <br>
 *
 * ```ts
 * const throttled = throttle(upatePosition, 100);
 * $(window).scroll(throttled);
 * ```
 *
 * @param executor
 *  - `en` seed function.
 *  - `ja` 対象の関数
 * @param elapse
 *  - `en` wait elapse [msec].
 *  - `ja` 待機時間 [msec]
 * @param options
 */
export declare function throttle<T extends UnknownFunction>(executor: T, elapse: number, options?: ThrottleOptions): DebouncedFunction<T>;
/**
 * @en Returns a function that will be executed at most one time, no matter how often you call it.
 * @ja 1度しか実行されない関数を返却. 2回目以降は最初のコールのキャッシュを返却
 *
 * @param executor
 *  - `en` seed function.
 *  - `ja` 対象の関数
 */
export declare function once<T extends UnknownFunction>(executor: T): T;
/**
 * @en Return a deferred executable function object.
 * @ja 遅延実行可能な関数オブジェクトを返却
 *
 * @example <br>
 *
 * ```ts
 * const schedule = scheduler();
 * schedule(() => task1());
 * schedule(() => task2());
 * ```
 */
export declare function scheduler(): (exec: () => void) => void;
/**
 * @en Create escape function from map.
 * @ja 文字置換関数を作成
 *
 * @param map
 *  - `en` key: target char, value: replace char
 *  - `ja` key: 置換対象, value: 置換文字
 * @returns
 *  - `en` espace function
 *  - `ja` エスケープ関数
 */
export declare function createEscaper(map: Record<string, string>): (src: Primitive) => string;
/**
 * @en Escape HTML string.
 * @ja HTML で使用する文字を制御文字に置換
 *
 * @brief <br>
 *
 * ```ts
 * const mapHtmlEscape = {
 *     '<' : '&lt;',
 *     '>' : '&gt;',
 *     '&' : '&amp;',
 *     '″': '&quot;',
 *     `'` : '&#39;',
 *     '`' : '&#x60;'
 * };
 * ```
 */
export declare const escapeHTML: (src: Primitive) => string;
/**
 * @en Unescape HTML string.
 * @ja HTML で使用する制御文字を復元
 */
export declare const unescapeHTML: (src: Primitive) => string;
/**
 * @en Convert to the style compulsion value from input string.
 * @ja 入力文字列を型強制した値に変換
 *
 * @param data
 *  - `en` input string
 *  - `ja` 変換対象の文字列
 */
export declare function toTypedData(data: string | undefined): TypedData | undefined;
/**
 * @en Convert to string from {@link TypedData}.
 * @ja {@link TypedData} を文字列に変換
 *
 * @param data
 *  - `en` input string
 *  - `ja` 変換対象の文字列
 */
export declare function fromTypedData(data: TypedData | undefined): string | undefined;
/**
 * @en Convert to `Web API` stocked type. <br>
 *     Ensure not to return `undefined` value.
 * @ja `Web API` 格納形式に変換 <br>
 *     `undefined` を返却しないことを保証
 */
export declare function dropUndefined<T>(value: T | null | undefined, nullishSerialize?: boolean): T | 'null' | 'undefined' | null;
/**
 * @en Deserialize from `Web API` stocked type. <br>
 *     Convert from 'null' or 'undefined' string to original type.
 * @ja 'null' or 'undefined' をもとの型に戻す
 */
export declare function restoreNullish<T>(value: T | 'null' | 'undefined'): T | null | undefined;
/**
 * @en Get local unique id. <br>
 *     "local unique" means guarantees unique during in script life cycle only.
 * @ja ローカルユニーク ID の取得 <br>
 *     スクリプトライフサイクル中の同一性を保証する.
 *
 * @param prefix
 *  - `en` ID prefix
 *  - `ja` ID に付与する Prefix
 * @param zeroPad
 *  - `en` 0 padding order
 *  - `ja` 0 詰めする桁数を指定
 */
export declare function luid(prefix?: string, zeroPad?: number): string;
/**
 * @en Returns a random integer between `0` and `max`, inclusive.
 * @ja `0` - `max` のランダムの整数値を生成
 *
 * @param max
 *  - `en` The maximum random number.
 *  - `ja` 整数の最大値
 */
export declare function randomInt(max: number): number;
/**
 * @en Returns a random integer between `min` and `max`, inclusive.
 * @ja `min` - `max` のランダムの整数値を生成
 *
 * @param min
 *  - `en` The maximum random number.
 *  - `ja` 整数の最大値
 * @param max
 *  - `en` The maximum random number.
 *  - `ja` 整数の最大値
 */
export declare function randomInt(min: number, max: number): number;
/**
 * @en Presume whether it's a canceled error.
 * @ja キャンセルされたエラーであるか推定
 *
 * @param error
 *  - `en` an error object handled in `catch` block.
 *  - `ja` `catch` 節などで補足したエラーを指定
 */
export declare function isCancelLikeError(error: unknown): boolean;
/**
 * @en Converts first letter of the string to uppercase.
 * @ja 最初の文字を大文字に変換
 *
 *
 * @example <br>
 *
 * ```ts
 * capitalize("foo Bar");
 * // => "Foo Bar"
 *
 * capitalize("FOO Bar", true);
 * // => "Foo bar"
 * ```
 *
 * @param src
 *  - `en` source string
 *  - `ja` 変換元文字列
 * @param lowercaseRest
 *  - `en` If `true` is passed, the rest of the string will be converted to lower case
 *  - `ja` `true` を指定した場合, 2文字目以降も小文字化
 */
export declare function capitalize(src: string, lowercaseRest?: boolean): string;
/**
 * @en Converts first letter of the string to lowercase.
 * @ja 最初の文字を小文字化
 *
 * @example <br>
 *
 * ```ts
 * decapitalize("Foo Bar");
 * // => "foo Bar"
 * ```
 *
 * @param src
 *  - `en` source string
 *  - `ja` 変換元文字列
 */
export declare function decapitalize(src: string): string;
/**
 * @en Converts underscored or dasherized string to a camelized one. <br>
 *     Begins with a lower case letter unless it starts with an underscore, dash or an upper case letter.
 * @ja `_`, `-` 区切り文字列をキャメルケース化 <br>
 *     `-` または大文字スタートであれば, 大文字スタートが既定値
 *
 * @example <br>
 *
 * ```ts
 * camelize("moz-transform");
 * // => "mozTransform"
 *
 * camelize("-moz-transform");
 * // => "MozTransform"
 *
 * camelize("_moz_transform");
 * // => "MozTransform"
 *
 * camelize("Moz-transform");
 * // => "MozTransform"
 *
 * camelize("-moz-transform", true);
 * // => "mozTransform"
 * ```
 *
 * @param src
 *  - `en` source string
 *  - `ja` 変換元文字列
 * @param lower
 *  - `en` If `true` is passed, force converts to lower camel case in starts with the special case.
 *  - `ja` 強制的に小文字スタートする場合には `true` を指定
 */
export declare function camelize(src: string, lower?: boolean): string;
/**
 * @en Converts string to camelized class name. First letter is always upper case.
 * @ja 先頭大文字のキャメルケースに変換
 *
 * @example <br>
 *
 * ```ts
 * classify("some_class_name");
 * // => "SomeClassName"
 * ```
 *
 * @param src
 *  - `en` source string
 *  - `ja` 変換元文字列
 */
export declare function classify(src: string): string;
/**
 * @en Converts a camelized or dasherized string into an underscored one.
 * @ja キャメルケース or `-` つなぎ文字列を `_` つなぎに変換
 *
 * @example <br>
 *
 * ```ts
 * underscored("MozTransform");
 * // => "moz_transform"
 * ```
 *
 * @param src
 *  - `en` source string
 *  - `ja` 変換元文字列
 */
export declare function underscored(src: string): string;
/**
 * @en Converts a underscored or camelized string into an dasherized one.
 * @ja キャメルケース or `_` つなぎ文字列を `-` つなぎに変換
 *
 * @example <br>
 *
 * ```ts
 * dasherize("MozTransform");
 * // => "-moz-transform"
 * ```
 *
 * @param src
 *  - `en` source string
 *  - `ja` 変換元文字列
 */
export declare function dasherize(src: string): string;
