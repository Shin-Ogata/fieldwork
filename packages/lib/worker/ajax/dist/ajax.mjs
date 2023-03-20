/*!
 * @cdp/ajax 0.9.17
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
 * const query = parseUrl();
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        return Promise.resolve(response[dataType](), token);
    }
}
ajax.settings = settings;

/** @internal */
function ensureDataType(dataType) {
    return dataType || 'json';
}
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
function get(url, data, dataType, options) {
    return ajax(url, { ...options, method: 'GET', data, dataType: ensureDataType(dataType) });
}
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
function text(url, options) {
    return get(url, undefined, 'text', options);
}
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
function json(url, options) {
    return get(url, undefined, 'json', options);
}
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
function blob(url, options) {
    return get(url, undefined, 'blob', options);
}
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
function post(url, data, dataType, options) {
    return ajax(url, { ...options, method: 'POST', data, dataType: ensureDataType(dataType) });
}
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
function resource(url, dataType, data) {
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
}

const request = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    blob,
    get,
    json,
    post,
    resource,
    text
}, Symbol.toStringTag, { value: 'Module' }));

export { ajax, convertUrlParamType, parseUrlQuery, request, setupHeaders, toAjaxDataStream, toAjaxParams, toQueryStrings };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJzc3IudHMiLCJwYXJhbXMudHMiLCJzdHJlYW0udHMiLCJzZXR0aW5ncy50cyIsImNvcmUudHMiLCJyZXF1ZXN0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQUpBWCA9IENEUF9LTk9XTl9NT0RVTEUuQUpBWCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9BSkFYX1JFU1BPTlNFID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDEsICduZXR3b3JrIGVycm9yLicpLFxuICAgICAgICBFUlJPUl9BSkFYX1RJTUVPVVQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDIsICdyZXF1ZXN0IHRpbWVvdXQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZvcm1EYXRhICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5Gb3JtRGF0YSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBIZWFkZXJzICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuSGVhZGVycyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBBYm9ydENvbnRyb2xsZXIgPSBzYWZlKGdsb2JhbFRoaXMuQWJvcnRDb250cm9sbGVyKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTFNlYXJjaFBhcmFtcyA9IHNhZmUoZ2xvYmFsVGhpcy5VUkxTZWFyY2hQYXJhbXMpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgWE1MSHR0cFJlcXVlc3QgID0gc2FmZShnbG9iYWxUaGlzLlhNTEh0dHBSZXF1ZXN0KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGZldGNoICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5mZXRjaCk7XG4iLCJpbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNOdW1lcmljLFxuICAgIGFzc2lnblZhbHVlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgVVJMU2VhcmNoUGFyYW1zIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBzdHJpbmcgdmFsdWUgKi9cbmNvbnN0IGVuc3VyZVBhcmFtVmFsdWUgPSAocHJvcDogdW5rbm93bik6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBpc0Z1bmN0aW9uKHByb3ApID8gcHJvcCgpIDogcHJvcDtcbiAgICByZXR1cm4gdW5kZWZpbmVkICE9PSB2YWx1ZSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBxdWVyeSBzdHJpbmdzLlxuICogQGphIGBQbGFpbk9iamVjdGAg44KS44Kv44Ko44Oq44K544OI44Oq44Oz44Kw44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCB0b1F1ZXJ5U3RyaW5ncyA9IChkYXRhOiBQbGFpbk9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgcGFyYW1zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHBhcmFtcy5wdXNoKGAke2VuY29kZVVSSUNvbXBvbmVudChrZXkpfT0ke2VuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSl9YCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcy5qb2luKCcmJyk7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gQWpheCBwYXJhbWV0ZXJzIG9iamVjdC5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkiBBamF4IOODkeODqeODoeODvOOCv+OCquODluOCuOOCp+OCr+ODiOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgdG9BamF4UGFyYW1zID0gKGRhdGE6IFBsYWluT2JqZWN0KTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9PiB7XG4gICAgY29uc3QgcGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbnN1cmVQYXJhbVZhbHVlKGRhdGFba2V5XSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgYXNzaWduVmFsdWUocGFyYW1zLCBrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBVUkwgcGFyYW1ldGVycyB0byBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSBVUkwg44OR44Op44Oh44O844K/44KSIHByaW1pdGl2ZSDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IGNvbnZlcnRVcmxQYXJhbVR5cGUgPSAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsID0+IHtcbiAgICBpZiAoaXNOdW1lcmljKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gTnVtYmVyKHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICgnbnVsbCcgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQGVuIFBhcnNlIHVybCBxdWVyeSBHRVQgcGFyYW1ldGVycy5cbiAqIEBqYSBVUkzjgq/jgqjjg6rjga5HRVTjg5Hjg6njg6Hjg7zjgr/jgpLop6PmnpBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHVybCA9ICcvcGFnZS8/aWQ9NSZmb289YmFyJmJvb2w9dHJ1ZSc7XG4gKiBjb25zdCBxdWVyeSA9IHBhcnNlVXJsKCk7XG4gKiAvLyB7IGlkOiA1LCBmb286ICdiYXInLCBib29sOiB0cnVlIH1cbiAqIGBgYFxuICpcbiAqIEByZXR1cm5zIHsga2V5OiB2YWx1ZSB9IG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IHBhcnNlVXJsUXVlcnkgPSA8VCA9IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPj4odXJsOiBzdHJpbmcpOiBUID0+IHtcbiAgICBjb25zdCBxdWVyeTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHVybC5pbmNsdWRlcygnPycpID8gdXJsLnNwbGl0KCc/JylbMV0gOiB1cmwpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHBhcmFtcykge1xuICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoa2V5KV0gPSBjb252ZXJ0VXJsUGFyYW1UeXBlKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHF1ZXJ5IGFzIFQ7XG59O1xuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBLZXlzLFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpYmFibGUsIEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHR5cGUgeyBBamF4RGF0YVN0cmVhbUV2ZW50LCBBamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgUHJveHlIYW5kbGVyIGhlbHBlciAqL1xuY29uc3QgX2V4ZWNHZXREZWZhdWx0ID0gKHRhcmdldDogYW55LCBwcm9wOiBzdHJpbmcgfCBzeW1ib2wpOiBhbnkgPT4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24odGFyZ2V0W3Byb3BdKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXS5iaW5kKHRhcmdldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3N1YnNjcmliYWJsZU1ldGhvZHM6IEtleXM8U3Vic2NyaWJhYmxlPltdID0gW1xuICAgICdoYXNMaXN0ZW5lcicsXG4gICAgJ2NoYW5uZWxzJyxcbiAgICAnb24nLFxuICAgICdvZmYnLFxuICAgICdvbmNlJyxcbl07XG5cbmV4cG9ydCBjb25zdCB0b0FqYXhEYXRhU3RyZWFtID0gKHNlZWQ6IEJsb2IgfCBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiwgbGVuZ3RoPzogbnVtYmVyKTogQWpheERhdGFTdHJlYW0gPT4ge1xuICAgIGxldCBsb2FkZWQgPSAwO1xuICAgIGNvbnN0IFtzdHJlYW0sIHRvdGFsXSA9ICgoKSA9PiB7XG4gICAgICAgIGlmIChzZWVkIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICAgICAgcmV0dXJuIFtzZWVkLnN0cmVhbSgpLCBzZWVkLnNpemVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtzZWVkLCBsZW5ndGggIT0gbnVsbCA/IE1hdGgudHJ1bmMobGVuZ3RoKSA6IE5hTl07XG4gICAgICAgIH1cbiAgICB9KSgpO1xuXG4gICAgY29uc3QgX2V2ZW50U291cmNlID0gbmV3IEV2ZW50U291cmNlPEFqYXhEYXRhU3RyZWFtRXZlbnQ+KCkgYXMgKEV2ZW50U291cmNlPEFqYXhEYXRhU3RyZWFtRXZlbnQ+ICYgVW5rbm93bk9iamVjdCk7XG5cbiAgICBjb25zdCBfcHJveHlSZWFkZXJIYW5kbGVyOiBQcm94eUhhbmRsZXI8UmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+PiA9IHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VWludDhBcnJheT4sIHByb3A6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCdyZWFkJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB0YXJnZXQucmVhZCgpO1xuICAgICAgICAgICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBkb25lLCB2YWx1ZTogY2h1bmsgfSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIGNodW5rICYmIChsb2FkZWQgKz0gY2h1bmsubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgX2V2ZW50U291cmNlLnRyaWdnZXIoJ3Byb2dyZXNzJywgT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wdXRhYmxlOiAhTnVtYmVyLmlzTmFOKHRvdGFsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNodW5rLFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gcHJvbWlzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9leGVjR2V0RGVmYXVsdCh0YXJnZXQsIHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IFByb3h5KHN0cmVhbSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQ6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICgnZ2V0UmVhZGVyJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiBuZXcgUHJveHkodGFyZ2V0LmdldFJlYWRlcigpLCBfcHJveHlSZWFkZXJIYW5kbGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2xlbmd0aCcgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zdWJzY3JpYmFibGVNZXRob2RzLmluY2x1ZGVzKHByb3AgYXMgS2V5czxTdWJzY3JpYmFibGU+KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoLi4uYXJnczogdW5rbm93bltdKSA9PiAoX2V2ZW50U291cmNlW3Byb3BdIGFzIFVua25vd25GdW5jdGlvbikoLi4uYXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfZXhlY0dldERlZmF1bHQodGFyZ2V0LCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KSBhcyBBamF4RGF0YVN0cmVhbTtcbn07XG4iLCJpbXBvcnQgeyBpc051bWJlciB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF90aW1lb3V0OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbmV4cG9ydCBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICBnZXQgdGltZW91dCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX3RpbWVvdXQ7XG4gICAgfSxcbiAgICBzZXQgdGltZW91dCh2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIF90aW1lb3V0ID0gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xuICAgIH0sXG59O1xuIiwiaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICdAY2RwL2JpbmFyeSc7XG5pbXBvcnQge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgRm9ybURhdGEsXG4gICAgSGVhZGVycyxcbiAgICBBYm9ydENvbnRyb2xsZXIsXG4gICAgVVJMU2VhcmNoUGFyYW1zLFxuICAgIGZldGNoLFxufSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyB0b1F1ZXJ5U3RyaW5ncywgdG9BamF4UGFyYW1zIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgdG9BamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IHNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIEFqYXhIZWFkZXJPcHRpb25zID0gUGljazxBamF4T3B0aW9uczxBamF4RGF0YVR5cGVzPiwgJ2hlYWRlcnMnIHwgJ21ldGhvZCcgfCAnY29udGVudFR5cGUnIHwgJ2RhdGFUeXBlJyB8ICdtb2RlJyB8ICdib2R5JyB8ICd1c2VybmFtZScgfCAncGFzc3dvcmQnPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FjY2VwdEhlYWRlck1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICB0ZXh0OiAndGV4dC9wbGFpbiwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWw7IHE9MC44LCB0ZXh0L3htbDsgcT0wLjgsICovKjsgcT0wLjAxJyxcbiAgICBqc29uOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9qYXZhc2NyaXB0LCAqLyo7IHE9MC4wMScsXG59O1xuXG4vKipcbiAqIEBlbiBTZXR1cCBgaGVhZGVyc2AgZnJvbSBvcHRpb25zIHBhcmFtZXRlci5cbiAqIEBqYSDjgqrjg5fjgrfjg6fjg7PjgYvjgokgYGhlYWRlcnNgIOOCkuioreWumlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIZWFkZXJzKG9wdGlvbnM6IEFqYXhIZWFkZXJPcHRpb25zKTogSGVhZGVycyB7XG4gICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgY29uc3QgeyBtZXRob2QsIGNvbnRlbnRUeXBlLCBkYXRhVHlwZSwgbW9kZSwgYm9keSwgdXNlcm5hbWUsIHBhc3N3b3JkIH0gPSBvcHRpb25zO1xuXG4gICAgLy8gQ29udGVudC1UeXBlXG4gICAgaWYgKCdQT1NUJyA9PT0gbWV0aG9kIHx8ICdQVVQnID09PSBtZXRob2QgfHwgJ1BBVENIJyA9PT0gbWV0aG9kKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIGZldGNoKCkg44Gu5aC05ZCILCBGb3JtRGF0YSDjgpLoh6rli5Xop6Pph4jjgZnjgovjgZ/jgoEsIOaMh+WumuOBjOOBguOCi+WgtOWQiOOBr+WJiumZpFxuICAgICAgICAgKiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTE5Mjg0MS9mZXRjaC1wb3N0LXdpdGgtbXVsdGlwYXJ0LWZvcm0tZGF0YVxuICAgICAgICAgKiBodHRwczovL211ZmZpbm1hbi5pby91cGxvYWRpbmctZmlsZXMtdXNpbmctZmV0Y2gtbXVsdGlwYXJ0LWZvcm0tZGF0YS9cbiAgICAgICAgICovXG4gICAgICAgIGlmIChoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgJiYgYm9keSBpbnN0YW5jZW9mIEZvcm1EYXRhKSB7XG4gICAgICAgICAgICBoZWFkZXJzLmRlbGV0ZSgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSkge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY29udGVudFR5cGUgJiYgJ2pzb24nID09PSBkYXRhVHlwZSBhcyBBamF4RGF0YVR5cGVzKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgY29udGVudFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWNjZXB0XG4gICAgaWYgKCFoZWFkZXJzLmdldCgnQWNjZXB0JykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0FjY2VwdCcsIF9hY2NlcHRIZWFkZXJNYXBbZGF0YVR5cGUgYXMgQWpheERhdGFUeXBlc10gfHwgJyovKicpO1xuICAgIH1cblxuICAgIC8vIFgtUmVxdWVzdGVkLVdpdGhcbiAgICBpZiAoJ2NvcnMnICE9PSBtb2RlICYmICFoZWFkZXJzLmdldCgnWC1SZXF1ZXN0ZWQtV2l0aCcpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdYLVJlcXVlc3RlZC1XaXRoJywgJ1hNTEh0dHBSZXF1ZXN0Jyk7XG4gICAgfVxuXG4gICAgLy8gQmFzaWMgQXV0aG9yaXphdGlvblxuICAgIGlmIChudWxsICE9IHVzZXJuYW1lICYmICFoZWFkZXJzLmdldCgnQXV0aG9yaXphdGlvbicpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdBdXRob3JpemF0aW9uJywgYEJhc2ljICR7QmFzZTY0LmVuY29kZShgJHt1c2VybmFtZX06JHtwYXNzd29yZCB8fCAnJ31gKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGVhZGVycztcbn1cblxuLyoqXG4gKiBAZW4gUGVyZm9ybSBhbiBhc3luY2hyb25vdXMgSFRUUCAoQWpheCkgcmVxdWVzdC5cbiAqIEBqYSBIVFRQIChBamF4KeODquOCr+OCqOOCueODiOOBrumAgeS/oVxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIEFqYXggcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOioreWumlxuICovXG5hc3luYyBmdW5jdGlvbiBhamF4PFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzIHwgb2JqZWN0ID0gJ3Jlc3BvbnNlJz4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4T3B0aW9uczxUPik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgYWJvcnQgPSAoKTogdm9pZCA9PiBjb250cm9sbGVyLmFib3J0KCk7XG5cbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAncmVzcG9uc2UnLFxuICAgICAgICB0aW1lb3V0OiBzZXR0aW5ncy50aW1lb3V0LFxuICAgIH0sIG9wdGlvbnMsIHtcbiAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCwgLy8gZm9yY2Ugb3ZlcnJpZGVcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgY2FuY2VsOiBvcmlnaW5hbFRva2VuLCB0aW1lb3V0IH0gPSBvcHRzO1xuXG4gICAgLy8gY2FuY2VsbGF0aW9uXG4gICAgaWYgKG9yaWdpbmFsVG9rZW4pIHtcbiAgICAgICAgaWYgKG9yaWdpbmFsVG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICB0aHJvdyBvcmlnaW5hbFRva2VuLnJlYXNvbjtcbiAgICAgICAgfVxuICAgICAgICBvcmlnaW5hbFRva2VuLnJlZ2lzdGVyKGFib3J0KTtcbiAgICB9XG5cbiAgICBjb25zdCBzb3VyY2UgPSBDYW5jZWxUb2tlbi5zb3VyY2Uob3JpZ2luYWxUb2tlbiBhcyBDYW5jZWxUb2tlbik7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gc291cmNlO1xuICAgIHRva2VuLnJlZ2lzdGVyKGFib3J0KTtcblxuICAgIC8vIHRpbWVvdXRcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNvdXJjZS5jYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1RJTUVPVVQsICdyZXF1ZXN0IHRpbWVvdXQnKSksIHRpbWVvdXQpO1xuICAgIH1cblxuICAgIC8vIG5vcm1hbGl6ZVxuICAgIG9wdHMubWV0aG9kID0gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIGhlYWRlclxuICAgIG9wdHMuaGVhZGVycyA9IHNldHVwSGVhZGVycyhvcHRzKTtcblxuICAgIC8vIHBhcnNlIHBhcmFtXG4gICAgY29uc3QgeyBtZXRob2QsIGRhdGEsIGRhdGFUeXBlIH0gPSBvcHRzO1xuICAgIGlmIChudWxsICE9IGRhdGEpIHtcbiAgICAgICAgaWYgKCgnR0VUJyA9PT0gbWV0aG9kIHx8ICdIRUFEJyA9PT0gbWV0aG9kKSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IG9wdHMuYm9keSkge1xuICAgICAgICAgICAgb3B0cy5ib2R5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0b0FqYXhQYXJhbXMoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGZldGNoKHVybCwgb3B0cyksIHRva2VuKTtcbiAgICBpZiAoJ3Jlc3BvbnNlJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIEFqYXhSZXN1bHQ8VD47XG4gICAgfSBlbHNlIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCByZXNwb25zZS5zdGF0dXNUZXh0LCByZXNwb25zZSk7XG4gICAgfSBlbHNlIGlmICgnc3RyZWFtJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRvQWpheERhdGFTdHJlYW0oXG4gICAgICAgICAgICByZXNwb25zZS5ib2R5IGFzIFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LFxuICAgICAgICAgICAgTnVtYmVyKHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LWxlbmd0aCcpKSxcbiAgICAgICAgKSBhcyBBamF4UmVzdWx0PFQ+O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1hc3NlcnRpb25cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXNwb25zZVtkYXRhVHlwZSBhcyBFeGNsdWRlPEFqYXhEYXRhVHlwZXMsICdyZXNwb25zZScgfCAnc3RyZWFtJz5dKCksIHRva2VuKTtcbiAgICB9XG59XG5cbmFqYXguc2V0dGluZ3MgPSBzZXR0aW5ncztcblxuZXhwb3J0IHsgYWpheCB9O1xuIiwiaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlcXVlc3RPcHRpb25zLFxuICAgIEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zLFxuICAgIEFqYXhSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBhamF4LCBzZXR1cEhlYWRlcnMgfSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0IHsgdG9RdWVyeVN0cmluZ3MgfSBmcm9tICcuL3BhcmFtcyc7XG5pbXBvcnQgeyBYTUxIdHRwUmVxdWVzdCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGU/OiBBamF4RGF0YVR5cGVzKTogQWpheERhdGFUeXBlcyB7XG4gICAgcmV0dXJuIGRhdGFUeXBlIHx8ICdqc29uJztcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgYvjgonov5TjgZXjgozjgovmnJ/lvoXjgZnjgovjg4fjg7zjgr/jga7lnovjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0PFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzIHwgb2JqZWN0ID0gJ2pzb24nPihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicsXG4gICAgb3B0aW9ucz86IEFqYXhSZXF1ZXN0T3B0aW9uc1xuKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgcmV0dXJuIGFqYXgodXJsLCB7IC4uLm9wdGlvbnMsIG1ldGhvZDogJ0dFVCcsIGRhdGEsIGRhdGFUeXBlOiBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSkgfSBhcyBBamF4T3B0aW9uczxUPik7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIHRleHQgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCDjg4bjgq3jgrnjg4jjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHQodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDwndGV4dCc+PiB7XG4gICAgcmV0dXJuIGdldCh1cmwsIHVuZGVmaW5lZCwgJ3RleHQnLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgSlNPTiByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIEpTT04g44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc29uPFQgZXh0ZW5kcyAnanNvbicgfCBvYmplY3QgPSAnanNvbic+KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICByZXR1cm4gZ2V0PFQ+KHVybCwgdW5kZWZpbmVkLCAoJ2pzb24nIGFzIFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzID8gVCA6ICdqc29uJyksIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBgR0VUYCBCbG9iIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAgQmxvYiDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2IodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDwnYmxvYic+PiB7XG4gICAgcmV0dXJuIGdldCh1cmwsIHVuZGVmaW5lZCwgJ2Jsb2InLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gYFBPU1RgIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYFBPU1RgIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgVGhlIHR5cGUgb2YgZGF0YSB0aGF0IHlvdSdyZSBleHBlY3RpbmcgYmFjayBmcm9tIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YTogUGxhaW5PYmplY3QsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicsXG4gICAgb3B0aW9ucz86IEFqYXhSZXF1ZXN0T3B0aW9uc1xuKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgcmV0dXJuIGFqYXgodXJsLCB7IC4uLm9wdGlvbnMsIG1ldGhvZDogJ1BPU1QnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufVxuXG4vKipcbiAqIEBlbiBTeW5jaHJvbm91cyBgR0VUYCByZXF1ZXN0IGZvciByZXNvdXJjZSBhY2Nlc3MuIDxicj5cbiAqICAgICBNYW55IGJyb3dzZXJzIGhhdmUgZGVwcmVjYXRlZCBzeW5jaHJvbm91cyBYSFIgc3VwcG9ydCBvbiB0aGUgbWFpbiB0aHJlYWQgZW50aXJlbHkuXG4gKiBAamEg44Oq44K944O844K55Y+W5b6X44Gu44Gf44KB44GuIOWQjOacnyBgR0VUYCDjg6rjgq/jgqjjgrnjg4guIDxicj5cbiAqICAgICDlpJrjgY/jga7jg5bjg6njgqbjgrbjgafjga/jg6HjgqTjg7Pjgrnjg6zjg4Pjg4njgavjgYrjgZHjgovlkIzmnJ/nmoTjgaogWEhSIOOBruWvvuW/nOOCkuWFqOmdoueahOOBq+mdnuaOqOWlqOOBqOOBl+OBpuOBhOOCi+OBruOBp+epjealteS9v+eUqOOBr+mBv+OBkeOCi+OBk+OBqC5cbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgVGhlIHR5cGUgb2YgZGF0YSB0aGF0IHlvdSdyZSBleHBlY3RpbmcgYmFjayBmcm9tIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvdXJjZTxUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBkYXRhVHlwZT86IFQgZXh0ZW5kcyAndGV4dCcgfCAnanNvbicgPyBUIDogJ2pzb24nLFxuICAgIGRhdGE/OiBQbGFpbk9iamVjdCxcbik6IEFqYXhSZXN1bHQ8VD4ge1xuICAgIGNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgaWYgKG51bGwgIT0gZGF0YSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhkYXRhKX1gO1xuICAgIH1cblxuICAgIC8vIHN5bmNocm9ub3VzXG4gICAgeGhyLm9wZW4oJ0dFVCcsIHVybCwgZmFsc2UpO1xuXG4gICAgY29uc3QgdHlwZSA9IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKTtcbiAgICBjb25zdCBoZWFkZXJzID0gc2V0dXBIZWFkZXJzKHsgbWV0aG9kOiAnR0VUJywgZGF0YVR5cGU6IHR5cGUgfSk7XG4gICAgaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgeGhyLnNlbmQobnVsbCk7XG4gICAgaWYgKCEoMjAwIDw9IHhoci5zdGF0dXMgJiYgeGhyLnN0YXR1cyA8IDMwMCkpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCB4aHIuc3RhdHVzVGV4dCwgeGhyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJ2pzb24nID09PSB0eXBlID8gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2UpIDogeGhyLnJlc3BvbnNlO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUE7OztBQUdHO0FBRUgsQ0FBQSxZQUFxQjtBQU1qQjs7O0FBR0c7QUFDSCxJQUFBLElBSUMsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7QUFKRCxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxjQUE4QyxDQUFBO1FBQzlDLFdBQXNCLENBQUEsV0FBQSxDQUFBLHFCQUFBLENBQUEsR0FBQSxXQUFBLENBQUEs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