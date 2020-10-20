/*!
 * @cdp/data-sync 0.9.0
 *   web storage utility module
 */

import { checkCanceled } from '@cdp/promise';
import { makeResult, RESULT_CODE } from '@cdp/result';
import { ajax } from '@cdp/ajax';
import { result } from '@cdp/core-utils';
import { webStorage } from '@cdp/web-storage';

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
        await checkCanceled(cancel);
        const responce = Promise.resolve('read' === method ? {} : undefined);
        context.trigger('@request', context, responce);
        return responce;
    }
}
const dataSyncNULL = new NullDataSync();

/** resolve lack property */
function resolveURL(context) {
    return result(context, 'url');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsIm51bGwudHMiLCJpbnRlcm5hbC50cyIsInJlc3QudHMiLCJzdG9yYWdlLnRzIiwic2V0dGluZ3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHNcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBTWU5DID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19TWU5DX0RFQ0xBUkUgICAgICAgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUyA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAxLCAnaW52YWxpZCBzeW5jIHBhcmFtcy4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIFRoZSBbW0lEYXRhU3luY11dIGltcGxlbWFudCBjbGFzcyB3aGljaCBoYXMgbm8gZWZmZWN0cy5cbiAqIEBqYSDkvZXjgoLjgZfjgarjgYQgW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgTnVsbERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jPG9iamVjdD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJRGF0YVN5bmNdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJRGF0YVN5bmNdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ251bGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQ8b2JqZWN0Piwgb3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sywgb2JqZWN0Pj4ge1xuICAgICAgICBjb25zdCB7IGNhbmNlbCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBQcm9taXNlLnJlc29sdmUoJ3JlYWQnID09PSBtZXRob2QgPyB7fSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25jZSk7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBQcm9taXNlPFN5bmNSZXN1bHQ8Sywgb2JqZWN0Pj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNOVUxMID0gbmV3IE51bGxEYXRhU3luYygpIGFzIElEYXRhU3luYzxvYmplY3Q+O1xuIiwiaW1wb3J0IHsgcmVzdWx0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN5bmNDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIHJlc29sdmUgbGFjayBwcm9wZXJ0eSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVVUkwoY29udGV4dDogU3luY0NvbnRleHQpOiBzdHJpbmcge1xuICAgIHJldHVybiByZXN1bHQoY29udGV4dCwgJ3VybCcpO1xufVxuIiwiaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBBamF4T3B0aW9ucywgYWpheCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVVSTCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIGludGVyZmFjZSBmb3IgW1tSZXN0RGF0YVN5bmNdXS5cbiAqIEBqYSBbW1Jlc3REYXRhU3luY11dIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc3REYXRhU3luY09wdGlvbnMgZXh0ZW5kcyBBamF4T3B0aW9uczwnanNvbic+IHtcbiAgICB1cmw/OiBzdHJpbmc7XG59XG5cbmNvbnN0IF9tZXRob2RNYXAgPSB7XG4gICAgY3JlYXRlOiAnUE9TVCcsXG4gICAgdXBkYXRlOiAnUFVUJyxcbiAgICBwYXRjaDogJ1BBVENIJyxcbiAgICBkZWxldGU6ICdERUxFVEUnLFxuICAgIHJlYWQ6ICdHRVQnXG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIGNvbXBsaWFudCBSRVNUZnVsLlxuICogQGphIFJFU1Qg44Gr5rqW5oug44GX44GfIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJlc3REYXRhU3luYyBpbXBsZW1lbnRzIElEYXRhU3luYyB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lEYXRhU3luY11dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lEYXRhU3luY11dIOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAncmVzdCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXN0IG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIFJFU1Qg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBSZXN0RGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PEs+PiB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyBkYXRhVHlwZTogJ2pzb24nIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHVybCA9IHBhcmFtcy51cmwgfHwgcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsICdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBwYXJhbXMubWV0aG9kID0gX21ldGhvZE1hcFttZXRob2RdO1xuXG4gICAgICAgIC8vIEVuc3VyZSByZXF1ZXN0IGRhdGEuXG4gICAgICAgIGlmIChudWxsID09IHBhcmFtcy5kYXRhICYmICgnY3JlYXRlJyA9PT0gbWV0aG9kIHx8ICd1cGRhdGUnID09PSBtZXRob2QgfHwgJ3BhdGNoJyA9PT0gbWV0aG9kKSkge1xuICAgICAgICAgICAgcGFyYW1zLmRhdGEgPSBjb250ZXh0LnRvSlNPTigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWpheCByZXF1ZXN0XG4gICAgICAgIGNvbnN0IHJlc3BvbmNlID0gYWpheCh1cmwsIHBhcmFtcyk7XG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25jZSk7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jUkVTVCA9IG5ldyBSZXN0RGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM7XG4iLCJpbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IElTdG9yYWdlLCBJU3RvcmFnZU9wdGlvbnMgfSBmcm9tICdAY2RwL2NvcmUtc3RvcmFnZSc7XG5pbXBvcnQgeyB3ZWJTdG9yYWdlIH0gZnJvbSAnQGNkcC93ZWItc3RvcmFnZSc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luY09wdGlvbnMsXG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIFtbSURhdGFTeW5jXV0gaW50ZXJmYWNlIGZvciBbW0lTdG9yYWdlXV0gYWNjZXNzb3IuXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCouOCr+OCu+ODg+OCteOCkuWCmeOBiOOCiyBbW0lEYXRhU3luY11dIOOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElTdG9yYWdlRGF0YVN5bmM8VCBleHRlbmRzIG9iamVjdCA9IFBsYWluT2JqZWN0PiBleHRlbmRzIElEYXRhU3luYzxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IFtbSVN0b3JhZ2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo5a++6LGh44GuIFtbSVN0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuioreWumlxuICAgICAqL1xuICAgIHNldFN0b3JhZ2UobmV3U3RvcmFnZTogSVN0b3JhZ2UpOiB0aGlzO1xufVxuXG4vKipcbiAqIEBlbiBPcHRpb25zIGludGVyZmFjZSBmb3IgW1tTdG9yYWdlRGF0YVN5bmNdXS5cbiAqIEBqYSBbW1N0b3JhZ2VEYXRhU3luY11dIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBTdG9yYWdlRGF0YVN5bmNPcHRpb25zID0gSURhdGFTeW5jT3B0aW9ucyAmIElTdG9yYWdlT3B0aW9ucztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBbW0lEYXRhU3luY11dIGltcGxlbWFudCBjbGFzcyB3aGljaCB0YXJnZXQgaXMgW1tJU3RvcmFnZV1dLiBEZWZhdWx0IHN0b3JhZ2UgaXMgW1tXZWJTdG9yYWdlXV0uXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCkuWvvuixoeOBqOOBl+OBnyBbW0lEYXRhU3luY11dIOWun+ijheOCr+ODqeOCuS4g5pei5a6a5YCk44GvIFtbV2ViU3RvcmFnZV1dXG4gKi9cbmNsYXNzIFN0b3JhZ2VEYXRhU3luYyBpbXBsZW1lbnRzIElTdG9yYWdlRGF0YVN5bmMge1xuICAgIHByaXZhdGUgX3N0b3JhZ2U6IElTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHdlYlN0b3JhZ2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IFtbSVN0b3JhZ2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo5a++6LGh44GuIFtbSVN0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuioreWumlxuICAgICAqL1xuICAgIHNldFN0b3JhZ2UobmV3U3RvcmFnZTogSVN0b3JhZ2UpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IG5ld1N0b3JhZ2U7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdzdG9yYWdlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PEs+PiB7XG4gICAgICAgIGNvbnN0IGlkID0gcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByZXNwb25jZTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IHZvaWQgfCBudWxsPjtcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgICAgY2FzZSAncGF0Y2gnOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkYXRhIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmFzc2lnbihjb250ZXh0LnRvSlNPTigpLCBkYXRhKTtcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShpZCwgYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShpZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyZWFkJzpcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oaWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCBgdW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlIGFzIFByb21pc2U8UGxhaW5PYmplY3Q+KTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLPj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNTVE9SQUdFID0gbmV3IFN0b3JhZ2VEYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7IElEYXRhU3luYyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkYXRhU3luY05VTEwgfSBmcm9tICcuL251bGwnO1xuXG5sZXQgX2RlZmF1bHQ6IElEYXRhU3luYyA9IGRhdGFTeW5jTlVMTDtcblxuLyoqXG4gKiBAZW4gR2V0IG9yIHVwZGF0ZSBkZWZhdWx0IFtbSURhdGFTeW5jXV0gb2JqZWN0LlxuICogQGphIOaXouWumuOBriBbW0lEYXRhU3luY11dIOOCquODluOCuOOCp+OCr+ODiOOBruWPluW+lyAvIOabtOaWsFxuICpcbiAqIEBwYXJhbSBuZXdTeW5jXG4gKiAgLSBgZW5gIG5ldyBkYXRhLXN5bmMgb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgosgZGF0YS1zeW5jIOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIGRhdGEtc3luYyBvYmplY3QuXG4gKiAgLSBgamFgIOS7peWJjeOBriBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U3luYyhuZXdTeW5jPzogSURhdGFTeW5jKTogSURhdGFTeW5jIHtcbiAgICBpZiAobnVsbCA9PSBuZXdTeW5jKSB7XG4gICAgICAgIHJldHVybiBfZGVmYXVsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRTeW5jID0gX2RlZmF1bHQ7XG4gICAgICAgIF9kZWZhdWx0ID0gbmV3U3luYztcbiAgICAgICAgcmV0dXJuIG9sZFN5bmM7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBOzs7OztBQU1BLGdEQWNDO0FBZEQ7Ozs7O0lBVUk7SUFBQTtRQUNJLG9GQUF3RCxDQUFBO1FBQ3hELDJEQUFnQyxZQUFBLGtCQUFrQixnQkFBdUIsZ0JBQXVCLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxtQ0FBQSxDQUFBO0tBQzdILElBQUE7QUFDTCxDQUFDOztBQ1REOzs7O0FBSUEsTUFBTSxZQUFZOzs7Ozs7O0lBU2QsSUFBSSxJQUFJO1FBQ0osT0FBTyxNQUFNLENBQUM7S0FDakI7Ozs7Ozs7Ozs7Ozs7OztJQWdCRCxNQUFNLElBQUksQ0FBd0IsTUFBUyxFQUFFLE9BQTRCLEVBQUUsT0FBb0I7UUFDM0YsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDakMsTUFBTUEsYUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLE1BQU0sR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFDckUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sUUFBMEMsQ0FBQztLQUNyRDtDQUNKO01BRVksWUFBWSxHQUFHLElBQUksWUFB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
