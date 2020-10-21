/*!
 * @cdp/data-sync 0.9.5
 *   web storage utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/promise'), require('@cdp/result'), require('@cdp/ajax'), require('@cdp/core-utils'), require('@cdp/web-storage')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/promise', '@cdp/result', '@cdp/ajax', '@cdp/core-utils', '@cdp/web-storage'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, promise, result, ajax, coreUtils, webStorage) { 'use strict';

    /* eslint-disable
        @typescript-eslint/no-namespace
     ,  @typescript-eslint/no-unused-vars
     ,  @typescript-eslint/restrict-plus-operands
     */
    globalThis.CDP_DECLARE = globalThis.CDP_DECLARE;
    (function () {
        /**
         * @en Extends error code definitions.
         * @ja 拡張通エラーコード定義
         */
        let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
        (function () {
            RESULT_CODE[RESULT_CODE["MVC_SYNC_DECLARE"] = 9007199254740991] = "MVC_SYNC_DECLARE";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_PARAMS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 60 /* SYNC */ + 1, 'invalid sync params.')] = "ERROR_MVC_INVALID_SYNC_PARAMS";
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
        return coreUtils.result(context, 'url');
    }

    const _methodMap = {
        create: 'POST',
        update: 'PUT',
        patch: 'PATCH',
        delete: 'DELETE',
        read: 'GET'
    };
    //__________________________________________________________________________________________________//
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
                case 'patch': {
                    const { data } = options || {};
                    const attrs = Object.assign(context.toJSON(), data);
                    responce = this._storage.setItem(id, attrs, options);
                    break;
                }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwibnVsbC50cyIsImludGVybmFsLnRzIiwicmVzdC50cyIsInN0b3JhZ2UudHMiLCJzZXR0aW5ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kc1xuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFNZTkMgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1NZTkNfREVDTEFSRSAgICAgICAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDEsICdpbnZhbGlkIHN5bmMgcGFyYW1zLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIGhhcyBubyBlZmZlY3RzLlxuICogQGphIOS9leOCguOBl+OBquOBhCBbW0lEYXRhU3luY11dIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBOdWxsRGF0YVN5bmMgaW1wbGVtZW50cyBJRGF0YVN5bmM8b2JqZWN0PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lEYXRhU3luY11dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lEYXRhU3luY11dIOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dDxvYmplY3Q+LCBvcHRpb25zPzogQ2FuY2VsYWJsZSk6IFByb21pc2U8U3luY1Jlc3VsdDxLLCBvYmplY3Q+PiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICBjb25zdCByZXNwb25jZSA9IFByb21pc2UucmVzb2x2ZSgncmVhZCcgPT09IG1ldGhvZCA/IHt9IDogdW5kZWZpbmVkKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLLCBvYmplY3Q+PjtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY05VTEwgPSBuZXcgTnVsbERhdGFTeW5jKCkgYXMgSURhdGFTeW5jPG9iamVjdD47XG4iLCJpbXBvcnQgeyByZXN1bHQgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3luY0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogcmVzb2x2ZSBsYWNrIHByb3BlcnR5ICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVVSTChjb250ZXh0OiBTeW5jQ29udGV4dCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc3VsdChjb250ZXh0LCAndXJsJyk7XG59XG4iLCJpbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEFqYXhPcHRpb25zLCBhamF4IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciBbW1Jlc3REYXRhU3luY11dLlxuICogQGphIFtbUmVzdERhdGFTeW5jXV0g44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdERhdGFTeW5jT3B0aW9ucyBleHRlbmRzIEFqYXhPcHRpb25zPCdqc29uJz4ge1xuICAgIHVybD86IHN0cmluZztcbn1cblxuY29uc3QgX21ldGhvZE1hcCA9IHtcbiAgICBjcmVhdGU6ICdQT1NUJyxcbiAgICB1cGRhdGU6ICdQVVQnLFxuICAgIHBhdGNoOiAnUEFUQ0gnLFxuICAgIGRlbGV0ZTogJ0RFTEVURScsXG4gICAgcmVhZDogJ0dFVCdcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggY29tcGxpYW50IFJFU1RmdWwuXG4gKiBAamEgUkVTVCDjgavmupbmi6DjgZfjgZ8gW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUmVzdERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdyZXN0JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc3Qgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAgUkVTVCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFJlc3REYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IGRhdGFUeXBlOiAnanNvbicgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgdXJsID0gcGFyYW1zLnVybCB8fCByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtcy5tZXRob2QgPSBfbWV0aG9kTWFwW21ldGhvZF07XG5cbiAgICAgICAgLy8gRW5zdXJlIHJlcXVlc3QgZGF0YS5cbiAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zLmRhdGEgJiYgKCdjcmVhdGUnID09PSBtZXRob2QgfHwgJ3VwZGF0ZScgPT09IG1ldGhvZCB8fCAncGF0Y2gnID09PSBtZXRob2QpKSB7XG4gICAgICAgICAgICBwYXJhbXMuZGF0YSA9IGNvbnRleHQudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBamF4IHJlcXVlc3RcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBhamF4KHVybCwgcGFyYW1zKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLPj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3IFJlc3REYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgSVN0b3JhZ2UsIElTdG9yYWdlT3B0aW9ucyB9IGZyb20gJ0BjZHAvY29yZS1zdG9yYWdlJztcbmltcG9ydCB7IHdlYlN0b3JhZ2UgfSBmcm9tICdAY2RwL3dlYi1zdG9yYWdlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jT3B0aW9ucyxcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IHJlc29sdmVVUkwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gW1tJRGF0YVN5bmNdXSBpbnRlcmZhY2UgZm9yIFtbSVN0b3JhZ2VdXSBhY2Nlc3Nvci5cbiAqIEBqYSBbW0lTdG9yYWdlXV0g44Ki44Kv44K744OD44K144KS5YKZ44GI44KLIFtbSURhdGFTeW5jXV0g44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSVN0b3JhZ2VEYXRhU3luYzxUIGV4dGVuZHMgb2JqZWN0ID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgSURhdGFTeW5jPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4gW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXM7XG59XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciBbW1N0b3JhZ2VEYXRhU3luY11dLlxuICogQGphIFtbU3RvcmFnZURhdGFTeW5jXV0g44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCB0eXBlIFN0b3JhZ2VEYXRhU3luY09wdGlvbnMgPSBJRGF0YVN5bmNPcHRpb25zICYgSVN0b3JhZ2VPcHRpb25zO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIHRhcmdldCBpcyBbW0lTdG9yYWdlXV0uIERlZmF1bHQgc3RvcmFnZSBpcyBbW1dlYlN0b3JhZ2VdXS5cbiAqIEBqYSBbW0lTdG9yYWdlXV0g44KS5a++6LGh44Go44GX44GfIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5LiDml6LlrprlgKTjga8gW1tXZWJTdG9yYWdlXV1cbiAqL1xuY2xhc3MgU3RvcmFnZURhdGFTeW5jIGltcGxlbWVudHMgSVN0b3JhZ2VEYXRhU3luYyB7XG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gd2ViU3RvcmFnZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJU3RvcmFnZURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4gW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXMge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gbmV3U3RvcmFnZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJRGF0YVN5bmNdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJRGF0YVN5bmNdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgaWQgPSByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCAnQSBcInVybFwiIHByb3BlcnR5IG9yIGZ1bmN0aW9uIG11c3QgYmUgc3BlY2lmaWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHJlc3BvbmNlOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgdm9pZCB8IG51bGw+O1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgICAgICBjYXNlICdwYXRjaCc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRhdGEgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgICAgICAgICAgY29uc3QgYXR0cnMgPSBPYmplY3QuYXNzaWduKGNvbnRleHQudG9KU09OKCksIGRhdGEpO1xuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGlkLCBhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKGlkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihpZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsIGB1bmtub3duIG1ldGhvZDogJHttZXRob2R9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uY2UgYXMgUHJvbWlzZTxQbGFpbk9iamVjdD4pO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgUHJvbWlzZTxTeW5jUmVzdWx0PEs+PjtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY1NUT1JBR0UgPSBuZXcgU3RvcmFnZURhdGFTeW5jKCkgYXMgSURhdGFTeW5jO1xuIiwiaW1wb3J0IHsgSURhdGFTeW5jIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRhdGFTeW5jTlVMTCB9IGZyb20gJy4vbnVsbCc7XG5cbmxldCBfZGVmYXVsdDogSURhdGFTeW5jID0gZGF0YVN5bmNOVUxMO1xuXG4vKipcbiAqIEBlbiBHZXQgb3IgdXBkYXRlIGRlZmF1bHQgW1tJRGF0YVN5bmNdXSBvYmplY3QuXG4gKiBAamEg5pei5a6a44GuIFtbSURhdGFTeW5jXV0g44Kq44OW44K444Kn44Kv44OI44Gu5Y+W5b6XIC8g5pu05pawXG4gKlxuICogQHBhcmFtIG5ld1N5bmNcbiAqICAtIGBlbmAgbmV3IGRhdGEtc3luYyBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCiyBkYXRhLXN5bmMg44Gu6L+U5Y2044Gu44G/6KGM44GGXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBvbGQgZGF0YS1zeW5jIG9iamVjdC5cbiAqICAtIGBqYWAg5Lul5YmN44GuIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTeW5jKG5ld1N5bmM/OiBJRGF0YVN5bmMpOiBJRGF0YVN5bmMge1xuICAgIGlmIChudWxsID09IG5ld1N5bmMpIHtcbiAgICAgICAgcmV0dXJuIF9kZWZhdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFN5bmMgPSBfZGVmYXVsdDtcbiAgICAgICAgX2RlZmF1bHQgPSBuZXdTeW5jO1xuICAgICAgICByZXR1cm4gb2xkU3luYztcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiY2MiLCJyZXN1bHQiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJhamF4Iiwid2ViU3RvcmFnZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7SUFNQSxnREFjQztJQWREOzs7OztRQVVJO1FBQUE7WUFDSSxvRkFBd0QsQ0FBQTtZQUN4RCwyREFBZ0MsWUFBQSxrQkFBa0IsZ0JBQXVCLGdCQUF1QixDQUFDLEVBQUUsc0JBQXNCLENBQUMsbUNBQUEsQ0FBQTtTQUM3SCxJQUFBO0lBQ0wsQ0FBQzs7SUNURDs7OztJQUlBLE1BQU0sWUFBWTs7Ozs7OztRQVNkLElBQUksSUFBSTtZQUNKLE9BQU8sTUFBTSxDQUFDO1NBQ2pCOzs7Ozs7Ozs7Ozs7Ozs7UUFnQkQsTUFBTSxJQUFJLENBQXdCLE1BQVMsRUFBRSxPQUE0QixFQUFFLE9BQW9CO1lBQzNGLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2pDLE1BQU1BLHFCQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssTUFBTSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztZQUNyRSxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7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
