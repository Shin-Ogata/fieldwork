﻿/*!
 * cdp.tools.d.ts
 * This file is generated by the CDP package build process.
 *
 * Date: 2018-01-24T03:45:55.706Z
 */
/// <reference types="jquery" />
declare module "cdp.tools" {
    const Tools: typeof CDP.Tools;
    export = Tools;
}
declare namespace CDP {
    /**
     * @enum  RESULT_CODE_BASE
     * @brief リザルトコードのオフセット値
     */
    enum RESULT_CODE_BASE {
        CDP_TOOLS_DECLARERATION = 0,
        CDP_TOOLS,
    }
    /**
     * @enum  RESULT_CODE
     * @brief cdp.tools のエラーコード定義
     */
    enum RESULT_CODE {
        ERROR_CDP_TOOLS_DECLARATION = 0,
        ERROR_CDP_TOOLS_IMAGE_LOAD_FAILED,
        ERROR_CDP_TOOLS_INVALID_IMAGE,
        ERROR_CDP_TOOLS_FILE_READER_ERROR,
    }
}
declare namespace CDP.Tools {
    /**
     * @class Binary
     * @brief バイナリユーティリティ
     */
    class Binary {
        private constructor();
        /**
         * Get BlobBuilder
         *
         * @obsolete
         * @return {any} BlobBuilder
         */
        private static getBlobBuilder();
        /**
         * エラー情報生成 from DOMError
         *
         * @param resultCode [in] RESULT_CODE を指定
         * @param cause      [in] 下位の DOM エラーを指定
         * @param [tag]      [in] TAG を指定
         * @param [message]  [in] メッセージを指定
         * @returns エラーオブジェクト
         */
        private static makeErrorInfoFromDOMError(resultCode, cause, tag?, message?);
        /**
         * Get BlobBuilder
         *
         * @obsolete
         * @return 構築済み Blob オブジェクト
         */
        static newBlob(blobParts?: any[], options?: BlobPropertyBag): Blob;
        /**
         * URL Object
         *
         * @obsolete
         * @return {any} URL Object
         */
        static blobURL: URL;
        /**
         * ArrayBuffer to Blob
         *
         * @param buf [in] ArrayBuffer data
         * @param mimeType [in] MimeType of data
         * @returns Blob data
         */
        static arrayBufferToBlob(buf: ArrayBuffer, mimeType: string): Blob;
        /**
         * Base64 string to Blob
         *
         * @param base64 {string} [in] Base64 string data
         * @param mimeType {string} [in] MimeType of data
         * @return {Blob} Blob data
         */
        static base64ToBlob(base64: string, mimeType: string): Blob;
        /**
         * data-url 形式画像から Blob オブジェクトへ変換
         *
         * @param  {String} dataUrl    [in] data url
         * @param  {String} [mimeType] [in] mime type を指定. 既定では "image/png"
         * @return {Blob} Blob インスタンス
         */
        static dataUrlToBlob(dataUrl: string, mimeType?: string): Blob;
        /**
         * Base64 string to ArrayBuffer
         *
         * @param base64 {string} [in] Base64 string data
         * @return {ArrayBuffer} ArrayBuffer data
         */
        static base64ToArrayBuffer(base64: string): ArrayBuffer;
        /**
         * Base64 string to Uint8Array
         *
         * @param base64 {string} [in] Base64 string data
         * @return {Uint8Array} Uint8Array data
         */
        static base64ToUint8Array(encoded: string): Uint8Array;
        /**
         * ArrayBuffer to base64 string
         *
         * @param arrayBuffer {ArrayBuffer} [in] ArrayBuffer data
         * @return {string} base64 data
         */
        static arrayBufferToBase64(arrayBuffer: ArrayBuffer): string;
        /**
         * Uint8Array to base64 string
         *
         * @param bytes {Uint8Array} [in] Uint8Array data
         * @return {string} base64 data
         */
        static uint8ArrayToBase64(bytes: Uint8Array): string;
        /**
         * read Blob as ArrayBuffer
         *
         * @param  {Blob} blob [in] blob data
         * @return {CDP.IPromise<ArrayBuffer>} promise object
         */
        static readBlobAsArrayBuffer(blob: Blob): IPromise<ArrayBuffer>;
        /**
         * read Blob as Uint8Array
         *
         * @param  {Blob} blob [in] blob data
         * @return {CDP.IPromise<Uint8Array>} promise object
         */
        static readBlobAsUint8Array(blob: Blob): IPromise<Uint8Array>;
        /**
         * read Blob as text string
         *
         * @param  {Blob} blob [in] blob data
         * @return {CDP.IPromise<Uint8Array>} promise object
         */
        static readBlobAsText(blob: Blob, encode?: string): IPromise<string>;
        /**
         * read Blob as Data URL
         *
         * @param  {Blob} blob [in] blob data
         * @return {CDP.IPromise<string>} promise object
         */
        static readBlobAsDataURL(blob: Blob): IPromise<string>;
    }
}
/**
 * @file  BinaryTransport.ts
 * @brief jQuery ajax transport for making binary data type requests.
 *
 *        original: https://github.com/henrya/js-jquery/blob/master/BinaryTransport/jquery.binarytransport.js
 *        author:   Henry Algus <henryalgus@gmail.com>
 */
declare namespace CDP.Tools {
}
declare namespace CDP.Tools {
    /**
     * Math.abs よりも高速な abs
     */
    function abs(x: number): number;
    /**
     * Math.max よりも高速な max
     */
    function max(lhs: number, rhs: number): number;
    /**
     * Math.min よりも高速な min
     */
    function min(lhs: number, rhs: number): number;
    /**
     * 数値を 0 詰めして文字列を生成
     */
    function toZeroPadding(no: number, limit: number): string;
    /**
     * 文字列のバイト数をカウント
     */
    function getStringSize(src: string): number;
    /**
     * 文字列をバイト制限して分割
     */
    function toStringChunks(src: string, limit: number): string[];
    /**
     * 多重継承のための実行時継承関数
     *
     * Sub Class 候補オブジェクトに対して Super Class 候補オブジェクトを直前の Super Class として挿入する。
     * prototype のみコピーする。
     * インスタンスメンバをコピーしたい場合、Super Class が疑似コンストラクタを提供する必要がある。
     * 詳細は cdp.tools.Functions.spec.ts を参照。
     *
     * @param subClass   {constructor} [in] オブジェクトの constructor を指定
     * @param superClass {constructor} [in] オブジェクトの constructor を指定
     */
    function inherit(subClass: any, superClass: any): void;
    /**
     * mixin 関数
     *
     * TypeScript Official Site に載っている mixin 関数
     * http://www.typescriptlang.org/Handbook#mixins
     * 既に定義されているオブジェクトから、新規にオブジェクトを合成する。
     *
     * @param derived {constructor}    [in] 合成されるオブジェクトの constructor を指定
     * @param bases   {constructor...} [in] 合成元オブジェクトの constructor を指定 (可変引数)
     */
    function mixin(derived: any, ...bases: any[]): void;
    /**
     * \~english
     * Helper function to correctly set up the prototype chain, for subclasses.
     * The function behavior is same as extend() function of Backbone.js.
     *
     * @param protoProps  {Object} [in] set prototype properties as object.
     * @param staticProps {Object} [in] set static properties as object.
     * @return {Object} subclass constructor.
     *
     * \~japanese
     * クラス継承のためのヘルパー関数
     * Backbone.js extend() 関数と同等
     *
     * @param protoProps  {Object} [in] prototype properties をオブジェクトで指定
     * @param staticProps {Object} [in] static properties をオブジェクトで指定
     * @return {Object} サブクラスのコンストラクタ
     */
    function extend(protoProps: object, staticProps?: object): object;
    /**
     * DPI 取得
     */
    function getDevicePixcelRatio(): number;
    function getCanvas(): HTMLCanvasElement;
    /**
     * 画像リソースのロード完了を保証
     * ブラウザ既定のプログレッシブロードを走らせないため.
     *
     * @param  {String} url [in] url (data-url)
     * @return {IPromise<string>} 表示可能な url
     */
    function ensureImageLoaded(url: string): IPromise<string>;
    /**
     * 画像のリサイズ
     * 指定した長辺の長さにアスペクト比を維持してリサイズを行う
     * longSideLength より小さな場合はオリジナルサイズで data-url を返却する
     *
     * @param  {String} src            [in] image に指定するソース
     * @param  {Number} longSideLength [in] リサイズに使用する長辺の最大値を指定
     * @return {IPromise<string>} base64 data url を返却
     */
    function resizeImage(src: string, longSideLength: number): IPromise<string>;
}
declare namespace CDP.Tools {
    /**
     * @class DateTime
     * @brief 時刻操作のユーティリティクラス
     */
    class DateTime {
        /**
         * 基点となる日付から、n日後、n日前を算出
         *
         * @param base   {Date}   [in] 基準日
         * @param add    {Number} [in] 加算日. マイナス指定でn日前も設定可能
         * @param target {String} [in] { year | month | date | hour | min | sec | msec }
         * @return {Date} 日付オブジェクト
         */
        static computeDate(base: Date, add: number, target?: string): Date;
        /**
         * Convert string to date object
         *
         * @param {String} date string ex) YYYY-MM-DDTHH:mm:ss.sssZ
         * @return {Object} date object
         */
        static convertISOStringToDate(dateString: string): Date;
        /**
         * Convert date object into string (the ISO 8601 Extended Format)
         *
         * @param date   {Date}   [in] date object
         * @param target {String} [in] { year | month | date | min | sec | msec | tz }
         * @return {String} date string
         */
        static convertDateToISOString(date: Date, target?: string): string;
        /**
         * Convert file system compatible string to date object
         *
         * @param {String} date string ex) YYYY_MM_DDTHH_mm_ss_sss
         * @return {Object} date object
         */
        static convertFileSystemStringToDate(dateString: string): Date;
        /**
         * Convert date object into string in file system compatible format (YYYY_MM_DDTHH_mm_ss_sss)
         *
         * @param date   {Date}   [in] date object
         * @param target {String} [in] { year | month | date | min | sec | msec }
         * @return {String} file system compatible string
         */
        static convertDateToFileSystemString(date: Date, target?: string): string;
        /**
         * Convert ISO string to value of date (milliseconds)
         *
         * @param isoString {String} [in] date string
         * @return {Number} value of date (ms)
         */
        private static convertISOStringToDateValue(isoString);
        /**
         * Convert file system compatible string to to value of date (milliseconds)
         *
         * @param dateString {String} [in] date string (YYYY_MM_DDTHH_mm_ss_sss)
         * @return {String} converted string
         */
        private static convertFileSystemStringToDateValue(dateString);
    }
}
declare namespace CDP.Tools {
    /**
     * @interface JST
     * @brief コンパイル済み テンプレート格納インターフェイス
     */
    interface JST {
        (data?: any): string;
    }
    /**
     * @class Template
     * @brief template script を管理するユーティリティクラス
     */
    class Template {
        static _mapElement: any;
        static _mapSource: any;
        /**
         * 指定した id, class 名, Tag 名をキーにテンプレートの JQuery Element を取得する。
         *
         * @param {String}  key     [in] id, class, tag を表す文字列
         * @param {String}  [src]   [in] 外部 html を指定する場合は url を設定
         * @param {Boolean} [cache] [in] src html をキャッシュする場合は true. src が指定されているときのみ有効
         * @return template が格納されている JQuery Element
         */
        static getTemplateElement(key: string, src?: string, cache?: boolean): JQuery;
        /**
         * Map オブジェクトの削除
         * 明示的にキャッシュを開放する場合は本メソッドをコールする
         */
        static empty(): void;
        /**
         * 指定した id, class 名, Tag 名をキーに JST を取得する。
         *
         * @param {String | jQuery} key     [in] id, class, tag を表す文字列 または テンプレート文字列, または jQuery オブジェクト
         * @param {String}          [src]   [in] 外部 html を指定する場合は url を設定
         * @param {Boolean}         [cache] [in] src html をキャッシュする場合は true. src が指定されているときのみ有効
         * @return コンパイルされた JST オブジェクト
         */
        static getJST(key: JQuery): JST;
        static getJST(key: string, src?: string, cache?: boolean): JST;
        private static getElementMap();
        private static getSourceMap();
        private static findHtmlFromSource(src);
    }
}
declare namespace CDP.Tools {
    /**
     * @interface ProgressCounterOptions
     * @brief ProgressCounter に指定するオプション
     */
    interface ProgressCounterOptions {
        max?: number;
        allowIncrementRemain?: boolean;
    }
    /**
     * @interface ProgressCounterResult
     * @brief 進捗の時間を持つインターフェイス
     *        単位は [msec]
     */
    interface ProgressCounterResult {
        passTime: number;
        remainTime: number;
    }
    /**
     * @class ProgressCounter
     * @brief 進捗の時間を扱うユーティリティクラス
     */
    class ProgressCounter {
        private _settings;
        /**
         * constructor
         *
         * @param [options] オプション
         */
        constructor(options?: ProgressCounterOptions);
        /**
         * 開始時間を初期化
         */
        reset(options?: ProgressCounterOptions): void;
        /**
         * 経過時間と推定残り時間を取得する
         * 進捗値が 0 の場合は、推定残り時間に Infinity を返す
         *
         * @param   progress [in] 進捗値
         * @returns 経過時間と推定残り時間 [msec]
         */
        compute(progress: number): ProgressCounterResult;
    }
}
