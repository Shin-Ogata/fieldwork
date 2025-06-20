/*!
 * @cdp/data-sync 0.9.19
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
            const response = Promise.resolve('read' === method ? {} : undefined);
            context.trigger('@request', context, response);
            return response;
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
            const response = ajax.ajax(url, params);
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
            let response;
            switch (method) {
                case 'create': {
                    const opts = coreUtils.deepMerge({ data }, options);
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
                        throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND, `method: ${method}`);
                    }
                    break;
                default:
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, `unknown method: ${method}`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwibnVsbC50cyIsImludGVybmFsLnRzIiwicmVzdC50cyIsInN0b3JhZ2UudHMiLCJzZXR0aW5ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFNZTkMgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1NZTkNfREVDTEFSRSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUyAgICAgICAgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMSwgJ2ludmFsaWQgc3luYyBwYXJhbXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAyLCAnaW52YWxpZCBzeW5jIHN0b3JhZ2UgZW50aXJlcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5EID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDMsICdkYXRhIG5vdCBmb3VuZC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHR5cGUge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBUaGUge0BsaW5rIElEYXRhU3luY30gaW1wbGVtYW50IGNsYXNzIHdoaWNoIGhhcyBubyBlZmZlY3RzLlxuICogQGphIOS9leOCguOBl+OBquOBhCB7QGxpbmsgSURhdGFTeW5jfSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgTnVsbERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jPG9iamVjdD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIElEYXRhU3luY30ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIHtAbGluayBJRGF0YVN5bmN9IOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzeW5jKG1ldGhvZDogU3luY01ldGhvZHMsIGNvbnRleHQ6IFN5bmNDb250ZXh0PG9iamVjdD4sIG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxTeW5jUmVzdWx0PG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gUHJvbWlzZS5yZXNvbHZlKCdyZWFkJyA9PT0gbWV0aG9kID8ge30gOiB1bmRlZmluZWQpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uc2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNOVUxMID0gbmV3IE51bGxEYXRhU3luYygpIGFzIElEYXRhU3luYzxvYmplY3Q+O1xuIiwiaW1wb3J0IHsgcmVzdWx0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgU3luY0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIHJlc29sdmUgbGFjayBwcm9wZXJ0eSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVVUkwoY29udGV4dDogU3luY0NvbnRleHQpOiBzdHJpbmcge1xuICAgIHJldHVybiByZXN1bHQoY29udGV4dCwgJ3VybCcpO1xufVxuIiwiaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyB0eXBlIEFqYXhPcHRpb25zLCBhamF4IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB0eXBlIHtcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbiAgICBTeW5jT2JqZWN0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVVSTCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIGludGVyZmFjZSBmb3Ige0BsaW5rIFJlc3REYXRhU3luY30uXG4gKiBAamEge0BsaW5rIFJlc3REYXRhU3luY30g44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdERhdGFTeW5jT3B0aW9ucyBleHRlbmRzIEFqYXhPcHRpb25zPCdqc29uJz4ge1xuICAgIHVybD86IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX21ldGhvZE1hcCA9IHtcbiAgICBjcmVhdGU6ICdQT1NUJyxcbiAgICB1cGRhdGU6ICdQVVQnLFxuICAgIHBhdGNoOiAnUEFUQ0gnLFxuICAgIGRlbGV0ZTogJ0RFTEVURScsXG4gICAgcmVhZDogJ0dFVCdcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUge0BsaW5rIElEYXRhU3luY30gaW1wbGVtYW50IGNsYXNzIHdoaWNoIGNvbXBsaWFudCBSRVNUZnVsLlxuICogQGphIFJFU1Qg44Gr5rqW5oug44GX44GfIHtAbGluayBJRGF0YVN5bmN9IOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSZXN0RGF0YVN5bmM8VCBleHRlbmRzIG9iamVjdCA9IFN5bmNPYmplY3Q+IGltcGxlbWVudHMgSURhdGFTeW5jPFQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBJRGF0YVN5bmN9IGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSB7QGxpbmsgSURhdGFTeW5jfSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3Jlc3QnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVzdCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCBSRVNUIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHN5bmMobWV0aG9kOiBTeW5jTWV0aG9kcywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBSZXN0RGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PFQ+PiB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyBkYXRhVHlwZTogJ2pzb24nIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHVybCA9IHBhcmFtcy51cmwgPz8gcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsICdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBwYXJhbXMubWV0aG9kID0gX21ldGhvZE1hcFttZXRob2RdO1xuXG4gICAgICAgIC8vIEVuc3VyZSByZXF1ZXN0IGRhdGEuXG4gICAgICAgIGlmIChudWxsID09IHBhcmFtcy5kYXRhICYmICgnY3JlYXRlJyA9PT0gbWV0aG9kIHx8ICd1cGRhdGUnID09PSBtZXRob2QgfHwgJ3BhdGNoJyA9PT0gbWV0aG9kKSkge1xuICAgICAgICAgICAgcGFyYW1zLmRhdGEgPSBjb250ZXh0LnRvSlNPTigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWpheCByZXF1ZXN0XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYWpheCh1cmwsIHBhcmFtcyk7XG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25zZSk7XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY1JFU1QgPSBuZXcgUmVzdERhdGFTeW5jKCkgYXMgSURhdGFTeW5jO1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICBpc0FycmF5LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgZGVlcE1lcmdlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgdHlwZSB7IElTdG9yYWdlLCBJU3RvcmFnZU9wdGlvbnMgfSBmcm9tICdAY2RwL2NvcmUtc3RvcmFnZSc7XG5pbXBvcnQgeyB3ZWJTdG9yYWdlIH0gZnJvbSAnQGNkcC93ZWItc3RvcmFnZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSURhdGFTeW5jT3B0aW9ucyxcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY09iamVjdCxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVVSTCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBTRVBBUkFUT1IgPSAnOjonLFxufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBpbnRlcmZhY2UgZm9yIHtAbGluayBJU3RvcmFnZX0gYWNjZXNzb3IuXG4gKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgqLjgq/jgrvjg4PjgrXjgpLlgpnjgYjjgosge0BsaW5rIElEYXRhU3luY30g44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSVN0b3JhZ2VEYXRhU3luYzxUIGV4dGVuZHMgb2JqZWN0ID0gU3luY09iamVjdD4gZXh0ZW5kcyBJRGF0YVN5bmM8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4ge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXRTdG9yYWdlKCk6IElTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBuZXcge0BsaW5rIElTdG9yYWdlfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIHtAbGluayBJU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSDmp4vnr4njgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdG9yYWdlRGF0YVN5bmNDb25zdHJ1Y3Rpb25PcHRpb25zIHtcbiAgICBzZXBhcmF0b3I/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfS5cbiAqIEBqYSB7QGxpbmsgU3RvcmFnZURhdGFTeW5jfSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IHR5cGUgU3RvcmFnZURhdGFTeW5jT3B0aW9ucyA9IElEYXRhU3luY09wdGlvbnMgJiBJU3RvcmFnZU9wdGlvbnM7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNoZWNrIG1vZGVsIG9yIG5vdCAqL1xuZnVuY3Rpb24gaXNNb2RlbChjb250ZXh0OiBTeW5jQ29udGV4dCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIShjb250ZXh0LmNvbnN0cnVjdG9yIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ2lkQXR0cmlidXRlJ107XG59XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIGlkICovXG5mdW5jdGlvbiBnZW5JZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3VybH06JHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX1gO1xufVxuXG4vKiogQGludGVybmFsIHJlc29sdmUga2V5IGZvciBsb2NhbFN0b3JhZ2UgKi9cbmZ1bmN0aW9uIHBhcnNlQ29udGV4dChjb250ZXh0OiBBY2Nlc3NpYmxlPFN5bmNDb250ZXh0Piwgc2VwYXJhdG9yOiBzdHJpbmcpOiB7IG1vZGVsOiBib29sZWFuOyBrZXk6IHN0cmluZzsgdXJsOiBzdHJpbmc7IGRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47IH0ge1xuICAgIGNvbnN0IG1vZGVsICA9IGlzTW9kZWwoY29udGV4dCk7XG4gICAgY29uc3QgdXJsICAgID0gcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICBjb25zdCBpZEF0dHIgPSAoY29udGV4dC5jb25zdHJ1Y3RvciBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pWydpZEF0dHJpYnV0ZSddO1xuICAgIGNvbnN0IGRhdGEgPSAoKCkgPT4ge1xuICAgICAgICBjb25zdCByZXR2YWwgPSB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkICAgID0gIWlzRnVuY3Rpb24oY29udGV4dFsnaGFzJ10pID8gZmFsc2UgOiBjb250ZXh0WydoYXMnXShpZEF0dHIpIGFzIGJvb2xlYW47XG4gICAgICAgICAgICByZXR2YWxbaWRBdHRyXSA9IHZhbGlkID8gY29udGV4dC5pZCEgOiBnZW5JZCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfSkoKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgdXJsLFxuICAgICAgICBrZXk6IGAke3VybH0ke21vZGVsID8gYCR7c2VwYXJhdG9yfSR7ZGF0YVtpZEF0dHJdfWAgOiAnJ31gLFxuICAgICAgICBkYXRhLFxuICAgIH07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUge0BsaW5rIElEYXRhU3luY30gaW1wbGVtYW50IGNsYXNzIHdoaWNoIHRhcmdldCBpcyB7QGxpbmsgSVN0b3JhZ2V9LiBEZWZhdWx0IHN0b3JhZ2UgaXMge0BsaW5rIFdlYlN0b3JhZ2V9LlxuICogQGphIHtAbGluayBJU3RvcmFnZX0g44KS5a++6LGh44Go44GX44GfIHtAbGluayBJRGF0YVN5bmN9IOWun+ijheOCr+ODqeOCuS4g5pei5a6a5YCk44GvIHtAbGluayBXZWJTdG9yYWdlfVxuICovXG5jbGFzcyBTdG9yYWdlRGF0YVN5bmM8VCBleHRlbmRzIG9iamVjdCA9IFN5bmNPYmplY3Q+IGltcGxlbWVudHMgSVN0b3JhZ2VEYXRhU3luYzxUPiB7XG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogSVN0b3JhZ2U7XG4gICAgcHJpdmF0ZSBfc2VwYXJhdG9yOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIHtAbGluayBJU3RvcmFnZX0gb2JqZWN0XG4gICAgICogIC0gYGphYCB7QGxpbmsgSVN0b3JhZ2V9IOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RvcmFnZTogSVN0b3JhZ2UsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBzdG9yYWdlO1xuICAgICAgICB0aGlzLl9zZXBhcmF0b3IgPSBvcHRpb25zPy5zZXBhcmF0b3IgPz8gQ29uc3QuU0VQQVJBVE9SO1xuICAgIH1cblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gaW1wbGVtZW50czogSVN0b3JhZ2VEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IHtAbGluayBJU3RvcmFnZX0gaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOWvvuixoeOBriB7QGxpbmsgSVN0b3JhZ2V9IOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDmlrDjgZfjgYQge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLoqK3lrppcbiAgICAgKi9cbiAgICBzZXRTdG9yYWdlKG5ld1N0b3JhZ2U6IElTdG9yYWdlKTogdGhpcyB7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBuZXdTdG9yYWdlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgb2xkU2VwYXJhdG9yID0gdGhpcy5fc2VwYXJhdG9yO1xuICAgICAgICB0aGlzLl9zZXBhcmF0b3IgPSBuZXdTZXBhcmF0b3I7XG4gICAgICAgIHJldHVybiBvbGRTZXBhcmF0b3I7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIElEYXRhU3luY30ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIHtAbGluayBJRGF0YVN5bmN9IOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnc3RvcmFnZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmMobWV0aG9kOiBTeW5jTWV0aG9kcywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PFQ+PiB7XG4gICAgICAgIGNvbnN0IHsgbW9kZWwsIGtleSwgdXJsLCBkYXRhIH0gPSBwYXJzZUNvbnRleHQoY29udGV4dCBhcyBBY2Nlc3NpYmxlPFN5bmNDb250ZXh0PiwgdGhpcy5fc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsICdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcmVzcG9uc2U6IFBsYWluT2JqZWN0IHwgdm9pZCB8IG51bGw7XG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0cyA9IGRlZXBNZXJnZSh7IGRhdGEgfSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnVwZGF0ZShrZXksIGNvbnRleHQsIHVybCwgZGF0YVtPYmplY3Qua2V5cyhkYXRhKVswXV0sIG9wdHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3BhdGNoJzoge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy51cGRhdGUoa2V5LCBjb250ZXh0LCB1cmwsIGNvbnRleHQuaWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuZGVzdHJveShrZXksIGNvbnRleHQsIHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyZWFkJzpcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuZmluZChtb2RlbCwga2V5LCB1cmwsIG9wdGlvbnMpIGFzIFBsYWluT2JqZWN0O1xuICAgICAgICAgICAgICAgIGlmIChudWxsID09IHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5ELCBgbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCBgdW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIFByb21pc2UucmVzb2x2ZShyZXNwb25zZSEpKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFN5bmNSZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpbWF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlFbnRyaWVzKHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8eyBpZHM6IGJvb2xlYW47IGl0ZW1zOiAoUGxhaW5PYmplY3QgfCBzdHJpbmcpW107IH0+IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW08b2JqZWN0Pih1cmwsIG9wdGlvbnMpO1xuICAgICAgICBpZiAobnVsbCA9PSBpdGVtcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgaWRzOiB0cnVlLCBpdGVtczogW10gfTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaWRzOiAhaXRlbXMubGVuZ3RoIHx8IGlzU3RyaW5nKGl0ZW1zWzBdKSwgaXRlbXMgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0VOVFJZLCBgZW50cnkgaXMgbm90IEFycmF5IHR5cGUuYCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzYXZlRW50cmllcyh1cmw6IHN0cmluZywgZW50cmllczogc3RyaW5nW10sIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLnNldEl0ZW0odXJsLCBlbnRyaWVzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kKG1vZGVsOiBib29sZWFuLCBrZXk6IHN0cmluZywgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IFBsYWluT2JqZWN0W10gfCBudWxsPiB7XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gbXVsdGktZW50cnlcbiAgICAgICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgaWYgKGlkcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBmaW5kQWxsXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudGlyZXM6IFBsYWluT2JqZWN0W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpZCBvZiBpdGVtcyBhcyBzdHJpbmdbXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnkgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGAke3VybH0ke3RoaXMuX3NlcGFyYXRvcn0ke2lkfWAsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW50cnkgJiYgZW50aXJlcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW50aXJlcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXMgYXMgUGxhaW5PYmplY3RbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSA9PT0gcmVzdWx0LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZShrZXk6IHN0cmluZywgY29udGV4dDogU3luY0NvbnRleHQsIHVybDogc3RyaW5nLCBpZD86IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IGRhdGEgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmFzc2lnbihjb250ZXh0LnRvSlNPTigpLCBkYXRhKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGtleSwgYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoa2V5ICE9PSB1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChpZHMgJiYgaWQgJiYgIWl0ZW1zLmluY2x1ZGVzKGlkKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUVudHJpZXModXJsLCBpdGVtcyBhcyBzdHJpbmdbXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZmluZCh0cnVlLCBrZXksIHVybCwgb3B0aW9ucykgYXMgUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRlc3Ryb3koa2V5OiBzdHJpbmcsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCB1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCBvbGQgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW0oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChrZXkgIT09IHVybCkge1xuICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKGlkcyAmJiBjb250ZXh0LmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IGl0ZW1zLmZpbHRlcihpID0+IGkgIT09IGNvbnRleHQuaWQpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUVudHJpZXModXJsLCBlbnRyaWVzIGFzIHN0cmluZ1tdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2xkIGFzIFBsYWluT2JqZWN0O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIHtAbGluayBJU3RvcmFnZURhdGFTeW5jfSBvYmplY3Qgd2l0aCB7QGxpbmsgSVN0b3JhZ2V9LlxuICogQGphIHtAbGluayBJU3RvcmFnZX0g44KS5oyH5a6a44GX44GmLCB7QGxpbmsgSVN0b3JhZ2VEYXRhU3luY30g44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIHN0b3JhZ2VcbiAqICAtIGBlbmAge0BsaW5rIElTdG9yYWdlfSBvYmplY3RcbiAqICAtIGBqYWAge0BsaW5rIElTdG9yYWdlfSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zXG4gKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgY3JlYXRlU3RvcmFnZURhdGFTeW5jID0gKHN0b3JhZ2U6IElTdG9yYWdlLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucyk6IElTdG9yYWdlRGF0YVN5bmMgPT4ge1xuICAgIHJldHVybiBuZXcgU3RvcmFnZURhdGFTeW5jKHN0b3JhZ2UsIG9wdGlvbnMpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jU1RPUkFHRSA9IGNyZWF0ZVN0b3JhZ2VEYXRhU3luYyh3ZWJTdG9yYWdlKTtcbiIsImltcG9ydCB0eXBlIHsgSURhdGFTeW5jIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRhdGFTeW5jTlVMTCB9IGZyb20gJy4vbnVsbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF9kZWZhdWx0OiBJRGF0YVN5bmMgPSBkYXRhU3luY05VTEw7XG5cbi8qKlxuICogQGVuIEdldCBvciB1cGRhdGUgZGVmYXVsdCB7QGxpbmsgSURhdGFTeW5jfSBvYmplY3QuXG4gKiBAamEg5pei5a6a44GuIHtAbGluayBJRGF0YVN5bmN9IOOCquODluOCuOOCp+OCr+ODiOOBruWPluW+lyAvIOabtOaWsFxuICpcbiAqIEBwYXJhbSBuZXdTeW5jXG4gKiAgLSBgZW5gIG5ldyBkYXRhLXN5bmMgb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgosgZGF0YS1zeW5jIOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIGRhdGEtc3luYyBvYmplY3QuXG4gKiAgLSBgamFgIOS7peWJjeOBriBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U3luYyhuZXdTeW5jPzogSURhdGFTeW5jKTogSURhdGFTeW5jIHtcbiAgICBpZiAobnVsbCA9PSBuZXdTeW5jKSB7XG4gICAgICAgIHJldHVybiBfZGVmYXVsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRTeW5jID0gX2RlZmF1bHQ7XG4gICAgICAgIF9kZWZhdWx0ID0gbmV3U3luYztcbiAgICAgICAgcmV0dXJuIG9sZFN5bmM7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNjIiwicmVzdWx0IiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwiYWpheCIsImlzRnVuY3Rpb24iLCJkZWVwTWVyZ2UiLCJpc0FycmF5IiwiaXNTdHJpbmciLCJ0b1Jlc3VsdCIsIndlYlN0b3JhZ2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBQUEsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBO0lBQUEsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxrQkFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGtCQUF3RTtZQUN4RSxXQUFBLENBQUEsV0FBQSxDQUFBLCtCQUFBLENBQUEsR0FBZ0QsV0FBQSxDQUFBLGtCQUFrQixDQUFBLEdBQUEsNkJBQXVCLEVBQUEsOEJBQXVCLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBLEdBQUEsK0JBQUE7WUFDMUksV0FBQSxDQUFBLFdBQUEsQ0FBQSxzQ0FBQSxDQUFBLEdBQWdELFdBQUEsQ0FBQSxrQkFBa0IsQ0FBQSxHQUFBLDZCQUF1QixFQUFBLDhCQUF1QixDQUFDLEVBQUUsK0JBQStCLENBQUMsQ0FBQSxHQUFBLHNDQUFBO1lBQ25KLFdBQUEsQ0FBQSxXQUFBLENBQUEsK0NBQUEsQ0FBQSxHQUFnRCxXQUFBLENBQUEsa0JBQWtCLENBQUEsR0FBQSw2QkFBdUIsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUEsR0FBQSwrQ0FBQTtJQUN6SSxLQUFDLEdBTHNCO0lBTTNCLENBQUMsR0FoQm9COztJQ01yQjs7O0lBR0c7SUFDSCxNQUFNLFlBQVksQ0FBQTs7O0lBS2Q7OztJ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