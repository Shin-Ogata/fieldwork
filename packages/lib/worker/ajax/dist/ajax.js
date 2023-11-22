/*!
 * @cdp/ajax 0.9.17
 *   ajax utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/promise'), require('@cdp/result'), require('@cdp/binary'), require('@cdp/core-utils'), require('@cdp/events')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/promise', '@cdp/result', '@cdp/binary', '@cdp/core-utils', '@cdp/events'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, promise, result, binary, coreUtils, events) { 'use strict';

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

    /** @internal */ const FormData = coreUtils.safe(globalThis.FormData);
    /** @internal */ const Headers = coreUtils.safe(globalThis.Headers);
    /** @internal */ const AbortController = coreUtils.safe(globalThis.AbortController);
    /** @internal */ const URLSearchParams = coreUtils.safe(globalThis.URLSearchParams);
    /** @internal */ const XMLHttpRequest = coreUtils.safe(globalThis.XMLHttpRequest);
    /** @internal */ const fetch = coreUtils.safe(globalThis.fetch);

    /** @internal ensure string value */
    const ensureParamValue = (prop) => {
        const value = coreUtils.isFunction(prop) ? prop() : prop;
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
                coreUtils.assignValue(params, key, value);
            }
        }
        return params;
    };
    /**
     * @en Convert URL parameters to primitive type.
     * @ja URL パラメータを primitive に変換
     */
    const convertUrlParamType = (value) => {
        if (coreUtils.isNumeric(value)) {
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
            if (coreUtils.isFunction(target[prop])) {
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
        const _eventSource = new events.EventSource();
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
            _timeout = (coreUtils.isNumber(value) && 0 <= value) ? value : undefined;
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
            headers.set('Authorization', `Basic ${binary.Base64.encode(`${username}:${password ?? ''}`)}`);
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
        const source = promise.CancelToken.source(originalToken);
        const { token } = source;
        token.register(abort);
        // timeout
        if (timeout) {
            setTimeout(() => source.cancel(result.makeResult(result.RESULT_CODE.ERROR_AJAX_TIMEOUT, 'request timeout')), timeout);
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
            throw result.makeResult(result.RESULT_CODE.ERROR_AJAX_RESPONSE, response.statusText, response);
        }
        else if ('stream' === dataType) {
            return toAjaxDataStream(response.body, Number(response.headers.get('content-length')));
        }
        else {
            return Promise.resolve(response[dataType](), token);
        }
    }
    ajax.settings = settings;

    /** @internal */
    function ensureDataType(dataType) {
        return dataType ?? 'json';
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
            throw result.makeResult(result.RESULT_CODE.ERROR_AJAX_RESPONSE, xhr.statusText, xhr);
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

    exports.ajax = ajax;
    exports.convertUrlParamType = convertUrlParamType;
    exports.parseUrlQuery = parseUrlQuery;
    exports.request = request;
    exports.setupHeaders = setupHeaders;
    exports.toAjaxDataStream = toAjaxDataStream;
    exports.toAjaxParams = toAjaxParams;
    exports.toQueryStrings = toQueryStrings;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBhcmFtcy50cyIsInN0cmVhbS50cyIsInNldHRpbmdzLnRzIiwiY29yZS50cyIsInJlcXVlc3QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEFKQVhfREVDTEFSRSAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgRm9ybURhdGEgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkZvcm1EYXRhKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEhlYWRlcnMgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5IZWFkZXJzKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEFib3J0Q29udHJvbGxlciA9IHNhZmUoZ2xvYmFsVGhpcy5BYm9ydENvbnRyb2xsZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVVJMU2VhcmNoUGFyYW1zID0gc2FmZShnbG9iYWxUaGlzLlVSTFNlYXJjaFBhcmFtcyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBYTUxIdHRwUmVxdWVzdCAgPSBzYWZlKGdsb2JhbFRoaXMuWE1MSHR0cFJlcXVlc3QpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZmV0Y2ggICAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmZldGNoKTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc051bWVyaWMsXG4gICAgYXNzaWduVmFsdWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBVUkxTZWFyY2hQYXJhbXMgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIHN0cmluZyB2YWx1ZSAqL1xuY29uc3QgZW5zdXJlUGFyYW1WYWx1ZSA9IChwcm9wOiB1bmtub3duKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGlzRnVuY3Rpb24ocHJvcCkgPyBwcm9wKCkgOiBwcm9wO1xuICAgIHJldHVybiB1bmRlZmluZWQgIT09IHZhbHVlID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBgUGxhaW5PYmplY3RgIHRvIHF1ZXJ5IHN0cmluZ3MuXG4gKiBAamEgYFBsYWluT2JqZWN0YCDjgpLjgq/jgqjjg6rjgrnjg4jjg6rjg7PjgrDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IHRvUXVlcnlTdHJpbmdzID0gKGRhdGE6IFBsYWluT2JqZWN0KTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBwYXJhbXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbnN1cmVQYXJhbVZhbHVlKGRhdGFba2V5XSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgcGFyYW1zLnB1c2goYCR7ZW5jb2RlVVJJQ29tcG9uZW50KGtleSl9PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKX1gKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zLmpvaW4oJyYnKTtcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBBamF4IHBhcmFtZXRlcnMgb2JqZWN0LlxuICogQGphIGBQbGFpbk9iamVjdGAg44KSIEFqYXgg44OR44Op44Oh44O844K/44Kq44OW44K444Kn44Kv44OI44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCB0b0FqYXhQYXJhbXMgPSAoZGF0YTogUGxhaW5PYmplY3QpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0+IHtcbiAgICBjb25zdCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZShwYXJhbXMsIGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IFVSTCBwYXJhbWV0ZXJzIHRvIHByaW1pdGl2ZSB0eXBlLlxuICogQGphIFVSTCDjg5Hjg6njg6Hjg7zjgr/jgpIgcHJpbWl0aXZlIOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgY29udmVydFVybFBhcmFtVHlwZSA9ICh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgPT4ge1xuICAgIGlmIChpc051bWVyaWModmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBOdW1iZXIodmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoJ3RydWUnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCdmYWxzZScgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBAZW4gUGFyc2UgdXJsIHF1ZXJ5IEdFVCBwYXJhbWV0ZXJzLlxuICogQGphIFVSTOOCr+OCqOODquOBrkdFVOODkeODqeODoeODvOOCv+OCkuino+aekFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdXJsID0gJy9wYWdlLz9pZD01JmZvbz1iYXImYm9vbD10cnVlJztcbiAqIGNvbnN0IHF1ZXJ5ID0gcGFyc2VVcmxRdWVyeSh1cmwpO1xuICogLy8geyBpZDogNSwgZm9vOiAnYmFyJywgYm9vbDogdHJ1ZSB9XG4gKiBgYGBcbiAqXG4gKiBAcmV0dXJucyB7IGtleTogdmFsdWUgfSBvYmplY3QuXG4gKi9cbmV4cG9ydCBjb25zdCBwYXJzZVVybFF1ZXJ5ID0gPFQgPSBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD4+KHVybDogc3RyaW5nKTogVCA9PiB7XG4gICAgY29uc3QgcXVlcnk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh1cmwuaW5jbHVkZXMoJz8nKSA/IHVybC5zcGxpdCgnPycpWzFdIDogdXJsKTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBwYXJhbXMpIHtcbiAgICAgICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGtleSldID0gY29udmVydFVybFBhcmFtVHlwZSh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBxdWVyeSBhcyBUO1xufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIEFjY2Vzc2libGUsXG4gICAgS2V5cyxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaWJhYmxlLCBFdmVudFNvdXJjZSB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB0eXBlIHsgQWpheERhdGFTdHJlYW1FdmVudCwgQWpheERhdGFTdHJlYW0gfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIFByb3h5SGFuZGxlciBoZWxwZXIgKi9cbmNvbnN0IF9leGVjR2V0RGVmYXVsdCA9ICh0YXJnZXQ6IGFueSwgcHJvcDogc3RyaW5nIHwgc3ltYm9sKTogYW55ID0+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgaWYgKHByb3AgaW4gdGFyZ2V0KSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHRhcmdldFtwcm9wXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF0uYmluZCh0YXJnZXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9zdWJzY3JpYmFibGVNZXRob2RzOiBLZXlzPFN1YnNjcmliYWJsZT5bXSA9IFtcbiAgICAnaGFzTGlzdGVuZXInLFxuICAgICdjaGFubmVscycsXG4gICAgJ29uJyxcbiAgICAnb2ZmJyxcbiAgICAnb25jZScsXG5dO1xuXG5leHBvcnQgY29uc3QgdG9BamF4RGF0YVN0cmVhbSA9IChzZWVkOiBCbG9iIHwgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4sIGxlbmd0aD86IG51bWJlcik6IEFqYXhEYXRhU3RyZWFtID0+IHtcbiAgICBsZXQgbG9hZGVkID0gMDtcbiAgICBjb25zdCBbc3RyZWFtLCB0b3RhbF0gPSAoKCkgPT4ge1xuICAgICAgICBpZiAoc2VlZCBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgICAgIHJldHVybiBbc2VlZC5zdHJlYW0oKSwgc2VlZC5zaXplXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbc2VlZCwgbGVuZ3RoICE9IG51bGwgPyBNYXRoLnRydW5jKGxlbmd0aCkgOiBOYU5dO1xuICAgICAgICB9XG4gICAgfSkoKTtcblxuICAgIGNvbnN0IF9ldmVudFNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZTxBamF4RGF0YVN0cmVhbUV2ZW50PigpIGFzIEFjY2Vzc2libGU8RXZlbnRTb3VyY2U8QWpheERhdGFTdHJlYW1FdmVudD4sIFVua25vd25GdW5jdGlvbj47XG5cbiAgICBjb25zdCBfcHJveHlSZWFkZXJIYW5kbGVyOiBQcm94eUhhbmRsZXI8UmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+PiA9IHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VWludDhBcnJheT4sIHByb3A6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCdyZWFkJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB0YXJnZXQucmVhZCgpO1xuICAgICAgICAgICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBkb25lLCB2YWx1ZTogY2h1bmsgfSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIGNodW5rICYmIChsb2FkZWQgKz0gY2h1bmsubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgX2V2ZW50U291cmNlLnRyaWdnZXIoJ3Byb2dyZXNzJywgT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wdXRhYmxlOiAhTnVtYmVyLmlzTmFOKHRvdGFsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNodW5rLFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gcHJvbWlzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9leGVjR2V0RGVmYXVsdCh0YXJnZXQsIHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IFByb3h5KHN0cmVhbSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQ6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICgnZ2V0UmVhZGVyJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiBuZXcgUHJveHkodGFyZ2V0LmdldFJlYWRlcigpLCBfcHJveHlSZWFkZXJIYW5kbGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2xlbmd0aCcgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zdWJzY3JpYmFibGVNZXRob2RzLmluY2x1ZGVzKHByb3AgYXMgS2V5czxTdWJzY3JpYmFibGU+KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoLi4uYXJnczogdW5rbm93bltdKSA9PiBfZXZlbnRTb3VyY2VbcHJvcF0oLi4uYXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfZXhlY0dldERlZmF1bHQodGFyZ2V0LCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KSBhcyBBamF4RGF0YVN0cmVhbTtcbn07XG4iLCJpbXBvcnQgeyBpc051bWJlciB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF90aW1lb3V0OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbmV4cG9ydCBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICBnZXQgdGltZW91dCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX3RpbWVvdXQ7XG4gICAgfSxcbiAgICBzZXQgdGltZW91dCh2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIF90aW1lb3V0ID0gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xuICAgIH0sXG59O1xuIiwiaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICdAY2RwL2JpbmFyeSc7XG5pbXBvcnQge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgRm9ybURhdGEsXG4gICAgSGVhZGVycyxcbiAgICBBYm9ydENvbnRyb2xsZXIsXG4gICAgVVJMU2VhcmNoUGFyYW1zLFxuICAgIGZldGNoLFxufSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyB0b1F1ZXJ5U3RyaW5ncywgdG9BamF4UGFyYW1zIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgdG9BamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IHNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIEFqYXhIZWFkZXJPcHRpb25zID0gUGljazxBamF4T3B0aW9uczxBamF4RGF0YVR5cGVzPiwgJ2hlYWRlcnMnIHwgJ21ldGhvZCcgfCAnY29udGVudFR5cGUnIHwgJ2RhdGFUeXBlJyB8ICdtb2RlJyB8ICdib2R5JyB8ICd1c2VybmFtZScgfCAncGFzc3dvcmQnPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FjY2VwdEhlYWRlck1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICB0ZXh0OiAndGV4dC9wbGFpbiwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWw7IHE9MC44LCB0ZXh0L3htbDsgcT0wLjgsICovKjsgcT0wLjAxJyxcbiAgICBqc29uOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9qYXZhc2NyaXB0LCAqLyo7IHE9MC4wMScsXG59O1xuXG4vKipcbiAqIEBlbiBTZXR1cCBgaGVhZGVyc2AgZnJvbSBvcHRpb25zIHBhcmFtZXRlci5cbiAqIEBqYSDjgqrjg5fjgrfjg6fjg7PjgYvjgokgYGhlYWRlcnNgIOOCkuioreWumlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIZWFkZXJzKG9wdGlvbnM6IEFqYXhIZWFkZXJPcHRpb25zKTogSGVhZGVycyB7XG4gICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgY29uc3QgeyBtZXRob2QsIGNvbnRlbnRUeXBlLCBkYXRhVHlwZSwgbW9kZSwgYm9keSwgdXNlcm5hbWUsIHBhc3N3b3JkIH0gPSBvcHRpb25zO1xuXG4gICAgLy8gQ29udGVudC1UeXBlXG4gICAgaWYgKCdQT1NUJyA9PT0gbWV0aG9kIHx8ICdQVVQnID09PSBtZXRob2QgfHwgJ1BBVENIJyA9PT0gbWV0aG9kKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIGZldGNoKCkg44Gu5aC05ZCILCBGb3JtRGF0YSDjgpLoh6rli5Xop6Pph4jjgZnjgovjgZ/jgoEsIOaMh+WumuOBjOOBguOCi+WgtOWQiOOBr+WJiumZpFxuICAgICAgICAgKiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTE5Mjg0MS9mZXRjaC1wb3N0LXdpdGgtbXVsdGlwYXJ0LWZvcm0tZGF0YVxuICAgICAgICAgKiBodHRwczovL211ZmZpbm1hbi5pby91cGxvYWRpbmctZmlsZXMtdXNpbmctZmV0Y2gtbXVsdGlwYXJ0LWZvcm0tZGF0YS9cbiAgICAgICAgICovXG4gICAgICAgIGlmIChoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgJiYgYm9keSBpbnN0YW5jZW9mIEZvcm1EYXRhKSB7XG4gICAgICAgICAgICBoZWFkZXJzLmRlbGV0ZSgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSkge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY29udGVudFR5cGUgJiYgJ2pzb24nID09PSBkYXRhVHlwZSEpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCBjb250ZW50VHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBY2NlcHRcbiAgICBpZiAoIWhlYWRlcnMuZ2V0KCdBY2NlcHQnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQWNjZXB0JywgX2FjY2VwdEhlYWRlck1hcFtkYXRhVHlwZSFdIHx8ICcqLyonKTtcbiAgICB9XG5cbiAgICAvLyBYLVJlcXVlc3RlZC1XaXRoXG4gICAgaWYgKCdjb3JzJyAhPT0gbW9kZSAmJiAhaGVhZGVycy5nZXQoJ1gtUmVxdWVzdGVkLVdpdGgnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnWC1SZXF1ZXN0ZWQtV2l0aCcsICdYTUxIdHRwUmVxdWVzdCcpO1xuICAgIH1cblxuICAgIC8vIEJhc2ljIEF1dGhvcml6YXRpb25cbiAgICBpZiAobnVsbCAhPSB1c2VybmFtZSAmJiAhaGVhZGVycy5nZXQoJ0F1dGhvcml6YXRpb24nKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQXV0aG9yaXphdGlvbicsIGBCYXNpYyAke0Jhc2U2NC5lbmNvZGUoYCR7dXNlcm5hbWV9OiR7cGFzc3dvcmQgPz8gJyd9YCl9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhlYWRlcnM7XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm0gYW4gYXN5bmNocm9ub3VzIEhUVFAgKEFqYXgpIHJlcXVlc3QuXG4gKiBAamEgSFRUUCAoQWpheCnjg6rjgq/jgqjjgrnjg4jjga7pgIHkv6FcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBBamF4IHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuYXN5bmMgZnVuY3Rpb24gYWpheDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdyZXNwb25zZSc+KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheE9wdGlvbnM8VD4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IGFib3J0ID0gKCk6IHZvaWQgPT4gY29udHJvbGxlci5hYm9ydCgpO1xuXG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ3Jlc3BvbnNlJyxcbiAgICAgICAgdGltZW91dDogc2V0dGluZ3MudGltZW91dCxcbiAgICB9LCBvcHRpb25zLCB7XG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsIC8vIGZvcmNlIG92ZXJyaWRlXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGNhbmNlbDogb3JpZ2luYWxUb2tlbiwgdGltZW91dCB9ID0gb3B0cztcblxuICAgIC8vIGNhbmNlbGxhdGlvblxuICAgIGlmIChvcmlnaW5hbFRva2VuKSB7XG4gICAgICAgIGlmIChvcmlnaW5hbFRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgdGhyb3cgb3JpZ2luYWxUb2tlbi5yZWFzb247XG4gICAgICAgIH1cbiAgICAgICAgb3JpZ2luYWxUb2tlbi5yZWdpc3RlcihhYm9ydCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlID0gQ2FuY2VsVG9rZW4uc291cmNlKG9yaWdpbmFsVG9rZW4hKTtcbiAgICBjb25zdCB7IHRva2VuIH0gPSBzb3VyY2U7XG4gICAgdG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuXG4gICAgLy8gdGltZW91dFxuICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc291cmNlLmNhbmNlbChtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfVElNRU9VVCwgJ3JlcXVlc3QgdGltZW91dCcpKSwgdGltZW91dCk7XG4gICAgfVxuXG4gICAgLy8gbm9ybWFsaXplXG4gICAgb3B0cy5tZXRob2QgPSBvcHRzLm1ldGhvZC50b1VwcGVyQ2FzZSgpO1xuXG4gICAgLy8gaGVhZGVyXG4gICAgb3B0cy5oZWFkZXJzID0gc2V0dXBIZWFkZXJzKG9wdHMpO1xuXG4gICAgLy8gcGFyc2UgcGFyYW1cbiAgICBjb25zdCB7IG1ldGhvZCwgZGF0YSwgZGF0YVR5cGUgfSA9IG9wdHM7XG4gICAgaWYgKG51bGwgIT0gZGF0YSkge1xuICAgICAgICBpZiAoKCdHRVQnID09PSBtZXRob2QgfHwgJ0hFQUQnID09PSBtZXRob2QpICYmICF1cmwuaW5jbHVkZXMoJz8nKSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhkYXRhKX1gO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gb3B0cy5ib2R5KSB7XG4gICAgICAgICAgICBvcHRzLmJvZHkgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHRvQWpheFBhcmFtcyhkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBleGVjdXRlXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUoZmV0Y2godXJsLCBvcHRzKSwgdG9rZW4pO1xuICAgIGlmICgncmVzcG9uc2UnID09PSBkYXRhVHlwZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2UgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UsIHJlc3BvbnNlLnN0YXR1c1RleHQsIHJlc3BvbnNlKTtcbiAgICB9IGVsc2UgaWYgKCdzdHJlYW0nID09PSBkYXRhVHlwZSkge1xuICAgICAgICByZXR1cm4gdG9BamF4RGF0YVN0cmVhbShcbiAgICAgICAgICAgIHJlc3BvbnNlLmJvZHkhLFxuICAgICAgICAgICAgTnVtYmVyKHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LWxlbmd0aCcpKSxcbiAgICAgICAgKSBhcyBBamF4UmVzdWx0PFQ+O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2VbZGF0YVR5cGUgYXMgRXhjbHVkZTxBamF4RGF0YVR5cGVzLCAncmVzcG9uc2UnIHwgJ3N0cmVhbSc+XSgpLCB0b2tlbik7XG4gICAgfVxufVxuXG5hamF4LnNldHRpbmdzID0gc2V0dGluZ3M7XG5cbmV4cG9ydCB7IGFqYXggfTtcbiIsImltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXF1ZXN0T3B0aW9ucyxcbiAgICBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgYWpheCwgc2V0dXBIZWFkZXJzIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgWE1MSHR0cFJlcXVlc3QgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlPzogQWpheERhdGFUeXBlcyk6IEFqYXhEYXRhVHlwZXMge1xuICAgIHJldHVybiBkYXRhVHlwZSA/PyAnanNvbic7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844GL44KJ6L+U44GV44KM44KL5pyf5b6F44GZ44KL44OH44O844K/44Gu5Z6L44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdHRVQnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufVxuXG4vKipcbiAqIEBlbiBgR0VUYCB0ZXh0IHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44OG44Kt44K544OI44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J3RleHQnPj4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICd0ZXh0Jywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIEpTT04gcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBKU09OIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24ganNvbjxUIGV4dGVuZHMgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgcmV0dXJuIGdldDxUPih1cmwsIHVuZGVmaW5lZCwgKCdqc29uJyBhcyBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicpLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgQmxvYiByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIEJsb2Ig44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J2Jsb2InPj4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICdibG9iJywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBQT1NUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBQT1NUYCDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE6IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdQT1NUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn1cblxuLyoqXG4gKiBAZW4gU3luY2hyb25vdXMgYEdFVGAgcmVxdWVzdCBmb3IgcmVzb3VyY2UgYWNjZXNzLiA8YnI+XG4gKiAgICAgTWFueSBicm93c2VycyBoYXZlIGRlcHJlY2F0ZWQgc3luY2hyb25vdXMgWEhSIHN1cHBvcnQgb24gdGhlIG1haW4gdGhyZWFkIGVudGlyZWx5LlxuICogQGphIOODquOCveODvOOCueWPluW+l+OBruOBn+OCgeOBriDlkIzmnJ8gYEdFVGAg44Oq44Kv44Ko44K544OILiA8YnI+XG4gKiAgICAg5aSa44GP44Gu44OW44Op44Km44K244Gn44Gv44Oh44Kk44Oz44K544Os44OD44OJ44Gr44GK44GR44KL5ZCM5pyf55qE44GqIFhIUiDjga7lr77lv5zjgpLlhajpnaLnmoTjgavpnZ7mjqjlpajjgajjgZfjgabjgYTjgovjga7jgafnqY3mpbXkvb/nlKjjga/pgb/jgZHjgovjgZPjgaguXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb3VyY2U8VCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nID8gVCA6ICdqc29uJyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4pOiBBamF4UmVzdWx0PFQ+IHtcbiAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChudWxsICE9IGRhdGEgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICB9XG5cbiAgICAvLyBzeW5jaHJvbm91c1xuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcblxuICAgIGNvbnN0IHR5cGUgPSBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSk7XG4gICAgY29uc3QgaGVhZGVycyA9IHNldHVwSGVhZGVycyh7IG1ldGhvZDogJ0dFVCcsIGRhdGFUeXBlOiB0eXBlIH0pO1xuICAgIGhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHhoci5zZW5kKG51bGwpO1xuICAgIGlmICghKDIwMCA8PSB4aHIuc3RhdHVzICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgeGhyLnN0YXR1c1RleHQsIHhocik7XG4gICAgfVxuXG4gICAgcmV0dXJuICdqc29uJyA9PT0gdHlwZSA/IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKSA6IHhoci5yZXNwb25zZTtcbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsImFzc2lnblZhbHVlIiwiaXNOdW1lcmljIiwiRXZlbnRTb3VyY2UiLCJpc051bWJlciIsIkJhc2U2NCIsIkNhbmNlbFRva2VuIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFHRztJQUVILENBQUEsWUFBcUI7SUFNakI7OztJQUdHO0lBQ0gsSUFBQSxJQUlDLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQSxDQUFBO0lBSkQsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsY0FBOEMsQ0FBQTtZQUM5QyxXQUFzQixDQUFBLFdBQUEsQ0FBQSxxQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsOEJBQXVCLENBQUMsRUFBRSxn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