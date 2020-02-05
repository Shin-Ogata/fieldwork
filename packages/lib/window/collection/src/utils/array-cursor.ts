/**
 * @en Cursor position constant.
 * @ja カーソル位置定数
 */
export const enum CursorPos {
    OUT_OF_RANGE    = -1,
    CURRENT         = -2,
}

/**
 * @en Seek expression function type.
 * @ja シーク式関数定義
 */
export type SeekExp<T> = (value: T, index?: number, obj?: T[]) => boolean;

/**
 * @en The class provides cursor interface for Array. <br>
 *     It is different from Iterator interface of es2015, and that provides interface which is similar to DB recordset's one.
 * @ja Array 用カーソル I/F を提供するクラス <br>
 *     es2015 の Iterator I/F とは異なり、DB recordset オブジェクトライクな走査 I/F を提供する
 */
export class ArrayCursor<T = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    /** @internal 対象の配列  */
    private _array: T[];
    /** @internal 要素外の先頭を示しているときに true  */
    private _bof: boolean;
    /** @internal 要素外の末尾を示しているときに true */
    private _eof: boolean;
    /** @internal 現在の index */
    private _index: number;

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
    constructor(array: T[], initialIndex = 0) {
        this._array = array;
        this._index = initialIndex;
        if (this.valid()) {
            this._bof = this._eof = false;
        } else {
            this._index = CursorPos.OUT_OF_RANGE;
            this._bof = true;
            this._eof = false;
        }
    }

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
    public reset(array: T[] = [], initialIndex: number = CursorPos.OUT_OF_RANGE): ArrayCursor<T> {
        this._array = array;
        this._index = initialIndex;
        if (this.valid()) {
            this._bof = this._eof = false;
        } else {
            this._index = CursorPos.OUT_OF_RANGE;
            this._bof = true;
            this._eof = false;
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// accessors:

    /**
     * @en Access to current element.
     * @ja 現在の要素にアクセス
     */
    get current(): T | undefined {
        return this._array[this._index];
    }

    /**
     * @en Get current index.
     * @ja 現在指し示している index を取得
     */
    get index(): number {
        return this._index;
    }

    /**
     * @en Get target array length.
     * @ja 走査対象の要素数を取得
     */
    get length(): number {
        return this._array.length;
    }

    /**
     * @en Judge BOF or not.
     * @ja 要素外の先頭か判定
     */
    get isBOF(): boolean {
        return this._bof;
    }

    /**
     * @en Judge EOF or not.
     * @ja 要素外の末尾か判定
     */
    get isEOF(): boolean {
        return this._eof;
    }

    /**
     * @en Access to raw array instance.
     * @ja 走査対象にアクセス
     */
    get array(): T[] {
        return this._array;
    }

///////////////////////////////////////////////////////////////////////
// cursor operation:

    /**
     * @en Move to first element position.
     * @ja 先頭要素へ移動
     */
    public moveFirst(): ArrayCursor<T> {
        this._index = 0;
        this._bof = this._eof = false;
        if (!this.valid()) {
            this._index = CursorPos.OUT_OF_RANGE;
            this._bof = true;
        }
        return this;
    }

    /**
     * @en Move to last element position.
     * @ja 末尾要素へ移動
     */
    public moveLast(): ArrayCursor<T> {
        this._index = this._array.length - 1;
        this._bof = this._eof = false;
        if (!this.valid()) {
            this._eof = true;
        }
        return this;
    }

    /**
     * @en Move to next element position.
     * @ja カーソルを次へ移動
     */
    public moveNext(): ArrayCursor<T> {
        if (this._bof) {
            this._bof = false;
            this._index = 0;
        } else {
            this._index++;
        }
        if (!this.valid()) {
            this._index = CursorPos.OUT_OF_RANGE;
            this._eof = true;
        }
        return this;
    }

    /**
     * @en Move to previous element position.
     * @ja カーソルを前へ移動
     */
    public movePrevious(): ArrayCursor<T> {
        if (this._eof) {
            this._eof = false;
            this._index = this.length - 1;
        } else {
            this._index--;
        }
        if (!this.valid()) {
            this._index = CursorPos.OUT_OF_RANGE;
            this._bof = true;
        }
        return this;
    }

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
    public seek(criteria: number | SeekExp<T>): ArrayCursor<T> {
        if ('number' === typeof criteria) {
            this._index = criteria;
        } else {
            this._index = this._array.findIndex(criteria);
        }
        if (!this.valid()) {
            this._index = CursorPos.OUT_OF_RANGE;
            this._bof = false;
            this._eof = true;
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    /**
     * カーソルが有効な範囲を示しているか判定
     *
     * @internal
     *
     * @returns true: 有効 / false: 無効
     */
    private valid(): boolean {
        return (0 <= this._index && this._index < this._array.length);
    }
}
