/*!
 * @cdp/ajax 0.9.19
 *   ajax utility module
 */

import { CancelToken } from '@cdp/promise';
import { makeResult, RESULT_CODE } from '@cdp/result';
import { Base64 } from '@cdp/binary';
import { safe, assignValue, isNumeric, isFunction, isNumber } from '@cdp/core-utils';
import { EventSource } from '@cdp/events';

/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["AJAX_DECLARE"] = 9007199254740991] = "AJAX_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_AJAX_RESPONSE"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 20 /* LOCAL_CODE_BASE.AJAX */ + 1, 'network error.')] = "ERROR_AJAX_RESPONSE";
        RESULT_CODE[RESULT_CODE["ERROR_AJAX_TIMEOUT"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 20 /* LOCAL_CODE_BASE.AJAX */ + 2, 'request timeout.')] = "ERROR_AJAX_TIMEOUT";
    })();
})();

/** @internal */ const FormData = safe(globalThis.FormData);
/** @internal */ const Headers = safe(globalThis.Headers);
/** @internal */ const AbortController = safe(globalThis.AbortController);
/** @internal */ const URLSearchParams = safe(globalThis.URLSearchParams);
/** @internal */ const XMLHttpRequest = safe(globalThis.XMLHttpRequest);
/** @internal */ const fetch = safe(globalThis.fetch);

/** @internal ensure string value */
const ensureParamValue = (prop) => {
    const value = isFunction(prop) ? prop() : prop;
    return undefined !== value ? String(value) : '';
};
/**
 * @en Convert `PlainObject` to query strings.
 * @ja `PlainObject` をクエリストリングに変換
 */
const toQueryStrings = (data) => {
    const params = [];
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return params.join('&');
};
/**
 * @en Convert `PlainObject` to Ajax parameters object.
 * @ja `PlainObject` を Ajax パラメータオブジェクトに変換
 */
const toAjaxParams = (data) => {
    const params = {};
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            assignValue(params, key, value);
        }
    }
    return params;
};
/**
 * @en Convert URL parameters to primitive type.
 * @ja URL パラメータを primitive に変換
 */
const convertUrlParamType = (value) => {
    if (isNumeric(value)) {
        return Number(value);
    }
    else if ('true' === value) {
        return true;
    }
    else if ('false' === value) {
        return false;
    }
    else if ('null' === value) {
        return null;
    }
    else {
        return decodeURIComponent(value);
    }
};
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
const parseUrlQuery = (url) => {
    const query = {};
    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : url);
    for (const [key, value] of params) {
        query[decodeURIComponent(key)] = convertUrlParamType(value);
    }
    return query;
};

/** @internal ProxyHandler helper */
const _execGetDefault = (target, prop) => {
    if (prop in target) {
        if (isFunction(target[prop])) {
            return target[prop].bind(target);
        }
        else {
            return target[prop];
        }
    }
};
/** @internal */
const _subscribableMethods = [
    'hasListener',
    'channels',
    'on',
    'off',
    'once',
];
const toAjaxDataStream = (seed, length) => {
    let loaded = 0;
    const [stream, total] = (() => {
        if (seed instanceof Blob) {
            return [seed.stream(), seed.size];
        }
        else {
            return [seed, length != null ? Math.trunc(length) : NaN];
        }
    })();
    const _eventSource = new EventSource();
    const _proxyReaderHandler = {
        get: (target, prop) => {
            if ('read' === prop) {
                const promise = target.read();
                void (async () => {
                    const { done, value: chunk } = await promise;
                    chunk && (loaded += chunk.length);
                    _eventSource.trigger('progress', Object.freeze({
                        computable: !Number.isNaN(total),
                        loaded,
                        total,
                        done,
                        chunk,
                    }));
                })();
                return () => promise;
            }
            else {
                return _execGetDefault(target, prop);
            }
        },
    };
    return new Proxy(stream, {
        get: (target, prop) => {
            if ('getReader' === prop) {
                return () => new Proxy(target.getReader(), _proxyReaderHandler);
            }
            else if ('length' === prop) {
                return total;
            }
            else if (_subscribableMethods.includes(prop)) {
                return (...args) => _eventSource[prop](...args);
            }
            else {
                return _execGetDefault(target, prop);
            }
        },
    });
};

/** @internal */ let _timeout;
const settings = {
    get timeout() {
        return _timeout;
    },
    set timeout(value) {
        _timeout = (isNumber(value) && 0 <= value) ? value : undefined;
    },
};

/** @internal */
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
function setupHeaders(options) {
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
        }
        else if (!headers.get('Content-Type')) {
            if (null == contentType && 'json' === dataType) {
                headers.set('Content-Type', 'application/json; charset=UTF-8');
            }
            else if (null != contentType) {
                headers.set('Content-Type', contentType);
            }
        }
    }
    // Accept
    if (!headers.get('Accept')) {
        headers.set('Accept', _acceptHeaderMap[dataType] || '*/*');
    }
    /*
     * X-Requested-With
     * 非標準ヘッダーであるため, 既定では cors の preflight response で許可されない
     * また mode の既定値は cors であるため, 有効にするには mode の明示的指定が必要となる
     */
    if (mode && 'cors' !== mode && !headers.get('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
    }
    // Basic Authorization
    if (null != username && !headers.get('Authorization')) {
        headers.set('Authorization', `Basic ${Base64.encode(`${username}:${password ?? ''}`)}`);
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
async function ajax(url, options) {
    const controller = new AbortController();
    const abort = () => controller.abort();
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
    const source = CancelToken.source(originalToken);
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
        }
        else if (null == opts.body) {
            opts.body = new URLSearchParams(toAjaxParams(data));
        }
    }
    // execute
    const response = await Promise.resolve(fetch(url, opts), token);
    if ('response' === dataType) {
        return response;
    }
    else if (!response.ok) {
        throw makeResult(RESULT_CODE.ERROR_AJAX_RESPONSE, response.statusText, response);
    }
    else if ('stream' === dataType) {
        return toAjaxDataStream(response.body, Number(response.headers.get('content-length')));
    }
    else {
        // eslint-disable-next-line
        return Promise.resolve(response[dataType](), token);
    }
}
ajax.settings = settings;

/** @internal */
const ensureDataType = (dataType) => {
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
const get = (url, data, dataType, options) => {
    return ajax(url, { ...options, method: 'GET', data, dataType: ensureDataType(dataType) });
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
const text = (url, options) => {
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
const json = (url, options) => {
    return get(url, undefined, 'json', options);
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
const blob = (url, options) => {
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
const post = (url, data, dataType, options) => {
    return ajax(url, { ...options, method: 'POST', data, dataType: ensureDataType(dataType) });
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
const resource = (url, dataType, data) => {
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
const request = {
    get,
    text,
    json,
    blob,
    post,
    resource,
};

export { ajax, convertUrlParamType, parseUrlQuery, request, setupHeaders, toAjaxDataStream, toAjaxParams, toQueryStrings };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJzc3IudHMiLCJwYXJhbXMudHMiLCJzdHJlYW0udHMiLCJzZXR0aW5ncy50cyIsImNvcmUudHMiLCJyZXF1ZXN0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQUpBWCA9IENEUF9LTk9XTl9NT0RVTEUuQUpBWCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9BSkFYX1JFU1BPTlNFID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDEsICduZXR3b3JrIGVycm9yLicpLFxuICAgICAgICBFUlJPUl9BSkFYX1RJTUVPVVQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDIsICdyZXF1ZXN0IHRpbWVvdXQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZvcm1EYXRhICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5Gb3JtRGF0YSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBIZWFkZXJzICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuSGVhZGVycyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBBYm9ydENvbnRyb2xsZXIgPSBzYWZlKGdsb2JhbFRoaXMuQWJvcnRDb250cm9sbGVyKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTFNlYXJjaFBhcmFtcyA9IHNhZmUoZ2xvYmFsVGhpcy5VUkxTZWFyY2hQYXJhbXMpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgWE1MSHR0cFJlcXVlc3QgID0gc2FmZShnbG9iYWxUaGlzLlhNTEh0dHBSZXF1ZXN0KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGZldGNoICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5mZXRjaCk7XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc051bWVyaWMsXG4gICAgYXNzaWduVmFsdWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBVUkxTZWFyY2hQYXJhbXMgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIHN0cmluZyB2YWx1ZSAqL1xuY29uc3QgZW5zdXJlUGFyYW1WYWx1ZSA9IChwcm9wOiB1bmtub3duKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGlzRnVuY3Rpb24ocHJvcCkgPyBwcm9wKCkgOiBwcm9wO1xuICAgIHJldHVybiB1bmRlZmluZWQgIT09IHZhbHVlID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBgUGxhaW5PYmplY3RgIHRvIHF1ZXJ5IHN0cmluZ3MuXG4gKiBAamEgYFBsYWluT2JqZWN0YCDjgpLjgq/jgqjjg6rjgrnjg4jjg6rjg7PjgrDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IHRvUXVlcnlTdHJpbmdzID0gKGRhdGE6IFBsYWluT2JqZWN0KTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBwYXJhbXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbnN1cmVQYXJhbVZhbHVlKGRhdGFba2V5XSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgcGFyYW1zLnB1c2goYCR7ZW5jb2RlVVJJQ29tcG9uZW50KGtleSl9PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKX1gKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zLmpvaW4oJyYnKTtcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBBamF4IHBhcmFtZXRlcnMgb2JqZWN0LlxuICogQGphIGBQbGFpbk9iamVjdGAg44KSIEFqYXgg44OR44Op44Oh44O844K/44Kq44OW44K444Kn44Kv44OI44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCB0b0FqYXhQYXJhbXMgPSAoZGF0YTogUGxhaW5PYmplY3QpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0+IHtcbiAgICBjb25zdCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZShwYXJhbXMsIGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IFVSTCBwYXJhbWV0ZXJzIHRvIHByaW1pdGl2ZSB0eXBlLlxuICogQGphIFVSTCDjg5Hjg6njg6Hjg7zjgr/jgpIgcHJpbWl0aXZlIOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgY29udmVydFVybFBhcmFtVHlwZSA9ICh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgPT4ge1xuICAgIGlmIChpc051bWVyaWModmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBOdW1iZXIodmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoJ3RydWUnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCdmYWxzZScgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBAZW4gUGFyc2UgdXJsIHF1ZXJ5IEdFVCBwYXJhbWV0ZXJzLlxuICogQGphIFVSTOOCr+OCqOODquOBrkdFVOODkeODqeODoeODvOOCv+OCkuino+aekFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdXJsID0gJy9wYWdlLz9pZD01JmZvbz1iYXImYm9vbD10cnVlJztcbiAqIGNvbnN0IHF1ZXJ5ID0gcGFyc2VVcmxRdWVyeSh1cmwpO1xuICogLy8geyBpZDogNSwgZm9vOiAnYmFyJywgYm9vbDogdHJ1ZSB9XG4gKiBgYGBcbiAqXG4gKiBAcmV0dXJucyB7IGtleTogdmFsdWUgfSBvYmplY3QuXG4gKi9cbmV4cG9ydCBjb25zdCBwYXJzZVVybFF1ZXJ5ID0gPFQgPSBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD4+KHVybDogc3RyaW5nKTogVCA9PiB7XG4gICAgY29uc3QgcXVlcnk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh1cmwuaW5jbHVkZXMoJz8nKSA/IHVybC5zcGxpdCgnPycpWzFdIDogdXJsKTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBwYXJhbXMpIHtcbiAgICAgICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGtleSldID0gY29udmVydFVybFBhcmFtVHlwZSh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBxdWVyeSBhcyBUO1xufTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duRnVuY3Rpb24sXG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgS2V5cyxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBTdWJzY3JpYmFibGUsIEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHR5cGUgeyBBamF4RGF0YVN0cmVhbUV2ZW50LCBBamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgUHJveHlIYW5kbGVyIGhlbHBlciAqL1xuY29uc3QgX2V4ZWNHZXREZWZhdWx0ID0gKHRhcmdldDogYW55LCBwcm9wOiBzdHJpbmcgfCBzeW1ib2wpOiBhbnkgPT4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24odGFyZ2V0W3Byb3BdKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXS5iaW5kKHRhcmdldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3N1YnNjcmliYWJsZU1ldGhvZHM6IEtleXM8U3Vic2NyaWJhYmxlPltdID0gW1xuICAgICdoYXNMaXN0ZW5lcicsXG4gICAgJ2NoYW5uZWxzJyxcbiAgICAnb24nLFxuICAgICdvZmYnLFxuICAgICdvbmNlJyxcbl07XG5cbmV4cG9ydCBjb25zdCB0b0FqYXhEYXRhU3RyZWFtID0gKHNlZWQ6IEJsb2IgfCBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiwgbGVuZ3RoPzogbnVtYmVyKTogQWpheERhdGFTdHJlYW0gPT4ge1xuICAgIGxldCBsb2FkZWQgPSAwO1xuICAgIGNvbnN0IFtzdHJlYW0sIHRvdGFsXSA9ICgoKSA9PiB7XG4gICAgICAgIGlmIChzZWVkIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICAgICAgcmV0dXJuIFtzZWVkLnN0cmVhbSgpLCBzZWVkLnNpemVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtzZWVkLCBsZW5ndGggIT0gbnVsbCA/IE1hdGgudHJ1bmMobGVuZ3RoKSA6IE5hTl07XG4gICAgICAgIH1cbiAgICB9KSgpO1xuXG4gICAgY29uc3QgX2V2ZW50U291cmNlID0gbmV3IEV2ZW50U291cmNlPEFqYXhEYXRhU3RyZWFtRXZlbnQ+KCkgYXMgQWNjZXNzaWJsZTxFdmVudFNvdXJjZTxBamF4RGF0YVN0cmVhbUV2ZW50PiwgVW5rbm93bkZ1bmN0aW9uPjtcblxuICAgIGNvbnN0IF9wcm94eVJlYWRlckhhbmRsZXI6IFByb3h5SGFuZGxlcjxSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VWludDhBcnJheT4+ID0ge1xuICAgICAgICBnZXQ6ICh0YXJnZXQ6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxVaW50OEFycmF5PiwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAoJ3JlYWQnID09PSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHRhcmdldC5yZWFkKCk7XG4gICAgICAgICAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGRvbmUsIHZhbHVlOiBjaHVuayB9ID0gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICAgICAgY2h1bmsgJiYgKGxvYWRlZCArPSBjaHVuay5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBfZXZlbnRTb3VyY2UudHJpZ2dlcigncHJvZ3Jlc3MnLCBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXB1dGFibGU6ICFOdW1iZXIuaXNOYU4odG90YWwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2h1bmssXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9KSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiBwcm9taXNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2V4ZWNHZXREZWZhdWx0KHRhcmdldCwgcHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgUHJveHkoc3RyZWFtLCB7XG4gICAgICAgIGdldDogKHRhcmdldDogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4sIHByb3A6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCdnZXRSZWFkZXInID09PSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IG5ldyBQcm94eSh0YXJnZXQuZ2V0UmVhZGVyKCksIF9wcm94eVJlYWRlckhhbmRsZXIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgnbGVuZ3RoJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoX3N1YnNjcmliYWJsZU1ldGhvZHMuaW5jbHVkZXMocHJvcCBhcyBLZXlzPFN1YnNjcmliYWJsZT4pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICguLi5hcmdzOiB1bmtub3duW10pID0+IF9ldmVudFNvdXJjZVtwcm9wXSguLi5hcmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9leGVjR2V0RGVmYXVsdCh0YXJnZXQsIHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pIGFzIEFqYXhEYXRhU3RyZWFtO1xufTtcbiIsImltcG9ydCB7IGlzTnVtYmVyIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX3RpbWVvdXQ6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuZXhwb3J0IGNvbnN0IHNldHRpbmdzID0ge1xuICAgIGdldCB0aW1lb3V0KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfdGltZW91dDtcbiAgICB9LFxuICAgIHNldCB0aW1lb3V0KHZhbHVlOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICAgICAgX3RpbWVvdXQgPSAoaXNOdW1iZXIodmFsdWUpICYmIDAgPD0gdmFsdWUpID8gdmFsdWUgOiB1bmRlZmluZWQ7XG4gICAgfSxcbn07XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEJhc2U2NCB9IGZyb20gJ0BjZHAvYmluYXJ5JztcbmltcG9ydCB0eXBlIHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEZvcm1EYXRhLFxuICAgIEhlYWRlcnMsXG4gICAgQWJvcnRDb250cm9sbGVyLFxuICAgIFVSTFNlYXJjaFBhcmFtcyxcbiAgICBmZXRjaCxcbn0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgdG9RdWVyeVN0cmluZ3MsIHRvQWpheFBhcmFtcyB9IGZyb20gJy4vcGFyYW1zJztcbmltcG9ydCB7IHRvQWpheERhdGFTdHJlYW0gfSBmcm9tICcuL3N0cmVhbSc7XG5pbXBvcnQgeyBzZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBBamF4SGVhZGVyT3B0aW9ucyA9IFBpY2s8QWpheE9wdGlvbnM8QWpheERhdGFUeXBlcz4sICdoZWFkZXJzJyB8ICdtZXRob2QnIHwgJ2NvbnRlbnRUeXBlJyB8ICdkYXRhVHlwZScgfCAnbW9kZScgfCAnYm9keScgfCAndXNlcm5hbWUnIHwgJ3Bhc3N3b3JkJz47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9hY2NlcHRIZWFkZXJNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgdGV4dDogJ3RleHQvcGxhaW4sIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sOyBxPTAuOCwgdGV4dC94bWw7IHE9MC44LCAqLyo7IHE9MC4wMScsXG4gICAganNvbjogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdCwgKi8qOyBxPTAuMDEnLFxufTtcblxuLyoqXG4gKiBAZW4gU2V0dXAgYGhlYWRlcnNgIGZyb20gb3B0aW9ucyBwYXJhbWV0ZXIuXG4gKiBAamEg44Kq44OX44K344On44Oz44GL44KJIGBoZWFkZXJzYCDjgpLoqK3lrppcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSGVhZGVycyhvcHRpb25zOiBBamF4SGVhZGVyT3B0aW9ucyk6IEhlYWRlcnMge1xuICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpO1xuICAgIGNvbnN0IHsgbWV0aG9kLCBjb250ZW50VHlwZSwgZGF0YVR5cGUsIG1vZGUsIGJvZHksIHVzZXJuYW1lLCBwYXNzd29yZCB9ID0gb3B0aW9ucztcblxuICAgIC8vIENvbnRlbnQtVHlwZVxuICAgIGlmICgnUE9TVCcgPT09IG1ldGhvZCB8fCAnUFVUJyA9PT0gbWV0aG9kIHx8ICdQQVRDSCcgPT09IG1ldGhvZCkge1xuICAgICAgICAvKlxuICAgICAgICAgKiBmZXRjaCgpIOOBruWgtOWQiCwgRm9ybURhdGEg44KS6Ieq5YuV6Kej6YeI44GZ44KL44Gf44KBLCDmjIflrprjgYzjgYLjgovloLTlkIjjga/liYrpmaRcbiAgICAgICAgICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzUxOTI4NDEvZmV0Y2gtcG9zdC13aXRoLW11bHRpcGFydC1mb3JtLWRhdGFcbiAgICAgICAgICogaHR0cHM6Ly9tdWZmaW5tYW4uaW8vdXBsb2FkaW5nLWZpbGVzLXVzaW5nLWZldGNoLW11bHRpcGFydC1mb3JtLWRhdGEvXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpICYmIGJvZHkgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuICAgICAgICAgICAgaGVhZGVycy5kZWxldGUoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICB9IGVsc2UgaWYgKCFoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNvbnRlbnRUeXBlICYmICdqc29uJyA9PT0gZGF0YVR5cGUhKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgY29udGVudFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWNjZXB0XG4gICAgaWYgKCFoZWFkZXJzLmdldCgnQWNjZXB0JykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0FjY2VwdCcsIF9hY2NlcHRIZWFkZXJNYXBbZGF0YVR5cGUhXSB8fCAnKi8qJyk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBYLVJlcXVlc3RlZC1XaXRoXG4gICAgICog6Z2e5qiZ5rqW44OY44OD44OA44O844Gn44GC44KL44Gf44KBLCDml6Llrprjgafjga8gY29ycyDjga4gcHJlZmxpZ2h0IHJlc3BvbnNlIOOBp+ioseWPr+OBleOCjOOBquOBhFxuICAgICAqIOOBvuOBnyBtb2RlIOOBruaXouWumuWApOOBryBjb3JzIOOBp+OBguOCi+OBn+OCgSwg5pyJ5Yq544Gr44GZ44KL44Gr44GvIG1vZGUg44Gu5piO56S655qE5oyH5a6a44GM5b+F6KaB44Go44Gq44KLXG4gICAgICovXG4gICAgaWYgKG1vZGUgJiYgJ2NvcnMnICE9PSBtb2RlICYmICFoZWFkZXJzLmdldCgnWC1SZXF1ZXN0ZWQtV2l0aCcpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdYLVJlcXVlc3RlZC1XaXRoJywgJ1hNTEh0dHBSZXF1ZXN0Jyk7XG4gICAgfVxuXG4gICAgLy8gQmFzaWMgQXV0aG9yaXphdGlvblxuICAgIGlmIChudWxsICE9IHVzZXJuYW1lICYmICFoZWFkZXJzLmdldCgnQXV0aG9yaXphdGlvbicpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdBdXRob3JpemF0aW9uJywgYEJhc2ljICR7QmFzZTY0LmVuY29kZShgJHt1c2VybmFtZX06JHtwYXNzd29yZCA/PyAnJ31gKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGVhZGVycztcbn1cblxuLyoqXG4gKiBAZW4gUGVyZm9ybSBhbiBhc3luY2hyb25vdXMgSFRUUCAoQWpheCkgcmVxdWVzdC5cbiAqIEBqYSBIVFRQIChBamF4KeODquOCr+OCqOOCueODiOOBrumAgeS/oVxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIEFqYXggcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOioreWumlxuICovXG5hc3luYyBmdW5jdGlvbiBhamF4PFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzIHwgb2JqZWN0ID0gJ3Jlc3BvbnNlJz4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4T3B0aW9uczxUPik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgYWJvcnQgPSAoKTogdm9pZCA9PiBjb250cm9sbGVyLmFib3J0KCk7XG5cbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAncmVzcG9uc2UnLFxuICAgICAgICB0aW1lb3V0OiBzZXR0aW5ncy50aW1lb3V0LFxuICAgIH0sIG9wdGlvbnMsIHtcbiAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCwgLy8gZm9yY2Ugb3ZlcnJpZGVcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgY2FuY2VsOiBvcmlnaW5hbFRva2VuLCB0aW1lb3V0IH0gPSBvcHRzO1xuXG4gICAgLy8gY2FuY2VsbGF0aW9uXG4gICAgaWYgKG9yaWdpbmFsVG9rZW4pIHtcbiAgICAgICAgaWYgKG9yaWdpbmFsVG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICB0aHJvdyBvcmlnaW5hbFRva2VuLnJlYXNvbjtcbiAgICAgICAgfVxuICAgICAgICBvcmlnaW5hbFRva2VuLnJlZ2lzdGVyKGFib3J0KTtcbiAgICB9XG5cbiAgICBjb25zdCBzb3VyY2UgPSBDYW5jZWxUb2tlbi5zb3VyY2Uob3JpZ2luYWxUb2tlbiEpO1xuICAgIGNvbnN0IHsgdG9rZW4gfSA9IHNvdXJjZTtcbiAgICB0b2tlbi5yZWdpc3RlcihhYm9ydCk7XG5cbiAgICAvLyB0aW1lb3V0XG4gICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBzb3VyY2UuY2FuY2VsKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9USU1FT1VULCAncmVxdWVzdCB0aW1lb3V0JykpLCB0aW1lb3V0KTtcbiAgICB9XG5cbiAgICAvLyBub3JtYWxpemVcbiAgICBvcHRzLm1ldGhvZCA9IG9wdHMubWV0aG9kLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAvLyBoZWFkZXJcbiAgICBvcHRzLmhlYWRlcnMgPSBzZXR1cEhlYWRlcnMob3B0cyk7XG5cbiAgICAvLyBwYXJzZSBwYXJhbVxuICAgIGNvbnN0IHsgbWV0aG9kLCBkYXRhLCBkYXRhVHlwZSB9ID0gb3B0cztcbiAgICBpZiAobnVsbCAhPSBkYXRhKSB7XG4gICAgICAgIGlmICgoJ0dFVCcgPT09IG1ldGhvZCB8fCAnSEVBRCcgPT09IG1ldGhvZCkgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKGRhdGEpfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBvcHRzLmJvZHkpIHtcbiAgICAgICAgICAgIG9wdHMuYm9keSA9IG5ldyBVUkxTZWFyY2hQYXJhbXModG9BamF4UGFyYW1zKGRhdGEpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGV4ZWN1dGVcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShmZXRjaCh1cmwsIG9wdHMpLCB0b2tlbik7XG4gICAgaWYgKCdyZXNwb25zZScgPT09IGRhdGFUeXBlKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBBamF4UmVzdWx0PFQ+O1xuICAgIH0gZWxzZSBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgcmVzcG9uc2Uuc3RhdHVzVGV4dCwgcmVzcG9uc2UpO1xuICAgIH0gZWxzZSBpZiAoJ3N0cmVhbScgPT09IGRhdGFUeXBlKSB7XG4gICAgICAgIHJldHVybiB0b0FqYXhEYXRhU3RyZWFtKFxuICAgICAgICAgICAgcmVzcG9uc2UuYm9keSEsXG4gICAgICAgICAgICBOdW1iZXIocmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtbGVuZ3RoJykpLFxuICAgICAgICApIGFzIEFqYXhSZXN1bHQ8VD47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2VbZGF0YVR5cGUgYXMgRXhjbHVkZTxBamF4RGF0YVR5cGVzLCAncmVzcG9uc2UnIHwgJ3N0cmVhbSc+XSgpLCB0b2tlbik7XG4gICAgfVxufVxuXG5hamF4LnNldHRpbmdzID0gc2V0dGluZ3M7XG5cbmV4cG9ydCB7IGFqYXggfTtcbiIsImltcG9ydCB0eXBlIHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgQWpheERhdGFUeXBlcyxcbiAgICBBamF4T3B0aW9ucyxcbiAgICBBamF4UmVxdWVzdE9wdGlvbnMsXG4gICAgQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGFqYXgsIHNldHVwSGVhZGVycyB9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQgeyB0b1F1ZXJ5U3RyaW5ncyB9IGZyb20gJy4vcGFyYW1zJztcbmltcG9ydCB7IFhNTEh0dHBSZXF1ZXN0IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVEYXRhVHlwZSA9IChkYXRhVHlwZT86IEFqYXhEYXRhVHlwZXMpOiBBamF4RGF0YVR5cGVzID0+IHtcbiAgICByZXR1cm4gZGF0YVR5cGUgPz8gJ2pzb24nO1xufTtcblxuLyoqXG4gKiBAZW4gYEdFVGAgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgYvjgonov5TjgZXjgozjgovmnJ/lvoXjgZnjgovjg4fjg7zjgr/jga7lnovjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCBnZXQgPSA8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE/OiBQbGFpbk9iamVjdCxcbiAgICBkYXRhVHlwZT86IFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzID8gVCA6ICdqc29uJyxcbiAgICBvcHRpb25zPzogQWpheFJlcXVlc3RPcHRpb25zXG4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+ID0+IHtcbiAgICByZXR1cm4gYWpheCh1cmwsIHsgLi4ub3B0aW9ucywgbWV0aG9kOiAnR0VUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn07XG5cbi8qKlxuICogQGVuIGBHRVRgIHRleHQgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCDjg4bjgq3jgrnjg4jjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuY29uc3QgdGV4dCA9ICh1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PCd0ZXh0Jz4+ID0+IHtcbiAgICByZXR1cm4gZ2V0KHVybCwgdW5kZWZpbmVkLCAndGV4dCcsIG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBAZW4gYEdFVGAgSlNPTiByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIEpTT04g44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IGpzb24gPSA8VCBleHRlbmRzICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDxUPj4gPT4ge1xuICAgIHJldHVybiBnZXQ8VD4odXJsLCB1bmRlZmluZWQsICgnanNvbicgYXMgVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nKSwgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEBlbiBgR0VUYCBCbG9iIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAgQmxvYiDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuY29uc3QgYmxvYiA9ICh1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PCdibG9iJz4+ID0+IHtcbiAgICByZXR1cm4gZ2V0KHVybCwgdW5kZWZpbmVkLCAnYmxvYicsIG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBAZW4gYFBPU1RgIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYFBPU1RgIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgVGhlIHR5cGUgb2YgZGF0YSB0aGF0IHlvdSdyZSBleHBlY3RpbmcgYmFjayBmcm9tIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCBwb3N0ID0gPFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzIHwgb2JqZWN0ID0gJ2pzb24nPihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBkYXRhOiBQbGFpbk9iamVjdCxcbiAgICBkYXRhVHlwZT86IFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzID8gVCA6ICdqc29uJyxcbiAgICBvcHRpb25zPzogQWpheFJlcXVlc3RPcHRpb25zXG4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+ID0+IHtcbiAgICByZXR1cm4gYWpheCh1cmwsIHsgLi4ub3B0aW9ucywgbWV0aG9kOiAnUE9TVCcsIGRhdGEsIGRhdGFUeXBlOiBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSkgfSBhcyBBamF4T3B0aW9uczxUPik7XG59O1xuXG4vKipcbiAqIEBlbiBTeW5jaHJvbm91cyBgR0VUYCByZXF1ZXN0IGZvciByZXNvdXJjZSBhY2Nlc3MuIDxicj5cbiAqICAgICBNYW55IGJyb3dzZXJzIGhhdmUgZGVwcmVjYXRlZCBzeW5jaHJvbm91cyBYSFIgc3VwcG9ydCBvbiB0aGUgbWFpbiB0aHJlYWQgZW50aXJlbHkuXG4gKiBAamEg44Oq44K944O844K55Y+W5b6X44Gu44Gf44KB44GuIOWQjOacnyBgR0VUYCDjg6rjgq/jgqjjgrnjg4guIDxicj5cbiAqICAgICDlpJrjgY/jga7jg5bjg6njgqbjgrbjgafjga/jg6HjgqTjg7Pjgrnjg6zjg4Pjg4njgavjgYrjgZHjgovlkIzmnJ/nmoTjgaogWEhSIOOBruWvvuW/nOOCkuWFqOmdoueahOOBq+mdnuaOqOWlqOOBqOOBl+OBpuOBhOOCi+OBruOBp+epjealteS9v+eUqOOBr+mBv+OBkeOCi+OBk+OBqC5cbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgVGhlIHR5cGUgb2YgZGF0YSB0aGF0IHlvdSdyZSBleHBlY3RpbmcgYmFjayBmcm9tIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKi9cbmNvbnN0IHJlc291cmNlID0gPFQgZXh0ZW5kcyAndGV4dCcgfCAnanNvbicgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyA/IFQgOiAnanNvbicsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuKTogQWpheFJlc3VsdDxUPiA9PiB7XG4gICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICBpZiAobnVsbCAhPSBkYXRhICYmICF1cmwuaW5jbHVkZXMoJz8nKSkge1xuICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKGRhdGEpfWA7XG4gICAgfVxuXG4gICAgLy8gc3luY2hyb25vdXNcbiAgICB4aHIub3BlbignR0VUJywgdXJsLCBmYWxzZSk7XG5cbiAgICBjb25zdCB0eXBlID0gZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpO1xuICAgIGNvbnN0IGhlYWRlcnMgPSBzZXR1cEhlYWRlcnMoeyBtZXRob2Q6ICdHRVQnLCBkYXRhVHlwZTogdHlwZSB9KTtcbiAgICBoZWFkZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICB4aHIuc2VuZChudWxsKTtcbiAgICBpZiAoISgyMDAgPD0geGhyLnN0YXR1cyAmJiB4aHIuc3RhdHVzIDwgMzAwKSkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UsIHhoci5zdGF0dXNUZXh0LCB4aHIpO1xuICAgIH1cblxuICAgIHJldHVybiAnanNvbicgPT09IHR5cGUgPyBKU09OLnBhcnNlKHhoci5yZXNwb25zZSkgOiB4aHIucmVzcG9uc2U7XG59O1xuXG5leHBvcnQgY29uc3QgcmVxdWVzdCA9IHtcbiAgICBnZXQsXG4gICAgdGV4dCxcbiAgICBqc29uLFxuICAgIGJsb2IsXG4gICAgcG9zdCxcbiAgICByZXNvdXJjZSxcbn07XG4iXSwibmFtZXMiOltdLCJt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