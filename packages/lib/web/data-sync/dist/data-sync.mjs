/*!
 * @cdp/data-sync 0.9.13
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
    @typescript-eslint/restrict-plus-operands,
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張通エラーコード定義
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsIm51bGwudHMiLCJpbnRlcm5hbC50cyIsInJlc3QudHMiLCJzdG9yYWdlLnRzIiwic2V0dGluZ3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBTWU5DID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19TWU5DX0RFQ0xBUkUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMgICAgICAgICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDEsICdpbnZhbGlkIHN5bmMgcGFyYW1zLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlkgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMiwgJ2ludmFsaWQgc3luYyBzdG9yYWdlIGVudGlyZXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9EQVRBX05PVF9GT1VORCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAzLCAnZGF0YSBub3QgZm91bmQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggaGFzIG5vIGVmZmVjdHMuXG4gKiBAamEg5L2V44KC44GX44Gq44GEIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIE51bGxEYXRhU3luYyBpbXBsZW1lbnRzIElEYXRhU3luYzxvYmplY3Q+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0PG9iamVjdD4sIG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxTeW5jUmVzdWx0PEssIG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgIGNvbnN0IHJlc3BvbmNlID0gUHJvbWlzZS5yZXNvbHZlKCdyZWFkJyA9PT0gbWV0aG9kID8ge30gOiB1bmRlZmluZWQpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uY2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgUHJvbWlzZTxTeW5jUmVzdWx0PEssIG9iamVjdD4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jTlVMTCA9IG5ldyBOdWxsRGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM8b2JqZWN0PjtcbiIsImltcG9ydCB7IHJlc3VsdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgcmVzb2x2ZSBsYWNrIHByb3BlcnR5ICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVVSTChjb250ZXh0OiBTeW5jQ29udGV4dCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc3VsdChjb250ZXh0LCAndXJsJyk7XG59XG4iLCJpbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEFqYXhPcHRpb25zLCBhamF4IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciBbW1Jlc3REYXRhU3luY11dLlxuICogQGphIFtbUmVzdERhdGFTeW5jXV0g44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdERhdGFTeW5jT3B0aW9ucyBleHRlbmRzIEFqYXhPcHRpb25zPCdqc29uJz4ge1xuICAgIHVybD86IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX21ldGhvZE1hcCA9IHtcbiAgICBjcmVhdGU6ICdQT1NUJyxcbiAgICB1cGRhdGU6ICdQVVQnLFxuICAgIHBhdGNoOiAnUEFUQ0gnLFxuICAgIGRlbGV0ZTogJ0RFTEVURScsXG4gICAgcmVhZDogJ0dFVCdcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgW1tJRGF0YVN5bmNdXSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggY29tcGxpYW50IFJFU1RmdWwuXG4gKiBAamEgUkVTVCDjgavmupbmi6DjgZfjgZ8gW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUmVzdERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdyZXN0JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc3Qgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAgUkVTVCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFJlc3REYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IGRhdGFUeXBlOiAnanNvbicgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgdXJsID0gcGFyYW1zLnVybCB8fCByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtcy5tZXRob2QgPSBfbWV0aG9kTWFwW21ldGhvZF07XG5cbiAgICAgICAgLy8gRW5zdXJlIHJlcXVlc3QgZGF0YS5cbiAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zLmRhdGEgJiYgKCdjcmVhdGUnID09PSBtZXRob2QgfHwgJ3VwZGF0ZScgPT09IG1ldGhvZCB8fCAncGF0Y2gnID09PSBtZXRob2QpKSB7XG4gICAgICAgICAgICBwYXJhbXMuZGF0YSA9IGNvbnRleHQudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBamF4IHJlcXVlc3RcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBhamF4KHVybCwgcGFyYW1zKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLPj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3IFJlc3REYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGRlZXBNZXJnZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b1Jlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgSVN0b3JhZ2UsIElTdG9yYWdlT3B0aW9ucyB9IGZyb20gJ0BjZHAvY29yZS1zdG9yYWdlJztcbmltcG9ydCB7IHdlYlN0b3JhZ2UgfSBmcm9tICdAY2RwL3dlYi1zdG9yYWdlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jT3B0aW9ucyxcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY09iamVjdCxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVVSTCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBTRVBBUkFUT1IgPSAnOjonLFxufVxuXG4vKipcbiAqIEBlbiBbW0lEYXRhU3luY11dIGludGVyZmFjZSBmb3IgW1tJU3RvcmFnZV1dIGFjY2Vzc29yLlxuICogQGphIFtbSVN0b3JhZ2VdXSDjgqLjgq/jgrvjg4PjgrXjgpLlgpnjgYjjgosgW1tJRGF0YVN5bmNdXSDjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJU3RvcmFnZURhdGFTeW5jPFQgZXh0ZW5kcyBvYmplY3QgPSBTeW5jT2JqZWN0PiBleHRlbmRzIElEYXRhU3luYzxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IFtbSVN0b3JhZ2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo5a++6LGh44GuIFtbSVN0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuioreWumlxuICAgICAqL1xuICAgIHNldFN0b3JhZ2UobmV3U3RvcmFnZTogSVN0b3JhZ2UpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgaWQtc2VwYXJhdG9yLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgSUQg44K744OR44Os44O844K/44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3U2VwYXJhdG9yXG4gICAgICogIC0gYGVuYCBuZXcgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5paw44GX44GE44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDku6XliY3jgYToqK3lrprjgZXjgozjgabjgYTjgZ/jgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBzZXRJZFNlcGFyYXRvcihuZXdTZXBhcmF0b3I6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gW1tTdG9yYWdlRGF0YVN5bmNdXSBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAqIEBqYSBbW1N0b3JhZ2VEYXRhU3luY11dIOani+evieOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMge1xuICAgIHNlcGFyYXRvcj86IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyBpbnRlcmZhY2UgZm9yIFtbU3RvcmFnZURhdGFTeW5jXV0uXG4gKiBAamEgW1tTdG9yYWdlRGF0YVN5bmNdXSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IHR5cGUgU3RvcmFnZURhdGFTeW5jT3B0aW9ucyA9IElEYXRhU3luY09wdGlvbnMgJiBJU3RvcmFnZU9wdGlvbnM7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNoZWNrIG1vZGVsIG9yIG5vdCAqL1xuZnVuY3Rpb24gaXNNb2RlbChjb250ZXh0OiBTeW5jQ29udGV4dCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIWNvbnRleHQuY29uc3RydWN0b3JbJ2lkQXR0cmlidXRlJ107XG59XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIGlkICovXG5mdW5jdGlvbiBnZW5JZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3VybH06JHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX1gO1xufVxuXG4vKiogQGludGVybmFsIHJlc29sdmUga2V5IGZvciBsb2NhbFN0b3JhZ2UgKi9cbmZ1bmN0aW9uIHBhcnNlQ29udGV4dChjb250ZXh0OiBTeW5jQ29udGV4dCwgc2VwYXJhdG9yOiBzdHJpbmcpOiB7IG1vZGVsOiBib29sZWFuOyBrZXk6IHN0cmluZzsgdXJsOiBzdHJpbmc7IGRhdGE6IHsgW2lkQXR0cjogc3RyaW5nXTogc3RyaW5nOyB9OyB9IHtcbiAgICBjb25zdCBtb2RlbCAgPSBpc01vZGVsKGNvbnRleHQpO1xuICAgIGNvbnN0IHVybCAgICA9IHJlc29sdmVVUkwoY29udGV4dCk7XG4gICAgY29uc3QgaWRBdHRyID0gY29udGV4dC5jb25zdHJ1Y3RvclsnaWRBdHRyaWJ1dGUnXTtcbiAgICBjb25zdCBkYXRhID0gKCgpID0+IHtcbiAgICAgICAgY29uc3QgcmV0dmFsID0ge30gYXMgeyBbaWRBdHRyOiBzdHJpbmddOiBzdHJpbmc7IH07XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWQgICAgPSAhaXNGdW5jdGlvbihjb250ZXh0WydoYXMnXSkgPyBmYWxzZSA6IGNvbnRleHRbJ2hhcyddKGlkQXR0cikgYXMgYm9vbGVhbjtcbiAgICAgICAgICAgIHJldHZhbFtpZEF0dHJdID0gdmFsaWQgPyBjb250ZXh0LmlkIGFzIHN0cmluZyA6IGdlbklkKHVybCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9KSgpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICB1cmwsXG4gICAgICAgIGtleTogYCR7dXJsfSR7bW9kZWwgPyBgJHtzZXBhcmF0b3J9JHtkYXRhW2lkQXR0cl19YCA6ICcnfWAsXG4gICAgICAgIGRhdGEsXG4gICAgfTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBbW0lEYXRhU3luY11dIGltcGxlbWFudCBjbGFzcyB3aGljaCB0YXJnZXQgaXMgW1tJU3RvcmFnZV1dLiBEZWZhdWx0IHN0b3JhZ2UgaXMgW1tXZWJTdG9yYWdlXV0uXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCkuWvvuixoeOBqOOBl+OBnyBbW0lEYXRhU3luY11dIOWun+ijheOCr+ODqeOCuS4g5pei5a6a5YCk44GvIFtbV2ViU3RvcmFnZV1dXG4gKi9cbmNsYXNzIFN0b3JhZ2VEYXRhU3luYyBpbXBsZW1lbnRzIElTdG9yYWdlRGF0YVN5bmMge1xuICAgIHByaXZhdGUgX3N0b3JhZ2U6IElTdG9yYWdlO1xuICAgIHByaXZhdGUgX3NlcGFyYXRvcjogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdG9yYWdlXG4gICAgICogIC0gYGVuYCBbW0lTdG9yYWdlXV0gb2JqZWN0XG4gICAgICogIC0gYGphYCBbW0lTdG9yYWdlXV0g44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdG9yYWdlOiBJU3RvcmFnZSwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgICAgIHRoaXMuX3NlcGFyYXRvciA9IG9wdGlvbnM/LnNlcGFyYXRvciB8fCBDb25zdC5TRVBBUkFUT1I7XG4gICAgfVxuXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBpbXBsZW1lbnRzOiBJU3RvcmFnZURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4gW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXMge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gbmV3U3RvcmFnZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgaWQtc2VwYXJhdG9yLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgSUQg44K744OR44Os44O844K/44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3U2VwYXJhdG9yXG4gICAgICogIC0gYGVuYCBuZXcgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5paw44GX44GE44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDku6XliY3jgYToqK3lrprjgZXjgozjgabjgYTjgZ/jgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBzZXRJZFNlcGFyYXRvcihuZXdTZXBhcmF0b3I6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG9sZFNlcGFyYXRvciA9IHRoaXMuX3NlcGFyYXRvcjtcbiAgICAgICAgdGhpcy5fc2VwYXJhdG9yID0gbmV3U2VwYXJhdG9yO1xuICAgICAgICByZXR1cm4gb2xkU2VwYXJhdG9yO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdzdG9yYWdlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PEs+PiB7XG4gICAgICAgIGNvbnN0IHsgbW9kZWwsIGtleSwgdXJsLCBkYXRhIH0gPSBwYXJzZUNvbnRleHQoY29udGV4dCwgdGhpcy5fc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsICdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcmVzcG9uY2U6IFBsYWluT2JqZWN0IHwgdm9pZCB8IG51bGw7XG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0cyA9IGRlZXBNZXJnZSh7IGRhdGEgfSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgcmVzcG9uY2UgPSBhd2FpdCB0aGlzLnVwZGF0ZShrZXksIGNvbnRleHQsIHVybCwgZGF0YVtPYmplY3Qua2V5cyhkYXRhKVswXV0sIG9wdHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3BhdGNoJzoge1xuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gYXdhaXQgdGhpcy51cGRhdGUoa2V5LCBjb250ZXh0LCB1cmwsIGNvbnRleHQuaWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IGF3YWl0IHRoaXMuZGVzdHJveShrZXksIGNvbnRleHQsIHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyZWFkJzpcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IGF3YWl0IHRoaXMuZmluZChtb2RlbCwga2V5LCB1cmwsIG9wdGlvbnMpIGFzIFBsYWluT2JqZWN0O1xuICAgICAgICAgICAgICAgIGlmIChudWxsID09IHJlc3BvbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5ELCBgbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsIGB1bmtub3duIG1ldGhvZDogJHttZXRob2R9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgUHJvbWlzZS5yZXNvbHZlKHJlc3BvbmNlIGFzIFBsYWluT2JqZWN0KSk7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBTeW5jUmVzdWx0PEs+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaW1hdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5RW50cmllcyh1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPHsgaWRzOiBib29sZWFuOyBpdGVtczogKFBsYWluT2JqZWN0IHwgc3RyaW5nKVtdOyB9PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtPG9iamVjdD4odXJsLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaXRlbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGlkczogdHJ1ZSwgaXRlbXM6IFtdIH07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGlkczogIWl0ZW1zLmxlbmd0aCB8fCBpc1N0cmluZyhpdGVtc1swXSksIGl0ZW1zIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSwgYGVudHJ5IGlzIG5vdCBBcnJheSB0eXBlLmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgc2F2ZUVudHJpZXModXJsOiBzdHJpbmcsIGVudHJpZXM6IHN0cmluZ1tdLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHVybCwgZW50cmllcywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZmluZChtb2RlbDogYm9vbGVhbiwga2V5OiBzdHJpbmcsIHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCBQbGFpbk9iamVjdFtdIHwgbnVsbD4ge1xuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGtleSwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIG11bHRpLWVudHJ5XG4gICAgICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGlmIChpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZmluZEFsbFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpcmVzOiBQbGFpbk9iamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaWQgb2YgaXRlbXMgYXMgc3RyaW5nW10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihgJHt1cmx9JHt0aGlzLl9zZXBhcmF0b3J9JHtpZH1gLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5ICYmIGVudGlyZXMucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVudGlyZXM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW1zIGFzIFBsYWluT2JqZWN0W107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGlmIChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlkgPT09IHJlc3VsdC5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGtleSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGUoa2V5OiBzdHJpbmcsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCB1cmw6IHN0cmluZywgaWQ/OiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgeyBkYXRhIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCBhdHRycyA9IE9iamVjdC5hc3NpZ24oY29udGV4dC50b0pTT04oKSwgZGF0YSk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGtleSAhPT0gdXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoaWRzICYmIGlkICYmICFpdGVtcy5pbmNsdWRlcyhpZCkpIHtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVFbnRyaWVzKHVybCwgaXRlbXMgYXMgc3RyaW5nW10sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmZpbmQodHJ1ZSwga2V5LCB1cmwsIG9wdGlvbnMpIGFzIFByb21pc2U8UGxhaW5PYmplY3QgfCBudWxsPjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBkZXN0cm95KGtleTogc3RyaW5nLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+IHtcbiAgICAgICAgY29uc3Qgb2xkID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXksIG9wdGlvbnMpO1xuICAgICAgICBpZiAoa2V5ICE9PSB1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChpZHMgJiYgY29udGV4dC5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJpZXMgPSBpdGVtcy5maWx0ZXIoaSA9PiBpICE9PSBjb250ZXh0LmlkKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVFbnRyaWVzKHVybCwgZW50cmllcyBhcyBzdHJpbmdbXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9sZCBhcyBQbGFpbk9iamVjdDtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBbW0lTdG9yYWdlRGF0YVN5bmNdXSBvYmplY3Qgd2l0aCBbW0lTdG9yYWdlXV0uXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCkuaMh+WumuOBl+OBpiwgW1tJU3RvcmFnZURhdGFTeW5jXV0g44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIHN0b3JhZ2VcbiAqICAtIGBlbmAgW1tJU3RvcmFnZV1dIG9iamVjdFxuICogIC0gYGphYCBbW0lTdG9yYWdlXV0g44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9uc1xuICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVN0b3JhZ2VEYXRhU3luYyA9IChzdG9yYWdlOiBJU3RvcmFnZSwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMpOiBJU3RvcmFnZURhdGFTeW5jID0+IHtcbiAgICByZXR1cm4gbmV3IFN0b3JhZ2VEYXRhU3luYyhzdG9yYWdlLCBvcHRpb25zKTtcbn07XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY1NUT1JBR0UgPSBjcmVhdGVTdG9yYWdlRGF0YVN5bmMod2ViU3RvcmFnZSk7XG4iLCJpbXBvcnQgeyBJRGF0YVN5bmMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZGF0YVN5bmNOVUxMIH0gZnJvbSAnLi9udWxsJztcblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2RlZmF1bHQ6IElEYXRhU3luYyA9IGRhdGFTeW5jTlVMTDtcblxuLyoqXG4gKiBAZW4gR2V0IG9yIHVwZGF0ZSBkZWZhdWx0IFtbSURhdGFTeW5jXV0gb2JqZWN0LlxuICogQGphIOaXouWumuOBriBbW0lEYXRhU3luY11dIOOCquODluOCuOOCp+OCr+ODiOOBruWPluW+lyAvIOabtOaWsFxuICpcbiAqIEBwYXJhbSBuZXdTeW5jXG4gKiAgLSBgZW5gIG5ldyBkYXRhLXN5bmMgb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgosgZGF0YS1zeW5jIOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIGRhdGEtc3luYyBvYmplY3QuXG4gKiAgLSBgamFgIOS7peWJjeOBriBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U3luYyhuZXdTeW5jPzogSURhdGFTeW5jKTogSURhdGFTeW5jIHtcbiAgICBpZiAobnVsbCA9PSBuZXdTeW5jKSB7XG4gICAgICAgIHJldHVybiBfZGVmYXVsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRTeW5jID0gX2RlZmF1bHQ7XG4gICAgICAgIF9kZWZhdWx0ID0gbmV3U3luYztcbiAgICAgICAgcmV0dXJuIG9sZFN5bmM7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBOzs7O0FBSUc7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQUxELElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsa0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxrQkFBd0UsQ0FBQTtRQUN4RSxXQUFn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LE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsS0FBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUMzRCxhQUFBO0FBQ0osU0FBQTtBQUNELFFBQUEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBZ0MsQ0FBQztLQUM1RTs7SUFHTyxNQUFNLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBb0IsRUFBRSxHQUFXLEVBQUUsT0FBZ0MsRUFBQTtBQUNsRyxRQUFBLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRTtBQUNiLFlBQUEsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzdELFlBQUEsSUFBSSxHQUFHLElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRTtBQUNuQixnQkFBQSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLE9BQW1CLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDN0QsYUFBQTtBQUNKLFNBQUE7QUFDRCxRQUFBLE9BQU8sR0FBa0IsQ0FBQztLQUM3QjtBQUNKLENBQUE7QUFFRDs7Ozs7Ozs7OztBQVVHO01BQ1UscUJBQXFCLEdBQUcsQ0FBQyxPQUFpQixFQUFFLE9BQTRDLEtBQXNCO0FBQ3ZILElBQUEsT0FBTyxJQUFJLGVBQWUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDakQsRUFBRTtNQUVXLGVBQWUsR0FBRyxxQkFBcUIsQ0FBQyxVQUFVOztBQ2hVL0QsaUJBQWlCLElBQUksUUFBUSxHQUFjLFlBQVksQ0FBQztBQUV4RDs7Ozs7Ozs7OztBQVVHO0FBQ0csU0FBVSxXQUFXLENBQUMsT0FBbUIsRUFBQTtJQUMzQyxJQUFJLElBQUksSUFBSSxPQUFPLEVBQUU7QUFDakIsUUFBQSxPQUFPLFFBQVEsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQTtRQUNILE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQztRQUN6QixRQUFRLEdBQUcsT0FBTyxDQUFDO0FBQ25CLFFBQUEsT0FBTyxPQUFPLENBQUM7QUFDbEIsS0FBQTtBQUNMOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9kYXRhLXN5bmMvIn0=
