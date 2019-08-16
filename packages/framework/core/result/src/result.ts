/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    className,
    isNil,
    isString,
} from '@cdp/core-utils';
import {
    ResultCode,
    SUCCEEDED,
    FAILED,
    toNameString,
    toHelpString,
} from './result-code';

/* eslint-disable-next-line @typescript-eslint/unbound-method */
const isNumber = Number.isFinite;

const enum Tag {
    ERROR  = 'Error',
    RESULT = 'Result',
}

/**
 * @en A result holder class. <br>
 *     Derived native `Error` class.
 * @ja 処理結果伝達クラス <br>
 *     ネイティブ `Error` の派生クラス
 */
export class Result extends Error {

    /**
     * constructor
     *
     * @param code
     *  - `en` result code
     *  - `ja` 結果コード
     * @param message
     *  - `en` result info message
     *  - `ja` 結果情報メッセージ
     * @param cause
     *  - `en` low-level error information
     *  - `ja` 下位のエラー情報
     */
    constructor(code?: ResultCode, message?: string, cause?: any) {
        code = isNil(code) ? ResultCode.SUCCEEDED : isNumber(code) ? Math.trunc(code) : ResultCode.FAILED;
        super(message || toHelpString(code));
        let time = isError(cause) ? (cause as Result).time : undefined;
        isNumber(time as number) || (time = Date.now());
        const descriptors: PropertyDescriptorMap = {
            code:  { enumerable: true, value: code  },
            cause: { enumerable: true, value: cause },
            time:  { enumerable: true, value: time  },
        };
        Object.defineProperties(this, descriptors);
    }

    /**
     * @en [[ResultCode]] value.
     * @ja [[ResultCode]] の値
     */
    readonly code!: ResultCode;

    /**
     * @en Stock low-level error information.
     * @ja 下位のエラー情報を格納
     */
    readonly cause: any;

    /**
     * @en Generated time information.
     * @ja 生成された時刻情報
     */
    readonly time!: number;

    /**
     * @en Judge succeeded or not.
     * @ja 成功判定
     */
    get isSucceeded(): boolean {
        return SUCCEEDED(this.code);
    }

    /**
     * @en Judge failed or not.
     * @ja 失敗判定
     */
    get isFailed(): boolean {
        return FAILED(this.code);
    }

    /**
     * @en Judge canceled or not.
     * @ja キャンセルエラー判定
     */
    get isCanceled(): boolean {
        return this.code === ResultCode.ABORTED;
    }

    /**
     * @en Get formatted [[ResultCode]] name string.
     * @ja フォーマットされた [[ResultCode]] 名文字列を取得
     */
    get codeName(): string {
        return toNameString(this.code, this.name);
    }

    /**
     * @en Get [[ResultCode]] help string.
     * @ja [[ResultCode]] のヘルプストリングを取得
     */
    get help(): string {
        return toHelpString(this.code);
    }

    /** @internal */
    private get [Symbol.toStringTag](): Tag.RESULT {
        return Tag.RESULT;
    }
}

Result.prototype.name = Tag.RESULT;

/** @interna lReturns `true` if `x` is `Error`, `false` otherwise. */
function isError(x: unknown): x is Error {
    return x instanceof Error || className(x) === Tag.ERROR;
}

/** Returns `true` if `x` is `Result`, `false` otherwise. */
export function isResult(x: unknown): x is Result {
    return x instanceof Result || className(x) === Tag.RESULT;
}

/**
 * @en Transfer [[Result]] object
 * @ja [[Result]] オブジェクトに変換
 */
export function toResult(o: unknown): Result {
    if (o instanceof Result) {
        /* eslint-disable-next-line prefer-const */
        let { code, cause, time } = o;
        code = isNil(code) ? ResultCode.SUCCEEDED : isNumber(code) ? Math.trunc(code) : ResultCode.FAILED;
        isNumber(time) || (time = Date.now());
        // Do nothing if already defined
        Reflect.defineProperty(o, 'code',  { enumerable: true, value: code  });
        Reflect.defineProperty(o, 'cause', { enumerable: true, value: cause });
        Reflect.defineProperty(o, 'time',  { enumerable: true, value: time  });
        return o;
    } else {
        const e = Object(o) as Result;
        const code = isNumber(e.code) ? e.code : o as any;
        const message = isString(e.message) ? e.message : isString(o) ? o : undefined;
        const cause = isError(e.cause) ? e.cause : isError(o) ? o : isString(o) ? new Error(o) : o;
        return new Result(code, message, cause);
    }
}

/**
 * @en Create [[Result]] helper
 * @ja [[Result]] オブジェクト構築ヘルパー
 *
 * @param code
 *  - `en` result code
 *  - `ja` 結果コード
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
export function makeResult(code: ResultCode, message?: string, cause?: any): Result {
    return new Result(code, message, cause);
}

/**
 * @en Create canceled [[Result]] helper
 * @ja キャンセル情報格納 [[Result]] オブジェクト構築ヘルパー
 *
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
export function makeCanceledResult(message?: string, cause?: any): Result {
    return new Result(ResultCode.ABORTED, message, cause);
}
