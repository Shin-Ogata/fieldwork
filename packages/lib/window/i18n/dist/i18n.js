/*!
 * @cdp/i18n 0.9.0
 *   internationalization module
 */

(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-i18n'), require('@cdp/core-utils'), require('@cdp/result'), require('@cdp/ajax'), require('@cdp/environment'), require('@cdp/dom')) :
   typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-i18n', '@cdp/core-utils', '@cdp/result', '@cdp/ajax', '@cdp/environment', '@cdp/dom'], factory) :
   (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, extensionI18n, coreUtils, result, ajax, environment, dom) { 'use strict';

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
       const parse = ($el, key, opts) => {
           if (0 === key.length) {
               return;
           }
           let attr = 'text';
           if (key.startsWith('[')) {
               const parts = key.split(']');
               key = parts[1];
               attr = parts[0].substr(1, parts[0].length - 1);
           }
           if (key.indexOf(';') === key.length - 1) {
               key = key.substr(0, key.length - 2);
           }
           const extendDefault = (o, val) => {
               if (!parseDefaultValueFromContent) {
                   return o;
               }
               return { ...o, ...{ defaultValue: val } };
           };
           // [prepend]/[append] helper
           const insert = (method) => {
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
           if ('html' === attr) {
               $el.html(i18next.t(key, extendDefault(opts, $el.html())));
           }
           else if ('text' === attr) {
               $el.text(i18next.t(key, extendDefault(opts, $el.text()))); // eslint-disable-line
           }
           else if ('prepend' === attr) {
               insert('prepend');
           }
           else if ('append' === attr) {
               insert('append');
           }
           else if (attr.startsWith('data-')) {
               const dataAttr = attr.substr(('data-').length);
               const translated = i18next.t(key, extendDefault(opts, $el.data(dataAttr)));
               // we change into the data cache
               $el.data(dataAttr, translated);
               // we change into the dom
               $el.attr(attr, translated);
           }
           else {
               $el.attr(attr, i18next.t(key, extendDefault(opts, $el.attr(attr)))); // eslint-disable-line
           }
       };
       const localize = ($el, opts) => {
           let key = $el.attr(selectorAttr);
           if (!key && 'undefined' !== typeof key) {
               key = $el.text() || $el.val();
           }
           if (!key) {
               return;
           }
           let target = $el;
           const targetSelector = $el.data(targetAttr);
           if (targetSelector) {
               target = $el.find(targetSelector) || $el;
           }
           if (!opts && true === useOptionsAttr) {
               opts = $el.data(optionsAttr);
           }
           opts = opts || {};
           if (key.includes(';')) {
               for (const k of key.split(';')) {
                   // .trim(): Trim the comma-separated parameters on the data-i18n attribute.
                   if ('' !== k) {
                       parse(target, k.trim(), opts);
                   }
               }
           }
           else {
               parse(target, key, opts);
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
   function localize(selector, options) {
       return dom.dom(selector).localize(options);
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
       const opts = Object.assign({}, options);
       const { namespace, resourcePath: loadPath, dom } = opts;
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
   exports.localize = localize;
   exports.t = t;

   Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwicGx1Z2luL2FqYXgtYmFja2VuZC50cyIsInBsdWdpbi9kb20tbG9jYWxpemVyLnRzIiwiY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX25hdmlnYXRvciA9IHNhZmUoZ2xvYmFsVGhpcy5uYXZpZ2F0b3IpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQge1xuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gKi9cblxuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgdG9SZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyByZXF1ZXN0IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IHRvVXJsIH0gZnJvbSAnQGNkcC9lbnZpcm9ubWVudCc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHQge1xuICAgIExPQURfUEFUSCA9ICdyZXMvbG9jYWxlcy97e25zfX0ue3tsbmd9fS5qc29uJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBGYWxsYmFja1Jlc291cmNlTWFwID0geyBbbG5nOiBzdHJpbmddOiBzdHJpbmc7IH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgYSBzaW1wbGUgYGkxOG5leHRgIGJhY2tlbmQgYnVpbHQtaW4gcGx1Z2luLiBJdCB3aWxsIGxvYWQgcmVzb3VyY2VzIGZyb20gYSBiYWNrZW5kIHNlcnZlciB1c2luZyB0aGUgYGZldGNoYCBBUEkuXG4gKiBAamEgYGZldGNoYCBBUEkg44KS55So44GE44GfIGBpMThuZXh0YCBiYWNrZW5kIOODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+OCr+ODqeOCuVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY2xhc3MgQWpheEJhY2tlbmQgaW1wbGVtZW50cyBpMThuLkJhY2tlbmRNb2R1bGU8aTE4bi5BamF4QmFja2VuZE9wdGlvbnM+IHtcbiAgICByZWFkb25seSB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHN0YXRpYyB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHByaXZhdGUgX3NlcnZpY2VzITogaTE4bi5TZXJ2aWNlcztcbiAgICBwcml2YXRlIF9vcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucyA9IHt9O1xuICAgIHByaXZhdGUgX2ZhbGxiYWNrTWFwOiBGYWxsYmFja1Jlc291cmNlTWFwID0ge307XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBpMThuLkJhY2tlbmRNb2R1bGU8QWpheEJhY2tlbmRPcHRpb25zPlxuXG4gICAgaW5pdChzZXJ2aWNlczogaTE4bi5TZXJ2aWNlcywgb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMsIGluaXRPcHRpb25zOiBJMThOT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoOiBEZWZhdWx0LkxPQURfUEFUSCB9LCB0aGlzLl9vcHRpb25zLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fZmFsbGJhY2tNYXAgPSBPYmplY3QuYXNzaWduKHRoaXMuX2ZhbGxiYWNrTWFwLCBpbml0T3B0aW9ucy5mYWxsYmFja1Jlc291cmNlcyk7XG4gICAgfVxuXG4gICAgcmVhZChsYW5ndWFnZTogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgY2FsbGJhY2s6IGkxOG4uUmVhZENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGxuZyA9IHRoaXMuX2ZhbGxiYWNrTWFwW2xhbmd1YWdlXSB8fCBsYW5ndWFnZTtcbiAgICAgICAgY29uc3QgbG9hZFBhdGggPSBpc0Z1bmN0aW9uKHRoaXMuX29wdGlvbnMubG9hZFBhdGgpID8gdGhpcy5fb3B0aW9ucy5sb2FkUGF0aChbbG5nXSwgW25hbWVzcGFjZV0pIDogdGhpcy5fb3B0aW9ucy5sb2FkUGF0aDtcbiAgICAgICAgY29uc3QgdXJsID0gdGhpcy5yZXNvbHZlVXJsKGxvYWRQYXRoIGFzIHN0cmluZywgeyBsbmcsIG5zOiBuYW1lc3BhY2UgfSk7XG4gICAgICAgIHRoaXMubG9hZFVybCh1cmwsIGNhbGxiYWNrKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIHJlc29sdmVVcmwobG9hZFBhdGg6IHN0cmluZywgZGF0YTogeyBsbmc6IHN0cmluZzsgbnM6IHN0cmluZzsgfSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b1VybCh0aGlzLl9zZXJ2aWNlcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUobG9hZFBhdGgsIGRhdGEsIHVuZGVmaW5lZCEsIHVuZGVmaW5lZCEpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvYWRVcmwodXJsOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBpMThuLkNhbGxiYWNrRXJyb3IgfCBzdHJpbmcsIGRhdGE6IGkxOG4uUmVzb3VyY2VLZXkgfCBib29sZWFuKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXF1ZXN0Lmpzb24odXJsLCB1bmRlZmluZWQsIHRoaXMuX29wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGpzb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBmYWlsZWQgbG9hZGluZzogJHt1cmx9LCAke3Jlc3VsdC5tZXNzYWdlfWA7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UgPT09IHJlc3VsdC5jb2RlICYmIHJlc3VsdC5jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXM6IG51bWJlciA9IHJlc3VsdC5jYXVzZS5zdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIGlmICg1MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDYwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgdHJ1ZSk7ICAvLyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKDQwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCBmYWxzZSk7IC8vIG5vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobXNnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgJy4vbW9kdWxlLWV4dGVuZHMnO1xuXG4vKiogQGludGVybmFsIGV4dGVuZHMgW1tET01dXSBpbnN0YW5jZSBtZXRob2QgKi9cbmZ1bmN0aW9uIGV4dGVuZChkb21PcHRpb25zOiBSZXF1aXJlZDxpMThuLkRvbUxvY2FsaXplck9wdGlvbnM+LCBpMThuZXh0OiBpMThuLmkxOG4pOiB2b2lkIHtcbiAgICBjb25zdCB7XG4gICAgICAgIHNlbGVjdG9yQXR0cixcbiAgICAgICAgdGFyZ2V0QXR0cixcbiAgICAgICAgb3B0aW9uc0F0dHIsXG4gICAgICAgIHVzZU9wdGlvbnNBdHRyLFxuICAgICAgICBwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50LFxuICAgICAgICBjdXN0b21UYWdOYW1lLFxuICAgIH0gPSBkb21PcHRpb25zO1xuXG4gICAgY29uc3QgcGFyc2UgPSAoJGVsOiBET00sIGtleTogc3RyaW5nLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGlmICgwID09PSBrZXkubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYXR0ciA9ICd0ZXh0JztcblxuICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ1snKSkge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJ10nKTtcbiAgICAgICAgICAgIGtleSAgPSBwYXJ0c1sxXTtcbiAgICAgICAgICAgIGF0dHIgPSBwYXJ0c1swXS5zdWJzdHIoMSwgcGFydHNbMF0ubGVuZ3RoIC0gMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2V5LmluZGV4T2YoJzsnKSA9PT0ga2V5Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGtleSA9IGtleS5zdWJzdHIoMCwga2V5Lmxlbmd0aCAtIDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXh0ZW5kRGVmYXVsdCA9IChvOiBQbGFpbk9iamVjdCwgdmFsOiBzdHJpbmcpOiBQbGFpbk9iamVjdCA9PiB7XG4gICAgICAgICAgICBpZiAoIXBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7IC4uLm8sIC4uLnsgZGVmYXVsdFZhbHVlOiB2YWwgfSB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFtwcmVwZW5kXS9bYXBwZW5kXSBoZWxwZXJcbiAgICAgICAgY29uc3QgaW5zZXJ0ID0gKG1ldGhvZDogJ3ByZXBlbmQnIHwgJ2FwcGVuZCcpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKTtcbiAgICAgICAgICAgIGlmIChmYWxzZSA9PT0gY3VzdG9tVGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICRlbFttZXRob2RdKHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkV2l0aFdyYXAgPSBgPCR7Y3VzdG9tVGFnTmFtZX0+JHt0cmFuc2xhdGVkfTwvJHtjdXN0b21UYWdOYW1lfT5gO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmaXJzdENoaWxkID0gJCgkZWxbMF0uZmlyc3RFbGVtZW50Q2hpbGQpIGFzIERPTTtcbiAgICAgICAgICAgICAgICBpZiAoJGZpcnN0Q2hpbGQuaXMoY3VzdG9tVGFnTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZpcnN0Q2hpbGQucmVwbGFjZVdpdGgodHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZWxbbWV0aG9kXSh0cmFuc2xhdGVkV2l0aFdyYXApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoJ2h0bWwnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwuaHRtbChpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3RleHQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwudGV4dChpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC50ZXh0KCkpKSBhcyBzdHJpbmcpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH0gZWxzZSBpZiAoJ3ByZXBlbmQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICBpbnNlcnQoJ3ByZXBlbmQnKTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdhcHBlbmQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChhdHRyLnN0YXJ0c1dpdGgoJ2RhdGEtJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGFBdHRyID0gYXR0ci5zdWJzdHIoKCdkYXRhLScpLmxlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkID0gaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuZGF0YShkYXRhQXR0cikgYXMgc3RyaW5nKSk7XG4gICAgICAgICAgICAvLyB3ZSBjaGFuZ2UgaW50byB0aGUgZGF0YSBjYWNoZVxuICAgICAgICAgICAgJGVsLmRhdGEoZGF0YUF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgLy8gd2UgY2hhbmdlIGludG8gdGhlIGRvbVxuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5hdHRyKGF0dHIpIGFzIHN0cmluZykpIGFzIHN0cmluZyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBsb2NhbGl6ZSA9ICgkZWw6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBsZXQga2V5ID0gJGVsLmF0dHIoc2VsZWN0b3JBdHRyKTtcbiAgICAgICAgaWYgKCFrZXkgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBrZXkpIHtcbiAgICAgICAgICAgIGtleSA9ICRlbC50ZXh0KCkgfHwgJGVsLnZhbCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdGFyZ2V0ID0gJGVsO1xuICAgICAgICBjb25zdCB0YXJnZXRTZWxlY3RvciA9ICRlbC5kYXRhKHRhcmdldEF0dHIpIGFzIHN0cmluZztcblxuICAgICAgICBpZiAodGFyZ2V0U2VsZWN0b3IpIHtcbiAgICAgICAgICAgIHRhcmdldCA9ICRlbC5maW5kKHRhcmdldFNlbGVjdG9yKSB8fCAkZWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdHMgJiYgdHJ1ZSA9PT0gdXNlT3B0aW9uc0F0dHIpIHtcbiAgICAgICAgICAgIG9wdHMgPSAkZWwuZGF0YShvcHRpb25zQXR0cikgYXMgb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgICAgICAgaWYgKGtleS5pbmNsdWRlcygnOycpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGsgb2Yga2V5LnNwbGl0KCc7JykpIHtcbiAgICAgICAgICAgICAgICAvLyAudHJpbSgpOiBUcmltIHRoZSBjb21tYS1zZXBhcmF0ZWQgcGFyYW1ldGVycyBvbiB0aGUgZGF0YS1pMThuIGF0dHJpYnV0ZS5cbiAgICAgICAgICAgICAgICBpZiAoJycgIT09IGspIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2UodGFyZ2V0LCBrLnRyaW0oKSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFyc2UodGFyZ2V0LCBrZXksIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHsgLi4ub3B0cyB9O1xuICAgICAgICAgICAgZGVsZXRlIGNsb25lLmxuZztcbiAgICAgICAgICAgICRlbC5kYXRhKG9wdGlvbnNBdHRyLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlKHRoaXM6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IERPTSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbnZhbGlkLXRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIC8vIGxvY2FsaXplIGVsZW1lbnQgaXRzZWxmXG4gICAgICAgICAgICBsb2NhbGl6ZSgkZWwsIG9wdHMpO1xuICAgICAgICAgICAgLy8gbG9jYWxpemUgY2hpbGRyZW5cbiAgICAgICAgICAgIGNvbnN0ICRjaGlsZHJlbiA9ICRlbC5maW5kKGBbJHtzZWxlY3RvckF0dHJ9XWApO1xuICAgICAgICAgICAgJGNoaWxkcmVuLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGxvY2FsaXplKCQoZWwpLCBvcHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBzZWxlY3RvciBmdW5jdGlvbiAkKG15U2VsZWN0b3IpLmxvY2FsaXplKG9wdHMpO1xuICAgICQuZm5bJ2xvY2FsaXplJ10gPSBoYW5kbGU7XG59XG5cbi8qKlxuICogQGVuIGBpMThuZXh0YCBET00gbG9jYWxpemVyIGJ1aWx0LWluIHBsdWdpbiBmYWN0b3J5LlxuICogQGphIGBpMThuZXh0YCBET00g44Ot44O844Kr44Op44Kk44K644OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44OV44Kh44Kv44OI44Oq44O844Oh44K944OD44OJXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBEb21Mb2NhbGl6ZXIoZG9tT3B0aW9ucz86IGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucyk6IGkxOG4uVGhpcmRQYXJ0eU1vZHVsZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJzNyZFBhcnR5JyxcbiAgICAgICAgaW5pdDogZXh0ZW5kLmJpbmQoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3JBdHRyOiAnZGF0YS1pMThuJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRBdHRyOiAnaTE4bi10YXJnZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNBdHRyOiAnaTE4bi1vcHRpb25zJyxcbiAgICAgICAgICAgICAgICB1c2VPcHRpb25zQXR0cjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjdXN0b21UYWdOYW1lOiAnY2RwLWkxOG4nLFxuICAgICAgICAgICAgfSwgZG9tT3B0aW9ucylcbiAgICAgICAgKSxcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBET00gbG9jYWxpemVyIG1ldGhvZC5cbiAqIEBqYSBET00g44Ot44O844Kr44Op44Kk44K6XG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHRyYW5zbGF0aW9uIG9wdGlvbnMuXG4gKiAgLSBgamFgIOe/u+ios+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYWxpemU8VCBleHRlbmRzIHN0cmluZyB8IE5vZGU+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgb3B0aW9ucz86IGkxOG4uVE9wdGlvbnMpOiBET01SZXN1bHQ8VD4ge1xuICAgIHJldHVybiAkKHNlbGVjdG9yKS5sb2NhbGl6ZShvcHRpb25zKSBhcyBET01SZXN1bHQ8VD47XG59XG4iLCJleHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IEkxOE5PcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IG5hdmlnYXRvciB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IEFqYXhCYWNrZW5kLCBEb21Mb2NhbGl6ZXIgfSBmcm9tICcuL3BsdWdpbic7XG5leHBvcnQgeyBsb2NhbGl6ZSB9IGZyb20gJy4vcGx1Z2luL2RvbS1sb2NhbGl6ZXInO1xuXG4vKipcbiAqIEBlbiBUcmFuc2xhdGUgZnVuY2lvbi5cbiAqIEBqYSDnv7voqLPplqLmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IHQ6IGkxOG4uVEZ1bmN0aW9uID0gaTE4bi50LmJpbmQoaTE4bik7XG5cbi8qKlxuICogQGVuIEluaXRpYWxpemUgYGkxOG5leHRgIGluc3RhbmNlLlxuICogQGphIGBpMThuZXh0YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7liJ3mnJ/ljJZcbiAqXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBpbml0IG9wdGlvbnNcbiAqICAtIGBqYWAg5Yid5pyf5YyW44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBpbml0aWFsaXplSTE4TiA9IChvcHRpb25zPzogSTE4Tk9wdGlvbnMpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgeyBuYW1lc3BhY2UsIHJlc291cmNlUGF0aDogbG9hZFBhdGgsIGRvbSB9ID0gb3B0cztcblxuICAgIGlmICghb3B0cy5sbmcpIHtcbiAgICAgICAgb3B0cy5sbmcgPSBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG4gICAgfVxuXG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAhb3B0cy5ucyAmJiAob3B0cy5ucyA9IG5hbWVzcGFjZSk7XG4gICAgICAgICFvcHRzLmRlZmF1bHROUyAmJiAob3B0cy5kZWZhdWx0TlMgPSBuYW1lc3BhY2UpO1xuICAgIH1cblxuICAgIGlmIChsb2FkUGF0aCkge1xuICAgICAgICBvcHRzLmJhY2tlbmQgPSBPYmplY3QuYXNzaWduKHsgbG9hZFBhdGggfSwgb3B0cy5iYWNrZW5kKTtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5iYWNrZW5kKSB7XG4gICAgICAgIGkxOG4udXNlKEFqYXhCYWNrZW5kKTtcbiAgICB9XG5cbiAgICBpMThuLnVzZShEb21Mb2NhbGl6ZXIoZG9tKSk7XG5cbiAgICByZXR1cm4gaTE4bi5pbml0KG9wdHMpO1xufTtcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsInRvVXJsIiwicmVxdWVzdCIsInJl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
