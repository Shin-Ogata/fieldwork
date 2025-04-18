/*!
 * @cdp/lib-worker 0.9.19
 *   Generated by 'cdp-task bundle dts' task.
 *   - built with TypeScript 5.8.3
 *   - includes:
 *     - @cdp/inline-worker
 *     - @cdp/binary
 *     - @cdp/ajax
 */
import { Keys, PlainObject, TypeToKey, Types, UnknownFunction } from '@cdp/lib-core';
import { Subscribable } from '@cdp/lib-core';
import { Cancelable } from '@cdp/lib-core';
/**
 * @en Arguments passed to {@link AjaxDataStreamEvent} `progress`.
 * @ja {@link AjaxDataStreamEvent} `progress` に渡される引数
 */
export interface AjaxDataStreamEventProgresArg {
    /**
     * @en Whether progress is measurable or not
     * @ja 進捗を算出可能か否か
     */
    readonly computable: boolean;
    /**
     * @en amount of process already done or not
     * @ja すでに完了した作業量
     */
    readonly loaded: number;
    /**
     * @en total amount
     * @en 全体量
     */
    readonly total: number;
    /**
     * @en process done or not
     * @ja 作業が完了したか否か
     */
    readonly done: boolean;
    /**
     * @en current processing chunk data
     * @ja 現在処理中のチャンクデータ
     */
    readonly chunk?: Uint8Array;
}
/**
 * @en {@link AjaxDataStream} event definitions.
 * @ja {@link AjaxDataStream} イベント定義
 */
export interface AjaxDataStreamEvent {
    /**
     * @en progress event
     * @ja 進捗イベント
     */
    'progress': AjaxDataStreamEventProgresArg;
}
/**
 * @en Stream data type result interface
 * @ja ストリームデータ型定義
 */
export interface AjaxDataStream extends ReadableStream<Uint8Array>, Subscribable<AjaxDataStreamEvent> {
    /** `content-length` */
    readonly length: number;
}
/**
 * @en Ajax data type list.
 * @ja Ajax で使用できる型定義リスト
 */
export interface AjaxDataTypeList<T = PlainObject> {
    arrayBuffer: ArrayBuffer;
    blob: Blob;
    formData: FormData;
    json: T;
    text: string;
    stream: AjaxDataStream;
    response: Response;
}
/**
 * @en Ajax data type definitions.
 * @ja Ajax で使用できる型指定子
 */
export type AjaxDataTypes = keyof AjaxDataTypeList;
/**
 * @en {@link ajax:function}() method options.
 * @ja {@link ajax:function}() に指定可能なオプション
 */
export interface AjaxOptions<T extends AjaxDataTypes | object = 'response'> extends RequestInit, Cancelable {
    /**
     * @en When sending data to the server, use this content type. Default is `application/x-www-form-urlencoded; charset=UTF-8`.
     * @ja サーバーへデータが送信される際に付与するコンテンツタイプ. 既定値 `application/x-www-form-urlencoded; charset=UTF-8`
     */
    contentType?: string;
    /**
     * @en Data to be sent to the server. It is converted to a query string and be appended to the `url` when `GET` requests. <br>
     *     And it is converted to `URLSearchParams` and append `body` params when `POST`, `PUT` or `PATCH` requests. <br>
     *     If you do not want to this conversion, you can use `url` and `body` parameters directory.
     * @ja サーバーに送信されるデータ. `GET` リクエストの場合は `query string` に変換され url に付与される. <br>
     *     また, `POST`, `PUT` または `PATCH` リクエストの場合は `URLSearchParams` に変換され `body` に付与される. <br>
     *     この変換が不要である場合は, 直接 `url` または `body` パラメータに指定すること.
     */
    data?: PlainObject;
    /**
     * @en The type of data that you're expecting back from the server.
     * @ja サーバーから返される期待するデータの型を指定
     */
    dataType?: T extends AjaxDataTypes ? T : 'json';
    /**
     * @en Set a timeout (in milliseconds) for the request.
     * @ja リクエストのタイムアウト(ミリ秒)で設定
     */
    timeout?: number;
    /**
     * @en A username to be used an HTTP basic authentication request.
     * @ja Basic 認証で使用するユーザー名
     */
    username?: string;
    /**
     * @en A password to be used an HTTP basic authentication request.
     * @ja Basic 認証で使用するパスワード
     */
    password?: string;
}
/**
 * @en `request` shortcut utility method options.
 * @ja `request` ショートカットに指定可能なオプション
 */
export type AjaxRequestOptions = Pick<AjaxOptions, Exclude<keyof AjaxOptions, 'method' | 'data' | 'dataType'>>;
/**
 * @en `GET request` shortcut utility method options.
 * @ja `GET request` ショートカットに指定可能なオプション
 */
export type AjaxGetRequestShortcutOptions = AjaxRequestOptions & Pick<AjaxOptions, 'data'>;
/**
 * @en Result of {@link ajax:function}() returns value.
 * @ja {@link ajax:function}() が返却する結果
 */
export type AjaxResult<T extends AjaxDataTypes | object> = T extends AjaxDataTypes ? AjaxDataTypeList[T] : AjaxDataTypeList<T>['json'];
/**
 * @en Perform an asynchronous HTTP (Ajax) request.
 * @ja HTTP (Ajax)リクエストの送信
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` Ajax request settings.
 *  - `ja` Ajaxリクエスト設定
 */
export declare function ajax<T extends AjaxDataTypes | object = 'response'>(url: string, options?: AjaxOptions<T>): Promise<AjaxResult<T>>;
export declare namespace ajax {
    var settings: {
        timeout: number | undefined;
    };
}
/**
 * @en Convert `PlainObject` to query strings.
 * @ja `PlainObject` をクエリストリングに変換
 */
export declare const toQueryStrings: (data: PlainObject) => string;
/**
 * @en Convert `PlainObject` to Ajax parameters object.
 * @ja `PlainObject` を Ajax パラメータオブジェクトに変換
 */
export declare const toAjaxParams: (data: PlainObject) => Record<string, string>;
/**
 * @en Convert URL parameters to primitive type.
 * @ja URL パラメータを primitive に変換
 */
export declare const convertUrlParamType: (value: string) => string | number | boolean | null;
/**
 * @en Parse url query GET parameters.
 * @ja URLクエリのGETパラメータを解析
 *
 * @example <br>
 *
 * ```ts
 * const url = '/page/?id=5&foo=bar&bool=true';
 * const query = parseUrlQuery(url);
 * // { id: 5, foo: 'bar', bool: true }
 * ```
 *
 * @returns { key: value } object.
 */
export declare const parseUrlQuery: <T = Record<string, string | number | boolean | null>>(url: string) => T;
export declare const toAjaxDataStream: (seed: Blob | ReadableStream<Uint8Array>, length?: number) => AjaxDataStream;
export declare const request: {
    get: <T extends AjaxDataTypes | object = 'json'>(url: string, data?: PlainObject, dataType?: T extends AjaxDataTypes ? T : 'json', options?: AjaxRequestOptions) => Promise<AjaxResult<T>>;
    text: (url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<'text'>>;
    json: <T extends 'json' | object = 'json'>(url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<T>>;
    blob: (url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<'blob'>>;
    post: <T extends AjaxDataTypes | object = 'json'>(url: string, data: PlainObject, dataType?: T extends AjaxDataTypes ? T : 'json', options?: AjaxRequestOptions) => Promise<AjaxResult<T>>;
    resource: <T extends 'text' | 'json' | object = 'json'>(url: string, dataType?: T extends 'text' | 'json' ? T : 'json', data?: PlainObject) => AjaxResult<T>;
};
/**
 * @en `base64` utility for independent charactor code.
 * @ja 文字コードに依存しない `base64` ユーティリティ
 */
export declare class Base64 {
    /**
     * @en Encode a base-64 encoded string from a binary string.
     * @ja 文字列を base64 形式でエンコード
     */
    static encode(src: string): string;
    /**
     * @en Decodes a string of data which has been encoded using base-64 encoding.
     * @ja base64 形式でエンコードされたデータの文字列をデコード
     */
    static decode(encoded: string): string;
}
/**
 * @en `Blob` read options
 * @ja `Blob` 読み取りオプション
 */
export interface BlobReadOptions extends Cancelable {
    /**
     * @en Progress callback function.
     * @ja 進捗コールバック関数
     *
     * @param progress
     *  - `en` worker progress event
     *  - `ja` worker 進捗イベント
     */
    onprogress?: (progress: ProgressEvent) => unknown;
}
/**
 * @en Get the `ArrayBuffer` result from `Blob` or `File`.
 * @ja `Blob` または `File` から `ArrayBuffer` を取得
 *
 * @param blob
 *  - `en` specified reading target object.
 *  - `ja` 読み取り対象のオブジェクトを指定
 * @param options
 *  - `en` reading options.
 *  - `ja` 読み取りオプションを指定
 */
export declare function readAsArrayBuffer(blob: Blob, options?: BlobReadOptions): Promise<ArrayBuffer>;
/**
 * @en Get the data-URL string from `Blob` or `File`.
 * @ja `Blob` または `File` から `data-url 文字列を取得
 *
 * @param blob
 *  - `en` specified reading target object.
 *  - `ja` 読み取り対象のオブジェクトを指定
 * @param options
 *  - `en` reading options.
 *  - `ja` 読み取りオプションを指定
 */
export declare function readAsDataURL(blob: Blob, options?: BlobReadOptions): Promise<string>;
/**
 * @en Get the text content string from `Blob` or `File`.
 * @ja `Blob` または `File` からテキスト文字列を取得
 *
 * @param blob
 *  - `en` specified reading target object.
 *  - `ja` 読み取り対象のオブジェクトを指定
 * @param encoding
 *  - `en` encoding string to use for the returned data. default: `utf-8`
 *  - `ja` エンコーディングを指定する文字列 既定: `utf-8`
 * @param options
 *  - `en` reading options.
 *  - `ja` 読み取りオプションを指定
 */
export declare function readAsText(blob: Blob, encoding?: string | null, options?: BlobReadOptions): Promise<string>;
/**
 * @en Convert string to binary-string. (not human readable string)
 * @ja バイナリ文字列に変換
 *
 * @param text
 */
export declare function toBinaryString(text: string): string;
/**
 * @en Convert string from binary-string.
 * @ja バイナリ文字列から変換
 *
 * @param bytes
 */
export declare function fromBinaryString(bytes: string): string;
/**
 * @en Convert binary to hex-string.
 * @ja バイナリを HEX 文字列に変換
 *
 * @param hex
 */
export declare function fromHexString(hex: string): Uint8Array;
/**
 * @en Convert string from hex-string.
 * @ja HEX 文字列からバイナリに変換
 *
 * @param binary
 */
export declare function toHexString(binary: Uint8Array): string;
/**
 * @en Convert `Blob` to `ArrayBuffer`.
 * @ja `Blob` から `ArrayBuffer` へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToBuffer(blob: Blob, options?: BlobReadOptions): Promise<ArrayBuffer>;
/**
 * @en Convert `Blob` to `Uint8Array`.
 * @ja `Blob` から `Uint8Array` へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToBinary(blob: Blob, options?: BlobReadOptions): Promise<Uint8Array>;
/**
 * @en Convert `Blob` to data-URL string.
 * @ja `Blob` から data-URL 文字列へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToDataURL(blob: Blob, options?: BlobReadOptions): Promise<string>;
/**
 * @en Convert `Blob` to text string.
 * @ja `Blob` からテキストへ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToText(blob: Blob, options?: BlobReadOptions & {
    encoding?: string | null;
}): Promise<string>;
/**
 * @en Convert `Blob` to Base64 string.
 * @ja `Blob` から Base64 文字列へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToBase64(blob: Blob, options?: BlobReadOptions): Promise<string>;
/**
 * @en Convert `ArrayBuffer` to `Blob`.
 * @ja `ArrayBuffer` から `Blob` に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
export declare function bufferToBlob(buffer: ArrayBuffer, mimeType?: string): Blob;
/**
 * @en Convert `ArrayBuffer` to `Uint8Array`.
 * @ja `ArrayBuffer` から `Uint8Array` に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
export declare function bufferToBinary(buffer: ArrayBuffer): Uint8Array;
/**
 * @en Convert `ArrayBuffer` to data-URL string.
 * @ja `ArrayBuffer` から data-URL 文字列に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
export declare function bufferToDataURL(buffer: ArrayBuffer, mimeType?: string): string;
/**
 * @en Convert `ArrayBuffer` to Base64 string.
 * @ja `ArrayBuffer` から Base64 文字列に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
export declare function bufferToBase64(buffer: ArrayBuffer): string;
/**
 * @en Convert `ArrayBuffer` to text string.
 * @ja `ArrayBuffer` からテキストに変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
export declare function bufferToText(buffer: ArrayBuffer): string;
/**
 * @en Convert `Uint8Array` to `Blob`.
 * @ja `Uint8Array` から `Blob` に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
export declare function binaryToBlob(binary: Uint8Array, mimeType?: string): Blob;
/**
 * @en Convert `Uint8Array` to `ArrayBuffer`.
 * @ja `Uint8Array` から `ArrayBuffer` に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
export declare function binaryToBuffer(binary: Uint8Array): ArrayBuffer;
/**
 * @en Convert `Uint8Array` to data-URL string.
 * @ja `Uint8Array` から data-URL 文字列に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
export declare function binaryToDataURL(binary: Uint8Array, mimeType?: string): string;
/**
 * @en Convert `Uint8Array` to Base64 string.
 * @ja `Uint8Array` から Base64 文字列に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
export declare function binaryToBase64(binary: Uint8Array): string;
/**
 * @en Convert `Uint8Array` to text string.
 * @ja `Uint8Array` から テキストに変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
export declare function binaryToText(binary: Uint8Array): string;
/**
 * @en Convert Base64 string to `Blob`.
 * @ja Base64 文字列から `Blob` に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
export declare function base64ToBlob(base64: string, mimeType?: string): Blob;
/**
 * @en Convert Base64 string to `ArrayBuffer`.
 * @ja Base64 文字列から `ArrayBuffer` に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
export declare function base64ToBuffer(base64: string): ArrayBuffer;
/**
 * @en Convert Base64 string to `Uint8Array`.
 * @ja Base64 文字列から `Uint8Array` に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
export declare function base64ToBinary(base64: string): Uint8Array;
/**
 * @en Convert Base64 string to data-URL string.
 * @ja Base64 文字列から data-URL 文字列に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
export declare function base64ToDataURL(base64: string, mimeType?: string): string;
/**
 * @en Convert Base64 string to text string.
 * @ja  Base64 文字列から テキストに変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
export declare function base64ToText(base64: string): string;
/**
 * @en Convert text string to `Blob`.
 * @ja テキストから `Blob` に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
export declare function textToBlob(text: string, mimeType?: string): Blob;
/**
 * @en Convert text string to `ArrayBuffer`.
 * @ja テキストから `ArrayBuffer` に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
export declare function textToBuffer(text: string): ArrayBuffer;
/**
 * @en Convert text string to `Uint8Array`.
 * @ja テキストから `Uint8Array` に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
export declare function textToBinary(text: string): Uint8Array;
/**
 * @en Convert text string to data-URL string.
 * @ja テキストから data-URL 文字列に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
export declare function textToDataURL(text: string, mimeType?: string): string;
/**
 * @en Convert text string to Base64 string.
 * @ja テキストから Base64 文字列に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
export declare function textToBase64(text: string): string;
/**
 * @en Convert data-URL string to `Blob`.
 * @ja data-URL 文字列から `Blob` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToBlob(dataURL: string): Blob;
/**
 * @en Convert data-URL string to `ArrayBuffer`.
 * @ja data-URL 文字列から `ArrayBuffer` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToBuffer(dataURL: string): ArrayBuffer;
/**
 * @en Convert data-URL string to `Uint8Array`.
 * @ja data-URL 文字列から `Uint8Array` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToBinary(dataURL: string): Uint8Array;
/**
 * @en Convert data-URL string to text string.
 * @ja data-URL 文字列からテキストに変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToText(dataURL: string): string;
/**
 * @en Convert data-URL string to Base64 string.
 * @ja data-URL 文字列から Base64 文字列に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToBase64(dataURL: string): string;
/**
 * @en Serializable data type list.
 * @ja シリアライズ可能なデータ型一覧
 */
export interface Serializable {
    string: string;
    number: number;
    boolean: boolean;
    object: object;
    buffer: ArrayBuffer;
    binary: Uint8Array;
    blob: Blob;
}
export type SerializableDataTypes = Types<Serializable>;
export type SerializableInputDataTypes = SerializableDataTypes | null | undefined;
export type SerializableKeys = Keys<Serializable>;
export type SerializableCastable = Omit<Serializable, 'buffer' | 'binary' | 'blob'>;
export type SerializableCastableTypes = Types<SerializableCastable>;
export type SerializableReturnType<T extends SerializableCastableTypes> = TypeToKey<SerializableCastable, T> extends never ? never : T | null | undefined;
/**
 * @en Deserializable options interface.
 * @ja デシリアライズに使用するオプション
 */
export interface DeserializeOptions<T extends Serializable = Serializable, K extends Keys<T> = Keys<T>> extends Cancelable {
    /** {@link SerializableKeys} */
    dataType?: K;
}
/**
 * @en Serialize data.
 * @ja データシリアライズ
 *
 * @param data input
 * @param options blob convert options
 */
export declare function serialize<T extends SerializableInputDataTypes>(data: T, options?: BlobReadOptions): Promise<string>;
/**
 * @en Deserialize data.
 * @ja データの復元
 *
 * @param value input string or undefined.
 * @param options deserialize options
 */
export declare function deserialize<T extends SerializableCastableTypes = SerializableCastableTypes>(value: string | undefined, options?: DeserializeOptions<Serializable, never>): Promise<SerializableReturnType<T>>;
/**
 * @en Deserialize data.
 * @ja データの復元
 *
 * @param value input string or undefined.
 * @param options deserialize options
 */
export declare function deserialize<T extends SerializableKeys>(value: string | undefined, options: DeserializeOptions<Serializable, T>): Promise<Serializable[T] | null | undefined>;
/**
 * @en `Blob URL` utility for automatic memory manegement.
 * @ja メモリ自動管理を行う `Blob URL` ユーティリティ
 */
export declare class BlobURL {
    /**
     * @en Create `Blob URL` from instances.
     * @ja インスタンスを指定して `Blob URL` の構築
     */
    static create(...blobs: Blob[]): void;
    /**
     * @en Clear all `Blob URL` cache.
     * @ja すべての `Blob URL` キャッシュを破棄
     */
    static clear(): void;
    /**
     * @en Get `Blob URL` from instance.
     * @ja インスタンスを指定して `Blob URL` の取得
     */
    static get(blob: Blob): string;
    /**
     * @en Check `Blob URL` is available from instance.
     * @ja インスタンスを指定して `Blob URL` が有効化判定
     */
    static has(blob: Blob): boolean;
    /**
     * @en Revoke `Blob URL` from instances.
     * @ja インスタンスを指定して `Blob URL` を無効化
     */
    static revoke(...blobs: Blob[]): void;
}
/**
 * @en {@link InlineWorker} source type definition.
 * @ja {@link InlineWorker} に指定可能なソース型定義
 */
export type InlienWorkerSource = ((self: Worker) => unknown) | string;
/**
 * @en Specified `Worker` class which doesn't require a script file.
 * @ja スクリプトファイルを必要としない `Worker` クラス
 */
export declare class InlineWorker extends Worker {
    /**
     * constructor
     *
     * @param src
     *  - `en` source function or script body.
     *  - `ja` 実行関数またはスクリプト実体
     * @param options
     *  - `en` worker options.
     *  - `ja` Worker オプション
     */
    constructor(src: InlienWorkerSource, options?: WorkerOptions);
    /**
     * @en For BLOB release. When calling `close ()` in the Worker, call this method as well.
     * @ja BLOB 解放用. Worker 内で `close()` を呼ぶ場合, 本メソッドもコールすること.
     */
    terminate(): void;
}
/**
 * @en Thread options
 * @en スレッドオプション
 */
export interface ThreadOptions<T extends UnknownFunction> extends Cancelable, WorkerOptions {
    args?: Parameters<T>;
}
/**
 * @en Ensure execution in worker thread.
 * @ja ワーカースレッド内で実行を保証
 *
 * @example <br>
 *
 * ```ts
 * const exec = (arg1: number, arg2: string) => {
 *    // this scope is worker scope. you cannot use closure access.
 *    const param = {...};
 *    const method = (p) => {...};
 *    // you can access arguments from options.
 *    console.log(arg1); // '1'
 *    console.log(arg2); // 'test'
 *    :
 *    return method(param);
 * };
 *
 * const arg1 = 1;
 * const arg2 = 'test';
 * const result = await thread(exec, { args: [arg1, arg2] });
 * ```
 *
 * @param executor
 *  - `en` implement as function scope.
 *  - `ja` 関数スコープとして実装
 * @param options
 *  - `en` thread options
 *  - `ja` スレッドオプション
 */
export declare function thread<T, U>(executor: (...args: U[]) => T | Promise<T>, options?: ThreadOptions<typeof executor>): Promise<T>;
import './result-code-defs';
