import { AjaxDataTypes, AjaxOptions, AjaxResult } from './interfaces';
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
