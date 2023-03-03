/*!
 * @cdp/i18n 0.9.16
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
         * @ja 拡張エラーコード定義
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
            get: function () { return extensionI18n[k]; }
        });
    });

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBuYXZpZ2F0b3IgPSBzYWZlKGdsb2JhbFRoaXMubmF2aWdhdG9yKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvbixcbiAqL1xuXG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCB0b1Jlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHJlcXVlc3QgfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHsgdG9VcmwgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHQge1xuICAgIExPQURfUEFUSCA9ICdyZXMvbG9jYWxlcy97e25zfX0ue3tsbmd9fS5qc29uJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIEZhbGxiYWNrUmVzb3VyY2VNYXAgPSB7IFtsbmc6IHN0cmluZ106IHN0cmluZzsgfTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBhIHNpbXBsZSBgaTE4bmV4dGAgYmFja2VuZCBidWlsdC1pbiBwbHVnaW4uIEl0IHdpbGwgbG9hZCByZXNvdXJjZXMgZnJvbSBhIGJhY2tlbmQgc2VydmVyIHVzaW5nIHRoZSBgZmV0Y2hgIEFQSS5cbiAqIEBqYSBgZmV0Y2hgIEFQSSDjgpLnlKjjgYTjgZ8gYGkxOG5leHRgIGJhY2tlbmQg44OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44Kv44Op44K5XG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjbGFzcyBBamF4QmFja2VuZCBpbXBsZW1lbnRzIGkxOG4uQmFja2VuZE1vZHVsZTxpMThuLkFqYXhCYWNrZW5kT3B0aW9ucz4ge1xuICAgIHJlYWRvbmx5IHR5cGUgPSAnYmFja2VuZCc7XG4gICAgc3RhdGljIHR5cGUgPSAnYmFja2VuZCc7XG4gICAgcHJpdmF0ZSBfc2VydmljZXMhOiBpMThuLlNlcnZpY2VzO1xuICAgIHByaXZhdGUgX29wdGlvbnM6IGkxOG4uQWpheEJhY2tlbmRPcHRpb25zID0ge307XG4gICAgcHJpdmF0ZSBfZmFsbGJhY2tNYXA6IEZhbGxiYWNrUmVzb3VyY2VNYXAgPSB7fTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IGkxOG4uQmFja2VuZE1vZHVsZTxBamF4QmFja2VuZE9wdGlvbnM+XG5cbiAgICBpbml0KHNlcnZpY2VzOiBpMThuLlNlcnZpY2VzLCBvcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucywgaW5pdE9wdGlvbnM6IEkxOE5PcHRpb25zKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3NlcnZpY2VzID0gc2VydmljZXM7XG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSBPYmplY3QuYXNzaWduKHsgbG9hZFBhdGg6IERlZmF1bHQuTE9BRF9QQVRIIH0sIHRoaXMuX29wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9mYWxsYmFja01hcCA9IE9iamVjdC5hc3NpZ24odGhpcy5fZmFsbGJhY2tNYXAsIGluaXRPcHRpb25zLmZhbGxiYWNrUmVzb3VyY2VzKTtcbiAgICB9XG5cbiAgICByZWFkKGxhbmd1YWdlOiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBjYWxsYmFjazogaTE4bi5SZWFkQ2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbG5nID0gdGhpcy5fZmFsbGJhY2tNYXBbbGFuZ3VhZ2VdIHx8IGxhbmd1YWdlO1xuICAgICAgICBjb25zdCBsb2FkUGF0aCA9IGlzRnVuY3Rpb24odGhpcy5fb3B0aW9ucy5sb2FkUGF0aCkgPyB0aGlzLl9vcHRpb25zLmxvYWRQYXRoKFtsbmddLCBbbmFtZXNwYWNlXSkgOiB0aGlzLl9vcHRpb25zLmxvYWRQYXRoO1xuICAgICAgICBjb25zdCB1cmwgPSB0aGlzLnJlc29sdmVVcmwobG9hZFBhdGggYXMgc3RyaW5nLCB7IGxuZywgbnM6IG5hbWVzcGFjZSB9KTtcbiAgICAgICAgdGhpcy5sb2FkVXJsKHVybCwgY2FsbGJhY2spO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIHByaXZhdGUgcmVzb2x2ZVVybChsb2FkUGF0aDogc3RyaW5nLCBkYXRhOiB7IGxuZzogc3RyaW5nOyBuczogc3RyaW5nOyB9KTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvVXJsKHRoaXMuX3NlcnZpY2VzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShsb2FkUGF0aCwgZGF0YSwgdW5kZWZpbmVkISwgdW5kZWZpbmVkISkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9hZFVybCh1cmw6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IGkxOG4uQ2FsbGJhY2tFcnJvciB8IHN0cmluZywgZGF0YTogaTE4bi5SZXNvdXJjZUtleSB8IGJvb2xlYW4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgcmVxdWVzdC5qc29uKHVybCwgdGhpcy5fb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwganNvbik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYGZhaWxlZCBsb2FkaW5nOiAke3VybH0sICR7cmVzdWx0Lm1lc3NhZ2V9YDtcbiAgICAgICAgICAgICAgICBpZiAoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSA9PT0gcmVzdWx0LmNvZGUgJiYgcmVzdWx0LmNhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3RhdHVzIH0gPSByZXN1bHQuY2F1c2UgYXMgeyBzdGF0dXM6IG51bWJlcjsgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDUwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNjAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCB0cnVlKTsgIC8vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoNDAwIDw9IHN0YXR1cyAmJiBzdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2csIGZhbHNlKTsgLy8gbm8gcmV0cnlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhtc2csIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGRvbSBhcyAkLFxuICAgIERPTSxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0ICcuL21vZHVsZS1leHRlbmRzJztcblxuLyoqIEBpbnRlcm5hbCBleHRlbmRzIFtbRE9NXV0gaW5zdGFuY2UgbWV0aG9kICovXG5mdW5jdGlvbiBleHRlbmQoZG9tT3B0aW9uczogUmVxdWlyZWQ8aTE4bi5Eb21Mb2NhbGl6ZXJPcHRpb25zPiwgaTE4bmV4dDogaTE4bi5pMThuKTogdm9pZCB7XG4gICAgY29uc3Qge1xuICAgICAgICBzZWxlY3RvckF0dHIsXG4gICAgICAgIHRhcmdldEF0dHIsXG4gICAgICAgIG9wdGlvbnNBdHRyLFxuICAgICAgICB1c2VPcHRpb25zQXR0cixcbiAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudCxcbiAgICAgICAgY3VzdG9tVGFnTmFtZSxcbiAgICB9ID0gZG9tT3B0aW9ucztcblxuICAgIGNvbnN0IGV4dGVuZERlZmF1bHQgPSAobzogUGxhaW5PYmplY3QsIHZhbDogc3RyaW5nKTogUGxhaW5PYmplY3QgPT4ge1xuICAgICAgICBpZiAoIXBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IC4uLm8sIC4uLnsgZGVmYXVsdFZhbHVlOiB2YWwgfSB9O1xuICAgIH07XG5cbiAgICAvLyBbcHJlcGVuZF0vW2FwcGVuZF0gaGVscGVyXG4gICAgY29uc3QgaW5zZXJ0ID0gKG1ldGhvZDogJ3ByZXBlbmQnIHwgJ2FwcGVuZCcsICRlbDogRE9NLCBrZXk6IHN0cmluZywgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCB0cmFuc2xhdGVkID0gaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuaHRtbCgpKSk7XG4gICAgICAgIGlmIChmYWxzZSA9PT0gY3VzdG9tVGFnTmFtZSkge1xuICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkV2l0aFdyYXAgPSBgPCR7Y3VzdG9tVGFnTmFtZX0+JHt0cmFuc2xhdGVkfTwvJHtjdXN0b21UYWdOYW1lfT5gO1xuICAgICAgICAgICAgY29uc3QgJGZpcnN0Q2hpbGQgPSAkKCRlbFswXS5maXJzdEVsZW1lbnRDaGlsZCkgYXMgRE9NO1xuICAgICAgICAgICAgaWYgKCRmaXJzdENoaWxkLmlzKGN1c3RvbVRhZ05hbWUpKSB7XG4gICAgICAgICAgICAgICAgJGZpcnN0Q2hpbGQucmVwbGFjZVdpdGgodHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBwYXJzZSA9ICgkZWw6IERPTSwga2V5OiBzdHJpbmcsIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgbGV0IGF0dHIgPSAndGV4dCc7XG5cbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCddJyk7XG4gICAgICAgICAgICBrZXkgID0gcGFydHNbMV0udHJpbSgpO1xuICAgICAgICAgICAgYXR0ciA9IHBhcnRzWzBdLnN1YnN0cigxLCBwYXJ0c1swXS5sZW5ndGggLSAxKS50cmltKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2h0bWwnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwuaHRtbChpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3RleHQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwudGV4dChpMThuZXh0LnQ8c3RyaW5nPihrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLnRleHQoKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmICgncHJlcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgncHJlcGVuZCcsICRlbCwga2V5LCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdhcHBlbmQnLCAkZWwsIGtleSwgb3B0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXR0ci5zdGFydHNXaXRoKCdkYXRhLScpKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhQXR0ciA9IGF0dHIuc3Vic3RyKCgnZGF0YS0nKS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmRhdGEoZGF0YUF0dHIpIGFzIHN0cmluZykpO1xuICAgICAgICAgICAgJGVsLmRhdGEoZGF0YUF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCBpMThuZXh0LnQ8c3RyaW5nPihrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmF0dHIoYXR0cikgYXMgc3RyaW5nKSkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGxvY2FsaXplID0gKCRlbDogRE9NLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9ICRlbC5hdHRyKHNlbGVjdG9yQXR0cik7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgJHRhcmdldCA9ICRlbDtcbiAgICAgICAgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSAkZWwuZGF0YSh0YXJnZXRBdHRyKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKHRhcmdldFNlbGVjdG9yKSB7XG4gICAgICAgICAgICAkdGFyZ2V0ID0gJGVsLmZpbmQodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRzICYmIHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBvcHRzID0gJGVsLmRhdGEob3B0aW9uc0F0dHIpIGFzIGkxOG4uVE9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2Yga2V5LnNwbGl0KCc7JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGsgPSBwYXJ0LnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgnJyAhPT0gaykge1xuICAgICAgICAgICAgICAgIHBhcnNlKCR0YXJnZXQsIGssIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHsgLi4ub3B0cyB9O1xuICAgICAgICAgICAgZGVsZXRlIGNsb25lLmxuZztcbiAgICAgICAgICAgICRlbC5kYXRhKG9wdGlvbnNBdHRyLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlKHRoaXM6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IERPTSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbnZhbGlkLXRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJvb3Qgb2YgJC51dGlscy5yb290aWZ5KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQocm9vdCk7XG4gICAgICAgICAgICAgICAgLy8gbG9jYWxpemUgZWxlbWVudCBpdHNlbGZcbiAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkZWwsIG9wdHMpO1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsaXplIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgY29uc3QgJGNoaWxkcmVuID0gJGVsLmZpbmQoYFske3NlbGVjdG9yQXR0cn1dYCk7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkKGVsKSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNlbGVjdG9yIGZ1bmN0aW9uICQobXlTZWxlY3RvcikubG9jYWxpemUob3B0cyk7XG4gICAgJC5mblsnbG9jYWxpemUnXSA9IGhhbmRsZTtcbn1cblxuLyoqXG4gKiBAZW4gYGkxOG5leHRgIERPTSBsb2NhbGl6ZXIgYnVpbHQtaW4gcGx1Z2luIGZhY3RvcnkuXG4gKiBAamEgYGkxOG5leHRgIERPTSDjg63jg7zjgqvjg6njgqTjgrrjg5Pjg6vjg4jjgqTjg7Pjg5fjg6njgrDjgqTjg7Pjg5XjgqHjgq/jg4jjg6rjg7zjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIERvbUxvY2FsaXplcihkb21PcHRpb25zPzogaTE4bi5Eb21Mb2NhbGl6ZXJPcHRpb25zKTogaTE4bi5UaGlyZFBhcnR5TW9kdWxlIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnM3JkUGFydHknLFxuICAgICAgICBpbml0OiBleHRlbmQuYmluZChcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvckF0dHI6ICdkYXRhLWkxOG4nLFxuICAgICAgICAgICAgICAgIHRhcmdldEF0dHI6ICdpMThuLXRhcmdldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uc0F0dHI6ICdpMThuLW9wdGlvbnMnLFxuICAgICAgICAgICAgICAgIHVzZU9wdGlvbnNBdHRyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50OiB0cnVlLFxuICAgICAgICAgICAgICAgIGN1c3RvbVRhZ05hbWU6ICdjZHAtaTE4bicsXG4gICAgICAgICAgICB9LCBkb21PcHRpb25zKVxuICAgICAgICApLFxuICAgIH07XG59XG4iLCJleHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IEkxOE5PcHRpb25zLCBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgbmF2aWdhdG9yIH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgQWpheEJhY2tlbmQsIERvbUxvY2FsaXplciB9IGZyb20gJy4vcGx1Z2luJztcblxuLyoqXG4gKiBAZW4gVHJhbnNsYXRlIGZ1bmNpb24uXG4gKiBAamEg57+76Kiz6Zai5pWwXG4gKi9cbmV4cG9ydCBjb25zdCB0OiBpMThuLlRGdW5jdGlvbiA9IGkxOG4udC5iaW5kKGkxOG4pO1xuXG4vKipcbiAqIEBlbiBJbml0aWFsaXplIGBpMThuZXh0YCBpbnN0YW5jZS5cbiAqIEBqYSBgaTE4bmV4dGAg44Kk44Oz44K544K/44Oz44K544Gu5Yid5pyf5YyWXG4gKlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgaW5pdCBvcHRpb25zXG4gKiAgLSBgamFgIOWIneacn+WMluOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgaW5pdGlhbGl6ZUkxOE4gPSAob3B0aW9ucz86IEkxOE5PcHRpb25zKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4gPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbm9UaHJvdzogdHJ1ZSB9LCBvcHRpb25zKTtcblxuICAgIGNvbnN0IHsgbmFtZXNwYWNlLCByZXNvdXJjZVBhdGg6IGxvYWRQYXRoLCBkb20sIG5vVGhyb3cgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW9wdHMubG5nKSB7XG4gICAgICAgIG9wdHMubG5nID0gbmF2aWdhdG9yLmxhbmd1YWdlO1xuICAgIH1cblxuICAgIGlmIChuYW1lc3BhY2UpIHtcbiAgICAgICAgIW9wdHMubnMgJiYgKG9wdHMubnMgPSBuYW1lc3BhY2UpO1xuICAgICAgICAhb3B0cy5kZWZhdWx0TlMgJiYgKG9wdHMuZGVmYXVsdE5TID0gbmFtZXNwYWNlKTtcbiAgICB9XG5cbiAgICBpZiAobG9hZFBhdGgpIHtcbiAgICAgICAgb3B0cy5iYWNrZW5kID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoIH0sIG9wdHMuYmFja2VuZCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdHMuYmFja2VuZCkge1xuICAgICAgICBpMThuLnVzZShBamF4QmFja2VuZCk7XG4gICAgfVxuXG4gICAgaTE4bi51c2UoRG9tTG9jYWxpemVyKGRvbSkpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdm9pZCBpMThuLmluaXQob3B0cywgKGVycm9yLCB0cmFuc2xhdG9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0kxOE5fQ09SRV9MQVlFUiwgJ2kxOG4jaW5pdCgpIGZhaWxlZC4nLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgaWYgKG5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHJlc3VsdC5tZXNzYWdlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHRyYW5zbGF0b3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIEdldCB0aGUgY3VycmVudCBkZXRlY3RlZCBvciBzZXQgbGFuZ3VhZ2UuXG4gKiBAamEg54++5Zyo6Kit5a6a44GV44KM44Gm44GE44KL6KiA6Kqe44KS5Y+W5b6XXG4gKlxuICogQHJldHVybnMgYGphLUpQYCwgYGphYFxuICovXG5leHBvcnQgY29uc3QgZ2V0TGFuZ3VhZ2UgPSAoKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gaTE4bi5sYW5ndWFnZSB8fCBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgYW4gYXJyYXkgb2YgYGxhbmd1YWdlLWNvZGVzYCB0aGF0IHdpbGwgYmUgdXNlZCBpdCBvcmRlciB0byBsb29rdXAgdGhlIHRyYW5zbGF0aW9uIHZhbHVlLlxuICogQGphIOe/u+ios+OBruaknOe0ouOBq+S9v+eUqOOBleOCjOOCiyBgbGFuZ3VhZ2UtY29kZXNgIOODquOCueODiOOCkuWPluW+l1xuICpcbiAqIEBzZWVcbiAqICAtIGh0dHBzOi8vd3d3LmkxOG5leHQuY29tL292ZXJ2aWV3L2FwaSNsYW5ndWFnZXNcbiAqL1xuZXhwb3J0IGNvbnN0IGdldExhbmd1YWdlTGlzdCA9ICgpOiByZWFkb25seSBzdHJpbmdbXSA9PiB7XG4gICAgcmV0dXJuIGkxOG4ubGFuZ3VhZ2VzIHx8IFtuYXZpZ2F0b3IubGFuZ3VhZ2VdO1xufTtcblxuLyoqXG4gKiBAZW4gQ2hhbmdlcyB0aGUgbGFuZ3VhZ2UuXG4gKiBAamEg6KiA6Kqe44Gu5YiH44KK5pu/44GIXG4gKi9cbmV4cG9ydCBjb25zdCBjaGFuZ2VMYW5ndWFnZSA9IChsbmc6IHN0cmluZywgb3B0aW9ucz86IEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cik6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG5vVGhyb3c6IHRydWUgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdm9pZCBpMThuLmNoYW5nZUxhbmd1YWdlKGxuZywgKGVycm9yLCB0cmFuc2xhdG9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0kxOE5fQ09SRV9MQVlFUiwgJ2kxOG4jY2hhbmdlTGFuZ3VhdGUoKSBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRzLm5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHJlc3VsdC5tZXNzYWdlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHRyYW5zbGF0b3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIERPTSBsb2NhbGl6ZXIgbWV0aG9kLlxuICogQGphIERPTSDjg63jg7zjgqvjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdHJhbnNsYXRpb24gb3B0aW9ucy5cbiAqICAtIGBqYWAg57+76Kiz44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBsb2NhbGl6ZSA9IDxUIGV4dGVuZHMgc3RyaW5nIHwgTm9kZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBvcHRpb25zPzogaTE4bi5UT3B0aW9ucyk6IERPTVJlc3VsdDxUPiA9PiB7XG4gICAgcmV0dXJuICQoc2VsZWN0b3IpLmxvY2FsaXplKG9wdGlvbnMpIGFzIERPTVJlc3VsdDxUPjtcbn07XG4iXSwibmFtZXMiOlsic2FmZSIsImlzRnVuY3Rpb24iLCJ0b1VybCIsInJlcXVlc3QiLCJyZXN1bHQiLCJ0b1Jlc3VsdCIsIlJFU1VMVF9DT0RFIiwiJCIsImkxOG4iLCJtYWtlUmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7O0lBSUc7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUhELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGNBQTBDLENBQUE7WUFDMUMsV0FBd0IsQ0FBQSxXQUFBLENBQUEsdUJBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDhCQUF1QixDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUEsR0FBQSx1QkFBQSxDQUFBO0lBQy9HLEtBQUMsR0FBQSxDQUFBO0lBQ0wsQ0FBQyxHQUFBOztJQ25CRCxpQkFBd0IsTUFBTSxTQUFTLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDOztJQ0RwRTs7SUFFRztJQWdCSDtJQUVBOzs7OztJQUtHO1VBQ1UsV0FBVyxDQUFBO1FBQ1gsSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUMxQixJQUFBLE9BQU8sSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUNoQixJQUFBLFNBQVMsQ0FBaUI7UUFDMUIsUUFBUSxHQUE0QixFQUFFLENBQUM7UUFDdkMsWUFBWSxHQUF3QixFQUFFLENBQUM7OztJ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QUMsSUFBSSxDQUFDRixRQUFNLENBQUMsT0FBTyxFQUFFQSxRQUFNLENBQUMsQ0FBQztJQUN4QyxpQkFBQTtJQUFNLHFCQUFBO0lBQ0gsb0JBQUEsT0FBTyxNQUFNLENBQUNBLFFBQU0sQ0FBQyxDQUFDO0lBQ3pCLGlCQUFBO0lBQ0osYUFBQTtnQkFDRCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEIsU0FBQyxDQUFDLENBQUM7SUFDUCxLQUFDLENBQUMsQ0FBQztJQUNQLEVBQUU7SUFFRjs7Ozs7SUFLRztBQUNJLFVBQU0sV0FBVyxHQUFHLE1BQWE7SUFDcEMsSUFBQSxPQUFPSSxrQkFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDO0lBQy9DLEVBQUU7SUFFRjs7Ozs7O0lBTUc7QUFDSSxVQUFNLGVBQWUsR0FBRyxNQUF3QjtRQUNuRCxPQUFPQSxrQkFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsRCxFQUFFO0lBRUY7OztJQUdHO1VBQ1UsY0FBYyxHQUFHLENBQUMsR0FBVyxFQUFFLE9BQWtDLEtBQTZCO0lBQ3ZHLElBQUEsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSTtZQUNuQyxLQUFLQSxrQkFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxLQUFJO0lBQ2hELFlBQUEsSUFBSSxLQUFLLEVBQUU7SUFDUCxnQkFBQSxNQUFNSixRQUFNLEdBQUdLLGlCQUFVLENBQUNILGtCQUFXLENBQUMscUJBQXFCLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ3JHLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDZCxPQUFPLENBQUMsSUFBSSxDQUFDRixRQUFNLENBQUMsT0FBTyxFQUFFQSxRQUFNLENBQUMsQ0FBQztJQUN4QyxpQkFBQTtJQUFNLHFCQUFBO0lBQ0gsb0JBQUEsT0FBTyxNQUFNLENBQUNBLFFBQU0sQ0FBQyxDQUFDO0lBQ3pCLGlCQUFBO0lBQ0osYUFBQTtnQkFDRCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEIsU0FBQyxDQUFDLENBQUM7SUFDUCxLQUFDLENBQUMsQ0FBQztJQUNQLEVBQUU7SUFFRjs7Ozs7Ozs7OztJQVVHO1VBQ1UsUUFBUSxHQUFHLENBQTBCLFFBQXdCLEVBQUUsT0FBdUIsS0FBa0I7UUFDakgsT0FBT0csT0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQWlCLENBQUM7SUFDekQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvaTE4bi8ifQ==