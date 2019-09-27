import { PlainObject, isFunction } from '@cdp/core-utils';
import { } from '@cdp/promise';
import { Blob, Base64 } from '@cdp/binary';
import {
    AjaxDataTypes,
    AjaxOptions,
    AjaxResult,
} from './interfaces';
import { fetch } from './ssr';
import { settings } from './settings';

// TODO: data 加工
// https://github.com/framework7io/framework7/blob/master/packages/core/utils/request.js#L153
// Accept
// https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Accept
// X-Requested-With: XMLHttpRequest
// https://github.com/github/fetch/issues/17
// CORS / JSONP (script タグを使うのでやらない)
// https://qiita.com/att55/items/2154a8aad8bf1409db2b
// https://stackoverflow.com/questions/41146650/get-json-from-jsonp-fetch-promise
// Basic 認証
// https://stackoverflow.com/questions/43842793/basic-authentication-with-fetch

/** `PlainObject` to query strings */
function toQueryStrings(data: PlainObject): string {
    const params: string[] = [];
    for (const key of Object.keys(data)) {
        const prop = data[key];
        const value = isFunction(prop) ? prop() : prop;
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(null != value ? value : '')}`);
    }
    return params.join('&');
}

/**
 * @en Perform an asynchronous HTTP (Ajax) request.
 * @ja HTTP (Ajax)リクエストの送信
 *
 * @param uri
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` Ajax request settings.
 *  - `ja` Ajaxリクエスト設定
 */
export async function ajax<T extends AjaxDataTypes | {} = 'response'>(url: string, options?: AjaxOptions<T>): Promise<AjaxResult<T>> {
    const opts = Object.assign({
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        dataType: 'response',
        timeout: settings.timeout,
    }, options);

    // TODO:
    await Promise.resolve();
    return null!;
}

/*
(async () => {
    let hoge0 = await ajax('aaa');
    let hoge1 = await ajax('aaa', { dataType: 'text' });
    let hoge2 = await ajax('aaa', { dataType: 'json' });
    let hoge3 = await ajax<{ prop: number; }>('aaa', { dataType: 'json' });
    let hoge4 = await ajax('aaa', { dataType: 'arrayBuffer' });
    let hoge5 = await ajax('aaa', { dataType: 'blob' });
    let hoge6 = await ajax('aaa', { dataType: 'stream' });
    let hoge7 = await ajax('aaa', { dataType: 'response' });
//    let hoge8 = await ajax<{ prop: number; }>('aaa', { dataType: 'text' }); // error
    let hoge9 = await ajax<{ prop: number; }>('aaa', {}); // no-error 注意.
})();
*/
