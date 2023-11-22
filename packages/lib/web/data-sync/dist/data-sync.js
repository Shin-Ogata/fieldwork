/*!
 * @cdp/data-sync 0.9.17
 *   web storage utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/promise'), require('@cdp/result'), require('@cdp/ajax'), require('@cdp/core-utils'), require('@cdp/web-storage')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/promise', '@cdp/result', '@cdp/ajax', '@cdp/core-utils', '@cdp/web-storage'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, promise, result, ajax, coreUtils, webStorage) { 'use strict';

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
            await promise.checkCanceled(cancel);
            const responce = Promise.resolve('read' === method ? {} : undefined);
            context.trigger('@request', context, responce);
            return responce;
        }
    }
    const dataSyncNULL = new NullDataSync();

    /** @internal resolve lack property */
    function resolveURL(context) {
        return coreUtils.result(context, 'url');
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
                const valid = !coreUtils.isFunction(context['has']) ? false : context['has'](idAttr);
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
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
            }
            let responce;
            switch (method) {
                case 'create': {
                    const opts = coreUtils.deepMerge({ data }, options);
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
                        throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND, `method: ${method}`);
                    }
                    break;
                default:
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, `unknown method: ${method}`);
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
            else if (coreUtils.isArray(items)) {
                return { ids: !items.length || coreUtils.isString(items[0]), items };
            }
            else {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY, `entry is not Array type.`);
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
                    const result$1 = result.toResult(e);
                    if (result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY === result$1.code) {
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
    const dataSyncSTORAGE = createStorageDataSync(webStorage.webStorage);

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

    exports.createStorageDataSync = createStorageDataSync;
    exports.dataSyncNULL = dataSyncNULL;
    exports.dataSyncREST = dataSyncREST;
    exports.dataSyncSTORAGE = dataSyncSTORAGE;
    exports.defaultSync = defaultSync;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwibnVsbC50cyIsImludGVybmFsLnRzIiwicmVzdC50cyIsInN0b3JhZ2UudHMiLCJzZXR0aW5ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFNZTkMgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1NZTkNfREVDTEFSRSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUyAgICAgICAgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMSwgJ2ludmFsaWQgc3luYyBwYXJhbXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAyLCAnaW52YWxpZCBzeW5jIHN0b3JhZ2UgZW50aXJlcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5EID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDMsICdkYXRhIG5vdCBmb3VuZC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgSURhdGFTeW5jfSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggaGFzIG5vIGVmZmVjdHMuXG4gKiBAamEg5L2V44KC44GX44Gq44GEIHtAbGluayBJRGF0YVN5bmN9IOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBOdWxsRGF0YVN5bmMgaW1wbGVtZW50cyBJRGF0YVN5bmM8b2JqZWN0PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0PG9iamVjdD4sIG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxTeW5jUmVzdWx0PEssIG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgIGNvbnN0IHJlc3BvbmNlID0gUHJvbWlzZS5yZXNvbHZlKCdyZWFkJyA9PT0gbWV0aG9kID8ge30gOiB1bmRlZmluZWQpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uY2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgUHJvbWlzZTxTeW5jUmVzdWx0PEssIG9iamVjdD4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jTlVMTCA9IG5ldyBOdWxsRGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM8b2JqZWN0PjtcbiIsImltcG9ydCB7IHJlc3VsdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgcmVzb2x2ZSBsYWNrIHByb3BlcnR5ICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVVSTChjb250ZXh0OiBTeW5jQ29udGV4dCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc3VsdChjb250ZXh0LCAndXJsJyk7XG59XG4iLCJpbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEFqYXhPcHRpb25zLCBhamF4IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciB7QGxpbmsgUmVzdERhdGFTeW5jfS5cbiAqIEBqYSB7QGxpbmsgUmVzdERhdGFTeW5jfSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXN0RGF0YVN5bmNPcHRpb25zIGV4dGVuZHMgQWpheE9wdGlvbnM8J2pzb24nPiB7XG4gICAgdXJsPzogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbWV0aG9kTWFwID0ge1xuICAgIGNyZWF0ZTogJ1BPU1QnLFxuICAgIHVwZGF0ZTogJ1BVVCcsXG4gICAgcGF0Y2g6ICdQQVRDSCcsXG4gICAgZGVsZXRlOiAnREVMRVRFJyxcbiAgICByZWFkOiAnR0VUJ1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgSURhdGFTeW5jfSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggY29tcGxpYW50IFJFU1RmdWwuXG4gKiBAamEgUkVTVCDjgavmupbmi6DjgZfjgZ8ge0BsaW5rIElEYXRhU3luY30g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJlc3REYXRhU3luYyBpbXBsZW1lbnRzIElEYXRhU3luYyB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdyZXN0JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc3Qgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAgUkVTVCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFJlc3REYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IGRhdGFUeXBlOiAnanNvbicgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgdXJsID0gcGFyYW1zLnVybCA/PyByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtcy5tZXRob2QgPSBfbWV0aG9kTWFwW21ldGhvZF07XG5cbiAgICAgICAgLy8gRW5zdXJlIHJlcXVlc3QgZGF0YS5cbiAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zLmRhdGEgJiYgKCdjcmVhdGUnID09PSBtZXRob2QgfHwgJ3VwZGF0ZScgPT09IG1ldGhvZCB8fCAncGF0Y2gnID09PSBtZXRob2QpKSB7XG4gICAgICAgICAgICBwYXJhbXMuZGF0YSA9IGNvbnRleHQudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBamF4IHJlcXVlc3RcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBhamF4KHVybCwgcGFyYW1zKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLPj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3IFJlc3REYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7XG4gICAgQWNjZXNzaWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc0FycmF5LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgZGVlcE1lcmdlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBJU3RvcmFnZSwgSVN0b3JhZ2VPcHRpb25zIH0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvd2ViLXN0b3JhZ2UnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmNPcHRpb25zLFxuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jT2JqZWN0LFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIFNFUEFSQVRPUiA9ICc6OicsXG59XG5cbi8qKlxuICogQGVuIHtAbGluayBJRGF0YVN5bmN9IGludGVyZmFjZSBmb3Ige0BsaW5rIElTdG9yYWdlfSBhY2Nlc3Nvci5cbiAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOCouOCr+OCu+ODg+OCteOCkuWCmeOBiOOCiyB7QGxpbmsgSURhdGFTeW5jfSDjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJU3RvcmFnZURhdGFTeW5jPFQgZXh0ZW5kcyBvYmplY3QgPSBTeW5jT2JqZWN0PiBleHRlbmRzIElEYXRhU3luYzxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IHtAbGluayBJU3RvcmFnZX0gaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOWvvuixoeOBriB7QGxpbmsgSVN0b3JhZ2V9IOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDmlrDjgZfjgYQge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLoqK3lrppcbiAgICAgKi9cbiAgICBzZXRTdG9yYWdlKG5ld1N0b3JhZ2U6IElTdG9yYWdlKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IGlkLXNlcGFyYXRvci5cbiAgICAgKiBAamEg5paw44GX44GEIElEIOOCu+ODkeODrOODvOOCv+OCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1NlcGFyYXRvclxuICAgICAqICAtIGBlbmAgbmV3IHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5Lul5YmN44GE6Kit5a6a44GV44KM44Gm44GE44Gf44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICovXG4gICAgc2V0SWRTZXBhcmF0b3IobmV3U2VwYXJhdG9yOiBzdHJpbmcpOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBTdG9yYWdlRGF0YVN5bmN9IGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICogQGphIHtAbGluayBTdG9yYWdlRGF0YVN5bmN9IOani+evieOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMge1xuICAgIHNlcGFyYXRvcj86IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyBpbnRlcmZhY2UgZm9yIHtAbGluayBTdG9yYWdlRGF0YVN5bmN9LlxuICogQGphIHtAbGluayBTdG9yYWdlRGF0YVN5bmN9IOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBTdG9yYWdlRGF0YVN5bmNPcHRpb25zID0gSURhdGFTeW5jT3B0aW9ucyAmIElTdG9yYWdlT3B0aW9ucztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgbW9kZWwgb3Igbm90ICovXG5mdW5jdGlvbiBpc01vZGVsKGNvbnRleHQ6IFN5bmNDb250ZXh0KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKGNvbnRleHQuY29uc3RydWN0b3IgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVsnaWRBdHRyaWJ1dGUnXTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgaWQgKi9cbmZ1bmN0aW9uIGdlbklkKHVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dXJsfToke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfWA7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVzb2x2ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZSAqL1xuZnVuY3Rpb24gcGFyc2VDb250ZXh0KGNvbnRleHQ6IEFjY2Vzc2libGU8U3luY0NvbnRleHQ+LCBzZXBhcmF0b3I6IHN0cmluZyk6IHsgbW9kZWw6IGJvb2xlYW47IGtleTogc3RyaW5nOyB1cmw6IHN0cmluZzsgZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPjsgfSB7XG4gICAgY29uc3QgbW9kZWwgID0gaXNNb2RlbChjb250ZXh0KTtcbiAgICBjb25zdCB1cmwgICAgPSByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgIGNvbnN0IGlkQXR0ciA9IChjb250ZXh0LmNvbnN0cnVjdG9yIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ2lkQXR0cmlidXRlJ107XG4gICAgY29uc3QgZGF0YSA9ICgoKSA9PiB7XG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWQgICAgPSAhaXNGdW5jdGlvbihjb250ZXh0WydoYXMnXSkgPyBmYWxzZSA6IGNvbnRleHRbJ2hhcyddKGlkQXR0cikgYXMgYm9vbGVhbjtcbiAgICAgICAgICAgIHJldHZhbFtpZEF0dHJdID0gdmFsaWQgPyBjb250ZXh0LmlkISA6IGdlbklkKHVybCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9KSgpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICB1cmwsXG4gICAgICAgIGtleTogYCR7dXJsfSR7bW9kZWwgPyBgJHtzZXBhcmF0b3J9JHtkYXRhW2lkQXR0cl19YCA6ICcnfWAsXG4gICAgICAgIGRhdGEsXG4gICAgfTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgSURhdGFTeW5jfSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggdGFyZ2V0IGlzIHtAbGluayBJU3RvcmFnZX0uIERlZmF1bHQgc3RvcmFnZSBpcyB7QGxpbmsgV2ViU3RvcmFnZX0uXG4gKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgpLlr77osaHjgajjgZfjgZ8ge0BsaW5rIElEYXRhU3luY30g5a6f6KOF44Kv44Op44K5LiDml6LlrprlgKTjga8ge0BsaW5rIFdlYlN0b3JhZ2V9XG4gKi9cbmNsYXNzIFN0b3JhZ2VEYXRhU3luYyBpbXBsZW1lbnRzIElTdG9yYWdlRGF0YVN5bmMge1xuICAgIHByaXZhdGUgX3N0b3JhZ2U6IElTdG9yYWdlO1xuICAgIHByaXZhdGUgX3NlcGFyYXRvcjogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdG9yYWdlXG4gICAgICogIC0gYGVuYCB7QGxpbmsgSVN0b3JhZ2V9IG9iamVjdFxuICAgICAqICAtIGBqYWAge0BsaW5rIElTdG9yYWdlfSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0b3JhZ2U6IElTdG9yYWdlLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcbiAgICAgICAgdGhpcy5fc2VwYXJhdG9yID0gb3B0aW9ucz8uc2VwYXJhdG9yID8/IENvbnN0LlNFUEFSQVRPUjtcbiAgICB9XG5cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIGltcGxlbWVudHM6IElTdG9yYWdlRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4ge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcge0BsaW5rIElTdG9yYWdlfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIHtAbGluayBJU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXMge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gbmV3U3RvcmFnZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcgaWQtc2VwYXJhdG9yLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgSUQg44K744OR44Os44O844K/44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3U2VwYXJhdG9yXG4gICAgICogIC0gYGVuYCBuZXcgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5paw44GX44GE44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDku6XliY3jgYToqK3lrprjgZXjgozjgabjgYTjgZ/jgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBzZXRJZFNlcGFyYXRvcihuZXdTZXBhcmF0b3I6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG9sZFNlcGFyYXRvciA9IHRoaXMuX3NlcGFyYXRvcjtcbiAgICAgICAgdGhpcy5fc2VwYXJhdG9yID0gbmV3U2VwYXJhdG9yO1xuICAgICAgICByZXR1cm4gb2xkU2VwYXJhdG9yO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBJRGF0YVN5bmN9IGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSB7QGxpbmsgSURhdGFTeW5jfSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgeyBtb2RlbCwga2V5LCB1cmwsIGRhdGEgfSA9IHBhcnNlQ29udGV4dChjb250ZXh0IGFzIEFjY2Vzc2libGU8U3luY0NvbnRleHQ+LCB0aGlzLl9zZXBhcmF0b3IpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByZXNwb25jZTogUGxhaW5PYmplY3QgfCB2b2lkIHwgbnVsbDtcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRzID0gZGVlcE1lcmdlKHsgZGF0YSB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IGF3YWl0IHRoaXMudXBkYXRlKGtleSwgY29udGV4dCwgdXJsLCBkYXRhW09iamVjdC5rZXlzKGRhdGEpWzBdXSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgICAgY2FzZSAncGF0Y2gnOiB7XG4gICAgICAgICAgICAgICAgcmVzcG9uY2UgPSBhd2FpdCB0aGlzLnVwZGF0ZShrZXksIGNvbnRleHQsIHVybCwgY29udGV4dC5pZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gYXdhaXQgdGhpcy5kZXN0cm95KGtleSwgY29udGV4dCwgdXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gYXdhaXQgdGhpcy5maW5kKG1vZGVsLCBrZXksIHVybCwgb3B0aW9ucykgYXMgUGxhaW5PYmplY3Q7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gcmVzcG9uY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfREFUQV9OT1RfRk9VTkQsIGBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgYHVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCBQcm9taXNlLnJlc29sdmUocmVzcG9uY2UhKSk7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBTeW5jUmVzdWx0PEs+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaW1hdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5RW50cmllcyh1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPHsgaWRzOiBib29sZWFuOyBpdGVtczogKFBsYWluT2JqZWN0IHwgc3RyaW5nKVtdOyB9PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtPG9iamVjdD4odXJsLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaXRlbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGlkczogdHJ1ZSwgaXRlbXM6IFtdIH07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGlkczogIWl0ZW1zLmxlbmd0aCB8fCBpc1N0cmluZyhpdGVtc1swXSksIGl0ZW1zIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSwgYGVudHJ5IGlzIG5vdCBBcnJheSB0eXBlLmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgc2F2ZUVudHJpZXModXJsOiBzdHJpbmcsIGVudHJpZXM6IHN0cmluZ1tdLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHVybCwgZW50cmllcywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZmluZChtb2RlbDogYm9vbGVhbiwga2V5OiBzdHJpbmcsIHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCBQbGFpbk9iamVjdFtdIHwgbnVsbD4ge1xuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGtleSwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIG11bHRpLWVudHJ5XG4gICAgICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGlmIChpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZmluZEFsbFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpcmVzOiBQbGFpbk9iamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaWQgb2YgaXRlbXMgYXMgc3RyaW5nW10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihgJHt1cmx9JHt0aGlzLl9zZXBhcmF0b3J9JHtpZH1gLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5ICYmIGVudGlyZXMucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVudGlyZXM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW1zIGFzIFBsYWluT2JqZWN0W107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGlmIChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlkgPT09IHJlc3VsdC5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGtleSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGUoa2V5OiBzdHJpbmcsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCB1cmw6IHN0cmluZywgaWQ/OiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgeyBkYXRhIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCBhdHRycyA9IE9iamVjdC5hc3NpZ24oY29udGV4dC50b0pTT04oKSwgZGF0YSk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGtleSAhPT0gdXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoaWRzICYmIGlkICYmICFpdGVtcy5pbmNsdWRlcyhpZCkpIHtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVFbnRyaWVzKHVybCwgaXRlbXMgYXMgc3RyaW5nW10sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmZpbmQodHJ1ZSwga2V5LCB1cmwsIG9wdGlvbnMpIGFzIFByb21pc2U8UGxhaW5PYmplY3QgfCBudWxsPjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBkZXN0cm95KGtleTogc3RyaW5nLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+IHtcbiAgICAgICAgY29uc3Qgb2xkID0gYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXksIG9wdGlvbnMpO1xuICAgICAgICBpZiAoa2V5ICE9PSB1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChpZHMgJiYgY29udGV4dC5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJpZXMgPSBpdGVtcy5maWx0ZXIoaSA9PiBpICE9PSBjb250ZXh0LmlkKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVFbnRyaWVzKHVybCwgZW50cmllcyBhcyBzdHJpbmdbXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9sZCBhcyBQbGFpbk9iamVjdDtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSB7QGxpbmsgSVN0b3JhZ2VEYXRhU3luY30gb2JqZWN0IHdpdGgge0BsaW5rIElTdG9yYWdlfS5cbiAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOCkuaMh+WumuOBl+OBpiwge0BsaW5rIElTdG9yYWdlRGF0YVN5bmN9IOOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBzdG9yYWdlXG4gKiAgLSBgZW5gIHtAbGluayBJU3RvcmFnZX0gb2JqZWN0XG4gKiAgLSBgamFgIHtAbGluayBJU3RvcmFnZX0g44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9uc1xuICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVN0b3JhZ2VEYXRhU3luYyA9IChzdG9yYWdlOiBJU3RvcmFnZSwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMpOiBJU3RvcmFnZURhdGFTeW5jID0+IHtcbiAgICByZXR1cm4gbmV3IFN0b3JhZ2VEYXRhU3luYyhzdG9yYWdlLCBvcHRpb25zKTtcbn07XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY1NUT1JBR0UgPSBjcmVhdGVTdG9yYWdlRGF0YVN5bmMod2ViU3RvcmFnZSk7XG4iLCJpbXBvcnQgeyBJRGF0YVN5bmMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZGF0YVN5bmNOVUxMIH0gZnJvbSAnLi9udWxsJztcblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2RlZmF1bHQ6IElEYXRhU3luYyA9IGRhdGFTeW5jTlVMTDtcblxuLyoqXG4gKiBAZW4gR2V0IG9yIHVwZGF0ZSBkZWZhdWx0IHtAbGluayBJRGF0YVN5bmN9IG9iamVjdC5cbiAqIEBqYSDml6Llrprjga4ge0BsaW5rIElEYXRhU3luY30g44Kq44OW44K444Kn44Kv44OI44Gu5Y+W5b6XIC8g5pu05pawXG4gKlxuICogQHBhcmFtIG5ld1N5bmNcbiAqICAtIGBlbmAgbmV3IGRhdGEtc3luYyBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCiyBkYXRhLXN5bmMg44Gu6L+U5Y2044Gu44G/6KGM44GGXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBvbGQgZGF0YS1zeW5jIG9iamVjdC5cbiAqICAtIGBqYWAg5Lul5YmN44GuIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTeW5jKG5ld1N5bmM/OiBJRGF0YVN5bmMpOiBJRGF0YVN5bmMge1xuICAgIGlmIChudWxsID09IG5ld1N5bmMpIHtcbiAgICAgICAgcmV0dXJuIF9kZWZhdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFN5bmMgPSBfZGVmYXVsdDtcbiAgICAgICAgX2RlZmF1bHQgPSBuZXdTeW5jO1xuICAgICAgICByZXR1cm4gb2xkU3luYztcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiY2MiLCJyZXN1bHQiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJhamF4IiwiaXNGdW5jdGlvbiIsImRlZXBNZXJnZSIsImlzQXJyYXkiLCJpc1N0cmluZyIsInRvUmVzdWx0Iiwid2ViU3RvcmFnZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUxELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsa0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxrQkFBd0UsQ0FBQTtZQUN4RSxXQUFnRCxDQUFBLFdBQUEsQ0FBQSwrQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsOEJBQXVCLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBLEdBQUEsK0JBQUEsQ0FBQTtZQUMxSSxXQUFnRCxDQUFBLFdBQUEsQ0FBQSxzQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsOEJBQXVCLENBQUMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFBLEdBQUEsc0NBQUEsQ0FBQTtZQUNuSixXQUFnRCxDQUFBLFdBQUEsQ0FBQSwrQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsOEJBQXVCLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBLEdBQUEsK0NBQUEsQ0FBQTtJQUN6SSxLQUFDLEdBQUEsQ0FBQTtJQUNMLENBQUMsR0FBQTs7SUNWRDs7O0lBR0c7SUFDSCxNQUFNLFlBQVksQ0FBQTs7O0lBS2Q7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLElBQUksR0FBQTtJQUNKLFFBQUEsT0FBTyxNQUFNLENBQUM7U0FDakI7SUFFRDs7Ozs7Ozs7Ozs7OztJQWFHO0lBQ0gsSUFBQSxNQUFNLElBQUks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