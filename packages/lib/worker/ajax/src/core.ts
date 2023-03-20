import { CancelToken } from '@cdp/promise';
import { RESULT_CODE, makeResult } from '@cdp/result';
import { Base64 } from '@cdp/binary';
import {
    AjaxDataTypes,
    AjaxOptions,
    AjaxResult,
} from './interfaces';
import {
    FormData,
    Headers,
    AbortController,
    URLSearchParams,
    fetch,
} from './ssr';
import { toQueryStrings, toAjaxParams } from './params';
import { toAjaxDataStream } from './stream';
import { settings } from './settings';

/** @internal */
export type AjaxHeaderOptions = Pick<AjaxOptions<AjaxDataTypes>, 'headers' | 'method' | 'contentType' | 'dataType' | 'mode' | 'body' | 'username' | 'password'>;

/** @internal */
const _acceptHeaderMap: Record<string, string> = {
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
    const { method, contentType, dataType, mode, body, username, password } = options;

    // Content-Type
    if ('POST' === method || 'PUT' === method || 'PATCH' === method) {
        /*
         * fetch() の場合, FormData を自動解釈するため, 指定がある場合は削除
         * https://stackoverflow.com/questions/35192841/fetch-post-with-multipart-form-data
         * https://muffinman.io/uploading-files-using-fetch-multipart-form-data/
         */
        if (headers.get('Content-Type') && body instanceof FormData) {
            headers.delete('Content-Type');
        } else if (!headers.get('Content-Type')) {
            if (null == contentType && 'json' === dataType as AjaxDataTypes) {
                headers.set('Content-Type', 'application/json; charset=UTF-8');
            } else if (null != contentType) {
                headers.set('Content-Type', contentType);
            }
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
async function ajax<T extends AjaxDataTypes | object = 'response'>(url: string, options?: AjaxOptions<T>): Promise<AjaxResult<T>> {
    const controller = new AbortController();
    const abort = (): void => controller.abort();

    const opts = Object.assign({
        method: 'GET',
        dataType: 'response',
        timeout: settings.timeout,
    }, options, {
        signal: controller.signal, // force override
    });

    const { cancel: originalToken, timeout } = opts;

    // cancellation
    if (originalToken) {
        if (originalToken.requested) {
            throw originalToken.reason;
        }
        originalToken.register(abort);
    }

    const source = CancelToken.source(originalToken as CancelToken);
    const { token } = source;
    token.register(abort);

    // timeout
    if (timeout) {
        setTimeout(() => source.cancel(makeResult(RESULT_CODE.ERROR_AJAX_TIMEOUT, 'request timeout')), timeout);
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
    const response = await Promise.resolve(fetch(url, opts), token);
    if ('response' === dataType) {
        return response as AjaxResult<T>;
    } else if (!response.ok) {
        throw makeResult(RESULT_CODE.ERROR_AJAX_RESPONSE, response.statusText, response);
    } else if ('stream' === dataType) {
        return toAjaxDataStream(
            response.body as ReadableStream<Uint8Array>,
            Number(response.headers.get('content-length')),
        ) as AjaxResult<T>;
    } else {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        return Promise.resolve(response[dataType as Exclude<AjaxDataTypes, 'response' | 'stream'>](), token);
    }
}

ajax.settings = settings;

export { ajax };
