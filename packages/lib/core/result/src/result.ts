import {
    className,
    isNil,
    isString,
    isChancelLikeError,
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
     * @param cause
     *  - `en` low-level error information
     *  - `ja` 下位のエラー情報
     */
    constructor(code?: number, message?: string, cause?: unknown) {
        code = isNil(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
        super(message || toHelpString(code));
        let time = isError(cause) ? (cause as Result).time : undefined;
        isNumber(time as number) || (time = Date.now());
        Object.defineProperties(this, { code: desc(code), cause: desc(cause), time: desc(time) });
    }

    /**
     * @en [[RESULT_CODE]] value.
     * @ja [[RESULT_CODE]] の値
     */
    readonly code!: number;

    /**
     * @en Stock low-level error information.
     * @ja 下位のエラー情報を格納
     */
    readonly cause: any; // eslint-disable-line @typescript-eslint/no-explicit-any

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
        return this.code === RESULT_CODE.ABORT;
    }

    /**
     * @en Get formatted [[RESULT_CODE]] name string.
     * @ja フォーマットされた [[RESULT_CODE]] 名文字列を取得
     */
    get codeName(): string {
        return toNameString(this.code, this.name);
    }

    /**
     * @en Get [[RESULT_CODE]] help string.
     * @ja [[RESULT_CODE]] のヘルプストリングを取得
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
 * @en Convert to [[Result]] object.
 * @ja [[Result]] オブジェクトに変換
 */
export function toResult(o: unknown): Result {
    if (o instanceof Result) {
        /* eslint-disable-next-line prefer-const */
        let { code, cause, time } = o;
        code = isNil(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
        isNumber(time) || (time = Date.now());
        // Do nothing if already defined
        Reflect.defineProperty(o, 'code',  desc(code));
        Reflect.defineProperty(o, 'cause', desc(cause));
        Reflect.defineProperty(o, 'time',  desc(time));
        return o;
    } else {
        const e = Object(o) as Result;
        const message = isString(e.message) ? e.message : isString(o) ? o : undefined;
        const code = isChancelLikeError(message) ? RESULT_CODE.ABORT : isNumber(e.code) ? e.code : o as number;
        const cause = isError(e.cause) ? e.cause : isError(o) ? o : isString(o) ? new Error(o) : o;
        return new Result(code, message, cause);
    }
}

/**
 * @en Create [[Result]] helper.
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
export function makeResult(code: number, message?: string, cause?: unknown): Result {
    return new Result(code, message, cause);
}

/**
 * @en Create canceled [[Result]] helper.
 * @ja キャンセル情報格納 [[Result]] オブジェクト構築ヘルパー
 *
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
export function makeCanceledResult(message?: string, cause?: unknown): Result {
    return new Result(RESULT_CODE.ABORT, message, cause);
}
