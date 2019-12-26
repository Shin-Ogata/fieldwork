/*!
 * @cdp/data-sync 0.9.0
 *   web storage utility module
 */

import { checkCanceled } from '@cdp/promise';
import { isFunction } from '@cdp/core-utils';
import { makeResult, RESULT_CODE } from '@cdp/result';
import { ajax } from '@cdp/ajax';

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

const _methodMap = {
    create: 'POST',
    update: 'PUT',
    patch: 'PATCH',
    delete: 'DELETE',
    read: 'GET'
};
/** @internal resolve lack property */
function resolveURL(context) {
    if (isFunction(context['url'])) {
        return context['url']();
    }
    else {
        return context['url'];
    }
}
/**
 * @en The [[IDataSync]] implemant class which compliant RESTful.
 * @ja REST に準拠した [[IDataSync]] 実装クラス
 */
class RestDataSync {
    ///////////////////////////////////////////////////////////////////////
    // implements: IDataSync
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
    async sync(method, context, options) {
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

export { dataSyncNULL, dataSyncREST };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsIm51bGwudHMiLCJyZXN0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMgKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgU1lOQyA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by16YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBNVkNfU1lOQ19ERUNMQVJFICAgICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMSwgJ2ludmFsaWQgc3luYyBwYXJhbXMuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggaGFzIG5vIGVmZmVjdHMuXG4gKiBAamEg5L2V44KC44GX44Gq44GEIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIE51bGxEYXRhU3luYyBpbXBsZW1lbnRzIElEYXRhU3luYzx7fT4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0PHt9Piwgb3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sywge30+PiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICBjb25zdCByZXNwb25jZSA9IFByb21pc2UucmVzb2x2ZSgncmVhZCcgPT09IG1ldGhvZCA/IHt9IDogdW5kZWZpbmVkKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLLCB7fT4+O1xuICAgIH1cblxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNOVUxMID0gbmV3IE51bGxEYXRhU3luYygpIGFzIElEYXRhU3luYzx7fT47XG4iLCJpbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgQWpheE9wdGlvbnMsIGFqYXggfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gT3B0aW9ucyBpbnRlcmZhY2UgZm9yIFtbUmVzdERhdGFTeW5jXV0uXG4gKiBAamEgW1tSZXN0RGF0YVN5bmNdXSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXN0RGF0YVN5bmNPcHRpb25zIGV4dGVuZHMgQWpheE9wdGlvbnM8J2pzb24nPiB7XG4gICAgdXJsPzogc3RyaW5nO1xufVxuXG5jb25zdCBfbWV0aG9kTWFwID0ge1xuICAgIGNyZWF0ZTogJ1BPU1QnLFxuICAgIHVwZGF0ZTogJ1BVVCcsXG4gICAgcGF0Y2g6ICdQQVRDSCcsXG4gICAgZGVsZXRlOiAnREVMRVRFJyxcbiAgICByZWFkOiAnR0VUJ1xufTtcblxuLyoqIEBpbnRlcm5hbCByZXNvbHZlIGxhY2sgcHJvcGVydHkgKi9cbmZ1bmN0aW9uIHJlc29sdmVVUkwoY29udGV4dDogU3luY0NvbnRleHQpOiBzdHJpbmcge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHRbJ3VybCddKSkge1xuICAgICAgICByZXR1cm4gY29udGV4dFsndXJsJ10oKSBhcyBzdHJpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHRbJ3VybCddO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggY29tcGxpYW50IFJFU1RmdWwuXG4gKiBAamEgUkVTVCDjgavmupbmi6DjgZfjgZ8gW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUmVzdERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXN0IG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIFJFU1Qg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBSZXN0RGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PEs+PiB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyBkYXRhVHlwZTogJ2pzb24nIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHVybCA9IHBhcmFtcy51cmwgfHwgcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsICdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBwYXJhbXMubWV0aG9kID0gX21ldGhvZE1hcFttZXRob2RdO1xuXG4gICAgICAgIC8vIEVuc3VyZSByZXF1ZXN0IGRhdGEuXG4gICAgICAgIGlmIChudWxsID09IHBhcmFtcy5kYXRhICYmICgnY3JlYXRlJyA9PT0gbWV0aG9kIHx8ICd1cGRhdGUnID09PSBtZXRob2QgfHwgJ3BhdGNoJyA9PT0gbWV0aG9kKSkge1xuICAgICAgICAgICAgcGFyYW1zLmRhdGEgPSBjb250ZXh0LnRvSlNPTigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWpheCByZXF1ZXN0XG4gICAgICAgIGNvbnN0IHJlc3BvbmNlID0gYWpheCh1cmwsIHBhcmFtcyk7XG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25jZSk7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+O1xuICAgIH1cblxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3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
