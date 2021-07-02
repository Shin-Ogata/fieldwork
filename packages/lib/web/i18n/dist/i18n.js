/*!
 * @cdp/i18n 0.9.7
 *   internationalization module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-i18n'), require('@cdp/result'), require('@cdp/dom'), require('@cdp/core-utils'), require('@cdp/ajax'), require('@cdp/environment')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-i18n', '@cdp/result', '@cdp/dom', '@cdp/core-utils', '@cdp/ajax', '@cdp/environment'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, extensionI18n, result, dom, coreUtils, ajax, environment) { 'use strict';

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
            RESULT_CODE[RESULT_CODE["ERROR_I18N_CORE_LAYER"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 40 /* I18N */ + 1, 'i18next error')] = "ERROR_I18N_CORE_LAYER";
        })();
    })();

    /** @internal */ const _navigator = coreUtils.safe(globalThis.navigator);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJwbHVnaW4vZG9tLWxvY2FsaXplci50cyIsImNvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBJMThOID0gQ0RQX0tOT1dOX01PRFVMRS5JMThOICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEkxOE5fREVDTEFSRSAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfSTE4Tl9DT1JFX0xBWUVSID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuSTE4TiArIDEsICdpMThuZXh0IGVycm9yJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX25hdmlnYXRvciA9IHNhZmUoZ2xvYmFsVGhpcy5uYXZpZ2F0b3IpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQge1xuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvbixcbiAqL1xuXG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCB0b1Jlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHJlcXVlc3QgfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHsgdG9VcmwgfSBmcm9tICdAY2RwL2Vudmlyb25tZW50JztcbmltcG9ydCB7IEkxOE5PcHRpb25zIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVmYXVsdCB7XG4gICAgTE9BRF9QQVRIID0gJ3Jlcy9sb2NhbGVzL3t7bnN9fS57e2xuZ319Lmpzb24nLFxufVxuXG4vKiogQGludGVybmFsICovIHR5cGUgRmFsbGJhY2tSZXNvdXJjZU1hcCA9IHsgW2xuZzogc3RyaW5nXTogc3RyaW5nOyB9O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIGEgc2ltcGxlIGBpMThuZXh0YCBiYWNrZW5kIGJ1aWx0LWluIHBsdWdpbi4gSXQgd2lsbCBsb2FkIHJlc291cmNlcyBmcm9tIGEgYmFja2VuZCBzZXJ2ZXIgdXNpbmcgdGhlIGBmZXRjaGAgQVBJLlxuICogQGphIGBmZXRjaGAgQVBJIOOCkueUqOOBhOOBnyBgaTE4bmV4dGAgYmFja2VuZCDjg5Pjg6vjg4jjgqTjg7Pjg5fjg6njgrDjgqTjg7Pjgq/jg6njgrlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNsYXNzIEFqYXhCYWNrZW5kIGltcGxlbWVudHMgaTE4bi5CYWNrZW5kTW9kdWxlPGkxOG4uQWpheEJhY2tlbmRPcHRpb25zPiB7XG4gICAgcmVhZG9ubHkgdHlwZSA9ICdiYWNrZW5kJztcbiAgICBzdGF0aWMgdHlwZSA9ICdiYWNrZW5kJztcbiAgICBwcml2YXRlIF9zZXJ2aWNlcyE6IGkxOG4uU2VydmljZXM7XG4gICAgcHJpdmF0ZSBfb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMgPSB7fTtcbiAgICBwcml2YXRlIF9mYWxsYmFja01hcDogRmFsbGJhY2tSZXNvdXJjZU1hcCA9IHt9O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogaTE4bi5CYWNrZW5kTW9kdWxlPEFqYXhCYWNrZW5kT3B0aW9ucz5cblxuICAgIGluaXQoc2VydmljZXM6IGkxOG4uU2VydmljZXMsIG9wdGlvbnM6IGkxOG4uQWpheEJhY2tlbmRPcHRpb25zLCBpbml0T3B0aW9uczogSTE4Tk9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBsb2FkUGF0aDogRGVmYXVsdC5MT0FEX1BBVEggfSwgdGhpcy5fb3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2ZhbGxiYWNrTWFwID0gT2JqZWN0LmFzc2lnbih0aGlzLl9mYWxsYmFja01hcCwgaW5pdE9wdGlvbnMuZmFsbGJhY2tSZXNvdXJjZXMpO1xuICAgIH1cblxuICAgIHJlYWQobGFuZ3VhZ2U6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcsIGNhbGxiYWNrOiBpMThuLlJlYWRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICBjb25zdCBsbmcgPSB0aGlzLl9mYWxsYmFja01hcFtsYW5ndWFnZV0gfHwgbGFuZ3VhZ2U7XG4gICAgICAgIGNvbnN0IGxvYWRQYXRoID0gaXNGdW5jdGlvbih0aGlzLl9vcHRpb25zLmxvYWRQYXRoKSA/IHRoaXMuX29wdGlvbnMubG9hZFBhdGgoW2xuZ10sIFtuYW1lc3BhY2VdKSA6IHRoaXMuX29wdGlvbnMubG9hZFBhdGg7XG4gICAgICAgIGNvbnN0IHVybCA9IHRoaXMucmVzb2x2ZVVybChsb2FkUGF0aCBhcyBzdHJpbmcsIHsgbG5nLCBuczogbmFtZXNwYWNlIH0pO1xuICAgICAgICB0aGlzLmxvYWRVcmwodXJsLCBjYWxsYmFjayk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgcHJpdmF0ZSByZXNvbHZlVXJsKGxvYWRQYXRoOiBzdHJpbmcsIGRhdGE6IHsgbG5nOiBzdHJpbmc7IG5zOiBzdHJpbmc7IH0pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9VcmwodGhpcy5fc2VydmljZXMuaW50ZXJwb2xhdG9yLmludGVycG9sYXRlKGxvYWRQYXRoLCBkYXRhLCB1bmRlZmluZWQhLCB1bmRlZmluZWQhKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2FkVXJsKHVybDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogaTE4bi5DYWxsYmFja0Vycm9yIHwgc3RyaW5nLCBkYXRhOiBpMThuLlJlc291cmNlS2V5IHwgYm9vbGVhbikgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXF1ZXN0Lmpzb24odXJsLCB1bmRlZmluZWQsIHRoaXMuX29wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGpzb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBmYWlsZWQgbG9hZGluZzogJHt1cmx9LCAke3Jlc3VsdC5tZXNzYWdlfWA7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UgPT09IHJlc3VsdC5jb2RlICYmIHJlc3VsdC5jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXM6IG51bWJlciA9IHJlc3VsdC5jYXVzZS5zdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIGlmICg1MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDYwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgdHJ1ZSk7ICAvLyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKDQwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCBmYWxzZSk7IC8vIG5vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobXNnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET00sXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCAnLi9tb2R1bGUtZXh0ZW5kcyc7XG5cbi8qKiBAaW50ZXJuYWwgZXh0ZW5kcyBbW0RPTV1dIGluc3RhbmNlIG1ldGhvZCAqL1xuZnVuY3Rpb24gZXh0ZW5kKGRvbU9wdGlvbnM6IFJlcXVpcmVkPGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucz4sIGkxOG5leHQ6IGkxOG4uaTE4bik6IHZvaWQge1xuICAgIGNvbnN0IHtcbiAgICAgICAgc2VsZWN0b3JBdHRyLFxuICAgICAgICB0YXJnZXRBdHRyLFxuICAgICAgICBvcHRpb25zQXR0cixcbiAgICAgICAgdXNlT3B0aW9uc0F0dHIsXG4gICAgICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQsXG4gICAgICAgIGN1c3RvbVRhZ05hbWUsXG4gICAgfSA9IGRvbU9wdGlvbnM7XG5cbiAgICBjb25zdCBleHRlbmREZWZhdWx0ID0gKG86IFBsYWluT2JqZWN0LCB2YWw6IHN0cmluZyk6IFBsYWluT2JqZWN0ID0+IHtcbiAgICAgICAgaWYgKCFwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyAuLi5vLCAuLi57IGRlZmF1bHRWYWx1ZTogdmFsIH0gfTtcbiAgICB9O1xuXG4gICAgLy8gW3ByZXBlbmRdL1thcHBlbmRdIGhlbHBlclxuICAgIGNvbnN0IGluc2VydCA9IChtZXRob2Q6ICdwcmVwZW5kJyB8ICdhcHBlbmQnLCAkZWw6IERPTSwga2V5OiBzdHJpbmcsIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmh0bWwoKSkpO1xuICAgICAgICBpZiAoZmFsc2UgPT09IGN1c3RvbVRhZ05hbWUpIHtcbiAgICAgICAgICAgICRlbFttZXRob2RdKHRyYW5zbGF0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZFdpdGhXcmFwID0gYDwke2N1c3RvbVRhZ05hbWV9PiR7dHJhbnNsYXRlZH08LyR7Y3VzdG9tVGFnTmFtZX0+YDtcbiAgICAgICAgICAgIGNvbnN0ICRmaXJzdENoaWxkID0gJCgkZWxbMF0uZmlyc3RFbGVtZW50Q2hpbGQpIGFzIERPTTtcbiAgICAgICAgICAgIGlmICgkZmlyc3RDaGlsZC5pcyhjdXN0b21UYWdOYW1lKSkge1xuICAgICAgICAgICAgICAgICRmaXJzdENoaWxkLnJlcGxhY2VXaXRoKHRyYW5zbGF0ZWRXaXRoV3JhcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRlbFttZXRob2RdKHRyYW5zbGF0ZWRXaXRoV3JhcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcGFyc2UgPSAoJGVsOiBET00sIGtleTogc3RyaW5nLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGxldCBhdHRyID0gJ3RleHQnO1xuXG4gICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnXScpO1xuICAgICAgICAgICAga2V5ICA9IHBhcnRzWzFdLnRyaW0oKTtcbiAgICAgICAgICAgIGF0dHIgPSBwYXJ0c1swXS5zdWJzdHIoMSwgcGFydHNbMF0ubGVuZ3RoIC0gMSkudHJpbSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdodG1sJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgJGVsLmh0bWwoaTE4bmV4dC50KGtleSwgZXh0ZW5kRGVmYXVsdChvcHRzLCAkZWwuaHRtbCgpKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKCd0ZXh0JyA9PT0gYXR0cikge1xuICAgICAgICAgICAgJGVsLnRleHQoaTE4bmV4dC50PHN0cmluZz4oa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC50ZXh0KCkpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3ByZXBlbmQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICBpbnNlcnQoJ3ByZXBlbmQnLCAkZWwsIGtleSwgb3B0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2FwcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgnYXBwZW5kJywgJGVsLCBrZXksIG9wdHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGF0dHIuc3RhcnRzV2l0aCgnZGF0YS0nKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YUF0dHIgPSBhdHRyLnN1YnN0cigoJ2RhdGEtJykubGVuZ3RoKTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSBpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5kYXRhKGRhdGFBdHRyKSBhcyBzdHJpbmcpKTtcbiAgICAgICAgICAgICRlbC5kYXRhKGRhdGFBdHRyLCB0cmFuc2xhdGVkKTtcbiAgICAgICAgICAgICRlbC5hdHRyKGF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgaTE4bmV4dC50PHN0cmluZz4oa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5hdHRyKGF0dHIpIGFzIHN0cmluZykpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBsb2NhbGl6ZSA9ICgkZWw6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSAkZWwuYXR0cihzZWxlY3RvckF0dHIpO1xuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0ICR0YXJnZXQgPSAkZWw7XG4gICAgICAgIGNvbnN0IHRhcmdldFNlbGVjdG9yID0gJGVsLmRhdGEodGFyZ2V0QXR0cikgYXMgc3RyaW5nO1xuXG4gICAgICAgIGlmICh0YXJnZXRTZWxlY3Rvcikge1xuICAgICAgICAgICAgJHRhcmdldCA9ICRlbC5maW5kKHRhcmdldFNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb3B0cyAmJiB0cnVlID09PSB1c2VPcHRpb25zQXR0cikge1xuICAgICAgICAgICAgb3B0cyA9ICRlbC5kYXRhKG9wdGlvbnNBdHRyKSBhcyBpMThuLlRPcHRpb25zO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIGtleS5zcGxpdCgnOycpKSB7XG4gICAgICAgICAgICBjb25zdCBrID0gcGFydC50cmltKCk7XG4gICAgICAgICAgICBpZiAoJycgIT09IGspIHtcbiAgICAgICAgICAgICAgICBwYXJzZSgkdGFyZ2V0LCBrLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0cnVlID09PSB1c2VPcHRpb25zQXR0cikge1xuICAgICAgICAgICAgY29uc3QgY2xvbmUgPSB7IC4uLm9wdHMgfTtcbiAgICAgICAgICAgIGRlbGV0ZSBjbG9uZS5sbmc7XG4gICAgICAgICAgICAkZWwuZGF0YShvcHRpb25zQXR0ciwgY2xvbmUpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZSh0aGlzOiBET00sIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiBET00ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8taW52YWxpZC10aGlzXG4gICAgICAgIHJldHVybiB0aGlzLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICAvLyBsb2NhbGl6ZSBlbGVtZW50IGl0c2VsZlxuICAgICAgICAgICAgbG9jYWxpemUoJGVsLCBvcHRzKTtcbiAgICAgICAgICAgIC8vIGxvY2FsaXplIGNoaWxkcmVuXG4gICAgICAgICAgICBjb25zdCAkY2hpbGRyZW4gPSAkZWwuZmluZChgWyR7c2VsZWN0b3JBdHRyfV1gKTtcbiAgICAgICAgICAgICRjaGlsZHJlbi5lYWNoKChpbmRleDogbnVtYmVyLCBlbDogSFRNTEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkKGVsKSwgb3B0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gc2VsZWN0b3IgZnVuY3Rpb24gJChteVNlbGVjdG9yKS5sb2NhbGl6ZShvcHRzKTtcbiAgICAkLmZuWydsb2NhbGl6ZSddID0gaGFuZGxlO1xufVxuXG4vKipcbiAqIEBlbiBgaTE4bmV4dGAgRE9NIGxvY2FsaXplciBidWlsdC1pbiBwbHVnaW4gZmFjdG9yeS5cbiAqIEBqYSBgaTE4bmV4dGAgRE9NIOODreODvOOCq+ODqeOCpOOCuuODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+ODleOCoeOCr+ODiOODquODvOODoeOCveODg+ODiVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gRG9tTG9jYWxpemVyKGRvbU9wdGlvbnM/OiBpMThuLkRvbUxvY2FsaXplck9wdGlvbnMpOiBpMThuLlRoaXJkUGFydHlNb2R1bGUge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICczcmRQYXJ0eScsXG4gICAgICAgIGluaXQ6IGV4dGVuZC5iaW5kKFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yQXR0cjogJ2RhdGEtaTE4bicsXG4gICAgICAgICAgICAgICAgdGFyZ2V0QXR0cjogJ2kxOG4tdGFyZ2V0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25zQXR0cjogJ2kxOG4tb3B0aW9ucycsXG4gICAgICAgICAgICAgICAgdXNlT3B0aW9uc0F0dHI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY3VzdG9tVGFnTmFtZTogJ2NkcC1pMThuJyxcbiAgICAgICAgICAgIH0sIGRvbU9wdGlvbnMpXG4gICAgICAgICksXG4gICAgfTtcbn1cbiIsImV4cG9ydCAqIGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIGRvbSBhcyAkLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgSTE4Tk9wdGlvbnMsIEkxOE5EZXRlY3RFcnJvckJlaGF2aW91ciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBuYXZpZ2F0b3IgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBBamF4QmFja2VuZCwgRG9tTG9jYWxpemVyIH0gZnJvbSAnLi9wbHVnaW4nO1xuXG4vKipcbiAqIEBlbiBUcmFuc2xhdGUgZnVuY2lvbi5cbiAqIEBqYSDnv7voqLPplqLmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IHQ6IGkxOG4uVEZ1bmN0aW9uID0gaTE4bi50LmJpbmQoaTE4bik7XG5cbi8qKlxuICogQGVuIEluaXRpYWxpemUgYGkxOG5leHRgIGluc3RhbmNlLlxuICogQGphIGBpMThuZXh0YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7liJ3mnJ/ljJZcbiAqXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBpbml0IG9wdGlvbnNcbiAqICAtIGBqYWAg5Yid5pyf5YyW44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBpbml0aWFsaXplSTE4TiA9IChvcHRpb25zPzogSTE4Tk9wdGlvbnMpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBub1Rocm93OiB0cnVlIH0sIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgeyBuYW1lc3BhY2UsIHJlc291cmNlUGF0aDogbG9hZFBhdGgsIGRvbSwgbm9UaHJvdyB9ID0gb3B0cztcblxuICAgIGlmICghb3B0cy5sbmcpIHtcbiAgICAgICAgb3B0cy5sbmcgPSBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG4gICAgfVxuXG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAhb3B0cy5ucyAmJiAob3B0cy5ucyA9IG5hbWVzcGFjZSk7XG4gICAgICAgICFvcHRzLmRlZmF1bHROUyAmJiAob3B0cy5kZWZhdWx0TlMgPSBuYW1lc3BhY2UpO1xuICAgIH1cblxuICAgIGlmIChsb2FkUGF0aCkge1xuICAgICAgICBvcHRzLmJhY2tlbmQgPSBPYmplY3QuYXNzaWduKHsgbG9hZFBhdGggfSwgb3B0cy5iYWNrZW5kKTtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5iYWNrZW5kKSB7XG4gICAgICAgIGkxOG4udXNlKEFqYXhCYWNrZW5kKTtcbiAgICB9XG5cbiAgICBpMThuLnVzZShEb21Mb2NhbGl6ZXIoZG9tKSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2b2lkIGkxOG4uaW5pdChvcHRzLCAoZXJyb3IsIHRyYW5zbGF0b3IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfSTE4Tl9DT1JFX0xBWUVSLCAnaTE4biNpbml0KCkgZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBpZiAobm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4ocmVzdWx0Lm1lc3NhZ2UsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUodHJhbnNsYXRvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBjdXJyZW50IGRldGVjdGVkIG9yIHNldCBsYW5ndWFnZS5cbiAqIEBqYSDnj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovoqIDoqp7jgpLlj5blvpdcbiAqXG4gKiBAcmV0dXJucyBgamEtSlBgLCBgamFgXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRMYW5ndWFnZSA9ICgpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBpMThuLmxhbmd1YWdlIHx8IG5hdmlnYXRvci5sYW5ndWFnZTtcbn07XG5cbi8qKlxuICogQGVuIEdldCBhbiBhcnJheSBvZiBgbGFuZ3VhZ2UtY29kZXNgIHRoYXQgd2lsbCBiZSB1c2VkIGl0IG9yZGVyIHRvIGxvb2t1cCB0aGUgdHJhbnNsYXRpb24gdmFsdWUuXG4gKiBAamEg57+76Kiz44Gu5qSc57Si44Gr5L2/55So44GV44KM44KLIGBsYW5ndWFnZS1jb2Rlc2Ag44Oq44K544OI44KS5Y+W5b6XXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly93d3cuaTE4bmV4dC5jb20vb3ZlcnZpZXcvYXBpI2xhbmd1YWdlc1xuICovXG5leHBvcnQgY29uc3QgZ2V0TGFuZ3VhZ2VMaXN0ID0gKCk6IHN0cmluZ1tdID0+IHtcbiAgICByZXR1cm4gaTE4bi5sYW5ndWFnZXMgfHwgW25hdmlnYXRvci5sYW5ndWFnZV07XG59O1xuXG4vKipcbiAqIEBlbiBDaGFuZ2VzIHRoZSBsYW5ndWFnZS5cbiAqIEBqYSDoqIDoqp7jga7liIfjgormm7/jgYhcbiAqL1xuZXhwb3J0IGNvbnN0IGNoYW5nZUxhbmd1YWdlID0gKGxuZzogc3RyaW5nLCBvcHRpb25zPzogSTE4TkRldGVjdEVycm9yQmVoYXZpb3VyKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4gPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbm9UaHJvdzogdHJ1ZSB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2b2lkIGkxOG4uY2hhbmdlTGFuZ3VhZ2UobG5nLCAoZXJyb3IsIHRyYW5zbGF0b3IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfSTE4Tl9DT1JFX0xBWUVSLCAnaTE4biNjaGFuZ2VMYW5ndWF0ZSgpIGZhaWxlZC4nLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgaWYgKG9wdHMubm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4ocmVzdWx0Lm1lc3NhZ2UsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUodHJhbnNsYXRvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBAZW4gRE9NIGxvY2FsaXplciBtZXRob2QuXG4gKiBAamEgRE9NIOODreODvOOCq+ODqeOCpOOCulxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB0cmFuc2xhdGlvbiBvcHRpb25zLlxuICogIC0gYGphYCDnv7voqLPjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGNvbnN0IGxvY2FsaXplID0gPFQgZXh0ZW5kcyBzdHJpbmcgfCBOb2RlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4sIG9wdGlvbnM/OiBpMThuLlRPcHRpb25zKTogRE9NUmVzdWx0PFQ+ID0+IHtcbiAgICByZXR1cm4gJChzZWxlY3RvcikubG9jYWxpemUob3B0aW9ucykgYXMgRE9NUmVzdWx0PFQ+O1xufTtcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsInRvVXJsIiwicmVxdWVzdCIsInJlc3VsdCIsInRvUmVzdWx0IiwiUkVTVUxUX0NPREUiLCIkIiwiaTE4biIsIm5hdmlnYXRvciIsIm1ha2VSZXN1bHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7O0lBTUE7Ozs7O1FBVUk7UUFBQTtZQUNJLDRFQUEwQyxDQUFBO1lBQzFDLG1EQUF3QixZQUFBLGtCQUFrQixnQkFBdUIsZ0JBQXVCLENBQUMsRUFBRSxlQUFlLENBQUMsMkJBQUEsQ0FBQTtTQUM5RyxJQUFBO0lBQ0wsQ0FBQzs7SUNsQkQsaUJBQWlCLE1BQU0sVUFBVSxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQzs7SUNGOUQ7OztJQWtCQTtJQUVBOzs7Ozs7VUFNYSxXQUFXO1FBQXhCO1lBQ2EsU0FBSSxHQUFHLFNBQVMsQ0FBQztZQUdsQixhQUFRLEdBQTRCLEVBQUUsQ0FBQztZQUN2QyxpQkFBWSxHQUF3QixFQUFFLENBQUM7U0E2Q2xEOzs7UUF4Q0csSUFBSSxDQUFDLFFBQXVCLEVBQUUsT0FBZ0MsRUFBRSxXQUF3QjtZQUNwRixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztZQUMxQixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLHFEQUFxQixFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDdkYsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDdkY7UUFFRCxJQUFJLENBQUMsUUFBZ0IsRUFB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
