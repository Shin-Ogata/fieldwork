/*!
 * @cdp/data-sync 0.9.19
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
 * @en The {@link IDataSync} implemant class which has no effects.
 * @ja 何もしない {@link IDataSync} 実装クラス
 */
class NullDataSync {
    ///////////////////////////////////////////////////////////////////////
    // implements: IDataSync
    /**
     * @en {@link IDataSync} kind signature.
     * @ja {@link IDataSync} の種別を表す識別子
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
        const { cancel } = options ?? {};
        await checkCanceled(cancel);
        const response = Promise.resolve('read' === method ? {} : undefined);
        context.trigger('@request', context, response);
        return response;
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
 * @en The {@link IDataSync} implemant class which compliant RESTful.
 * @ja REST に準拠した {@link IDataSync} 実装クラス
 */
class RestDataSync {
    ///////////////////////////////////////////////////////////////////////
    // implements: IDataSync
    /**
     * @en {@link IDataSync} kind signature.
     * @ja {@link IDataSync} の種別を表す識別子
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
        const url = params.url ?? resolveURL(context);
        if (!url) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
        }
        params.method = _methodMap[method];
        // Ensure request data.
        if (null == params.data && ('create' === method || 'update' === method || 'patch' === method)) {
            params.data = context.toJSON();
        }
        // Ajax request
        const response = ajax(url, params);
        context.trigger('@request', context, response);
        return response;
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
 * @en The {@link IDataSync} implemant class which target is {@link IStorage}. Default storage is {@link WebStorage}.
 * @ja {@link IStorage} を対象とした {@link IDataSync} 実装クラス. 既定値は {@link WebStorage}
 */
class StorageDataSync {
    _storage;
    _separator;
    /**
     * constructor
     *
     * @param storage
     *  - `en` {@link IStorage} object
     *  - `ja` {@link IStorage} オブジェクト
     * @param options
     *  - `en` construction options
     *  - `ja` 構築オプション
     */
    constructor(storage, options) {
        this._storage = storage;
        this._separator = options?.separator ?? "::" /* Const.SEPARATOR */;
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IStorageDataSync
    /**
     * @en Get current {@link IStorage} instance.
     * @ja 現在対象の {@link IStorage} インスタンスにアクセス
     */
    getStorage() {
        return this._storage;
    }
    /**
     * @en Set new {@link IStorage} instance.
     * @ja 新しい {@link IStorage} インスタンスを設定
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
     * @en {@link IDataSync} kind signature.
     * @ja {@link IDataSync} の種別を表す識別子
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
        let response;
        switch (method) {
            case 'create': {
                const opts = deepMerge({ data }, options);
                response = await this.update(key, context, url, data[Object.keys(data)[0]], opts);
                break;
            }
            case 'update':
            case 'patch': {
                response = await this.update(key, context, url, context.id, options);
                break;
            }
            case 'delete':
                response = await this.destroy(key, context, url, options);
                break;
            case 'read':
                response = await this.find(model, key, url, options);
                if (null == response) {
                    throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND, `method: ${method}`);
                }
                break;
            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, `unknown method: ${method}`);
        }
        context.trigger('@request', context, Promise.resolve(response));
        return response;
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
        const { data } = options ?? {};
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
 * @en Create {@link IStorageDataSync} object with {@link IStorage}.
 * @ja {@link IStorage} を指定して, {@link IStorageDataSync} オブジェクトを構築
 *
 * @param storage
 *  - `en` {@link IStorage} object
 *  - `ja` {@link IStorage} オブジェクト
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
 * @en Get or update default {@link IDataSync} object.
 * @ja 既定の {@link IDataSync} オブジェクトの取得 / 更新
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsIm51bGwudHMiLCJpbnRlcm5hbC50cyIsInJlc3QudHMiLCJzdG9yYWdlLnRzIiwic2V0dGluZ3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBTWU5DID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19TWU5DX0RFQ0xBUkUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMgICAgICAgICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDEsICdpbnZhbGlkIHN5bmMgcGFyYW1zLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlkgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMiwgJ2ludmFsaWQgc3luYyBzdG9yYWdlIGVudGlyZXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9EQVRBX05PVF9GT1VORCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAzLCAnZGF0YSBub3QgZm91bmQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBUaGUge0BsaW5rIElEYXRhU3luY30gaW1wbGVtYW50IGNsYXNzIHdoaWNoIGhhcyBubyBlZmZlY3RzLlxuICogQGphIOS9leOCguOBl+OBquOBhCB7QGxpbmsgSURhdGFTeW5jfSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgTnVsbERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jPG9iamVjdD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIElEYXRhU3luY30ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIHtAbGluayBJRGF0YVN5bmN9IOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzeW5jKG1ldGhvZDogU3luY01ldGhvZHMsIGNvbnRleHQ6IFN5bmNDb250ZXh0PG9iamVjdD4sIG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxTeW5jUmVzdWx0PG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gUHJvbWlzZS5yZXNvbHZlKCdyZWFkJyA9PT0gbWV0aG9kID8ge30gOiB1bmRlZmluZWQpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uc2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNOVUxMID0gbmV3IE51bGxEYXRhU3luYygpIGFzIElEYXRhU3luYzxvYmplY3Q+O1xuIiwiaW1wb3J0IHsgcmVzdWx0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN5bmNDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCByZXNvbHZlIGxhY2sgcHJvcGVydHkgKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlVVJMKGNvbnRleHQ6IFN5bmNDb250ZXh0KTogc3RyaW5nIHtcbiAgICByZXR1cm4gcmVzdWx0KGNvbnRleHQsICd1cmwnKTtcbn1cbiIsImltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgQWpheE9wdGlvbnMsIGFqYXggfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHR5cGUge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxuICAgIFN5bmNPYmplY3QsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciB7QGxpbmsgUmVzdERhdGFTeW5jfS5cbiAqIEBqYSB7QGxpbmsgUmVzdERhdGFTeW5jfSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXN0RGF0YVN5bmNPcHRpb25zIGV4dGVuZHMgQWpheE9wdGlvbnM8J2pzb24nPiB7XG4gICAgdXJsPzogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbWV0aG9kTWFwID0ge1xuICAgIGNyZWF0ZTogJ1BPU1QnLFxuICAgIHVwZGF0ZTogJ1BVVCcsXG4gICAgcGF0Y2g6ICdQQVRDSCcsXG4gICAgZGVsZXRlOiAnREVMRVRFJyxcbiAgICByZWFkOiAnR0VUJ1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgSURhdGFTeW5jfSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggY29tcGxpYW50IFJFU1RmdWwuXG4gKiBAamEgUkVTVCDjgavmupbmi6DjgZfjgZ8ge0BsaW5rIElEYXRhU3luY30g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJlc3REYXRhU3luYzxUIGV4dGVuZHMgb2JqZWN0ID0gU3luY09iamVjdD4gaW1wbGVtZW50cyBJRGF0YVN5bmM8VD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIElEYXRhU3luY30ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIHtAbGluayBJRGF0YVN5bmN9IOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAncmVzdCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXN0IG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIFJFU1Qg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgc3luYyhtZXRob2Q6IFN5bmNNZXRob2RzLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFJlc3REYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8VD4+IHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IGRhdGFUeXBlOiAnanNvbicgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgdXJsID0gcGFyYW1zLnVybCA/PyByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtcy5tZXRob2QgPSBfbWV0aG9kTWFwW21ldGhvZF07XG5cbiAgICAgICAgLy8gRW5zdXJlIHJlcXVlc3QgZGF0YS5cbiAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zLmRhdGEgJiYgKCdjcmVhdGUnID09PSBtZXRob2QgfHwgJ3VwZGF0ZScgPT09IG1ldGhvZCB8fCAncGF0Y2gnID09PSBtZXRob2QpKSB7XG4gICAgICAgICAgICBwYXJhbXMuZGF0YSA9IGNvbnRleHQudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBamF4IHJlcXVlc3RcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhamF4KHVybCwgcGFyYW1zKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbnNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jUkVTVCA9IG5ldyBSZXN0RGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM7XG4iLCJpbXBvcnQge1xuICAgIEFjY2Vzc2libGUsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGRlZXBNZXJnZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b1Jlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgSVN0b3JhZ2UsIElTdG9yYWdlT3B0aW9ucyB9IGZyb20gJ0BjZHAvY29yZS1zdG9yYWdlJztcbmltcG9ydCB7IHdlYlN0b3JhZ2UgfSBmcm9tICdAY2RwL3dlYi1zdG9yYWdlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jT3B0aW9ucyxcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY09iamVjdCxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVVSTCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBTRVBBUkFUT1IgPSAnOjonLFxufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBpbnRlcmZhY2UgZm9yIHtAbGluayBJU3RvcmFnZX0gYWNjZXNzb3IuXG4gKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgqLjgq/jgrvjg4PjgrXjgpLlgpnjgYjjgosge0BsaW5rIElEYXRhU3luY30g44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSVN0b3JhZ2VEYXRhU3luYzxUIGV4dGVuZHMgb2JqZWN0ID0gU3luY09iamVjdD4gZXh0ZW5kcyBJRGF0YVN5bmM8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4ge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcge0BsaW5rIElTdG9yYWdlfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIHtAbGluayBJU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSDmp4vnr4njgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdG9yYWdlRGF0YVN5bmNDb25zdHJ1Y3Rpb25PcHRpb25zIHtcbiAgICBzZXBhcmF0b3I/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfS5cbiAqIEBqYSB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IHR5cGUgU3RvcmFnZURhdGFTeW5jT3B0aW9ucyA9IElEYXRhU3luY09wdGlvbnMgJiBJU3RvcmFnZU9wdGlvbnM7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNoZWNrIG1vZGVsIG9yIG5vdCAqL1xuZnVuY3Rpb24gaXNNb2RlbChjb250ZXh0OiBTeW5jQ29udGV4dCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIShjb250ZXh0LmNvbnN0cnVjdG9yIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ2lkQXR0cmlidXRlJ107XG59XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIGlkICovXG5mdW5jdGlvbiBnZW5JZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3VybH06JHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX1gO1xufVxuXG4vKiogQGludGVybmFsIHJlc29sdmUga2V5IGZvciBsb2NhbFN0b3JhZ2UgKi9cbmZ1bmN0aW9uIHBhcnNlQ29udGV4dChjb250ZXh0OiBBY2Nlc3NpYmxlPFN5bmNDb250ZXh0Piwgc2VwYXJhdG9yOiBzdHJpbmcpOiB7IG1vZGVsOiBib29sZWFuOyBrZXk6IHN0cmluZzsgdXJsOiBzdHJpbmc7IGRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47IH0ge1xuICAgIGNvbnN0IG1vZGVsICA9IGlzTW9kZWwoY29udGV4dCk7XG4gICAgY29uc3QgdXJsICAgID0gcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICBjb25zdCBpZEF0dHIgPSAoY29udGV4dC5jb25zdHJ1Y3RvciBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pWydpZEF0dHJpYnV0ZSddO1xuICAgIGNvbnN0IGRhdGEgPSAoKCkgPT4ge1xuICAgICAgICBjb25zdCByZXR2YWwgPSB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkICAgID0gIWlzRnVuY3Rpb24oY29udGV4dFsnaGFzJ10pID8gZmFsc2UgOiBjb250ZXh0WydoYXMnXShpZEF0dHIpIGFzIGJvb2xlYW47XG4gICAgICAgICAgICByZXR2YWxbaWRBdHRyXSA9IHZhbGlkID8gY29udGV4dC5pZCEgOiBnZW5JZCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfSkoKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgdXJsLFxuICAgICAgICBrZXk6IGAke3VybH0ke21vZGVsID8gYCR7c2VwYXJhdG9yfSR7ZGF0YVtpZEF0dHJdfWAgOiAnJ31gLFxuICAgICAgICBkYXRhLFxuICAgIH07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUge0BsaW5rIElEYXRhU3luY30gaW1wbGVtYW50IGNsYXNzIHdoaWNoIHRhcmdldCBpcyB7QGxpbmsgSVN0b3JhZ2V9LiBEZWZhdWx0IHN0b3JhZ2UgaXMge0BsaW5rIFdlYlN0b3JhZ2V9LlxuICogQGphIHtAbGluayBJU3RvcmFnZX0g44KS5a++6LGh44Go44GX44GfIHtAbGluayBJRGF0YVN5bmN9IOWun+ijheOCr+ODqeOCuS4g5pei5a6a5YCk44GvIHtAbGluayBXZWJTdG9yYWdlfVxuICovXG5jbGFzcyBTdG9yYWdlRGF0YVN5bmM8VCBleHRlbmRzIG9iamVjdCA9IFN5bmNPYmplY3Q+IGltcGxlbWVudHMgSVN0b3JhZ2VEYXRhU3luYzxUPiB7XG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogSVN0b3JhZ2U7XG4gICAgcHJpdmF0ZSBfc2VwYXJhdG9yOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJU3RvcmFnZX0gb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgSVN0b3JhZ2V9IOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RvcmFnZTogSVN0b3JhZ2UsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBzdG9yYWdlO1xuICAgICAgICB0aGlzLl9zZXBhcmF0b3IgPSBvcHRpb25zPy5zZXBhcmF0b3IgPz8gQ29uc3QuU0VQQVJBVE9SO1xuICAgIH1cblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gaW1wbGVtZW50czogSVN0b3JhZ2VEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IHtAbGluayBJU3RvcmFnZX0gaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOWvvuixoeOBriB7QGxpbmsgSVN0b3JhZ2V9IOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDmlrDjgZfjgYQge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLoqK3lrppcbiAgICAgKi9cbiAgICBzZXRTdG9yYWdlKG5ld1N0b3JhZ2U6IElTdG9yYWdlKTogdGhpcyB7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBuZXdTdG9yYWdlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgb2xkU2VwYXJhdG9yID0gdGhpcy5fc2VwYXJhdG9yO1xuICAgICAgICB0aGlzLl9zZXBhcmF0b3IgPSBuZXdTZXBhcmF0b3I7XG4gICAgICAgIHJldHVybiBvbGRTZXBhcmF0b3I7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIElEYXRhU3luY30ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIHtAbGluayBJRGF0YVN5bmN9IOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnc3RvcmFnZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmMobWV0aG9kOiBTeW5jTWV0aG9kcywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PFQ+PiB7XG4gICAgICAgIGNvbnN0IHsgbW9kZWwsIGtleSwgdXJsLCBkYXRhIH0gPSBwYXJzZUNvbnRleHQoY29udGV4dCBhcyBBY2Nlc3NpYmxlPFN5bmNDb250ZXh0PiwgdGhpcy5fc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsICdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcmVzcG9uc2U6IFBsYWluT2JqZWN0IHwgdm9pZCB8IG51bGw7XG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0cyA9IGRlZXBNZXJnZSh7IGRhdGEgfSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnVwZGF0ZShrZXksIGNvbnRleHQsIHVybCwgZGF0YVtPYmplY3Qua2V5cyhkYXRhKVswXV0sIG9wdHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3BhdGNoJzoge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy51cGRhdGUoa2V5LCBjb250ZXh0LCB1cmwsIGNvbnRleHQuaWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuZGVzdHJveShrZXksIGNvbnRleHQsIHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyZWFkJzpcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuZmluZChtb2RlbCwga2V5LCB1cmwsIG9wdGlvbnMpIGFzIFBsYWluT2JqZWN0O1xuICAgICAgICAgICAgICAgIGlmIChudWxsID09IHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5ELCBgbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCBgdW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIFByb21pc2UucmVzb2x2ZShyZXNwb25zZSEpKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFN5bmNSZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpbWF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlFbnRyaWVzKHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8eyBpZHM6IGJvb2xlYW47IGl0ZW1zOiAoUGxhaW5PYmplY3QgfCBzdHJpbmcpW107IH0+IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW08b2JqZWN0Pih1cmwsIG9wdGlvbnMpO1xuICAgICAgICBpZiAobnVsbCA9PSBpdGVtcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgaWRzOiB0cnVlLCBpdGVtczogW10gfTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaWRzOiAhaXRlbXMubGVuZ3RoIHx8IGlzU3RyaW5nKGl0ZW1zWzBdKSwgaXRlbXMgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0VOVFJZLCBgZW50cnkgaXMgbm90IEFycmF5IHR5cGUuYCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzYXZlRW50cmllcyh1cmw6IHN0cmluZywgZW50cmllczogc3RyaW5nW10sIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLnNldEl0ZW0odXJsLCBlbnRyaWVzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kKG1vZGVsOiBib29sZWFuLCBrZXk6IHN0cmluZywgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IFBsYWluT2JqZWN0W10gfCBudWxsPiB7XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gbXVsdGktZW50cnlcbiAgICAgICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgaWYgKGlkcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBmaW5kQWxsXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudGlyZXM6IFBsYWluT2JqZWN0W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpZCBvZiBpdGVtcyBhcyBzdHJpbmdbXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnkgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGAke3VybH0ke3RoaXMuX3NlcGFyYXRvcn0ke2lkfWAsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW50cnkgJiYgZW50aXJlcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW50aXJlcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXMgYXMgUGxhaW5PYmplY3RbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSA9PT0gcmVzdWx0LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZShrZXk6IHN0cmluZywgY29udGV4dDogU3luY0NvbnRleHQsIHVybDogc3RyaW5nLCBpZD86IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IGRhdGEgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmFzc2lnbihjb250ZXh0LnRvSlNPTigpLCBkYXRhKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGtleSwgYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoa2V5ICE9PSB1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChpZHMgJiYgaWQgJiYgIWl0ZW1zLmluY2x1ZGVzKGlkKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUVudHJpZXModXJsLCBpdGVtcyBhcyBzdHJpbmdbXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZmluZCh0cnVlLCBrZXksIHVybCwgb3B0aW9ucykgYXMgUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRlc3Ryb3koa2V5OiBzdHJpbmcsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCB1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCBvbGQgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW0oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChrZXkgIT09IHVybCkge1xuICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKGlkcyAmJiBjb250ZXh0LmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IGl0ZW1zLmZpbHRlcihpID0+IGkgIT09IGNvbnRleHQuaWQpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUVudHJpZXModXJsLCBlbnRyaWVzIGFzIHN0cmluZ1tdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2xkIGFzIFBsYWluT2JqZWN0O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIHtAbGluayBJU3RvcmFnZURhdGFTeW5jfSBvYmplY3Qgd2l0aCB7QGxpbmsgSVN0b3JhZ2V9LlxuICogQGphIHtAbGluayBJU3RvcmFnZX0g44KS5oyH5a6a44GX44GmLCB7QGxpbmsgSVN0b3JhZ2VEYXRhU3luY30g44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIHN0b3JhZ2VcbiAqICAtIGBlbmAge0BsaW5rIElTdG9yYWdlfSBvYmplY3RcbiAqICAtIGBqYWAge0BsaW5rIElTdG9yYWdlfSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zXG4gKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgY3JlYXRlU3RvcmFnZURhdGFTeW5jID0gKHN0b3JhZ2U6IElTdG9yYWdlLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucyk6IElTdG9yYWdlRGF0YVN5bmMgPT4ge1xuICAgIHJldHVybiBuZXcgU3RvcmFnZURhdGFTeW5jKHN0b3JhZ2UsIG9wdGlvbnMpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jU1RPUkFHRSA9IGNyZWF0ZVN0b3JhZ2VEYXRhU3luYyh3ZWJTdG9yYWdlKTtcbiIsImltcG9ydCB7IElEYXRhU3luYyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkYXRhU3luY05VTEwgfSBmcm9tICcuL251bGwnO1xuXG4vKiogQGludGVybmFsICovIGxldCBfZGVmYXVsdDogSURhdGFTeW5jID0gZGF0YVN5bmNOVUxMO1xuXG4vKipcbiAqIEBlbiBHZXQgb3IgdXBkYXRlIGRlZmF1bHQge0BsaW5rIElEYXRhU3luY30gb2JqZWN0LlxuICogQGphIOaXouWumuOBriB7QGxpbmsgSURhdGFTeW5jfSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lj5blvpcgLyDmm7TmlrBcbiAqXG4gKiBAcGFyYW0gbmV3U3luY1xuICogIC0gYGVuYCBuZXcgZGF0YS1zeW5jIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgZGF0YS1zeW5jIOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi4gYHVuZGVmaW5lZGAg44GM5rih44GV44KM44KL5aC05ZCI44Gv54++5Zyo6Kit5a6a44GV44KM44Gm44GE44KLIGRhdGEtc3luYyDjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBkYXRhLXN5bmMgb2JqZWN0LlxuICogIC0gYGphYCDku6XliY3jga4gZGF0YS1zeW5jIOOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFN5bmMobmV3U3luYz86IElEYXRhU3luYyk6IElEYXRhU3luYyB7XG4gICAgaWYgKG51bGwgPT0gbmV3U3luYykge1xuICAgICAgICByZXR1cm4gX2RlZmF1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkU3luYyA9IF9kZWZhdWx0O1xuICAgICAgICBfZGVmYXVsdCA9IG5ld1N5bmM7XG4gICAgICAgIHJldHVybiBvbGRTeW5jO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQTs7O0FBR0c7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFBQSxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUE7QUFBQSxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGtCQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsa0JBQXdFO1FBQ3hFLFdBQWdELENBQUEsV0FBQSxDQUFBLCtCQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUEsR0FBQSwrQkFBQTtRQUMxSSxXQUFnRCxDQUFBLFdBQUEsQ0FBQSxzQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsOEJBQXVCLENBQUMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFBLEdBQUEsc0NBQUE7UUFDbkosV0FBZ0QsQ0FBQSxXQUFBLENBQUEsK0NBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDhCQUF1QixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQSxHQUFBLCtDQUFBO0FBQ3pJLEtBQUMsR0FBQTtBQUNMLENBQUMsR0FBQTs7QUNWRDs7O0FBR0c7QUFDSCxNQUFNLFlBQVksQ0FBQTs7O0FBS2Q7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLElBQUksR0FBQTtBQUNKLFFBQUEsT0FBTyxNQUFNOztBQUdqQjs7Ozs7Ozs7Ozs7OztBQWFHO0FBQ0gsSUFBQSxNQUFNLElBQUksQ0FBQyxNQUFtQixFQUFFLE9BQTRCLEVBQUUsT0FBb0IsRUFBQTtBQUM5RSxRQUFBLE1BQU0sRUFBRSxNQUFNLEVBQUUs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