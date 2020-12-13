/**
 * @en Cursor position constant.
 * @ja カーソル位置定数
 */
export declare const enum CursorPos {
    OUT_OF_RANGE = -1,
    CURRENT = -2
}
/**
 * @en Seek expression function type.
 * @ja シーク式関数定義
 */
export declare type SeekExp<T> = (value: T, index?: number, obj?: T[]) => boolean;
/**
 * @en The class provides cursor interface for Array. <br>
 *     It is different from Iterator interface of es2015, and that provides interface which is similar to DB recordset's one.
 * @ja Array 用カーソル I/F を提供するクラス <br>
 *     es2015 の Iterator I/F とは異なり、DB recordset オブジェクトライクな走査 I/F を提供する
 */
export declare class ArrayCursor<T = any> {
    /**
     * constructor
     *
     * @param array
     *  - `en` target array
     *  - `ja` 走査対象の配列を指定
     * @param initialIndex
     *  - `en` initial index. default: 0
     *  - `ja` 初期化する index を指定 default: 0
     */
    constructor(array: T[], initialIndex?: number);
    /**
     * @en Reset target array.
     * @ja 対象の再設定
     *
     * @param array
     *  - `en` target array. default: empty array.
     *  - `ja` 走査対象の配列を指定.   default: 空配列
     * @param initialIndex
     *  - `en` initial index. default: CURSOR.OUT_OF_RANGE
     *  - `ja` 初期化する index を指定 default: CURSOR.OUT_OF_RANGE
     */
    reset(array?: T[], initialIndex?: number): ArrayCursor<T>;
    /**
     * @en Access to current element.
     * @ja 現在の要素にアクセス
     */
    get current(): T | undefined;
    /**
     * @en Get current index.
     * @ja 現在指し示している index を取得
     */
    get index(): number;
    /**
     * @en Get target array length.
     * @ja 走査対象の要素数を取得
     */
    get length(): number;
    /**
     * @en Judge BOF or not.
     * @ja 要素外の先頭か判定
     */
    get isBOF(): boolean;
    /**
     * @en Judge EOF or not.
     * @ja 要素外の末尾か判定
     */
    get isEOF(): boolean;
    /**
     * @en Access to raw array instance.
     * @ja 走査対象にアクセス
     */
    get array(): T[];
    /**
     * @en Move to first element position.
     * @ja 先頭要素へ移動
     */
    moveFirst(): ArrayCursor<T>;
    /**
     * @en Move to last element position.
     * @ja 末尾要素へ移動
     */
    moveLast(): ArrayCursor<T>;
    /**
     * @en Move to next element position.
     * @ja カーソルを次へ移動
     */
    moveNext(): ArrayCursor<T>;
    /**
     * @en Move to previous element position.
     * @ja カーソルを前へ移動
     */
    movePrevious(): ArrayCursor<T>;
    /**
     * @en Seek by passed criteria. <br>
     *     If the operation failed, the cursor position set to EOF.
     * @ja 指定条件でシーク <br>
     *     シークに失敗した場合は EOF 状態になる
     *
     * @param criteria
     *  - `en` index or seek expression
     *  - `ja` index / 条件式を指定
     */
    seek(criteria: number | SeekExp<T>): ArrayCursor<T>;
}
