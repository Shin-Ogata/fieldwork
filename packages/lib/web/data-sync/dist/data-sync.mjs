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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsIm51bGwudHMiLCJpbnRlcm5hbC50cyIsInJlc3QudHMiLCJzdG9yYWdlLnRzIiwic2V0dGluZ3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBTWU5DID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19TWU5DX0RFQ0xBUkUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMgICAgICAgICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDEsICdpbnZhbGlkIHN5bmMgcGFyYW1zLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlkgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMiwgJ2ludmFsaWQgc3luYyBzdG9yYWdlIGVudGlyZXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9EQVRBX05PVF9GT1VORCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAzLCAnZGF0YSBub3QgZm91bmQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gVGhlIHtAbGluayBJRGF0YVN5bmN9IGltcGxlbWFudCBjbGFzcyB3aGljaCBoYXMgbm8gZWZmZWN0cy5cbiAqIEBqYSDkvZXjgoLjgZfjgarjgYQge0BsaW5rIElEYXRhU3luY30g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIE51bGxEYXRhU3luYyBpbXBsZW1lbnRzIElEYXRhU3luYzxvYmplY3Q+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBJRGF0YVN5bmN9IGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSB7QGxpbmsgSURhdGFTeW5jfSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ251bGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc3luYyhtZXRob2Q6IFN5bmNNZXRob2RzLCBjb250ZXh0OiBTeW5jQ29udGV4dDxvYmplY3Q+LCBvcHRpb25zPzogQ2FuY2VsYWJsZSk6IFByb21pc2U8U3luY1Jlc3VsdDxvYmplY3Q+PiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IFByb21pc2UucmVzb2x2ZSgncmVhZCcgPT09IG1ldGhvZCA/IHt9IDogdW5kZWZpbmVkKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbnNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jTlVMTCA9IG5ldyBOdWxsRGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM8b2JqZWN0PjtcbiIsImltcG9ydCB7IHJlc3VsdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IFN5bmNDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCByZXNvbHZlIGxhY2sgcHJvcGVydHkgKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlVVJMKGNvbnRleHQ6IFN5bmNDb250ZXh0KTogc3RyaW5nIHtcbiAgICByZXR1cm4gcmVzdWx0KGNvbnRleHQsICd1cmwnKTtcbn1cbiIsImltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgdHlwZSBBamF4T3B0aW9ucywgYWpheCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG4gICAgU3luY09iamVjdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IHJlc29sdmVVUkwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gT3B0aW9ucyBpbnRlcmZhY2UgZm9yIHtAbGluayBSZXN0RGF0YVN5bmN9LlxuICogQGphIHtAbGluayBSZXN0RGF0YVN5bmN9IOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc3REYXRhU3luY09wdGlvbnMgZXh0ZW5kcyBBamF4T3B0aW9uczwnanNvbic+IHtcbiAgICB1cmw/OiBzdHJpbmc7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9tZXRob2RNYXAgPSB7XG4gICAgY3JlYXRlOiAnUE9TVCcsXG4gICAgdXBkYXRlOiAnUFVUJyxcbiAgICBwYXRjaDogJ1BBVENIJyxcbiAgICBkZWxldGU6ICdERUxFVEUnLFxuICAgIHJlYWQ6ICdHRVQnXG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIHtAbGluayBJRGF0YVN5bmN9IGltcGxlbWFudCBjbGFzcyB3aGljaCBjb21wbGlhbnQgUkVTVGZ1bC5cbiAqIEBqYSBSRVNUIOOBq+a6luaLoOOBl+OBnyB7QGxpbmsgSURhdGFTeW5jfSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUmVzdERhdGFTeW5jPFQgZXh0ZW5kcyBvYmplY3QgPSBTeW5jT2JqZWN0PiBpbXBsZW1lbnRzIElEYXRhU3luYzxUPiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdyZXN0JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc3Qgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAgUkVTVCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jKG1ldGhvZDogU3luY01ldGhvZHMsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCBvcHRpb25zPzogUmVzdERhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8U3luY1Jlc3VsdDxUPj4ge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuYXNzaWduKHsgZGF0YVR5cGU6ICdqc29uJyB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB1cmwgPSBwYXJhbXMudXJsID8/IHJlc29sdmVVUkwoY29udGV4dCk7XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCAnQSBcInVybFwiIHByb3BlcnR5IG9yIGZ1bmN0aW9uIG11c3QgYmUgc3BlY2lmaWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW1zLm1ldGhvZCA9IF9tZXRob2RNYXBbbWV0aG9kXTtcblxuICAgICAgICAvLyBFbnN1cmUgcmVxdWVzdCBkYXRhLlxuICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMuZGF0YSAmJiAoJ2NyZWF0ZScgPT09IG1ldGhvZCB8fCAndXBkYXRlJyA9PT0gbWV0aG9kIHx8ICdwYXRjaCcgPT09IG1ldGhvZCkpIHtcbiAgICAgICAgICAgIHBhcmFtcy5kYXRhID0gY29udGV4dC50b0pTT04oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFqYXggcmVxdWVzdFxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGFqYXgodXJsLCBwYXJhbXMpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uc2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3IFJlc3REYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7XG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGRlZXBNZXJnZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b1Jlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHR5cGUgeyBJU3RvcmFnZSwgSVN0b3JhZ2VPcHRpb25zIH0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvd2ViLXN0b3JhZ2UnO1xuaW1wb3J0IHR5cGUge1xuICAgIElEYXRhU3luY09wdGlvbnMsXG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNPYmplY3QsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IHJlc29sdmVVUkwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgU0VQQVJBVE9SID0gJzo6Jyxcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIElEYXRhU3luY30gaW50ZXJmYWNlIGZvciB7QGxpbmsgSVN0b3JhZ2V9IGFjY2Vzc29yLlxuICogQGphIHtAbGluayBJU3RvcmFnZX0g44Ki44Kv44K744OD44K144KS5YKZ44GI44KLIHtAbGluayBJRGF0YVN5bmN9IOOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElTdG9yYWdlRGF0YVN5bmM8VCBleHRlbmRzIG9iamVjdCA9IFN5bmNPYmplY3Q+IGV4dGVuZHMgSURhdGFTeW5jPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQge0BsaW5rIElTdG9yYWdlfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo5a++6LGh44GuIHtAbGluayBJU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K544Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0U3RvcmFnZSgpOiBJU3RvcmFnZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IHtAbGluayBJU3RvcmFnZX0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCB7QGxpbmsgSVN0b3JhZ2V9IOOCpOODs+OCueOCv+ODs+OCueOCkuioreWumlxuICAgICAqL1xuICAgIHNldFN0b3JhZ2UobmV3U3RvcmFnZTogSVN0b3JhZ2UpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgaWQtc2VwYXJhdG9yLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgSUQg44K744OR44Os44O844K/44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3U2VwYXJhdG9yXG4gICAgICogIC0gYGVuYCBuZXcgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5paw44GX44GE44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDku6XliY3jgYToqK3lrprjgZXjgozjgabjgYTjgZ/jgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBzZXRJZFNlcGFyYXRvcihuZXdTZXBhcmF0b3I6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIFN0b3JhZ2VEYXRhU3luY30gY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gKiBAamEge0BsaW5rIFN0b3JhZ2VEYXRhU3luY30g5qeL56+J44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucyB7XG4gICAgc2VwYXJhdG9yPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBPcHRpb25zIGludGVyZmFjZSBmb3Ige0BsaW5rIFN0b3JhZ2VEYXRhU3luY30uXG4gKiBAamEge0BsaW5rIFN0b3JhZ2VEYXRhU3luY30g44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCB0eXBlIFN0b3JhZ2VEYXRhU3luY09wdGlvbnMgPSBJRGF0YVN5bmNPcHRpb25zICYgSVN0b3JhZ2VPcHRpb25zO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjaGVjayBtb2RlbCBvciBub3QgKi9cbmZ1bmN0aW9uIGlzTW9kZWwoY29udGV4dDogU3luY0NvbnRleHQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISEoY29udGV4dC5jb25zdHJ1Y3RvciBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pWydpZEF0dHJpYnV0ZSddO1xufVxuXG4vKiogQGludGVybmFsIGNyZWF0ZSBpZCAqL1xuZnVuY3Rpb24gZ2VuSWQodXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt1cmx9OiR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9YDtcbn1cblxuLyoqIEBpbnRlcm5hbCByZXNvbHZlIGtleSBmb3IgbG9jYWxTdG9yYWdlICovXG5mdW5jdGlvbiBwYXJzZUNvbnRleHQoY29udGV4dDogQWNjZXNzaWJsZTxTeW5jQ29udGV4dD4sIHNlcGFyYXRvcjogc3RyaW5nKTogeyBtb2RlbDogYm9vbGVhbjsga2V5OiBzdHJpbmc7IHVybDogc3RyaW5nOyBkYXRhOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+OyB9IHtcbiAgICBjb25zdCBtb2RlbCAgPSBpc01vZGVsKGNvbnRleHQpO1xuICAgIGNvbnN0IHVybCAgICA9IHJlc29sdmVVUkwoY29udGV4dCk7XG4gICAgY29uc3QgaWRBdHRyID0gKGNvbnRleHQuY29uc3RydWN0b3IgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVsnaWRBdHRyaWJ1dGUnXTtcbiAgICBjb25zdCBkYXRhID0gKCgpID0+IHtcbiAgICAgICAgY29uc3QgcmV0dmFsID0ge30gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZCAgICA9ICFpc0Z1bmN0aW9uKGNvbnRleHRbJ2hhcyddKSA/IGZhbHNlIDogY29udGV4dFsnaGFzJ10oaWRBdHRyKSBhcyBib29sZWFuO1xuICAgICAgICAgICAgcmV0dmFsW2lkQXR0cl0gPSB2YWxpZCA/IGNvbnRleHQuaWQhIDogZ2VuSWQodXJsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH0pKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIHVybCxcbiAgICAgICAga2V5OiBgJHt1cmx9JHttb2RlbCA/IGAke3NlcGFyYXRvcn0ke2RhdGFbaWRBdHRyXX1gIDogJyd9YCxcbiAgICAgICAgZGF0YSxcbiAgICB9O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIHtAbGluayBJRGF0YVN5bmN9IGltcGxlbWFudCBjbGFzcyB3aGljaCB0YXJnZXQgaXMge0BsaW5rIElTdG9yYWdlfS4gRGVmYXVsdCBzdG9yYWdlIGlzIHtAbGluayBXZWJTdG9yYWdlfS5cbiAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOCkuWvvuixoeOBqOOBl+OBnyB7QGxpbmsgSURhdGFTeW5jfSDlrp/oo4Xjgq/jg6njgrkuIOaXouWumuWApOOBryB7QGxpbmsgV2ViU3RvcmFnZX1cbiAqL1xuY2xhc3MgU3RvcmFnZURhdGFTeW5jPFQgZXh0ZW5kcyBvYmplY3QgPSBTeW5jT2JqZWN0PiBpbXBsZW1lbnRzIElTdG9yYWdlRGF0YVN5bmM8VD4ge1xuICAgIHByaXZhdGUgX3N0b3JhZ2U6IElTdG9yYWdlO1xuICAgIHByaXZhdGUgX3NlcGFyYXRvcjogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdG9yYWdlXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSVN0b3JhZ2V9IG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIElTdG9yYWdlfSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0b3JhZ2U6IElTdG9yYWdlLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcbiAgICAgICAgdGhpcy5fc2VwYXJhdG9yID0gb3B0aW9ucz8uc2VwYXJhdG9yID8/IENvbnN0LlNFUEFSQVRPUjtcbiAgICB9XG5cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIGltcGxlbWVudHM6IElTdG9yYWdlRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4ge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcge0BsaW5rIElTdG9yYWdlfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIHtAbGluayBJU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXMge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gbmV3U3RvcmFnZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgaWQtc2VwYXJhdG9yLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgSUQg44K744OR44Os44O844K/44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3U2VwYXJhdG9yXG4gICAgICogIC0gYGVuYCBuZXcgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5paw44GX44GE44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDku6XliY3jgYToqK3lrprjgZXjgozjgabjgYTjgZ/jgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBzZXRJZFNlcGFyYXRvcihuZXdTZXBhcmF0b3I6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG9sZFNlcGFyYXRvciA9IHRoaXMuX3NlcGFyYXRvcjtcbiAgICAgICAgdGhpcy5fc2VwYXJhdG9yID0gbmV3U2VwYXJhdG9yO1xuICAgICAgICByZXR1cm4gb2xkU2VwYXJhdG9yO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBJRGF0YVN5bmN9IGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSB7QGxpbmsgSURhdGFTeW5jfSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzeW5jKG1ldGhvZDogU3luY01ldGhvZHMsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8U3luY1Jlc3VsdDxUPj4ge1xuICAgICAgICBjb25zdCB7IG1vZGVsLCBrZXksIHVybCwgZGF0YSB9ID0gcGFyc2VDb250ZXh0KGNvbnRleHQgYXMgQWNjZXNzaWJsZTxTeW5jQ29udGV4dD4sIHRoaXMuX3NlcGFyYXRvcik7XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCAnQSBcInVybFwiIHByb3BlcnR5IG9yIGZ1bmN0aW9uIG11c3QgYmUgc3BlY2lmaWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHJlc3BvbnNlOiBQbGFpbk9iamVjdCB8IHZvaWQgfCBudWxsO1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAnY3JlYXRlJzoge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBkZWVwTWVyZ2UoeyBkYXRhIH0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy51cGRhdGUoa2V5LCBjb250ZXh0LCB1cmwsIGRhdGFbT2JqZWN0LmtleXMoZGF0YSlbMF1dLCBvcHRzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgICAgICBjYXNlICdwYXRjaCc6IHtcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMudXBkYXRlKGtleSwgY29udGV4dCwgdXJsLCBjb250ZXh0LmlkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmRlc3Ryb3koa2V5LCBjb250ZXh0LCB1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmVhZCc6XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmZpbmQobW9kZWwsIGtleSwgdXJsLCBvcHRpb25zKSBhcyBQbGFpbk9iamVjdDtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9EQVRBX05PVF9GT1VORCwgYG1ldGhvZDogJHttZXRob2R9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgYHVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCBQcm9taXNlLnJlc29sdmUocmVzcG9uc2UhKSk7XG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBTeW5jUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaW1hdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5RW50cmllcyh1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPHsgaWRzOiBib29sZWFuOyBpdGVtczogKFBsYWluT2JqZWN0IHwgc3RyaW5nKVtdOyB9PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtPG9iamVjdD4odXJsLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaXRlbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGlkczogdHJ1ZSwgaXRlbXM6IFtdIH07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGlkczogIWl0ZW1zLmxlbmd0aCB8fCBpc1N0cmluZyhpdGVtc1swXSksIGl0ZW1zIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSwgYGVudHJ5IGlzIG5vdCBBcnJheSB0eXBlLmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgc2F2ZUVudHJpZXModXJsOiBzdHJpbmcsIGVudHJpZXM6IHN0cmluZ1tdLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHVybCwgZW50cmllcywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZmluZChtb2RlbDogYm9vbGVhbiwga2V5OiBzdHJpbmcsIHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCBQbGFpbk9iamVjdFtdIHwgbnVsbD4ge1xuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGtleSwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIG11bHRpLWVudHJ5XG4gICAgICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGlmIChpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZmluZEFsbFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpcmVzOiBQbGFpbk9iamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaWQgb2YgaXRlbXMgYXMgc3RyaW5nW10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihgJHt1cmx9JHt0aGlzLl9zZXBhcmF0b3J9JHtpZH1gLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5ICYmIGVudGlyZXMucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVudGlyZXM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW1zIGFzIFBsYWluT2JqZWN0W107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGlmIChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlkgPT09IHJlc3VsdC5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGtleSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGUoa2V5OiBzdHJpbmcsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCB1cmw6IHN0cmluZywgaWQ/OiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgeyBkYXRhIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCBhdHRycyA9IE9iamVjdC5hc3NpZ24oY29udGV4dC50b0pTT04oKSwgZGF0YSk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGtleSAhPT0gdXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoaWRzICYmIGlkICYmICFpdGVtcy5pbmNsdWRlcyhpZCkpIHtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVFbnRyaWVzKHVybCwgaXRlbXMgYXMgc3RyaW5nW10sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmZpbmQodHJ1ZSwga2V5LCB1cmwsIG9wdGlvbnMpIGFzIFByb21pc2U8UGxhaW5PYmplY3QgfCBudWxsPjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBkZXN0cm95KGtleTogc3RyaW5nLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+IHtcbiAgICAgICAgY29uc3Qgb2xkID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXksIG9wdGlvbnMpO1xuICAgICAgICBpZiAoa2V5ICE9PSB1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChpZHMgJiYgY29udGV4dC5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJpZXMgPSBpdGVtcy5maWx0ZXIoaSA9PiBpICE9PSBjb250ZXh0LmlkKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVFbnRyaWVzKHVybCwgZW50cmllcyBhcyBzdHJpbmdbXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9sZCBhcyBQbGFpbk9iamVjdDtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSB7QGxpbmsgSVN0b3JhZ2VEYXRhU3luY30gb2JqZWN0IHdpdGgge0BsaW5rIElTdG9yYWdlfS5cbiAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOCkuaMh+WumuOBl+OBpiwge0BsaW5rIElTdG9yYWdlRGF0YVN5bmN9IOOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBzdG9yYWdlXG4gKiAgLSBgZW5gIHtAbGluayBJU3RvcmFnZX0gb2JqZWN0XG4gKiAgLSBgamFgIHtAbGluayBJU3RvcmFnZX0g44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9uc1xuICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVN0b3JhZ2VEYXRhU3luYyA9IChzdG9yYWdlOiBJU3RvcmFnZSwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMpOiBJU3RvcmFnZURhdGFTeW5jID0+IHtcbiAgICByZXR1cm4gbmV3IFN0b3JhZ2VEYXRhU3luYyhzdG9yYWdlLCBvcHRpb25zKTtcbn07XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY1NUT1JBR0UgPSBjcmVhdGVTdG9yYWdlRGF0YVN5bmMod2ViU3RvcmFnZSk7XG4iLCJpbXBvcnQgdHlwZSB7IElEYXRhU3luYyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkYXRhU3luY05VTEwgfSBmcm9tICcuL251bGwnO1xuXG4vKiogQGludGVybmFsICovIGxldCBfZGVmYXVsdDogSURhdGFTeW5jID0gZGF0YVN5bmNOVUxMO1xuXG4vKipcbiAqIEBlbiBHZXQgb3IgdXBkYXRlIGRlZmF1bHQge0BsaW5rIElEYXRhU3luY30gb2JqZWN0LlxuICogQGphIOaXouWumuOBriB7QGxpbmsgSURhdGFTeW5jfSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lj5blvpcgLyDmm7TmlrBcbiAqXG4gKiBAcGFyYW0gbmV3U3luY1xuICogIC0gYGVuYCBuZXcgZGF0YS1zeW5jIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgZGF0YS1zeW5jIOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi4gYHVuZGVmaW5lZGAg44GM5rih44GV44KM44KL5aC05ZCI44Gv54++5Zyo6Kit5a6a44GV44KM44Gm44GE44KLIGRhdGEtc3luYyDjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBkYXRhLXN5bmMgb2JqZWN0LlxuICogIC0gYGphYCDku6XliY3jga4gZGF0YS1zeW5jIOOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFN5bmMobmV3U3luYz86IElEYXRhU3luYyk6IElEYXRhU3luYyB7XG4gICAgaWYgKG51bGwgPT0gbmV3U3luYykge1xuICAgICAgICByZXR1cm4gX2RlZmF1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkU3luYyA9IF9kZWZhdWx0O1xuICAgICAgICBfZGVmYXVsdCA9IG5ld1N5bmM7XG4gICAgICAgIHJldHVybiBvbGRTeW5jO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQTs7O0FBR0c7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFBQSxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUE7QUFBQSxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGtCQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsa0JBQXdFO1FBQ3hFLFdBQUEsQ0FBQSxXQUFBLENBQUEsK0JBQUEsQ0FBQSxHQUFnRCxXQUFBLENBQUEsa0JBQWtCLENBQUEsR0FBQSw2QkFBdUIsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUEsR0FBQSwrQkFBQTtRQUMxSSxXQUFBLENBQUEsV0FBQSxDQUFBLHNDQUFBLENBQUEsR0FBZ0QsV0FBQSxDQUFBLGtCQUFrQixDQUFBLEdBQUEsNkJBQXVCLEVBQUEsOEJBQXVCLENBQUMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFBLEdBQUEsc0NBQUE7UUFDbkosV0FBQSxDQUFBLFdBQUEsQ0FBQSwrQ0FBQSxDQUFBLEdBQWdELFdBQUEsQ0FBQSxrQkFBa0IsQ0FBQSxHQUFBLDZCQUF1QixFQUFBLDhCQUF1QixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQSxHQUFBLCtDQUFBO0FBQ3pJLEtBQUMsR0FMc0I7QUFNM0IsQ0FBQyxHQWhCb0I7O0FDTXJCOzs7QUFHRztBQUNILE1BQU0sWUFBWSxDQUFBOzs7QUFLZDs7O0FBR0c7QUFDSCxJQUFBLElBQUksSUFBSSxHQUFBO0FBQ0osUUFBQSxPQUFPLE1BQU07O0FBR2pCOzs7Ozs7Ozs7Ozs7O0FBYUc7QUFDSCxJQUFBLE1BQU0sSUFBSSxDQUFDLE1BQW1CLEVBQUUsT0FB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