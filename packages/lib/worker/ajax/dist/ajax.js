/*!
 * @cdp/ajax 0.9.15
 *   ajax utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/promise'), require('@cdp/result'), require('@cdp/binary'), require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/promise', '@cdp/result', '@cdp/binary', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, promise, result, binary, coreUtils) { 'use strict';

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
            headers.set('Authorization', `Basic ${binary.Base64.encode(`${username}:${password || ''}`)}`);
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
            const length = Number(response.headers.get('content-length'));
            const stream = response.body;
            stream['length'] = length;
            return stream;
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
    exports.toAjaxParams = toAjaxParams;
    exports.toQueryStrings = toQueryStrings;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBhcmFtcy50cyIsInNldHRpbmdzLnRzIiwiY29yZS50cyIsInJlcXVlc3QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEFKQVhfREVDTEFSRSAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgRm9ybURhdGEgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkZvcm1EYXRhKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEhlYWRlcnMgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5IZWFkZXJzKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEFib3J0Q29udHJvbGxlciA9IHNhZmUoZ2xvYmFsVGhpcy5BYm9ydENvbnRyb2xsZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVVJMU2VhcmNoUGFyYW1zID0gc2FmZShnbG9iYWxUaGlzLlVSTFNlYXJjaFBhcmFtcyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBYTUxIdHRwUmVxdWVzdCAgPSBzYWZlKGdsb2JhbFRoaXMuWE1MSHR0cFJlcXVlc3QpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZmV0Y2ggICAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmZldGNoKTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc051bWVyaWMsXG4gICAgYXNzaWduVmFsdWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBVUkxTZWFyY2hQYXJhbXMgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIHN0cmluZyB2YWx1ZSAqL1xuY29uc3QgZW5zdXJlUGFyYW1WYWx1ZSA9IChwcm9wOiB1bmtub3duKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGlzRnVuY3Rpb24ocHJvcCkgPyBwcm9wKCkgOiBwcm9wO1xuICAgIHJldHVybiB1bmRlZmluZWQgIT09IHZhbHVlID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBgUGxhaW5PYmplY3RgIHRvIHF1ZXJ5IHN0cmluZ3MuXG4gKiBAamEgYFBsYWluT2JqZWN0YCDjgpLjgq/jgqjjg6rjgrnjg4jjg6rjg7PjgrDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IHRvUXVlcnlTdHJpbmdzID0gKGRhdGE6IFBsYWluT2JqZWN0KTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBwYXJhbXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbnN1cmVQYXJhbVZhbHVlKGRhdGFba2V5XSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgcGFyYW1zLnB1c2goYCR7ZW5jb2RlVVJJQ29tcG9uZW50KGtleSl9PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKX1gKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zLmpvaW4oJyYnKTtcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBBamF4IHBhcmFtZXRlcnMgb2JqZWN0LlxuICogQGphIGBQbGFpbk9iamVjdGAg44KSIEFqYXgg44OR44Op44Oh44O844K/44Kq44OW44K444Kn44Kv44OI44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCB0b0FqYXhQYXJhbXMgPSAoZGF0YTogUGxhaW5PYmplY3QpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0+IHtcbiAgICBjb25zdCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZShwYXJhbXMsIGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IFVSTCBwYXJhbWV0ZXJzIHRvIHByaW1pdGl2ZSB0eXBlLlxuICogQGphIFVSTCDjg5Hjg6njg6Hjg7zjgr/jgpIgcHJpbWl0aXZlIOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgY29udmVydFVybFBhcmFtVHlwZSA9ICh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgPT4ge1xuICAgIGlmIChpc051bWVyaWModmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBOdW1iZXIodmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoJ3RydWUnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCdmYWxzZScgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBAZW4gUGFyc2UgdXJsIHF1ZXJ5IEdFVCBwYXJhbWV0ZXJzLlxuICogQGphIFVSTOOCr+OCqOODquOBrkdFVOODkeODqeODoeODvOOCv+OCkuino+aekFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdXJsID0gJy9wYWdlLz9pZD01JmZvbz1iYXImYm9vbD10cnVlJztcbiAqIGNvbnN0IHF1ZXJ5ID0gcGFyc2VVcmwoKTtcbiAqIC8vIHsgaWQ6IDUsIGZvbzogJ2JhcicsIGJvb2w6IHRydWUgfVxuICogYGBgXG4gKlxuICogQHJldHVybnMgeyBrZXk6IHZhbHVlIH0gb2JqZWN0LlxuICovXG5leHBvcnQgY29uc3QgcGFyc2VVcmxRdWVyeSA9IDxUID0gUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+Pih1cmw6IHN0cmluZyk6IFQgPT4ge1xuICAgIGNvbnN0IHF1ZXJ5ID0ge307XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh1cmwuaW5jbHVkZXMoJz8nKSA/IHVybC5zcGxpdCgnPycpWzFdIDogdXJsKTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBwYXJhbXMpIHtcbiAgICAgICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGtleSldID0gY29udmVydFVybFBhcmFtVHlwZSh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBxdWVyeSBhcyBUO1xufTtcbiIsImltcG9ydCB7IGlzTnVtYmVyIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX3RpbWVvdXQ6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuZXhwb3J0IGNvbnN0IHNldHRpbmdzID0ge1xuICAgIGdldCB0aW1lb3V0KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfdGltZW91dDtcbiAgICB9LFxuICAgIHNldCB0aW1lb3V0KHZhbHVlOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICAgICAgX3RpbWVvdXQgPSAoaXNOdW1iZXIodmFsdWUpICYmIDAgPD0gdmFsdWUpID8gdmFsdWUgOiB1bmRlZmluZWQ7XG4gICAgfSxcbn07XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEJhc2U2NCB9IGZyb20gJ0BjZHAvYmluYXJ5JztcbmltcG9ydCB7XG4gICAgQWpheERhdGFUeXBlcyxcbiAgICBBamF4T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBGb3JtRGF0YSxcbiAgICBIZWFkZXJzLFxuICAgIEFib3J0Q29udHJvbGxlcixcbiAgICBVUkxTZWFyY2hQYXJhbXMsXG4gICAgZmV0Y2gsXG59IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzLCB0b0FqYXhQYXJhbXMgfSBmcm9tICcuL3BhcmFtcyc7XG5pbXBvcnQgeyBzZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBBamF4SGVhZGVyT3B0aW9ucyA9IFBpY2s8QWpheE9wdGlvbnM8QWpheERhdGFUeXBlcz4sICdoZWFkZXJzJyB8ICdtZXRob2QnIHwgJ2NvbnRlbnRUeXBlJyB8ICdkYXRhVHlwZScgfCAnbW9kZScgfCAnYm9keScgfCAndXNlcm5hbWUnIHwgJ3Bhc3N3b3JkJz47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9hY2NlcHRIZWFkZXJNYXAgPSB7XG4gICAgdGV4dDogJ3RleHQvcGxhaW4sIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sOyBxPTAuOCwgdGV4dC94bWw7IHE9MC44LCAqLyo7IHE9MC4wMScsXG4gICAganNvbjogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdCwgKi8qOyBxPTAuMDEnLFxufTtcblxuLyoqXG4gKiBAZW4gU2V0dXAgYGhlYWRlcnNgIGZyb20gb3B0aW9ucyBwYXJhbWV0ZXIuXG4gKiBAamEg44Kq44OX44K344On44Oz44GL44KJIGBoZWFkZXJzYCDjgpLoqK3lrppcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSGVhZGVycyhvcHRpb25zOiBBamF4SGVhZGVyT3B0aW9ucyk6IEhlYWRlcnMge1xuICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpO1xuICAgIGNvbnN0IHsgbWV0aG9kLCBjb250ZW50VHlwZSwgZGF0YVR5cGUsIG1vZGUsIGJvZHksIHVzZXJuYW1lLCBwYXNzd29yZCB9ID0gb3B0aW9ucztcblxuICAgIC8vIENvbnRlbnQtVHlwZVxuICAgIGlmICgnUE9TVCcgPT09IG1ldGhvZCB8fCAnUFVUJyA9PT0gbWV0aG9kIHx8ICdQQVRDSCcgPT09IG1ldGhvZCkge1xuICAgICAgICAvKlxuICAgICAgICAgKiBmZXRjaCgpIOOBruWgtOWQiCwgRm9ybURhdGEg44KS6Ieq5YuV6Kej6YeI44GZ44KL44Gf44KBLCDmjIflrprjgYzjgYLjgovloLTlkIjjga/liYrpmaRcbiAgICAgICAgICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzUxOTI4NDEvZmV0Y2gtcG9zdC13aXRoLW11bHRpcGFydC1mb3JtLWRhdGFcbiAgICAgICAgICogaHR0cHM6Ly9tdWZmaW5tYW4uaW8vdXBsb2FkaW5nLWZpbGVzLXVzaW5nLWZldGNoLW11bHRpcGFydC1mb3JtLWRhdGEvXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpICYmIGJvZHkgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuICAgICAgICAgICAgaGVhZGVycy5kZWxldGUoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICB9IGVsc2UgaWYgKCFoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNvbnRlbnRUeXBlICYmICdqc29uJyA9PT0gZGF0YVR5cGUgYXMgQWpheERhdGFUeXBlcykge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsIGNvbnRlbnRUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFjY2VwdFxuICAgIGlmICghaGVhZGVycy5nZXQoJ0FjY2VwdCcpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdBY2NlcHQnLCBfYWNjZXB0SGVhZGVyTWFwW2RhdGFUeXBlIGFzIEFqYXhEYXRhVHlwZXNdIHx8ICcqLyonKTtcbiAgICB9XG5cbiAgICAvLyBYLVJlcXVlc3RlZC1XaXRoXG4gICAgaWYgKCdjb3JzJyAhPT0gbW9kZSAmJiAhaGVhZGVycy5nZXQoJ1gtUmVxdWVzdGVkLVdpdGgnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnWC1SZXF1ZXN0ZWQtV2l0aCcsICdYTUxIdHRwUmVxdWVzdCcpO1xuICAgIH1cblxuICAgIC8vIEJhc2ljIEF1dGhvcml6YXRpb25cbiAgICBpZiAobnVsbCAhPSB1c2VybmFtZSAmJiAhaGVhZGVycy5nZXQoJ0F1dGhvcml6YXRpb24nKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQXV0aG9yaXphdGlvbicsIGBCYXNpYyAke0Jhc2U2NC5lbmNvZGUoYCR7dXNlcm5hbWV9OiR7cGFzc3dvcmQgfHwgJyd9YCl9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhlYWRlcnM7XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm0gYW4gYXN5bmNocm9ub3VzIEhUVFAgKEFqYXgpIHJlcXVlc3QuXG4gKiBAamEgSFRUUCAoQWpheCnjg6rjgq/jgqjjgrnjg4jjga7pgIHkv6FcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBBamF4IHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuYXN5bmMgZnVuY3Rpb24gYWpheDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdyZXNwb25zZSc+KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheE9wdGlvbnM8VD4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IGFib3J0ID0gKCk6IHZvaWQgPT4gY29udHJvbGxlci5hYm9ydCgpO1xuXG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ3Jlc3BvbnNlJyxcbiAgICAgICAgdGltZW91dDogc2V0dGluZ3MudGltZW91dCxcbiAgICB9LCBvcHRpb25zLCB7XG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsIC8vIGZvcmNlIG92ZXJyaWRlXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGNhbmNlbDogb3JpZ2luYWxUb2tlbiwgdGltZW91dCB9ID0gb3B0cztcblxuICAgIC8vIGNhbmNlbGxhdGlvblxuICAgIGlmIChvcmlnaW5hbFRva2VuKSB7XG4gICAgICAgIGlmIChvcmlnaW5hbFRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgdGhyb3cgb3JpZ2luYWxUb2tlbi5yZWFzb247XG4gICAgICAgIH1cbiAgICAgICAgb3JpZ2luYWxUb2tlbi5yZWdpc3RlcihhYm9ydCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlID0gQ2FuY2VsVG9rZW4uc291cmNlKG9yaWdpbmFsVG9rZW4gYXMgQ2FuY2VsVG9rZW4pO1xuICAgIGNvbnN0IHsgdG9rZW4gfSA9IHNvdXJjZTtcbiAgICB0b2tlbi5yZWdpc3RlcihhYm9ydCk7XG5cbiAgICAvLyB0aW1lb3V0XG4gICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBzb3VyY2UuY2FuY2VsKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9USU1FT1VULCAncmVxdWVzdCB0aW1lb3V0JykpLCB0aW1lb3V0KTtcbiAgICB9XG5cbiAgICAvLyBub3JtYWxpemVcbiAgICBvcHRzLm1ldGhvZCA9IG9wdHMubWV0aG9kLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAvLyBoZWFkZXJcbiAgICBvcHRzLmhlYWRlcnMgPSBzZXR1cEhlYWRlcnMob3B0cyk7XG5cbiAgICAvLyBwYXJzZSBwYXJhbVxuICAgIGNvbnN0IHsgbWV0aG9kLCBkYXRhLCBkYXRhVHlwZSB9ID0gb3B0cztcbiAgICBpZiAobnVsbCAhPSBkYXRhKSB7XG4gICAgICAgIGlmICgoJ0dFVCcgPT09IG1ldGhvZCB8fCAnSEVBRCcgPT09IG1ldGhvZCkgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKGRhdGEpfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBvcHRzLmJvZHkpIHtcbiAgICAgICAgICAgIG9wdHMuYm9keSA9IG5ldyBVUkxTZWFyY2hQYXJhbXModG9BamF4UGFyYW1zKGRhdGEpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGV4ZWN1dGVcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShmZXRjaCh1cmwsIG9wdHMpLCB0b2tlbik7XG4gICAgaWYgKCdyZXNwb25zZScgPT09IGRhdGFUeXBlKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBBamF4UmVzdWx0PFQ+O1xuICAgIH0gZWxzZSBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgcmVzcG9uc2Uuc3RhdHVzVGV4dCwgcmVzcG9uc2UpO1xuICAgIH0gZWxzZSBpZiAoJ3N0cmVhbScgPT09IGRhdGFUeXBlKSB7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IE51bWJlcihyZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC1sZW5ndGgnKSk7XG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IHJlc3BvbnNlLmJvZHkgYXMgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT47XG4gICAgICAgIHN0cmVhbVsnbGVuZ3RoJ10gPSBsZW5ndGg7XG4gICAgICAgIHJldHVybiBzdHJlYW0gYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVubmVjZXNzYXJ5LXR5cGUtYXNzZXJ0aW9uXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2VbZGF0YVR5cGUgYXMgRXhjbHVkZTxBamF4RGF0YVR5cGVzLCAncmVzcG9uc2UnIHwgJ3N0cmVhbSc+XSgpLCB0b2tlbik7XG4gICAgfVxufVxuXG5hamF4LnNldHRpbmdzID0gc2V0dGluZ3M7XG5cbmV4cG9ydCB7IGFqYXggfTtcbiIsImltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXF1ZXN0T3B0aW9ucyxcbiAgICBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgYWpheCwgc2V0dXBIZWFkZXJzIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgWE1MSHR0cFJlcXVlc3QgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlPzogQWpheERhdGFUeXBlcyk6IEFqYXhEYXRhVHlwZXMge1xuICAgIHJldHVybiBkYXRhVHlwZSB8fCAnanNvbic7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844GL44KJ6L+U44GV44KM44KL5pyf5b6F44GZ44KL44OH44O844K/44Gu5Z6L44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdHRVQnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufVxuXG4vKipcbiAqIEBlbiBgR0VUYCB0ZXh0IHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44OG44Kt44K544OI44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J3RleHQnPj4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICd0ZXh0Jywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIEpTT04gcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBKU09OIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24ganNvbjxUIGV4dGVuZHMgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgcmV0dXJuIGdldDxUPih1cmwsIHVuZGVmaW5lZCwgKCdqc29uJyBhcyBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicpLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgQmxvYiByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIEJsb2Ig44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J2Jsb2InPj4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICdibG9iJywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBQT1NUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBQT1NUYCDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE6IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdQT1NUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn1cblxuLyoqXG4gKiBAZW4gU3luY2hyb25vdXMgYEdFVGAgcmVxdWVzdCBmb3IgcmVzb3VyY2UgYWNjZXNzLiA8YnI+XG4gKiAgICAgTWFueSBicm93c2VycyBoYXZlIGRlcHJlY2F0ZWQgc3luY2hyb25vdXMgWEhSIHN1cHBvcnQgb24gdGhlIG1haW4gdGhyZWFkIGVudGlyZWx5LlxuICogQGphIOODquOCveODvOOCueWPluW+l+OBruOBn+OCgeOBriDlkIzmnJ8gYEdFVGAg44Oq44Kv44Ko44K544OILiA8YnI+XG4gKiAgICAg5aSa44GP44Gu44OW44Op44Km44K244Gn44Gv44Oh44Kk44Oz44K544Os44OD44OJ44Gr44GK44GR44KL5ZCM5pyf55qE44GqIFhIUiDjga7lr77lv5zjgpLlhajpnaLnmoTjgavpnZ7mjqjlpajjgajjgZfjgabjgYTjgovjga7jgafnqY3mpbXkvb/nlKjjga/pgb/jgZHjgovjgZPjgaguXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb3VyY2U8VCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nID8gVCA6ICdqc29uJyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4pOiBBamF4UmVzdWx0PFQ+IHtcbiAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChudWxsICE9IGRhdGEgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICB9XG5cbiAgICAvLyBzeW5jaHJvbm91c1xuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcblxuICAgIGNvbnN0IHR5cGUgPSBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSk7XG4gICAgY29uc3QgaGVhZGVycyA9IHNldHVwSGVhZGVycyh7IG1ldGhvZDogJ0dFVCcsIGRhdGFUeXBlOiB0eXBlIH0pO1xuICAgIGhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHhoci5zZW5kKG51bGwpO1xuICAgIGlmICghKDIwMCA8PSB4aHIuc3RhdHVzICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgeGhyLnN0YXR1c1RleHQsIHhocik7XG4gICAgfVxuXG4gICAgcmV0dXJuICdqc29uJyA9PT0gdHlwZSA/IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKSA6IHhoci5yZXNwb25zZTtcbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsImFzc2lnblZhbHVlIiwiaXNOdW1lcmljIiwiaXNOdW1iZXIiLCJCYXNlNjQiLCJDYW5jZWxUb2tlbiIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7OztJQUlHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBSUMsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFKRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxjQUE4QyxDQUFBO1lBQzlDLFdBQXNC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