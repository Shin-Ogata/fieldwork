/*!
 * @cdp/i18n 0.9.13
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
        @typescript-eslint/restrict-plus-operands,
     */
    (function () {
        /**
         * @en Extends error code definitions.
         * @ja 拡張通エラーコード定義
         */
        let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
        (function () {
            RESULT_CODE[RESULT_CODE["I18N_DECLARE"] = 9007199254740991] = "I18N_DECLARE";
            RESULT_CODE[RESULT_CODE["ERROR_I18N_CORE_LAYER"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 40 /* LOCAL_CODE_BASE.I18N */ + 1, 'i18next error')] = "ERROR_I18N_CORE_LAYER";
        })();
    })();

    /** @internal */ const navigator = coreUtils.safe(globalThis.navigator);

    /* eslint-disable
        @typescript-eslint/no-non-null-assertion,
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
    for (const k in extensionI18n) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionI18n[k]; }
        });
    }

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBuYXZpZ2F0b3IgPSBzYWZlKGdsb2JhbFRoaXMubmF2aWdhdG9yKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvbixcbiAqL1xuXG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCB0b1Jlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHJlcXVlc3QgfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHsgdG9VcmwgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHQge1xuICAgIExPQURfUEFUSCA9ICdyZXMvbG9jYWxlcy97e25zfX0ue3tsbmd9fS5qc29uJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIEZhbGxiYWNrUmVzb3VyY2VNYXAgPSB7IFtsbmc6IHN0cmluZ106IHN0cmluZzsgfTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBhIHNpbXBsZSBgaTE4bmV4dGAgYmFja2VuZCBidWlsdC1pbiBwbHVnaW4uIEl0IHdpbGwgbG9hZCByZXNvdXJjZXMgZnJvbSBhIGJhY2tlbmQgc2VydmVyIHVzaW5nIHRoZSBgZmV0Y2hgIEFQSS5cbiAqIEBqYSBgZmV0Y2hgIEFQSSDjgpLnlKjjgYTjgZ8gYGkxOG5leHRgIGJhY2tlbmQg44OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44Kv44Op44K5XG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjbGFzcyBBamF4QmFja2VuZCBpbXBsZW1lbnRzIGkxOG4uQmFja2VuZE1vZHVsZTxpMThuLkFqYXhCYWNrZW5kT3B0aW9ucz4ge1xuICAgIHJlYWRvbmx5IHR5cGUgPSAnYmFja2VuZCc7XG4gICAgc3RhdGljIHR5cGUgPSAnYmFja2VuZCc7XG4gICAgcHJpdmF0ZSBfc2VydmljZXMhOiBpMThuLlNlcnZpY2VzO1xuICAgIHByaXZhdGUgX29wdGlvbnM6IGkxOG4uQWpheEJhY2tlbmRPcHRpb25zID0ge307XG4gICAgcHJpdmF0ZSBfZmFsbGJhY2tNYXA6IEZhbGxiYWNrUmVzb3VyY2VNYXAgPSB7fTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IGkxOG4uQmFja2VuZE1vZHVsZTxBamF4QmFja2VuZE9wdGlvbnM+XG5cbiAgICBpbml0KHNlcnZpY2VzOiBpMThuLlNlcnZpY2VzLCBvcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucywgaW5pdE9wdGlvbnM6IEkxOE5PcHRpb25zKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3NlcnZpY2VzID0gc2VydmljZXM7XG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSBPYmplY3QuYXNzaWduKHsgbG9hZFBhdGg6IERlZmF1bHQuTE9BRF9QQVRIIH0sIHRoaXMuX29wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9mYWxsYmFja01hcCA9IE9iamVjdC5hc3NpZ24odGhpcy5fZmFsbGJhY2tNYXAsIGluaXRPcHRpb25zLmZhbGxiYWNrUmVzb3VyY2VzKTtcbiAgICB9XG5cbiAgICByZWFkKGxhbmd1YWdlOiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBjYWxsYmFjazogaTE4bi5SZWFkQ2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbG5nID0gdGhpcy5fZmFsbGJhY2tNYXBbbGFuZ3VhZ2VdIHx8IGxhbmd1YWdlO1xuICAgICAgICBjb25zdCBsb2FkUGF0aCA9IGlzRnVuY3Rpb24odGhpcy5fb3B0aW9ucy5sb2FkUGF0aCkgPyB0aGlzLl9vcHRpb25zLmxvYWRQYXRoKFtsbmddLCBbbmFtZXNwYWNlXSkgOiB0aGlzLl9vcHRpb25zLmxvYWRQYXRoO1xuICAgICAgICBjb25zdCB1cmwgPSB0aGlzLnJlc29sdmVVcmwobG9hZFBhdGggYXMgc3RyaW5nLCB7IGxuZywgbnM6IG5hbWVzcGFjZSB9KTtcbiAgICAgICAgdGhpcy5sb2FkVXJsKHVybCwgY2FsbGJhY2spO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIHByaXZhdGUgcmVzb2x2ZVVybChsb2FkUGF0aDogc3RyaW5nLCBkYXRhOiB7IGxuZzogc3RyaW5nOyBuczogc3RyaW5nOyB9KTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvVXJsKHRoaXMuX3NlcnZpY2VzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShsb2FkUGF0aCwgZGF0YSwgdW5kZWZpbmVkISwgdW5kZWZpbmVkISkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9hZFVybCh1cmw6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IGkxOG4uQ2FsbGJhY2tFcnJvciB8IHN0cmluZywgZGF0YTogaTE4bi5SZXNvdXJjZUtleSB8IGJvb2xlYW4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgcmVxdWVzdC5qc29uKHVybCwgdGhpcy5fb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwganNvbik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYGZhaWxlZCBsb2FkaW5nOiAke3VybH0sICR7cmVzdWx0Lm1lc3NhZ2V9YDtcbiAgICAgICAgICAgICAgICBpZiAoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSA9PT0gcmVzdWx0LmNvZGUgJiYgcmVzdWx0LmNhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1czogbnVtYmVyID0gcmVzdWx0LmNhdXNlLnN0YXR1cztcbiAgICAgICAgICAgICAgICAgICAgaWYgKDUwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNjAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCB0cnVlKTsgIC8vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoNDAwIDw9IHN0YXR1cyAmJiBzdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2csIGZhbHNlKTsgLy8gbm8gcmV0cnlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhtc2csIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGRvbSBhcyAkLFxuICAgIERPTSxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0ICcuL21vZHVsZS1leHRlbmRzJztcblxuLyoqIEBpbnRlcm5hbCBleHRlbmRzIFtbRE9NXV0gaW5zdGFuY2UgbWV0aG9kICovXG5mdW5jdGlvbiBleHRlbmQoZG9tT3B0aW9uczogUmVxdWlyZWQ8aTE4bi5Eb21Mb2NhbGl6ZXJPcHRpb25zPiwgaTE4bmV4dDogaTE4bi5pMThuKTogdm9pZCB7XG4gICAgY29uc3Qge1xuICAgICAgICBzZWxlY3RvckF0dHIsXG4gICAgICAgIHRhcmdldEF0dHIsXG4gICAgICAgIG9wdGlvbnNBdHRyLFxuICAgICAgICB1c2VPcHRpb25zQXR0cixcbiAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudCxcbiAgICAgICAgY3VzdG9tVGFnTmFtZSxcbiAgICB9ID0gZG9tT3B0aW9ucztcblxuICAgIGNvbnN0IGV4dGVuZERlZmF1bHQgPSAobzogUGxhaW5PYmplY3QsIHZhbDogc3RyaW5nKTogUGxhaW5PYmplY3QgPT4ge1xuICAgICAgICBpZiAoIXBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IC4uLm8sIC4uLnsgZGVmYXVsdFZhbHVlOiB2YWwgfSB9O1xuICAgIH07XG5cbiAgICAvLyBbcHJlcGVuZF0vW2FwcGVuZF0gaGVscGVyXG4gICAgY29uc3QgaW5zZXJ0ID0gKG1ldGhvZDogJ3ByZXBlbmQnIHwgJ2FwcGVuZCcsICRlbDogRE9NLCBrZXk6IHN0cmluZywgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCB0cmFuc2xhdGVkID0gaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuaHRtbCgpKSk7XG4gICAgICAgIGlmIChmYWxzZSA9PT0gY3VzdG9tVGFnTmFtZSkge1xuICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkV2l0aFdyYXAgPSBgPCR7Y3VzdG9tVGFnTmFtZX0+JHt0cmFuc2xhdGVkfTwvJHtjdXN0b21UYWdOYW1lfT5gO1xuICAgICAgICAgICAgY29uc3QgJGZpcnN0Q2hpbGQgPSAkKCRlbFswXS5maXJzdEVsZW1lbnRDaGlsZCkgYXMgRE9NO1xuICAgICAgICAgICAgaWYgKCRmaXJzdENoaWxkLmlzKGN1c3RvbVRhZ05hbWUpKSB7XG4gICAgICAgICAgICAgICAgJGZpcnN0Q2hpbGQucmVwbGFjZVdpdGgodHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBwYXJzZSA9ICgkZWw6IERPTSwga2V5OiBzdHJpbmcsIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgbGV0IGF0dHIgPSAndGV4dCc7XG5cbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCddJyk7XG4gICAgICAgICAgICBrZXkgID0gcGFydHNbMV0udHJpbSgpO1xuICAgICAgICAgICAgYXR0ciA9IHBhcnRzWzBdLnN1YnN0cigxLCBwYXJ0c1swXS5sZW5ndGggLSAxKS50cmltKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2h0bWwnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwuaHRtbChpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3RleHQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwudGV4dChpMThuZXh0LnQ8c3RyaW5nPihrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLnRleHQoKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmICgncHJlcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgncHJlcGVuZCcsICRlbCwga2V5LCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdhcHBlbmQnLCAkZWwsIGtleSwgb3B0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXR0ci5zdGFydHNXaXRoKCdkYXRhLScpKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhQXR0ciA9IGF0dHIuc3Vic3RyKCgnZGF0YS0nKS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmRhdGEoZGF0YUF0dHIpIGFzIHN0cmluZykpO1xuICAgICAgICAgICAgJGVsLmRhdGEoZGF0YUF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCBpMThuZXh0LnQ8c3RyaW5nPihrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmF0dHIoYXR0cikgYXMgc3RyaW5nKSkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGxvY2FsaXplID0gKCRlbDogRE9NLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9ICRlbC5hdHRyKHNlbGVjdG9yQXR0cik7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgJHRhcmdldCA9ICRlbDtcbiAgICAgICAgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSAkZWwuZGF0YSh0YXJnZXRBdHRyKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKHRhcmdldFNlbGVjdG9yKSB7XG4gICAgICAgICAgICAkdGFyZ2V0ID0gJGVsLmZpbmQodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRzICYmIHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBvcHRzID0gJGVsLmRhdGEob3B0aW9uc0F0dHIpIGFzIGkxOG4uVE9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2Yga2V5LnNwbGl0KCc7JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGsgPSBwYXJ0LnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgnJyAhPT0gaykge1xuICAgICAgICAgICAgICAgIHBhcnNlKCR0YXJnZXQsIGssIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHsgLi4ub3B0cyB9O1xuICAgICAgICAgICAgZGVsZXRlIGNsb25lLmxuZztcbiAgICAgICAgICAgICRlbC5kYXRhKG9wdGlvbnNBdHRyLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlKHRoaXM6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IERPTSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbnZhbGlkLXRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIC8vIGxvY2FsaXplIGVsZW1lbnQgaXRzZWxmXG4gICAgICAgICAgICBsb2NhbGl6ZSgkZWwsIG9wdHMpO1xuICAgICAgICAgICAgLy8gbG9jYWxpemUgY2hpbGRyZW5cbiAgICAgICAgICAgIGNvbnN0ICRjaGlsZHJlbiA9ICRlbC5maW5kKGBbJHtzZWxlY3RvckF0dHJ9XWApO1xuICAgICAgICAgICAgJGNoaWxkcmVuLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGxvY2FsaXplKCQoZWwpLCBvcHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBzZWxlY3RvciBmdW5jdGlvbiAkKG15U2VsZWN0b3IpLmxvY2FsaXplKG9wdHMpO1xuICAgICQuZm5bJ2xvY2FsaXplJ10gPSBoYW5kbGU7XG59XG5cbi8qKlxuICogQGVuIGBpMThuZXh0YCBET00gbG9jYWxpemVyIGJ1aWx0LWluIHBsdWdpbiBmYWN0b3J5LlxuICogQGphIGBpMThuZXh0YCBET00g44Ot44O844Kr44Op44Kk44K644OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44OV44Kh44Kv44OI44Oq44O844Oh44K944OD44OJXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBEb21Mb2NhbGl6ZXIoZG9tT3B0aW9ucz86IGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucyk6IGkxOG4uVGhpcmRQYXJ0eU1vZHVsZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJzNyZFBhcnR5JyxcbiAgICAgICAgaW5pdDogZXh0ZW5kLmJpbmQoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3JBdHRyOiAnZGF0YS1pMThuJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRBdHRyOiAnaTE4bi10YXJnZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNBdHRyOiAnaTE4bi1vcHRpb25zJyxcbiAgICAgICAgICAgICAgICB1c2VPcHRpb25zQXR0cjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjdXN0b21UYWdOYW1lOiAnY2RwLWkxOG4nLFxuICAgICAgICAgICAgfSwgZG9tT3B0aW9ucylcbiAgICAgICAgKSxcbiAgICB9O1xufVxuIiwiZXhwb3J0ICogZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucywgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IG5hdmlnYXRvciB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IEFqYXhCYWNrZW5kLCBEb21Mb2NhbGl6ZXIgfSBmcm9tICcuL3BsdWdpbic7XG5cbi8qKlxuICogQGVuIFRyYW5zbGF0ZSBmdW5jaW9uLlxuICogQGphIOe/u+ios+mWouaVsFxuICovXG5leHBvcnQgY29uc3QgdDogaTE4bi5URnVuY3Rpb24gPSBpMThuLnQuYmluZChpMThuKTtcblxuLyoqXG4gKiBAZW4gSW5pdGlhbGl6ZSBgaTE4bmV4dGAgaW5zdGFuY2UuXG4gKiBAamEgYGkxOG5leHRgIOOCpOODs+OCueOCv+ODs+OCueOBruWIneacn+WMllxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVJMThOID0gKG9wdGlvbnM/OiBJMThOT3B0aW9ucyk6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG5vVGhyb3c6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCB7IG5hbWVzcGFjZSwgcmVzb3VyY2VQYXRoOiBsb2FkUGF0aCwgZG9tLCBub1Rocm93IH0gPSBvcHRzO1xuXG4gICAgaWYgKCFvcHRzLmxuZykge1xuICAgICAgICBvcHRzLmxuZyA9IG5hdmlnYXRvci5sYW5ndWFnZTtcbiAgICB9XG5cbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgICFvcHRzLm5zICYmIChvcHRzLm5zID0gbmFtZXNwYWNlKTtcbiAgICAgICAgIW9wdHMuZGVmYXVsdE5TICYmIChvcHRzLmRlZmF1bHROUyA9IG5hbWVzcGFjZSk7XG4gICAgfVxuXG4gICAgaWYgKGxvYWRQYXRoKSB7XG4gICAgICAgIG9wdHMuYmFja2VuZCA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aCB9LCBvcHRzLmJhY2tlbmQpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLmJhY2tlbmQpIHtcbiAgICAgICAgaTE4bi51c2UoQWpheEJhY2tlbmQpO1xuICAgIH1cblxuICAgIGkxOG4udXNlKERvbUxvY2FsaXplcihkb20pKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZvaWQgaTE4bi5pbml0KG9wdHMsIChlcnJvciwgdHJhbnNsYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9JMThOX0NPUkVfTEFZRVIsICdpMThuI2luaXQoKSBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXN1bHQubWVzc2FnZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cmFuc2xhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgZGV0ZWN0ZWQgb3Igc2V0IGxhbmd1YWdlLlxuICogQGphIOePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+iogOiqnuOCkuWPluW+l1xuICpcbiAqIEByZXR1cm5zIGBqYS1KUGAsIGBqYWBcbiAqL1xuZXhwb3J0IGNvbnN0IGdldExhbmd1YWdlID0gKCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGkxOG4ubGFuZ3VhZ2UgfHwgbmF2aWdhdG9yLmxhbmd1YWdlO1xufTtcblxuLyoqXG4gKiBAZW4gR2V0IGFuIGFycmF5IG9mIGBsYW5ndWFnZS1jb2Rlc2AgdGhhdCB3aWxsIGJlIHVzZWQgaXQgb3JkZXIgdG8gbG9va3VwIHRoZSB0cmFuc2xhdGlvbiB2YWx1ZS5cbiAqIEBqYSDnv7voqLPjga7mpJzntKLjgavkvb/nlKjjgZXjgozjgosgYGxhbmd1YWdlLWNvZGVzYCDjg6rjgrnjg4jjgpLlj5blvpdcbiAqXG4gKiBAc2VlXG4gKiAgLSBodHRwczovL3d3dy5pMThuZXh0LmNvbS9vdmVydmlldy9hcGkjbGFuZ3VhZ2VzXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRMYW5ndWFnZUxpc3QgPSAoKTogcmVhZG9ubHkgc3RyaW5nW10gPT4ge1xuICAgIHJldHVybiBpMThuLmxhbmd1YWdlcyB8fCBbbmF2aWdhdG9yLmxhbmd1YWdlXTtcbn07XG5cbi8qKlxuICogQGVuIENoYW5nZXMgdGhlIGxhbmd1YWdlLlxuICogQGphIOiogOiqnuOBruWIh+OCiuabv+OBiFxuICovXG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSAobG5nOiBzdHJpbmcsIG9wdGlvbnM/OiBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBub1Rocm93OiB0cnVlIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZvaWQgaTE4bi5jaGFuZ2VMYW5ndWFnZShsbmcsIChlcnJvciwgdHJhbnNsYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9JMThOX0NPUkVfTEFZRVIsICdpMThuI2NoYW5nZUxhbmd1YXRlKCkgZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBpZiAob3B0cy5ub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXN1bHQubWVzc2FnZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cmFuc2xhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBET00gbG9jYWxpemVyIG1ldGhvZC5cbiAqIEBqYSBET00g44Ot44O844Kr44Op44Kk44K6XG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHRyYW5zbGF0aW9uIG9wdGlvbnMuXG4gKiAgLSBgamFgIOe/u+ios+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgbG9jYWxpemUgPSA8VCBleHRlbmRzIHN0cmluZyB8IE5vZGU+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgb3B0aW9ucz86IGkxOG4uVE9wdGlvbnMpOiBET01SZXN1bHQ8VD4gPT4ge1xuICAgIHJldHVybiAkKHNlbGVjdG9yKS5sb2NhbGl6ZShvcHRpb25zKSBhcyBET01SZXN1bHQ8VD47XG59O1xuIl0sIm5hbWVzIjpbInNhZmUiLCJpc0Z1bmN0aW9uIiwidG9VcmwiLCJyZXF1ZXN0IiwicmVzdWx0IiwidG9SZXN1bHQiLCJSRVNVTFRfQ09ERSIsIiQiLCJpMThuIiwibWFrZVJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7OztJQUlHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBR0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFIRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxjQUEwQyxDQUFBO1lBQzFDLFdBQXdCLENBQUEsV0FBQSxDQUFBLHVCQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBLEdBQUEsdUJBQUEsQ0FBQTtJQUMvRyxLQUFDLEdBQUEsQ0FBQTtJQUNMLENBQUMsR0FBQTs7SUNuQkQsaUJBQXdCLE1BQU0sU0FBUyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQzs7SUNEcEU7O0lBRUc7SUFnQkg7SUFFQTs7Ozs7SUFLRztVQUNVLFdBQVcsQ0FBQTtJQUF4QixJQUFBLFdBQUEsR0FBQTtZQUNhLElBQUksQ0FBQSxJQUFBLEdBQUcsU0FBUyxDQUFDO1lBR2xCLElBQVEsQ0FBQSxRQUFBLEdBQTRCLEVBQUUsQ0FBQztZQUN2QyxJQUFZLENBQUEsWUFBQSxHQUF3QixFQUFFLENBQUM7U0E2Q2xEOzs7SUF4Q0csSUFBQSxJQUFJLENBQUMsUUFBdUIsRUFBRSxPQUFnQyxFQUFFLFdBQXdCLEVBQUE7SUFDcEYsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztJQUMxQixRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBbUIsaUNBQUEsMEJBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZGLFFBQUEsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDdkY7SUFFRCxJQUFBLElBQUksQ0FBQyxRQUFnQixFQUFFLFNBQWlCLEVBQUUsUUFBMkIsRUFBQTtZQUNqRSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQztJQUNwRCxRQUFBLE1BQU0sUUFBUSxHQUFHQyxvQkFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7SUFDMUgsUUFBQSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQWtCLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7SUFDeEUsUUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUMvQjs7O1FBS08sVUFBVSxDQUFDLFFBQWdCLEVBQUUsSUFBa0MsRUFBQTtJQUNuRSxRQUFBLE9BQU9DLGNBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFVLEVBQUUsU0FBVSxDQUFDLENBQUMsQ0FBQztTQUNqRztRQUVPLE9BQU8sQ0FBQyxHQUFXLEVBQUUsUUFBc0YsRUFBQTtZQUMvRyxLQUFLLENBQUMsWUFBVztnQkFDYixJQUFJO0lBQ0EsZ0JBQUEsTUFBTSxJQUFJLEdBQUcsTUFBTUMsWUFBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELGdCQUFBLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEIsYUFBQTtJQUFDLFlBQUEsT0FBTyxDQUFDLEVBQUU7SUFDUixnQkFBQSxNQUFNQyxRQUFNLEdBQUdDLGVBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDM0IsTUFBTSxHQUFHLEdBQUcsQ0FBbUIsZ0JBQUEsRUFBQSxHQUFHLEtBQUtELFFBQU0sQ0FBQyxPQUFPLENBQUEsQ0FBRSxDQUFDO29CQUN4RCxJQUFJRSxrQkFBVyxDQUFDLG1CQUFtQixLQUFLRixRQUFNLENBQUMsSUFBSSxJQUFJQSxRQUFNLENBQUMsS0FBSyxFQUFFO0lBQ2pFLG9CQUFBLE1BQU0sTUFBTSxHQUFXQSxRQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUMzQyxvQkFBQSxJQUFJLEdBQUcsSUFBSSxNQUFNLElBQUksTUFBTSxHQUFHLEdBQUcsRUFBRTs0QkFDL0IsT0FBTyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlCLHFCQUFBO0lBQU0seUJBQUEsSUFBSSxHQUFHLElBQUksTUFBTSxJQUFJLE1BQU0sR0FBRyxHQUFHLEVBQUU7NEJBQ3RDLE9BQU8sUUFBUSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMvQixxQkFBQTtJQUNKLGlCQUFBO0lBQ0QsZ0JBQUEsUUFBUSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4QixhQUFBO2FBQ0osR0FBRyxDQUFDO1NBQ1I7O0lBL0NNLFdBQUksQ0FBQSxJQUFBLEdBQUcsU0FBUzs7SUNwQjNCO0lBQ0EsU0FBUyxNQUFNLENBQUMsVUFBOEMsRUFBRSxPQUFrQixFQUFBO0lBQzlFLElBQUEsTUFBTSxFQUNGLFlBQVksRUFDWixVQUFVLEVBQ1YsV0FBVyxFQUNYLGNBQWMsRUFDZCw0QkFBNEIsRUFDNUIsYUFBYSxHQUNoQixHQUFHLFVBQVUsQ0FBQztJQUVmLElBQUEsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFjLEVBQUUsR0FBVyxLQUFpQjtZQUMvRCxJQUFJLENBQUMsNEJBQTRCLEVBQUU7SUFDL0IsWUFBQSxPQUFPLENBQUMsQ0FBQztJQUNaLFNBQUE7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO0lBQzlDLEtBQUMsQ0FBQzs7UUFHRixNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQTRCLEVBQUUsR0FBUSxFQUFFLEdBQVcsRUFBRSxJQUFtQixLQUFVO0lBQzlGLFFBQUEsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ25FLElBQUksS0FBSyxLQUFLLGFBQWEsRUFBRTtJQUN6QixZQUFBLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzQixTQUFBO0lBQU0sYUFBQTtnQkFDSCxNQUFNLGtCQUFrQixHQUFHLENBQUksQ0FBQSxFQUFBLGFBQWEsSUFBSSxVQUFVLENBQUEsRUFBQSxFQUFLLGFBQWEsQ0FBQSxDQUFBLENBQUcsQ0FBQztnQkFDaEYsTUFBTSxXQUFXLEdBQUdHLE9BQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQVEsQ0FBQztJQUN2RCxZQUFBLElBQUksV0FBVyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBRTtJQUMvQixnQkFBQSxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0MsYUFBQTtJQUFNLGlCQUFBO0lBQ0gsZ0JBQUEsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDbkMsYUFBQTtJQUNKLFNBQUE7SUFDTCxLQUFDLENBQUM7UUFFRixNQUFNLEtBQUssR0FBRyxDQUFDLEdBQVEsRUFBRSxHQUFXLEVBQUUsSUFBbUIsS0FBVTtZQUMvRCxJQUFJLElBQUksR0FBRyxNQUFNLENBQUM7SUFFbEIsUUFBQSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3JCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzdCLEdBQUcsR0FBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3pELFNBQUE7WUFFRCxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0QsU0FBQTtpQkFBTSxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBUyxHQUFHLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckUsU0FBQTtpQkFBTSxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7Z0JBQzNCLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyQyxTQUFBO2lCQUFNLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDMUIsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BDLFNBQUE7SUFBTSxhQUFBLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUNqQyxZQUFBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQVcsQ0FBQyxDQUFDLENBQUM7SUFDckYsWUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMvQixZQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzlCLFNBQUE7SUFBTSxhQUFBO2dCQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQVMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6RixTQUFBO0lBQ0wsS0FBQyxDQUFDO0lBRUYsSUFBQSxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQVEsRUFBRSxJQUFtQixLQUFVO1lBQ3JELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDTixPQUFPO0lBQ1YsU0FBQTtZQUVELElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQztZQUNsQixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBVyxDQUFDO0lBRXRELFFBQUEsSUFBSSxjQUFjLEVBQUU7SUFDaEIsWUFBQSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN0QyxTQUFBO0lBRUQsUUFBQSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksS0FBSyxjQUFjLEVBQUU7SUFDbEMsWUFBQSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQWtCLENBQUM7SUFDakQsU0FBQTtJQUVELFFBQUEsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFFbEIsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQy9CLFlBQUEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN0QixJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7SUFDVixnQkFBQSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzQixhQUFBO0lBQ0osU0FBQTtZQUVELElBQUksSUFBSSxLQUFLLGNBQWMsRUFBRTtJQUN6QixZQUFBLE1BQU0sS0FBSyxHQUFHLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ2pCLFlBQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEMsU0FBQTtJQUNMLEtBQUMsQ0FBQztRQUVGLFNBQVMsTUFBTSxDQUFZLElBQW1CLEVBQUE7O1lBRTFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQWEsRUFBRSxFQUFlLEtBQUk7SUFDaEQsWUFBQSxNQUFNLEdBQUcsR0FBR0EsT0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDOztJQUVsQixZQUFBLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7O2dCQUVwQixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUksQ0FBQSxFQUFBLFlBQVksQ0FBRyxDQUFBLENBQUEsQ0FBQyxDQUFDO2dCQUNoRCxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBYSxFQUFFLEVBQWUsS0FBSTtvQkFDOUMsUUFBUSxDQUFDQSxPQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUIsYUFBQyxDQUFDLENBQUM7SUFDUCxTQUFDLENBQUMsQ0FBQztTQUNOOztJQUdELElBQUFBLE9BQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7Ozs7SUFLRztJQUNHLFNBQVUsWUFBWSxDQUFDLFVBQXFDLEVBQUE7UUFDOUQsT0FBTztJQUNILFFBQUEsSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQ2IsSUFBSSxFQUNKLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDVixZQUFBLFlBQVksRUFBRSxXQUFXO0lBQ3pCLFlBQUEsVUFBVSxFQUFFLGFBQWE7SUFDekIsWUFBQSxXQUFXLEVBQUUsY0FBYztJQUMzQixZQUFBLGNBQWMsRUFBRSxLQUFLO0lBQ3JCLFlBQUEsNEJBQTRCLEVBQUUsSUFBSTtJQUNsQyxZQUFBLGFBQWEsRUFBRSxVQUFVO2FBQzVCLEVBQUUsVUFBVSxDQUFDLENBQ2pCO1NBQ0osQ0FBQztJQUNOOztJQ2pJQTs7O0lBR0c7QUFDSSxVQUFNLENBQUMsR0FBbUJDLGtCQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQ0Esa0JBQUksRUFBRTtJQUVuRDs7Ozs7OztJQU9HO0FBQ1UsVUFBQSxjQUFjLEdBQUcsQ0FBQyxPQUFxQixLQUE2QjtJQUM3RSxJQUFBLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFdkQsSUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQztJQUVqRSxJQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ1gsUUFBQSxJQUFJLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUM7SUFDakMsS0FBQTtJQUVELElBQUEsSUFBSSxTQUFTLEVBQUU7WUFDWCxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztZQUNsQyxDQUFDLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsQ0FBQztJQUNuRCxLQUFBO0lBRUQsSUFBQSxJQUFJLFFBQVEsRUFBRTtJQUNWLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzVELEtBQUE7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDZCxRQUFBQSxrQkFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN6QixLQUFBO1FBRURBLGtCQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRTVCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxLQUFJO1lBQ25DLEtBQUtBLGtCQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxVQUFVLEtBQUk7SUFDdkMsWUFBQSxJQUFJLEtBQUssRUFBRTtJQUNQLGdCQUFBLE1BQU1KLFFBQU0sR0FBR0ssaUJBQVUsQ0FBQ0gsa0JBQVcsQ0FBQyxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzRixnQkFBQSxJQUFJLE9BQU8sRUFBRTt3QkFDVCxPQUFPLENBQUMsSUFBSSxDQUFDRixRQUFNLENBQUMsT0FBTyxFQUFFQSxRQUFNLENBQUMsQ0FBQztJQUN4QyxpQkFBQTtJQUFNLHFCQUFBO0lBQ0gsb0JBQUEsT0FBTyxNQUFNLENBQUNBLFFBQU0sQ0FBQyxDQUFDO0lBQ3pCLGlCQUFBO0lBQ0osYUFBQTtnQkFDRCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEIsU0FBQyxDQUFDLENBQUM7SUFDUCxLQUFDLENBQUMsQ0FBQztJQUNQLEVBQUU7SUFFRjs7Ozs7SUFLRztBQUNJLFVBQU0sV0FBVyxHQUFHLE1BQWE7SUFDcEMsSUFBQSxPQUFPSSxrQkFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDO0lBQy9DLEVBQUU7SUFFRjs7Ozs7O0lBTUc7QUFDSSxVQUFNLGVBQWUsR0FBRyxNQUF3QjtRQUNuRCxPQUFPQSxrQkFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsRCxFQUFFO0lBRUY7OztJQUdHO1VBQ1UsY0FBYyxHQUFHLENBQUMsR0FBVyxFQUFFLE9BQWtDLEtBQTZCO0lBQ3ZHLElBQUEsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSTtZQUNuQyxLQUFLQSxrQkFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxLQUFJO0lBQ2hELFlBQUEsSUFBSSxLQUFLLEVBQUU7SUFDUCxnQkFBQSxNQUFNSixRQUFNLEdBQUdLLGlCQUFVLENBQUNILGtCQUFXLENBQUMscUJBQXFCLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ3JHLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDZCxPQUFPLENBQUMsSUFBSSxDQUFDRixRQUFNLENBQUMsT0FBTyxFQUFFQSxRQUFNLENBQUMsQ0FBQztJQUN4QyxpQkFBQTtJQUFNLHFCQUFBO0lBQ0gsb0JBQUEsT0FBTyxNQUFNLENBQUNBLFFBQU0sQ0FBQyxDQUFDO0lBQ3pCLGlCQUFBO0lBQ0osYUFBQTtnQkFDRCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEIsU0FBQyxDQUFDLENBQUM7SUFDUCxLQUFDLENBQUMsQ0FBQztJQUNQLEVBQUU7SUFFRjs7Ozs7Ozs7OztJQVVHO1VBQ1UsUUFBUSxHQUFHLENBQTBCLFFBQXdCLEVBQUUsT0FBdUIsS0FBa0I7UUFDakgsT0FBT0csT0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQWlCLENBQUM7SUFDekQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvaTE4bi8ifQ==
