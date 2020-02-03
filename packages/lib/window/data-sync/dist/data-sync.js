/*!
 * @cdp/data-sync 0.9.0
 *   web storage utility module
 */

(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/promise'), require('@cdp/result'), require('@cdp/ajax'), require('@cdp/core-utils'), require('@cdp/web-storage')) :
   typeof define === 'function' && define.amd ? define(['exports', '@cdp/promise', '@cdp/result', '@cdp/ajax', '@cdp/core-utils', '@cdp/web-storage'], factory) :
   (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, promise, result, ajax, coreUtils, webStorage) { 'use strict';

   /* eslint-disable
      @typescript-eslint/no-namespace
    , @typescript-eslint/no-unused-vars
    , @typescript-eslint/restrict-plus-operands
    */
   globalThis.CDP_DECLARE = globalThis.CDP_DECLARE;
   (function () {
       /**
        * @en Extends error code definitions.
        * @ja 拡張通エラーコード定義
        */
       let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
       (function () {
           RESULT_CODE[RESULT_CODE["MVC_SYNC_DECLARE"] = 9007199254740991] = "MVC_SYNC_DECLARE";
           RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_SYNC_PARAMS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 60 /* SYNC */ + 1, 'invalid sync params.')] = "ERROR_MVC_INVALID_SYNC_PARAMS";
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

   /** resolve lack property */
   function resolveURL(context) {
       return coreUtils.result(context, 'url');
   }

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
   /**
    * @en The [[IDataSync]] implemant class which target is [[IStorage]]. Default storage is [[WebStorage]].
    * @ja [[IStorage]] を対象とした [[IDataSync]] 実装クラス. 既定値は [[WebStorage]]
    */
   class StorageDataSync {
       /**
        * constructor
        */
       constructor() {
           this._storage = webStorage.webStorage;
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
       sync(method, context, options) {
           const id = resolveURL(context);
           if (!id) {
               throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
           }
           let responce;
           switch (method) {
               case 'create':
               case 'update':
               case 'patch': {
                   const { data } = options || {};
                   const attrs = Object.assign(context.toJSON(), data);
                   responce = this._storage.setItem(id, attrs, options);
                   break;
               }
               case 'delete':
                   responce = this._storage.removeItem(id, options);
                   break;
               case 'read':
                   responce = this._storage.getItem(id, options);
                   break;
               default:
                   throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, `unknown method: ${method}`);
           }
           context.trigger('@request', context, responce);
           return responce;
       }
   }
   const dataSyncSTORAGE = new StorageDataSync();

   let _default = dataSyncNULL;
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

   exports.dataSyncNULL = dataSyncNULL;
   exports.dataSyncREST = dataSyncREST;
   exports.dataSyncSTORAGE = dataSyncSTORAGE;
   exports.defaultSync = defaultSync;

   Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zeW5jLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwibnVsbC50cyIsImludGVybmFsLnRzIiwicmVzdC50cyIsInN0b3JhZ2UudHMiLCJzZXR0aW5ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gLCBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kc1xuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFNZTkMgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1NZTkNfREVDTEFSRSAgICAgICAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuU1lOQyArIDEsICdpbnZhbGlkIHN5bmMgcGFyYW1zLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJRGF0YVN5bmMsXG4gICAgU3luY01ldGhvZHMsXG4gICAgU3luY0NvbnRleHQsXG4gICAgU3luY1Jlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIGhhcyBubyBlZmZlY3RzLlxuICogQGphIOS9leOCguOBl+OBquOBhCBbW0lEYXRhU3luY11dIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBOdWxsRGF0YVN5bmMgaW1wbGVtZW50cyBJRGF0YVN5bmM8e30+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElEYXRhU3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSURhdGFTeW5jXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSURhdGFTeW5jXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRG8gZGF0YSBzeW5jaHJvbml6YXRpb24uXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacn1xuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHN5bmM8SyBleHRlbmRzIFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IFN5bmNDb250ZXh0PHt9Piwgb3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sywge30+PiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICBjb25zdCByZXNwb25jZSA9IFByb21pc2UucmVzb2x2ZSgncmVhZCcgPT09IG1ldGhvZCA/IHt9IDogdW5kZWZpbmVkKTtcbiAgICAgICAgY29udGV4dC50cmlnZ2VyKCdAcmVxdWVzdCcsIGNvbnRleHQsIHJlc3BvbmNlKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbmNlIGFzIFByb21pc2U8U3luY1Jlc3VsdDxLLCB7fT4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jTlVMTCA9IG5ldyBOdWxsRGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM8e30+O1xuIiwiaW1wb3J0IHsgcmVzdWx0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN5bmNDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIHJlc29sdmUgbGFjayBwcm9wZXJ0eSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVVUkwoY29udGV4dDogU3luY0NvbnRleHQpOiBzdHJpbmcge1xuICAgIHJldHVybiByZXN1bHQoY29udGV4dCwgJ3VybCcpO1xufVxuIiwiaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBBamF4T3B0aW9ucywgYWpheCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luYyxcbiAgICBTeW5jTWV0aG9kcyxcbiAgICBTeW5jQ29udGV4dCxcbiAgICBTeW5jUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVVSTCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBPcHRpb25zIGludGVyZmFjZSBmb3IgW1tSZXN0RGF0YVN5bmNdXS5cbiAqIEBqYSBbW1Jlc3REYXRhU3luY11dIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc3REYXRhU3luY09wdGlvbnMgZXh0ZW5kcyBBamF4T3B0aW9uczwnanNvbic+IHtcbiAgICB1cmw/OiBzdHJpbmc7XG59XG5cbmNvbnN0IF9tZXRob2RNYXAgPSB7XG4gICAgY3JlYXRlOiAnUE9TVCcsXG4gICAgdXBkYXRlOiAnUFVUJyxcbiAgICBwYXRjaDogJ1BBVENIJyxcbiAgICBkZWxldGU6ICdERUxFVEUnLFxuICAgIHJlYWQ6ICdHRVQnXG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIGNvbXBsaWFudCBSRVNUZnVsLlxuICogQGphIFJFU1Qg44Gr5rqW5oug44GX44GfIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJlc3REYXRhU3luYyBpbXBsZW1lbnRzIElEYXRhU3luYyB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJRGF0YVN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lEYXRhU3luY11dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lEYXRhU3luY11dIOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAncmVzdCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERvIGRhdGEgc3luY2hyb25pemF0aW9uLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXN0IG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIFJFU1Qg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgc3luYzxLIGV4dGVuZHMgU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogU3luY0NvbnRleHQsIG9wdGlvbnM/OiBSZXN0RGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxTeW5jUmVzdWx0PEs+PiB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyBkYXRhVHlwZTogJ2pzb24nIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHVybCA9IHBhcmFtcy51cmwgfHwgcmVzb2x2ZVVSTChjb250ZXh0KTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsICdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBwYXJhbXMubWV0aG9kID0gX21ldGhvZE1hcFttZXRob2RdO1xuXG4gICAgICAgIC8vIEVuc3VyZSByZXF1ZXN0IGRhdGEuXG4gICAgICAgIGlmIChudWxsID09IHBhcmFtcy5kYXRhICYmICgnY3JlYXRlJyA9PT0gbWV0aG9kIHx8ICd1cGRhdGUnID09PSBtZXRob2QgfHwgJ3BhdGNoJyA9PT0gbWV0aG9kKSkge1xuICAgICAgICAgICAgcGFyYW1zLmRhdGEgPSBjb250ZXh0LnRvSlNPTigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWpheCByZXF1ZXN0XG4gICAgICAgIGNvbnN0IHJlc3BvbmNlID0gYWpheCh1cmwsIHBhcmFtcyk7XG4gICAgICAgIGNvbnRleHQudHJpZ2dlcignQHJlcXVlc3QnLCBjb250ZXh0LCByZXNwb25jZSk7XG4gICAgICAgIHJldHVybiByZXNwb25jZSBhcyBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGRhdGFTeW5jUkVTVCA9IG5ldyBSZXN0RGF0YVN5bmMoKSBhcyBJRGF0YVN5bmM7XG4iLCJpbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IElTdG9yYWdlLCBJU3RvcmFnZU9wdGlvbnMgfSBmcm9tICdAY2RwL2NvcmUtc3RvcmFnZSc7XG5pbXBvcnQgeyB3ZWJTdG9yYWdlIH0gZnJvbSAnQGNkcC93ZWItc3RvcmFnZSc7XG5pbXBvcnQge1xuICAgIElEYXRhU3luY09wdGlvbnMsXG4gICAgSURhdGFTeW5jLFxuICAgIFN5bmNNZXRob2RzLFxuICAgIFN5bmNDb250ZXh0LFxuICAgIFN5bmNSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyByZXNvbHZlVVJMIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIFtbSURhdGFTeW5jXV0gaW50ZXJmYWNlIGZvciBbW0lTdG9yYWdlXV0gYWNjZXNzb3IuXG4gKiBAamEgW1tJU3RvcmFnZV1dIOOCouOCr+OCu+ODg+OCteOCkuWCmeOBiOOCiyBbW0lEYXRhU3luY11dIOOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElTdG9yYWdlRGF0YVN5bmM8VCBleHRlbmRzIHt9ID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgSURhdGFTeW5jPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4gW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXM7XG59XG5cbi8qKlxuICogQGVuIE9wdGlvbnMgaW50ZXJmYWNlIGZvciBbW1N0b3JhZ2VEYXRhU3luY11dLlxuICogQGphIFtbU3RvcmFnZURhdGFTeW5jXV0g44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCB0eXBlIFN0b3JhZ2VEYXRhU3luY09wdGlvbnMgPSBJRGF0YVN5bmNPcHRpb25zICYgSVN0b3JhZ2VPcHRpb25zO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIFtbSURhdGFTeW5jXV0gaW1wbGVtYW50IGNsYXNzIHdoaWNoIHRhcmdldCBpcyBbW0lTdG9yYWdlXV0uIERlZmF1bHQgc3RvcmFnZSBpcyBbW1dlYlN0b3JhZ2VdXS5cbiAqIEBqYSBbW0lTdG9yYWdlXV0g44KS5a++6LGh44Go44GX44GfIFtbSURhdGFTeW5jXV0g5a6f6KOF44Kv44Op44K5LiDml6LlrprlgKTjga8gW1tXZWJTdG9yYWdlXV1cbiAqL1xuY2xhc3MgU3RvcmFnZURhdGFTeW5jIGltcGxlbWVudHMgSVN0b3JhZ2VEYXRhU3luYyB7XG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogSVN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gd2ViU3RvcmFnZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJU3RvcmFnZURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgW1tJU3RvcmFnZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnj77lnKjlr77osaHjga4gW1tJU3RvcmFnZV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldFN0b3JhZ2UoKTogSVN0b3JhZ2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG5ldyBbW0lTdG9yYWdlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOaWsOOBl+OBhCBbW0lTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K544KS6Kit5a6aXG4gICAgICovXG4gICAgc2V0U3RvcmFnZShuZXdTdG9yYWdlOiBJU3RvcmFnZSk6IHRoaXMge1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gbmV3U3RvcmFnZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSURhdGFTeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJRGF0YVN5bmNdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJRGF0YVN5bmNdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEbyBkYXRhIHN5bmNocm9uaXphdGlvbi5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBzeW5jPEsgZXh0ZW5kcyBTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBTeW5jQ29udGV4dCwgb3B0aW9ucz86IFN0b3JhZ2VEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPFN5bmNSZXN1bHQ8Sz4+IHtcbiAgICAgICAgY29uc3QgaWQgPSByZXNvbHZlVVJMKGNvbnRleHQpO1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX1NZTkNfUEFSQU1TLCAnQSBcInVybFwiIHByb3BlcnR5IG9yIGZ1bmN0aW9uIG11c3QgYmUgc3BlY2lmaWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHJlc3BvbmNlOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgdm9pZCB8IG51bGw+O1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgICAgICBjYXNlICdwYXRjaCc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRhdGEgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgICAgICAgICAgY29uc3QgYXR0cnMgPSBPYmplY3QuYXNzaWduKGNvbnRleHQudG9KU09OKCksIGRhdGEpO1xuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGlkLCBhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKGlkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICAgICAgICAgIHJlc3BvbmNlID0gdGhpcy5fc3RvcmFnZS5nZXRJdGVtPFBsYWluT2JqZWN0PihpZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfU1lOQ19QQVJBTVMsIGB1bmtub3duIG1ldGhvZDogJHttZXRob2R9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnRyaWdnZXIoJ0ByZXF1ZXN0JywgY29udGV4dCwgcmVzcG9uY2UgYXMgUHJvbWlzZTxQbGFpbk9iamVjdD4pO1xuICAgICAgICByZXR1cm4gcmVzcG9uY2UgYXMgUHJvbWlzZTxTeW5jUmVzdWx0PEs+PjtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBkYXRhU3luY1NUT1JBR0UgPSBuZXcgU3RvcmFnZURhdGFTeW5jKCkgYXMgSURhdGFTeW5jO1xuIiwiaW1wb3J0IHsgSURhdGFTeW5jIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRhdGFTeW5jTlVMTCB9IGZyb20gJy4vbnVsbCc7XG5cbmxldCBfZGVmYXVsdDogSURhdGFTeW5jID0gZGF0YVN5bmNOVUxMO1xuXG4vKipcbiAqIEBlbiBHZXQgb3IgdXBkYXRlIGRlZmF1bHQgW1tJRGF0YVN5bmNdXSBvYmplY3QuXG4gKiBAamEg5pei5a6a44GuIFtbSURhdGFTeW5jXV0g44Kq44OW44K444Kn44Kv44OI44Gu5Y+W5b6XIC8g5pu05pawXG4gKlxuICogQHBhcmFtIG5ld1N5bmNcbiAqICAtIGBlbmAgbmV3IGRhdGEtc3luYyBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCiyBkYXRhLXN5bmMg44Gu6L+U5Y2044Gu44G/6KGM44GGXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBvbGQgZGF0YS1zeW5jIG9iamVjdC5cbiAqICAtIGBqYWAg5Lul5YmN44GuIGRhdGEtc3luYyDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTeW5jKG5ld1N5bmM/OiBJRGF0YVN5bmMpOiBJRGF0YVN5bmMge1xuICAgIGlmIChudWxsID09IG5ld1N5bmMpIHtcbiAgICAgICAgcmV0dXJuIF9kZWZhdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFN5bmMgPSBfZGVmYXVsdDtcbiAgICAgICAgX2RlZmF1bHQgPSBuZXdTeW5jO1xuICAgICAgICByZXR1cm4gb2xkU3luYztcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiY2MiLCJyZXN1bHQiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJhamF4Iiwid2ViU3RvcmFnZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7R0FBQTs7Ozs7R0FNQSxnREFjQztHQWREOzs7OztPQVVJO09BQUE7V0FDSSxvRkFBd0QsQ0FBQTtXQUN4RCwyREFBZ0MsWUFBQSxrQkFBa0IsZ0JBQXVCLGdCQUF1QixDQUFDLEVBQUUsc0JBQXNCLENBQUMsbUNBQUEsQ0FBQTtRQUM3SCxJQUFBO0dBQ0wsQ0FBQzs7R0NURDs7OztHQUlBLE1BQU0sWUFBWTs7Ozs7OztPQVNkLElBQUksSUFBSTtXQUNKLE9BQU8sTUFBTSxDQUFDO1FBQ2pCOzs7Ozs7Ozs7Ozs7Ozs7T0FnQkQsTUFBTSxJQUFJLENBQXdCLE1BQVMsRUFBRSxPQUF3QixFQUFFLE9BQW9CO1dBQ3ZGLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1dBQ2pDLE1BQU1BLHFCQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7V0FDakIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssTUFBTSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztXQUNyRSxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7V0FDL0MsT0FBTyxRQUFzQyxDQUFDO1FBQ2pE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
