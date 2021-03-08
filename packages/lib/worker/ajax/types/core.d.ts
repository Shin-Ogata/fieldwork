import { PlainObject } from '@cdp/core-utils';
import { AjaxDataTypes, AjaxOptions, AjaxResult } from './interfaces';
/**
 * @en Convert `PlainObject` to query strings.
 * @ja `PlainObject` をクエリストリングに変換
 */
export declare function toQueryStrings(data: PlainObject): string;
/**
 * @en Convert `PlainObject` to Ajax parameters object.
 * @ja `PlainObject` を Ajax パラメータオブジェクトに変換
 */
export declare function toAjaxParams(data: PlainObject): Record<string, string>;
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
declare function ajax<T extends AjaxDataTypes | object = 'response'>(url: string, options?: AjaxOptions<T>): Promise<AjaxResult<T>>;
declare namespace ajax {
    var settings: {
        timeout: number | undefined;
    };
}
export { ajax };
