/*!
 * @cdp/i18n 0.9.17
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
        dom.dom.fn['localize'] = handle; // eslint-disable-line @typescript-eslint/dot-notation
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBuYXZpZ2F0b3IgPSBzYWZlKGdsb2JhbFRoaXMubmF2aWdhdG9yKTtcbiIsImltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIHRvUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgeyB0b1VybCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IEkxOE5PcHRpb25zIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVmYXVsdCB7XG4gICAgTE9BRF9QQVRIID0gJ3Jlcy9sb2NhbGVzL3t7bnN9fS57e2xuZ319Lmpzb24nLFxufVxuXG4vKiogQGludGVybmFsICovIHR5cGUgRmFsbGJhY2tSZXNvdXJjZU1hcCA9IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgYSBzaW1wbGUgYGkxOG5leHRgIGJhY2tlbmQgYnVpbHQtaW4gcGx1Z2luLiBJdCB3aWxsIGxvYWQgcmVzb3VyY2VzIGZyb20gYSBiYWNrZW5kIHNlcnZlciB1c2luZyB0aGUgYGZldGNoYCBBUEkuXG4gKiBAamEgYGZldGNoYCBBUEkg44KS55So44GE44GfIGBpMThuZXh0YCBiYWNrZW5kIOODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+OCr+ODqeOCuVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY2xhc3MgQWpheEJhY2tlbmQgaW1wbGVtZW50cyBpMThuLkJhY2tlbmRNb2R1bGU8aTE4bi5BamF4QmFja2VuZE9wdGlvbnM+IHtcbiAgICByZWFkb25seSB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHN0YXRpYyB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHByaXZhdGUgX3NlcnZpY2VzITogaTE4bi5TZXJ2aWNlcztcbiAgICBwcml2YXRlIF9vcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucyA9IHt9O1xuICAgIHByaXZhdGUgX2ZhbGxiYWNrTWFwOiBGYWxsYmFja1Jlc291cmNlTWFwID0ge307XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBpMThuLkJhY2tlbmRNb2R1bGU8QWpheEJhY2tlbmRPcHRpb25zPlxuXG4gICAgaW5pdChzZXJ2aWNlczogaTE4bi5TZXJ2aWNlcywgb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMsIGluaXRPcHRpb25zOiBJMThOT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoOiBEZWZhdWx0LkxPQURfUEFUSCB9LCB0aGlzLl9vcHRpb25zLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fZmFsbGJhY2tNYXAgPSBPYmplY3QuYXNzaWduKHRoaXMuX2ZhbGxiYWNrTWFwLCBpbml0T3B0aW9ucy5mYWxsYmFja1Jlc291cmNlcyk7XG4gICAgfVxuXG4gICAgcmVhZChsYW5ndWFnZTogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgY2FsbGJhY2s6IGkxOG4uUmVhZENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGxuZyA9IHRoaXMuX2ZhbGxiYWNrTWFwW2xhbmd1YWdlXSB8fCBsYW5ndWFnZTtcbiAgICAgICAgY29uc3QgbG9hZFBhdGggPSBpc0Z1bmN0aW9uKHRoaXMuX29wdGlvbnMubG9hZFBhdGgpID8gdGhpcy5fb3B0aW9ucy5sb2FkUGF0aChbbG5nXSwgW25hbWVzcGFjZV0pIDogdGhpcy5fb3B0aW9ucy5sb2FkUGF0aDtcbiAgICAgICAgY29uc3QgdXJsID0gdGhpcy5yZXNvbHZlVXJsKGxvYWRQYXRoISwgeyBsbmcsIG5zOiBuYW1lc3BhY2UgfSk7XG4gICAgICAgIHRoaXMubG9hZFVybCh1cmwsIGNhbGxiYWNrKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIHJlc29sdmVVcmwobG9hZFBhdGg6IHN0cmluZywgZGF0YTogeyBsbmc6IHN0cmluZzsgbnM6IHN0cmluZzsgfSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b1VybCh0aGlzLl9zZXJ2aWNlcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUobG9hZFBhdGgsIGRhdGEsIHVuZGVmaW5lZCEsIHVuZGVmaW5lZCEpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvYWRVcmwodXJsOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBpMThuLkNhbGxiYWNrRXJyb3IgfCBzdHJpbmcsIGRhdGE6IGkxOG4uUmVzb3VyY2VLZXkgfCBib29sZWFuKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcXVlc3QuanNvbih1cmwsIHRoaXMuX29wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGpzb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBmYWlsZWQgbG9hZGluZzogJHt1cmx9LCAke3Jlc3VsdC5tZXNzYWdlfWA7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UgPT09IHJlc3VsdC5jb2RlICYmIHJlc3VsdC5jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHN0YXR1cyB9ID0gcmVzdWx0LmNhdXNlIGFzIHsgc3RhdHVzOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgICAgIGlmICg1MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDYwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgdHJ1ZSk7ICAvLyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKDQwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCBmYWxzZSk7IC8vIG5vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobXNnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET00sXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCAnLi9tb2R1bGUtZXh0ZW5kcyc7XG5cbi8qKiBAaW50ZXJuYWwgZXh0ZW5kcyB7QGxpbmsgRE9NfSBpbnN0YW5jZSBtZXRob2QgKi9cbmZ1bmN0aW9uIGV4dGVuZChkb21PcHRpb25zOiBSZXF1aXJlZDxpMThuLkRvbUxvY2FsaXplck9wdGlvbnM+LCBpMThuZXh0OiBpMThuLmkxOG4pOiB2b2lkIHtcbiAgICBjb25zdCB7XG4gICAgICAgIHNlbGVjdG9yQXR0cixcbiAgICAgICAgdGFyZ2V0QXR0cixcbiAgICAgICAgb3B0aW9uc0F0dHIsXG4gICAgICAgIHVzZU9wdGlvbnNBdHRyLFxuICAgICAgICBwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50LFxuICAgICAgICBjdXN0b21UYWdOYW1lLFxuICAgIH0gPSBkb21PcHRpb25zO1xuXG4gICAgY29uc3QgZXh0ZW5kRGVmYXVsdCA9IChvOiBQbGFpbk9iamVjdCwgdmFsOiBzdHJpbmcpOiBQbGFpbk9iamVjdCA9PiB7XG4gICAgICAgIGlmICghcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgLi4ubywgLi4ueyBkZWZhdWx0VmFsdWU6IHZhbCB9IH07XG4gICAgfTtcblxuICAgIC8vIFtwcmVwZW5kXS9bYXBwZW5kXSBoZWxwZXJcbiAgICBjb25zdCBpbnNlcnQgPSAobWV0aG9kOiAncHJlcGVuZCcgfCAnYXBwZW5kJywgJGVsOiBET00sIGtleTogc3RyaW5nLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKTtcbiAgICAgICAgaWYgKGZhbHNlID09PSBjdXN0b21UYWdOYW1lKSB7XG4gICAgICAgICAgICAkZWxbbWV0aG9kXSh0cmFuc2xhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWRXaXRoV3JhcCA9IGA8JHtjdXN0b21UYWdOYW1lfT4ke3RyYW5zbGF0ZWR9PC8ke2N1c3RvbVRhZ05hbWV9PmA7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJGVsLmNoaWxkcmVuKGN1c3RvbVRhZ05hbWUpO1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHRhcmdldC5yZXBsYWNlV2l0aCh0cmFuc2xhdGVkV2l0aFdyYXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZWxbbWV0aG9kXSh0cmFuc2xhdGVkV2l0aFdyYXApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHBhcnNlID0gKCRlbDogRE9NLCBrZXk6IHN0cmluZywgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBsZXQgYXR0ciA9ICd0ZXh0JztcblxuICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ1snKSkge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJ10nKTtcbiAgICAgICAgICAgIGtleSAgPSBwYXJ0c1sxXS50cmltKCk7XG4gICAgICAgICAgICBhdHRyID0gcGFydHNbMF0uc3Vic3RyaW5nKDEsIHBhcnRzWzBdLmxlbmd0aCkudHJpbSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdodG1sJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgJGVsLmh0bWwoaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuaHRtbCgpKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKCd0ZXh0JyA9PT0gYXR0cikge1xuICAgICAgICAgICAgJGVsLnRleHQoaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwudGV4dCgpKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKCdwcmVwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdwcmVwZW5kJywgJGVsLCBrZXksIG9wdHMpO1xuICAgICAgICB9IGVsc2UgaWYgKCdhcHBlbmQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICBpbnNlcnQoJ2FwcGVuZCcsICRlbCwga2V5LCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIGlmIChhdHRyLnN0YXJ0c1dpdGgoJ2RhdGEtJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGFBdHRyID0gYXR0ci5zdWJzdHJpbmcoKCdkYXRhLScpLmxlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkID0gaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuZGF0YShkYXRhQXR0cikgYXMgc3RyaW5nKSk7XG4gICAgICAgICAgICAkZWwuZGF0YShkYXRhQXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCB0cmFuc2xhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRlbC5hdHRyKGF0dHIsIGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmF0dHIoYXR0cikhKSkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGxvY2FsaXplID0gKCRlbDogRE9NLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9ICRlbC5hdHRyKHNlbGVjdG9yQXR0cik7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgJHRhcmdldCA9ICRlbDtcbiAgICAgICAgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSAkZWwuZGF0YSh0YXJnZXRBdHRyKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKHRhcmdldFNlbGVjdG9yKSB7XG4gICAgICAgICAgICAkdGFyZ2V0ID0gJGVsLmZpbmQodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRzICYmIHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBvcHRzID0gJGVsLmRhdGEob3B0aW9uc0F0dHIpIGFzIGkxOG4uVE9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2Yga2V5LnNwbGl0KCc7JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGsgPSBwYXJ0LnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgnJyAhPT0gaykge1xuICAgICAgICAgICAgICAgIHBhcnNlKCR0YXJnZXQsIGssIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHsgLi4ub3B0cyB9O1xuICAgICAgICAgICAgZGVsZXRlIGNsb25lLmxuZztcbiAgICAgICAgICAgICRlbC5kYXRhKG9wdGlvbnNBdHRyLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlKHRoaXM6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IERPTSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbnZhbGlkLXRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJvb3Qgb2YgJC51dGlscy5yb290aWZ5KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQocm9vdCk7XG4gICAgICAgICAgICAgICAgLy8gbG9jYWxpemUgZWxlbWVudCBpdHNlbGZcbiAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkZWwsIG9wdHMpO1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsaXplIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgY29uc3QgJGNoaWxkcmVuID0gJGVsLmZpbmQoYFske3NlbGVjdG9yQXR0cn1dYCk7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkKGVsKSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNlbGVjdG9yIGZ1bmN0aW9uICQobXlTZWxlY3RvcikubG9jYWxpemUob3B0cyk7XG4gICAgJC5mblsnbG9jYWxpemUnXSA9IGhhbmRsZTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvZG90LW5vdGF0aW9uXG59XG5cbi8qKlxuICogQGVuIGBpMThuZXh0YCBET00gbG9jYWxpemVyIGJ1aWx0LWluIHBsdWdpbiBmYWN0b3J5LlxuICogQGphIGBpMThuZXh0YCBET00g44Ot44O844Kr44Op44Kk44K644OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44OV44Kh44Kv44OI44Oq44O844Oh44K944OD44OJXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBEb21Mb2NhbGl6ZXIoZG9tT3B0aW9ucz86IGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucyk6IGkxOG4uVGhpcmRQYXJ0eU1vZHVsZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJzNyZFBhcnR5JyxcbiAgICAgICAgaW5pdDogZXh0ZW5kLmJpbmQoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3JBdHRyOiAnZGF0YS1pMThuJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRBdHRyOiAnaTE4bi10YXJnZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNBdHRyOiAnaTE4bi1vcHRpb25zJyxcbiAgICAgICAgICAgICAgICB1c2VPcHRpb25zQXR0cjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjdXN0b21UYWdOYW1lOiAnY2RwLWkxOG4nLFxuICAgICAgICAgICAgfSwgZG9tT3B0aW9ucylcbiAgICAgICAgKSxcbiAgICB9O1xufVxuIiwiZXhwb3J0ICogZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucywgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IG5hdmlnYXRvciB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IEFqYXhCYWNrZW5kLCBEb21Mb2NhbGl6ZXIgfSBmcm9tICcuL3BsdWdpbic7XG5cbi8qKlxuICogQGVuIFRyYW5zbGF0ZSBmdW5jaW9uLlxuICogQGphIOe/u+ios+mWouaVsFxuICovXG5leHBvcnQgY29uc3QgdDogaTE4bi5URnVuY3Rpb24gPSBpMThuLnQuYmluZChpMThuKTtcblxuLyoqXG4gKiBAZW4gSW5pdGlhbGl6ZSBgaTE4bmV4dGAgaW5zdGFuY2UuXG4gKiBAamEgYGkxOG5leHRgIOOCpOODs+OCueOCv+ODs+OCueOBruWIneacn+WMllxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVJMThOID0gKG9wdGlvbnM/OiBJMThOT3B0aW9ucyk6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG5vVGhyb3c6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCB7IG5hbWVzcGFjZSwgcmVzb3VyY2VQYXRoOiBsb2FkUGF0aCwgZG9tLCBub1Rocm93IH0gPSBvcHRzO1xuXG4gICAgaWYgKCFvcHRzLmxuZykge1xuICAgICAgICBvcHRzLmxuZyA9IG5hdmlnYXRvci5sYW5ndWFnZTtcbiAgICB9XG5cbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgICFvcHRzLm5zICYmIChvcHRzLm5zID0gbmFtZXNwYWNlKTtcbiAgICAgICAgIW9wdHMuZGVmYXVsdE5TICYmIChvcHRzLmRlZmF1bHROUyA9IG5hbWVzcGFjZSk7XG4gICAgfVxuXG4gICAgaWYgKGxvYWRQYXRoKSB7XG4gICAgICAgIG9wdHMuYmFja2VuZCA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aCB9LCBvcHRzLmJhY2tlbmQpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLmJhY2tlbmQpIHtcbiAgICAgICAgaTE4bi51c2UoQWpheEJhY2tlbmQpO1xuICAgIH1cblxuICAgIGkxOG4udXNlKERvbUxvY2FsaXplcihkb20pKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZvaWQgaTE4bi5pbml0KG9wdHMsIChlcnJvciwgdHJhbnNsYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9JMThOX0NPUkVfTEFZRVIsICdpMThuI2luaXQoKSBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXN1bHQubWVzc2FnZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cmFuc2xhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgZGV0ZWN0ZWQgb3Igc2V0IGxhbmd1YWdlLlxuICogQGphIOePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+iogOiqnuOCkuWPluW+l1xuICpcbiAqIEByZXR1cm5zIGBqYS1KUGAsIGBqYWBcbiAqL1xuZXhwb3J0IGNvbnN0IGdldExhbmd1YWdlID0gKCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGkxOG4ubGFuZ3VhZ2UgfHwgbmF2aWdhdG9yLmxhbmd1YWdlO1xufTtcblxuLyoqXG4gKiBAZW4gR2V0IGFuIGFycmF5IG9mIGBsYW5ndWFnZS1jb2Rlc2AgdGhhdCB3aWxsIGJlIHVzZWQgaXQgb3JkZXIgdG8gbG9va3VwIHRoZSB0cmFuc2xhdGlvbiB2YWx1ZS5cbiAqIEBqYSDnv7voqLPjga7mpJzntKLjgavkvb/nlKjjgZXjgozjgosgYGxhbmd1YWdlLWNvZGVzYCDjg6rjgrnjg4jjgpLlj5blvpdcbiAqXG4gKiBAc2VlXG4gKiAgLSBodHRwczovL3d3dy5pMThuZXh0LmNvbS9vdmVydmlldy9hcGkjbGFuZ3VhZ2VzXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRMYW5ndWFnZUxpc3QgPSAoKTogcmVhZG9ubHkgc3RyaW5nW10gPT4ge1xuICAgIHJldHVybiBpMThuLmxhbmd1YWdlcyB8fCBbbmF2aWdhdG9yLmxhbmd1YWdlXTtcbn07XG5cbi8qKlxuICogQGVuIENoYW5nZXMgdGhlIGxhbmd1YWdlLlxuICogQGphIOiogOiqnuOBruWIh+OCiuabv+OBiFxuICovXG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSAobG5nOiBzdHJpbmcsIG9wdGlvbnM/OiBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBub1Rocm93OiB0cnVlIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZvaWQgaTE4bi5jaGFuZ2VMYW5ndWFnZShsbmcsIChlcnJvciwgdHJhbnNsYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9JMThOX0NPUkVfTEFZRVIsICdpMThuI2NoYW5nZUxhbmd1YXRlKCkgZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBpZiAob3B0cy5ub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXN1bHQubWVzc2FnZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cmFuc2xhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBET00gbG9jYWxpemVyIG1ldGhvZC5cbiAqIEBqYSBET00g44Ot44O844Kr44Op44Kk44K6XG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdHJhbnNsYXRpb24gb3B0aW9ucy5cbiAqICAtIGBqYWAg57+76Kiz44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBsb2NhbGl6ZSA9IDxUIGV4dGVuZHMgc3RyaW5nIHwgTm9kZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBvcHRpb25zPzogaTE4bi5UT3B0aW9ucyk6IERPTVJlc3VsdDxUPiA9PiB7XG4gICAgcmV0dXJuICQoc2VsZWN0b3IpLmxvY2FsaXplKG9wdGlvbnMpIGFzIERPTVJlc3VsdDxUPjtcbn07XG4iXSwibmFtZXMiOlsic2FmZSIsImlzRnVuY3Rpb24iLCJ0b1VybCIsInJlcXVlc3QiLCJyZXN1bHQiLCJ0b1Jlc3VsdCIsIlJFU1VMVF9DT0RFIiwiJCIsImkxOG4iLCJtYWtlUmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFHRztJQUVILENBQUEsWUFBcUI7SUFNakI7OztJQUdHO0lBQ0gsSUFBQSxJQUdDLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQSxDQUFBO0lBSEQsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsY0FBMEMsQ0FBQTtZQUMxQyxXQUF3QixDQUFBLFdBQUEsQ0FBQSx1QkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsOEJBQXVCLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQSxHQUFBLHVCQUFBLENBQUE7SUFDL0csS0FBQyxHQUFBLENBQUE7SUFDTCxDQUFDLEdBQUE7O0lDbEJELGlCQUF3QixNQUFNLFNBQVMsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7O0lDYXBFO0lBRUE7Ozs7O0lBS0c7VUFDVSxXQUFXLENBQUE7UUFDWCxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQzFCLElBQUEsT0FBTyxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ2hCLElBQUEsU0FBUyxDQUFpQjtRQUMxQixRQUFRLEdBQTRCLEVBQUUsQ0FBQztRQUN2QyxZQUFZLEdBQXdCLEVBQUUsQ0FBQzs7O0lBSy9DLElBQUEsSUFBSSxDQUFDLFFBQXVCLEVBQUUsT0FBZ0MsRUFBRSxXQUF3QixFQUFBO0lBQ3BGLFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7SUFDMUIsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FB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QUM7SUFDUCxLQUFDLENBQUMsQ0FBQztJQUNQLEVBQUU7SUFFRjs7Ozs7SUFLRztBQUNJLFVBQU0sV0FBVyxHQUFHLE1BQWE7SUFDcEMsSUFBQSxPQUFPSSxrQkFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDO0lBQy9DLEVBQUU7SUFFRjs7Ozs7O0lBTUc7QUFDSSxVQUFNLGVBQWUsR0FBRyxNQUF3QjtRQUNuRCxPQUFPQSxrQkFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsRCxFQUFFO0lBRUY7OztJQUdHO1VBQ1UsY0FBYyxHQUFHLENBQUMsR0FBVyxFQUFFLE9BQWtDLEtBQTZCO0lBQ3ZHLElBQUEsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSTtZQUNuQyxLQUFLQSxrQkFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxLQUFJO0lBQ2hELFlBQUEsSUFBSSxLQUFLLEVBQUU7SUFDUCxnQkFBQSxNQUFNSixRQUFNLEdBQUdLLGlCQUFVLENBQUNILGtCQUFXLENBQUMscUJBQXFCLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ3JHLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDZCxPQUFPLENBQUMsSUFBSSxDQUFDRixRQUFNLENBQUMsT0FBTyxFQUFFQSxRQUFNLENBQUMsQ0FBQztJQUN4QyxpQkFBQTtJQUFNLHFCQUFBO0lBQ0gsb0JBQUEsT0FBTyxNQUFNLENBQUNBLFFBQU0sQ0FBQyxDQUFDO0lBQ3pCLGlCQUFBO0lBQ0osYUFBQTtnQkFDRCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEIsU0FBQyxDQUFDLENBQUM7SUFDUCxLQUFDLENBQUMsQ0FBQztJQUNQLEVBQUU7SUFFRjs7Ozs7Ozs7OztJQVVHO1VBQ1UsUUFBUSxHQUFHLENBQTBCLFFBQXdCLEVBQUUsT0FBdUIsS0FBa0I7UUFDakgsT0FBT0csT0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQWlCLENBQUM7SUFDekQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvaTE4bi8ifQ==