/*!
 * @cdp/i18n 0.9.19
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
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBuYXZpZ2F0b3IgPSBzYWZlKGdsb2JhbFRoaXMubmF2aWdhdG9yKTtcbiIsImltcG9ydCB0eXBlIHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgdG9SZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyByZXF1ZXN0IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IHRvVXJsIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBJMThOT3B0aW9ucyB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIERlZmF1bHQge1xuICAgIExPQURfUEFUSCA9ICdyZXMvbG9jYWxlcy97e25zfX0ue3tsbmd9fS5qc29uJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIEZhbGxiYWNrUmVzb3VyY2VNYXAgPSBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIGEgc2ltcGxlIGBpMThuZXh0YCBiYWNrZW5kIGJ1aWx0LWluIHBsdWdpbi4gSXQgd2lsbCBsb2FkIHJlc291cmNlcyBmcm9tIGEgYmFja2VuZCBzZXJ2ZXIgdXNpbmcgdGhlIGBmZXRjaGAgQVBJLlxuICogQGphIGBmZXRjaGAgQVBJIOOCkueUqOOBhOOBnyBgaTE4bmV4dGAgYmFja2VuZCDjg5Pjg6vjg4jjgqTjg7Pjg5fjg6njgrDjgqTjg7Pjgq/jg6njgrlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNsYXNzIEFqYXhCYWNrZW5kIGltcGxlbWVudHMgaTE4bi5CYWNrZW5kTW9kdWxlPGkxOG4uQWpheEJhY2tlbmRPcHRpb25zPiB7XG4gICAgcmVhZG9ubHkgdHlwZSA9ICdiYWNrZW5kJztcbiAgICBzdGF0aWMgdHlwZSA9ICdiYWNrZW5kJztcbiAgICBwcml2YXRlIF9zZXJ2aWNlcyE6IGkxOG4uU2VydmljZXM7XG4gICAgcHJpdmF0ZSBfb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMgPSB7fTtcbiAgICBwcml2YXRlIF9mYWxsYmFja01hcDogRmFsbGJhY2tSZXNvdXJjZU1hcCA9IHt9O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogaTE4bi5CYWNrZW5kTW9kdWxlPEFqYXhCYWNrZW5kT3B0aW9ucz5cblxuICAgIGluaXQoc2VydmljZXM6IGkxOG4uU2VydmljZXMsIG9wdGlvbnM6IGkxOG4uQWpheEJhY2tlbmRPcHRpb25zLCBpbml0T3B0aW9uczogSTE4Tk9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aDogRGVmYXVsdC5MT0FEX1BBVEggfSwgdGhpcy5fb3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2ZhbGxiYWNrTWFwID0gT2JqZWN0LmFzc2lnbih0aGlzLl9mYWxsYmFja01hcCwgaW5pdE9wdGlvbnMuZmFsbGJhY2tSZXNvdXJjZXMpO1xuICAgIH1cblxuICAgIHJlYWQobGFuZ3VhZ2U6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcsIGNhbGxiYWNrOiBpMThuLlJlYWRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICBjb25zdCBsbmcgPSB0aGlzLl9mYWxsYmFja01hcFtsYW5ndWFnZV0gfHwgbGFuZ3VhZ2U7XG4gICAgICAgIGNvbnN0IGxvYWRQYXRoID0gaXNGdW5jdGlvbih0aGlzLl9vcHRpb25zLmxvYWRQYXRoKSA/IHRoaXMuX29wdGlvbnMubG9hZFBhdGgoW2xuZ10sIFtuYW1lc3BhY2VdKSA6IHRoaXMuX29wdGlvbnMubG9hZFBhdGg7XG4gICAgICAgIGNvbnN0IHVybCA9IHRoaXMucmVzb2x2ZVVybChsb2FkUGF0aCEsIHsgbG5nLCBuczogbmFtZXNwYWNlIH0pO1xuICAgICAgICB0aGlzLmxvYWRVcmwodXJsLCBjYWxsYmFjayk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSByZXNvbHZlVXJsKGxvYWRQYXRoOiBzdHJpbmcsIGRhdGE6IHsgbG5nOiBzdHJpbmc7IG5zOiBzdHJpbmc7IH0pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9VcmwodGhpcy5fc2VydmljZXMuaW50ZXJwb2xhdG9yLmludGVycG9sYXRlKGxvYWRQYXRoLCBkYXRhLCB1bmRlZmluZWQhLCB1bmRlZmluZWQhKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2FkVXJsKHVybDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogaTE4bi5DYWxsYmFja0Vycm9yIHwgc3RyaW5nLCBkYXRhOiBpMThuLlJlc291cmNlS2V5IHwgYm9vbGVhbikgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXF1ZXN0Lmpzb24odXJsLCB0aGlzLl9vcHRpb25zKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBqc29uKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0b1Jlc3VsdChlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgZmFpbGVkIGxvYWRpbmc6ICR7dXJsfSwgJHtyZXN1bHQubWVzc2FnZX1gO1xuICAgICAgICAgICAgICAgIGlmIChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFID09PSByZXN1bHQuY29kZSAmJiByZXN1bHQuY2F1c2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBzdGF0dXMgfSA9IHJlc3VsdC5jYXVzZSBhcyB7IHN0YXR1czogbnVtYmVyOyB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoNTAwIDw9IHN0YXR1cyAmJiBzdGF0dXMgPCA2MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2csIHRydWUpOyAgLy8gcmV0cnlcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICg0MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgZmFsc2UpOyAvLyBubyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG1zZywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHR5cGUgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGRvbSBhcyAkLFxuICAgIHR5cGUgRE9NLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgJy4vbW9kdWxlLWV4dGVuZHMnO1xuXG4vKiogQGludGVybmFsIGV4dGVuZHMge0BsaW5rIERPTX0gaW5zdGFuY2UgbWV0aG9kICovXG5mdW5jdGlvbiBleHRlbmQoZG9tT3B0aW9uczogUmVxdWlyZWQ8aTE4bi5Eb21Mb2NhbGl6ZXJPcHRpb25zPiwgaTE4bmV4dDogaTE4bi5pMThuKTogdm9pZCB7XG4gICAgY29uc3Qge1xuICAgICAgICBzZWxlY3RvckF0dHIsXG4gICAgICAgIHRhcmdldEF0dHIsXG4gICAgICAgIG9wdGlvbnNBdHRyLFxuICAgICAgICB1c2VPcHRpb25zQXR0cixcbiAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudCxcbiAgICAgICAgY3VzdG9tVGFnTmFtZSxcbiAgICB9ID0gZG9tT3B0aW9ucztcblxuICAgIGNvbnN0IGV4dGVuZERlZmF1bHQgPSAobzogUGxhaW5PYmplY3QsIHZhbDogc3RyaW5nKTogUGxhaW5PYmplY3QgPT4ge1xuICAgICAgICBpZiAoIXBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IC4uLm8sIC4uLnsgZGVmYXVsdFZhbHVlOiB2YWwgfSB9O1xuICAgIH07XG5cbiAgICAvLyBbcHJlcGVuZF0vW2FwcGVuZF0gaGVscGVyXG4gICAgY29uc3QgaW5zZXJ0ID0gKG1ldGhvZDogJ3ByZXBlbmQnIHwgJ2FwcGVuZCcsICRlbDogRE9NLCBrZXk6IHN0cmluZywgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCB0cmFuc2xhdGVkID0gaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuaHRtbCgpKSk7XG4gICAgICAgIGlmIChmYWxzZSA9PT0gY3VzdG9tVGFnTmFtZSkge1xuICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkV2l0aFdyYXAgPSBgPCR7Y3VzdG9tVGFnTmFtZX0+JHt0cmFuc2xhdGVkfTwvJHtjdXN0b21UYWdOYW1lfT5gO1xuICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICRlbC5jaGlsZHJlbihjdXN0b21UYWdOYW1lKTtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICR0YXJnZXQucmVwbGFjZVdpdGgodHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVsW21ldGhvZF0odHJhbnNsYXRlZFdpdGhXcmFwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBwYXJzZSA9ICgkZWw6IERPTSwga2V5OiBzdHJpbmcsIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgbGV0IGF0dHIgPSAndGV4dCc7XG5cbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCddJyk7XG4gICAgICAgICAgICBrZXkgID0gcGFydHNbMV0udHJpbSgpO1xuICAgICAgICAgICAgYXR0ciA9IHBhcnRzWzBdLnN1YnN0cmluZygxLCBwYXJ0c1swXS5sZW5ndGgpLnRyaW0oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnaHRtbCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgICRlbC5odG1sKGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmh0bWwoKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmICgndGV4dCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgICRlbC50ZXh0KGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLnRleHQoKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmICgncHJlcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgncHJlcGVuZCcsICRlbCwga2V5LCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdhcHBlbmQnLCAkZWwsIGtleSwgb3B0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXR0ci5zdGFydHNXaXRoKCdkYXRhLScpKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhQXR0ciA9IGF0dHIuc3Vic3RyaW5nKCgnZGF0YS0nKS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmRhdGEoZGF0YUF0dHIpIGFzIHN0cmluZykpO1xuICAgICAgICAgICAgJGVsLmRhdGEoZGF0YUF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5hdHRyKGF0dHIpISkpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBsb2NhbGl6ZSA9ICgkZWw6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSAkZWwuYXR0cihzZWxlY3RvckF0dHIpO1xuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0ICR0YXJnZXQgPSAkZWw7XG4gICAgICAgIGNvbnN0IHRhcmdldFNlbGVjdG9yID0gJGVsLmRhdGEodGFyZ2V0QXR0cikgYXMgc3RyaW5nO1xuXG4gICAgICAgIGlmICh0YXJnZXRTZWxlY3Rvcikge1xuICAgICAgICAgICAgJHRhcmdldCA9ICRlbC5maW5kKHRhcmdldFNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb3B0cyAmJiB0cnVlID09PSB1c2VPcHRpb25zQXR0cikge1xuICAgICAgICAgICAgb3B0cyA9ICRlbC5kYXRhKG9wdGlvbnNBdHRyKSBhcyBpMThuLlRPcHRpb25zO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIGtleS5zcGxpdCgnOycpKSB7XG4gICAgICAgICAgICBjb25zdCBrID0gcGFydC50cmltKCk7XG4gICAgICAgICAgICBpZiAoJycgIT09IGspIHtcbiAgICAgICAgICAgICAgICBwYXJzZSgkdGFyZ2V0LCBrLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0cnVlID09PSB1c2VPcHRpb25zQXR0cikge1xuICAgICAgICAgICAgY29uc3QgY2xvbmUgPSB7IC4uLm9wdHMgfTtcbiAgICAgICAgICAgIGRlbGV0ZSBjbG9uZS5sbmc7XG4gICAgICAgICAgICAkZWwuZGF0YShvcHRpb25zQXR0ciwgY2xvbmUpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZSh0aGlzOiBET00sIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiBET00ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8taW52YWxpZC10aGlzXG4gICAgICAgIHJldHVybiB0aGlzLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCByb290IG9mICQudXRpbHMucm9vdGlmeShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKHJvb3QpO1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsaXplIGVsZW1lbnQgaXRzZWxmXG4gICAgICAgICAgICAgICAgbG9jYWxpemUoJGVsLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAvLyBsb2NhbGl6ZSBjaGlsZHJlblxuICAgICAgICAgICAgICAgIGNvbnN0ICRjaGlsZHJlbiA9ICRlbC5maW5kKGBbJHtzZWxlY3RvckF0dHJ9XWApO1xuICAgICAgICAgICAgICAgICRjaGlsZHJlbi5lYWNoKChpbmRleDogbnVtYmVyLCBlbDogSFRNTEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxpemUoJChlbCksIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBzZWxlY3RvciBmdW5jdGlvbiAkKG15U2VsZWN0b3IpLmxvY2FsaXplKG9wdHMpO1xuICAgICQuZm5bJ2xvY2FsaXplJ10gPSBoYW5kbGU7XG59XG5cbi8qKlxuICogQGVuIGBpMThuZXh0YCBET00gbG9jYWxpemVyIGJ1aWx0LWluIHBsdWdpbiBmYWN0b3J5LlxuICogQGphIGBpMThuZXh0YCBET00g44Ot44O844Kr44Op44Kk44K644OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44OV44Kh44Kv44OI44Oq44O844Oh44K944OD44OJXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBEb21Mb2NhbGl6ZXIoZG9tT3B0aW9ucz86IGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucyk6IGkxOG4uVGhpcmRQYXJ0eU1vZHVsZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJzNyZFBhcnR5JyxcbiAgICAgICAgaW5pdDogZXh0ZW5kLmJpbmQoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3JBdHRyOiAnZGF0YS1pMThuJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRBdHRyOiAnaTE4bi10YXJnZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNBdHRyOiAnaTE4bi1vcHRpb25zJyxcbiAgICAgICAgICAgICAgICB1c2VPcHRpb25zQXR0cjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjdXN0b21UYWdOYW1lOiAnY2RwLWkxOG4nLFxuICAgICAgICAgICAgfSwgZG9tT3B0aW9ucylcbiAgICAgICAgKSxcbiAgICB9O1xufVxuIiwiZXhwb3J0ICogZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgZG9tIGFzICQsXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHR5cGUgeyBJMThOT3B0aW9ucywgSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IG5hdmlnYXRvciB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IEFqYXhCYWNrZW5kLCBEb21Mb2NhbGl6ZXIgfSBmcm9tICcuL3BsdWdpbic7XG5cbi8qKlxuICogQGVuIFRyYW5zbGF0ZSBmdW5jaW9uLlxuICogQGphIOe/u+ios+mWouaVsFxuICovXG5leHBvcnQgY29uc3QgdDogaTE4bi5URnVuY3Rpb24gPSBpMThuLnQuYmluZChpMThuKTtcblxuLyoqXG4gKiBAZW4gSW5pdGlhbGl6ZSBgaTE4bmV4dGAgaW5zdGFuY2UuXG4gKiBAamEgYGkxOG5leHRgIOOCpOODs+OCueOCv+ODs+OCueOBruWIneacn+WMllxuICpcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGluaXQgb3B0aW9uc1xuICogIC0gYGphYCDliJ3mnJ/ljJbjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVJMThOID0gKG9wdGlvbnM/OiBJMThOT3B0aW9ucyk6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG5vVGhyb3c6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCB7IG5hbWVzcGFjZSwgcmVzb3VyY2VQYXRoOiBsb2FkUGF0aCwgZG9tLCBub1Rocm93IH0gPSBvcHRzO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItbnVsbGlzaC1jb2FsZXNjaW5nXG4gICAgaWYgKCFvcHRzLmxuZykge1xuICAgICAgICBvcHRzLmxuZyA9IG5hdmlnYXRvci5sYW5ndWFnZTtcbiAgICB9XG5cbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgICFvcHRzLm5zICYmIChvcHRzLm5zID0gbmFtZXNwYWNlKTtcbiAgICAgICAgIW9wdHMuZGVmYXVsdE5TICYmIChvcHRzLmRlZmF1bHROUyA9IG5hbWVzcGFjZSk7XG4gICAgfVxuXG4gICAgaWYgKGxvYWRQYXRoKSB7XG4gICAgICAgIG9wdHMuYmFja2VuZCA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aCB9LCBvcHRzLmJhY2tlbmQpO1xuICAgIH1cblxuICAgIGlmIChvcHRzLmJhY2tlbmQpIHtcbiAgICAgICAgaTE4bi51c2UoQWpheEJhY2tlbmQpO1xuICAgIH1cblxuICAgIGkxOG4udXNlKERvbUxvY2FsaXplcihkb20pKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZvaWQgaTE4bi5pbml0KG9wdHMsIChlcnJvciwgdHJhbnNsYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9JMThOX0NPUkVfTEFZRVIsICdpMThuI2luaXQoKSBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXN1bHQubWVzc2FnZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cmFuc2xhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgZGV0ZWN0ZWQgb3Igc2V0IGxhbmd1YWdlLlxuICogQGphIOePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+iogOiqnuOCkuWPluW+l1xuICpcbiAqIEByZXR1cm5zIGBqYS1KUGAsIGBqYWBcbiAqL1xuZXhwb3J0IGNvbnN0IGdldExhbmd1YWdlID0gKCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGkxOG4ubGFuZ3VhZ2UgfHwgbmF2aWdhdG9yLmxhbmd1YWdlO1xufTtcblxuLyoqXG4gKiBAZW4gR2V0IGFuIGFycmF5IG9mIGBsYW5ndWFnZS1jb2Rlc2AgdGhhdCB3aWxsIGJlIHVzZWQgaXQgb3JkZXIgdG8gbG9va3VwIHRoZSB0cmFuc2xhdGlvbiB2YWx1ZS5cbiAqIEBqYSDnv7voqLPjga7mpJzntKLjgavkvb/nlKjjgZXjgozjgosgYGxhbmd1YWdlLWNvZGVzYCDjg6rjgrnjg4jjgpLlj5blvpdcbiAqXG4gKiBAc2VlXG4gKiAgLSBodHRwczovL3d3dy5pMThuZXh0LmNvbS9vdmVydmlldy9hcGkjbGFuZ3VhZ2VzXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRMYW5ndWFnZUxpc3QgPSAoKTogcmVhZG9ubHkgc3RyaW5nW10gPT4ge1xuICAgIHJldHVybiBpMThuLmxhbmd1YWdlcyB8fCBbbmF2aWdhdG9yLmxhbmd1YWdlXTtcbn07XG5cbi8qKlxuICogQGVuIENoYW5nZXMgdGhlIGxhbmd1YWdlLlxuICogQGphIOiogOiqnuOBruWIh+OCiuabv+OBiFxuICovXG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSAobG5nOiBzdHJpbmcsIG9wdGlvbnM/OiBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBub1Rocm93OiB0cnVlIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZvaWQgaTE4bi5jaGFuZ2VMYW5ndWFnZShsbmcsIChlcnJvciwgdHJhbnNsYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9JMThOX0NPUkVfTEFZRVIsICdpMThuI2NoYW5nZUxhbmd1YXRlKCkgZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBpZiAob3B0cy5ub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXN1bHQubWVzc2FnZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cmFuc2xhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEBlbiBET00gbG9jYWxpemVyIG1ldGhvZC5cbiAqIEBqYSBET00g44Ot44O844Kr44Op44Kk44K6XG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdHJhbnNsYXRpb24gb3B0aW9ucy5cbiAqICAtIGBqYWAg57+76Kiz44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBsb2NhbGl6ZSA9IDxUIGV4dGVuZHMgc3RyaW5nIHwgTm9kZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBvcHRpb25zPzogaTE4bi5UT3B0aW9ucyk6IERPTVJlc3VsdDxUPiA9PiB7XG4gICAgcmV0dXJuICQoc2VsZWN0b3IpLmxvY2FsaXplKG9wdGlvbnMpIGFzIERPTVJlc3VsdDxUPjtcbn07XG4iXSwibmFtZXMiOlsic2FmZSIsImlzRnVuY3Rpb24iLCJ0b1VybCIsInJlcXVlc3QiLCJyZXN1bHQiLCJ0b1Jlc3VsdCIsIlJFU1VMVF9DT0RFIiwiJCIsImkxOG4iLCJtYWtlUmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFHRztJQUVILENBQUEsWUFBcUI7SUFNakI7OztJQUdHO0lBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtJQUFBLElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLGNBQTBDO1lBQzFDLFdBQXdCLENBQUEsV0FBQSxDQUFBLHVCQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSw4QkFBdUIsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBLEdBQUEsdUJBQUE7SUFDL0csS0FBQyxHQUFBO0lBQ0wsQ0FBQyxHQUFBOztJQ2xCRCxpQkFBd0IsTUFBTSxTQUFTLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDOztJQ2FwRTtJQUVBOzs7OztJQUtHO1VBQ1UsV0FBVyxDQUFBO1FBQ1gsSUFBSSxHQUFHLFNBQVM7SUFDekIsSUFBQSxPQUFPLElBQUksR0FBRyxTQUFTO0lBQ2YsSUFBQSxTQUFTO1FBQ1QsUUFBUSxHQUE0QixFQUFFO1FBQ3RDLFlBQVksR0FBd0IsRUFBRTs7O0lBSzlDLElBQUEsSUFBSSxDQUFDLFFBQXVCLEVBQUUsT0FBZ0MsRUFBRSxXQUF3QixFQUFBO0lBQ3BGLFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRO0lBQ3pCLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FB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QUFNLEdBQUdLLGlCQUFVLENBQUNILGtCQUFXLENBQUMscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxDQUFDO29CQUMxRixJQUFJLE9BQU8sRUFBRTt3QkFDVCxPQUFPLENBQUMsSUFBSSxDQUFDRixRQUFNLENBQUMsT0FBTyxFQUFFQSxRQUFNLENBQUM7O3lCQUNqQztJQUNILG9CQUFBLE9BQU8sTUFBTSxDQUFDQSxRQUFNLENBQUM7OztnQkFHN0IsT0FBTyxDQUFDLFVBQVUsQ0FBQztJQUN2QixTQUFDLENBQUM7SUFDTixLQUFDLENBQUM7SUFDTjtJQUVBOzs7OztJQUtHO0FBQ0ksVUFBTSxXQUFXLEdBQUcsTUFBYTtJQUNwQyxJQUFBLE9BQU9JLGtCQUFJLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxRQUFRO0lBQzlDO0lBRUE7Ozs7OztJQU1HO0FBQ0ksVUFBTSxlQUFlLEdBQUcsTUFBd0I7UUFDbkQsT0FBT0Esa0JBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0lBQ2pEO0lBRUE7OztJQUdHO1VBQ1UsY0FBYyxHQUFHLENBQUMsR0FBVyxFQUFFLE9BQWtDLEtBQTZCO0lBQ3ZHLElBQUEsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUM7UUFDdEQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUk7WUFDbkMsS0FBS0Esa0JBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsS0FBSTtnQkFDaEQsSUFBSSxLQUFLLEVBQUU7SUFDUCxnQkFBQSxNQUFNSixRQUFNLEdBQUdLLGlCQUFVLENBQUNILGtCQUFXLENBQUMscUJBQXFCLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxDQUFDO0lBQ3BHLGdCQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDZCxPQUFPLENBQUMsSUFBSSxDQUFDRixRQUFNLENBQUMsT0FBTyxFQUFFQSxRQUFNLENBQUM7O3lCQUNqQztJQUNILG9CQUFBLE9BQU8sTUFBTSxDQUFDQSxRQUFNLENBQUM7OztnQkFHN0IsT0FBTyxDQUFDLFVBQVUsQ0FBQztJQUN2QixTQUFDLENBQUM7SUFDTixLQUFDLENBQUM7SUFDTjtJQUVBOzs7Ozs7Ozs7O0lBVUc7VUFDVSxRQUFRLEdBQUcsQ0FBMEIsUUFBd0IsRUFBRSxPQUF1QixLQUFrQjtRQUNqSCxPQUFPRyxPQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBaUI7SUFDeEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvaTE4bi8ifQ==