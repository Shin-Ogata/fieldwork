/*!
 * @cdp/i18n 0.9.18
 *   internationalization module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-i18n'), require('@cdp/result'), require('@cdp/dom'), require('@cdp/core-utils'), require('@cdp/ajax'), require('@cdp/web-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-i18n', '@cdp/result', '@cdp/dom', '@cdp/core-utils', '@cdp/ajax', '@cdp/web-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, extensionI18n, result, dom, coreUtils, ajax, webUtils) { 'use strict';

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
            RESULT_CODE[RESULT_CODE["I18N_DECLARE"] = 9007199254740991] = "I18N_DECLARE";
            RESULT_CODE[RESULT_CODE["ERROR_I18N_CORE_LAYER"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 40 /* LOCAL_CODE_BASE.I18N */ + 1, 'i18next error')] = "ERROR_I18N_CORE_LAYER";
        })();
    })();

    /** @internal */ const navigator = coreUtils.safe(globalThis.navigator);

    //__________________________________________________________________________________________________//
    /**
     * @en The class a simple `i18next` backend built-in plugin. It will load resources from a backend server using the `fetch` API.
     * @ja `fetch` API を用いた `i18next` backend ビルトインプラグインクラス
     *
     * @internal
     */
    class AjaxBackend {
        type = 'backend';
        static type = 'backend';
        _services;
        _options = {};
        _fallbackMap = {};
        ///////////////////////////////////////////////////////////////////////
        // implements: i18n.BackendModule<AjaxBackendOptions>
        init(services, options, initOptions) {
            this._services = services;
            this._options = Object.assign({ loadPath: "res/locales/{{ns}}.{{lng}}.json" /* Default.LOAD_PATH */ }, this._options, options);
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
            return webUtils.toUrl(this._services.interpolator.interpolate(loadPath, data, undefined, undefined));
        }
        loadUrl(url, callback) {
            void (async () => {
                try {
                    const json = await ajax.request.json(url, this._options);
                    callback(null, json);
                }
                catch (e) {
                    const result$1 = result.toResult(e);
                    const msg = `failed loading: ${url}, ${result$1.message}`;
                    if (result.RESULT_CODE.ERROR_AJAX_RESPONSE === result$1.code && result$1.cause) {
                        const { status } = result$1.cause;
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

    /** @internal extends {@link DOM} instance method */
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
                const $target = $el.children(customTagName);
                if ($target.length) {
                    $target.replaceWith(translatedWithWrap);
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
                attr = parts[0].substring(1, parts[0].length).trim();
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
                const dataAttr = attr.substring(('data-').length);
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
                for (const root of dom.dom.utils.rootify(el)) {
                    const $el = dom.dom(root);
                    // localize element itself
                    localize($el, opts);
                    // localize children
                    const $children = $el.find(`[${selectorAttr}]`);
                    $children.each((index, el) => {
                        localize(dom.dom(el), opts);
                    });
                }
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
            opts.lng = navigator.language;
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
        return extensionI18n.i18n.language || navigator.language;
    };
    /**
     * @en Get an array of `language-codes` that will be used it order to lookup the translation value.
     * @ja 翻訳の検索に使用される `language-codes` リストを取得
     *
     * @see
     *  - https://www.i18next.com/overview/api#languages
     */
    const getLanguageList = () => {
        return extensionI18n.i18n.languages || [navigator.language];
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
     *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
     *  - `ja` {@link DOM} のもとになるオブジェクト(群)またはセレクタ文字列
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
        if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionI18n[k]; }
        });
    });

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBuYXZpZ2F0b3IgPSBzYWZlKGdsb2JhbFRoaXMubmF2aWdhdG9yKTtcbiIsImltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIHRvUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgeyB0b1VybCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IEkxOE5PcHRpb25zIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVmYXVsdCB7XG4gICAgTE9BRF9QQVRIID0gJ3Jlcy9sb2NhbGVzL3t7bnN9fS57e2xuZ319Lmpzb24nLFxufVxuXG4vKiogQGludGVybmFsICovIHR5cGUgRmFsbGJhY2tSZXNvdXJjZU1hcCA9IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgYSBzaW1wbGUgYGkxOG5leHRgIGJhY2tlbmQgYnVpbHQtaW4gcGx1Z2luLiBJdCB3aWxsIGxvYWQgcmVzb3VyY2VzIGZyb20gYSBiYWNrZW5kIHNlcnZlciB1c2luZyB0aGUgYGZldGNoYCBBUEkuXG4gKiBAamEgYGZldGNoYCBBUEkg44KS55So44GE44GfIGBpMThuZXh0YCBiYWNrZW5kIOODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+OCr+ODqeOCuVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY2xhc3MgQWpheEJhY2tlbmQgaW1wbGVtZW50cyBpMThuLkJhY2tlbmRNb2R1bGU8aTE4bi5BamF4QmFja2VuZE9wdGlvbnM+IHtcbiAgICByZWFkb25seSB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHN0YXRpYyB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHByaXZhdGUgX3NlcnZpY2VzITogaTE4bi5TZXJ2aWNlcztcbiAgICBwcml2YXRlIF9vcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucyA9IHt9O1xuICAgIHByaXZhdGUgX2ZhbGxiYWNrTWFwOiBGYWxsYmFja1Jlc291cmNlTWFwID0ge307XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBpMThuLkJhY2tlbmRNb2R1bGU8QWpheEJhY2tlbmRPcHRpb25zPlxuXG4gICAgaW5pdChzZXJ2aWNlczogaTE4bi5TZXJ2aWNlcywgb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMsIGluaXRPcHRpb25zOiBJMThOT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoOiBEZWZhdWx0LkxPQURfUEFUSCB9LCB0aGlzLl9vcHRpb25zLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fZmFsbGJhY2tNYXAgPSBPYmplY3QuYXNzaWduKHRoaXMuX2ZhbGxiYWNrTWFwLCBpbml0T3B0aW9ucy5mYWxsYmFja1Jlc291cmNlcyk7XG4gICAgfVxuXG4gICAgcmVhZChsYW5ndWFnZTogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgY2FsbGJhY2s6IGkxOG4uUmVhZENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGxuZyA9IHRoaXMuX2ZhbGxiYWNrTWFwW2xhbmd1YWdlXSB8fCBsYW5ndWFnZTtcbiAgICAgICAgY29uc3QgbG9hZFBhdGggPSBpc0Z1bmN0aW9uKHRoaXMuX29wdGlvbnMubG9hZFBhdGgpID8gdGhpcy5fb3B0aW9ucy5sb2FkUGF0aChbbG5nXSwgW25hbWVzcGFjZV0pIDogdGhpcy5fb3B0aW9ucy5sb2FkUGF0aDtcbiAgICAgICAgY29uc3QgdXJsID0gdGhpcy5yZXNvbHZlVXJsKGxvYWRQYXRoISwgeyBsbmcsIG5zOiBuYW1lc3BhY2UgfSk7XG4gICAgICAgIHRoaXMubG9hZFVybCh1cmwsIGNhbGxiYWNrKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIHJlc29sdmVVcmwobG9hZFBhdGg6IHN0cmluZywgZGF0YTogeyBsbmc6IHN0cmluZzsgbnM6IHN0cmluZzsgfSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b1VybCh0aGlzLl9zZXJ2aWNlcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUobG9hZFBhdGgsIGRhdGEsIHVuZGVmaW5lZCEsIHVuZGVmaW5lZCEpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvYWRVcmwodXJsOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBpMThuLkNhbGxiYWNrRXJyb3IgfCBzdHJpbmcsIGRhdGE6IGkxOG4uUmVzb3VyY2VLZXkgfCBib29sZWFuKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcXVlc3QuanNvbih1cmwsIHRoaXMuX29wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGpzb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBmYWlsZWQgbG9hZGluZzogJHt1cmx9LCAke3Jlc3VsdC5tZXNzYWdlfWA7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UgPT09IHJlc3VsdC5jb2RlICYmIHJlc3VsdC5jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHN0YXR1cyB9ID0gcmVzdWx0LmNhdXNlIGFzIHsgc3RhdHVzOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgICAgIGlmICg1MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDYwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgdHJ1ZSk7ICAvLyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKDQwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCBmYWxzZSk7IC8vIG5vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobXNnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET00sXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCAnLi9tb2R1bGUtZXh0ZW5kcyc7XG5cbi8qKiBAaW50ZXJuYWwgZXh0ZW5kcyB7QGxpbmsgRE9NfSBpbnN0YW5jZSBtZXRob2QgKi9cbmZ1bmN0aW9uIGV4dGVuZChkb21PcHRpb25zOiBSZXF1aXJlZDxpMThuLkRvbUxvY2FsaXplck9wdGlvbnM+LCBpMThuZXh0OiBpMThuLmkxOG4pOiB2b2lkIHtcbiAgICBjb25zdCB7XG4gICAgICAgIHNlbGVjdG9yQXR0cixcbiAgICAgICAgdGFyZ2V0QXR0cixcbiAgICAgICAgb3B0aW9uc0F0dHIsXG4gICAgICAgIHVzZU9wdGlvbnNBdHRyLFxuICAgICAgICBwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50LFxuICAgICAgICBjdXN0b21UYWdOYW1lLFxuICAgIH0gPSBkb21PcHRpb25zO1xuXG4gICAgY29uc3QgZXh0ZW5kRGVmYXVsdCA9IChvOiBQbGFpbk9iamVjdCwgdmFsOiBzdHJpbmcpOiBQbGFpbk9iamVjdCA9PiB7XG4gICAgICAgIGlmICghcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgLi4ubywgLi4ueyBkZWZhdWx0VmFsdWU6IHZhbCB9IH07XG4gICAgfTtcblxuICAgIC8vIFtwcmVwZW5kXS9bYXBwZW5kXSBoZWxwZXJcbiAgICBjb25zdCBpbnNlcnQgPSAobWV0aG9kOiAncHJlcGVuZCcgfCAnYXBwZW5kJywgJGVsOiBET00sIGtleTogc3RyaW5nLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKTtcbiAgICAgICAgaWYgKGZhbHNlID09PSBjdXN0b21UYWdOYW1lKSB7XG4gICAgICAgICAgICAkZWxbbWV0aG9kXSh0cmFuc2xhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWRXaXRoV3JhcCA9IGA8JHtjdXN0b21UYWdOYW1lfT4ke3RyYW5zbGF0ZWR9PC8ke2N1c3RvbVRhZ05hbWV9PmA7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJGVsLmNoaWxkcmVuKGN1c3RvbVRhZ05hbWUpO1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHRhcmdldC5yZXBsYWNlV2l0aCh0cmFuc2xhdGVkV2l0aFdyYXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZWxbbWV0aG9kXSh0cmFuc2xhdGVkV2l0aFdyYXApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHBhcnNlID0gKCRlbDogRE9NLCBrZXk6IHN0cmluZywgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBsZXQgYXR0ciA9ICd0ZXh0JztcblxuICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ1snKSkge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJ10nKTtcbiAgICAgICAgICAgIGtleSAgPSBwYXJ0c1sxXS50cmltKCk7XG4gICAgICAgICAgICBhdHRyID0gcGFydHNbMF0uc3Vic3RyaW5nKDEsIHBhcnRzWzBdLmxlbmd0aCkudHJpbSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdodG1sJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgJGVsLmh0bWwoaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuaHRtbCgpKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKCd0ZXh0JyA9PT0gYXR0cikge1xuICAgICAgICAgICAgJGVsLnRleHQoaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwudGV4dCgpKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKCdwcmVwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdwcmVwZW5kJywgJGVsLCBrZXksIG9wdHMpO1xuICAgICAgICB9IGVsc2UgaWYgKCdhcHBlbmQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICBpbnNlcnQoJ2FwcGVuZCcsICRlbCwga2V5LCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIGlmIChhdHRyLnN0YXJ0c1dpdGgoJ2RhdGEtJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGFBdHRyID0gYXR0ci5zdWJzdHJpbmcoKCdkYXRhLScpLmxlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkID0gaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuZGF0YShkYXRhQXR0cikgYXMgc3RyaW5nKSk7XG4gICAgICAgICAgICAkZWwuZGF0YShkYXRhQXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCB0cmFuc2xhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRlbC5hdHRyKGF0dHIsIGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmF0dHIoYXR0cikhKSkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGxvY2FsaXplID0gKCRlbDogRE9NLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9ICRlbC5hdHRyKHNlbGVjdG9yQXR0cik7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgJHRhcmdldCA9ICRlbDtcbiAgICAgICAgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSAkZWwuZGF0YSh0YXJnZXRBdHRyKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKHRhcmdldFNlbGVjdG9yKSB7XG4gICAgICAgICAgICAkdGFyZ2V0ID0gJGVsLmZpbmQodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRzICYmIHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBvcHRzID0gJGVsLmRhdGEob3B0aW9uc0F0dHIpIGFzIGkxOG4uVE9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2Yga2V5LnNwbGl0KCc7JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGsgPSBwYXJ0LnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgnJyAhPT0gaykge1xuICAgICAgICAgICAgICAgIHBhcnNlKCR0YXJnZXQsIGssIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHsgLi4ub3B0cyB9O1xuICAgICAgICAgICAgZGVsZXRlIGNsb25lLmxuZztcbiAgICAgICAgICAgICRlbC5kYXRhKG9wdGlvbnNBdHRyLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlKHRoaXM6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IERPTSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbnZhbGlkLXRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJvb3Qgb2YgJC51dGlscy5yb290aWZ5KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQocm9vdCk7XG4gICAgICAgICAgICAgICAgLy8gbG9jYWxpemUgZWxlbWVudCBpdHNlbGZcbiAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkZWwsIG9wdHMpO1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsaXplIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgY29uc3QgJGNoaWxkcmVuID0gJGVsLmZpbmQoYFske3NlbGVjdG9yQXR0cn1dYCk7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkKGVsKSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNlbGVjdG9yIGZ1bmN0aW9uICQobXlTZWxlY3RvcikubG9jYWxpemUob3B0cyk7XG4gICAgJC5mblsnbG9jYWxpemUnXSA9IGhhbmRsZTtcbn1cblxuLyoqXG4gKiBAZW4gYGkxOG5leHRgIERPTSBsb2NhbGl6ZXIgYnVpbHQtaW4gcGx1Z2luIGZhY3RvcnkuXG4gKiBAamEgYGkxOG5leHRgIERPTSDjg63jg7zjgqvjg6njgqTjgrrjg5Pjg6vjg4jjgqTjg7Pjg5fjg6njgrDjgqTjg7Pjg5XjgqHjgq/jg4jjg6rjg7zjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIERvbUxvY2FsaXplcihkb21PcHRpb25zPzogaTE4bi5Eb21Mb2NhbGl6ZXJPcHRpb25zKTogaTE4bi5UaGlyZFBhcnR5TW9kdWxlIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnM3JkUGFydHknLFxuICAgICAgICBpbml0OiBleHRlbmQuYmluZChcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvckF0dHI6ICdkYXRhLWkxOG4nLFxuICAgICAgICAgICAgICAgIHRhcmdldEF0dHI6ICdpMThuLXRhcmdldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uc0F0dHI6ICdpMThuLW9wdGlvbnMnLFxuICAgICAgICAgICAgICAgIHVzZU9wdGlvbnNBdHRyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50OiB0cnVlLFxuICAgICAgICAgICAgICAgIGN1c3RvbVRhZ05hbWU6ICdjZHAtaTE4bicsXG4gICAgICAgICAgICB9LCBkb21PcHRpb25zKVxuICAgICAgICApLFxuICAgIH07XG59XG4iLCJleHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IEkxOE5PcHRpb25zLCBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgbmF2aWdhdG9yIH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgQWpheEJhY2tlbmQsIERvbUxvY2FsaXplciB9IGZyb20gJy4vcGx1Z2luJztcblxuLyoqXG4gKiBAZW4gVHJhbnNsYXRlIGZ1bmNpb24uXG4gKiBAamEg57+76Kiz6Zai5pWwXG4gKi9cbmV4cG9ydCBjb25zdCB0OiBpMThuLlRGdW5jdGlvbiA9IGkxOG4udC5iaW5kKGkxOG4pO1xuXG4vKipcbiAqIEBlbiBJbml0aWFsaXplIGBpMThuZXh0YCBpbnN0YW5jZS5cbiAqIEBqYSBgaTE4bmV4dGAg44Kk44Oz44K544K/44Oz44K544Gu5Yid5pyf5YyWXG4gKlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgaW5pdCBvcHRpb25zXG4gKiAgLSBgamFgIOWIneacn+WMluOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgaW5pdGlhbGl6ZUkxOE4gPSAob3B0aW9ucz86IEkxOE5PcHRpb25zKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4gPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbm9UaHJvdzogdHJ1ZSB9LCBvcHRpb25zKTtcblxuICAgIGNvbnN0IHsgbmFtZXNwYWNlLCByZXNvdXJjZVBhdGg6IGxvYWRQYXRoLCBkb20sIG5vVGhyb3cgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW9wdHMubG5nKSB7XG4gICAgICAgIG9wdHMubG5nID0gbmF2aWdhdG9yLmxhbmd1YWdlO1xuICAgIH1cblxuICAgIGlmIChuYW1lc3BhY2UpIHtcbiAgICAgICAgIW9wdHMubnMgJiYgKG9wdHMubnMgPSBuYW1lc3BhY2UpO1xuICAgICAgICAhb3B0cy5kZWZhdWx0TlMgJiYgKG9wdHMuZGVmYXVsdE5TID0gbmFtZXNwYWNlKTtcbiAgICB9XG5cbiAgICBpZiAobG9hZFBhdGgpIHtcbiAgICAgICAgb3B0cy5iYWNrZW5kID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoIH0sIG9wdHMuYmFja2VuZCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdHMuYmFja2VuZCkge1xuICAgICAgICBpMThuLnVzZShBamF4QmFja2VuZCk7XG4gICAgfVxuXG4gICAgaTE4bi51c2UoRG9tTG9jYWxpemVyKGRvbSkpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdm9pZCBpMThuLmluaXQob3B0cywgKGVycm9yLCB0cmFuc2xhdG9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0kxOE5fQ09SRV9MQVlFUiwgJ2kxOG4jaW5pdCgpIGZhaWxlZC4nLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgaWYgKG5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHJlc3VsdC5tZXNzYWdlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHRyYW5zbGF0b3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIEdldCB0aGUgY3VycmVudCBkZXRlY3RlZCBvciBzZXQgbGFuZ3VhZ2UuXG4gKiBAamEg54++5Zyo6Kit5a6a44GV44KM44Gm44GE44KL6KiA6Kqe44KS5Y+W5b6XXG4gKlxuICogQHJldHVybnMgYGphLUpQYCwgYGphYFxuICovXG5leHBvcnQgY29uc3QgZ2V0TGFuZ3VhZ2UgPSAoKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gaTE4bi5sYW5ndWFnZSB8fCBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgYW4gYXJyYXkgb2YgYGxhbmd1YWdlLWNvZGVzYCB0aGF0IHdpbGwgYmUgdXNlZCBpdCBvcmRlciB0byBsb29rdXAgdGhlIHRyYW5zbGF0aW9uIHZhbHVlLlxuICogQGphIOe/u+ios+OBruaknOe0ouOBq+S9v+eUqOOBleOCjOOCiyBgbGFuZ3VhZ2UtY29kZXNgIOODquOCueODiOOCkuWPluW+l1xuICpcbiAqIEBzZWVcbiAqICAtIGh0dHBzOi8vd3d3LmkxOG5leHQuY29tL292ZXJ2aWV3L2FwaSNsYW5ndWFnZXNcbiAqL1xuZXhwb3J0IGNvbnN0IGdldExhbmd1YWdlTGlzdCA9ICgpOiByZWFkb25seSBzdHJpbmdbXSA9PiB7XG4gICAgcmV0dXJuIGkxOG4ubGFuZ3VhZ2VzIHx8IFtuYXZpZ2F0b3IubGFuZ3VhZ2VdO1xufTtcblxuLyoqXG4gKiBAZW4gQ2hhbmdlcyB0aGUgbGFuZ3VhZ2UuXG4gKiBAamEg6KiA6Kqe44Gu5YiH44KK5pu/44GIXG4gKi9cbmV4cG9ydCBjb25zdCBjaGFuZ2VMYW5ndWFnZSA9IChsbmc6IHN0cmluZywgb3B0aW9ucz86IEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cik6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG5vVGhyb3c6IHRydWUgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdm9pZCBpMThuLmNoYW5nZUxhbmd1YWdlKGxuZywgKGVycm9yLCB0cmFuc2xhdG9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0kxOE5fQ09SRV9MQVlFUiwgJ2kxOG4jY2hhbmdlTGFuZ3VhdGUoKSBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRzLm5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHJlc3VsdC5tZXNzYWdlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHRyYW5zbGF0b3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIERPTSBsb2NhbGl6ZXIgbWV0aG9kLlxuICogQGphIERPTSDjg63jg7zjgqvjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB0cmFuc2xhdGlvbiBvcHRpb25zLlxuICogIC0gYGphYCDnv7voqLPjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IGxvY2FsaXplID0gPFQgZXh0ZW5kcyBzdHJpbmcgfCBOb2RlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4sIG9wdGlvbnM/OiBpMThuLlRPcHRpb25zKTogRE9NUmVzdWx0PFQ+ID0+IHtcbiAgICByZXR1cm4gJChzZWxlY3RvcikubG9jYWxpemUob3B0aW9ucykgYXMgRE9NUmVzdWx0PFQ+O1xufTtcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsInRvVXJsIiwicmVxdWVzdCIsInJlc3VsdCIsInRvUmVzdWx0IiwiUkVTVUxUX0NPREUiLCIkIiwiaTE4biIsIm1ha2VSZXN1bHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBR0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFIRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxjQUEwQyxDQUFBO1lBQzFDLFdBQXdCLENBQUEsV0FBQSxDQUFBLHVCQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBLEdBQUEsdUJBQUEsQ0FBQTtJQUMvRyxLQUFDLEdBQUEsQ0FBQTtJQUNMLENBQUMsR0FBQTs7SUNsQkQsaUJBQXdCLE1BQU0sU0FBUyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQzs7SUNhcEU7SUFFQTs7Ozs7SUFLRztVQUNVLFdBQVcsQ0FBQTtRQUNYLElBQUksR0FBRyxTQUFTLENBQUM7SUFDMUIsSUFBQSxPQUFPLElBQUksR0FBRyxTQUFTLENBQUM7SUFDaEIsSUFBQSxTQUFTLENBQWlCO1FBQzFCLFFBQVEsR0FBNEIsRUFBRSxDQUFDO1FBQ3ZDLFlBQVksR0FBd0IsRUFBRSxDQUFDOzs7SUFLL0MsSUFBQSxJQUFJLENBQUMsUUFBdUIsRUFBRSxPQUFnQyxFQUFFLFdBQXdCLEVBQUE7SUFDcEYsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztJQUMxQixRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBbUIsaUNBQUEsMEJBQUUsRUFBRSxJQUFJLENBQUMs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