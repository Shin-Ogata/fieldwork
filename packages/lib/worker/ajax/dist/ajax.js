/*!
 * @cdp/ajax 0.9.20
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
            else {
                opts.body ??= new URLSearchParams(toAjaxParams(data));
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
            throw result.makeResult(result.RESULT_CODE.ERROR_AJAX_RESPONSE, xhr.statusText, xhr);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBhcmFtcy50cyIsInN0cmVhbS50cyIsInNldHRpbmdzLnRzIiwiY29yZS50cyIsInJlcXVlc3QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEFKQVhfREVDTEFSRSAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgRm9ybURhdGEgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkZvcm1EYXRhKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEhlYWRlcnMgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5IZWFkZXJzKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEFib3J0Q29udHJvbGxlciA9IHNhZmUoZ2xvYmFsVGhpcy5BYm9ydENvbnRyb2xsZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVVJMU2VhcmNoUGFyYW1zID0gc2FmZShnbG9iYWxUaGlzLlVSTFNlYXJjaFBhcmFtcyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBYTUxIdHRwUmVxdWVzdCAgPSBzYWZlKGdsb2JhbFRoaXMuWE1MSHR0cFJlcXVlc3QpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZmV0Y2ggICAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmZldGNoKTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzTnVtZXJpYyxcbiAgICBhc3NpZ25WYWx1ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFVSTFNlYXJjaFBhcmFtcyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgc3RyaW5nIHZhbHVlICovXG5jb25zdCBlbnN1cmVQYXJhbVZhbHVlID0gKHByb3A6IHVua25vd24pOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gaXNGdW5jdGlvbihwcm9wKSA/IHByb3AoKSA6IHByb3A7XG4gICAgcmV0dXJuIHVuZGVmaW5lZCAhPT0gdmFsdWUgPyBTdHJpbmcodmFsdWUpIDogJyc7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gcXVlcnkgc3RyaW5ncy5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkuOCr+OCqOODquOCueODiOODquODs+OCsOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgdG9RdWVyeVN0cmluZ3MgPSAoZGF0YTogUGxhaW5PYmplY3QpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHBhcmFtczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBwYXJhbXMucHVzaChgJHtlbmNvZGVVUklDb21wb25lbnQoa2V5KX09JHtlbmNvZGVVUklDb21wb25lbnQodmFsdWUpfWApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXMuam9pbignJicpO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBgUGxhaW5PYmplY3RgIHRvIEFqYXggcGFyYW1ldGVycyBvYmplY3QuXG4gKiBAamEgYFBsYWluT2JqZWN0YCDjgpIgQWpheCDjg5Hjg6njg6Hjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IHRvQWpheFBhcmFtcyA9IChkYXRhOiBQbGFpbk9iamVjdCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPT4ge1xuICAgIGNvbnN0IHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKHBhcmFtcywga2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgVVJMIHBhcmFtZXRlcnMgdG8gcHJpbWl0aXZlIHR5cGUuXG4gKiBAamEgVVJMIOODkeODqeODoeODvOOCv+OCkiBwcmltaXRpdmUg44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCBjb252ZXJ0VXJsUGFyYW1UeXBlID0gKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCA9PiB7XG4gICAgaWYgKGlzTnVtZXJpYyh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIE51bWJlcih2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICgndHJ1ZScgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoJ251bGwnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBQYXJzZSB1cmwgcXVlcnkgR0VUIHBhcmFtZXRlcnMuXG4gKiBAamEgVVJM44Kv44Ko44Oq44GuR0VU44OR44Op44Oh44O844K/44KS6Kej5p6QXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB1cmwgPSAnL3BhZ2UvP2lkPTUmZm9vPWJhciZib29sPXRydWUnO1xuICogY29uc3QgcXVlcnkgPSBwYXJzZVVybFF1ZXJ5KHVybCk7XG4gKiAvLyB7IGlkOiA1LCBmb286ICdiYXInLCBib29sOiB0cnVlIH1cbiAqIGBgYFxuICpcbiAqIEByZXR1cm5zIHsga2V5OiB2YWx1ZSB9IG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IHBhcnNlVXJsUXVlcnkgPSA8VCA9IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPj4odXJsOiBzdHJpbmcpOiBUID0+IHtcbiAgICBjb25zdCBxdWVyeTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHVybC5pbmNsdWRlcygnPycpID8gdXJsLnNwbGl0KCc/JylbMV0gOiB1cmwpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHBhcmFtcykge1xuICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoa2V5KV0gPSBjb252ZXJ0VXJsUGFyYW1UeXBlKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHF1ZXJ5IGFzIFQ7XG59O1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBLZXlzLFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIFN1YnNjcmliYWJsZSwgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgdHlwZSB7IEFqYXhEYXRhU3RyZWFtRXZlbnQsIEFqYXhEYXRhU3RyZWFtIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBQcm94eUhhbmRsZXIgaGVscGVyICovXG5jb25zdCBfZXhlY0dldERlZmF1bHQgPSAodGFyZ2V0OiBhbnksIHByb3A6IHN0cmluZyB8IHN5bWJvbCk6IGFueSA9PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGlmIChwcm9wIGluIHRhcmdldCkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbih0YXJnZXRbcHJvcF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdLmJpbmQodGFyZ2V0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc3Vic2NyaWJhYmxlTWV0aG9kczogS2V5czxTdWJzY3JpYmFibGU+W10gPSBbXG4gICAgJ2hhc0xpc3RlbmVyJyxcbiAgICAnY2hhbm5lbHMnLFxuICAgICdvbicsXG4gICAgJ29mZicsXG4gICAgJ29uY2UnLFxuXTtcblxuZXhwb3J0IGNvbnN0IHRvQWpheERhdGFTdHJlYW0gPSAoc2VlZDogQmxvYiB8IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBsZW5ndGg/OiBudW1iZXIpOiBBamF4RGF0YVN0cmVhbSA9PiB7XG4gICAgbGV0IGxvYWRlZCA9IDA7XG4gICAgY29uc3QgW3N0cmVhbSwgdG90YWxdID0gKCgpID0+IHtcbiAgICAgICAgaWYgKHNlZWQgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQuc3RyZWFtKCksIHNlZWQuc2l6ZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQsIGxlbmd0aCAhPSBudWxsID8gTWF0aC50cnVuYyhsZW5ndGgpIDogTmFOXTtcbiAgICAgICAgfVxuICAgIH0pKCk7XG5cbiAgICBjb25zdCBfZXZlbnRTb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2U8QWpheERhdGFTdHJlYW1FdmVudD4oKSBhcyBBY2Nlc3NpYmxlPEV2ZW50U291cmNlPEFqYXhEYXRhU3RyZWFtRXZlbnQ+LCBVbmtub3duRnVuY3Rpb24+O1xuXG4gICAgY29uc3QgX3Byb3h5UmVhZGVySGFuZGxlcjogUHJveHlIYW5kbGVyPFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxVaW50OEFycmF5Pj4gPSB7XG4gICAgICAgIGdldDogKHRhcmdldDogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICgncmVhZCcgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gdGFyZ2V0LnJlYWQoKTtcbiAgICAgICAgICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWU6IGNodW5rIH0gPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICBjaHVuayAmJiAobG9hZGVkICs9IGNodW5rLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIF9ldmVudFNvdXJjZS50cmlnZ2VyKCdwcm9ncmVzcycsIE9iamVjdC5mcmVlemUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcHV0YWJsZTogIU51bWJlci5pc05hTih0b3RhbCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaHVuayxcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IHByb21pc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfZXhlY0dldERlZmF1bHQodGFyZ2V0LCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBQcm94eShzdHJlYW0sIHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAoJ2dldFJlYWRlcicgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gbmV3IFByb3h5KHRhcmdldC5nZXRSZWFkZXIoKSwgX3Byb3h5UmVhZGVySGFuZGxlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCdsZW5ndGgnID09PSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfc3Vic2NyaWJhYmxlTWV0aG9kcy5pbmNsdWRlcyhwcm9wIGFzIEtleXM8U3Vic2NyaWJhYmxlPikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gX2V2ZW50U291cmNlW3Byb3BdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2V4ZWNHZXREZWZhdWx0KHRhcmdldCwgcHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSkgYXMgQWpheERhdGFTdHJlYW07XG59O1xuIiwiaW1wb3J0IHsgaXNOdW1iZXIgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovIGxldCBfdGltZW91dDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgZ2V0IHRpbWVvdXQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF90aW1lb3V0O1xuICAgIH0sXG4gICAgc2V0IHRpbWVvdXQodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgICAgICBfdGltZW91dCA9IChpc051bWJlcih2YWx1ZSkgJiYgMCA8PSB2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICB9LFxufTtcbiIsImltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnQGNkcC9iaW5hcnknO1xuaW1wb3J0IHR5cGUge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgRm9ybURhdGEsXG4gICAgSGVhZGVycyxcbiAgICBBYm9ydENvbnRyb2xsZXIsXG4gICAgVVJMU2VhcmNoUGFyYW1zLFxuICAgIGZldGNoLFxufSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyB0b1F1ZXJ5U3RyaW5ncywgdG9BamF4UGFyYW1zIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgdG9BamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IHNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIEFqYXhIZWFkZXJPcHRpb25zID0gUGljazxBamF4T3B0aW9uczxBamF4RGF0YVR5cGVzPiwgJ2hlYWRlcnMnIHwgJ21ldGhvZCcgfCAnY29udGVudFR5cGUnIHwgJ2RhdGFUeXBlJyB8ICdtb2RlJyB8ICdib2R5JyB8ICd1c2VybmFtZScgfCAncGFzc3dvcmQnPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FjY2VwdEhlYWRlck1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICB0ZXh0OiAndGV4dC9wbGFpbiwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWw7IHE9MC44LCB0ZXh0L3htbDsgcT0wLjgsICovKjsgcT0wLjAxJyxcbiAgICBqc29uOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9qYXZhc2NyaXB0LCAqLyo7IHE9MC4wMScsXG59O1xuXG4vKipcbiAqIEBlbiBTZXR1cCBgaGVhZGVyc2AgZnJvbSBvcHRpb25zIHBhcmFtZXRlci5cbiAqIEBqYSDjgqrjg5fjgrfjg6fjg7PjgYvjgokgYGhlYWRlcnNgIOOCkuioreWumlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIZWFkZXJzKG9wdGlvbnM6IEFqYXhIZWFkZXJPcHRpb25zKTogSGVhZGVycyB7XG4gICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgY29uc3QgeyBtZXRob2QsIGNvbnRlbnRUeXBlLCBkYXRhVHlwZSwgbW9kZSwgYm9keSwgdXNlcm5hbWUsIHBhc3N3b3JkIH0gPSBvcHRpb25zO1xuXG4gICAgLy8gQ29udGVudC1UeXBlXG4gICAgaWYgKCdQT1NUJyA9PT0gbWV0aG9kIHx8ICdQVVQnID09PSBtZXRob2QgfHwgJ1BBVENIJyA9PT0gbWV0aG9kKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIGZldGNoKCkg44Gu5aC05ZCILCBGb3JtRGF0YSDjgpLoh6rli5Xop6Pph4jjgZnjgovjgZ/jgoEsIOaMh+WumuOBjOOBguOCi+WgtOWQiOOBr+WJiumZpFxuICAgICAgICAgKiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTE5Mjg0MS9mZXRjaC1wb3N0LXdpdGgtbXVsdGlwYXJ0LWZvcm0tZGF0YVxuICAgICAgICAgKiBodHRwczovL211ZmZpbm1hbi5pby91cGxvYWRpbmctZmlsZXMtdXNpbmctZmV0Y2gtbXVsdGlwYXJ0LWZvcm0tZGF0YS9cbiAgICAgICAgICovXG4gICAgICAgIGlmIChoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgJiYgYm9keSBpbnN0YW5jZW9mIEZvcm1EYXRhKSB7XG4gICAgICAgICAgICBoZWFkZXJzLmRlbGV0ZSgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSkge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY29udGVudFR5cGUgJiYgJ2pzb24nID09PSBkYXRhVHlwZSEpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCBjb250ZW50VHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBY2NlcHRcbiAgICBpZiAoIWhlYWRlcnMuZ2V0KCdBY2NlcHQnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQWNjZXB0JywgX2FjY2VwdEhlYWRlck1hcFtkYXRhVHlwZSFdIHx8ICcqLyonKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIFgtUmVxdWVzdGVkLVdpdGhcbiAgICAgKiDpnZ7mqJnmupbjg5jjg4Pjg4Djg7zjgafjgYLjgovjgZ/jgoEsIOaXouWumuOBp+OBryBjb3JzIOOBriBwcmVmbGlnaHQgcmVzcG9uc2Ug44Gn6Kix5Y+v44GV44KM44Gq44GEXG4gICAgICog44G+44GfIG1vZGUg44Gu5pei5a6a5YCk44GvIGNvcnMg44Gn44GC44KL44Gf44KBLCDmnInlirnjgavjgZnjgovjgavjga8gbW9kZSDjga7mmI7npLrnmoTmjIflrprjgYzlv4XopoHjgajjgarjgotcbiAgICAgKi9cbiAgICBpZiAobW9kZSAmJiAnY29ycycgIT09IG1vZGUgJiYgIWhlYWRlcnMuZ2V0KCdYLVJlcXVlc3RlZC1XaXRoJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ1gtUmVxdWVzdGVkLVdpdGgnLCAnWE1MSHR0cFJlcXVlc3QnKTtcbiAgICB9XG5cbiAgICAvLyBCYXNpYyBBdXRob3JpemF0aW9uXG4gICAgaWYgKG51bGwgIT0gdXNlcm5hbWUgJiYgIWhlYWRlcnMuZ2V0KCdBdXRob3JpemF0aW9uJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmFzaWMgJHtCYXNlNjQuZW5jb2RlKGAke3VzZXJuYW1lfToke3Bhc3N3b3JkID8/ICcnfWApfWApO1xuICAgIH1cblxuICAgIHJldHVybiBoZWFkZXJzO1xufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtIGFuIGFzeW5jaHJvbm91cyBIVFRQIChBamF4KSByZXF1ZXN0LlxuICogQGphIEhUVFAgKEFqYXgp44Oq44Kv44Ko44K544OI44Gu6YCB5L+hXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgQWpheCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFqYXg8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAncmVzcG9uc2UnPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhPcHRpb25zPFQ+KTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IGNvbnRyb2xsZXIuYWJvcnQoKTtcblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLnRpbWVvdXQsXG4gICAgfSwgb3B0aW9ucywge1xuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLCAvLyBmb3JjZSBvdmVycmlkZVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIHRpbWVvdXQgfSA9IG9wdHM7XG5cbiAgICAvLyBjYW5jZWxsYXRpb25cbiAgICBpZiAob3JpZ2luYWxUb2tlbikge1xuICAgICAgICBpZiAob3JpZ2luYWxUb2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgICAgICB9XG4gICAgICAgIG9yaWdpbmFsVG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuISk7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gc291cmNlO1xuICAgIHRva2VuLnJlZ2lzdGVyKGFib3J0KTtcblxuICAgIC8vIHRpbWVvdXRcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNvdXJjZS5jYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1RJTUVPVVQsICdyZXF1ZXN0IHRpbWVvdXQnKSksIHRpbWVvdXQpO1xuICAgIH1cblxuICAgIC8vIG5vcm1hbGl6ZVxuICAgIG9wdHMubWV0aG9kID0gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIGhlYWRlclxuICAgIG9wdHMuaGVhZGVycyA9IHNldHVwSGVhZGVycyhvcHRzKTtcblxuICAgIC8vIHBhcnNlIHBhcmFtXG4gICAgY29uc3QgeyBtZXRob2QsIGRhdGEsIGRhdGFUeXBlIH0gPSBvcHRzO1xuICAgIGlmIChudWxsICE9IGRhdGEpIHtcbiAgICAgICAgaWYgKCgnR0VUJyA9PT0gbWV0aG9kIHx8ICdIRUFEJyA9PT0gbWV0aG9kKSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdHMuYm9keSA/Pz0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0b0FqYXhQYXJhbXMoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGZldGNoKHVybCwgb3B0cyksIHRva2VuKTtcbiAgICBpZiAoJ3Jlc3BvbnNlJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIEFqYXhSZXN1bHQ8VD47XG4gICAgfSBlbHNlIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCByZXNwb25zZS5zdGF0dXNUZXh0LCByZXNwb25zZSk7XG4gICAgfSBlbHNlIGlmICgnc3RyZWFtJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRvQWpheERhdGFTdHJlYW0oXG4gICAgICAgICAgICByZXNwb25zZS5ib2R5ISxcbiAgICAgICAgICAgIE51bWJlcihyZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC1sZW5ndGgnKSksXG4gICAgICAgICkgYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXNwb25zZVtkYXRhVHlwZSBhcyBFeGNsdWRlPEFqYXhEYXRhVHlwZXMsICdyZXNwb25zZScgfCAnc3RyZWFtJz5dKCksIHRva2VuKTtcbiAgICB9XG59XG5cbmFqYXguc2V0dGluZ3MgPSBzZXR0aW5ncztcblxuZXhwb3J0IHsgYWpheCB9O1xuIiwiaW1wb3J0IHR5cGUgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB0eXBlIHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXF1ZXN0T3B0aW9ucyxcbiAgICBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgYWpheCwgc2V0dXBIZWFkZXJzIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgWE1MSHR0cFJlcXVlc3QgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVuc3VyZURhdGFUeXBlID0gKGRhdGFUeXBlPzogQWpheERhdGFUeXBlcyk6IEFqYXhEYXRhVHlwZXMgPT4ge1xuICAgIHJldHVybiBkYXRhVHlwZSA/PyAnanNvbic7XG59O1xuXG4vKipcbiAqIEBlbiBgR0VUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBi+OCiei/lOOBleOCjOOCi+acn+W+heOBmeOCi+ODh+ODvOOCv+OBruWei+OCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IGdldCA9IDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4gPT4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdHRVQnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufTtcblxuLyoqXG4gKiBAZW4gYEdFVGAgdGV4dCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIOODhuOCreOCueODiOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCB0ZXh0ID0gKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J3RleHQnPj4gPT4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICd0ZXh0Jywgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEBlbiBgR0VUYCBKU09OIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAgSlNPTiDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuY29uc3QganNvbiA9IDxUIGV4dGVuZHMgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiA9PiB7XG4gICAgcmV0dXJuIGdldDxUPih1cmwsIHVuZGVmaW5lZCwgKCdqc29uJyBhcyBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicpLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQGVuIGBHRVRgIEJsb2IgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBCbG9iIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCBibG9iID0gKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J2Jsb2InPj4gPT4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICdibG9iJywgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEBlbiBgUE9TVGAgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgUE9TVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBUaGUgdHlwZSBvZiBkYXRhIHRoYXQgeW91J3JlIGV4cGVjdGluZyBiYWNrIGZyb20gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IHBvc3QgPSA8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE6IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4gPT4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdQT1NUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn07XG5cbi8qKlxuICogQGVuIFN5bmNocm9ub3VzIGBHRVRgIHJlcXVlc3QgZm9yIHJlc291cmNlIGFjY2Vzcy4gPGJyPlxuICogICAgIE1hbnkgYnJvd3NlcnMgaGF2ZSBkZXByZWNhdGVkIHN5bmNocm9ub3VzIFhIUiBzdXBwb3J0IG9uIHRoZSBtYWluIHRocmVhZCBlbnRpcmVseS5cbiAqIEBqYSDjg6rjgr3jg7zjgrnlj5blvpfjga7jgZ/jgoHjga4g5ZCM5pyfIGBHRVRgIOODquOCr+OCqOOCueODiC4gPGJyPlxuICogICAgIOWkmuOBj+OBruODluODqeOCpuOCtuOBp+OBr+ODoeOCpOODs+OCueODrOODg+ODieOBq+OBiuOBkeOCi+WQjOacn+eahOOBqiBYSFIg44Gu5a++5b+c44KS5YWo6Z2i55qE44Gr6Z2e5o6o5aWo44Go44GX44Gm44GE44KL44Gu44Gn56mN5qW15L2/55So44Gv6YG/44GR44KL44GT44GoLlxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBUaGUgdHlwZSBvZiBkYXRhIHRoYXQgeW91J3JlIGV4cGVjdGluZyBiYWNrIGZyb20gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqL1xuY29uc3QgcmVzb3VyY2UgPSA8VCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nID8gVCA6ICdqc29uJyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4pOiBBamF4UmVzdWx0PFQ+ID0+IHtcbiAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChudWxsICE9IGRhdGEgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICB9XG5cbiAgICAvLyBzeW5jaHJvbm91c1xuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcblxuICAgIGNvbnN0IHR5cGUgPSBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSk7XG4gICAgY29uc3QgaGVhZGVycyA9IHNldHVwSGVhZGVycyh7IG1ldGhvZDogJ0dFVCcsIGRhdGFUeXBlOiB0eXBlIH0pO1xuICAgIGhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHhoci5zZW5kKG51bGwpO1xuICAgIGlmICghKDIwMCA8PSB4aHIuc3RhdHVzICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgeGhyLnN0YXR1c1RleHQsIHhocik7XG4gICAgfVxuXG4gICAgcmV0dXJuICdqc29uJyA9PT0gdHlwZSA/IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKSA6IHhoci5yZXNwb25zZTtcbn07XG5cbmV4cG9ydCBjb25zdCByZXF1ZXN0ID0ge1xuICAgIGdldCxcbiAgICB0ZXh0LFxuICAgIGpzb24sXG4gICAgYmxvYixcbiAgICBwb3N0LFxuICAgIHJlc291cmNlLFxufTtcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsImFzc2lnblZhbHVlIiwiaXNOdW1lcmljIiwiRXZlbnRTb3VyY2UiLCJpc051bWJlciIsIkJhc2U2NCIsIkNhbmNlbFRva2VuIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFHRztJQUVILENBQUEsWUFBcUI7SUFNakI7OztJQUdHO0lBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtJQUFBLElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGNBQThDO1lBQzlDLFdBQUEsQ0FBQSxXQUFBLENBQUEscUJBQUEsQ0FBQSxHQUFzQixXQUFBLENBQUEsa0JBQWtCLENBQUEsR0FBQSw2QkFBdUIsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUEsR0FBQSxxQkFBQTtZQUMxRyxXQUFBLENBQUEsV0FBQSxDQUFBLG9CQUFBLENBQUEsR0FBc0IsV0FBQSxDQUFBLGtCQUFrQixDQUFBLEdBQUEsNkJBQXVCLEVBQUEsOEJBQXVCLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBLEdBQUEsb0JBQUE7SUFDaEgsS0FBQyxHQUpzQjtJQUszQixDQUFDLEdBZm9COztJQ0hyQixpQkFBd0IsTUFBTSxRQUFRLEdBQVVBLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO0lBQ3pFLGlCQUF3QixNQUFNLE9BQU8sR0FBV0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7SUFDeEUsaUJBQXdCLE1BQU0sZUFBZSxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztJQUNoRixpQkFBd0IsTUFBTSxlQUFlLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO0lBQ2hGLGlCQUF3QixNQUFNLGNBQWMsR0FBSUEsY0FBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7SUFDL0UsaUJBQXdCLE1BQU0sS0FBSyxHQUFh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