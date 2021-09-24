/*!
 * @cdp/data-sync 0.9.9
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
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_PARAMS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 60 /* SYNC */ + 1, 'invalid sync params.')] = "ERROR_MVC_INVALID_SYNC_PARAMS";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 60 /* SYNC */ + 2, 'invalid sync storage entires.')] = "ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 60 /* SYNC */ + 3, 'data not found.')] = "ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND";
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
     * @en The [[IDataSync]] implemant class which target is [[IStorage]]. Default storage is [[WebStorage]].
     * @ja [[IStorage]] を対象とした [[IDataSync]] 実装クラス. 既定値は [[WebStorage]]
     */
    class StorageDataSync {
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
            this._separator = options?.separator || "::" /* Separator */;
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
    const dataSyncSTORAGE = createStorageDataSync(webStorage.webStorage);

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

    exports.createStorageDataSync = createStorageDataSync;
    exports.dataSyncNULL = dataSyncNULL;
    exports.dataSyncREST = dataSyncREST;
    exports.dataSyncSTORAGE = dataSyncSTORAGE;
    exports.defaultSync = defaultSync;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwibnVsbC50cyIsImludGVybmFsLnRzIiwicmVzdC50cyIsInN0b3JhZ2UudHMiLCJzZXR0aW5ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFNZTkMgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1NZTkNfREVDTEFSRSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUyAgICAgICAgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5TWU5DICsgMSwgJ2ludmFsaWQgc3luYyBwYXJhbXMuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlNZTkMgKyAyLCAnaW52YWxpZCBzeW5jIHN0b3JhZ2UgZW50aXJlcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0RBVEFfTk9UX0ZPVU5EID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDMsICdkYXRhIG5vdCBmb3VuZC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIFRoZSBbW0lEYXRhU3luY11dIGltcGxlbWFudCBjbGFzcyB3aGljaCBoYXMgbm8gZWZmZWN0cy5cbiAqIEBqYSDkvZXjgoLjgZfjgarjgYQgW1tJRGF0YVN5bmNdXSDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgTnVsbERhdGFTeW5jIGltcGxlbWVudHMgSURhdGFTeW5jPG9iamVjdD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJRGF0YVN5bmNdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJRGF0YVN5bmNdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ251bGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQ8b2JqZWN0Piwgb3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sywgb2JqZWN0Pj4ge1xuICAgICAgICBjb25zdCB7IGNhbmNlbCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICAgICAgY29uc3QgcmVzcG9uY2UgPSBQcm9taXNlLnJlc29sdmUoJ3JlYWQnID09PSBtZXRob2QgPyB7fSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25jZSk7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBQcm9taXNlPFN5bmNSZXN1bHQ8Sywgb2JqZWN0Pj47XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgZGF0YVN5bmNOVUxMID0gbmV3IE51bGxEYXRhU3luYygpIGFzIElEYXRhU3luYzxvYmplY3Q+O1xuIiwiaW1wb3J0IHsgcmVzdWx0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN5bmNDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCByZXNvbHZlIGxhY2sgcHJvcGVydHkgKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlVVJMKGNvbnRleHQ6IFN5bmNDb250ZXh0KTogc3RyaW5nIHtcbiAgICByZXR1cm4gcmVzdWx0KGNvbnRleHQsICd1cmwnKTtcbn1cbiIsImltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgQWpheE9wdGlvbnMsIGFqYXggfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IHJlc29sdmVVUkwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gT3B0aW9ucyBpbnRlcmZhY2UgZm9yIFtbUmVzdERhdGFTeW5jXV0uXG4gKiBAamEgW1tSZXN0RGF0YVN5bmNdXSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXN0RGF0YVN5bmNPcHRpb25zIGV4dGVuZHMgQWpheE9wdGlvbnM8J2pzb24nPiB7XG4gICAgdXJsPzogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbWV0aG9kTWFwID0ge1xuICAgIGNyZWF0ZTogJ1BPU1QnLFxuICAgIHVwZGF0ZTogJ1BVVCcsXG4gICAgcGF0Y2g6ICdQQVRDSCcsXG4gICAgZGVsZXRlOiAnREVMRVRFJyxcbiAgICByZWFkOiAnR0VUJ1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBbW0lEYXRhU3luY11dIGltcGxlbWFudCBjbGFzcyB3aGljaCBjb21wbGlhbnQgUkVTVGZ1bC5cbiAqIEBqYSBSRVNUIOOBq+a6luaLoOOBl+OBnyBbW0lEYXRhU3luY11dIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSZXN0RGF0YVN5bmMgaW1wbGVtZW50cyBJRGF0YVN5bmMge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJRGF0YVN5bmNdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJRGF0YVN5bmNdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3Jlc3QnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVzdCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCBSRVNUIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0LCBvcHRpb25zPzogUmVzdERhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8U3luY1Jlc3VsdDxLPj4ge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuYXNzaWduKHsgZGF0YVR5cGU6ICdqc29uJyB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB1cmwgPSBwYXJhbXMudXJsIHx8IHJlc29sdmVVUkwoY29udGV4dCk7XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCAnQSBcInVybFwiIHByb3BlcnR5IG9yIGZ1bmN0aW9uIG11c3QgYmUgc3BlY2lmaWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW1zLm1ldGhvZCA9IF9tZXRob2RNYXBbbWV0aG9kXTtcblxuICAgICAgICAvLyBFbnN1cmUgcmVxdWVzdCBkYXRhLlxuICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMuZGF0YSAmJiAoJ2NyZWF0ZScgPT09IG1ldGhvZCB8fCAndXBkYXRlJyA9PT0gbWV0aG9kIHx8ICdwYXRjaCcgPT09IG1ldGhvZCkpIHtcbiAgICAgICAgICAgIHBhcmFtcy5kYXRhID0gY29udGV4dC50b0pTT04oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFqYXggcmVxdWVzdFxuICAgICAgICBjb25zdCByZXNwb25jZSA9IGFqYXgodXJsLCBwYXJhbXMpO1xuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uY2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgUHJvbWlzZTxTeW5jUmVzdWx0PEs+PjtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY1JFU1QgPSBuZXcgUmVzdERhdGFTeW5jKCkgYXMgSURhdGFTeW5jO1xuIiwiaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc0FycmF5LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgZGVlcE1lcmdlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBtYWtlUmVzdWx0LFxuICAgIHRvUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBJU3RvcmFnZSwgSVN0b3JhZ2VPcHRpb25zIH0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvd2ViLXN0b3JhZ2UnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmNPcHRpb25zLFxuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jT2JqZWN0LFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIFNlcGFyYXRvciA9ICc6OicsXG59XG5cbi8qKlxuICogQGVuIFtbSURhdGFTeW5jXV0gaW50ZXJmYWNlIGZvciBbW0lTdG9yYWdlXV0gYWNjZXNzb3IuXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCouOCr+OCu+ODg+OCteOCkuWCmeOBiOOCiyBbW0lEYXRhU3luY11dIOOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElTdG9yYWdlRGF0YVN5bmM8VCBleHRlbmRzIG9iamVjdCA9IFN5bmNPYmplY3Q+IGV4dGVuZHMgSURhdGFTeW5jPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4gW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBbW1N0b3JhZ2VEYXRhU3luY11dIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICogQGphIFtbU3RvcmFnZURhdGFTeW5jXV0g5qeL56+J44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucyB7XG4gICAgc2VwYXJhdG9yPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBPcHRpb25zIGludGVyZmFjZSBmb3IgW1tTdG9yYWdlRGF0YVN5bmNdXS5cbiAqIEBqYSBbW1N0b3JhZ2VEYXRhU3luY11dIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBTdG9yYWdlRGF0YVN5bmNPcHRpb25zID0gSURhdGFTeW5jT3B0aW9ucyAmIElTdG9yYWdlT3B0aW9ucztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgbW9kZWwgb3Igbm90ICovXG5mdW5jdGlvbiBpc01vZGVsKGNvbnRleHQ6IFN5bmNDb250ZXh0KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhY29udGV4dC5jb25zdHJ1Y3RvclsnaWRBdHRyaWJ1dGUnXTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgaWQgKi9cbmZ1bmN0aW9uIGdlbklkKHVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dXJsfToke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfWA7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVzb2x2ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZSAqL1xuZnVuY3Rpb24gcGFyc2VDb250ZXh0KGNvbnRleHQ6IFN5bmNDb250ZXh0LCBzZXBhcmF0b3I6IHN0cmluZyk6IHsgbW9kZWw6IGJvb2xlYW47IGtleTogc3RyaW5nOyB1cmw6IHN0cmluZzsgZGF0YTogeyBbaWRBdHRyOiBzdHJpbmddOiBzdHJpbmc7IH07IH0ge1xuICAgIGNvbnN0IG1vZGVsICA9IGlzTW9kZWwoY29udGV4dCk7XG4gICAgY29uc3QgdXJsICAgID0gcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICBjb25zdCBpZEF0dHIgPSBjb250ZXh0LmNvbnN0cnVjdG9yWydpZEF0dHJpYnV0ZSddO1xuICAgIGNvbnN0IGRhdGEgPSAoKCkgPT4ge1xuICAgICAgICBjb25zdCByZXR2YWwgPSB7fSBhcyB7IFtpZEF0dHI6IHN0cmluZ106IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZCAgICA9ICFpc0Z1bmN0aW9uKGNvbnRleHRbJ2hhcyddKSA/IGZhbHNlIDogY29udGV4dFsnaGFzJ10oaWRBdHRyKSBhcyBib29sZWFuO1xuICAgICAgICAgICAgcmV0dmFsW2lkQXR0cl0gPSB2YWxpZCA/IGNvbnRleHQuaWQgYXMgc3RyaW5nIDogZ2VuSWQodXJsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH0pKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIHVybCxcbiAgICAgICAga2V5OiBgJHt1cmx9JHttb2RlbCA/IGAke3NlcGFyYXRvcn0ke2RhdGFbaWRBdHRyXX1gIDogJyd9YCxcbiAgICAgICAgZGF0YSxcbiAgICB9O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIHRhcmdldCBpcyBbW0lTdG9yYWdlXV0uIERlZmF1bHQgc3RvcmFnZSBpcyBbW1dlYlN0b3JhZ2VdXS5cbiAqIEBqYSBbW0lTdG9yYWdlXV0g44KS5a++6LGh44Go44GX44GfIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5LiDml6LlrprlgKTjga8gW1tXZWJTdG9yYWdlXV1cbiAqL1xuY2xhc3MgU3RvcmFnZURhdGFTeW5jIGltcGxlbWVudHMgSVN0b3JhZ2VEYXRhU3luYyB7XG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogSVN0b3JhZ2U7XG4gICAgcHJpdmF0ZSBfc2VwYXJhdG9yOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIFtbSVN0b3JhZ2VdXSBvYmplY3RcbiAgICAgKiAgLSBgamFgIFtbSVN0b3JhZ2VdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0b3JhZ2U6IElTdG9yYWdlLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcbiAgICAgICAgdGhpcy5fc2VwYXJhdG9yID0gb3B0aW9ucz8uc2VwYXJhdG9yIHx8IENvbnN0LlNlcGFyYXRvcjtcbiAgICB9XG5cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIGltcGxlbWVudHM6IElTdG9yYWdlRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOePvuWcqOWvvuixoeOBriBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0U3RvcmFnZSgpOiBJU3RvcmFnZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbmV3IFtbSVN0b3JhZ2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg5paw44GX44GEIFtbSVN0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLoqK3lrppcbiAgICAgKi9cbiAgICBzZXRTdG9yYWdlKG5ld1N0b3JhZ2U6IElTdG9yYWdlKTogdGhpcyB7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBuZXdTdG9yYWdlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBpZC1zZXBhcmF0b3IuXG4gICAgICogQGphIOaWsOOBl+OBhCBJRCDjgrvjg5Hjg6zjg7zjgr/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdTZXBhcmF0b3JcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXBhcmF0b3Igc3RyaW5nXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTjgrvjg5Hjg6zjg7zjgr/mloflrZfliJdcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNlcGFyYXRvciBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOS7peWJjeOBhOioreWumuOBleOCjOOBpuOBhOOBn+OCu+ODkeODrOODvOOCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNldElkU2VwYXJhdG9yKG5ld1NlcGFyYXRvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgb2xkU2VwYXJhdG9yID0gdGhpcy5fc2VwYXJhdG9yO1xuICAgICAgICB0aGlzLl9zZXBhcmF0b3IgPSBuZXdTZXBhcmF0b3I7XG4gICAgICAgIHJldHVybiBvbGRTZXBhcmF0b3I7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJRGF0YVN5bmNdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJRGF0YVN5bmNdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgeyBtb2RlbCwga2V5LCB1cmwsIGRhdGEgfSA9IHBhcnNlQ29udGV4dChjb250ZXh0LCB0aGlzLl9zZXBhcmF0b3IpO1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByZXNwb25jZTogUGxhaW5PYmplY3QgfCB2b2lkIHwgbnVsbDtcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRzID0gZGVlcE1lcmdlKHsgZGF0YSB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICByZXNwb25jZSA9IGF3YWl0IHRoaXMudXBkYXRlKGtleSwgY29udGV4dCwgdXJsLCBkYXRhW09iamVjdC5rZXlzKGRhdGEpWzBdXSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgICAgY2FzZSAncGF0Y2gnOiB7XG4gICAgICAgICAgICAgICAgcmVzcG9uY2UgPSBhd2FpdCB0aGlzLnVwZGF0ZShrZXksIGNvbnRleHQsIHVybCwgY29udGV4dC5pZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gYXdhaXQgdGhpcy5kZXN0cm95KGtleSwgY29udGV4dCwgdXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gYXdhaXQgdGhpcy5maW5kKG1vZGVsLCBrZXksIHVybCwgb3B0aW9ucykgYXMgUGxhaW5PYmplY3Q7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gcmVzcG9uY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1NUT1JBR0VfREFUQV9OT1RfRk9VTkQsIGBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9TWU5DX1BBUkFNUywgYHVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCBQcm9taXNlLnJlc29sdmUocmVzcG9uY2UgYXMgUGxhaW5PYmplY3QpKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFN5bmNSZXN1bHQ8Sz47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpbWF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlFbnRyaWVzKHVybDogc3RyaW5nLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8eyBpZHM6IGJvb2xlYW47IGl0ZW1zOiAoUGxhaW5PYmplY3QgfCBzdHJpbmcpW107IH0+IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW08b2JqZWN0Pih1cmwsIG9wdGlvbnMpO1xuICAgICAgICBpZiAobnVsbCA9PSBpdGVtcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgaWRzOiB0cnVlLCBpdGVtczogW10gfTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaWRzOiAhaXRlbXMubGVuZ3RoIHx8IGlzU3RyaW5nKGl0ZW1zWzBdKSwgaXRlbXMgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19TVE9SQUdFX0VOVFJZLCBgZW50cnkgaXMgbm90IEFycmF5IHR5cGUuYCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzYXZlRW50cmllcyh1cmw6IHN0cmluZywgZW50cmllczogc3RyaW5nW10sIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLnNldEl0ZW0odXJsLCBlbnRyaWVzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kKG1vZGVsOiBib29sZWFuLCBrZXk6IHN0cmluZywgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBTdG9yYWdlRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IFBsYWluT2JqZWN0W10gfCBudWxsPiB7XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gbXVsdGktZW50cnlcbiAgICAgICAgICAgICAgICBjb25zdCB7IGlkcywgaXRlbXMgfSA9IGF3YWl0IHRoaXMucXVlcnlFbnRyaWVzKHVybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgaWYgKGlkcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBmaW5kQWxsXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudGlyZXM6IFBsYWluT2JqZWN0W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpZCBvZiBpdGVtcyBhcyBzdHJpbmdbXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnkgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW08UGxhaW5PYmplY3Q+KGAke3VybH0ke3RoaXMuX3NlcGFyYXRvcn0ke2lkfWAsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW50cnkgJiYgZW50aXJlcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW50aXJlcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXMgYXMgUGxhaW5PYmplY3RbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfU1RPUkFHRV9FTlRSWSA9PT0gcmVzdWx0LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbTxQbGFpbk9iamVjdD4oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZShrZXk6IHN0cmluZywgY29udGV4dDogU3luY0NvbnRleHQsIHVybDogc3RyaW5nLCBpZD86IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IGRhdGEgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmFzc2lnbihjb250ZXh0LnRvSlNPTigpLCBkYXRhKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGtleSwgYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoa2V5ICE9PSB1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgaWRzLCBpdGVtcyB9ID0gYXdhaXQgdGhpcy5xdWVyeUVudHJpZXModXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChpZHMgJiYgaWQgJiYgIWl0ZW1zLmluY2x1ZGVzKGlkKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUVudHJpZXModXJsLCBpdGVtcyBhcyBzdHJpbmdbXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZmluZCh0cnVlLCBrZXksIHVybCwgb3B0aW9ucykgYXMgUHJvbWlzZTxQbGFpbk9iamVjdCB8IG51bGw+O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRlc3Ryb3koa2V5OiBzdHJpbmcsIGNvbnRleHQ6IFN5bmNDb250ZXh0LCB1cmw6IHN0cmluZywgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCBvbGQgPSBhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW0oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChrZXkgIT09IHVybCkge1xuICAgICAgICAgICAgY29uc3QgeyBpZHMsIGl0ZW1zIH0gPSBhd2FpdCB0aGlzLnF1ZXJ5RW50cmllcyh1cmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKGlkcyAmJiBjb250ZXh0LmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IGl0ZW1zLmZpbHRlcihpID0+IGkgIT09IGNvbnRleHQuaWQpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUVudHJpZXModXJsLCBlbnRyaWVzIGFzIHN0cmluZ1tdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2xkIGFzIFBsYWluT2JqZWN0O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbSVN0b3JhZ2VEYXRhU3luY11dIG9iamVjdCB3aXRoIFtbSVN0b3JhZ2VdXS5cbiAqIEBqYSBbW0lTdG9yYWdlXV0g44KS5oyH5a6a44GX44GmLCBbW0lTdG9yYWdlRGF0YVN5bmNdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc3RvcmFnZVxuICogIC0gYGVuYCBbW0lTdG9yYWdlXV0gb2JqZWN0XG4gKiAgLSBgamFgIFtbSVN0b3JhZ2VdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zXG4gKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgY3JlYXRlU3RvcmFnZURhdGFTeW5jID0gKHN0b3JhZ2U6IElTdG9yYWdlLCBvcHRpb25zPzogU3RvcmFnZURhdGFTeW5jQ29uc3RydWN0aW9uT3B0aW9ucyk6IElTdG9yYWdlRGF0YVN5bmMgPT4ge1xuICAgIHJldHVybiBuZXcgU3RvcmFnZURhdGFTeW5jKHN0b3JhZ2UsIG9wdGlvbnMpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jU1RPUkFHRSA9IGNyZWF0ZVN0b3JhZ2VEYXRhU3luYyh3ZWJTdG9yYWdlKTtcbiIsImltcG9ydCB7IElEYXRhU3luYyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkYXRhU3luY05VTEwgfSBmcm9tICcuL251bGwnO1xuXG4vKiogQGludGVybmFsICovIGxldCBfZGVmYXVsdDogSURhdGFTeW5jID0gZGF0YVN5bmNOVUxMO1xuXG4vKipcbiAqIEBlbiBHZXQgb3IgdXBkYXRlIGRlZmF1bHQgW1tJRGF0YVN5bmNdXSBvYmplY3QuXG4gKiBAamEg5pei5a6a44GuIFtbSURhdGFTeW5jXV0g44Kq44OW44K444Kn44Kv44OI44Gu5Y+W5b6XIC8g5pu05pawXG4gKlxuICogQHBhcmFtIG5ld1N5bmNcbiAqICAtIGBlbmAgbmV3IGRhdGEtc3luYyBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCiyBkYXRhLXN5bmMg44Gu6L+U5Y2044Gu44G/6KGM44GGXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBvbGQgZGF0YS1zeW5jIG9iamVjdC5cbiAqICAtIGBqYWAg5Lul5YmN44GuIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTeW5jKG5ld1N5bmM/OiBJRGF0YVN5bmMpOiBJRGF0YVN5bmMge1xuICAgIGlmIChudWxsID09IG5ld1N5bmMpIHtcbiAgICAgICAgcmV0dXJuIF9kZWZhdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFN5bmMgPSBfZGVmYXVsdDtcbiAgICAgICAgX2RlZmF1bHQgPSBuZXdTeW5jO1xuICAgICAgICByZXR1cm4gb2xkU3luYztcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiY2MiLCJyZXN1bHQiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJhamF4IiwiaXNGdW5jdGlvbiIsImRlZXBNZXJnZSIsImlzQXJyYXkiLCJpc1N0cmluZyIsInRvUmVzdWx0Iiwid2ViU3RvcmFnZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7SUFNQTs7Ozs7UUFVSTtRQUFBO1lBQ0ksb0ZBQXdFLENBQUE7WUFDeEUsMkRBQWdELFlBQUEsa0JBQWtCLGdCQUF1QixnQkFB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
