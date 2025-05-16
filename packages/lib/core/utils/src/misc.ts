import {
    type UnknownFunction,
    type Primitive,
    type TypedData,
    isString,
    isBoolean,
    isObject,
} from './types';
import { invert } from './object';
import {
    type TimerHandle,
    setTimeout,
    clearTimeout,
} from './timer';

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
export function post<T>(executor: () => T): Promise<T> {
    return Promise.resolve().then(executor);
}

/**
 * @en Generic No-Operation.
 * @ja 汎用 No-Operation
 */
export function noop(...args: unknown[]): any { // eslint-disable-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    // noop
}

/**
 * @en Wait for the designation elapse.
 * @ja 指定時間処理を待機
 *
 * @param elapse
 *  - `en` wait elapse [msec].
 *  - `ja` 待機時間 [msec]
 */
export function sleep(elapse: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, elapse));
}

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

export type DebouncedFunction<T extends UnknownFunction> = T & { cancel(): void; flush(): ReturnType<T>; pending(): boolean; };

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
export function debounce<T extends UnknownFunction>(executor: T, wait: number, options?: DebounceOptions | boolean): DebouncedFunction<T> {
    type Result = ReturnType<T> | undefined;

    let lastArgs: unknown;
    let lastThis: unknown;
    let result: Result;
    let lastCallTime: number | undefined;
    let timerId: TimerHandle | undefined;
    let lastInvokeTime = 0;

    const waitValue = Number(wait) || 0;

    const opts = Object.assign({ leading: false, trailing: true }, (isBoolean(options) ? { leading: options, trailing: !options } : options));
    const { leading, trailing } = opts;
    const maxWait = null != opts.maxWait ? Math.max(Number(opts.maxWait) || 0, waitValue) : null;

    const invokeFunc = (time: number): Result => {
        const args = lastArgs;
        const thisArg = lastThis;

        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = executor.apply(thisArg, args);
        return result;
    };

    const remainingWait = (time: number): number => {
        const timeSinceLastCall = time - lastCallTime!;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = waitValue - timeSinceLastCall;
        return null != maxWait ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
    };

    const shouldInvoke = (time: number): boolean => {
        if (undefined === lastCallTime) {
            return true;
        }
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        return timeSinceLastCall >= waitValue || timeSinceLastCall < 0 || (maxWait !== null && timeSinceLastInvoke >= maxWait);
    };

    const trailingEdge = (time: number): Result => {
        timerId = undefined;
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
    };

    const timerExpired = (): Result | void => {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        timerId = setTimeout(timerExpired, remainingWait(time));
    };

    const leadingEdge = (time: number): Result => {
        lastInvokeTime = time;
        timerId = setTimeout(timerExpired, waitValue);
        return leading ? invokeFunc(time) : result;
    };

    const cancel = (): void => {
        if (undefined !== timerId) {
            clearTimeout(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = undefined;
    };

    const flush = (): Result => {
        return undefined === timerId ? result : trailingEdge(Date.now());
    };

    const pending = (): boolean => {
        return null != timerId;
    };

    function debounced(this: unknown, ...args: unknown[]): Result {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastArgs = args;
        lastThis = this;    // eslint-disable-line @typescript-eslint/no-this-alias
        lastCallTime = time;

        if (isInvoking) {
            if (null == timerId) {
                return leadingEdge(lastCallTime);
            }
            if (maxWait) {
                timerId = setTimeout(timerExpired, waitValue);
                return invokeFunc(lastCallTime);
            }
        }
        timerId ??= setTimeout(timerExpired, waitValue);
        return result;
    }

    debounced.cancel = cancel;
    debounced.flush = flush;
    debounced.pending = pending;

    return debounced as DebouncedFunction<T>;
}

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
export function throttle<T extends UnknownFunction>(executor: T, elapse: number, options?: ThrottleOptions): DebouncedFunction<T> {
    const { leading, trailing } = Object.assign({ leading: true, trailing: true }, options);
    return debounce(executor, elapse, {
        leading,
        trailing,
        maxWait: elapse,
    });
}

/**
 * @en Returns a function that will be executed at most one time, no matter how often you call it.
 * @ja 1度しか実行されない関数を返却. 2回目以降は最初のコールのキャッシュを返却
 *
 * @param executor
 *  - `en` seed function.
 *  - `ja` 対象の関数
 */
export function once<T extends UnknownFunction>(executor: T): T {

    let memo: unknown;
    return function (this: unknown, ...args: unknown[]): unknown {
        if (executor) {
            memo = executor.call(this, ...args);
            executor = null!;
        }
        return memo;
    } as T;

}

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
export function scheduler(): (exec: () => void) => void {
    let tasks: (() => void)[] = [];
    let id: Promise<void> | null;

    function runTasks(): void {
        id = null;
        const work = tasks;
        tasks = [];
        for (const task of work) {
            task();
        }
    }

    return function(task: () => unknown): void {
        tasks.push(task);
        id ??= post(runTasks);
    };
}

//__________________________________________________________________________________________________//

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
export function createEscaper(map: Record<string, string>): (src: Primitive) => string {
    const escaper = (match: string): string => {
        return map[match];
    };

    const source = `(?:${Object.keys(map).join('|')})`;
    const regexTest = RegExp(source);
    const regexReplace = RegExp(source, 'g');

    return (src: Primitive): string => {
        src = (null == src || 'symbol' === typeof src) ? '' : String(src);
        return regexTest.test(src) ? src.replace(regexReplace, escaper) : src;
    };
}

/** @internal */
const mapHtmlEscape = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#x60;'
};

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
export const escapeHTML = createEscaper(mapHtmlEscape);

/**
 * @en Unescape HTML string.
 * @ja HTML で使用する制御文字を復元
 */
export const unescapeHTML = createEscaper(invert(mapHtmlEscape));

//__________________________________________________________________________________________________//

/**
 * @en Convert to the style compulsion value from input string.
 * @ja 入力文字列を型強制した値に変換
 *
 * @param data
 *  - `en` input string
 *  - `ja` 変換対象の文字列
 */
export function toTypedData(data: string | undefined): TypedData | undefined {
    if ('true' === data) {
        // boolean: true
        return true;
    } else if ('false' === data) {
        // boolean: false
        return false;
    } else if ('null' === data) {
        // null
        return null;
    } else if (data === String(Number(data))) {
        // number: 数値変換 → 文字列変換で元に戻るとき
        return Number(data);
    } else if (data && /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/.test(data)) {
        // object
        return JSON.parse(data);
    } else {
        // string / undefined
        return data;
    }
}

/**
 * @en Convert to string from {@link TypedData}.
 * @ja {@link TypedData} を文字列に変換
 *
 * @param data
 *  - `en` input string
 *  - `ja` 変換対象の文字列
 */
export function fromTypedData(data: TypedData | undefined): string | undefined {
    if (undefined === data || isString(data)) {
        return data;
    } else if (isObject(data)) {
        return JSON.stringify(data);
    } else {
        return String(data);
    }
}

/**
 * @en Convert to `Web API` stocked type. <br>
 *     Ensure not to return `undefined` value.
 * @ja `Web API` 格納形式に変換 <br>
 *     `undefined` を返却しないことを保証
 */
export function dropUndefined<T>(value: T | null | undefined, nullishSerialize = false): T | 'null' | 'undefined' | null {
    return value ?? (nullishSerialize ? String(value) : null) as T | 'null' | 'undefined' | null;
}

/**
 * @en Deserialize from `Web API` stocked type. <br>
 *     Convert from 'null' or 'undefined' string to original type.
 * @ja 'null' or 'undefined' をもとの型に戻す
 */
export function restoreNullish<T>(value: T | 'null' | 'undefined'): T | null | undefined {
    if ('null' === value) {
        return null;
    } else if ('undefined' === value) {
        return undefined;
    } else {
        return value;
    }
}

//__________________________________________________________________________________________________//

/** @internal */ let _localId = 0;

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
export function luid(prefix = '', zeroPad?: number): string {
    const id = (++_localId).toString(16);
    return (null != zeroPad) ? `${prefix}${id.padStart(zeroPad, '0')}` : `${prefix}${id}`;
}

/**
 * @en Returns a random integer between `0` and `max`, inclusive.
 * @ja `0` - `max` のランダムの整数値を生成
 *
 * @param max
 *  - `en` The maximum random number.
 *  - `ja` 整数の最大値
 */
export function randomInt(max: number): number;

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
export function randomInt(min: number, max: number): number; // eslint-disable-line @typescript-eslint/unified-signatures

export function randomInt(min: number, max?: number): number {
    if (null == max) {
        max = min;
        min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
}

//__________________________________________________________________________________________________//

/** @internal */ const _regexCancelLikeString = /(abort|cancel)/im;

/**
 * @en Presume whether it's a canceled error.
 * @ja キャンセルされたエラーであるか推定
 *
 * @param error
 *  - `en` an error object handled in `catch` block.
 *  - `ja` `catch` 節などで補足したエラーを指定
 */
export function isCancelLikeError(error: unknown): boolean {
    if (null == error) {
        return false;
    } else if (isString(error)) {
        return _regexCancelLikeString.test(error);
    } else if (isObject(error)) {
        return _regexCancelLikeString.test((error as Error).message);
    } else {
        return false;
    }
}

//__________________________________________________________________________________________________//

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
export function capitalize(src: string, lowercaseRest = false): string {
    const remainingChars = !lowercaseRest ? src.slice(1) : src.slice(1).toLowerCase();
    return src.charAt(0).toUpperCase() + remainingChars;
}

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
export function decapitalize(src: string): string {
    return src.charAt(0).toLowerCase() + src.slice(1);
}

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
export function camelize(src: string, lower = false): string {
    src = src.trim().replace(/[-_\s]+(.)?/g, (match, c) => {
        return c ? c.toUpperCase() : '';
    });

    if (true === lower) {
        return decapitalize(src);
    } else {
        return src;
    }
}

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
export function classify(src: string): string {
    return capitalize(camelize(src.replace(/[\W_]/g, ' ')).replace(/\s/g, ''));
}

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
export function underscored(src: string): string {
    return src.trim().replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
}

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
export function dasherize(src: string): string {
    return src.trim().replace(/([A-Z])/g, '-$1').replace(/[_\s]+/g, '-').toLowerCase();
}
