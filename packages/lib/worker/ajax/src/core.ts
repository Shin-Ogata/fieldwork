import { PlainObject, isFunction } from '@cdp/core-utils';
import { CancelToken } from '@cdp/promise';
import { makeCanceledResult } from '@cdp/result';
import { Base64 } from '@cdp/binary';
import {
    AjaxDataTypes,
    AjaxOptions,
    AjaxResult,
} from './interfaces';
import {
    Headers,
    AbortController,
    URLSearchParams,
    fetch,
} from './ssr';
import { settings } from './settings';

/** @internal */
export type AjaxHeaderOptions = Pick<AjaxOptions, 'headers' | 'method' | 'contentType' | 'dataType' | 'mode' | 'username' | 'password'>;

const _acceptHeaderMap = {
    text: 'text/plain, text/html, application/xml; q=0.8, text/xml; q=0.8, */*; q=0.01',
    json: 'application/json, text/javascript, */*; q=0.01',
};

/**
 * @en Setup `headers` from options parameter.
 * @ja オプションから `headers` を設定
 *
 * @internal
 */
export function setupHeaders(options: AjaxHeaderOptions): Headers {
    const headers = new Headers(options.headers);
    const { method, contentType, dataType, mode, username, password } = options;

    // Content-Type
    if (null != contentType && ('POST' === method || 'PUT' === method || 'PATCH' === method)) {
        /*
         * fetch() の場合, 'multipart/form-data' の FormData を自動解釈するため, 指定がある場合は削除
         * https://stackoverflow.com/questions/35192841/fetch-post-with-multipart-form-data
         * https://muffinman.io/uploading-files-using-fetch-multipart-form-data/
         */
        if ('multipart/form-data' === contentType) {
            headers.delete('Content-Type');
        } else if (!headers.get('Content-Type')) {
            headers.set('Content-Type', contentType);
        }
    }

    // Accept
    if (!headers.get('Accept')) {
        headers.set('Accept', _acceptHeaderMap[dataType as AjaxDataTypes] || '*/*');
    }

    // X-Requested-With
    if ('cors' !== mode && !headers.get('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
    }

    // Basic Authorization
    if (null != username && !headers.get('Authorization')) {
        headers.set('Authorization', `Basic ${Base64.encode(`${username}:${password || ''}`)}`);
    }

    return headers;
}

/** ensure string value */
function ensureParamValue(prop: unknown): string {
    const value = isFunction(prop) ? prop() : prop;
    return undefined !== value ? String(value) : '';
}

/**
 * @en Convert `PlainObject` to query strings.
 * @ja `PlainObject` をクエリストリングに変換
 */
export function toQueryStrings(data: PlainObject): string {
    const params: string[] = [];
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return params.join('&');
}

/**
 * @en Convert `PlainObject` to Ajax parameters object.
 * @ja `PlainObject` を Ajax パラメータオブジェクトに変換
 */
export function toAjaxParams(data: PlainObject): Record<string, string> {
    const params: Record<string, string> = {};
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            params[key] = value;
        }
    }
    return params;
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
    const controller = new AbortController();

    const opts = Object.assign({
        method: 'GET',
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        dataType: 'response',
        timeout: settings.timeout,
    }, options, {
        signal: controller.signal, // force override
    });

    const { cancel: originalToken, timeout } = opts;

    // cancellation
    if (originalToken) {
        if (originalToken.requested) {
            throw makeCanceledResult();
        }
        originalToken.register(() => controller.abort());
    }

    // timeout
    if (timeout) {
        const source = CancelToken.source(originalToken as CancelToken);
        setTimeout(() => source.cancel(makeCanceledResult('request timeout')), timeout);
    }

    // normalize
    opts.method = opts.method.toUpperCase();

    // header
    opts.headers = setupHeaders(opts);

    // parse param
    const { method, data, dataType } = opts;
    if (null != data) {
        if (('GET' === method || 'HEAD' === method) && !url.includes('?')) {
            url += `?${toQueryStrings(data)}`;
        } else if (null == opts.body) {
            opts.body = new URLSearchParams(toAjaxParams(data));
        }
    }

    // execute
    const response = await fetch(url, opts);
    if ('response' === dataType) {
        return response as AjaxResult<T>;
    } else {
        return response[dataType as Exclude<AjaxDataTypes, 'response'>]();
    }
}
