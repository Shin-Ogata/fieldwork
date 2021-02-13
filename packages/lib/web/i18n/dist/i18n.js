/*!
 * @cdp/i18n 0.9.5
 *   internationalization module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-i18n'), require('@cdp/result'), require('@cdp/dom'), require('@cdp/core-utils'), require('@cdp/ajax'), require('@cdp/environment')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-i18n', '@cdp/result', '@cdp/dom', '@cdp/core-utils', '@cdp/ajax', '@cdp/environment'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, extensionI18n, result, dom, coreUtils, ajax, environment) { 'use strict';

    /* eslint-disable
        @typescript-eslint/no-namespace
     ,  @typescript-eslint/no-unused-vars
     ,  @typescript-eslint/restrict-plus-operands
     */
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

    /** @internal */ const _navigator = coreUtils.safe(globalThis.navigator);

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
            void (async () => {
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
                $el.text(i18next.t(key, extendDefault(opts, $el.text())));
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
                $el.attr(attr, i18next.t(key, extendDefault(opts, $el.attr(attr))));
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
            void extensionI18n.i18n.init(opts, (error, translator) => {
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
            void extensionI18n.i18n.changeLanguage(lng, (error, translator) => {
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

    exports.changeLanguage = changeLanguage;
    exports.getLanguage = getLanguage;
    exports.getLanguageList = getLanguageList;
    exports.initializeI18N = initializeI18N;
    exports.localize = localize;
    exports.t = t;
    Object.keys(extensionI18n).forEach(function (k) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () {
                return extensionI18n[k];
            }
        });
    });

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHNcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX25hdmlnYXRvciA9IHNhZmUoZ2xvYmFsVGhpcy5uYXZpZ2F0b3IpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQge1xuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICovXG5cbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIHRvUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgeyB0b1VybCB9IGZyb20gJ0BjZHAvZW52aXJvbm1lbnQnO1xuaW1wb3J0IHsgSTE4Tk9wdGlvbnMgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZWZhdWx0IHtcbiAgICBMT0FEX1BBVEggPSAncmVzL2xvY2FsZXMve3tuc319Lnt7bG5nfX0uanNvbicsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBGYWxsYmFja1Jlc291cmNlTWFwID0geyBbbG5nOiBzdHJpbmddOiBzdHJpbmc7IH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgYSBzaW1wbGUgYGkxOG5leHRgIGJhY2tlbmQgYnVpbHQtaW4gcGx1Z2luLiBJdCB3aWxsIGxvYWQgcmVzb3VyY2VzIGZyb20gYSBiYWNrZW5kIHNlcnZlciB1c2luZyB0aGUgYGZldGNoYCBBUEkuXG4gKiBAamEgYGZldGNoYCBBUEkg44KS55So44GE44GfIGBpMThuZXh0YCBiYWNrZW5kIOODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+OCr+ODqeOCuVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY2xhc3MgQWpheEJhY2tlbmQgaW1wbGVtZW50cyBpMThuLkJhY2tlbmRNb2R1bGU8aTE4bi5BamF4QmFja2VuZE9wdGlvbnM+IHtcbiAgICByZWFkb25seSB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHN0YXRpYyB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHByaXZhdGUgX3NlcnZpY2VzITogaTE4bi5TZXJ2aWNlcztcbiAgICBwcml2YXRlIF9vcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucyA9IHt9O1xuICAgIHByaXZhdGUgX2ZhbGxiYWNrTWFwOiBGYWxsYmFja1Jlc291cmNlTWFwID0ge307XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBpMThuLkJhY2tlbmRNb2R1bGU8QWpheEJhY2tlbmRPcHRpb25zPlxuXG4gICAgaW5pdChzZXJ2aWNlczogaTE4bi5TZXJ2aWNlcywgb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMsIGluaXRPcHRpb25zOiBJMThOT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoOiBEZWZhdWx0LkxPQURfUEFUSCB9LCB0aGlzLl9vcHRpb25zLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fZmFsbGJhY2tNYXAgPSBPYmplY3QuYXNzaWduKHRoaXMuX2ZhbGxiYWNrTWFwLCBpbml0T3B0aW9ucy5mYWxsYmFja1Jlc291cmNlcyk7XG4gICAgfVxuXG4gICAgcmVhZChsYW5ndWFnZTogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgY2FsbGJhY2s6IGkxOG4uUmVhZENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGxuZyA9IHRoaXMuX2ZhbGxiYWNrTWFwW2xhbmd1YWdlXSB8fCBsYW5ndWFnZTtcbiAgICAgICAgY29uc3QgbG9hZFBhdGggPSBpc0Z1bmN0aW9uKHRoaXMuX29wdGlvbnMubG9hZFBhdGgpID8gdGhpcy5fb3B0aW9ucy5sb2FkUGF0aChbbG5nXSwgW25hbWVzcGFjZV0pIDogdGhpcy5fb3B0aW9ucy5sb2FkUGF0aDtcbiAgICAgICAgY29uc3QgdXJsID0gdGhpcy5yZXNvbHZlVXJsKGxvYWRQYXRoIGFzIHN0cmluZywgeyBsbmcsIG5zOiBuYW1lc3BhY2UgfSk7XG4gICAgICAgIHRoaXMubG9hZFVybCh1cmwsIGNhbGxiYWNrKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIHJlc29sdmVVcmwobG9hZFBhdGg6IHN0cmluZywgZGF0YTogeyBsbmc6IHN0cmluZzsgbnM6IHN0cmluZzsgfSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b1VybCh0aGlzLl9zZXJ2aWNlcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUobG9hZFBhdGgsIGRhdGEsIHVuZGVmaW5lZCEsIHVuZGVmaW5lZCEpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvYWRVcmwodXJsOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBpMThuLkNhbGxiYWNrRXJyb3IgfCBzdHJpbmcsIGRhdGE6IGkxOG4uUmVzb3VyY2VLZXkgfCBib29sZWFuKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcXVlc3QuanNvbih1cmwsIHVuZGVmaW5lZCwgdGhpcy5fb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwganNvbik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYGZhaWxlZCBsb2FkaW5nOiAke3VybH0sICR7cmVzdWx0Lm1lc3NhZ2V9YDtcbiAgICAgICAgICAgICAgICBpZiAoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSA9PT0gcmVzdWx0LmNvZGUgJiYgcmVzdWx0LmNhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1czogbnVtYmVyID0gcmVzdWx0LmNhdXNlLnN0YXR1cztcbiAgICAgICAgICAgICAgICAgICAgaWYgKDUwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNjAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCB0cnVlKTsgIC8vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoNDAwIDw9IHN0YXR1cyAmJiBzdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2csIGZhbHNlKTsgLy8gbm8gcmV0cnlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhtc2csIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGRvbSBhcyAkLFxuICAgIERPTSxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0ICcuL21vZHVsZS1leHRlbmRzJztcblxuLyoqIEBpbnRlcm5hbCBleHRlbmRzIFtbRE9NXV0gaW5zdGFuY2UgbWV0aG9kICovXG5mdW5jdGlvbiBleHRlbmQoZG9tT3B0aW9uczogUmVxdWlyZWQ8aTE4bi5Eb21Mb2NhbGl6ZXJPcHRpb25zPiwgaTE4bmV4dDogaTE4bi5pMThuKTogdm9pZCB7XG4gICAgY29uc3Qge1xuICAgICAgICBzZWxlY3RvckF0dHIsXG4gICAgICAgIHRhcmdldEF0dHIsXG4gICAgICAgIG9wdGlvbnNBdHRyLFxuICAgICAgICB1c2VPcHRpb25zQXR0cixcbiAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudCxcbiAgICAgICAgY3VzdG9tVGFnTmFtZSxcbiAgICB9ID0gZG9tT3B0aW9ucztcblxuICAgIGNvbnN0IGV4dGVuZERlZmF1bHQgPSAobzogUGxhaW5PYmplY3QsIHZhbDogc3RyaW5nKTogUGxhaW5PYmplY3QgPT4ge1xuICAgICAgICBpZiAoIXBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IC4uLm8sIC4uLnsgZGVmYXVsdFZhbHVlOiB2YWwgfSB9O1xuICAgIH07XG5cbiAgICAvLyBbcHJlcGVuZF0vW2FwcGVuZF0gaGVscGVyXG4gICAgY29uc3QgaW5zZXJ0ID0gKG1ldGhvZDogJ3ByZXBlbmQnIHwgJ2FwcGVuZCcsICRlbDogRE9NLCBrZXk6IHN0cmluZywgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCB0cmFuc2xhdGVkID0gaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuaHRtbCgpKSk7XG4gICAgICAgIGlmIChmYWxzZSA9PT0gY3VzdG9tVGFnTmFtZSkge1xuICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkV2l0aFdyYXAgPSBgPCR7Y3VzdG9tVGFnTmFtZX0+JHt0cmFuc2xhdGVkfTwvJHtjdXN0b21UYWdOYW1lfT5gO1xuICAgICAgICAgICAgY29uc3QgJGZpcnN0Q2hpbGQgPSAkKCRlbFswXS5maXJzdEVsZW1lbnRDaGlsZCkgYXMgRE9NO1xuICAgICAgICAgICAgaWYgKCRmaXJzdENoaWxkLmlzKGN1c3RvbVRhZ05hbWUpKSB7XG4gICAgICAgICAgICAgICAgJGZpcnN0Q2hpbGQucmVwbGFjZVdpdGgodHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBwYXJzZSA9ICgkZWw6IERPTSwga2V5OiBzdHJpbmcsIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgbGV0IGF0dHIgPSAndGV4dCc7XG5cbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCddJyk7XG4gICAgICAgICAgICBrZXkgID0gcGFydHNbMV0udHJpbSgpO1xuICAgICAgICAgICAgYXR0ciA9IHBhcnRzWzBdLnN1YnN0cigxLCBwYXJ0c1swXS5sZW5ndGggLSAxKS50cmltKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2h0bWwnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwuaHRtbChpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3RleHQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwudGV4dChpMThuZXh0LnQ8c3RyaW5nPihrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLnRleHQoKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmICgncHJlcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgncHJlcGVuZCcsICRlbCwga2V5LCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdhcHBlbmQnLCAkZWwsIGtleSwgb3B0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXR0ci5zdGFydHNXaXRoKCdkYXRhLScpKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhQXR0ciA9IGF0dHIuc3Vic3RyKCgnZGF0YS0nKS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmRhdGEoZGF0YUF0dHIpIGFzIHN0cmluZykpO1xuICAgICAgICAgICAgJGVsLmRhdGEoZGF0YUF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCBpMThuZXh0LnQ8c3RyaW5nPihrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmF0dHIoYXR0cikgYXMgc3RyaW5nKSkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGxvY2FsaXplID0gKCRlbDogRE9NLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9ICRlbC5hdHRyKHNlbGVjdG9yQXR0cik7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgJHRhcmdldCA9ICRlbDtcbiAgICAgICAgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSAkZWwuZGF0YSh0YXJnZXRBdHRyKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKHRhcmdldFNlbGVjdG9yKSB7XG4gICAgICAgICAgICAkdGFyZ2V0ID0gJGVsLmZpbmQodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRzICYmIHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBvcHRzID0gJGVsLmRhdGEob3B0aW9uc0F0dHIpIGFzIGkxOG4uVE9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2Yga2V5LnNwbGl0KCc7JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGsgPSBwYXJ0LnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgnJyAhPT0gaykge1xuICAgICAgICAgICAgICAgIHBhcnNlKCR0YXJnZXQsIGssIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHsgLi4ub3B0cyB9O1xuICAgICAgICAgICAgZGVsZXRlIGNsb25lLmxuZztcbiAgICAgICAgICAgICRlbC5kYXRhKG9wdGlvbnNBdHRyLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlKHRoaXM6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IERPTSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbnZhbGlkLXRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIC8vIGxvY2FsaXplIGVsZW1lbnQgaXRzZWxmXG4gICAgICAgICAgICBsb2NhbGl6ZSgkZWwsIG9wdHMpO1xuICAgICAgICAgICAgLy8gbG9jYWxpemUgY2hpbGRyZW5cbiAgICAgICAgICAgIGNvbnN0ICRjaGlsZHJlbiA9ICRlbC5maW5kKGBbJHtzZWxlY3RvckF0dHJ9XWApO1xuICAgICAgICAgICAgJGNoaWxkcmVuLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGxvY2FsaXplKCQoZWwpLCBvcHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBzZWxlY3RvciBmdW5jdGlvbiAkKG15U2VsZWN0b3IpLmxvY2FsaXplKG9wdHMpO1xuICAgICQuZm5bJ2xvY2FsaXplJ10gPSBoYW5kbGU7XG59XG5cbi8qKlxuICogQGVuIGBpMThuZXh0YCBET00gbG9jYWxpemVyIGJ1aWx0LWluIHBsdWdpbiBmYWN0b3J5LlxuICogQGphIGBpMThuZXh0YCBET00g44Ot44O844Kr44Op44Kk44K644OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44OV44Kh44Kv44OI44Oq44O844Oh44K944OD44OJXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBEb21Mb2NhbGl6ZXIoZG9tT3B0aW9ucz86IGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucyk6IGkxOG4uVGhpcmRQYXJ0eU1vZHVsZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJzNyZFBhcnR5JyxcbiAgICAgICAgaW5pdDogZXh0ZW5kLmJpbmQoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3JBdHRyOiAnZGF0YS1pMThuJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRBdHRyOiAnaTE4bi10YXJnZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNBdHRyOiAnaTE4bi1vcHRpb25zJyxcbiAgICAgICAgICAgICAgICB1c2VPcHRpb25zQXR0cjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjdXN0b21UYWdOYW1lOiAnY2RwLWkxOG4nLFxuICAgICAgICAgICAgfSwgZG9tT3B0aW9ucylcbiAgICAgICAgKSxcbiAgICB9O1xufVxuIiwiZXhwb3J0ICogZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucywgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IG5hdmlnYXRvciB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IEFqYXhCYWNrZW5kLCBEb21Mb2NhbGl6ZXIgfSBmcm9tICcuL3BsdWdpbic7XG5cbi8qKlxuICogQGVuIFRyYW5zbGF0ZSBmdW5jaW9uLlxuICogQGphIOe/u+ios+mWouaVsFxuICovXG5leHBvcnQgY29uc3QgdDogaTE4bi5URnVuY3Rpb24gPSBpMThuLnQuYmluZChpMThuKTtcblxuLyoqXG4gKiBAZW4gSW5pdGlhbGl6ZSBgaTE4bmV4dGAgaW5zdGFuY2UuXG4gKiBAamEgYGkxOG5leHRgIOOCpOODs+OCueOCv+ODs+OCueOBruWIneacn+WMllxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVJMThOID0gKG9wdGlvbnM/OiBJMThOT3B0aW9ucyk6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG5vVGhyb3c6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCB7IG5hbWVzcGFjZSwgcmVzb3VyY2VQYXRoOiBsb2FkUGF0aCwgZG9tLCBub1Rocm93IH0gPSBvcHRzO1xuXG4gICAgaWYgKCFvcHRzLmxuZykge1xuICAgICAgICBvcHRzLmxuZyA9IG5hdmlnYXRvci5sYW5ndWFnZTtcbiAgICB9XG5cbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgICFvcHRzLm5zICYmIChvcHRzLm5zID0gbmFtZXNwYWNlKTtcbiAgICAgICAgIW9wdHMuZGVmYXVsdE5TICYmIChvcHRzLmRlZmF1bHROUyA9IG5hbWVzcGFjZSk7XG4gICAgfVxuXG4gICAgaWYgKGxvYWRQYXRoKSB7XG4gICAgICAgIG9wdHMuYmFja2VuZCA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aCB9LCBvcHRzLmJhY2tlbmQpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLmJhY2tlbmQpIHtcbiAgICAgICAgaTE4bi51c2UoQWpheEJhY2tlbmQpO1xuICAgIH1cblxuICAgIGkxOG4udXNlKERvbUxvY2FsaXplcihkb20pKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZvaWQgaTE4bi5pbml0KG9wdHMsIChlcnJvciwgdHJhbnNsYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9JMThOX0NPUkVfTEFZRVIsICdpMThuI2luaXQoKSBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXN1bHQubWVzc2FnZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cmFuc2xhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgZGV0ZWN0ZWQgb3Igc2V0IGxhbmd1YWdlLlxuICogQGphIOePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+iogOiqnuOCkuWPluW+l1xuICpcbiAqIEByZXR1cm5zIGBqYS1KUGAsIGBqYWBcbiAqL1xuZXhwb3J0IGNvbnN0IGdldExhbmd1YWdlID0gKCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGkxOG4ubGFuZ3VhZ2UgfHwgbmF2aWdhdG9yLmxhbmd1YWdlO1xufTtcblxuLyoqXG4gKiBAZW4gR2V0IGFuIGFycmF5IG9mIGBsYW5ndWFnZS1jb2Rlc2AgdGhhdCB3aWxsIGJlIHVzZWQgaXQgb3JkZXIgdG8gbG9va3VwIHRoZSB0cmFuc2xhdGlvbiB2YWx1ZS5cbiAqIEBqYSDnv7voqLPjga7mpJzntKLjgavkvb/nlKjjgZXjgozjgosgYGxhbmd1YWdlLWNvZGVzYCDjg6rjgrnjg4jjgpLlj5blvpdcbiAqXG4gKiBAc2VlXG4gKiAgLSBodHRwczovL3d3dy5pMThuZXh0LmNvbS9vdmVydmlldy9hcGkjbGFuZ3VhZ2VzXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRMYW5ndWFnZUxpc3QgPSAoKTogc3RyaW5nW10gPT4ge1xuICAgIHJldHVybiBpMThuLmxhbmd1YWdlcyB8fCBbbmF2aWdhdG9yLmxhbmd1YWdlXTtcbn07XG5cbi8qKlxuICogQGVuIENoYW5nZXMgdGhlIGxhbmd1YWdlLlxuICogQGphIOiogOiqnuOBruWIh+OCiuabv+OBiFxuICovXG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSAobG5nOiBzdHJpbmcsIG9wdGlvbnM/OiBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBub1Rocm93OiB0cnVlIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZvaWQgaTE4bi5jaGFuZ2VMYW5ndWFnZShsbmcsIChlcnJvciwgdHJhbnNsYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9JMThOX0NPUkVfTEFZRVIsICdpMThuI2NoYW5nZUxhbmd1YXRlKCkgZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBpZiAob3B0cy5ub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXN1bHQubWVzc2FnZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cmFuc2xhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBET00gbG9jYWxpemVyIG1ldGhvZC5cbiAqIEBqYSBET00g44Ot44O844Kr44Op44Kk44K6XG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHRyYW5zbGF0aW9uIG9wdGlvbnMuXG4gKiAgLSBgamFgIOe/u+ios+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgbG9jYWxpemUgPSA8VCBleHRlbmRzIHN0cmluZyB8IE5vZGU+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgb3B0aW9ucz86IGkxOG4uVE9wdGlvbnMpOiBET01SZXN1bHQ8VD4gPT4ge1xuICAgIHJldHVybiAkKHNlbGVjdG9yKS5sb2NhbGl6ZShvcHRpb25zKSBhcyBET01SZXN1bHQ8VD47XG59O1xuIl0sIm5hbWVzIjpbInNhZmUiLCJpc0Z1bmN0aW9uIiwidG9VcmwiLCJyZXF1ZXN0IiwicmVzdWx0IiwidG9SZXN1bHQiLCJSRVNVTFRfQ09ERSIsIiQiLCJpMThuIiwibmF2aWdhdG9yIiwibWFrZVJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7SUFNQTs7Ozs7UUFVSTtRQUFBO1lBQ0ksNEVBQTBDLENBQUE7WUFDMUMsbURBQXdCLFlBQUEsa0JBQWtCLGdCQUF1QixnQkFBdUIsQ0FBQyxFQUFFLGVBQWUsQ0FBQywyQkFBQSxDQUFBO1NBQzlHLElBQUE7SUFDTCxDQUFDOztJQ2xCRCxpQkFBaUIsTUFBTSxVQUFVLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDOztJQ0Y5RDs7O0lBa0JBO0lBRUE7Ozs7OztVQU1hLFdBQVc7UUFBeEI7WUFDYSxTQUFJLEdBQUcsU0FBUyxDQUFDO1lBR2xCLGFBQVEsR0FBNEIsRUFBRSxDQUFDO1lBQ3ZDLGlCQUFZLEdBQXdCLEVBQUUsQ0FBQztTQTZDbEQ7OztRQXhDRyxJQUFJLENBQUMsUUFBdUIsRUFBRSxPQUFnQyxFQUFFLFdBQXdCO1lBQ3BGLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1lBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEscURBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN2RixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUN2RjtRQUVELElBQUksQ0FBQyxRQUFnQixFQUFFLFNB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
