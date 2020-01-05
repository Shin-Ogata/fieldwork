/*!
 * @cdp/data-sync 0.9.0
 *   web storage utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/promise'), require('@cdp/result'), require('@cdp/ajax'), require('@cdp/core-utils'), require('@cdp/web-storage')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/promise', '@cdp/result', '@cdp/ajax', '@cdp/core-utils', '@cdp/web-storage'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP.Utils, global.CDP));
}(this, (function (exports, promise, result, ajax, coreUtils, webStorage) { 'use strict';

    /* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars, @typescript-eslint/restrict-plus-operands */
    globalThis.CDP_DECLARE = globalThis.CDP_DECLARE;
    (function () {
        /**
         * @en Extends error code definitions.
         * @ja 拡張通エラーコード定義
         */
        let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
        (function () {
            RESULT_CODE[RESULT_CODE["MVC_SYNC_DECLARE"] = 9007199254740991] = "MVC_SYNC_DECLARE";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_PARAMS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 40 /* SYNC */ + 1, 'invalid sync params.')] = "ERROR_MVC_INVALID_SYNC_PARAMS";
        })();
    })();

    /**
     * @en The [[IDataSync]] implemant class which has no effects.
     * @ja 何もしない [[IDataSync]] 実装クラス
     */
    class NullDataSync {
        ///////////////////////////////////////////////////////////////////////
        // implements: IDataSync
        /**
         * @en [[IDataSync]] kind signature.
         * @ja [[IDataSync]] の種別を表す識別子
         */
        get kind() {
            return 'null';
        }
        /**
         * @en Do data synchronization.
         * @ja データ同期
         *
         * @param method
         *  - `en` operation string
         *  - `ja` オペレーションを指定
         * @param context
         *  - `en` synchronized context object
         *  - `ja` 同期するコンテキストオブジェクト
         * @param options
         *  - `en` option object
         *  - `ja` オプション
         */
        async sync(method, context, options) {
            const { cancel } = options || {};
            await promise.checkCanceled(cancel);
            const responce = Promise.resolve('read' === method ? {} : undefined);
            context.trigger('@request', context, responce);
            return responce;
        }
    }
    const dataSyncNULL = new NullDataSync();

    /** resolve lack property */
    function resolveURL(context) {
        if (coreUtils.isFunction(context['url'])) {
            return context['url']();
        }
        else {
            return context['url'];
        }
    }

    const _methodMap = {
        create: 'POST',
        update: 'PUT',
        patch: 'PATCH',
        delete: 'DELETE',
        read: 'GET'
    };
    /**
     * @en The [[IDataSync]] implemant class which compliant RESTful.
     * @ja REST に準拠した [[IDataSync]] 実装クラス
     */
    class RestDataSync {
        ///////////////////////////////////////////////////////////////////////
        // implements: IDataSync
        /**
         * @en [[IDataSync]] kind signature.
         * @ja [[IDataSync]] の種別を表す識別子
         */
        get kind() {
            return 'rest';
        }
        /**
         * @en Do data synchronization.
         * @ja データ同期
         *
         * @param method
         *  - `en` operation string
         *  - `ja` オペレーションを指定
         * @param context
         *  - `en` synchronized context object
         *  - `ja` 同期するコンテキストオブジェクト
         * @param options
         *  - `en` rest option object
         *  - `ja` REST オプション
         */
        sync(method, context, options) {
            const params = Object.assign({ dataType: 'json' }, options);
            const url = params.url || resolveURL(context);
            if (!url) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
            }
            params.method = _methodMap[method];
            // Ensure request data.
            if (null == params.data && ('create' === method || 'update' === method || 'patch' === method)) {
                params.data = context.toJSON();
            }
            // Ajax request
            const responce = ajax.ajax(url, params);
            context.trigger('@request', context, responce);
            return responce;
        }
    }
    const dataSyncREST = new RestDataSync();

    //__________________________________________________________________________________________________//
    /**
     * @en The [[IDataSync]] implemant class which target is [[IStorage]]. Default storage is [[WebStorage]].
     * @ja [[IStorage]] を対象とした [[IDataSync]] 実装クラス. 既定値は [[WebStorage]]
     */
    class StorageDataSync {
        /**
         * constructor
         */
        constructor() {
            this._storage = webStorage.webStorage;
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IStorageDataSync
        /**
         * @en Get current [[IStorage]] instance.
         * @ja 現在対象の [[IStorage]] インスタンスにアクセス
         */
        getStorage() {
            return this._storage;
        }
        /**
         * @en Set new [[IStorage]] instance.
         * @ja 新しい [[IStorage]] インスタンスを設定
         */
        setStorage(newStorage) {
            this._storage = newStorage;
            return this;
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IDataSync
        /**
         * @en [[IDataSync]] kind signature.
         * @ja [[IDataSync]] の種別を表す識別子
         */
        get kind() {
            return 'storage';
        }
        /**
         * @en Do data synchronization.
         * @ja データ同期
         *
         * @param method
         *  - `en` operation string
         *  - `ja` オペレーションを指定
         * @param context
         *  - `en` synchronized context object
         *  - `ja` 同期するコンテキストオブジェクト
         * @param options
         *  - `en` storage option object
         *  - `ja` ストレージオプション
         */
        sync(method, context, options) {
            const id = resolveURL(context);
            if (!id) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
            }
            let responce;
            switch (method) {
                case 'create':
                case 'update':
                case 'patch':
                    responce = this._storage.setItem(id, context.toJSON(), options);
                    break;
                case 'delete':
                    responce = this._storage.removeItem(id, options);
                    break;
                case 'read':
                    responce = this._storage.getItem(id, options);
                    break;
                default:
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, `unknown method: ${method}`);
            }
            context.trigger('@request', context, responce);
            return responce;
        }
    }
    const dataSyncSTORAGE = new StorageDataSync();

    let _default = dataSyncNULL;
    /**
     * @en Get or update default [[IDataSync]] object.
     * @ja 既定の [[IDataSync]] オブジェクトの取得 / 更新
     *
     * @param newSync
     *  - `en` new data-sync object. if `undefined` passed, only returns the current object.
     *  - `ja` 新しい data-sync オブジェクトを指定. `undefined` が渡される場合は現在設定されている data-sync の返却のみ行う
     * @returns
     *  - `en` old data-sync object.
     *  - `ja` 以前の data-sync オブジェクトを返却
     */
    function defaultSync(newSync) {
        if (null == newSync) {
            return _default;
        }
        else {
            const oldSync = _default;
            _default = newSync;
            return oldSync;
        }
    }

    exports.dataSyncNULL = dataSyncNULL;
    exports.dataSyncREST = dataSyncREST;
    exports.dataSyncSTORAGE = dataSyncSTORAGE;
    exports.defaultSync = defaultSync;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwibnVsbC50cyIsImludGVybmFsLnRzIiwicmVzdC50cyIsInN0b3JhZ2UudHMiLCJzZXR0aW5ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFNZTkMgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1NZTkNfREVDTEFSRSAgICAgICAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDEsICdpbnZhbGlkIHN5bmMgcGFyYW1zLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIGhhcyBubyBlZmZlY3RzLlxuICogQGphIOS9leOCguOBl+OBquOBhCBbW0lEYXRhU3luY11dIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBOdWxsRGF0YVN5bmMgaW1wbGVtZW50cyBJRGF0YVN5bmM8e30+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0PHt9Piwgb3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sywge30+PiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICBjb25zdCByZXNwb25jZSA9IFByb21pc2UucmVzb2x2ZSgncmVhZCcgPT09IG1ldGhvZCA/IHt9IDogdW5kZWZpbmVkKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLLCB7fT4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jTlVMTCA9IG5ldyBOdWxsRGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM8e30+O1xuIiwiaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiByZXNvbHZlIGxhY2sgcHJvcGVydHkgKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlVVJMKGNvbnRleHQ6IFN5bmNDb250ZXh0KTogc3RyaW5nIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0Wyd1cmwnXSkpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHRbJ3VybCddKCkgYXMgc3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0Wyd1cmwnXTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEFqYXhPcHRpb25zLCBhamF4IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciBbW1Jlc3REYXRhU3luY11dLlxuICogQGphIFtbUmVzdERhdGFTeW5jXV0g44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdERhdGFTeW5jT3B0aW9ucyBleHRlbmRzIEFqYXhPcHRpb25zPCdqc29uJz4ge1xuICAgIHVybD86IHN0cmluZztcbn1cblxuY29uc3QgX21ldGhvZE1hcCA9IHtcbiAgICBjcmVhdGU6ICdQT1NUJyxcbiAgICB1cGRhdGU6ICdQVVQnLFxuICAgIHBhdGNoOiAnUEFUQ0gnLFxuICAgIGRlbGV0ZTogJ0RFTEVURScsXG4gICAgcmVhZDogJ0dFVCdcbn07XG5cbi8qKlxuICogQGVuIFRoZSBbW0lEYXRhU3luY11dIGltcGxlbWFudCBjbGFzcyB3aGljaCBjb21wbGlhbnQgUkVTVGZ1bC5cbiAqIEBqYSBSRVNUIOOBq+a6luaLoOOBl+OBnyBbW0lEYXRhU3luY11dIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSZXN0RGF0YVN5bmMgaW1wbGVtZW50cyBJRGF0YVN5bmMge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJRGF0YVN5bmNdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJRGF0YVN5bmNdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3Jlc3QnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVzdCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCBSRVNUIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0LCBvcHRpb25zPzogUmVzdERhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8U3luY1Jlc3VsdDxLPj4ge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuYXNzaWduKHsgZGF0YVR5cGU6ICdqc29uJyB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB1cmwgPSBwYXJhbXMudXJsIHx8IHJlc29sdmVVUkwoY29udGV4dCk7XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCAnQSBcInVybFwiIHByb3BlcnR5IG9yIGZ1bmN0aW9uIG11c3QgYmUgc3BlY2lmaWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW1zLm1ldGhvZCA9IF9tZXRob2RNYXBbbWV0aG9kXTtcblxuICAgICAgICAvLyBFbnN1cmUgcmVxdWVzdCBkYXRhLlxuICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMuZGF0YSAmJiAoJ2NyZWF0ZScgPT09IG1ldGhvZCB8fCAndXBkYXRlJyA9PT0gbWV0aG9kIHx8ICdwYXRjaCcgPT09IG1ldGhvZCkpIHtcbiAgICAgICAgICAgIHBhcmFtcy5kYXRhID0gY29udGV4dC50b0pTT04oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFqYXggcmVxdWVzdFxuICAgICAgICBjb25zdCByZXNwb25jZSA9IGFqYXgodXJsLCBwYXJhbXMpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uY2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgUHJvbWlzZTxTeW5jUmVzdWx0PEs+PjtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY1JFU1QgPSBuZXcgUmVzdERhdGFTeW5jKCkgYXMgSURhdGFTeW5jO1xuIiwiaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBJU3RvcmFnZSwgSVN0b3JhZ2VPcHRpb25zIH0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvd2ViLXN0b3JhZ2UnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IHJlc29sdmVVUkwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gW1tJRGF0YVN5bmNdXSBpbnRlcmZhY2UgZm9yIFtbSVN0b3JhZ2VdXSBhY2Nlc3Nvci5cbiAqIEBqYSBbW0lTdG9yYWdlXV0g44Ki44Kv44K744OD44K144KS5YKZ44GI44KLIFtbSURhdGFTeW5jXV0g44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSVN0b3JhZ2VEYXRhU3luYzxUIGV4dGVuZHMge30gPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBJRGF0YVN5bmM8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOWvvuixoeOBriBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0U3RvcmFnZSgpOiBJU3RvcmFnZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IFtbSVN0b3JhZ2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIFtbSVN0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLoqK3lrppcbiAgICAgKi9cbiAgICBzZXRTdG9yYWdlKG5ld1N0b3JhZ2U6IElTdG9yYWdlKTogdGhpcztcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBbW0lEYXRhU3luY11dIGltcGxlbWFudCBjbGFzcyB3aGljaCB0YXJnZXQgaXMgW1tJU3RvcmFnZV1dLiBEZWZhdWx0IHN0b3JhZ2UgaXMgW1tXZWJTdG9yYWdlXV0uXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCkuWvvuixoeOBqOOBl+OBnyBbW0lEYXRhU3luY11dIOWun+ijheOCr+ODqeOCuS4g5pei5a6a5YCk44GvIFtbV2ViU3RvcmFnZV1dXG4gKi9cbmNsYXNzIFN0b3JhZ2VEYXRhU3luYyBpbXBsZW1lbnRzIElTdG9yYWdlRGF0YVN5bmMge1xuICAgIHByaXZhdGUgX3N0b3JhZ2U6IElTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHdlYlN0b3JhZ2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IFtbSVN0b3JhZ2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo5a++6LGh44GuIFtbSVN0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuioreWumlxuICAgICAqL1xuICAgIHNldFN0b3JhZ2UobmV3U3RvcmFnZTogSVN0b3JhZ2UpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IG5ld1N0b3JhZ2U7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdzdG9yYWdlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgaWQgPSByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCAnQSBcInVybFwiIHByb3BlcnR5IG9yIGZ1bmN0aW9uIG11c3QgYmUgc3BlY2lmaWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHJlc3BvbmNlOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgdm9pZCB8IG51bGw+O1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgICAgICBjYXNlICdwYXRjaCc6XG4gICAgICAgICAgICAgICAgcmVzcG9uY2UgPSB0aGlzLl9zdG9yYWdlLnNldEl0ZW0oaWQsIGNvbnRleHQudG9KU09OKCksIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShpZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyZWFkJzpcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oaWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCBgdW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlIGFzIFByb21pc2U8UGxhaW5PYmplY3Q+KTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLPj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNTVE9SQUdFID0gbmV3IFN0b3JhZ2VEYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7IElEYXRhU3luYyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkYXRhU3luY05VTEwgfSBmcm9tICcuL251bGwnO1xuXG5sZXQgX2RlZmF1bHQ6IElEYXRhU3luYyA9IGRhdGFTeW5jTlVMTDtcblxuLyoqXG4gKiBAZW4gR2V0IG9yIHVwZGF0ZSBkZWZhdWx0IFtbSURhdGFTeW5jXV0gb2JqZWN0LlxuICogQGphIOaXouWumuOBriBbW0lEYXRhU3luY11dIOOCquODluOCuOOCp+OCr+ODiOOBruWPluW+lyAvIOabtOaWsFxuICpcbiAqIEBwYXJhbSBuZXdTeW5jXG4gKiAgLSBgZW5gIG5ldyBkYXRhLXN5bmMgb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgosgZGF0YS1zeW5jIOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIGRhdGEtc3luYyBvYmplY3QuXG4gKiAgLSBgamFgIOS7peWJjeOBriBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U3luYyhuZXdTeW5jPzogSURhdGFTeW5jKTogSURhdGFTeW5jIHtcbiAgICBpZiAobnVsbCA9PSBuZXdTeW5jKSB7XG4gICAgICAgIHJldHVybiBfZGVmYXVsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRTeW5jID0gX2RlZmF1bHQ7XG4gICAgICAgIF9kZWZhdWx0ID0gbmV3U3luYztcbiAgICAgICAgcmV0dXJuIG9sZFN5bmM7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNjIiwiaXNGdW5jdGlvbiIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsImFqYXgiLCJ3ZWJTdG9yYWdlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBO0lB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LENBQUM7U0FDeEI7Ozs7O1FBTUQsVUFBVSxDQUFDLFVBQW9CO1lBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7Ozs7Ozs7UUFTRCxJQUFJLElBQUk7WUFDSixPQUFPLFNBQVMsQ0FBQztTQUNwQjs7Ozs7Ozs7Ozs7Ozs7O1FBZ0JELElBQUksQ0FBd0IsTUFBUyxFQUFFLE9BQW9CLEVBQUUsT0FBeUI7WUFDbEYsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxFQUFFLEVBQUU7Z0JBQ0wsTUFBTUgsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyw2QkFBNkIsRUFBRSxpREFBaUQsQ0FBQyxDQUFDO2FBQ2xIO1lBRUQsSUFBSSxRQUE0QyxDQUFDO1lBQ2pELFFBQVEsTUFBTTtnQkFDVixLQUFLLFFBQVEsQ0FBQztnQkFDZCxLQUFLLFFBQVEsQ0FBQztnQkFDZCxLQUFLLE9BQU87b0JBQ1IsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ2hFLE1BQU07Z0JBQ1YsS0FBSyxRQUFRO29CQUNULFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ2pELE1BQU07Z0JBQ1YsS0FBSyxNQUFNO29CQUNQLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBYyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzNELE1BQU07Z0JBQ1Y7b0JBQ0ksTUFBTUQsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyw2QkFBNkIsRUFBRSxtQkFBbUIsTUFBTSxFQUFFLENBQUMsQ0FBQzthQUNoRztZQUVELE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxRQUFnQyxDQUFDLENBQUM7WUFDdkUsT0FBTyxRQUFrQyxDQUFDO1NBQzdDO0tBQ0o7QUFFRCxVQUFhLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBZTs7SUNwSGpFLElBQUksUUFBUSxHQUFjLFlBQVksQ0FBQztJQUV2Qzs7Ozs7Ozs7Ozs7QUFXQSxhQUFnQixXQUFXLENBQUMsT0FBbUI7UUFDM0MsSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFO1lBQ2pCLE9BQU8sUUFBUSxDQUFDO1NBQ25CO2FBQU07WUFDSCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUM7WUFDekIsUUFBUSxHQUFHLE9BQU8sQ0FBQztZQUNuQixPQUFPLE9BQU8sQ0FBQztTQUNsQjtJQUNMLENBQUM7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZGF0YS1zeW5jLyJ9
