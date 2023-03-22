/*!
 * @cdp/data-sync 0.9.17
 *   web storage utility module
 */

import { checkCanceled } from '@cdp/promise';
import { makeResult, RESULT_CODE, toResult } from '@cdp/result';
import { ajax } from '@cdp/ajax';
import { result, deepMerge, isArray, isString, isFunction } from '@cdp/core-utils';
import { webStorage } from '@cdp/web-storage';

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
        RESULT_CODE[RESULT_CODE["MVC_SYNC_DECLARE"] = 9007199254740991] = "MVC_SYNC_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_PARAMS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 60 /* LOCAL_CODE_BASE.SYNC */ + 1, 'invalid sync params.')] = "ERROR_MVC_INVALID_SYNC_PARAMS";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 60 /* LOCAL_CODE_BASE.SYNC */ + 2, 'invalid sync storage entires.')] = "ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 60 /* LOCAL_CODE_BASE.SYNC */ + 3, 'data not found.')] = "ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND";
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

/** @internal resolve lack property */
function resolveURL(context) {
    return result(context, 'url');
}

/** @internal */
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
/** @internal check model or not */
function isModel(context) {
    return !!context.constructor['idAttribute'];
}
/** @internal create id */
function genId(url) {
    return `${url}:${Date.now().toString(36)}`;
}
/** @internal resolve key for localStorage */
function parseContext(context, separator) {
    const model = isModel(context);
    const url = resolveURL(context);
    const idAttr = context.constructor['idAttribute'];
    const data = (() => {
        const retval = {};
        if (model) {
            const valid = !isFunction(context['has']) ? false : context['has'](idAttr);
            retval[idAttr] = valid ? context.id : genId(url);
        }
        return retval;
    })();
    return {
        model,
        url,
        key: `${url}${model ? `${separator}${data[idAttr]}` : ''}`,
        data,
    };
}
//__________________________________________________________________________________________________//
/**
 * @en The [[IDataSync]] implemant class which target is [[IStorage]]. Default storage is [[WebStorage]].
 * @ja [[IStorage]] を対象とした [[IDataSync]] 実装クラス. 既定値は [[WebStorage]]
 */
class StorageDataSync {
    _storage;
    _separator;
    /**
     * constructor
     *
     * @param storage
     *  - `en` [[IStorage]] object
     *  - `ja` [[IStorage]] オブジェクト
     * @param options
     *  - `en` construction options
     *  - `ja` 構築オプション
     */
    constructor(storage, options) {
        this._storage = storage;
        this._separator = options?.separator || "::" /* Const.SEPARATOR */;
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
    /**
     * @en Set new id-separator.
     * @ja 新しい ID セパレータを設定
     *
     * @param newSeparator
     *  - `en` new separator string
     *  - `ja` 新しいセパレータ文字列
     * @returns
     *  - `en` old separator string
     *  - `ja` 以前い設定されていたセパレータ文字列
     */
    setIdSeparator(newSeparator) {
        const oldSeparator = this._separator;
        this._separator = newSeparator;
        return oldSeparator;
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
    async sync(method, context, options) {
        const { model, key, url, data } = parseContext(context, this._separator);
        if (!url) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
        }
        let responce;
        switch (method) {
            case 'create': {
                const opts = deepMerge({ data }, options);
                responce = await this.update(key, context, url, data[Object.keys(data)[0]], opts);
                break;
            }
            case 'update':
            case 'patch': {
                responce = await this.update(key, context, url, context.id, options);
                break;
            }
            case 'delete':
                responce = await this.destroy(key, context, url, options);
                break;
            case 'read':
                responce = await this.find(model, key, url, options);
                if (null == responce) {
                    throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND, `method: ${method}`);
                }
                break;
            default:
                throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, `unknown method: ${method}`);
        }
        context.trigger('@request', context, Promise.resolve(responce));
        return responce;
    }
    ///////////////////////////////////////////////////////////////////////
    // primate methods:
    /** @internal */
    async queryEntries(url, options) {
        const items = await this._storage.getItem(url, options);
        if (null == items) {
            return { ids: true, items: [] };
        }
        else if (isArray(items)) {
            return { ids: !items.length || isString(items[0]), items };
        }
        else {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY, `entry is not Array type.`);
        }
    }
    /** @internal */
    saveEntries(url, entries, options) {
        return this._storage.setItem(url, entries, options);
    }
    /** @internal */
    async find(model, key, url, options) {
        if (model) {
            return this._storage.getItem(key, options);
        }
        else {
            try {
                // multi-entry
                const { ids, items } = await this.queryEntries(url, options);
                if (ids) {
                    // findAll
                    const entires = [];
                    for (const id of items) {
                        const entry = await this._storage.getItem(`${url}${this._separator}${id}`, options);
                        entry && entires.push(entry);
                    }
                    return entires;
                }
                else {
                    return items;
                }
            }
            catch (e) {
                const result = toResult(e);
                if (RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY === result.code) {
                    return this._storage.getItem(key, options);
                }
                throw e;
            }
        }
    }
    /** @internal */
    async update(key, context, url, id, options) {
        const { data } = options || {};
        const attrs = Object.assign(context.toJSON(), data);
        await this._storage.setItem(key, attrs, options);
        if (key !== url) {
            const { ids, items } = await this.queryEntries(url, options);
            if (ids && id && !items.includes(id)) {
                items.push(id);
                await this.saveEntries(url, items, options);
            }
        }
        return this.find(true, key, url, options);
    }
    /** @internal */
    async destroy(key, context, url, options) {
        const old = await this._storage.getItem(key, options);
        await this._storage.removeItem(key, options);
        if (key !== url) {
            const { ids, items } = await this.queryEntries(url, options);
            if (ids && context.id) {
                const entries = items.filter(i => i !== context.id);
                await this.saveEntries(url, entries, options);
            }
        }
        return old;
    }
}
/**
 * @en Create [[IStorageDataSync]] object with [[IStorage]].
 * @ja [[IStorage]] を指定して, [[IStorageDataSync]] オブジェクトを構築
 *
 * @param storage
 *  - `en` [[IStorage]] object
 *  - `ja` [[IStorage]] オブジェクト
 * @param options
 *  - `en` construction options
 *  - `ja` 構築オプション
 */
const createStorageDataSync = (storage, options) => {
    return new StorageDataSync(storage, options);
};
const dataSyncSTORAGE = createStorageDataSync(webStorage);

/** @internal */ let _default = dataSyncNULL;
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

export { createStorageDataSync, dataSyncNULL, dataSyncREST, dataSyncSTORAGE, defaultSync };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsIm51bGwudHMiLCJpbnRlcm5hbC50cyIsInJlc3QudHMiLCJzdG9yYWdlLnRzIiwic2V0dGluZ3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBTWU5DID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19TWU5DX0RFQ0xBUkUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMgICAgICAgICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDEsICdpbnZhbGlkIHN5bmMgcGFyYW1zLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlkgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMiwgJ2ludmFsaWQgc3luYyBzdG9yYWdlIGVudGlyZXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9EQVRBX05PVF9GT1VORCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAzLCAnZGF0YSBub3QgZm91bmQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggaGFzIG5vIGVmZmVjdHMuXG4gKiBAamEg5L2V44KC44GX44Gq44GEIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIE51bGxEYXRhU3luYyBpbXBsZW1lbnRzIElEYXRhU3luYzxvYmplY3Q+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0PG9iamVjdD4sIG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxTeW5jUmVzdWx0PEssIG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgIGNvbnN0IHJlc3BvbmNlID0gUHJvbWlzZS5yZXNvbHZlKCdyZWFkJyA9PT0gbWV0aG9kID8ge30gOiB1bmRlZmluZWQpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uY2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgUHJvbWlzZTxTeW5jUmVzdWx0PEssIG9iamVjdD4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jTlVMTCA9IG5ldyBOdWxsRGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM8b2JqZWN0PjtcbiIsImltcG9ydCB7IHJlc3VsdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgcmVzb2x2ZSBsYWNrIHByb3BlcnR5ICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVVSTChjb250ZXh0OiBTeW5jQ29udGV4dCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc3VsdChjb250ZXh0LCAndXJsJyk7XG59XG4iLCJpbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEFqYXhPcHRpb25zLCBhamF4IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciBbW1Jlc3REYXRhU3luY11dLlxuICogQGphIFtbUmVzdERhdGFTeW5jXV0g44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdERhdGFTeW5jT3B0aW9ucyBleHRlbmRzIEFqYXhPcHRpb25zPCdqc29uJz4ge1xuICAgIHVybD86IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX21ldGhvZE1hcCA9IHtcbiAgICBjcmVhdGU6ICdQT1NUJyxcbiAgICB1cGRhdGU6ICdQVVQnLFxuICAgIHBhdGNoOiAnUEFUQ0gnLFxuICAgIGRlbGV0ZTogJ0RFTEVURScsXG4gICAgcmVhZDogJ0dFVCdcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggY29tcGxpYW50IFJFU1RmdWwuXG4gKiBAamEgUkVTVCDjgavmupbmi6DjgZfjgZ8gW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUmVzdERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdyZXN0JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc3Qgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAgUkVTVCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFJlc3REYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IGRhdGFUeXBlOiAnanNvbicgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgdXJsID0gcGFyYW1zLnVybCB8fCByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtcy5tZXRob2QgPSBfbWV0aG9kTWFwW21ldGhvZF07XG5cbiAgICAgICAgLy8gRW5zdXJlIHJlcXVlc3QgZGF0YS5cbiAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zLmRhdGEgJiYgKCdjcmVhdGUnID09PSBtZXRob2QgfHwgJ3VwZGF0ZScgPT09IG1ldGhvZCB8fCAncGF0Y2gnID09PSBtZXRob2QpKSB7XG4gICAgICAgICAgICBwYXJhbXMuZGF0YSA9IGNvbnRleHQudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBamF4IHJlcXVlc3RcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBhamF4KHVybCwgcGFyYW1zKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLPj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3IFJlc3REYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7XG4gICAgQWNjZXNzaWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc0FycmF5LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgZGVlcE1lcmdlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBJU3RvcmFnZSwgSVN0b3JhZ2VPcHRpb25zIH0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvd2ViLXN0b3JhZ2UnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmNPcHRpb25zLFxuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jT2JqZWN0LFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIFNFUEFSQVRPUiA9ICc6OicsXG59XG5cbi8qKlxuICogQGVuIFtbSURhdGFTeW5jXV0gaW50ZXJmYWNlIGZvciBbW0lTdG9yYWdlXV0gYWNjZXNzb3IuXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCouOCr+OCu+ODg+OCteOCkuWCmeOBiOOCiyBbW0lEYXRhU3luY11dIOOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElTdG9yYWdlRGF0YVN5bmM8VCBleHRlbmRzIG9iamVjdCA9IFN5bmNPYmplY3Q+IGV4dGVuZHMgSURhdGFTeW5jPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4gW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBbW1N0b3JhZ2VEYXRhU3luY11dIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICogQGphIFtbU3RvcmFnZURhdGFTeW5jXV0g5qeL56+J44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucyB7XG4gICAgc2VwYXJhdG9yPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBPcHRpb25zIGludGVyZmFjZSBmb3IgW1tTdG9yYWdlRGF0YVN5bmNdXS5cbiAqIEBqYSBbW1N0b3JhZ2VEYXRhU3luY11dIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBTdG9yYWdlRGF0YVN5bmNPcHRpb25zID0gSURhdGFTeW5jT3B0aW9ucyAmIElTdG9yYWdlT3B0aW9ucztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgbW9kZWwgb3Igbm90ICovXG5mdW5jdGlvbiBpc01vZGVsKGNvbnRleHQ6IFN5bmNDb250ZXh0KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKGNvbnRleHQuY29uc3RydWN0b3IgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVsnaWRBdHRyaWJ1dGUnXTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgaWQgKi9cbmZ1bmN0aW9uIGdlbklkKHVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dXJsfToke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfWA7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVzb2x2ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZSAqL1xuZnVuY3Rpb24gcGFyc2VDb250ZXh0KGNvbnRleHQ6IEFjY2Vzc2libGU8U3luY0NvbnRleHQ+LCBzZXBhcmF0b3I6IHN0cmluZyk6IHsgbW9kZWw6IGJvb2xlYW47IGtleTogc3RyaW5nOyB1cmw6IHN0cmluZzsgZGF0YTogeyBbaWRBdHRyOiBzdHJpbmddOiBzdHJpbmc7IH07IH0ge1xuICAgIGNvbnN0IG1vZGVsICA9IGlzTW9kZWwoY29udGV4dCk7XG4gICAgY29uc3QgdXJsICAgID0gcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICBjb25zdCBpZEF0dHIgPSAoY29udGV4dC5jb25zdHJ1Y3RvciBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pWydpZEF0dHJpYnV0ZSddO1xuICAgIGNvbnN0IGRhdGEgPSAoKCkgPT4ge1xuICAgICAgICBjb25zdCByZXR2YWwgPSB7fSBhcyB7IFtpZEF0dHI6IHN0cmluZ106IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZCAgICA9ICFpc0Z1bmN0aW9uKGNvbnRleHRbJ2hhcyddKSA/IGZhbHNlIDogY29udGV4dFsnaGFzJ10oaWRBdHRyKSBhcyBib29sZWFuO1xuICAgICAgICAgICAgcmV0dmFsW2lkQXR0cl0gPSB2YWxpZCA/IGNvbnRleHQuaWQgYXMgc3RyaW5nIDogZ2VuSWQodXJsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH0pKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIHVybCxcbiAgICAgICAga2V5OiBgJHt1cmx9JHttb2RlbCA/IGAke3NlcGFyYXRvcn0ke2RhdGFbaWRBdHRyXX1gIDogJyd9YCxcbiAgICAgICAgZGF0YSxcbiAgICB9O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIHRhcmdldCBpcyBbW0lTdG9yYWdlXV0uIERlZmF1bHQgc3RvcmFnZSBpcyBbW1dlYlN0b3JhZ2VdXS5cbiAqIEBqYSBbW0lTdG9yYWdlXV0g44KS5a++6LGh44Go44GX44GfIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5LiDml6LlrprlgKTjga8gW1tXZWJTdG9yYWdlXV1cbiAqL1xuY2xhc3MgU3RvcmFnZURhdGFTeW5jIGltcGxlbWVudHMgSVN0b3JhZ2VEYXRhU3luYyB7XG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogSVN0b3JhZ2U7XG4gICAgcHJpdmF0ZSBfc2VwYXJhdG9yOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIFtbSVN0b3JhZ2VdXSBvYmplY3RcbiAgICAgKiAgLSBgamFgIFtbSVN0b3JhZ2VdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0b3JhZ2U6IElTdG9yYWdlLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcbiAgICAgICAgdGhpcy5fc2VwYXJhdG9yID0gb3B0aW9ucz8uc2VwYXJhdG9yIHx8IENvbnN0LlNFUEFSQVRPUjtcbiAgICB9XG5cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIGltcGxlbWVudHM6IElTdG9yYWdlRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOWvvuixoeOBriBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0U3RvcmFnZSgpOiBJU3RvcmFnZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IFtbSVN0b3JhZ2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIFtbSVN0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLoqK3lrppcbiAgICAgKi9cbiAgICBzZXRTdG9yYWdlKG5ld1N0b3JhZ2U6IElTdG9yYWdlKTogdGhpcyB7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBuZXdTdG9yYWdlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgb2xkU2VwYXJhdG9yID0gdGhpcy5fc2VwYXJhdG9yO1xuICAgICAgICB0aGlzLl9zZXBhcmF0b3IgPSBuZXdTZXBhcmF0b3I7XG4gICAgICAgIHJldHVybiBvbGRTZXBhcmF0b3I7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJRGF0YVN5bmNdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJRGF0YVN5bmNdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgeyBtb2RlbCwga2V5LCB1cmwsIGRhdGEgfSA9IHBhcnNlQ29udGV4dChjb250ZXh0IGFzIEFjY2Vzc2libGU8U3luY0NvbnRleHQ+LCB0aGlzLl9zZXBhcmF0b3IpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByZXNwb25jZTogUGxhaW5PYmplY3QgfCB2b2lkIHwgbnVsbDtcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRzID0gZGVlcE1lcmdlKHsgZGF0YSB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IGF3YWl0IHRoaXMudXBkYXRlKGtleSwgY29udGV4dCwgdXJsLCBkYXRhW09iamVjdC5rZXlzKGRhdGEpWzBdXSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgICAgY2FzZSAncGF0Y2gnOiB7XG4gICAgICAgICAgICAgICAgcmVzcG9uY2UgPSBhd2FpdCB0aGlzLnVwZGF0ZShrZXksIGNvbnRleHQsIHVybCwgY29udGV4dC5pZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gYXdhaXQgdGhpcy5kZXN0cm95KGtleSwgY29udGV4dCwgdXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gYXdhaXQgdGhpcy5maW5kKG1vZGVsLCBrZXksIHVybCwgb3B0aW9ucykgYXMgUGxhaW5PYmplY3Q7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gcmVzcG9uY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfREFUQV9OT1RfRk9VTkQsIGBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgYHVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCBQcm9taXNlLnJlc29sdmUocmVzcG9uY2UgYXMgUGxhaW5PYmplY3QpKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFN5bmNSZXN1bHQ8Sz47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpbWF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlFbnRyaWVzKHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8eyBpZHM6IGJvb2xlYW47IGl0ZW1zOiAoUGxhaW5PYmplY3QgfCBzdHJpbmcpW107IH0+IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW08b2JqZWN0Pih1cmwsIG9wdGlvbnMpO1xuICAgICAgICBpZiAobnVsbCA9PSBpdGVtcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgaWRzOiB0cnVlLCBpdGVtczogW10gfTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaWRzOiAhaXRlbXMubGVuZ3RoIHx8IGlzU3RyaW5nKGl0ZW1zWzBdKSwgaXRlbXMgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0VOVFJZLCBgZW50cnkgaXMgbm90IEFycmF5IHR5cGUuYCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzYXZlRW50cmllcyh1cmw6IHN0cmluZywgZW50cmllczogc3RyaW5nW10sIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLnNldEl0ZW0odXJsLCBlbnRyaWVzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kKG1vZGVsOiBib29sZWFuLCBrZXk6IHN0cmluZywgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IFBsYWluT2JqZWN0W10gfCBudWxsPiB7XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gbXVsdGktZW50cnlcbiAgICAgICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgaWYgKGlkcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBmaW5kQWxsXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudGlyZXM6IFBsYWluT2JqZWN0W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpZCBvZiBpdGVtcyBhcyBzdHJpbmdbXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnkgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGAke3VybH0ke3RoaXMuX3NlcGFyYXRvcn0ke2lkfWAsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW50cnkgJiYgZW50aXJlcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW50aXJlcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXMgYXMgUGxhaW5PYmplY3RbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSA9PT0gcmVzdWx0LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZShrZXk6IHN0cmluZywgY29udGV4dDogU3luY0NvbnRleHQsIHVybDogc3RyaW5nLCBpZD86IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IGRhdGEgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmFzc2lnbihjb250ZXh0LnRvSlNPTigpLCBkYXRhKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGtleSwgYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoa2V5ICE9PSB1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChpZHMgJiYgaWQgJiYgIWl0ZW1zLmluY2x1ZGVzKGlkKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUVudHJpZXModXJsLCBpdGVtcyBhcyBzdHJpbmdbXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZmluZCh0cnVlLCBrZXksIHVybCwgb3B0aW9ucykgYXMgUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRlc3Ryb3koa2V5OiBzdHJpbmcsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCB1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCBvbGQgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW0oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChrZXkgIT09IHVybCkge1xuICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKGlkcyAmJiBjb250ZXh0LmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IGl0ZW1zLmZpbHRlcihpID0+IGkgIT09IGNvbnRleHQuaWQpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUVudHJpZXModXJsLCBlbnRyaWVzIGFzIHN0cmluZ1tdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2xkIGFzIFBsYWluT2JqZWN0O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbSVN0b3JhZ2VEYXRhU3luY11dIG9iamVjdCB3aXRoIFtbSVN0b3JhZ2VdXS5cbiAqIEBqYSBbW0lTdG9yYWdlXV0g44KS5oyH5a6a44GX44GmLCBbW0lTdG9yYWdlRGF0YVN5bmNdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc3RvcmFnZVxuICogIC0gYGVuYCBbW0lTdG9yYWdlXV0gb2JqZWN0XG4gKiAgLSBgamFgIFtbSVN0b3JhZ2VdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zXG4gKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgY3JlYXRlU3RvcmFnZURhdGFTeW5jID0gKHN0b3JhZ2U6IElTdG9yYWdlLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucyk6IElTdG9yYWdlRGF0YVN5bmMgPT4ge1xuICAgIHJldHVybiBuZXcgU3RvcmFnZURhdGFTeW5jKHN0b3JhZ2UsIG9wdGlvbnMpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jU1RPUkFHRSA9IGNyZWF0ZVN0b3JhZ2VEYXRhU3luYyh3ZWJTdG9yYWdlKTtcbiIsImltcG9ydCB7IElEYXRhU3luYyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkYXRhU3luY05VTEwgfSBmcm9tICcuL251bGwnO1xuXG4vKiogQGludGVybmFsICovIGxldCBfZGVmYXVsdDogSURhdGFTeW5jID0gZGF0YVN5bmNOVUxMO1xuXG4vKipcbiAqIEBlbiBHZXQgb3IgdXBkYXRlIGRlZmF1bHQgW1tJRGF0YVN5bmNdXSBvYmplY3QuXG4gKiBAamEg5pei5a6a44GuIFtbSURhdGFTeW5jXV0g44Kq44OW44K444Kn44Kv44OI44Gu5Y+W5b6XIC8g5pu05pawXG4gKlxuICogQHBhcmFtIG5ld1N5bmNcbiAqICAtIGBlbmAgbmV3IGRhdGEtc3luYyBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCiyBkYXRhLXN5bmMg44Gu6L+U5Y2044Gu44G/6KGM44GGXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBvbGQgZGF0YS1zeW5jIG9iamVjdC5cbiAqICAtIGBqYWAg5Lul5YmN44GuIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTeW5jKG5ld1N5bmM/OiBJRGF0YVN5bmMpOiBJRGF0YVN5bmMge1xuICAgIGlmIChudWxsID09IG5ld1N5bmMpIHtcbiAgICAgICAgcmV0dXJuIF9kZWZhdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFN5bmMgPSBfZGVmYXVsdDtcbiAgICAgICAgX2RlZmF1bHQgPSBuZXdTeW5jO1xuICAgICAgICByZXR1cm4gb2xkU3luYztcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiY2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUE7OztBQUdHO0FBRUgsQ0FBQSxZQUFxQjtBQU1qQjs7O0FBR0c7QUFDSCxJQUFBLElBS0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7QUFMRCxJQUFBLENBQUEsWUFBdUI7QUFD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QUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDbEMsZ0JBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDZixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEtBQWlCLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDM0QsYUFBQTtBQUNKLFNBQUE7QUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQWdDLENBQUM7S0FDNUU7O0lBR08sTUFBTSxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQW9CLEVBQUUsR0FBVyxFQUFFLE9BQWdDLEVBQUE7QUFDbEcsUUFBQSxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM3QyxJQUFJLEdBQUcsS0FBSyxHQUFHLEVBQUU7QUFDYixZQUFBLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM3RCxZQUFBLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBQyxFQUFFLEVBQUU7QUFDbkIsZ0JBQUEsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxPQUFtQixFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzdELGFBQUE7QUFDSixTQUFBO0FBQ0QsUUFBQSxPQUFPLEdBQWtCLENBQUM7S0FDN0I7QUFDSixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7QUFVRztNQUNVLHFCQUFxQixHQUFHLENBQUMsT0FBaUIsRUFBRSxPQUE0QyxLQUFzQjtBQUN2SCxJQUFBLE9BQU8sSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2pELEVBQUU7TUFFVyxlQUFlLEdBQUcscUJBQXFCLENBQUMsVUFBVTs7QUNqVS9ELGlCQUFpQixJQUFJLFFBQVEsR0FBYyxZQUFZLENBQUM7QUFFeEQ7Ozs7Ozs7Ozs7QUFVRztBQUNHLFNBQVUsV0FBVyxDQUFDLE9BQW1CLEVBQUE7SUFDM0MsSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFO0FBQ2pCLFFBQUEsT0FBTyxRQUFRLENBQUM7QUFDbkIsS0FBQTtBQUFNLFNBQUE7UUFDSCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUM7UUFDekIsUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUNuQixRQUFBLE9BQU8sT0FBTyxDQUFDO0FBQ2xCLEtBQUE7QUFDTDs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZGF0YS1zeW5jLyJ9