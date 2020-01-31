/*!
 * @cdp/i18n 0.9.0
 *   internationalization module
 */

(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-i18n'), require('@cdp/core-utils'), require('@cdp/result'), require('@cdp/ajax'), require('@cdp/environment')) :
   typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-i18n', '@cdp/core-utils', '@cdp/result', '@cdp/ajax', '@cdp/environment'], factory) :
   (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, extensionI18n, coreUtils, result, ajax, environment) { 'use strict';

   /** @internal */
   const _navigator = coreUtils.safe(globalThis.navigator);

   /* eslint-disable
      @typescript-eslint/no-non-null-assertion
    */
   //__________________________________________________________________________________________________//
   /**
    * @en The class a simple `i18next` backend built-in plugin. It will load resources from a backend server using the `fetch` API.
    * @ja `fetch` API を用いた `i18next` backend ビルトインプラグインクラス
    *
    * @internal
    */
   class AjaxBackend {
       constructor() {
           this.type = 'backend';
           this._options = {};
           this._fallbackMap = {};
       }
       ///////////////////////////////////////////////////////////////////////
       // implements: i18n.BackendModule<AjaxBackendOptions>
       init(services, options, initOptions) {
           this._services = services;
           this._options = Object.assign({ loadPath: "res/locales/{{ns}}.{{lng}}.json" /* LOAD_PATH */ }, this._options, options);
           this._fallbackMap = Object.assign(this._fallbackMap, initOptions.fallbackResources);
       }
       read(language, namespace, callback) {
           const lng = this._fallbackMap[language] || language;
           const loadPath = coreUtils.isFunction(this._options.loadPath) ? this._options.loadPath([lng], [namespace]) : this._options.loadPath;
           const url = this.resolveUrl(loadPath, { lng, ns: namespace });
           this.loadUrl(url, callback);
       }
       ///////////////////////////////////////////////////////////////////////
       // private methods:
       resolveUrl(loadPath, data) {
           return environment.toUrl(this._services.interpolator.interpolate(loadPath, data, undefined, undefined));
       }
       loadUrl(url, callback) {
           (async () => {
               try {
                   const json = await ajax.request.json(url, undefined, this._options);
                   callback(null, json);
               }
               catch (e) {
                   const result$1 = result.toResult(e);
                   const msg = `failed loading: ${url}, ${result$1.message}`;
                   if (result.RESULT_CODE.ERROR_AJAX_RESPONSE === result$1.code && result$1.cause) {
                       const status = result$1.cause.status;
                       if (500 <= status && status < 600) {
                           return callback(msg, true); // retry
                       }
                       else if (400 <= status && status < 500) {
                           return callback(msg, false); // no retry
                       }
                   }
                   callback(msg, false);
               }
           })();
       }
   }
   AjaxBackend.type = 'backend';

   /**
    * @en Translate funcion.
    * @ja 翻訳関数
    */
   const t = extensionI18n.i18n.t.bind(extensionI18n.i18n);
   /**
    * @en Initialize `i18next` instance.
    * @ja `i18next` インスタンスの初期化
    *
    * @param options
    *  - `en` init options
    *  - `ja` 初期化オプションを指定
    */
   const initializeI18N = (options) => {
       const opts = Object.assign({}, options);
       const { namespace, resourcePath: loadPath } = opts;
       if (!opts.lng) {
           opts.lng = _navigator.language;
       }
       if (namespace) {
           !opts.ns && (opts.ns = namespace);
           !opts.defaultNS && (opts.defaultNS = namespace);
       }
       if (loadPath) {
           opts.backend = Object.assign({ loadPath }, opts.backend);
       }
       if (opts.backend) {
           extensionI18n.i18n.use(AjaxBackend);
       }
       return extensionI18n.i18n.init(opts);
   };

   Object.keys(extensionI18n).forEach(function (k) {
      if (k !== 'default') Object.defineProperty(exports, k, {
         enumerable: true,
         get: function () {
            return extensionI18n[k];
         }
      });
   });
   exports.initializeI18N = initializeI18N;
   exports.t = t;

   Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwicGx1Z2luL2FqYXgtYmFja2VuZC50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9uYXZpZ2F0b3IgPSBzYWZlKGdsb2JhbFRoaXMubmF2aWdhdG9yKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHtcbiAgICBfbmF2aWdhdG9yIGFzIG5hdmlnYXRvcixcbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICovXG5cbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIHRvUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgeyB0b1VybCB9IGZyb20gJ0BjZHAvZW52aXJvbm1lbnQnO1xuaW1wb3J0IHsgSTE4Tk9wdGlvbnMgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZWZhdWx0IHtcbiAgICBMT0FEX1BBVEggPSAncmVzL2xvY2FsZXMve3tuc319Lnt7bG5nfX0uanNvbicsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgRmFsbGJhY2tSZXNvdXJjZU1hcCA9IHsgW2xuZzogc3RyaW5nXTogc3RyaW5nOyB9O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIGEgc2ltcGxlIGBpMThuZXh0YCBiYWNrZW5kIGJ1aWx0LWluIHBsdWdpbi4gSXQgd2lsbCBsb2FkIHJlc291cmNlcyBmcm9tIGEgYmFja2VuZCBzZXJ2ZXIgdXNpbmcgdGhlIGBmZXRjaGAgQVBJLlxuICogQGphIGBmZXRjaGAgQVBJIOOCkueUqOOBhOOBnyBgaTE4bmV4dGAgYmFja2VuZCDjg5Pjg6vjg4jjgqTjg7Pjg5fjg6njgrDjgqTjg7Pjgq/jg6njgrlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNsYXNzIEFqYXhCYWNrZW5kIGltcGxlbWVudHMgaTE4bi5CYWNrZW5kTW9kdWxlPGkxOG4uQWpheEJhY2tlbmRPcHRpb25zPiB7XG4gICAgcmVhZG9ubHkgdHlwZSA9ICdiYWNrZW5kJztcbiAgICBzdGF0aWMgdHlwZSA9ICdiYWNrZW5kJztcbiAgICBwcml2YXRlIF9zZXJ2aWNlcyE6IGkxOG4uU2VydmljZXM7XG4gICAgcHJpdmF0ZSBfb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMgPSB7fTtcbiAgICBwcml2YXRlIF9mYWxsYmFja01hcDogRmFsbGJhY2tSZXNvdXJjZU1hcCA9IHt9O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogaTE4bi5CYWNrZW5kTW9kdWxlPEFqYXhCYWNrZW5kT3B0aW9ucz5cblxuICAgIGluaXQoc2VydmljZXM6IGkxOG4uU2VydmljZXMsIG9wdGlvbnM6IGkxOG4uQWpheEJhY2tlbmRPcHRpb25zLCBpbml0T3B0aW9uczogSTE4Tk9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aDogRGVmYXVsdC5MT0FEX1BBVEggfSwgdGhpcy5fb3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2ZhbGxiYWNrTWFwID0gT2JqZWN0LmFzc2lnbih0aGlzLl9mYWxsYmFja01hcCwgaW5pdE9wdGlvbnMuZmFsbGJhY2tSZXNvdXJjZXMpO1xuICAgIH1cblxuICAgIHJlYWQobGFuZ3VhZ2U6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcsIGNhbGxiYWNrOiBpMThuLlJlYWRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICBjb25zdCBsbmcgPSB0aGlzLl9mYWxsYmFja01hcFtsYW5ndWFnZV0gfHwgbGFuZ3VhZ2U7XG4gICAgICAgIGNvbnN0IGxvYWRQYXRoID0gaXNGdW5jdGlvbih0aGlzLl9vcHRpb25zLmxvYWRQYXRoKSA/IHRoaXMuX29wdGlvbnMubG9hZFBhdGgoW2xuZ10sIFtuYW1lc3BhY2VdKSA6IHRoaXMuX29wdGlvbnMubG9hZFBhdGg7XG4gICAgICAgIGNvbnN0IHVybCA9IHRoaXMucmVzb2x2ZVVybChsb2FkUGF0aCBhcyBzdHJpbmcsIHsgbG5nLCBuczogbmFtZXNwYWNlIH0pO1xuICAgICAgICB0aGlzLmxvYWRVcmwodXJsLCBjYWxsYmFjayk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSByZXNvbHZlVXJsKGxvYWRQYXRoOiBzdHJpbmcsIGRhdGE6IHsgbG5nOiBzdHJpbmc7IG5zOiBzdHJpbmc7IH0pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9VcmwodGhpcy5fc2VydmljZXMuaW50ZXJwb2xhdG9yLmludGVycG9sYXRlKGxvYWRQYXRoLCBkYXRhLCB1bmRlZmluZWQhLCB1bmRlZmluZWQhKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2FkVXJsKHVybDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogaTE4bi5DYWxsYmFja0Vycm9yIHwgc3RyaW5nLCBkYXRhOiBpMThuLlJlc291cmNlS2V5IHwgYm9vbGVhbikgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgcmVxdWVzdC5qc29uKHVybCwgdW5kZWZpbmVkLCB0aGlzLl9vcHRpb25zKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBqc29uKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0b1Jlc3VsdChlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgZmFpbGVkIGxvYWRpbmc6ICR7dXJsfSwgJHtyZXN1bHQubWVzc2FnZX1gO1xuICAgICAgICAgICAgICAgIGlmIChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFID09PSByZXN1bHQuY29kZSAmJiByZXN1bHQuY2F1c2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzOiBudW1iZXIgPSByZXN1bHQuY2F1c2Uuc3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICBpZiAoNTAwIDw9IHN0YXR1cyAmJiBzdGF0dXMgPCA2MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2csIHRydWUpOyAgLy8gcmV0cnlcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICg0MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgZmFsc2UpOyAvLyBubyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG1zZywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuICAgIH1cbn1cbiIsImV4cG9ydCAqIGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgSTE4Tk9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgbmF2aWdhdG9yIH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgQWpheEJhY2tlbmQgfSBmcm9tICcuL3BsdWdpbic7XG5cbi8qKlxuICogQGVuIFRyYW5zbGF0ZSBmdW5jaW9uLlxuICogQGphIOe/u+ios+mWouaVsFxuICovXG5leHBvcnQgY29uc3QgdDogaTE4bi5URnVuY3Rpb24gPSBpMThuLnQuYmluZChpMThuKTtcblxuLyoqXG4gKiBAZW4gSW5pdGlhbGl6ZSBgaTE4bmV4dGAgaW5zdGFuY2UuXG4gKiBAamEgYGkxOG5leHRgIOOCpOODs+OCueOCv+ODs+OCueOBruWIneacn+WMllxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVJMThOID0gKG9wdGlvbnM/OiBJMThOT3B0aW9ucyk6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCB7IG5hbWVzcGFjZSwgcmVzb3VyY2VQYXRoOiBsb2FkUGF0aCB9ID0gb3B0cztcblxuICAgIGlmICghb3B0cy5sbmcpIHtcbiAgICAgICAgb3B0cy5sbmcgPSBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG4gICAgfVxuXG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAhb3B0cy5ucyAmJiAob3B0cy5ucyA9IG5hbWVzcGFjZSk7XG4gICAgICAgICFvcHRzLmRlZmF1bHROUyAmJiAob3B0cy5kZWZhdWx0TlMgPSBuYW1lc3BhY2UpO1xuICAgIH1cblxuICAgIGlmIChsb2FkUGF0aCkge1xuICAgICAgICBvcHRzLmJhY2tlbmQgPSBPYmplY3QuYXNzaWduKHsgbG9hZFBhdGggfSwgb3B0cy5iYWNrZW5kKTtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5iYWNrZW5kKSB7XG4gICAgICAgIGkxOG4udXNlKEFqYXhCYWNrZW5kKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaTE4bi5pbml0KG9wdHMpO1xufTtcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsInRvVXJsIiwicmVxdWVzdCIsInJlc3VsdCIsInRvUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJpMThuIiwibmF2aWdhdG9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztHQUVBO0dBQ0EsTUFBTSxVQUFVLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDOztHQ0g3Qzs7O0FBS0EsR0FjQTtHQUVBOzs7Ozs7QUFNQSxTQUFhLFdBQVc7T0FBeEI7V0FDYSxTQUFJLEdBQUcsU0FBUyxDQUFDO1dBR2xCLGFBQVEsR0FBNEIsRUFBRSxDQUFDO1dBQ3ZDLGlCQUFZLEdBQXdCLEVBQUUsQ0FBQztRQTZDbEQ7OztPQXhDRyxJQUFJLENBQUMsUUFBdUIsRUFBRSxPQUFnQyxFQUFFLFdBQXdCO1dBQ3BGLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1dBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEscURBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztXQUN2RixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN2RjtPQUVELElBQUksQ0FBQyxRQUFnQixFQUFFLFNBQWlCLEVBQUUsUUFBMkI7V0FDakUsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUM7V0FDcEQsTUFBTSxRQUFRLEdBQUdDLG9CQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztXQUMxSCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQWtCLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7V0FDeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDL0I7OztPQUtPLFVBQVUsQ0FBQyxRQUFnQixFQUFFLElBQWtDO1dBQ25FLE9BQU9DLGlCQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBVSxFQUFFLFNBQVUsQ0FBQyxDQUFDLENBQUM7UUFDakc7T0FFTyxPQUFPLENBQUMsR0FBVyxFQUFFLFFBQXNGO1dBQy9HLENBQUM7ZUFDRyxJQUFJO21CQUNBLE1BQU0sSUFBSSxHQUFHLE1BQU1DLFlBQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7bUJBQy9ELFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCO2VBQUMsT0FBTyxDQUFDLEVBQUU7bUJBQ1IsTUFBTUMsUUFBTSxHQUFHQyxlQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7bUJBQzNCLE1BQU0sR0FBRyxHQUFHLG1CQUFtQixHQUFHLEtBQUtELFFBQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQzttQkFDeEQsSUFBSUUsa0JBQVcsQ0FBQyxtQkFBbUIsS0FBS0YsUUFBTSxDQUFDLElBQUksSUFBSUEsUUFBTSxDQUFDLEtBQUssRUFBRTt1QkFDakUsTUFBTSxNQUFNLEdBQVdBLFFBQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO3VCQUMzQyxJQUFJLEdBQUcsSUFBSSxNQUFNLElBQUksTUFBTSxHQUFHLEdBQUcsRUFBRTsyQkFDL0IsT0FBTyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUM5Qjs0QkFBTSxJQUFJLEdBQUcsSUFBSSxNQUFNLElBQUksTUFBTSxHQUFHLEdBQUcsRUFBRTsyQkFDdEMsT0FBTyxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO3dCQUMvQjtvQkFDSjttQkFDRCxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN4QjtZQUNKLEdBQUcsQ0FBQztRQUNSOztHQS9DTSxnQkFBSSxHQUFHLFNBQVMsQ0FBQzs7R0N2QjVCOzs7O0FBSUEsU0FBYSxDQUFDLEdBQW1CRyxrQkFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUNBLGtCQUFJLENBQUMsQ0FBQztHQUVuRDs7Ozs7Ozs7QUFRQSxTQUFhLGNBQWMsR0FBRyxDQUFDLE9BQXFCO09BQ2hELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO09BRXhDLE1BQU0sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztPQUVuRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtXQUNYLElBQUksQ0FBQyxHQUFHLEdBQUdDLFVBQVMsQ0FBQyxRQUFRLENBQUM7UUFDakM7T0FFRCxJQUFJLFNBQVMsRUFBRTtXQUNYLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1dBQ2xDLENBQUMsSUFBSSxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBQ25EO09BRUQsSUFBSSxRQUFRLEVBQUU7V0FDVixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUQ7T0FFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7V0FDZEQsa0JBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekI7T0FFRCxPQUFPQSxrQkFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUMzQixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2kxOG4vIn0=
