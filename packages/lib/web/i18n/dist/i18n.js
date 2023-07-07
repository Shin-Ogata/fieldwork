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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBuYXZpZ2F0b3IgPSBzYWZlKGdsb2JhbFRoaXMubmF2aWdhdG9yKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvbixcbiAqL1xuXG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCB0b1Jlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHJlcXVlc3QgfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHsgdG9VcmwgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyBJMThOT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHQge1xuICAgIExPQURfUEFUSCA9ICdyZXMvbG9jYWxlcy97e25zfX0ue3tsbmd9fS5qc29uJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIEZhbGxiYWNrUmVzb3VyY2VNYXAgPSB7IFtsbmc6IHN0cmluZ106IHN0cmluZzsgfTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBhIHNpbXBsZSBgaTE4bmV4dGAgYmFja2VuZCBidWlsdC1pbiBwbHVnaW4uIEl0IHdpbGwgbG9hZCByZXNvdXJjZXMgZnJvbSBhIGJhY2tlbmQgc2VydmVyIHVzaW5nIHRoZSBgZmV0Y2hgIEFQSS5cbiAqIEBqYSBgZmV0Y2hgIEFQSSDjgpLnlKjjgYTjgZ8gYGkxOG5leHRgIGJhY2tlbmQg44OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44Kv44Op44K5XG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjbGFzcyBBamF4QmFja2VuZCBpbXBsZW1lbnRzIGkxOG4uQmFja2VuZE1vZHVsZTxpMThuLkFqYXhCYWNrZW5kT3B0aW9ucz4ge1xuICAgIHJlYWRvbmx5IHR5cGUgPSAnYmFja2VuZCc7XG4gICAgc3RhdGljIHR5cGUgPSAnYmFja2VuZCc7XG4gICAgcHJpdmF0ZSBfc2VydmljZXMhOiBpMThuLlNlcnZpY2VzO1xuICAgIHByaXZhdGUgX29wdGlvbnM6IGkxOG4uQWpheEJhY2tlbmRPcHRpb25zID0ge307XG4gICAgcHJpdmF0ZSBfZmFsbGJhY2tNYXA6IEZhbGxiYWNrUmVzb3VyY2VNYXAgPSB7fTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IGkxOG4uQmFja2VuZE1vZHVsZTxBamF4QmFja2VuZE9wdGlvbnM+XG5cbiAgICBpbml0KHNlcnZpY2VzOiBpMThuLlNlcnZpY2VzLCBvcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucywgaW5pdE9wdGlvbnM6IEkxOE5PcHRpb25zKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3NlcnZpY2VzID0gc2VydmljZXM7XG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSBPYmplY3QuYXNzaWduKHsgbG9hZFBhdGg6IERlZmF1bHQuTE9BRF9QQVRIIH0sIHRoaXMuX29wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9mYWxsYmFja01hcCA9IE9iamVjdC5hc3NpZ24odGhpcy5fZmFsbGJhY2tNYXAsIGluaXRPcHRpb25zLmZhbGxiYWNrUmVzb3VyY2VzKTtcbiAgICB9XG5cbiAgICByZWFkKGxhbmd1YWdlOiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBjYWxsYmFjazogaTE4bi5SZWFkQ2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbG5nID0gdGhpcy5fZmFsbGJhY2tNYXBbbGFuZ3VhZ2VdIHx8IGxhbmd1YWdlO1xuICAgICAgICBjb25zdCBsb2FkUGF0aCA9IGlzRnVuY3Rpb24odGhpcy5fb3B0aW9ucy5sb2FkUGF0aCkgPyB0aGlzLl9vcHRpb25zLmxvYWRQYXRoKFtsbmddLCBbbmFtZXNwYWNlXSkgOiB0aGlzLl9vcHRpb25zLmxvYWRQYXRoO1xuICAgICAgICBjb25zdCB1cmwgPSB0aGlzLnJlc29sdmVVcmwobG9hZFBhdGggYXMgc3RyaW5nLCB7IGxuZywgbnM6IG5hbWVzcGFjZSB9KTtcbiAgICAgICAgdGhpcy5sb2FkVXJsKHVybCwgY2FsbGJhY2spO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIHByaXZhdGUgcmVzb2x2ZVVybChsb2FkUGF0aDogc3RyaW5nLCBkYXRhOiB7IGxuZzogc3RyaW5nOyBuczogc3RyaW5nOyB9KTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvVXJsKHRoaXMuX3NlcnZpY2VzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShsb2FkUGF0aCwgZGF0YSwgdW5kZWZpbmVkISwgdW5kZWZpbmVkISkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9hZFVybCh1cmw6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IGkxOG4uQ2FsbGJhY2tFcnJvciB8IHN0cmluZywgZGF0YTogaTE4bi5SZXNvdXJjZUtleSB8IGJvb2xlYW4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgcmVxdWVzdC5qc29uKHVybCwgdGhpcy5fb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwganNvbik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYGZhaWxlZCBsb2FkaW5nOiAke3VybH0sICR7cmVzdWx0Lm1lc3NhZ2V9YDtcbiAgICAgICAgICAgICAgICBpZiAoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSA9PT0gcmVzdWx0LmNvZGUgJiYgcmVzdWx0LmNhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3RhdHVzIH0gPSByZXN1bHQuY2F1c2UgYXMgeyBzdGF0dXM6IG51bWJlcjsgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDUwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNjAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCB0cnVlKTsgIC8vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoNDAwIDw9IHN0YXR1cyAmJiBzdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2csIGZhbHNlKTsgLy8gbm8gcmV0cnlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhtc2csIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGRvbSBhcyAkLFxuICAgIERPTSxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0ICcuL21vZHVsZS1leHRlbmRzJztcblxuLyoqIEBpbnRlcm5hbCBleHRlbmRzIHtAbGluayBET019IGluc3RhbmNlIG1ldGhvZCAqL1xuZnVuY3Rpb24gZXh0ZW5kKGRvbU9wdGlvbnM6IFJlcXVpcmVkPGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucz4sIGkxOG5leHQ6IGkxOG4uaTE4bik6IHZvaWQge1xuICAgIGNvbnN0IHtcbiAgICAgICAgc2VsZWN0b3JBdHRyLFxuICAgICAgICB0YXJnZXRBdHRyLFxuICAgICAgICBvcHRpb25zQXR0cixcbiAgICAgICAgdXNlT3B0aW9uc0F0dHIsXG4gICAgICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQsXG4gICAgICAgIGN1c3RvbVRhZ05hbWUsXG4gICAgfSA9IGRvbU9wdGlvbnM7XG5cbiAgICBjb25zdCBleHRlbmREZWZhdWx0ID0gKG86IFBsYWluT2JqZWN0LCB2YWw6IHN0cmluZyk6IFBsYWluT2JqZWN0ID0+IHtcbiAgICAgICAgaWYgKCFwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyAuLi5vLCAuLi57IGRlZmF1bHRWYWx1ZTogdmFsIH0gfTtcbiAgICB9O1xuXG4gICAgLy8gW3ByZXBlbmRdL1thcHBlbmRdIGhlbHBlclxuICAgIGNvbnN0IGluc2VydCA9IChtZXRob2Q6ICdwcmVwZW5kJyB8ICdhcHBlbmQnLCAkZWw6IERPTSwga2V5OiBzdHJpbmcsIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmh0bWwoKSkpO1xuICAgICAgICBpZiAoZmFsc2UgPT09IGN1c3RvbVRhZ05hbWUpIHtcbiAgICAgICAgICAgICRlbFttZXRob2RdKHRyYW5zbGF0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZFdpdGhXcmFwID0gYDwke2N1c3RvbVRhZ05hbWV9PiR7dHJhbnNsYXRlZH08LyR7Y3VzdG9tVGFnTmFtZX0+YDtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkZWwuY2hpbGRyZW4oY3VzdG9tVGFnTmFtZSk7XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkdGFyZ2V0LnJlcGxhY2VXaXRoKHRyYW5zbGF0ZWRXaXRoV3JhcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRlbFttZXRob2RdKHRyYW5zbGF0ZWRXaXRoV3JhcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcGFyc2UgPSAoJGVsOiBET00sIGtleTogc3RyaW5nLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGxldCBhdHRyID0gJ3RleHQnO1xuXG4gICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnXScpO1xuICAgICAgICAgICAga2V5ICA9IHBhcnRzWzFdLnRyaW0oKTtcbiAgICAgICAgICAgIGF0dHIgPSBwYXJ0c1swXS5zdWJzdHJpbmcoMSwgcGFydHNbMF0ubGVuZ3RoKS50cmltKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2h0bWwnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwuaHRtbChpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3RleHQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwudGV4dChpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC50ZXh0KCkpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3ByZXBlbmQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICBpbnNlcnQoJ3ByZXBlbmQnLCAkZWwsIGtleSwgb3B0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2FwcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgnYXBwZW5kJywgJGVsLCBrZXksIG9wdHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGF0dHIuc3RhcnRzV2l0aCgnZGF0YS0nKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YUF0dHIgPSBhdHRyLnN1YnN0cmluZygoJ2RhdGEtJykubGVuZ3RoKTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5kYXRhKGRhdGFBdHRyKSBhcyBzdHJpbmcpKTtcbiAgICAgICAgICAgICRlbC5kYXRhKGRhdGFBdHRyLCB0cmFuc2xhdGVkKTtcbiAgICAgICAgICAgICRlbC5hdHRyKGF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuYXR0cihhdHRyKSBhcyBzdHJpbmcpKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgbG9jYWxpemUgPSAoJGVsOiBET00sIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3Qga2V5ID0gJGVsLmF0dHIoc2VsZWN0b3JBdHRyKTtcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCAkdGFyZ2V0ID0gJGVsO1xuICAgICAgICBjb25zdCB0YXJnZXRTZWxlY3RvciA9ICRlbC5kYXRhKHRhcmdldEF0dHIpIGFzIHN0cmluZztcblxuICAgICAgICBpZiAodGFyZ2V0U2VsZWN0b3IpIHtcbiAgICAgICAgICAgICR0YXJnZXQgPSAkZWwuZmluZCh0YXJnZXRTZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdHMgJiYgdHJ1ZSA9PT0gdXNlT3B0aW9uc0F0dHIpIHtcbiAgICAgICAgICAgIG9wdHMgPSAkZWwuZGF0YShvcHRpb25zQXR0cikgYXMgaTE4bi5UT3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gICAgICAgIGZvciAoY29uc3QgcGFydCBvZiBrZXkuc3BsaXQoJzsnKSkge1xuICAgICAgICAgICAgY29uc3QgayA9IHBhcnQudHJpbSgpO1xuICAgICAgICAgICAgaWYgKCcnICE9PSBrKSB7XG4gICAgICAgICAgICAgICAgcGFyc2UoJHRhcmdldCwgaywgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHJ1ZSA9PT0gdXNlT3B0aW9uc0F0dHIpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsb25lID0geyAuLi5vcHRzIH07XG4gICAgICAgICAgICBkZWxldGUgY2xvbmUubG5nO1xuICAgICAgICAgICAgJGVsLmRhdGEob3B0aW9uc0F0dHIsIGNsb25lKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYW5kbGUodGhpczogRE9NLCBvcHRzOiBpMThuLlRPcHRpb25zKTogRE9NIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWludmFsaWQtdGhpc1xuICAgICAgICByZXR1cm4gdGhpcy5lYWNoKChpbmRleDogbnVtYmVyLCBlbDogSFRNTEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgcm9vdCBvZiAkLnV0aWxzLnJvb3RpZnkoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGVsID0gJChyb290KTtcbiAgICAgICAgICAgICAgICAvLyBsb2NhbGl6ZSBlbGVtZW50IGl0c2VsZlxuICAgICAgICAgICAgICAgIGxvY2FsaXplKCRlbCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgLy8gbG9jYWxpemUgY2hpbGRyZW5cbiAgICAgICAgICAgICAgICBjb25zdCAkY2hpbGRyZW4gPSAkZWwuZmluZChgWyR7c2VsZWN0b3JBdHRyfV1gKTtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4uZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsaXplKCQoZWwpLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gc2VsZWN0b3IgZnVuY3Rpb24gJChteVNlbGVjdG9yKS5sb2NhbGl6ZShvcHRzKTtcbiAgICAkLmZuWydsb2NhbGl6ZSddID0gaGFuZGxlO1xufVxuXG4vKipcbiAqIEBlbiBgaTE4bmV4dGAgRE9NIGxvY2FsaXplciBidWlsdC1pbiBwbHVnaW4gZmFjdG9yeS5cbiAqIEBqYSBgaTE4bmV4dGAgRE9NIOODreODvOOCq+ODqeOCpOOCuuODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+ODleOCoeOCr+ODiOODquODvOODoeOCveODg+ODiVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gRG9tTG9jYWxpemVyKGRvbU9wdGlvbnM/OiBpMThuLkRvbUxvY2FsaXplck9wdGlvbnMpOiBpMThuLlRoaXJkUGFydHlNb2R1bGUge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICczcmRQYXJ0eScsXG4gICAgICAgIGluaXQ6IGV4dGVuZC5iaW5kKFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yQXR0cjogJ2RhdGEtaTE4bicsXG4gICAgICAgICAgICAgICAgdGFyZ2V0QXR0cjogJ2kxOG4tdGFyZ2V0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25zQXR0cjogJ2kxOG4tb3B0aW9ucycsXG4gICAgICAgICAgICAgICAgdXNlT3B0aW9uc0F0dHI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY3VzdG9tVGFnTmFtZTogJ2NkcC1pMThuJyxcbiAgICAgICAgICAgIH0sIGRvbU9wdGlvbnMpXG4gICAgICAgICksXG4gICAgfTtcbn1cbiIsImV4cG9ydCAqIGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIGRvbSBhcyAkLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgSTE4Tk9wdGlvbnMsIEkxOE5EZXRlY3RFcnJvckJlaGF2aW91ciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBuYXZpZ2F0b3IgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBBamF4QmFja2VuZCwgRG9tTG9jYWxpemVyIH0gZnJvbSAnLi9wbHVnaW4nO1xuXG4vKipcbiAqIEBlbiBUcmFuc2xhdGUgZnVuY2lvbi5cbiAqIEBqYSDnv7voqLPplqLmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IHQ6IGkxOG4uVEZ1bmN0aW9uID0gaTE4bi50LmJpbmQoaTE4bik7XG5cbi8qKlxuICogQGVuIEluaXRpYWxpemUgYGkxOG5leHRgIGluc3RhbmNlLlxuICogQGphIGBpMThuZXh0YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7liJ3mnJ/ljJZcbiAqXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBpbml0IG9wdGlvbnNcbiAqICAtIGBqYWAg5Yid5pyf5YyW44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBpbml0aWFsaXplSTE4TiA9IChvcHRpb25zPzogSTE4Tk9wdGlvbnMpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBub1Rocm93OiB0cnVlIH0sIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgeyBuYW1lc3BhY2UsIHJlc291cmNlUGF0aDogbG9hZFBhdGgsIGRvbSwgbm9UaHJvdyB9ID0gb3B0cztcblxuICAgIGlmICghb3B0cy5sbmcpIHtcbiAgICAgICAgb3B0cy5sbmcgPSBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG4gICAgfVxuXG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAhb3B0cy5ucyAmJiAob3B0cy5ucyA9IG5hbWVzcGFjZSk7XG4gICAgICAgICFvcHRzLmRlZmF1bHROUyAmJiAob3B0cy5kZWZhdWx0TlMgPSBuYW1lc3BhY2UpO1xuICAgIH1cblxuICAgIGlmIChsb2FkUGF0aCkge1xuICAgICAgICBvcHRzLmJhY2tlbmQgPSBPYmplY3QuYXNzaWduKHsgbG9hZFBhdGggfSwgb3B0cy5iYWNrZW5kKTtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5iYWNrZW5kKSB7XG4gICAgICAgIGkxOG4udXNlKEFqYXhCYWNrZW5kKTtcbiAgICB9XG5cbiAgICBpMThuLnVzZShEb21Mb2NhbGl6ZXIoZG9tKSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2b2lkIGkxOG4uaW5pdChvcHRzLCAoZXJyb3IsIHRyYW5zbGF0b3IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfSTE4Tl9DT1JFX0xBWUVSLCAnaTE4biNpbml0KCkgZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBpZiAobm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4ocmVzdWx0Lm1lc3NhZ2UsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUodHJhbnNsYXRvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBjdXJyZW50IGRldGVjdGVkIG9yIHNldCBsYW5ndWFnZS5cbiAqIEBqYSDnj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovoqIDoqp7jgpLlj5blvpdcbiAqXG4gKiBAcmV0dXJucyBgamEtSlBgLCBgamFgXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRMYW5ndWFnZSA9ICgpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBpMThuLmxhbmd1YWdlIHx8IG5hdmlnYXRvci5sYW5ndWFnZTtcbn07XG5cbi8qKlxuICogQGVuIEdldCBhbiBhcnJheSBvZiBgbGFuZ3VhZ2UtY29kZXNgIHRoYXQgd2lsbCBiZSB1c2VkIGl0IG9yZGVyIHRvIGxvb2t1cCB0aGUgdHJhbnNsYXRpb24gdmFsdWUuXG4gKiBAamEg57+76Kiz44Gu5qSc57Si44Gr5L2/55So44GV44KM44KLIGBsYW5ndWFnZS1jb2Rlc2Ag44Oq44K544OI44KS5Y+W5b6XXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly93d3cuaTE4bmV4dC5jb20vb3ZlcnZpZXcvYXBpI2xhbmd1YWdlc1xuICovXG5leHBvcnQgY29uc3QgZ2V0TGFuZ3VhZ2VMaXN0ID0gKCk6IHJlYWRvbmx5IHN0cmluZ1tdID0+IHtcbiAgICByZXR1cm4gaTE4bi5sYW5ndWFnZXMgfHwgW25hdmlnYXRvci5sYW5ndWFnZV07XG59O1xuXG4vKipcbiAqIEBlbiBDaGFuZ2VzIHRoZSBsYW5ndWFnZS5cbiAqIEBqYSDoqIDoqp7jga7liIfjgormm7/jgYhcbiAqL1xuZXhwb3J0IGNvbnN0IGNoYW5nZUxhbmd1YWdlID0gKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4gPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbm9UaHJvdzogdHJ1ZSB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2b2lkIGkxOG4uY2hhbmdlTGFuZ3VhZ2UobG5nLCAoZXJyb3IsIHRyYW5zbGF0b3IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfSTE4Tl9DT1JFX0xBWUVSLCAnaTE4biNjaGFuZ2VMYW5ndWF0ZSgpIGZhaWxlZC4nLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgaWYgKG9wdHMubm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4ocmVzdWx0Lm1lc3NhZ2UsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUodHJhbnNsYXRvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBAZW4gRE9NIGxvY2FsaXplciBtZXRob2QuXG4gKiBAamEgRE9NIOODreODvOOCq+ODqeOCpOOCulxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHRyYW5zbGF0aW9uIG9wdGlvbnMuXG4gKiAgLSBgamFgIOe/u+ios+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgY29uc3QgbG9jYWxpemUgPSA8VCBleHRlbmRzIHN0cmluZyB8IE5vZGU+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgb3B0aW9ucz86IGkxOG4uVE9wdGlvbnMpOiBET01SZXN1bHQ8VD4gPT4ge1xuICAgIHJldHVybiAkKHNlbGVjdG9yKS5sb2NhbGl6ZShvcHRpb25zKSBhcyBET01SZXN1bHQ8VD47XG59O1xuIl0sIm5hbWVzIjpbInNhZmUiLCJpc0Z1bmN0aW9uIiwidG9VcmwiLCJyZXF1ZXN0IiwicmVzdWx0IiwidG9SZXN1bHQiLCJSRVNVTFRfQ09ERSIsIiQiLCJpMThuIiwibWFrZVJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUhELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGNBQTBDLENBQUE7WUFDMUMsV0FBd0IsQ0FBQSxXQUFBLENBQUEsdUJBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLDhCQUF1QixDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUEsR0FBQSx1QkFBQSxDQUFBO0lBQy9HLEtBQUMsR0FBQSxDQUFBO0lBQ0wsQ0FBQyxHQUFBOztJQ2xCRCxpQkFBd0IsTUFBTSxTQUFTLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDOztJQ0RwRTs7SUFFRztJQWdCSDtJQUVBOzs7OztJQUtHO1VBQ1UsV0FBVyxDQUFBO1FBQ1gsSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUMxQixJQUFBLE9BQU8sSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUNoQixJQUFBLFNBQVMsQ0FBaUI7UUFDMUIsUUFBUSxHQUE0QixFQUFFLENBQUM7UUFDdkMsWUFBWSxHQUF3QixFQUFFLENBQUM7OztJQUsvQyxJQUFBLElBQUksQ0FBQyxRQUF1QixFQUFFLE9BQWdDLEVBQUUsV0FBd0IsRUFBQTtJQUNwRixRQUFBLElBQUksQ0FBQyxTQUFTLEdB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QUNKLGFBQUE7Z0JBQ0QsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hCLFNBQUMsQ0FBQyxDQUFDO0lBQ1AsS0FBQyxDQUFDLENBQUM7SUFDUCxFQUFFO0lBRUY7Ozs7O0lBS0c7QUFDSSxVQUFNLFdBQVcsR0FBRyxNQUFhO0lBQ3BDLElBQUEsT0FBT0ksa0JBQUksQ0FBQyxRQUFRLElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQztJQUMvQyxFQUFFO0lBRUY7Ozs7OztJQU1HO0FBQ0ksVUFBTSxlQUFlLEdBQUcsTUFBd0I7UUFDbkQsT0FBT0Esa0JBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsRUFBRTtJQUVGOzs7SUFHRztVQUNVLGNBQWMsR0FBRyxDQUFDLEdBQVcsRUFBRSxPQUFrQyxLQUE2QjtJQUN2RyxJQUFBLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdkQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUk7WUFDbkMsS0FBS0Esa0JBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsS0FBSTtJQUNoRCxZQUFBLElBQUksS0FBSyxFQUFFO0lBQ1AsZ0JBQUEsTUFBTUosUUFBTSxHQUFHSyxpQkFBVSxDQUFDSCxrQkFBVyxDQUFDLHFCQUFxQixFQUFFLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNyRyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7d0JBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQ0YsUUFBTSxDQUFDLE9BQU8sRUFBRUEsUUFBTSxDQUFDLENBQUM7SUFDeEMsaUJBQUE7SUFBTSxxQkFBQTtJQUNILG9CQUFBLE9BQU8sTUFBTSxDQUFDQSxRQUFNLENBQUMsQ0FBQztJQUN6QixpQkFBQTtJQUNKLGFBQUE7Z0JBQ0QsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hCLFNBQUMsQ0FBQyxDQUFDO0lBQ1AsS0FBQyxDQUFDLENBQUM7SUFDUCxFQUFFO0lBRUY7Ozs7Ozs7Ozs7SUFVRztVQUNVLFFBQVEsR0FBRyxDQUEwQixRQUF3QixFQUFFLE9BQXVCLEtBQWtCO1FBQ2pILE9BQU9HLE9BQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFpQixDQUFDO0lBQ3pEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2kxOG4vIn0=