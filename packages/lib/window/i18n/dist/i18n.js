/*!
 * @cdp/i18n 0.9.0
 *   internationalization module
 */

(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-i18n'), require('@cdp/result'), require('@cdp/dom'), require('@cdp/core-utils'), require('@cdp/ajax'), require('@cdp/environment')) :
   typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-i18n', '@cdp/result', '@cdp/dom', '@cdp/core-utils', '@cdp/ajax', '@cdp/environment'], factory) :
   (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, extensionI18n, result, dom, coreUtils, ajax, environment) { 'use strict';

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
           RESULT_CODE[RESULT_CODE["I18N_DECLARE"] = 9007199254740991] = "I18N_DECLARE";
           RESULT_CODE[RESULT_CODE["ERROR_I18N_CORE_LAYER"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 40 /* I18N */ + 1, 'i18next error')] = "ERROR_I18N_CORE_LAYER";
       })();
   })();

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

   /** @internal extends [[DOM]] instance method */
   function extend(domOptions, i18next) {
       const { selectorAttr, targetAttr, optionsAttr, useOptionsAttr, parseDefaultValueFromContent, customTagName, } = domOptions;
       const extendDefault = (o, val) => {
           if (!parseDefaultValueFromContent) {
               return o;
           }
           return { ...o, ...{ defaultValue: val } };
       };
       // [prepend]/[append] helper
       const insert = (method, $el, key, opts) => {
           const translated = i18next.t(key, extendDefault(opts, $el.html()));
           if (false === customTagName) {
               $el[method](translated);
           }
           else {
               const translatedWithWrap = `<${customTagName}>${translated}</${customTagName}>`;
               const $firstChild = dom.dom($el[0].firstElementChild);
               if ($firstChild.is(customTagName)) {
                   $firstChild.replaceWith(translatedWithWrap);
               }
               else {
                   $el[method](translatedWithWrap);
               }
           }
       };
       const parse = ($el, key, opts) => {
           let attr = 'text';
           if (key.startsWith('[')) {
               const parts = key.split(']');
               key = parts[1].trim();
               attr = parts[0].substr(1, parts[0].length - 1).trim();
           }
           if ('html' === attr) {
               $el.html(i18next.t(key, extendDefault(opts, $el.html())));
           }
           else if ('text' === attr) {
               $el.text(i18next.t(key, extendDefault(opts, $el.text()))); // eslint-disable-line
           }
           else if ('prepend' === attr) {
               insert('prepend', $el, key, opts);
           }
           else if ('append' === attr) {
               insert('append', $el, key, opts);
           }
           else if (attr.startsWith('data-')) {
               const dataAttr = attr.substr(('data-').length);
               const translated = i18next.t(key, extendDefault(opts, $el.data(dataAttr)));
               $el.data(dataAttr, translated);
               $el.attr(attr, translated);
           }
           else {
               $el.attr(attr, i18next.t(key, extendDefault(opts, $el.attr(attr)))); // eslint-disable-line
           }
       };
       const localize = ($el, opts) => {
           const key = $el.attr(selectorAttr);
           if (!key) {
               return;
           }
           let $target = $el;
           const targetSelector = $el.data(targetAttr);
           if (targetSelector) {
               $target = $el.find(targetSelector);
           }
           if (!opts && true === useOptionsAttr) {
               opts = $el.data(optionsAttr);
           }
           opts = opts || {};
           for (const part of key.split(';')) {
               const k = part.trim();
               if ('' !== k) {
                   parse($target, k, opts);
               }
           }
           if (true === useOptionsAttr) {
               const clone = { ...opts };
               delete clone.lng;
               $el.data(optionsAttr, clone);
           }
       };
       function handle(opts) {
           // eslint-disable-next-line no-invalid-this
           return this.each((index, el) => {
               const $el = dom.dom(el);
               // localize element itself
               localize($el, opts);
               // localize children
               const $children = $el.find(`[${selectorAttr}]`);
               $children.each((index, el) => {
                   localize(dom.dom(el), opts);
               });
           });
       }
       // selector function $(mySelector).localize(opts);
       dom.dom.fn['localize'] = handle;
   }
   /**
    * @en `i18next` DOM localizer built-in plugin factory.
    * @ja `i18next` DOM ローカライズビルトインプラグインファクトリーメソッド
    *
    * @internal
    */
   function DomLocalizer(domOptions) {
       return {
           type: '3rdParty',
           init: extend.bind(null, Object.assign({
               selectorAttr: 'data-i18n',
               targetAttr: 'i18n-target',
               optionsAttr: 'i18n-options',
               useOptionsAttr: false,
               parseDefaultValueFromContent: true,
               customTagName: 'cdp-i18n',
           }, domOptions)),
       };
   }

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
       const opts = Object.assign({ noThrow: true }, options);
       const { namespace, resourcePath: loadPath, dom, noThrow } = opts;
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
       extensionI18n.i18n.use(DomLocalizer(dom));
       return new Promise((resolve, reject) => {
           extensionI18n.i18n.init(opts, (error, translator) => {
               if (error) {
                   const result$1 = result.makeResult(result.RESULT_CODE.ERROR_I18N_CORE_LAYER, 'i18n#init() failed.', error);
                   if (noThrow) {
                       console.warn(result$1.message, result$1);
                   }
                   else {
                       return reject(result$1);
                   }
               }
               resolve(translator);
           });
       });
   };
   /**
    * @en Get the current detected or set language.
    * @ja 現在設定されている言語を取得
    *
    * @returns `ja-JP`, `ja`
    */
   const getLanguage = () => {
       return extensionI18n.i18n.language || _navigator.language;
   };
   /**
    * @en Get an array of `language-codes` that will be used it order to lookup the translation value.
    * @ja 翻訳の検索に使用される `language-codes` リストを取得
    *
    * @see
    *  - https://www.i18next.com/overview/api#languages
    */
   const getLanguageList = () => {
       return extensionI18n.i18n.languages || [_navigator.language];
   };
   /**
    * @en Changes the language.
    * @ja 言語の切り替え
    */
   const changeLanguage = (lng, options) => {
       const opts = Object.assign({ noThrow: true }, options);
       return new Promise((resolve, reject) => {
           extensionI18n.i18n.changeLanguage(lng, (error, translator) => {
               if (error) {
                   const result$1 = result.makeResult(result.RESULT_CODE.ERROR_I18N_CORE_LAYER, 'i18n#changeLanguate() failed.', error);
                   if (opts.noThrow) {
                       console.warn(result$1.message, result$1);
                   }
                   else {
                       return reject(result$1);
                   }
               }
               resolve(translator);
           });
       });
   };
   /**
    * @en DOM localizer method.
    * @ja DOM ローカライズ
    *
    * @param selector
    *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
    *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
    * @param options
    *  - `en` translation options.
    *  - `ja` 翻訳オプション
    */
   const localize = (selector, options) => {
       return dom.dom(selector).localize(options);
   };

   Object.keys(extensionI18n).forEach(function (k) {
      if (k !== 'default') Object.defineProperty(exports, k, {
         enumerable: true,
         get: function () {
            return extensionI18n[k];
         }
      });
   });
   exports.changeLanguage = changeLanguage;
   exports.getLanguage = getLanguage;
   exports.getLanguageList = getLanguageList;
   exports.initializeI18N = initializeI18N;
   exports.localize = localize;
   exports.t = t;

   Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICwgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHNcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9uYXZpZ2F0b3IgPSBzYWZlKGdsb2JhbFRoaXMubmF2aWdhdG9yKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHtcbiAgICBfbmF2aWdhdG9yIGFzIG5hdmlnYXRvcixcbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICovXG5cbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIHRvUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgeyB0b1VybCB9IGZyb20gJ0BjZHAvZW52aXJvbm1lbnQnO1xuaW1wb3J0IHsgSTE4Tk9wdGlvbnMgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZWZhdWx0IHtcbiAgICBMT0FEX1BBVEggPSAncmVzL2xvY2FsZXMve3tuc319Lnt7bG5nfX0uanNvbicsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgRmFsbGJhY2tSZXNvdXJjZU1hcCA9IHsgW2xuZzogc3RyaW5nXTogc3RyaW5nOyB9O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIGEgc2ltcGxlIGBpMThuZXh0YCBiYWNrZW5kIGJ1aWx0LWluIHBsdWdpbi4gSXQgd2lsbCBsb2FkIHJlc291cmNlcyBmcm9tIGEgYmFja2VuZCBzZXJ2ZXIgdXNpbmcgdGhlIGBmZXRjaGAgQVBJLlxuICogQGphIGBmZXRjaGAgQVBJIOOCkueUqOOBhOOBnyBgaTE4bmV4dGAgYmFja2VuZCDjg5Pjg6vjg4jjgqTjg7Pjg5fjg6njgrDjgqTjg7Pjgq/jg6njgrlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNsYXNzIEFqYXhCYWNrZW5kIGltcGxlbWVudHMgaTE4bi5CYWNrZW5kTW9kdWxlPGkxOG4uQWpheEJhY2tlbmRPcHRpb25zPiB7XG4gICAgcmVhZG9ubHkgdHlwZSA9ICdiYWNrZW5kJztcbiAgICBzdGF0aWMgdHlwZSA9ICdiYWNrZW5kJztcbiAgICBwcml2YXRlIF9zZXJ2aWNlcyE6IGkxOG4uU2VydmljZXM7XG4gICAgcHJpdmF0ZSBfb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMgPSB7fTtcbiAgICBwcml2YXRlIF9mYWxsYmFja01hcDogRmFsbGJhY2tSZXNvdXJjZU1hcCA9IHt9O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogaTE4bi5CYWNrZW5kTW9kdWxlPEFqYXhCYWNrZW5kT3B0aW9ucz5cblxuICAgIGluaXQoc2VydmljZXM6IGkxOG4uU2VydmljZXMsIG9wdGlvbnM6IGkxOG4uQWpheEJhY2tlbmRPcHRpb25zLCBpbml0T3B0aW9uczogSTE4Tk9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aDogRGVmYXVsdC5MT0FEX1BBVEggfSwgdGhpcy5fb3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2ZhbGxiYWNrTWFwID0gT2JqZWN0LmFzc2lnbih0aGlzLl9mYWxsYmFja01hcCwgaW5pdE9wdGlvbnMuZmFsbGJhY2tSZXNvdXJjZXMpO1xuICAgIH1cblxuICAgIHJlYWQobGFuZ3VhZ2U6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcsIGNhbGxiYWNrOiBpMThuLlJlYWRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICBjb25zdCBsbmcgPSB0aGlzLl9mYWxsYmFja01hcFtsYW5ndWFnZV0gfHwgbGFuZ3VhZ2U7XG4gICAgICAgIGNvbnN0IGxvYWRQYXRoID0gaXNGdW5jdGlvbih0aGlzLl9vcHRpb25zLmxvYWRQYXRoKSA/IHRoaXMuX29wdGlvbnMubG9hZFBhdGgoW2xuZ10sIFtuYW1lc3BhY2VdKSA6IHRoaXMuX29wdGlvbnMubG9hZFBhdGg7XG4gICAgICAgIGNvbnN0IHVybCA9IHRoaXMucmVzb2x2ZVVybChsb2FkUGF0aCBhcyBzdHJpbmcsIHsgbG5nLCBuczogbmFtZXNwYWNlIH0pO1xuICAgICAgICB0aGlzLmxvYWRVcmwodXJsLCBjYWxsYmFjayk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSByZXNvbHZlVXJsKGxvYWRQYXRoOiBzdHJpbmcsIGRhdGE6IHsgbG5nOiBzdHJpbmc7IG5zOiBzdHJpbmc7IH0pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9VcmwodGhpcy5fc2VydmljZXMuaW50ZXJwb2xhdG9yLmludGVycG9sYXRlKGxvYWRQYXRoLCBkYXRhLCB1bmRlZmluZWQhLCB1bmRlZmluZWQhKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2FkVXJsKHVybDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogaTE4bi5DYWxsYmFja0Vycm9yIHwgc3RyaW5nLCBkYXRhOiBpMThuLlJlc291cmNlS2V5IHwgYm9vbGVhbikgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgcmVxdWVzdC5qc29uKHVybCwgdW5kZWZpbmVkLCB0aGlzLl9vcHRpb25zKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBqc29uKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0b1Jlc3VsdChlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgZmFpbGVkIGxvYWRpbmc6ICR7dXJsfSwgJHtyZXN1bHQubWVzc2FnZX1gO1xuICAgICAgICAgICAgICAgIGlmIChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFID09PSByZXN1bHQuY29kZSAmJiByZXN1bHQuY2F1c2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzOiBudW1iZXIgPSByZXN1bHQuY2F1c2Uuc3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICBpZiAoNTAwIDw9IHN0YXR1cyAmJiBzdGF0dXMgPCA2MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2csIHRydWUpOyAgLy8gcmV0cnlcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICg0MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgZmFsc2UpOyAvLyBubyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG1zZywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgZG9tIGFzICQsXG4gICAgRE9NLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgJy4vbW9kdWxlLWV4dGVuZHMnO1xuXG4vKiogQGludGVybmFsIGV4dGVuZHMgW1tET01dXSBpbnN0YW5jZSBtZXRob2QgKi9cbmZ1bmN0aW9uIGV4dGVuZChkb21PcHRpb25zOiBSZXF1aXJlZDxpMThuLkRvbUxvY2FsaXplck9wdGlvbnM+LCBpMThuZXh0OiBpMThuLmkxOG4pOiB2b2lkIHtcbiAgICBjb25zdCB7XG4gICAgICAgIHNlbGVjdG9yQXR0cixcbiAgICAgICAgdGFyZ2V0QXR0cixcbiAgICAgICAgb3B0aW9uc0F0dHIsXG4gICAgICAgIHVzZU9wdGlvbnNBdHRyLFxuICAgICAgICBwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50LFxuICAgICAgICBjdXN0b21UYWdOYW1lLFxuICAgIH0gPSBkb21PcHRpb25zO1xuXG4gICAgY29uc3QgZXh0ZW5kRGVmYXVsdCA9IChvOiBQbGFpbk9iamVjdCwgdmFsOiBzdHJpbmcpOiBQbGFpbk9iamVjdCA9PiB7XG4gICAgICAgIGlmICghcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgLi4ubywgLi4ueyBkZWZhdWx0VmFsdWU6IHZhbCB9IH07XG4gICAgfTtcblxuICAgIC8vIFtwcmVwZW5kXS9bYXBwZW5kXSBoZWxwZXJcbiAgICBjb25zdCBpbnNlcnQgPSAobWV0aG9kOiAncHJlcGVuZCcgfCAnYXBwZW5kJywgJGVsOiBET00sIGtleTogc3RyaW5nLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKTtcbiAgICAgICAgaWYgKGZhbHNlID09PSBjdXN0b21UYWdOYW1lKSB7XG4gICAgICAgICAgICAkZWxbbWV0aG9kXSh0cmFuc2xhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWRXaXRoV3JhcCA9IGA8JHtjdXN0b21UYWdOYW1lfT4ke3RyYW5zbGF0ZWR9PC8ke2N1c3RvbVRhZ05hbWV9PmA7XG4gICAgICAgICAgICBjb25zdCAkZmlyc3RDaGlsZCA9ICQoJGVsWzBdLmZpcnN0RWxlbWVudENoaWxkKSBhcyBET007XG4gICAgICAgICAgICBpZiAoJGZpcnN0Q2hpbGQuaXMoY3VzdG9tVGFnTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAkZmlyc3RDaGlsZC5yZXBsYWNlV2l0aCh0cmFuc2xhdGVkV2l0aFdyYXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZWxbbWV0aG9kXSh0cmFuc2xhdGVkV2l0aFdyYXApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHBhcnNlID0gKCRlbDogRE9NLCBrZXk6IHN0cmluZywgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBsZXQgYXR0ciA9ICd0ZXh0JztcblxuICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ1snKSkge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJ10nKTtcbiAgICAgICAgICAgIGtleSAgPSBwYXJ0c1sxXS50cmltKCk7XG4gICAgICAgICAgICBhdHRyID0gcGFydHNbMF0uc3Vic3RyKDEsIHBhcnRzWzBdLmxlbmd0aCAtIDEpLnRyaW0oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnaHRtbCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgICRlbC5odG1sKGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmh0bWwoKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmICgndGV4dCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgICRlbC50ZXh0KGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLnRleHQoKSkpIGFzIHN0cmluZyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfSBlbHNlIGlmICgncHJlcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgncHJlcGVuZCcsICRlbCwga2V5LCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdhcHBlbmQnLCAkZWwsIGtleSwgb3B0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXR0ci5zdGFydHNXaXRoKCdkYXRhLScpKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhQXR0ciA9IGF0dHIuc3Vic3RyKCgnZGF0YS0nKS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmRhdGEoZGF0YUF0dHIpIGFzIHN0cmluZykpO1xuICAgICAgICAgICAgJGVsLmRhdGEoZGF0YUF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5hdHRyKGF0dHIpIGFzIHN0cmluZykpIGFzIHN0cmluZyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBsb2NhbGl6ZSA9ICgkZWw6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSAkZWwuYXR0cihzZWxlY3RvckF0dHIpO1xuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0ICR0YXJnZXQgPSAkZWw7XG4gICAgICAgIGNvbnN0IHRhcmdldFNlbGVjdG9yID0gJGVsLmRhdGEodGFyZ2V0QXR0cikgYXMgc3RyaW5nO1xuXG4gICAgICAgIGlmICh0YXJnZXRTZWxlY3Rvcikge1xuICAgICAgICAgICAgJHRhcmdldCA9ICRlbC5maW5kKHRhcmdldFNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb3B0cyAmJiB0cnVlID09PSB1c2VPcHRpb25zQXR0cikge1xuICAgICAgICAgICAgb3B0cyA9ICRlbC5kYXRhKG9wdGlvbnNBdHRyKSBhcyBvYmplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2Yga2V5LnNwbGl0KCc7JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGsgPSBwYXJ0LnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgnJyAhPT0gaykge1xuICAgICAgICAgICAgICAgIHBhcnNlKCR0YXJnZXQsIGssIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHsgLi4ub3B0cyB9O1xuICAgICAgICAgICAgZGVsZXRlIGNsb25lLmxuZztcbiAgICAgICAgICAgICRlbC5kYXRhKG9wdGlvbnNBdHRyLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlKHRoaXM6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IERPTSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbnZhbGlkLXRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIC8vIGxvY2FsaXplIGVsZW1lbnQgaXRzZWxmXG4gICAgICAgICAgICBsb2NhbGl6ZSgkZWwsIG9wdHMpO1xuICAgICAgICAgICAgLy8gbG9jYWxpemUgY2hpbGRyZW5cbiAgICAgICAgICAgIGNvbnN0ICRjaGlsZHJlbiA9ICRlbC5maW5kKGBbJHtzZWxlY3RvckF0dHJ9XWApO1xuICAgICAgICAgICAgJGNoaWxkcmVuLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGxvY2FsaXplKCQoZWwpLCBvcHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBzZWxlY3RvciBmdW5jdGlvbiAkKG15U2VsZWN0b3IpLmxvY2FsaXplKG9wdHMpO1xuICAgICQuZm5bJ2xvY2FsaXplJ10gPSBoYW5kbGU7XG59XG5cbi8qKlxuICogQGVuIGBpMThuZXh0YCBET00gbG9jYWxpemVyIGJ1aWx0LWluIHBsdWdpbiBmYWN0b3J5LlxuICogQGphIGBpMThuZXh0YCBET00g44Ot44O844Kr44Op44Kk44K644OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44OV44Kh44Kv44OI44Oq44O844Oh44K944OD44OJXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBEb21Mb2NhbGl6ZXIoZG9tT3B0aW9ucz86IGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucyk6IGkxOG4uVGhpcmRQYXJ0eU1vZHVsZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJzNyZFBhcnR5JyxcbiAgICAgICAgaW5pdDogZXh0ZW5kLmJpbmQoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3JBdHRyOiAnZGF0YS1pMThuJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRBdHRyOiAnaTE4bi10YXJnZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNBdHRyOiAnaTE4bi1vcHRpb25zJyxcbiAgICAgICAgICAgICAgICB1c2VPcHRpb25zQXR0cjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjdXN0b21UYWdOYW1lOiAnY2RwLWkxOG4nLFxuICAgICAgICAgICAgfSwgZG9tT3B0aW9ucylcbiAgICAgICAgKSxcbiAgICB9O1xufVxuIiwiZXhwb3J0ICogZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucywgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IG5hdmlnYXRvciB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IEFqYXhCYWNrZW5kLCBEb21Mb2NhbGl6ZXIgfSBmcm9tICcuL3BsdWdpbic7XG5cbi8qKlxuICogQGVuIFRyYW5zbGF0ZSBmdW5jaW9uLlxuICogQGphIOe/u+ios+mWouaVsFxuICovXG5leHBvcnQgY29uc3QgdDogaTE4bi5URnVuY3Rpb24gPSBpMThuLnQuYmluZChpMThuKTtcblxuLyoqXG4gKiBAZW4gSW5pdGlhbGl6ZSBgaTE4bmV4dGAgaW5zdGFuY2UuXG4gKiBAamEgYGkxOG5leHRgIOOCpOODs+OCueOCv+ODs+OCueOBruWIneacn+WMllxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVJMThOID0gKG9wdGlvbnM/OiBJMThOT3B0aW9ucyk6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG5vVGhyb3c6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCB7IG5hbWVzcGFjZSwgcmVzb3VyY2VQYXRoOiBsb2FkUGF0aCwgZG9tLCBub1Rocm93IH0gPSBvcHRzO1xuXG4gICAgaWYgKCFvcHRzLmxuZykge1xuICAgICAgICBvcHRzLmxuZyA9IG5hdmlnYXRvci5sYW5ndWFnZTtcbiAgICB9XG5cbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgICFvcHRzLm5zICYmIChvcHRzLm5zID0gbmFtZXNwYWNlKTtcbiAgICAgICAgIW9wdHMuZGVmYXVsdE5TICYmIChvcHRzLmRlZmF1bHROUyA9IG5hbWVzcGFjZSk7XG4gICAgfVxuXG4gICAgaWYgKGxvYWRQYXRoKSB7XG4gICAgICAgIG9wdHMuYmFja2VuZCA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aCB9LCBvcHRzLmJhY2tlbmQpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLmJhY2tlbmQpIHtcbiAgICAgICAgaTE4bi51c2UoQWpheEJhY2tlbmQpO1xuICAgIH1cblxuICAgIGkxOG4udXNlKERvbUxvY2FsaXplcihkb20pKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGkxOG4uaW5pdChvcHRzLCAoZXJyb3IsIHRyYW5zbGF0b3IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfSTE4Tl9DT1JFX0xBWUVSLCAnaTE4biNpbml0KCkgZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBpZiAobm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4ocmVzdWx0Lm1lc3NhZ2UsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUodHJhbnNsYXRvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBjdXJyZW50IGRldGVjdGVkIG9yIHNldCBsYW5ndWFnZS5cbiAqIEBqYSDnj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovoqIDoqp7jgpLlj5blvpdcbiAqXG4gKiBAcmV0dXJucyBgamEtSlBgLCBgamFgXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRMYW5ndWFnZSA9ICgpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBpMThuLmxhbmd1YWdlIHx8IG5hdmlnYXRvci5sYW5ndWFnZTtcbn07XG5cbi8qKlxuICogQGVuIEdldCBhbiBhcnJheSBvZiBgbGFuZ3VhZ2UtY29kZXNgIHRoYXQgd2lsbCBiZSB1c2VkIGl0IG9yZGVyIHRvIGxvb2t1cCB0aGUgdHJhbnNsYXRpb24gdmFsdWUuXG4gKiBAamEg57+76Kiz44Gu5qSc57Si44Gr5L2/55So44GV44KM44KLIGBsYW5ndWFnZS1jb2Rlc2Ag44Oq44K544OI44KS5Y+W5b6XXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly93d3cuaTE4bmV4dC5jb20vb3ZlcnZpZXcvYXBpI2xhbmd1YWdlc1xuICovXG5leHBvcnQgY29uc3QgZ2V0TGFuZ3VhZ2VMaXN0ID0gKCk6IHN0cmluZ1tdID0+IHtcbiAgICByZXR1cm4gaTE4bi5sYW5ndWFnZXMgfHwgW25hdmlnYXRvci5sYW5ndWFnZV07XG59O1xuXG4vKipcbiAqIEBlbiBDaGFuZ2VzIHRoZSBsYW5ndWFnZS5cbiAqIEBqYSDoqIDoqp7jga7liIfjgormm7/jgYhcbiAqL1xuZXhwb3J0IGNvbnN0IGNoYW5nZUxhbmd1YWdlID0gKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4gPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbm9UaHJvdzogdHJ1ZSB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBpMThuLmNoYW5nZUxhbmd1YWdlKGxuZywgKGVycm9yLCB0cmFuc2xhdG9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0kxOE5fQ09SRV9MQVlFUiwgJ2kxOG4jY2hhbmdlTGFuZ3VhdGUoKSBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRzLm5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHJlc3VsdC5tZXNzYWdlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHRyYW5zbGF0b3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIERPTSBsb2NhbGl6ZXIgbWV0aG9kLlxuICogQGphIERPTSDjg63jg7zjgqvjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdHJhbnNsYXRpb24gb3B0aW9ucy5cbiAqICAtIGBqYWAg57+76Kiz44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBsb2NhbGl6ZSA9IDxUIGV4dGVuZHMgc3RyaW5nIHwgTm9kZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBvcHRpb25zPzogaTE4bi5UT3B0aW9ucyk6IERPTVJlc3VsdDxUPiA9PiB7XG4gICAgcmV0dXJuICQoc2VsZWN0b3IpLmxvY2FsaXplKG9wdGlvbnMpIGFzIERPTVJlc3VsdDxUPjtcbn07XG4iXSwibmFtZXMiOlsic2FmZSIsImlzRnVuY3Rpb24iLCJ0b1VybCIsInJlcXVlc3QiLCJyZXN1bHQiLCJ0b1Jlc3VsdCIsIlJFU1VMVF9DT0RFIiwiJCIsImkxOG4iLCJuYXZpZ2F0b3IiLCJtYWtlUmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztHQUFBOzs7OztHQU1BLGdEQWNDO0dBZEQ7Ozs7O09BVUk7T0FBQTtXQUNJLDRFQUEwQyxDQUFBO1dBQzFDLG1EQUF3QixZQUFBLGtCQUFrQixnQkFBdUIsZ0JBQXVCLENBQUMsRUFBRSxlQUFlLENBQUMsMkJBQUEsQ0FBQTtRQUM5RyxJQUFBO0dBQ0wsQ0FBQzs7R0NsQkQ7R0FDQSxNQUFNLFVBQVUsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7O0dDSDdDOzs7R0FtQkE7R0FFQTs7Ozs7O1NBTWEsV0FBVztPQUF4QjtXQUNhLFNBQUksR0FBRyxTQUFTLENBQUM7V0FHbEIsYUFBUSxHQUE0QixFQUFFLENBQUM7V0FDdkMsaUJBQVksR0FBd0IsRUFBRSxDQUFDO1FBNkNsRDs7O09BeENHLElBQUksQ0FBQyxRQUF1QixFQUFFLE9BQWdDLEVBQUUsV0FBd0I7V0FDcEYsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7V0FDMUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxxREFBcUIsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1dBQ3ZGLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFD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
