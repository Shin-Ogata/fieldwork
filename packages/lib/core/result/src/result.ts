import {
    className,
    isNullish,
    isString,
    isCancelLikeError,
} from '@cdp/core-utils';
import {
    RESULT_CODE,
    SUCCEEDED,
    FAILED,
    toNameString,
    toHelpString,
} from './result-code';

const {
    /** @internal */ isFinite: isNumber
} = Number;

/** @internal */
const enum Tag {
    ERROR  = 'Error',
    RESULT = 'Result',
}

/** @internal */
const desc = (value: unknown): PropertyDescriptor => {
    return {
        configurable: false,
        writable: false,
        enumerable: true,
        value,
    };
};

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
     * @param options
     *  - `en` error construction options
     *  - `ja` エラー構築オプション
     */
    constructor(code?: number, message?: string, options?: ErrorOptions) {
        code = isNullish(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
        super(message ?? toHelpString(code), options);
        const cause = options?.cause;
        let time = isError(cause) ? (cause as Result).time : undefined;
        isNumber(time!) || (time = Date.now());
        Object.defineProperties(this, { code: desc(code), time: desc(time), cause: desc(cause) });
    }

    /**
     * @en {@link RESULT_CODE} value.
     * @ja {@link RESULT_CODE} の値
     */
    readonly code!: number;

    /**
     * @en Generated time information.
     * @ja 生成された時刻情報
     */
    readonly time!: number;

    /**
     * @en Stock low-level error information.
     * @ja 下位のエラー情報を格納
     */
    readonly cause?: unknown;

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
        return this.code === RESULT_CODE.ABORT;
    }

    /**
     * @en Get formatted {@link RESULT_CODE} name string.
     * @ja フォーマットされた {@link RESULT_CODE} 名文字列を取得
     */
    get codeName(): string {
        return toNameString(this.code, this.name);
    }

    /**
     * @en Get {@link RESULT_CODE} help string.
     * @ja {@link RESULT_CODE} のヘルプストリングを取得
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
 * @en Convert to {@link Result} object.
 * @ja {@link Result} オブジェクトに変換
 */
export function toResult(o: unknown): Result {
    if (o instanceof Result) {
        /* eslint-disable-next-line prefer-const */
        let { code, cause, time } = o;
        code = isNullish(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
        isNumber(time) || (time = Date.now());
        // Do nothing if already defined
        Reflect.defineProperty(o, 'code',  desc(code));
        Reflect.defineProperty(o, 'time',  desc(time));
        Reflect.defineProperty(o, 'cause', desc(cause));
        return o;
    } else {
        const e = Object(o) as Result;
        const message = isString(e.message) ? e.message : isString(o) ? o : undefined;
        const code = isCancelLikeError(message) ? RESULT_CODE.ABORT : isNumber(e.code) ? e.code : o as number;
        const cause = isError(e.cause) ? e.cause : isError(o) ? o : isString(o) ? new Error(o) : o;
        return new Result(code, message, { cause });
    }
}

/**
 * @en Create {@link Result} helper.
 * @ja {@link Result} オブジェクト構築ヘルパー
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
export function makeResult(code: number, message?: string, cause?: unknown): Result {
    return new Result(code, message, { cause });
}

/**
 * @en Create canceled {@link Result} helper.
 * @ja キャンセル情報格納 {@link Result} オブジェクト構築ヘルパー
 *
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
export function makeCanceledResult(message?: string, cause?: unknown): Result {
    return new Result(RESULT_CODE.ABORT, message, { cause });
}
