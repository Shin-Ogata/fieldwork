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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwibnVsbC50cyIsImludGVybmFsLnRzIiwicmVzdC50cyIsInN0b3JhZ2UudHMiLCJzZXR0aW5ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFNZTkMgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1NZTkNfREVDTEFSRSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUyAgICAgICAgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMSwgJ2ludmFsaWQgc3luYyBwYXJhbXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAyLCAnaW52YWxpZCBzeW5jIHN0b3JhZ2UgZW50aXJlcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5EID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDMsICdkYXRhIG5vdCBmb3VuZC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgSURhdGFTeW5jfSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggaGFzIG5vIGVmZmVjdHMuXG4gKiBAamEg5L2V44KC44GX44Gq44GEIHtAbGluayBJRGF0YVN5bmN9IOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBOdWxsRGF0YVN5bmMgaW1wbGVtZW50cyBJRGF0YVN5bmM8b2JqZWN0PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmMobWV0aG9kOiBTeW5jTWV0aG9kcywgY29udGV4dDogU3luY0NvbnRleHQ8b2JqZWN0Piwgb3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPFN5bmNSZXN1bHQ8b2JqZWN0Pj4ge1xuICAgICAgICBjb25zdCB7IGNhbmNlbCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBQcm9taXNlLnJlc29sdmUoJ3JlYWQnID09PSBtZXRob2QgPyB7fSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25zZSk7XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY05VTEwgPSBuZXcgTnVsbERhdGFTeW5jKCkgYXMgSURhdGFTeW5jPG9iamVjdD47XG4iLCJpbXBvcnQgeyByZXN1bHQgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3luY0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIHJlc29sdmUgbGFjayBwcm9wZXJ0eSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVVUkwoY29udGV4dDogU3luY0NvbnRleHQpOiBzdHJpbmcge1xuICAgIHJldHVybiByZXN1bHQoY29udGV4dCwgJ3VybCcpO1xufVxuIiwiaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBBamF4T3B0aW9ucywgYWpheCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG4gICAgU3luY09iamVjdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IHJlc29sdmVVUkwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gT3B0aW9ucyBpbnRlcmZhY2UgZm9yIHtAbGluayBSZXN0RGF0YVN5bmN9LlxuICogQGphIHtAbGluayBSZXN0RGF0YVN5bmN9IOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc3REYXRhU3luY09wdGlvbnMgZXh0ZW5kcyBBamF4T3B0aW9uczwnanNvbic+IHtcbiAgICB1cmw/OiBzdHJpbmc7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9tZXRob2RNYXAgPSB7XG4gICAgY3JlYXRlOiAnUE9TVCcsXG4gICAgdXBkYXRlOiAnUFVUJyxcbiAgICBwYXRjaDogJ1BBVENIJyxcbiAgICBkZWxldGU6ICdERUxFVEUnLFxuICAgIHJlYWQ6ICdHRVQnXG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIHtAbGluayBJRGF0YVN5bmN9IGltcGxlbWFudCBjbGFzcyB3aGljaCBjb21wbGlhbnQgUkVTVGZ1bC5cbiAqIEBqYSBSRVNUIOOBq+a6luaLoOOBl+OBnyB7QGxpbmsgSURhdGFTeW5jfSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUmVzdERhdGFTeW5jPFQgZXh0ZW5kcyBvYmplY3QgPSBTeW5jT2JqZWN0PiBpbXBsZW1lbnRzIElEYXRhU3luYzxUPiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdyZXN0JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc3Qgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAgUkVTVCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jKG1ldGhvZDogU3luY01ldGhvZHMsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCBvcHRpb25zPzogUmVzdERhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8U3luY1Jlc3VsdDxUPj4ge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuYXNzaWduKHsgZGF0YVR5cGU6ICdqc29uJyB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB1cmwgPSBwYXJhbXMudXJsID8/IHJlc29sdmVVUkwoY29udGV4dCk7XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCAnQSBcInVybFwiIHByb3BlcnR5IG9yIGZ1bmN0aW9uIG11c3QgYmUgc3BlY2lmaWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW1zLm1ldGhvZCA9IF9tZXRob2RNYXBbbWV0aG9kXTtcblxuICAgICAgICAvLyBFbnN1cmUgcmVxdWVzdCBkYXRhLlxuICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMuZGF0YSAmJiAoJ2NyZWF0ZScgPT09IG1ldGhvZCB8fCAndXBkYXRlJyA9PT0gbWV0aG9kIHx8ICdwYXRjaCcgPT09IG1ldGhvZCkpIHtcbiAgICAgICAgICAgIHBhcmFtcy5kYXRhID0gY29udGV4dC50b0pTT04oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFqYXggcmVxdWVzdFxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGFqYXgodXJsLCBwYXJhbXMpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uc2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNSRVNUID0gbmV3IFJlc3REYXRhU3luYygpIGFzIElEYXRhU3luYztcbiIsImltcG9ydCB7XG4gICAgQWNjZXNzaWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc0FycmF5LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgZGVlcE1lcmdlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBJU3RvcmFnZSwgSVN0b3JhZ2VPcHRpb25zIH0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvd2ViLXN0b3JhZ2UnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmNPcHRpb25zLFxuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jT2JqZWN0LFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIFNFUEFSQVRPUiA9ICc6OicsXG59XG5cbi8qKlxuICogQGVuIHtAbGluayBJRGF0YVN5bmN9IGludGVyZmFjZSBmb3Ige0BsaW5rIElTdG9yYWdlfSBhY2Nlc3Nvci5cbiAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOCouOCr+OCu+ODg+OCteOCkuWCmeOBiOOCiyB7QGxpbmsgSURhdGFTeW5jfSDjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJU3RvcmFnZURhdGFTeW5jPFQgZXh0ZW5kcyBvYmplY3QgPSBTeW5jT2JqZWN0PiBleHRlbmRzIElEYXRhU3luYzxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IHtAbGluayBJU3RvcmFnZX0gaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOWvvuixoeOBriB7QGxpbmsgSVN0b3JhZ2V9IOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyB7QGxpbmsgSVN0b3JhZ2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSDmlrDjgZfjgYQge0BsaW5rIElTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLoqK3lrppcbiAgICAgKi9cbiAgICBzZXRTdG9yYWdlKG5ld1N0b3JhZ2U6IElTdG9yYWdlKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IGlkLXNlcGFyYXRvci5cbiAgICAgKiBAamEg5paw44GX44GEIElEIOOCu+ODkeODrOODvOOCv+OCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1NlcGFyYXRvclxuICAgICAqICAtIGBlbmAgbmV3IHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5Lul5YmN44GE6Kit5a6a44GV44KM44Gm44GE44Gf44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICovXG4gICAgc2V0SWRTZXBhcmF0b3IobmV3U2VwYXJhdG9yOiBzdHJpbmcpOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBTdG9yYWdlRGF0YVN5bmN9IGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICogQGphIHtAbGluayBTdG9yYWdlRGF0YVN5bmN9IOani+evieOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMge1xuICAgIHNlcGFyYXRvcj86IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gT3B0aW9ucyBpbnRlcmZhY2UgZm9yIHtAbGluayBTdG9yYWdlRGF0YVN5bmN9LlxuICogQGphIHtAbGluayBTdG9yYWdlRGF0YVN5bmN9IOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBTdG9yYWdlRGF0YVN5bmNPcHRpb25zID0gSURhdGFTeW5jT3B0aW9ucyAmIElTdG9yYWdlT3B0aW9ucztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgbW9kZWwgb3Igbm90ICovXG5mdW5jdGlvbiBpc01vZGVsKGNvbnRleHQ6IFN5bmNDb250ZXh0KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKGNvbnRleHQuY29uc3RydWN0b3IgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVsnaWRBdHRyaWJ1dGUnXTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgaWQgKi9cbmZ1bmN0aW9uIGdlbklkKHVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dXJsfToke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfWA7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVzb2x2ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZSAqL1xuZnVuY3Rpb24gcGFyc2VDb250ZXh0KGNvbnRleHQ6IEFjY2Vzc2libGU8U3luY0NvbnRleHQ+LCBzZXBhcmF0b3I6IHN0cmluZyk6IHsgbW9kZWw6IGJvb2xlYW47IGtleTogc3RyaW5nOyB1cmw6IHN0cmluZzsgZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPjsgfSB7XG4gICAgY29uc3QgbW9kZWwgID0gaXNNb2RlbChjb250ZXh0KTtcbiAgICBjb25zdCB1cmwgICAgPSByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgIGNvbnN0IGlkQXR0ciA9IChjb250ZXh0LmNvbnN0cnVjdG9yIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ2lkQXR0cmlidXRlJ107XG4gICAgY29uc3QgZGF0YSA9ICgoKSA9PiB7XG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWQgICAgPSAhaXNGdW5jdGlvbihjb250ZXh0WydoYXMnXSkgPyBmYWxzZSA6IGNvbnRleHRbJ2hhcyddKGlkQXR0cikgYXMgYm9vbGVhbjtcbiAgICAgICAgICAgIHJldHZhbFtpZEF0dHJdID0gdmFsaWQgPyBjb250ZXh0LmlkISA6IGdlbklkKHVybCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9KSgpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICB1cmwsXG4gICAgICAgIGtleTogYCR7dXJsfSR7bW9kZWwgPyBgJHtzZXBhcmF0b3J9JHtkYXRhW2lkQXR0cl19YCA6ICcnfWAsXG4gICAgICAgIGRhdGEsXG4gICAgfTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgSURhdGFTeW5jfSBpbXBsZW1hbnQgY2xhc3Mgd2hpY2ggdGFyZ2V0IGlzIHtAbGluayBJU3RvcmFnZX0uIERlZmF1bHQgc3RvcmFnZSBpcyB7QGxpbmsgV2ViU3RvcmFnZX0uXG4gKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgpLlr77osaHjgajjgZfjgZ8ge0BsaW5rIElEYXRhU3luY30g5a6f6KOF44Kv44Op44K5LiDml6LlrprlgKTjga8ge0BsaW5rIFdlYlN0b3JhZ2V9XG4gKi9cbmNsYXNzIFN0b3JhZ2VEYXRhU3luYzxUIGV4dGVuZHMgb2JqZWN0ID0gU3luY09iamVjdD4gaW1wbGVtZW50cyBJU3RvcmFnZURhdGFTeW5jPFQ+IHtcbiAgICBwcml2YXRlIF9zdG9yYWdlOiBJU3RvcmFnZTtcbiAgICBwcml2YXRlIF9zZXBhcmF0b3I6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RvcmFnZVxuICAgICAqICAtIGBlbmAge0BsaW5rIElTdG9yYWdlfSBvYmplY3RcbiAgICAgKiAgLSBgamFgIHtAbGluayBJU3RvcmFnZX0g44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdG9yYWdlOiBJU3RvcmFnZSwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY0NvbnN0cnVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgICAgIHRoaXMuX3NlcGFyYXRvciA9IG9wdGlvbnM/LnNlcGFyYXRvciA/PyBDb25zdC5TRVBBUkFUT1I7XG4gICAgfVxuXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBpbXBsZW1lbnRzOiBJU3RvcmFnZURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQge0BsaW5rIElTdG9yYWdlfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg54++5Zyo5a++6LGh44GuIHtAbGluayBJU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K544Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0U3RvcmFnZSgpOiBJU3RvcmFnZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IHtAbGluayBJU3RvcmFnZX0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCB7QGxpbmsgSVN0b3JhZ2V9IOOCpOODs+OCueOCv+ODs+OCueOCkuioreWumlxuICAgICAqL1xuICAgIHNldFN0b3JhZ2UobmV3U3RvcmFnZTogSVN0b3JhZ2UpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IG5ld1N0b3JhZ2U7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IGlkLXNlcGFyYXRvci5cbiAgICAgKiBAamEg5paw44GX44GEIElEIOOCu+ODkeODrOODvOOCv+OCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1NlcGFyYXRvclxuICAgICAqICAtIGBlbmAgbmV3IHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOOCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgc2VwYXJhdG9yIHN0cmluZ1xuICAgICAqICAtIGBqYWAg5Lul5YmN44GE6Kit5a6a44GV44KM44Gm44GE44Gf44K744OR44Os44O844K/5paH5a2X5YiXXG4gICAgICovXG4gICAgc2V0SWRTZXBhcmF0b3IobmV3U2VwYXJhdG9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBvbGRTZXBhcmF0b3IgPSB0aGlzLl9zZXBhcmF0b3I7XG4gICAgICAgIHRoaXMuX3NlcGFyYXRvciA9IG5ld1NlcGFyYXRvcjtcbiAgICAgICAgcmV0dXJuIG9sZFNlcGFyYXRvcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSURhdGFTeW5jfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElEYXRhU3luY30g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdzdG9yYWdlJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc3luYyhtZXRob2Q6IFN5bmNNZXRob2RzLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8VD4+IHtcbiAgICAgICAgY29uc3QgeyBtb2RlbCwga2V5LCB1cmwsIGRhdGEgfSA9IHBhcnNlQ29udGV4dChjb250ZXh0IGFzIEFjY2Vzc2libGU8U3luY0NvbnRleHQ+LCB0aGlzLl9zZXBhcmF0b3IpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByZXNwb25zZTogUGxhaW5PYmplY3QgfCB2b2lkIHwgbnVsbDtcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRzID0gZGVlcE1lcmdlKHsgZGF0YSB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMudXBkYXRlKGtleSwgY29udGV4dCwgdXJsLCBkYXRhW09iamVjdC5rZXlzKGRhdGEpWzBdXSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgICAgY2FzZSAncGF0Y2gnOiB7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnVwZGF0ZShrZXksIGNvbnRleHQsIHVybCwgY29udGV4dC5pZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kZXN0cm95KGtleSwgY29udGV4dCwgdXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy5maW5kKG1vZGVsLCBrZXksIHVybCwgb3B0aW9ucykgYXMgUGxhaW5PYmplY3Q7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfREFUQV9OT1RfRk9VTkQsIGBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsIGB1bmtub3duIG1ldGhvZDogJHttZXRob2R9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlISkpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgU3luY1Jlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcmltYXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUVudHJpZXModXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTx7IGlkczogYm9vbGVhbjsgaXRlbXM6IChQbGFpbk9iamVjdCB8IHN0cmluZylbXTsgfT4ge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxvYmplY3Q+KHVybCwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChudWxsID09IGl0ZW1zKSB7XG4gICAgICAgICAgICByZXR1cm4geyBpZHM6IHRydWUsIGl0ZW1zOiBbXSB9O1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkoaXRlbXMpKSB7XG4gICAgICAgICAgICByZXR1cm4geyBpZHM6ICFpdGVtcy5sZW5ndGggfHwgaXNTdHJpbmcoaXRlbXNbMF0pLCBpdGVtcyB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfRU5UUlksIGBlbnRyeSBpcyBub3QgQXJyYXkgdHlwZS5gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHNhdmVFbnRyaWVzKHVybDogc3RyaW5nLCBlbnRyaWVzOiBzdHJpbmdbXSwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbSh1cmwsIGVudHJpZXMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGZpbmQobW9kZWw6IGJvb2xlYW4sIGtleTogc3RyaW5nLCB1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgUGxhaW5PYmplY3RbXSB8IG51bGw+IHtcbiAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihrZXksIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBtdWx0aS1lbnRyeVxuICAgICAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBpZiAoaWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmRBbGxcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50aXJlczogUGxhaW5PYmplY3RbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGlkIG9mIGl0ZW1zIGFzIHN0cmluZ1tdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeSA9IGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oYCR7dXJsfSR7dGhpcy5fc2VwYXJhdG9yfSR7aWR9YCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRyeSAmJiBlbnRpcmVzLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbnRpcmVzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtcyBhcyBQbGFpbk9iamVjdFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0b1Jlc3VsdChlKTtcbiAgICAgICAgICAgICAgICBpZiAoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0VOVFJZID09PSByZXN1bHQuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihrZXksIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlKGtleTogc3RyaW5nLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgdXJsOiBzdHJpbmcsIGlkPzogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3QgYXR0cnMgPSBPYmplY3QuYXNzaWduKGNvbnRleHQudG9KU09OKCksIGRhdGEpO1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLnNldEl0ZW0oa2V5LCBhdHRycywgb3B0aW9ucyk7XG4gICAgICAgIGlmIChrZXkgIT09IHVybCkge1xuICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKGlkcyAmJiBpZCAmJiAhaXRlbXMuaW5jbHVkZXMoaWQpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaChpZCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlRW50cmllcyh1cmwsIGl0ZW1zIGFzIHN0cmluZ1tdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5maW5kKHRydWUsIGtleSwgdXJsLCBvcHRpb25zKSBhcyBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD47XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZGVzdHJveShrZXk6IHN0cmluZywgY29udGV4dDogU3luY0NvbnRleHQsIHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IG9sZCA9IGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbShrZXksIG9wdGlvbnMpO1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLnJlbW92ZUl0ZW0oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGtleSAhPT0gdXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoaWRzICYmIGNvbnRleHQuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnRyaWVzID0gaXRlbXMuZmlsdGVyKGkgPT4gaSAhPT0gY29udGV4dC5pZCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlRW50cmllcyh1cmwsIGVudHJpZXMgYXMgc3RyaW5nW10sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvbGQgYXMgUGxhaW5PYmplY3Q7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUge0BsaW5rIElTdG9yYWdlRGF0YVN5bmN9IG9iamVjdCB3aXRoIHtAbGluayBJU3RvcmFnZX0uXG4gKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgpLmjIflrprjgZfjgaYsIHtAbGluayBJU3RvcmFnZURhdGFTeW5jfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc3RvcmFnZVxuICogIC0gYGVuYCB7QGxpbmsgSVN0b3JhZ2V9IG9iamVjdFxuICogIC0gYGphYCB7QGxpbmsgSVN0b3JhZ2V9IOOCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnNcbiAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVTdG9yYWdlRGF0YVN5bmMgPSAoc3RvcmFnZTogSVN0b3JhZ2UsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNDb25zdHJ1Y3Rpb25PcHRpb25zKTogSVN0b3JhZ2VEYXRhU3luYyA9PiB7XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRGF0YVN5bmMoc3RvcmFnZSwgb3B0aW9ucyk7XG59O1xuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNTVE9SQUdFID0gY3JlYXRlU3RvcmFnZURhdGFTeW5jKHdlYlN0b3JhZ2UpO1xuIiwiaW1wb3J0IHsgSURhdGFTeW5jIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRhdGFTeW5jTlVMTCB9IGZyb20gJy4vbnVsbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF9kZWZhdWx0OiBJRGF0YVN5bmMgPSBkYXRhU3luY05VTEw7XG5cbi8qKlxuICogQGVuIEdldCBvciB1cGRhdGUgZGVmYXVsdCB7QGxpbmsgSURhdGFTeW5jfSBvYmplY3QuXG4gKiBAamEg5pei5a6a44GuIHtAbGluayBJRGF0YVN5bmN9IOOCquODluOCuOOCp+OCr+ODiOOBruWPluW+lyAvIOabtOaWsFxuICpcbiAqIEBwYXJhbSBuZXdTeW5jXG4gKiAgLSBgZW5gIG5ldyBkYXRhLXN5bmMgb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgosgZGF0YS1zeW5jIOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIGRhdGEtc3luYyBvYmplY3QuXG4gKiAgLSBgamFgIOS7peWJjeOBriBkYXRhLXN5bmMg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U3luYyhuZXdTeW5jPzogSURhdGFTeW5jKTogSURhdGFTeW5jIHtcbiAgICBpZiAobnVsbCA9PSBuZXdTeW5jKSB7XG4gICAgICAgIHJldHVybiBfZGVmYXVsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRTeW5jID0gX2RlZmF1bHQ7XG4gICAgICAgIF9kZWZhdWx0ID0gbmV3U3luYztcbiAgICAgICAgcmV0dXJuIG9sZFN5bmM7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNjIiwicmVzdWx0IiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwiYWpheCIsImlzRnVuY3Rpb24iLCJkZWVwTWVyZ2UiLCJpc0FycmF5IiwiaXNTdHJpbmciLCJ0b1Jlc3VsdCIsIndlYlN0b3JhZ2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBQUEsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBO0lBQUEsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxrQkFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGtCQUF3RTtZQUN4RSxXQUFnRCxDQUFBLFdBQUEsQ0FBQSwrQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsOEJBQXVCLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBLEdBQUEsK0JBQUE7WUFDMUksV0FBZ0QsQ0FBQSxXQUFBLENBQUEsc0NBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDhCQUF1QixDQUFDLEVBQUUsK0JBQStCLENBQUMsQ0FBQSxHQUFBLHNDQUFBO1lBQ25KLFdBQWdELENBQUEsV0FBQSxDQUFBLCtDQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUEsR0FBQSwrQ0FBQTtJQUN6SSxLQUFDLEdBQUE7SUFDTCxDQUFDLEdBQUE7O0lDVkQ7OztJQUdHO0lBQ0gsTUFBTSxZQUFZLENBQUE7OztJQUtkOzs7SUFHRztJQUNILElBQUEsSUFBSSxJQUFJLEdBQUE7SUFDSixRQUFBLE9BQU8sTUFBTTs7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