import type { PlainObject } from '@cdp/core-utils';
import { RESULT_CODE, makeResult } from '@cdp/result';
import type {
    AjaxDataTypes,
    AjaxOptions,
    AjaxRequestOptions,
    AjaxGetRequestShortcutOptions,
    AjaxResult,
} from './interfaces';
import { ajax, setupHeaders } from './core';
import { toQueryStrings } from './params';
import { XMLHttpRequest } from './ssr';

/** @internal */
const ensureDataType = (dataType?: AjaxDataTypes): AjaxDataTypes => {
    return dataType ?? 'json';
};

/**
 * @en `GET` request shortcut.
 * @ja `GET` リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 * @param dataType
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーから返される期待するデータの型を指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
const get = <T extends AjaxDataTypes | object = 'json'>(
    url: string,
    data?: PlainObject,
    dataType?: T extends AjaxDataTypes ? T : 'json',
    options?: AjaxRequestOptions
): Promise<AjaxResult<T>> => {
    return ajax(url, { ...options, method: 'GET', data, dataType: ensureDataType(dataType) } as AjaxOptions<T>);
};

/**
 * @en `GET` text request shortcut.
 * @ja `GET` テキストリクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
const text = (url: string, options?: AjaxGetRequestShortcutOptions): Promise<AjaxResult<'text'>> => {
    return get(url, undefined, 'text', options);
};

/**
 * @en `GET` JSON request shortcut.
 * @ja `GET` JSON リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
const json = <T extends 'json' | object = 'json'>(url: string, options?: AjaxGetRequestShortcutOptions): Promise<AjaxResult<T>> => {
    return get<T>(url, undefined, ('json' as T extends AjaxDataTypes ? T : 'json'), options);
};

/**
 * @en `GET` Blob request shortcut.
 * @ja `GET` Blob リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
const blob = (url: string, options?: AjaxGetRequestShortcutOptions): Promise<AjaxResult<'blob'>> => {
    return get(url, undefined, 'blob', options);
};

/**
 * @en `POST` request shortcut.
 * @ja `POST` リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 * @param dataType
 *  - `en` The type of data that you're expecting back from the server.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
const post = <T extends AjaxDataTypes | object = 'json'>(
    url: string,
    data: PlainObject,
    dataType?: T extends AjaxDataTypes ? T : 'json',
    options?: AjaxRequestOptions
): Promise<AjaxResult<T>> => {
    return ajax(url, { ...options, method: 'POST', data, dataType: ensureDataType(dataType) } as AjaxOptions<T>);
};

/**
 * @en Synchronous `GET` request for resource access. <br>
 *     Many browsers have deprecated synchronous XHR support on the main thread entirely.
 * @ja リソース取得のための 同期 `GET` リクエスト. <br>
 *     多くのブラウザではメインスレッドにおける同期的な XHR の対応を全面的に非推奨としているので積極使用は避けること.
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param dataType
 *  - `en` The type of data that you're expecting back from the server.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 */
const resource = <T extends 'text' | 'json' | object = 'json'>(
    url: string,
    dataType?: T extends 'text' | 'json' ? T : 'json',
    data?: PlainObject,
): AjaxResult<T> => {
    const xhr = new XMLHttpRequest();

    if (null != data && !url.includes('?')) {
        url += `?${toQueryStrings(data)}`;
    }

    // synchronous
    xhr.open('GET', url, false);

    const type = ensureDataType(dataType);
    const headers = setupHeaders({ method: 'GET', dataType: type });
    headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
    });

    xhr.send(null);
    if (!(200 <= xhr.status && xhr.status < 300)) {
        throw makeResult(RESULT_CODE.ERROR_AJAX_RESPONSE, xhr.statusText, xhr);
    }

    return 'json' === type ? JSON.parse(xhr.response) : xhr.response;
};

export const request = {
    get,
    text,
    json,
    blob,
    post,
    resource,
};
