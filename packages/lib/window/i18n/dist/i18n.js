/*!
 * @cdp/i18n 0.9.0
 *   internationalization module
 */

(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-i18n'), require('@cdp/dom'), require('@cdp/core-utils'), require('@cdp/result'), require('@cdp/ajax'), require('@cdp/environment')) :
   typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-i18n', '@cdp/dom', '@cdp/core-utils', '@cdp/result', '@cdp/ajax', '@cdp/environment'], factory) :
   (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, extensionI18n, dom, coreUtils, result, ajax, environment) { 'use strict';

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
           let attr = 'text';
           if (key.startsWith('[')) {
               const parts = key.split(']');
               key = parts[1].trim();
               attr = parts[0].substr(1, parts[0].length - 1).trim();
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
   exports.initializeI18N = initializeI18N;
   exports.localize = localize;
   exports.t = t;

   Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwicGx1Z2luL2FqYXgtYmFja2VuZC50cyIsInBsdWdpbi9kb20tbG9jYWxpemVyLnRzIiwiY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX25hdmlnYXRvciA9IHNhZmUoZ2xvYmFsVGhpcy5uYXZpZ2F0b3IpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQge1xuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gKi9cblxuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgdG9SZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyByZXF1ZXN0IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IHRvVXJsIH0gZnJvbSAnQGNkcC9lbnZpcm9ubWVudCc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHQge1xuICAgIExPQURfUEFUSCA9ICdyZXMvbG9jYWxlcy97e25zfX0ue3tsbmd9fS5qc29uJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBGYWxsYmFja1Jlc291cmNlTWFwID0geyBbbG5nOiBzdHJpbmddOiBzdHJpbmc7IH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgYSBzaW1wbGUgYGkxOG5leHRgIGJhY2tlbmQgYnVpbHQtaW4gcGx1Z2luLiBJdCB3aWxsIGxvYWQgcmVzb3VyY2VzIGZyb20gYSBiYWNrZW5kIHNlcnZlciB1c2luZyB0aGUgYGZldGNoYCBBUEkuXG4gKiBAamEgYGZldGNoYCBBUEkg44KS55So44GE44GfIGBpMThuZXh0YCBiYWNrZW5kIOODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+OCr+ODqeOCuVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY2xhc3MgQWpheEJhY2tlbmQgaW1wbGVtZW50cyBpMThuLkJhY2tlbmRNb2R1bGU8aTE4bi5BamF4QmFja2VuZE9wdGlvbnM+IHtcbiAgICByZWFkb25seSB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHN0YXRpYyB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHByaXZhdGUgX3NlcnZpY2VzITogaTE4bi5TZXJ2aWNlcztcbiAgICBwcml2YXRlIF9vcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucyA9IHt9O1xuICAgIHByaXZhdGUgX2ZhbGxiYWNrTWFwOiBGYWxsYmFja1Jlc291cmNlTWFwID0ge307XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBpMThuLkJhY2tlbmRNb2R1bGU8QWpheEJhY2tlbmRPcHRpb25zPlxuXG4gICAgaW5pdChzZXJ2aWNlczogaTE4bi5TZXJ2aWNlcywgb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMsIGluaXRPcHRpb25zOiBJMThOT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoOiBEZWZhdWx0LkxPQURfUEFUSCB9LCB0aGlzLl9vcHRpb25zLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fZmFsbGJhY2tNYXAgPSBPYmplY3QuYXNzaWduKHRoaXMuX2ZhbGxiYWNrTWFwLCBpbml0T3B0aW9ucy5mYWxsYmFja1Jlc291cmNlcyk7XG4gICAgfVxuXG4gICAgcmVhZChsYW5ndWFnZTogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgY2FsbGJhY2s6IGkxOG4uUmVhZENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGxuZyA9IHRoaXMuX2ZhbGxiYWNrTWFwW2xhbmd1YWdlXSB8fCBsYW5ndWFnZTtcbiAgICAgICAgY29uc3QgbG9hZFBhdGggPSBpc0Z1bmN0aW9uKHRoaXMuX29wdGlvbnMubG9hZFBhdGgpID8gdGhpcy5fb3B0aW9ucy5sb2FkUGF0aChbbG5nXSwgW25hbWVzcGFjZV0pIDogdGhpcy5fb3B0aW9ucy5sb2FkUGF0aDtcbiAgICAgICAgY29uc3QgdXJsID0gdGhpcy5yZXNvbHZlVXJsKGxvYWRQYXRoIGFzIHN0cmluZywgeyBsbmcsIG5zOiBuYW1lc3BhY2UgfSk7XG4gICAgICAgIHRoaXMubG9hZFVybCh1cmwsIGNhbGxiYWNrKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIHJlc29sdmVVcmwobG9hZFBhdGg6IHN0cmluZywgZGF0YTogeyBsbmc6IHN0cmluZzsgbnM6IHN0cmluZzsgfSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b1VybCh0aGlzLl9zZXJ2aWNlcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUobG9hZFBhdGgsIGRhdGEsIHVuZGVmaW5lZCEsIHVuZGVmaW5lZCEpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvYWRVcmwodXJsOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBpMThuLkNhbGxiYWNrRXJyb3IgfCBzdHJpbmcsIGRhdGE6IGkxOG4uUmVzb3VyY2VLZXkgfCBib29sZWFuKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXF1ZXN0Lmpzb24odXJsLCB1bmRlZmluZWQsIHRoaXMuX29wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGpzb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBmYWlsZWQgbG9hZGluZzogJHt1cmx9LCAke3Jlc3VsdC5tZXNzYWdlfWA7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UgPT09IHJlc3VsdC5jb2RlICYmIHJlc3VsdC5jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXM6IG51bWJlciA9IHJlc3VsdC5jYXVzZS5zdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIGlmICg1MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDYwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgdHJ1ZSk7ICAvLyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKDQwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCBmYWxzZSk7IC8vIG5vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobXNnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET00sXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCAnLi9tb2R1bGUtZXh0ZW5kcyc7XG5cbi8qKiBAaW50ZXJuYWwgZXh0ZW5kcyBbW0RPTV1dIGluc3RhbmNlIG1ldGhvZCAqL1xuZnVuY3Rpb24gZXh0ZW5kKGRvbU9wdGlvbnM6IFJlcXVpcmVkPGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucz4sIGkxOG5leHQ6IGkxOG4uaTE4bik6IHZvaWQge1xuICAgIGNvbnN0IHtcbiAgICAgICAgc2VsZWN0b3JBdHRyLFxuICAgICAgICB0YXJnZXRBdHRyLFxuICAgICAgICBvcHRpb25zQXR0cixcbiAgICAgICAgdXNlT3B0aW9uc0F0dHIsXG4gICAgICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQsXG4gICAgICAgIGN1c3RvbVRhZ05hbWUsXG4gICAgfSA9IGRvbU9wdGlvbnM7XG5cbiAgICBjb25zdCBwYXJzZSA9ICgkZWw6IERPTSwga2V5OiBzdHJpbmcsIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgbGV0IGF0dHIgPSAndGV4dCc7XG5cbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCddJyk7XG4gICAgICAgICAgICBrZXkgID0gcGFydHNbMV0udHJpbSgpO1xuICAgICAgICAgICAgYXR0ciA9IHBhcnRzWzBdLnN1YnN0cigxLCBwYXJ0c1swXS5sZW5ndGggLSAxKS50cmltKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleHRlbmREZWZhdWx0ID0gKG86IFBsYWluT2JqZWN0LCB2YWw6IHN0cmluZyk6IFBsYWluT2JqZWN0ID0+IHtcbiAgICAgICAgICAgIGlmICghcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgLi4ubywgLi4ueyBkZWZhdWx0VmFsdWU6IHZhbCB9IH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gW3ByZXBlbmRdL1thcHBlbmRdIGhlbHBlclxuICAgICAgICBjb25zdCBpbnNlcnQgPSAobWV0aG9kOiAncHJlcGVuZCcgfCAnYXBwZW5kJyk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmh0bWwoKSkpO1xuICAgICAgICAgICAgaWYgKGZhbHNlID09PSBjdXN0b21UYWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWRXaXRoV3JhcCA9IGA8JHtjdXN0b21UYWdOYW1lfT4ke3RyYW5zbGF0ZWR9PC8ke2N1c3RvbVRhZ05hbWV9PmA7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZpcnN0Q2hpbGQgPSAkKCRlbFswXS5maXJzdEVsZW1lbnRDaGlsZCkgYXMgRE9NO1xuICAgICAgICAgICAgICAgIGlmICgkZmlyc3RDaGlsZC5pcyhjdXN0b21UYWdOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAkZmlyc3RDaGlsZC5yZXBsYWNlV2l0aCh0cmFuc2xhdGVkV2l0aFdyYXApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRlbFttZXRob2RdKHRyYW5zbGF0ZWRXaXRoV3JhcCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICgnaHRtbCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgICRlbC5odG1sKGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmh0bWwoKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmICgndGV4dCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgICRlbC50ZXh0KGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLnRleHQoKSkpIGFzIHN0cmluZyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfSBlbHNlIGlmICgncHJlcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgncHJlcGVuZCcpO1xuICAgICAgICB9IGVsc2UgaWYgKCdhcHBlbmQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICBpbnNlcnQoJ2FwcGVuZCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGF0dHIuc3RhcnRzV2l0aCgnZGF0YS0nKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YUF0dHIgPSBhdHRyLnN1YnN0cigoJ2RhdGEtJykubGVuZ3RoKTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5kYXRhKGRhdGFBdHRyKSBhcyBzdHJpbmcpKTtcbiAgICAgICAgICAgICRlbC5kYXRhKGRhdGFBdHRyLCB0cmFuc2xhdGVkKTtcbiAgICAgICAgICAgICRlbC5hdHRyKGF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuYXR0cihhdHRyKSBhcyBzdHJpbmcpKSBhcyBzdHJpbmcpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgbG9jYWxpemUgPSAoJGVsOiBET00sIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3Qga2V5ID0gJGVsLmF0dHIoc2VsZWN0b3JBdHRyKTtcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCAkdGFyZ2V0ID0gJGVsO1xuICAgICAgICBjb25zdCB0YXJnZXRTZWxlY3RvciA9ICRlbC5kYXRhKHRhcmdldEF0dHIpIGFzIHN0cmluZztcblxuICAgICAgICBpZiAodGFyZ2V0U2VsZWN0b3IpIHtcbiAgICAgICAgICAgICR0YXJnZXQgPSAkZWwuZmluZCh0YXJnZXRTZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdHMgJiYgdHJ1ZSA9PT0gdXNlT3B0aW9uc0F0dHIpIHtcbiAgICAgICAgICAgIG9wdHMgPSAkZWwuZGF0YShvcHRpb25zQXR0cikgYXMgb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIGtleS5zcGxpdCgnOycpKSB7XG4gICAgICAgICAgICBjb25zdCBrID0gcGFydC50cmltKCk7XG4gICAgICAgICAgICBpZiAoJycgIT09IGspIHtcbiAgICAgICAgICAgICAgICBwYXJzZSgkdGFyZ2V0LCBrLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0cnVlID09PSB1c2VPcHRpb25zQXR0cikge1xuICAgICAgICAgICAgY29uc3QgY2xvbmUgPSB7IC4uLm9wdHMgfTtcbiAgICAgICAgICAgIGRlbGV0ZSBjbG9uZS5sbmc7XG4gICAgICAgICAgICAkZWwuZGF0YShvcHRpb25zQXR0ciwgY2xvbmUpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZSh0aGlzOiBET00sIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiBET00ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8taW52YWxpZC10aGlzXG4gICAgICAgIHJldHVybiB0aGlzLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICAvLyBsb2NhbGl6ZSBlbGVtZW50IGl0c2VsZlxuICAgICAgICAgICAgbG9jYWxpemUoJGVsLCBvcHRzKTtcbiAgICAgICAgICAgIC8vIGxvY2FsaXplIGNoaWxkcmVuXG4gICAgICAgICAgICBjb25zdCAkY2hpbGRyZW4gPSAkZWwuZmluZChgWyR7c2VsZWN0b3JBdHRyfV1gKTtcbiAgICAgICAgICAgICRjaGlsZHJlbi5lYWNoKChpbmRleDogbnVtYmVyLCBlbDogSFRNTEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkKGVsKSwgb3B0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gc2VsZWN0b3IgZnVuY3Rpb24gJChteVNlbGVjdG9yKS5sb2NhbGl6ZShvcHRzKTtcbiAgICAkLmZuWydsb2NhbGl6ZSddID0gaGFuZGxlO1xufVxuXG4vKipcbiAqIEBlbiBgaTE4bmV4dGAgRE9NIGxvY2FsaXplciBidWlsdC1pbiBwbHVnaW4gZmFjdG9yeS5cbiAqIEBqYSBgaTE4bmV4dGAgRE9NIOODreODvOOCq+ODqeOCpOOCuuODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+ODleOCoeOCr+ODiOODquODvOODoeOCveODg+ODiVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gRG9tTG9jYWxpemVyKGRvbU9wdGlvbnM/OiBpMThuLkRvbUxvY2FsaXplck9wdGlvbnMpOiBpMThuLlRoaXJkUGFydHlNb2R1bGUge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICczcmRQYXJ0eScsXG4gICAgICAgIGluaXQ6IGV4dGVuZC5iaW5kKFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yQXR0cjogJ2RhdGEtaTE4bicsXG4gICAgICAgICAgICAgICAgdGFyZ2V0QXR0cjogJ2kxOG4tdGFyZ2V0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25zQXR0cjogJ2kxOG4tb3B0aW9ucycsXG4gICAgICAgICAgICAgICAgdXNlT3B0aW9uc0F0dHI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY3VzdG9tVGFnTmFtZTogJ2NkcC1pMThuJyxcbiAgICAgICAgICAgIH0sIGRvbU9wdGlvbnMpXG4gICAgICAgICksXG4gICAgfTtcbn1cbiIsImV4cG9ydCAqIGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IEkxOE5PcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IG5hdmlnYXRvciB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IEFqYXhCYWNrZW5kLCBEb21Mb2NhbGl6ZXIgfSBmcm9tICcuL3BsdWdpbic7XG5cbi8qKlxuICogQGVuIFRyYW5zbGF0ZSBmdW5jaW9uLlxuICogQGphIOe/u+ios+mWouaVsFxuICovXG5leHBvcnQgY29uc3QgdDogaTE4bi5URnVuY3Rpb24gPSBpMThuLnQuYmluZChpMThuKTtcblxuLyoqXG4gKiBAZW4gSW5pdGlhbGl6ZSBgaTE4bmV4dGAgaW5zdGFuY2UuXG4gKiBAamEgYGkxOG5leHRgIOOCpOODs+OCueOCv+ODs+OCueOBruWIneacn+WMllxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVJMThOID0gKG9wdGlvbnM/OiBJMThOT3B0aW9ucyk6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCB7IG5hbWVzcGFjZSwgcmVzb3VyY2VQYXRoOiBsb2FkUGF0aCwgZG9tIH0gPSBvcHRzO1xuXG4gICAgaWYgKCFvcHRzLmxuZykge1xuICAgICAgICBvcHRzLmxuZyA9IG5hdmlnYXRvci5sYW5ndWFnZTtcbiAgICB9XG5cbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgICFvcHRzLm5zICYmIChvcHRzLm5zID0gbmFtZXNwYWNlKTtcbiAgICAgICAgIW9wdHMuZGVmYXVsdE5TICYmIChvcHRzLmRlZmF1bHROUyA9IG5hbWVzcGFjZSk7XG4gICAgfVxuXG4gICAgaWYgKGxvYWRQYXRoKSB7XG4gICAgICAgIG9wdHMuYmFja2VuZCA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aCB9LCBvcHRzLmJhY2tlbmQpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLmJhY2tlbmQpIHtcbiAgICAgICAgaTE4bi51c2UoQWpheEJhY2tlbmQpO1xuICAgIH1cblxuICAgIGkxOG4udXNlKERvbUxvY2FsaXplcihkb20pKTtcblxuICAgIHJldHVybiBpMThuLmluaXQob3B0cyk7XG59O1xuXG4vKipcbiAqIEBlbiBET00gbG9jYWxpemVyIG1ldGhvZC5cbiAqIEBqYSBET00g44Ot44O844Kr44Op44Kk44K6XG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHRyYW5zbGF0aW9uIG9wdGlvbnMuXG4gKiAgLSBgamFgIOe/u+ios+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgbG9jYWxpemUgPSA8VCBleHRlbmRzIHN0cmluZyB8IE5vZGU+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgb3B0aW9ucz86IGkxOG4uVE9wdGlvbnMpOiBET01SZXN1bHQ8VD4gPT4ge1xuICAgIHJldHVybiAkKHNlbGVjdG9yKS5sb2NhbGl6ZShvcHRpb25zKSBhcyBET01SZXN1bHQ8VD47XG59O1xuIl0sIm5hbWVzIjpbInNhZmUiLCJpc0Z1bmN0aW9uIiwidG9VcmwiLCJyZXF1ZXN0IiwicmVzdWx0IiwidG9SZXN1bHQiLCJSRVNVTFRfQ09ERSIsIiQiLCJpMThuIiwibmF2aWdhdG9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztHQUVBO0dBQ0EsTUFBTSxVQUFVLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDOztHQ0g3Qzs7O0FBS0EsR0FjQTtHQUVBOzs7Ozs7QUFNQSxTQUFhLFdBQVc7T0FBeEI7V0FDYSxTQUFJLEdBQUcsU0FBUyxDQUFDO1dBR2xCLGFBQVEsR0FBNEIsRUFBRSxDQUFDO1dBQ3ZDLGlCQUFZLEdBQXdCLEVBQUUsQ0FBQztRQTZDbEQ7OztPQXhDRyxJQUFJLENBQUMsUUFBdUIsRUFBRSxPQUFnQyxFQUFFLFdBQXdCO1dBQ3BGLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1dBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEscURBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztXQUN2RixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FB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
