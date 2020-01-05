/*!
 * @cdp/data-sync 0.9.0
 *   web storage utility module
 */

import { checkCanceled } from '@cdp/promise';
import { makeResult, RESULT_CODE } from '@cdp/result';
import { ajax } from '@cdp/ajax';
import { isFunction } from '@cdp/core-utils';
import { webStorage } from '@cdp/web-storage';

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
        await checkCanceled(cancel);
        const responce = Promise.resolve('read' === method ? {} : undefined);
        context.trigger('@request', context, responce);
        return responce;
    }
}
const dataSyncNULL = new NullDataSync();

/** resolve lack property */
function resolveURL(context) {
    if (isFunction(context['url'])) {
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
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
        }
        params.method = _methodMap[method];
        // Ensure request data.
        if (null == params.data && ('create' === method || 'update' === method || 'patch' === method)) {
            params.data = context.toJSON();
        }
        // Ajax request
        const responce = ajax(url, params);
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
        this._storage = webStorage;
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
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
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
                throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, `unknown method: ${method}`);
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

export { dataSyncNULL, dataSyncREST, dataSyncSTORAGE, defaultSync };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsIm51bGwudHMiLCJpbnRlcm5hbC50cyIsInJlc3QudHMiLCJzdG9yYWdlLnRzIiwic2V0dGluZ3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLCBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBTWU5DID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19TWU5DX0RFQ0xBUkUgICAgICAgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUyA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAxLCAnaW52YWxpZCBzeW5jIHBhcmFtcy4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIFRoZSBbW0lEYXRhU3luY11dIGltcGxlbWFudCBjbGFzcyB3aGljaCBoYXMgbm8gZWZmZWN0cy5cbiAqIEBqYSDkvZXjgoLjgZfjgarjgYQgW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgTnVsbERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jPHt9PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lEYXRhU3luY11dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lEYXRhU3luY11dIOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dDx7fT4sIG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxTeW5jUmVzdWx0PEssIHt9Pj4ge1xuICAgICAgICBjb25zdCB7IGNhbmNlbCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBQcm9taXNlLnJlc29sdmUoJ3JlYWQnID09PSBtZXRob2QgPyB7fSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25jZSk7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBQcm9taXNlPFN5bmNSZXN1bHQ8Sywge30+PjtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY05VTEwgPSBuZXcgTnVsbERhdGFTeW5jKCkgYXMgSURhdGFTeW5jPHt9PjtcbiIsImltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3luY0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogcmVzb2x2ZSBsYWNrIHByb3BlcnR5ICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVVSTChjb250ZXh0OiBTeW5jQ29udGV4dCk6IHN0cmluZyB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dFsndXJsJ10pKSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0Wyd1cmwnXSgpIGFzIHN0cmluZztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY29udGV4dFsndXJsJ107XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBBamF4T3B0aW9ucywgYWpheCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVVSTCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIGludGVyZmFjZSBmb3IgW1tSZXN0RGF0YVN5bmNdXS5cbiAqIEBqYSBbW1Jlc3REYXRhU3luY11dIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc3REYXRhU3luY09wdGlvbnMgZXh0ZW5kcyBBamF4T3B0aW9uczwnanNvbic+IHtcbiAgICB1cmw/OiBzdHJpbmc7XG59XG5cbmNvbnN0IF9tZXRob2RNYXAgPSB7XG4gICAgY3JlYXRlOiAnUE9TVCcsXG4gICAgdXBkYXRlOiAnUFVUJyxcbiAgICBwYXRjaDogJ1BBVENIJyxcbiAgICBkZWxldGU6ICdERUxFVEUnLFxuICAgIHJlYWQ6ICdHRVQnXG59O1xuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggY29tcGxpYW50IFJFU1RmdWwuXG4gKiBAamEgUkVTVCDjgavmupbmi6DjgZfjgZ8gW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUmVzdERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdyZXN0JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc3Qgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAgUkVTVCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFJlc3REYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IGRhdGFUeXBlOiAnanNvbicgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgdXJsID0gcGFyYW1zLnVybCB8fCByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtcy5tZXRob2QgPSBfbWV0aG9kTWFwW21ldGhvZF07XG5cbiAgICAgICAgLy8gRW5zdXJlIHJlcXVlc3QgZGF0YS5cbiAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zLmRhdGEgJiYgKCdjcmVhdGUnID09PSBtZXRob2QgfHwgJ3VwZGF0ZScgPT09IG1ldGhvZCB8fCAncGF0Y2gnID09PSBtZXRob2QpKSB7XG4gICAgICAgICAgICBwYXJhbXMuZGF0YSA9IGNvbnRleHQudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBamF4IHJlcXVlc3RcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBhamF4KHVybCwgcGFyYW1zKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLPj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3IFJlc3REYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgSVN0b3JhZ2UsIElTdG9yYWdlT3B0aW9ucyB9IGZyb20gJ0BjZHAvY29yZS1zdG9yYWdlJztcbmltcG9ydCB7IHdlYlN0b3JhZ2UgfSBmcm9tICdAY2RwL3dlYi1zdG9yYWdlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIFtbSURhdGFTeW5jXV0gaW50ZXJmYWNlIGZvciBbW0lTdG9yYWdlXV0gYWNjZXNzb3IuXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCouOCr+OCu+ODg+OCteOCkuWCmeOBiOOCiyBbW0lEYXRhU3luY11dIOOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElTdG9yYWdlRGF0YVN5bmM8VCBleHRlbmRzIHt9ID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgSURhdGFTeW5jPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4gW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXM7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggdGFyZ2V0IGlzIFtbSVN0b3JhZ2VdXS4gRGVmYXVsdCBzdG9yYWdlIGlzIFtbV2ViU3RvcmFnZV1dLlxuICogQGphIFtbSVN0b3JhZ2VdXSDjgpLlr77osaHjgajjgZfjgZ8gW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrkuIOaXouWumuWApOOBryBbW1dlYlN0b3JhZ2VdXVxuICovXG5jbGFzcyBTdG9yYWdlRGF0YVN5bmMgaW1wbGVtZW50cyBJU3RvcmFnZURhdGFTeW5jIHtcbiAgICBwcml2YXRlIF9zdG9yYWdlOiBJU3RvcmFnZTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSB3ZWJTdG9yYWdlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElTdG9yYWdlRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOWvvuixoeOBriBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0U3RvcmFnZSgpOiBJU3RvcmFnZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IFtbSVN0b3JhZ2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIFtbSVN0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLoqK3lrppcbiAgICAgKi9cbiAgICBzZXRTdG9yYWdlKG5ld1N0b3JhZ2U6IElTdG9yYWdlKTogdGhpcyB7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBuZXdTdG9yYWdlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lEYXRhU3luY11dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lEYXRhU3luY11dIOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnc3RvcmFnZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0LCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PEs+PiB7XG4gICAgICAgIGNvbnN0IGlkID0gcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByZXNwb25jZTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IHZvaWQgfCBudWxsPjtcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgICAgY2FzZSAncGF0Y2gnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGlkLCBjb250ZXh0LnRvSlNPTigpLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgICAgICAgICAgcmVzcG9uY2UgPSB0aGlzLl9zdG9yYWdlLnJlbW92ZUl0ZW0oaWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmVhZCc6XG4gICAgICAgICAgICAgICAgcmVzcG9uY2UgPSB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGlkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgYHVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25jZSBhcyBQcm9taXNlPFBsYWluT2JqZWN0Pik7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jU1RPUkFHRSA9IG5ldyBTdG9yYWdlRGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM7XG4iLCJpbXBvcnQgeyBJRGF0YVN5bmMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZGF0YVN5bmNOVUxMIH0gZnJvbSAnLi9udWxsJztcblxubGV0IF9kZWZhdWx0OiBJRGF0YVN5bmMgPSBkYXRhU3luY05VTEw7XG5cbi8qKlxuICogQGVuIEdldCBvciB1cGRhdGUgZGVmYXVsdCBbW0lEYXRhU3luY11dIG9iamVjdC5cbiAqIEBqYSDml6Llrprjga4gW1tJRGF0YVN5bmNdXSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lj5blvpcgLyDmm7TmlrBcbiAqXG4gKiBAcGFyYW0gbmV3U3luY1xuICogIC0gYGVuYCBuZXcgZGF0YS1zeW5jIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgZGF0YS1zeW5jIOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi4gYHVuZGVmaW5lZGAg44GM5rih44GV44KM44KL5aC05ZCI44Gv54++5Zyo6Kit5a6a44GV44KM44Gm44GE44KLIGRhdGEtc3luYyDjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBkYXRhLXN5bmMgb2JqZWN0LlxuICogIC0gYGphYCDku6XliY3jga4gZGF0YS1zeW5jIOOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFN5bmMobmV3U3luYz86IElEYXRhU3luYyk6IElEYXRhU3luYyB7XG4gICAgaWYgKG51bGwgPT0gbmV3U3luYykge1xuICAgICAgICByZXR1cm4gX2RlZmF1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkU3luYyA9IF9kZWZhdWx0O1xuICAgICAgICBfZGVmYXVsdCA9IG5ld1N5bmM7XG4gICAgICAgIHJldHVybiBvbGRTeW5jO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQTtBQUVBLGdEQWNDO0FBZEQ7Ozs7O0lBVUk7SUFBQTtRQUNJLG9GQUF3RCxDQUFBO1FBQ3hELDJEQUFnQyxZ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QztRQUMzQixPQUFPLElBQUksQ0FBQztLQUNmOzs7Ozs7O0lBU0QsSUFBSSxJQUFJO1FBQ0osT0FBTyxTQUFTLENBQUM7S0FDcEI7Ozs7Ozs7Ozs7Ozs7OztJQWdCRCxJQUFJLENBQXdCLE1BQVMsRUFBRSxPQUFvQixFQUFFLE9BQXlCO1FBQ2xGLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ0wsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLDZCQUE2QixFQUFFLGlEQUFpRCxDQUFDLENBQUM7U0FDbEg7UUFFRCxJQUFJLFFBQTRDLENBQUM7UUFDakQsUUFBUSxNQUFNO1lBQ1YsS0FBSyxRQUFRLENBQUM7WUFDZCxLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssT0FBTztnQkFDUixRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDaEUsTUFBTTtZQUNWLEtBQUssUUFBUTtnQkFDVCxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNqRCxNQUFNO1lBQ1YsS0FBSyxNQUFNO2dCQUNQLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBYyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQzNELE1BQU07WUFDVjtnQkFDSSxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsNkJBQTZCLEVBQUUsbUJBQW1CLE1BQU0sRUFBRSxDQUFDLENBQUM7U0FDaEc7UUFFRCxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBZ0MsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sUUFBa0MsQ0FBQztLQUM3QztDQUNKO0FBRUQsTUFBYSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQWU7O0FDcEhqRSxJQUFJLFFBQVEsR0FBYyxZQUFZLENBQUM7QUFFdkM7Ozs7Ozs7Ozs7O0FBV0EsU0FBZ0IsV0FBVyxDQUFDLE9BQW1CO0lBQzNDLElBQUksSUFBSSxJQUFJLE9BQU8sRUFBRTtRQUNqQixPQUFPLFFBQVEsQ0FBQztLQUNuQjtTQUFNO1FBQ0gsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDbkIsT0FBTyxPQUFPLENBQUM7S0FDbEI7QUFDTCxDQUFDOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9kYXRhLXN5bmMvIn0=
