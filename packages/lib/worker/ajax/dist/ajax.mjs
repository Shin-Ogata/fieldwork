/*!
 * @cdp/ajax 0.9.15
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
    @typescript-eslint/restrict-plus-operands,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJzc3IudHMiLCJwYXJhbXMudHMiLCJzdHJlYW0udHMiLCJzZXR0aW5ncy50cyIsImNvcmUudHMiLCJyZXF1ZXN0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQUpBWCA9IENEUF9LTk9XTl9NT0RVTEUuQUpBWCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9BSkFYX1JFU1BPTlNFID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDEsICduZXR3b3JrIGVycm9yLicpLFxuICAgICAgICBFUlJPUl9BSkFYX1RJTUVPVVQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDIsICdyZXF1ZXN0IHRpbWVvdXQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZvcm1EYXRhICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5Gb3JtRGF0YSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBIZWFkZXJzICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuSGVhZGVycyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBBYm9ydENvbnRyb2xsZXIgPSBzYWZlKGdsb2JhbFRoaXMuQWJvcnRDb250cm9sbGVyKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTFNlYXJjaFBhcmFtcyA9IHNhZmUoZ2xvYmFsVGhpcy5VUkxTZWFyY2hQYXJhbXMpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgWE1MSHR0cFJlcXVlc3QgID0gc2FmZShnbG9iYWxUaGlzLlhNTEh0dHBSZXF1ZXN0KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGZldGNoICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5mZXRjaCk7XG4iLCJpbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNOdW1lcmljLFxuICAgIGFzc2lnblZhbHVlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgVVJMU2VhcmNoUGFyYW1zIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBzdHJpbmcgdmFsdWUgKi9cbmNvbnN0IGVuc3VyZVBhcmFtVmFsdWUgPSAocHJvcDogdW5rbm93bik6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBpc0Z1bmN0aW9uKHByb3ApID8gcHJvcCgpIDogcHJvcDtcbiAgICByZXR1cm4gdW5kZWZpbmVkICE9PSB2YWx1ZSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBxdWVyeSBzdHJpbmdzLlxuICogQGphIGBQbGFpbk9iamVjdGAg44KS44Kv44Ko44Oq44K544OI44Oq44Oz44Kw44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCB0b1F1ZXJ5U3RyaW5ncyA9IChkYXRhOiBQbGFpbk9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgcGFyYW1zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHBhcmFtcy5wdXNoKGAke2VuY29kZVVSSUNvbXBvbmVudChrZXkpfT0ke2VuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSl9YCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcy5qb2luKCcmJyk7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gQWpheCBwYXJhbWV0ZXJzIG9iamVjdC5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkiBBamF4IOODkeODqeODoeODvOOCv+OCquODluOCuOOCp+OCr+ODiOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgdG9BamF4UGFyYW1zID0gKGRhdGE6IFBsYWluT2JqZWN0KTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9PiB7XG4gICAgY29uc3QgcGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbnN1cmVQYXJhbVZhbHVlKGRhdGFba2V5XSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgYXNzaWduVmFsdWUocGFyYW1zLCBrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBVUkwgcGFyYW1ldGVycyB0byBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSBVUkwg44OR44Op44Oh44O844K/44KSIHByaW1pdGl2ZSDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IGNvbnZlcnRVcmxQYXJhbVR5cGUgPSAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsID0+IHtcbiAgICBpZiAoaXNOdW1lcmljKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gTnVtYmVyKHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICgnbnVsbCcgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQGVuIFBhcnNlIHVybCBxdWVyeSBHRVQgcGFyYW1ldGVycy5cbiAqIEBqYSBVUkzjgq/jgqjjg6rjga5HRVTjg5Hjg6njg6Hjg7zjgr/jgpLop6PmnpBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHVybCA9ICcvcGFnZS8/aWQ9NSZmb289YmFyJmJvb2w9dHJ1ZSc7XG4gKiBjb25zdCBxdWVyeSA9IHBhcnNlVXJsKCk7XG4gKiAvLyB7IGlkOiA1LCBmb286ICdiYXInLCBib29sOiB0cnVlIH1cbiAqIGBgYFxuICpcbiAqIEByZXR1cm5zIHsga2V5OiB2YWx1ZSB9IG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IHBhcnNlVXJsUXVlcnkgPSA8VCA9IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPj4odXJsOiBzdHJpbmcpOiBUID0+IHtcbiAgICBjb25zdCBxdWVyeSA9IHt9O1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXModXJsLmluY2x1ZGVzKCc/JykgPyB1cmwuc3BsaXQoJz8nKVsxXSA6IHVybCk7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgcGFyYW1zKSB7XG4gICAgICAgIHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChrZXkpXSA9IGNvbnZlcnRVcmxQYXJhbVR5cGUodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gcXVlcnkgYXMgVDtcbn07XG4iLCJpbXBvcnQgeyBLZXlzLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSwgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgdHlwZSB7IEFqYXhEYXRhU3RyZWFtRXZlbnQsIEFqYXhEYXRhU3RyZWFtIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBQcm94eUhhbmRsZXIgaGVscGVyICovXG5jb25zdCBfZXhlY0dldERlZmF1bHQgPSAodGFyZ2V0OiBhbnksIHByb3A6IHN0cmluZyB8IHN5bWJvbCk6IGFueSA9PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGlmIChwcm9wIGluIHRhcmdldCkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbih0YXJnZXRbcHJvcF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdLmJpbmQodGFyZ2V0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc3Vic2NyaWJhYmxlTWV0aG9kczogS2V5czxTdWJzY3JpYmFibGU+W10gPSBbXG4gICAgJ2hhc0xpc3RlbmVyJyxcbiAgICAnY2hhbm5lbHMnLFxuICAgICdvbicsXG4gICAgJ29mZicsXG4gICAgJ29uY2UnLFxuXTtcblxuZXhwb3J0IGNvbnN0IHRvQWpheERhdGFTdHJlYW0gPSAoc2VlZDogQmxvYiB8IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBsZW5ndGg/OiBudW1iZXIpOiBBamF4RGF0YVN0cmVhbSA9PiB7XG4gICAgbGV0IGxvYWRlZCA9IDA7XG4gICAgY29uc3QgW3N0cmVhbSwgdG90YWxdID0gKCgpID0+IHtcbiAgICAgICAgaWYgKHNlZWQgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQuc3RyZWFtKCksIHNlZWQuc2l6ZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQsIGxlbmd0aCAhPSBudWxsID8gTWF0aC50cnVuYyhsZW5ndGgpIDogTmFOXTtcbiAgICAgICAgfVxuICAgIH0pKCk7XG5cbiAgICBjb25zdCBfZXZlbnRTb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2U8QWpheERhdGFTdHJlYW1FdmVudD4oKTtcblxuICAgIGNvbnN0IF9wcm94eVJlYWRlckhhbmRsZXI6IFByb3h5SGFuZGxlcjxSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VWludDhBcnJheT4+ID0ge1xuICAgICAgICBnZXQ6ICh0YXJnZXQ6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxVaW50OEFycmF5PiwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAoJ3JlYWQnID09PSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHRhcmdldC5yZWFkKCk7XG4gICAgICAgICAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGRvbmUsIHZhbHVlOiBjaHVuayB9ID0gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICAgICAgY2h1bmsgJiYgKGxvYWRlZCArPSBjaHVuay5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBfZXZlbnRTb3VyY2UudHJpZ2dlcigncHJvZ3Jlc3MnLCBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXB1dGFibGU6ICFOdW1iZXIuaXNOYU4odG90YWwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2h1bmssXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9KSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiBwcm9taXNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2V4ZWNHZXREZWZhdWx0KHRhcmdldCwgcHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgUHJveHkoc3RyZWFtLCB7XG4gICAgICAgIGdldDogKHRhcmdldDogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4sIHByb3A6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCdnZXRSZWFkZXInID09PSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IG5ldyBQcm94eSh0YXJnZXQuZ2V0UmVhZGVyKCksIF9wcm94eVJlYWRlckhhbmRsZXIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgnbGVuZ3RoJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoX3N1YnNjcmliYWJsZU1ldGhvZHMuaW5jbHVkZXMocHJvcCBhcyBLZXlzPFN1YnNjcmliYWJsZT4pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICguLi5hcmdzOiB1bmtub3duW10pID0+IF9ldmVudFNvdXJjZVtwcm9wXSguLi5hcmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9leGVjR2V0RGVmYXVsdCh0YXJnZXQsIHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pIGFzIEFqYXhEYXRhU3RyZWFtO1xufTtcbiIsImltcG9ydCB7IGlzTnVtYmVyIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX3RpbWVvdXQ6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuZXhwb3J0IGNvbnN0IHNldHRpbmdzID0ge1xuICAgIGdldCB0aW1lb3V0KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfdGltZW91dDtcbiAgICB9LFxuICAgIHNldCB0aW1lb3V0KHZhbHVlOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICAgICAgX3RpbWVvdXQgPSAoaXNOdW1iZXIodmFsdWUpICYmIDAgPD0gdmFsdWUpID8gdmFsdWUgOiB1bmRlZmluZWQ7XG4gICAgfSxcbn07XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEJhc2U2NCB9IGZyb20gJ0BjZHAvYmluYXJ5JztcbmltcG9ydCB7XG4gICAgQWpheERhdGFUeXBlcyxcbiAgICBBamF4T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBGb3JtRGF0YSxcbiAgICBIZWFkZXJzLFxuICAgIEFib3J0Q29udHJvbGxlcixcbiAgICBVUkxTZWFyY2hQYXJhbXMsXG4gICAgZmV0Y2gsXG59IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzLCB0b0FqYXhQYXJhbXMgfSBmcm9tICcuL3BhcmFtcyc7XG5pbXBvcnQgeyB0b0FqYXhEYXRhU3RyZWFtIH0gZnJvbSAnLi9zdHJlYW0nO1xuaW1wb3J0IHsgc2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgQWpheEhlYWRlck9wdGlvbnMgPSBQaWNrPEFqYXhPcHRpb25zPEFqYXhEYXRhVHlwZXM+LCAnaGVhZGVycycgfCAnbWV0aG9kJyB8ICdjb250ZW50VHlwZScgfCAnZGF0YVR5cGUnIHwgJ21vZGUnIHwgJ2JvZHknIHwgJ3VzZXJuYW1lJyB8ICdwYXNzd29yZCc+O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfYWNjZXB0SGVhZGVyTWFwID0ge1xuICAgIHRleHQ6ICd0ZXh0L3BsYWluLCB0ZXh0L2h0bWwsIGFwcGxpY2F0aW9uL3htbDsgcT0wLjgsIHRleHQveG1sOyBxPTAuOCwgKi8qOyBxPTAuMDEnLFxuICAgIGpzb246ICdhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L2phdmFzY3JpcHQsICovKjsgcT0wLjAxJyxcbn07XG5cbi8qKlxuICogQGVuIFNldHVwIGBoZWFkZXJzYCBmcm9tIG9wdGlvbnMgcGFyYW1ldGVyLlxuICogQGphIOOCquODl+OCt+ODp+ODs+OBi+OCiSBgaGVhZGVyc2Ag44KS6Kit5a6aXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEhlYWRlcnMob3B0aW9uczogQWpheEhlYWRlck9wdGlvbnMpOiBIZWFkZXJzIHtcbiAgICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKTtcbiAgICBjb25zdCB7IG1ldGhvZCwgY29udGVudFR5cGUsIGRhdGFUeXBlLCBtb2RlLCBib2R5LCB1c2VybmFtZSwgcGFzc3dvcmQgfSA9IG9wdGlvbnM7XG5cbiAgICAvLyBDb250ZW50LVR5cGVcbiAgICBpZiAoJ1BPU1QnID09PSBtZXRob2QgfHwgJ1BVVCcgPT09IG1ldGhvZCB8fCAnUEFUQ0gnID09PSBtZXRob2QpIHtcbiAgICAgICAgLypcbiAgICAgICAgICogZmV0Y2goKSDjga7loLTlkIgsIEZvcm1EYXRhIOOCkuiHquWLleino+mHiOOBmeOCi+OBn+OCgSwg5oyH5a6a44GM44GC44KL5aC05ZCI44Gv5YmK6ZmkXG4gICAgICAgICAqIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1MTkyODQxL2ZldGNoLXBvc3Qtd2l0aC1tdWx0aXBhcnQtZm9ybS1kYXRhXG4gICAgICAgICAqIGh0dHBzOi8vbXVmZmlubWFuLmlvL3VwbG9hZGluZy1maWxlcy11c2luZy1mZXRjaC1tdWx0aXBhcnQtZm9ybS1kYXRhL1xuICAgICAgICAgKi9cbiAgICAgICAgaWYgKGhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSAmJiBib2R5IGluc3RhbmNlb2YgRm9ybURhdGEpIHtcbiAgICAgICAgICAgIGhlYWRlcnMuZGVsZXRlKCdDb250ZW50LVR5cGUnKTtcbiAgICAgICAgfSBlbHNlIGlmICghaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpKSB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBjb250ZW50VHlwZSAmJiAnanNvbicgPT09IGRhdGFUeXBlIGFzIEFqYXhEYXRhVHlwZXMpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCBjb250ZW50VHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBY2NlcHRcbiAgICBpZiAoIWhlYWRlcnMuZ2V0KCdBY2NlcHQnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQWNjZXB0JywgX2FjY2VwdEhlYWRlck1hcFtkYXRhVHlwZSBhcyBBamF4RGF0YVR5cGVzXSB8fCAnKi8qJyk7XG4gICAgfVxuXG4gICAgLy8gWC1SZXF1ZXN0ZWQtV2l0aFxuICAgIGlmICgnY29ycycgIT09IG1vZGUgJiYgIWhlYWRlcnMuZ2V0KCdYLVJlcXVlc3RlZC1XaXRoJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ1gtUmVxdWVzdGVkLVdpdGgnLCAnWE1MSHR0cFJlcXVlc3QnKTtcbiAgICB9XG5cbiAgICAvLyBCYXNpYyBBdXRob3JpemF0aW9uXG4gICAgaWYgKG51bGwgIT0gdXNlcm5hbWUgJiYgIWhlYWRlcnMuZ2V0KCdBdXRob3JpemF0aW9uJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmFzaWMgJHtCYXNlNjQuZW5jb2RlKGAke3VzZXJuYW1lfToke3Bhc3N3b3JkIHx8ICcnfWApfWApO1xuICAgIH1cblxuICAgIHJldHVybiBoZWFkZXJzO1xufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtIGFuIGFzeW5jaHJvbm91cyBIVFRQIChBamF4KSByZXF1ZXN0LlxuICogQGphIEhUVFAgKEFqYXgp44Oq44Kv44Ko44K544OI44Gu6YCB5L+hXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgQWpheCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFqYXg8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAncmVzcG9uc2UnPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhPcHRpb25zPFQ+KTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IGNvbnRyb2xsZXIuYWJvcnQoKTtcblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLnRpbWVvdXQsXG4gICAgfSwgb3B0aW9ucywge1xuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLCAvLyBmb3JjZSBvdmVycmlkZVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIHRpbWVvdXQgfSA9IG9wdHM7XG5cbiAgICAvLyBjYW5jZWxsYXRpb25cbiAgICBpZiAob3JpZ2luYWxUb2tlbikge1xuICAgICAgICBpZiAob3JpZ2luYWxUb2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgICAgICB9XG4gICAgICAgIG9yaWdpbmFsVG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuIGFzIENhbmNlbFRva2VuKTtcbiAgICBjb25zdCB7IHRva2VuIH0gPSBzb3VyY2U7XG4gICAgdG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuXG4gICAgLy8gdGltZW91dFxuICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc291cmNlLmNhbmNlbChtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfVElNRU9VVCwgJ3JlcXVlc3QgdGltZW91dCcpKSwgdGltZW91dCk7XG4gICAgfVxuXG4gICAgLy8gbm9ybWFsaXplXG4gICAgb3B0cy5tZXRob2QgPSBvcHRzLm1ldGhvZC50b1VwcGVyQ2FzZSgpO1xuXG4gICAgLy8gaGVhZGVyXG4gICAgb3B0cy5oZWFkZXJzID0gc2V0dXBIZWFkZXJzKG9wdHMpO1xuXG4gICAgLy8gcGFyc2UgcGFyYW1cbiAgICBjb25zdCB7IG1ldGhvZCwgZGF0YSwgZGF0YVR5cGUgfSA9IG9wdHM7XG4gICAgaWYgKG51bGwgIT0gZGF0YSkge1xuICAgICAgICBpZiAoKCdHRVQnID09PSBtZXRob2QgfHwgJ0hFQUQnID09PSBtZXRob2QpICYmICF1cmwuaW5jbHVkZXMoJz8nKSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhkYXRhKX1gO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gb3B0cy5ib2R5KSB7XG4gICAgICAgICAgICBvcHRzLmJvZHkgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHRvQWpheFBhcmFtcyhkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBleGVjdXRlXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUoZmV0Y2godXJsLCBvcHRzKSwgdG9rZW4pO1xuICAgIGlmICgncmVzcG9uc2UnID09PSBkYXRhVHlwZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2UgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UsIHJlc3BvbnNlLnN0YXR1c1RleHQsIHJlc3BvbnNlKTtcbiAgICB9IGVsc2UgaWYgKCdzdHJlYW0nID09PSBkYXRhVHlwZSkge1xuICAgICAgICByZXR1cm4gdG9BamF4RGF0YVN0cmVhbShcbiAgICAgICAgICAgIHJlc3BvbnNlLmJvZHkgYXMgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4sXG4gICAgICAgICAgICBOdW1iZXIocmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtbGVuZ3RoJykpLFxuICAgICAgICApIGFzIEFqYXhSZXN1bHQ8VD47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bm5lY2Vzc2FyeS10eXBlLWFzc2VydGlvblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlW2RhdGFUeXBlIGFzIEV4Y2x1ZGU8QWpheERhdGFUeXBlcywgJ3Jlc3BvbnNlJyB8ICdzdHJlYW0nPl0oKSwgdG9rZW4pO1xuICAgIH1cbn1cblxuYWpheC5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXG5leHBvcnQgeyBhamF4IH07XG4iLCJpbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgQWpheERhdGFUeXBlcyxcbiAgICBBamF4T3B0aW9ucyxcbiAgICBBamF4UmVxdWVzdE9wdGlvbnMsXG4gICAgQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGFqYXgsIHNldHVwSGVhZGVycyB9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQgeyB0b1F1ZXJ5U3RyaW5ncyB9IGZyb20gJy4vcGFyYW1zJztcbmltcG9ydCB7IFhNTEh0dHBSZXF1ZXN0IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZT86IEFqYXhEYXRhVHlwZXMpOiBBamF4RGF0YVR5cGVzIHtcbiAgICByZXR1cm4gZGF0YVR5cGUgfHwgJ2pzb24nO1xufVxuXG4vKipcbiAqIEBlbiBgR0VUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBi+OCiei/lOOBleOCjOOCi+acn+W+heOBmeOCi+ODh+ODvOOCv+OBruWei+OCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQ8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE/OiBQbGFpbk9iamVjdCxcbiAgICBkYXRhVHlwZT86IFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzID8gVCA6ICdqc29uJyxcbiAgICBvcHRpb25zPzogQWpheFJlcXVlc3RPcHRpb25zXG4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICByZXR1cm4gYWpheCh1cmwsIHsgLi4ub3B0aW9ucywgbWV0aG9kOiAnR0VUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgdGV4dCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIOODhuOCreOCueODiOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dCh1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PCd0ZXh0Jz4+IHtcbiAgICByZXR1cm4gZ2V0KHVybCwgdW5kZWZpbmVkLCAndGV4dCcsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBgR0VUYCBKU09OIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAgSlNPTiDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGpzb248VCBleHRlbmRzICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBnZXQ8VD4odXJsLCB1bmRlZmluZWQsICgnanNvbicgYXMgVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nKSwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIEJsb2IgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBCbG9iIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PCdibG9iJz4+IHtcbiAgICByZXR1cm4gZ2V0KHVybCwgdW5kZWZpbmVkLCAnYmxvYicsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBgUE9TVGAgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgUE9TVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBUaGUgdHlwZSBvZiBkYXRhIHRoYXQgeW91J3JlIGV4cGVjdGluZyBiYWNrIGZyb20gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0PFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzIHwgb2JqZWN0ID0gJ2pzb24nPihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBkYXRhOiBQbGFpbk9iamVjdCxcbiAgICBkYXRhVHlwZT86IFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzID8gVCA6ICdqc29uJyxcbiAgICBvcHRpb25zPzogQWpheFJlcXVlc3RPcHRpb25zXG4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICByZXR1cm4gYWpheCh1cmwsIHsgLi4ub3B0aW9ucywgbWV0aG9kOiAnUE9TVCcsIGRhdGEsIGRhdGFUeXBlOiBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSkgfSBhcyBBamF4T3B0aW9uczxUPik7XG59XG5cbi8qKlxuICogQGVuIFN5bmNocm9ub3VzIGBHRVRgIHJlcXVlc3QgZm9yIHJlc291cmNlIGFjY2Vzcy4gPGJyPlxuICogICAgIE1hbnkgYnJvd3NlcnMgaGF2ZSBkZXByZWNhdGVkIHN5bmNocm9ub3VzIFhIUiBzdXBwb3J0IG9uIHRoZSBtYWluIHRocmVhZCBlbnRpcmVseS5cbiAqIEBqYSDjg6rjgr3jg7zjgrnlj5blvpfjga7jgZ/jgoHjga4g5ZCM5pyfIGBHRVRgIOODquOCr+OCqOOCueODiC4gPGJyPlxuICogICAgIOWkmuOBj+OBruODluODqeOCpuOCtuOBp+OBr+ODoeOCpOODs+OCueODrOODg+ODieOBq+OBiuOBkeOCi+WQjOacn+eahOOBqiBYSFIg44Gu5a++5b+c44KS5YWo6Z2i55qE44Gr6Z2e5o6o5aWo44Go44GX44Gm44GE44KL44Gu44Gn56mN5qW15L2/55So44Gv6YG/44GR44KL44GT44GoLlxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBUaGUgdHlwZSBvZiBkYXRhIHRoYXQgeW91J3JlIGV4cGVjdGluZyBiYWNrIGZyb20gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc291cmNlPFQgZXh0ZW5kcyAndGV4dCcgfCAnanNvbicgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyA/IFQgOiAnanNvbicsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuKTogQWpheFJlc3VsdDxUPiB7XG4gICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICBpZiAobnVsbCAhPSBkYXRhICYmICF1cmwuaW5jbHVkZXMoJz8nKSkge1xuICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKGRhdGEpfWA7XG4gICAgfVxuXG4gICAgLy8gc3luY2hyb25vdXNcbiAgICB4aHIub3BlbignR0VUJywgdXJsLCBmYWxzZSk7XG5cbiAgICBjb25zdCB0eXBlID0gZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpO1xuICAgIGNvbnN0IGhlYWRlcnMgPSBzZXR1cEhlYWRlcnMoeyBtZXRob2Q6ICdHRVQnLCBkYXRhVHlwZTogdHlwZSB9KTtcbiAgICBoZWFkZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICB4aHIuc2VuZChudWxsKTtcbiAgICBpZiAoISgyMDAgPD0geGhyLnN0YXR1cyAmJiB4aHIuc3RhdHVzIDwgMzAwKSkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UsIHhoci5zdGF0dXNUZXh0LCB4aHIpO1xuICAgIH1cblxuICAgIHJldHVybiAnanNvbicgPT09IHR5cGUgPyBKU09OLnBhcnNlKHhoci5yZXNwb25zZSkgOiB4aHIucmVzcG9uc2U7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQTs7OztBQUlHO0FBRUgsQ0FBQSxZQUFxQjtBQU1qQjs7O0FBR0c7QUFDSCxJQUFBLElBSUMsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7QUFKRCxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxjQUE4QyxDQUFBO1FBQzlDLFdBQXNCLENBQUEsV0FBQSxDQUFBLHFCQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUEsR0FBQSxxQkFBQSxDQUFBO1FBQzFHLFdBQXNCLENBQUEsV0FBQSxDQUFBLG9CQUFBLENBQUEsR0FBQSxXQUFBLENB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