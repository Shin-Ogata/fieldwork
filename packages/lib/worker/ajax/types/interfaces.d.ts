import { PlainObject } from '@cdp/core-utils';
import { Cancelable } from '@cdp/promise';
/**
 * @en Stream data type result interface
 * @ja ストリームデータ型定義
 */
export interface AjaxDataStream {
    /** `content-length` */
    readonly length: number;
    /** `ReadableStream` interface */
    readonly stream: ReadableStream<Uint8Array>;
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
export declare type AjaxDataTypes = keyof AjaxDataTypeList;
/**
 * @en [[ajax]]() method options.
 * @ja [[ajax]]() に指定可能なオプション
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
export declare type AjaxRequestOptions = Pick<AjaxOptions, Exclude<keyof AjaxOptions, 'method' | 'data' | 'dataType'>>;
/**
 * @en `GET request` shortcut utility method options.
 * @ja `GET request` ショートカットに指定可能なオプション
 */
export declare type AjaxGetRequestShortcutOptions = AjaxRequestOptions & Pick<AjaxOptions, 'data'>;
/**
 * @en Result of [[ajax]]() returns value.
 * @ja [[ajax]]() が返却する結果
 */
export declare type AjaxResult<T extends AjaxDataTypes | object> = T extends AjaxDataTypes ? AjaxDataTypeList[T] : AjaxDataTypeList<T>['json'];
