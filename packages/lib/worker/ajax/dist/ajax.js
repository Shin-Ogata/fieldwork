/*!
 * @cdp/ajax 0.9.0
 *   ajax utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/promise'), require('@cdp/result'), require('@cdp/binary')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/promise', '@cdp/result', '@cdp/binary'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Utils, global.CDP, global.CDP, global.CDP));
}(this, function (exports, coreUtils, promise, result, binary) { 'use strict';

    /* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars, @typescript-eslint/restrict-plus-operands */
    globalThis.CDP_DECLARE = globalThis.CDP_DECLARE || {};
    (function (CDP_DECLARE) {
        /**
         * 拡張通エラーコード定義
         */
        let RESULT_CODE;
        (function (RESULT_CODE) {
            RESULT_CODE[RESULT_CODE["ERROR_AJAX_RESPONSE"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 20 /* AJAX */ + 1, 'network error.')] = "ERROR_AJAX_RESPONSE";
            RESULT_CODE[RESULT_CODE["ERROR_AJAX_TIMEOUT"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 20 /* AJAX */ + 2, 'request timeout.')] = "ERROR_AJAX_TIMEOUT";
        })(RESULT_CODE = CDP_DECLARE.RESULT_CODE || (CDP_DECLARE.RESULT_CODE = {}));
    })(CDP_DECLARE || (CDP_DECLARE = {}));

    let _timeout;
    const settings = {
        get timeout() {
            return _timeout;
        },
        set timeout(value) {
            _timeout = (coreUtils.isNumber(value) && 0 <= value) ? value : undefined;
        },
    };

    const _FormData = coreUtils.safe(globalThis.FormData);
    const _Headers = coreUtils.safe(globalThis.Headers);
    const _AbortController = coreUtils.safe(globalThis.AbortController);
    const _URLSearchParams = coreUtils.safe(globalThis.URLSearchParams);
    const _fetch = coreUtils.safe(globalThis.fetch);

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
        const headers = new _Headers(options.headers);
        const { method, contentType, dataType, mode, body, username, password } = options;
        // Content-Type
        if ('POST' === method || 'PUT' === method || 'PATCH' === method) {
            /*
             * fetch() の場合, FormData を自動解釈するため, 指定がある場合は削除
             * https://stackoverflow.com/questions/35192841/fetch-post-with-multipart-form-data
             * https://muffinman.io/uploading-files-using-fetch-multipart-form-data/
             */
            if (headers.get('Content-Type') && body instanceof _FormData) {
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
    /** ensure string value */
    function ensureParamValue(prop) {
        const value = coreUtils.isFunction(prop) ? prop() : prop;
        return undefined !== value ? String(value) : '';
    }
    /**
     * @en Convert `PlainObject` to query strings.
     * @ja `PlainObject` をクエリストリングに変換
     */
    function toQueryStrings(data) {
        const params = [];
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
    function toAjaxParams(data) {
        const params = {};
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
    async function ajax(url, options) {
        const controller = new _AbortController();
        const abort = () => controller.abort();
        const opts = Object.assign({
            method: 'GET',
            dataType: 'response',
            timeout: settings.timeout,
        }, options, {
            signal: controller.signal,
        });
        const { cancel: originalToken, timeout } = opts;
        // cancellation
        if (originalToken) {
            if (originalToken.requested) {
                throw result.makeCanceledResult();
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
                opts.body = new _URLSearchParams(toAjaxParams(data));
            }
        }
        // execute
        const response = await Promise.resolve(_fetch(url, opts), token);
        if ('response' === dataType) {
            return response;
        }
        else if (!response.ok) {
            throw result.makeResult(result.RESULT_CODE.ERROR_AJAX_RESPONSE, response.statusText, response);
        }
        else {
            return response[dataType]();
        }
    }

    exports.ajax = ajax;
    exports.settings = settings;
    exports.setupHeaders = setupHeaders;
    exports.toAjaxParams = toAjaxParams;
    exports.toQueryStrings = toQueryStrings;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNldHRpbmdzLnRzIiwic3NyLnRzIiwiY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIEFKQVggPSAxICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBpc051bWJlciB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbmxldCBfdGltZW91dDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgZ2V0IHRpbWVvdXQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF90aW1lb3V0O1xuICAgIH0sXG4gICAgc2V0IHRpbWVvdXQodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgICAgICBfdGltZW91dCA9IChpc051bWJlcih2YWx1ZSkgJiYgMCA8PSB2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICB9LFxufTtcbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG5jb25zdCBfRm9ybURhdGEgPSBzYWZlKGdsb2JhbFRoaXMuRm9ybURhdGEpO1xuY29uc3QgX0hlYWRlcnMgPSBzYWZlKGdsb2JhbFRoaXMuSGVhZGVycyk7XG5jb25zdCBfQWJvcnRDb250cm9sbGVyID0gc2FmZShnbG9iYWxUaGlzLkFib3J0Q29udHJvbGxlcik7XG5jb25zdCBfVVJMU2VhcmNoUGFyYW1zID0gc2FmZShnbG9iYWxUaGlzLlVSTFNlYXJjaFBhcmFtcyk7XG5jb25zdCBfZmV0Y2ggPSBzYWZlKGdsb2JhbFRoaXMuZmV0Y2gpO1xuXG5leHBvcnQge1xuICAgIF9Gb3JtRGF0YSBhcyBGb3JtRGF0YSxcbiAgICBfSGVhZGVycyBhcyBIZWFkZXJzLFxuICAgIF9BYm9ydENvbnRyb2xsZXIgYXMgQWJvcnRDb250cm9sbGVyLFxuICAgIF9VUkxTZWFyY2hQYXJhbXMgYXMgVVJMU2VhcmNoUGFyYW1zLFxuICAgIF9mZXRjaCBhcyBmZXRjaCxcbn07XG4iLCJpbXBvcnQgeyBQbGFpbk9iamVjdCwgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VDYW5jZWxlZFJlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICdAY2RwL2JpbmFyeSc7XG5pbXBvcnQge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgRm9ybURhdGEsXG4gICAgSGVhZGVycyxcbiAgICBBYm9ydENvbnRyb2xsZXIsXG4gICAgVVJMU2VhcmNoUGFyYW1zLFxuICAgIGZldGNoLFxufSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBzZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBBamF4SGVhZGVyT3B0aW9ucyA9IFBpY2s8QWpheE9wdGlvbnMsICdoZWFkZXJzJyB8ICdtZXRob2QnIHwgJ2NvbnRlbnRUeXBlJyB8ICdkYXRhVHlwZScgfCAnbW9kZScgfCAnYm9keScgfCAndXNlcm5hbWUnIHwgJ3Bhc3N3b3JkJz47XG5cbmNvbnN0IF9hY2NlcHRIZWFkZXJNYXAgPSB7XG4gICAgdGV4dDogJ3RleHQvcGxhaW4sIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sOyBxPTAuOCwgdGV4dC94bWw7IHE9MC44LCAqLyo7IHE9MC4wMScsXG4gICAganNvbjogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdCwgKi8qOyBxPTAuMDEnLFxufTtcblxuLyoqXG4gKiBAZW4gU2V0dXAgYGhlYWRlcnNgIGZyb20gb3B0aW9ucyBwYXJhbWV0ZXIuXG4gKiBAamEg44Kq44OX44K344On44Oz44GL44KJIGBoZWFkZXJzYCDjgpLoqK3lrppcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSGVhZGVycyhvcHRpb25zOiBBamF4SGVhZGVyT3B0aW9ucyk6IEhlYWRlcnMge1xuICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpO1xuICAgIGNvbnN0IHsgbWV0aG9kLCBjb250ZW50VHlwZSwgZGF0YVR5cGUsIG1vZGUsIGJvZHksIHVzZXJuYW1lLCBwYXNzd29yZCB9ID0gb3B0aW9ucztcblxuICAgIC8vIENvbnRlbnQtVHlwZVxuICAgIGlmICgnUE9TVCcgPT09IG1ldGhvZCB8fCAnUFVUJyA9PT0gbWV0aG9kIHx8ICdQQVRDSCcgPT09IG1ldGhvZCkge1xuICAgICAgICAvKlxuICAgICAgICAgKiBmZXRjaCgpIOOBruWgtOWQiCwgRm9ybURhdGEg44KS6Ieq5YuV6Kej6YeI44GZ44KL44Gf44KBLCDmjIflrprjgYzjgYLjgovloLTlkIjjga/liYrpmaRcbiAgICAgICAgICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzUxOTI4NDEvZmV0Y2gtcG9zdC13aXRoLW11bHRpcGFydC1mb3JtLWRhdGFcbiAgICAgICAgICogaHR0cHM6Ly9tdWZmaW5tYW4uaW8vdXBsb2FkaW5nLWZpbGVzLXVzaW5nLWZldGNoLW11bHRpcGFydC1mb3JtLWRhdGEvXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpICYmIGJvZHkgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuICAgICAgICAgICAgaGVhZGVycy5kZWxldGUoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICB9IGVsc2UgaWYgKCFoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNvbnRlbnRUeXBlICYmICdqc29uJyA9PT0gZGF0YVR5cGUgYXMgQWpheERhdGFUeXBlcykge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsIGNvbnRlbnRUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFjY2VwdFxuICAgIGlmICghaGVhZGVycy5nZXQoJ0FjY2VwdCcpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdBY2NlcHQnLCBfYWNjZXB0SGVhZGVyTWFwW2RhdGFUeXBlIGFzIEFqYXhEYXRhVHlwZXNdIHx8ICcqLyonKTtcbiAgICB9XG5cbiAgICAvLyBYLVJlcXVlc3RlZC1XaXRoXG4gICAgaWYgKCdjb3JzJyAhPT0gbW9kZSAmJiAhaGVhZGVycy5nZXQoJ1gtUmVxdWVzdGVkLVdpdGgnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnWC1SZXF1ZXN0ZWQtV2l0aCcsICdYTUxIdHRwUmVxdWVzdCcpO1xuICAgIH1cblxuICAgIC8vIEJhc2ljIEF1dGhvcml6YXRpb25cbiAgICBpZiAobnVsbCAhPSB1c2VybmFtZSAmJiAhaGVhZGVycy5nZXQoJ0F1dGhvcml6YXRpb24nKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQXV0aG9yaXphdGlvbicsIGBCYXNpYyAke0Jhc2U2NC5lbmNvZGUoYCR7dXNlcm5hbWV9OiR7cGFzc3dvcmQgfHwgJyd9YCl9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhlYWRlcnM7XG59XG5cbi8qKiBlbnN1cmUgc3RyaW5nIHZhbHVlICovXG5mdW5jdGlvbiBlbnN1cmVQYXJhbVZhbHVlKHByb3A6IHVua25vd24pOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhbHVlID0gaXNGdW5jdGlvbihwcm9wKSA/IHByb3AoKSA6IHByb3A7XG4gICAgcmV0dXJuIHVuZGVmaW5lZCAhPT0gdmFsdWUgPyBTdHJpbmcodmFsdWUpIDogJyc7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBxdWVyeSBzdHJpbmdzLlxuICogQGphIGBQbGFpbk9iamVjdGAg44KS44Kv44Ko44Oq44K544OI44Oq44Oz44Kw44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1F1ZXJ5U3RyaW5ncyhkYXRhOiBQbGFpbk9iamVjdCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGFyYW1zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHBhcmFtcy5wdXNoKGAke2VuY29kZVVSSUNvbXBvbmVudChrZXkpfT0ke2VuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSl9YCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcy5qb2luKCcmJyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBBamF4IHBhcmFtZXRlcnMgb2JqZWN0LlxuICogQGphIGBQbGFpbk9iamVjdGAg44KSIEFqYXgg44OR44Op44Oh44O844K/44Kq44OW44K444Kn44Kv44OI44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0FqYXhQYXJhbXMoZGF0YTogUGxhaW5PYmplY3QpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgICBjb25zdCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBwYXJhbXNba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm0gYW4gYXN5bmNocm9ub3VzIEhUVFAgKEFqYXgpIHJlcXVlc3QuXG4gKiBAamEgSFRUUCAoQWpheCnjg6rjgq/jgqjjgrnjg4jjga7pgIHkv6FcbiAqXG4gKiBAcGFyYW0gdXJpXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBBamF4IHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFqYXg8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCB7fSA9ICdyZXNwb25zZSc+KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheE9wdGlvbnM8VD4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IGFib3J0ID0gKCk6IHZvaWQgPT4gY29udHJvbGxlci5hYm9ydCgpO1xuXG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ3Jlc3BvbnNlJyxcbiAgICAgICAgdGltZW91dDogc2V0dGluZ3MudGltZW91dCxcbiAgICB9LCBvcHRpb25zLCB7XG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsIC8vIGZvcmNlIG92ZXJyaWRlXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGNhbmNlbDogb3JpZ2luYWxUb2tlbiwgdGltZW91dCB9ID0gb3B0cztcblxuICAgIC8vIGNhbmNlbGxhdGlvblxuICAgIGlmIChvcmlnaW5hbFRva2VuKSB7XG4gICAgICAgIGlmIChvcmlnaW5hbFRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZUNhbmNlbGVkUmVzdWx0KCk7XG4gICAgICAgIH1cbiAgICAgICAgb3JpZ2luYWxUb2tlbi5yZWdpc3RlcihhYm9ydCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlID0gQ2FuY2VsVG9rZW4uc291cmNlKG9yaWdpbmFsVG9rZW4gYXMgQ2FuY2VsVG9rZW4pO1xuICAgIGNvbnN0IHsgdG9rZW4gfSA9IHNvdXJjZTtcbiAgICB0b2tlbi5yZWdpc3RlcihhYm9ydCk7XG5cbiAgICAvLyB0aW1lb3V0XG4gICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBzb3VyY2UuY2FuY2VsKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9USU1FT1VULCAncmVxdWVzdCB0aW1lb3V0JykpLCB0aW1lb3V0KTtcbiAgICB9XG5cbiAgICAvLyBub3JtYWxpemVcbiAgICBvcHRzLm1ldGhvZCA9IG9wdHMubWV0aG9kLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAvLyBoZWFkZXJcbiAgICBvcHRzLmhlYWRlcnMgPSBzZXR1cEhlYWRlcnMob3B0cyk7XG5cbiAgICAvLyBwYXJzZSBwYXJhbVxuICAgIGNvbnN0IHsgbWV0aG9kLCBkYXRhLCBkYXRhVHlwZSB9ID0gb3B0cztcbiAgICBpZiAobnVsbCAhPSBkYXRhKSB7XG4gICAgICAgIGlmICgoJ0dFVCcgPT09IG1ldGhvZCB8fCAnSEVBRCcgPT09IG1ldGhvZCkgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKGRhdGEpfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBvcHRzLmJvZHkpIHtcbiAgICAgICAgICAgIG9wdHMuYm9keSA9IG5ldyBVUkxTZWFyY2hQYXJhbXModG9BamF4UGFyYW1zKGRhdGEpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGV4ZWN1dGVcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShmZXRjaCh1cmwsIG9wdHMpLCB0b2tlbik7XG4gICAgaWYgKCdyZXNwb25zZScgPT09IGRhdGFUeXBlKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBBamF4UmVzdWx0PFQ+O1xuICAgIH0gZWxzZSBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgcmVzcG9uc2Uuc3RhdHVzVGV4dCwgcmVzcG9uc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZVtkYXRhVHlwZSBhcyBFeGNsdWRlPEFqYXhEYXRhVHlwZXMsICdyZXNwb25zZSc+XSgpO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJpc051bWJlciIsInNhZmUiLCJIZWFkZXJzIiwiRm9ybURhdGEiLCJCYXNlNjQiLCJpc0Z1bmN0aW9uIiwiQWJvcnRDb250cm9sbGVyIiwibWFrZUNhbmNlbGVkUmVzdWx0IiwiQ2FuY2VsVG9rZW4iLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJVUkxTZWFyY2hQYXJhbXMiLCJmZXRjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTtJQUVBLHFEQUFxQixDQWFwQjtJQWJELFdBQVUsV0FBVzs7OztRQVNqQixJQUFZLFdBR1g7UUFIRCxXQUFZLFdBQVc7WUFDbkIsaURBQXNCLFlBQUEsa0JBQWtCLGdCQUF1QixnQkFBdUIsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLHlCQUFBLENBQUE7WUFDMUcsZ0RBQXNCLFlBQUEsa0JBQWtCLGdCQUF1QixnQkFBdUIsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLHdCQUFBLENBQUE7U0FDL0csRUFIVyxXQUFXLEdBQVgsdUJBQVcsS0FBWCx1QkFBVyxRQUd0QjtJQUNMLENBQUMsRUFiUyxXQUFXLEtBQVgsV0FBVyxRQWFwQjs7SUNiRCxJQUFJLFFBQTRCLENBQUM7QUFFakMsVUFBYSxRQUFRLEdBQUc7UUFDcEIsSUFBSSxPQUFPO1lBQ1AsT0FBTyxRQUFRLENBQUM7U0FDbkI7UUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUF5QjtZQUNqQyxRQUFRLEdBQUcsQ0FBQ0Esa0JBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUM7U0FDbEU7S0FDSjs7SUNURCxNQUFNLFNBQVMsR0FBR0MsY0FBSSxD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
