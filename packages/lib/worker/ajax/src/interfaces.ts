import type { PlainObject } from '@cdp/core-utils';
import type { Subscribable } from '@cdp/events';
import type { Cancelable } from '@cdp/promise';

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
