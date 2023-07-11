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

    /* eslint-disable
        @typescript-eslint/dot-notation,
     */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwibnVsbC50cyIsImludGVybmFsLnRzIiwicmVzdC50cyIsInN0b3JhZ2UudHMiLCJzZXR0aW5ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFNZTkMgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1NZTkNfREVDTEFSRSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUyAgICAgICAgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMSwgJ2ludmFsaWQgc3luYyBwYXJhbXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAyLCAnaW52YWxpZCBzeW5jIHN0b3JhZ2UgZW50aXJlcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5EID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDMsICdkYXRhIG5vdCBmb3VuZC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgSURhdGFTeW5jfSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggaGFzIG5vIGVmZmVjdHMuXG4gKiBAamEg5L2V44KC44GX44Gq44GEIHtAbGluayBJRGF0YVN5bmN9IOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBOdWxsRGF0YVN5bmMgaW1wbGVtZW50cyBJRGF0YVN5bmM8b2JqZWN0PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0PG9iamVjdD4sIG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxTeW5jUmVzdWx0PEssIG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgIGNvbnN0IHJlc3BvbmNlID0gUHJvbWlzZS5yZXNvbHZlKCdyZWFkJyA9PT0gbWV0aG9kID8ge30gOiB1bmRlZmluZWQpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uY2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgUHJvbWlzZTxTeW5jUmVzdWx0PEssIG9iamVjdD4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jTlVMTCA9IG5ldyBOdWxsRGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM8b2JqZWN0PjtcbiIsImltcG9ydCB7IHJlc3VsdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgcmVzb2x2ZSBsYWNrIHByb3BlcnR5ICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVVSTChjb250ZXh0OiBTeW5jQ29udGV4dCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc3VsdChjb250ZXh0LCAndXJsJyk7XG59XG4iLCJpbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IEFqYXhPcHRpb25zLCBhamF4IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciB7QGxpbmsgUmVzdERhdGFTeW5jfS5cbiAqIEBqYSB7QGxpbmsgUmVzdERhdGFTeW5jfSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXN0RGF0YVN5bmNPcHRpb25zIGV4dGVuZHMgQWpheE9wdGlvbnM8J2pzb24nPiB7XG4gICAgdXJsPzogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbWV0aG9kTWFwID0ge1xuICAgIGNyZWF0ZTogJ1BPU1QnLFxuICAgIHVwZGF0ZTogJ1BVVCcsXG4gICAgcGF0Y2g6ICdQQVRDSCcsXG4gICAgZGVsZXRlOiAnREVMRVRFJyxcbiAgICByZWFkOiAnR0VUJ1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgSURhdGFTeW5jfSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggY29tcGxpYW50IFJFU1RmdWwuXG4gKiBAamEgUkVTVCDjgavmupbmi6DjgZfjgZ8ge0BsaW5rIElEYXRhU3luY30g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJlc3REYXRhU3luYyBpbXBsZW1lbnRzIElEYXRhU3luYyB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdyZXN0JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc3Qgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAgUkVTVCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFJlc3REYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IGRhdGFUeXBlOiAnanNvbicgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgdXJsID0gcGFyYW1zLnVybCA/PyByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtcy5tZXRob2QgPSBfbWV0aG9kTWFwW21ldGhvZF07XG5cbiAgICAgICAgLy8gRW5zdXJlIHJlcXVlc3QgZGF0YS5cbiAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zLmRhdGEgJiYgKCdjcmVhdGUnID09PSBtZXRob2QgfHwgJ3VwZGF0ZScgPT09IG1ldGhvZCB8fCAncGF0Y2gnID09PSBtZXRob2QpKSB7XG4gICAgICAgICAgICBwYXJhbXMuZGF0YSA9IGNvbnRleHQudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBamF4IHJlcXVlc3RcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBhamF4KHVybCwgcGFyYW1zKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLPj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3IFJlc3REYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvbixcbiAqL1xuXG5pbXBvcnQge1xuICAgIEFjY2Vzc2libGUsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGRlZXBNZXJnZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgbWFrZVJlc3VsdCxcbiAgICB0b1Jlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgSVN0b3JhZ2UsIElTdG9yYWdlT3B0aW9ucyB9IGZyb20gJ0BjZHAvY29yZS1zdG9yYWdlJztcbmltcG9ydCB7IHdlYlN0b3JhZ2UgfSBmcm9tICdAY2RwL3dlYi1zdG9yYWdlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jT3B0aW9ucyxcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY09iamVjdCxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVVSTCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBTRVBBUkFUT1IgPSAnOjonLFxufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBpbnRlcmZhY2UgZm9yIHtAbGluayBJU3RvcmFnZX0gYWNjZXNzb3IuXG4gKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgqLjgq/jgrvjg4PjgrXjgpLlgpnjgYjjgosge0BsaW5rIElEYXRhU3luY30g44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSVN0b3JhZ2VEYXRhU3luYzxUIGV4dGVuZHMgb2JqZWN0ID0gU3luY09iamVjdD4gZXh0ZW5kcyBJRGF0YVN5bmM8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4ge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcge0BsaW5rIElTdG9yYWdlfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIHtAbGluayBJU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSDmp4vnr4njgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdG9yYWdlRGF0YVN5bmNDb25zdHJ1Y3Rpb25PcHRpb25zIHtcbiAgICBzZXBhcmF0b3I/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfS5cbiAqIEBqYSB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IHR5cGUgU3RvcmFnZURhdGFTeW5jT3B0aW9ucyA9IElEYXRhU3luY09wdGlvbnMgJiBJU3RvcmFnZU9wdGlvbnM7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNoZWNrIG1vZGVsIG9yIG5vdCAqL1xuZnVuY3Rpb24gaXNNb2RlbChjb250ZXh0OiBTeW5jQ29udGV4dCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIShjb250ZXh0LmNvbnN0cnVjdG9yIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ2lkQXR0cmlidXRlJ107XG59XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIGlkICovXG5mdW5jdGlvbiBnZW5JZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3VybH06JHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX1gO1xufVxuXG4vKiogQGludGVybmFsIHJlc29sdmUga2V5IGZvciBsb2NhbFN0b3JhZ2UgKi9cbmZ1bmN0aW9uIHBhcnNlQ29udGV4dChjb250ZXh0OiBBY2Nlc3NpYmxlPFN5bmNDb250ZXh0Piwgc2VwYXJhdG9yOiBzdHJpbmcpOiB7IG1vZGVsOiBib29sZWFuOyBrZXk6IHN0cmluZzsgdXJsOiBzdHJpbmc7IGRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47IH0ge1xuICAgIGNvbnN0IG1vZGVsICA9IGlzTW9kZWwoY29udGV4dCk7XG4gICAgY29uc3QgdXJsICAgID0gcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICBjb25zdCBpZEF0dHIgPSAoY29udGV4dC5jb25zdHJ1Y3RvciBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pWydpZEF0dHJpYnV0ZSddO1xuICAgIGNvbnN0IGRhdGEgPSAoKCkgPT4ge1xuICAgICAgICBjb25zdCByZXR2YWwgPSB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkICAgID0gIWlzRnVuY3Rpb24oY29udGV4dFsnaGFzJ10pID8gZmFsc2UgOiBjb250ZXh0WydoYXMnXShpZEF0dHIpIGFzIGJvb2xlYW47XG4gICAgICAgICAgICByZXR2YWxbaWRBdHRyXSA9IHZhbGlkID8gY29udGV4dC5pZCEgOiBnZW5JZCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfSkoKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgdXJsLFxuICAgICAgICBrZXk6IGAke3VybH0ke21vZGVsID8gYCR7c2VwYXJhdG9yfSR7ZGF0YVtpZEF0dHJdfWAgOiAnJ31gLFxuICAgICAgICBkYXRhLFxuICAgIH07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUge0BsaW5rIElEYXRhU3luY30gaW1wbGVtYW50IGNsYXNzIHdoaWNoIHRhcmdldCBpcyB7QGxpbmsgSVN0b3JhZ2V9LiBEZWZhdWx0IHN0b3JhZ2UgaXMge0BsaW5rIFdlYlN0b3JhZ2V9LlxuICogQGphIHtAbGluayBJU3RvcmFnZX0g44KS5a++6LGh44Go44GX44GfIHtAbGluayBJRGF0YVN5bmN9IOWun+ijheOCr+ODqeOCuS4g5pei5a6a5YCk44GvIHtAbGluayBXZWJTdG9yYWdlfVxuICovXG5jbGFzcyBTdG9yYWdlRGF0YVN5bmMgaW1wbGVtZW50cyBJU3RvcmFnZURhdGFTeW5jIHtcbiAgICBwcml2YXRlIF9zdG9yYWdlOiBJU3RvcmFnZTtcbiAgICBwcml2YXRlIF9zZXBhcmF0b3I6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RvcmFnZVxuICAgICAqICAtIGBlbmAge0BsaW5rIElTdG9yYWdlfSBvYmplY3RcbiAgICAgKiAgLSBgamFgIHtAbGluayBJU3RvcmFnZX0g44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdG9yYWdlOiBJU3RvcmFnZSwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgICAgIHRoaXMuX3NlcGFyYXRvciA9IG9wdGlvbnM/LnNlcGFyYXRvciA/PyBDb25zdC5TRVBBUkFUT1I7XG4gICAgfVxuXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBpbXBsZW1lbnRzOiBJU3RvcmFnZURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQge0BsaW5rIElTdG9yYWdlfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo5a++6LGh44GuIHtAbGluayBJU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K544Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0U3RvcmFnZSgpOiBJU3RvcmFnZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IHtAbGluayBJU3RvcmFnZX0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCB7QGxpbmsgSVN0b3JhZ2V9IOOCpOODs+OCueOCv+ODs+OCueOCkuioreWumlxuICAgICAqL1xuICAgIHNldFN0b3JhZ2UobmV3U3RvcmFnZTogSVN0b3JhZ2UpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IG5ld1N0b3JhZ2U7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IGlkLXNlcGFyYXRvci5cbiAgICAgKiBAamEg5paw44GX44GEIElEIOOCu+ODkeODrOODvOOCv+OCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1NlcGFyYXRvclxuICAgICAqICAtIGBlbmAgbmV3IHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5Lul5YmN44GE6Kit5a6a44GV44KM44Gm44GE44Gf44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICovXG4gICAgc2V0SWRTZXBhcmF0b3IobmV3U2VwYXJhdG9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBvbGRTZXBhcmF0b3IgPSB0aGlzLl9zZXBhcmF0b3I7XG4gICAgICAgIHRoaXMuX3NlcGFyYXRvciA9IG5ld1NlcGFyYXRvcjtcbiAgICAgICAgcmV0dXJuIG9sZFNlcGFyYXRvcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdzdG9yYWdlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PEs+PiB7XG4gICAgICAgIGNvbnN0IHsgbW9kZWwsIGtleSwgdXJsLCBkYXRhIH0gPSBwYXJzZUNvbnRleHQoY29udGV4dCBhcyBBY2Nlc3NpYmxlPFN5bmNDb250ZXh0PiwgdGhpcy5fc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsICdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcmVzcG9uY2U6IFBsYWluT2JqZWN0IHwgdm9pZCB8IG51bGw7XG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0cyA9IGRlZXBNZXJnZSh7IGRhdGEgfSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgcmVzcG9uY2UgPSBhd2FpdCB0aGlzLnVwZGF0ZShrZXksIGNvbnRleHQsIHVybCwgZGF0YVtPYmplY3Qua2V5cyhkYXRhKVswXV0sIG9wdHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3BhdGNoJzoge1xuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gYXdhaXQgdGhpcy51cGRhdGUoa2V5LCBjb250ZXh0LCB1cmwsIGNvbnRleHQuaWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IGF3YWl0IHRoaXMuZGVzdHJveShrZXksIGNvbnRleHQsIHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyZWFkJzpcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IGF3YWl0IHRoaXMuZmluZChtb2RlbCwga2V5LCB1cmwsIG9wdGlvbnMpIGFzIFBsYWluT2JqZWN0O1xuICAgICAgICAgICAgICAgIGlmIChudWxsID09IHJlc3BvbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5ELCBgbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsIGB1bmtub3duIG1ldGhvZDogJHttZXRob2R9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgUHJvbWlzZS5yZXNvbHZlKHJlc3BvbmNlISkpO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgU3luY1Jlc3VsdDxLPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcmltYXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUVudHJpZXModXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTx7IGlkczogYm9vbGVhbjsgaXRlbXM6IChQbGFpbk9iamVjdCB8IHN0cmluZylbXTsgfT4ge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxvYmplY3Q+KHVybCwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChudWxsID09IGl0ZW1zKSB7XG4gICAgICAgICAgICByZXR1cm4geyBpZHM6IHRydWUsIGl0ZW1zOiBbXSB9O1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkoaXRlbXMpKSB7XG4gICAgICAgICAgICByZXR1cm4geyBpZHM6ICFpdGVtcy5sZW5ndGggfHwgaXNTdHJpbmcoaXRlbXNbMF0pLCBpdGVtcyB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlksIGBlbnRyeSBpcyBub3QgQXJyYXkgdHlwZS5gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHNhdmVFbnRyaWVzKHVybDogc3RyaW5nLCBlbnRyaWVzOiBzdHJpbmdbXSwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbSh1cmwsIGVudHJpZXMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGZpbmQobW9kZWw6IGJvb2xlYW4sIGtleTogc3RyaW5nLCB1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgUGxhaW5PYmplY3RbXSB8IG51bGw+IHtcbiAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihrZXksIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBtdWx0aS1lbnRyeVxuICAgICAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBpZiAoaWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmRBbGxcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50aXJlczogUGxhaW5PYmplY3RbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGlkIG9mIGl0ZW1zIGFzIHN0cmluZ1tdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeSA9IGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oYCR7dXJsfSR7dGhpcy5fc2VwYXJhdG9yfSR7aWR9YCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRyeSAmJiBlbnRpcmVzLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbnRpcmVzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtcyBhcyBQbGFpbk9iamVjdFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0b1Jlc3VsdChlKTtcbiAgICAgICAgICAgICAgICBpZiAoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0VOVFJZID09PSByZXN1bHQuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihrZXksIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlKGtleTogc3RyaW5nLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgdXJsOiBzdHJpbmcsIGlkPzogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3QgYXR0cnMgPSBPYmplY3QuYXNzaWduKGNvbnRleHQudG9KU09OKCksIGRhdGEpO1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLnNldEl0ZW0oa2V5LCBhdHRycywgb3B0aW9ucyk7XG4gICAgICAgIGlmIChrZXkgIT09IHVybCkge1xuICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKGlkcyAmJiBpZCAmJiAhaXRlbXMuaW5jbHVkZXMoaWQpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaChpZCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlRW50cmllcyh1cmwsIGl0ZW1zIGFzIHN0cmluZ1tdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5maW5kKHRydWUsIGtleSwgdXJsLCBvcHRpb25zKSBhcyBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD47XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZGVzdHJveShrZXk6IHN0cmluZywgY29udGV4dDogU3luY0NvbnRleHQsIHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IG9sZCA9IGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbShrZXksIG9wdGlvbnMpO1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLnJlbW92ZUl0ZW0oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGtleSAhPT0gdXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoaWRzICYmIGNvbnRleHQuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnRyaWVzID0gaXRlbXMuZmlsdGVyKGkgPT4gaSAhPT0gY29udGV4dC5pZCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlRW50cmllcyh1cmwsIGVudHJpZXMgYXMgc3RyaW5nW10sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvbGQgYXMgUGxhaW5PYmplY3Q7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUge0BsaW5rIElTdG9yYWdlRGF0YVN5bmN9IG9iamVjdCB3aXRoIHtAbGluayBJU3RvcmFnZX0uXG4gKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgpLmjIflrprjgZfjgaYsIHtAbGluayBJU3RvcmFnZURhdGFTeW5jfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc3RvcmFnZVxuICogIC0gYGVuYCB7QGxpbmsgSVN0b3JhZ2V9IG9iamVjdFxuICogIC0gYGphYCB7QGxpbmsgSVN0b3JhZ2V9IOOCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnNcbiAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVTdG9yYWdlRGF0YVN5bmMgPSAoc3RvcmFnZTogSVN0b3JhZ2UsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNDb25zdHJ1Y3Rpb25PcHRpb25zKTogSVN0b3JhZ2VEYXRhU3luYyA9PiB7XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRGF0YVN5bmMoc3RvcmFnZSwgb3B0aW9ucyk7XG59O1xuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNTVE9SQUdFID0gY3JlYXRlU3RvcmFnZURhdGFTeW5jKHdlYlN0b3JhZ2UpO1xuIiwiaW1wb3J0IHsgSURhdGFTeW5jIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRhdGFTeW5jTlVMTCB9IGZyb20gJy4vbnVsbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF9kZWZhdWx0OiBJRGF0YVN5bmMgPSBkYXRhU3luY05VTEw7XG5cbi8qKlxuICogQGVuIEdldCBvciB1cGRhdGUgZGVmYXVsdCB7QGxpbmsgSURhdGFTeW5jfSBvYmplY3QuXG4gKiBAamEg5pei5a6a44GuIHtAbGluayBJRGF0YVN5bmN9IOOCquODluOCuOOCp+OCr+ODiOOBruWPluW+lyAvIOabtOaWsFxuICpcbiAqIEBwYXJhbSBuZXdTeW5jXG4gKiAgLSBgZW5gIG5ldyBkYXRhLXN5bmMgb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgosgZGF0YS1zeW5jIOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIGRhdGEtc3luYyBvYmplY3QuXG4gKiAgLSBgamFgIOS7peWJjeOBriBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U3luYyhuZXdTeW5jPzogSURhdGFTeW5jKTogSURhdGFTeW5jIHtcbiAgICBpZiAobnVsbCA9PSBuZXdTeW5jKSB7XG4gICAgICAgIHJldHVybiBfZGVmYXVsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRTeW5jID0gX2RlZmF1bHQ7XG4gICAgICAgIF9kZWZhdWx0ID0gbmV3U3luYztcbiAgICAgICAgcmV0dXJuIG9sZFN5bmM7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNjIiwicmVzdWx0IiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwiYWpheCIsImlzRnVuY3Rpb24iLCJkZWVwTWVyZ2UiLCJpc0FycmF5IiwiaXNTdHJpbmciLCJ0b1Jlc3VsdCIsIndlYlN0b3JhZ2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBS0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFMRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGtCQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsa0JBQXdFLENBQUE7WUFDeEUsV0FBZ0QsQ0FBQSxXQUFBLENBQUEsK0JBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDhCQUF1QixDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQSxHQUFBLCtCQUFBLENBQUE7WUFDMUksV0FBZ0QsQ0FBQSxXQUFBLENBQUEsc0NBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDhCQUF1QixDQUFDLEVBQUUsK0JBQStCLENBQUMsQ0FBQSxHQUFBLHNDQUFBLENBQUE7WUFDbkosV0FBZ0QsQ0FBQSxXQUFBLENBQUEsK0NBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDhCQUF1QixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQSxHQUFBLCtDQUFBLENBQUE7SUFDekksS0FBQyxHQUFBLENBQUE7SUFDTCxDQUFDLEdBQUE7O0lDVkQ7OztJQUdHO0lBQ0gsTUFBTSxZQUFZLENBQUE7OztJQUtkOzs7SUFHRztJQUNILElBQUEsSUFBSSxJQUFJLEdBQUE7SUFDSixRQUFB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