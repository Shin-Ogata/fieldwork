/*!
 * @cdp/i18n 0.9.17
 *   internationalization module
 */

import { i18n } from '@cdp/extension-i18n';
export * from '@cdp/extension-i18n';
import { toResult, RESULT_CODE, makeResult } from '@cdp/result';
import { dom } from '@cdp/dom';
import { safe, isFunction } from '@cdp/core-utils';
import { request } from '@cdp/ajax';
import { toUrl } from '@cdp/web-utils';

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

/** @internal */ const navigator = safe(globalThis.navigator);

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
        const loadPath = isFunction(this._options.loadPath) ? this._options.loadPath([lng], [namespace]) : this._options.loadPath;
        const url = this.resolveUrl(loadPath, { lng, ns: namespace });
        this.loadUrl(url, callback);
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    resolveUrl(loadPath, data) {
        return toUrl(this._services.interpolator.interpolate(loadPath, data, undefined, undefined));
    }
    loadUrl(url, callback) {
        void (async () => {
            try {
                const json = await request.json(url, this._options);
                callback(null, json);
            }
            catch (e) {
                const result = toResult(e);
                const msg = `failed loading: ${url}, ${result.message}`;
                if (RESULT_CODE.ERROR_AJAX_RESPONSE === result.code && result.cause) {
                    const { status } = result.cause;
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
            for (const root of dom.utils.rootify(el)) {
                const $el = dom(root);
                // localize element itself
                localize($el, opts);
                // localize children
                const $children = $el.find(`[${selectorAttr}]`);
                $children.each((index, el) => {
                    localize(dom(el), opts);
                });
            }
        });
    }
    // selector function $(mySelector).localize(opts);
    dom.fn['localize'] = handle;
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
const t = i18n.t.bind(i18n);
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
        i18n.use(AjaxBackend);
    }
    i18n.use(DomLocalizer(dom));
    return new Promise((resolve, reject) => {
        void i18n.init(opts, (error, translator) => {
            if (error) {
                const result = makeResult(RESULT_CODE.ERROR_I18N_CORE_LAYER, 'i18n#init() failed.', error);
                if (noThrow) {
                    console.warn(result.message, result);
                }
                else {
                    return reject(result);
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
    return i18n.language || navigator.language;
};
/**
 * @en Get an array of `language-codes` that will be used it order to lookup the translation value.
 * @ja 翻訳の検索に使用される `language-codes` リストを取得
 *
 * @see
 *  - https://www.i18next.com/overview/api#languages
 */
const getLanguageList = () => {
    return i18n.languages || [navigator.language];
};
/**
 * @en Changes the language.
 * @ja 言語の切り替え
 */
const changeLanguage = (lng, options) => {
    const opts = Object.assign({ noThrow: true }, options);
    return new Promise((resolve, reject) => {
        void i18n.changeLanguage(lng, (error, translator) => {
            if (error) {
                const result = makeResult(RESULT_CODE.ERROR_I18N_CORE_LAYER, 'i18n#changeLanguate() failed.', error);
                if (opts.noThrow) {
                    console.warn(result.message, result);
                }
                else {
                    return reject(result);
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
    return dom(selector).localize(options);
};

export { changeLanguage, getLanguage, getLanguageList, initializeI18N, localize, t };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJzc3IudHMiLCJwbHVnaW4vYWpheC1iYWNrZW5kLnRzIiwicGx1Z2luL2RvbS1sb2NhbGl6ZXIudHMiLCJjb3JlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgSTE4TiA9IENEUF9LTk9XTl9NT0RVTEUuSTE4TiAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBJMThOX0RFQ0xBUkUgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0kxOE5fQ09SRV9MQVlFUiA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkkxOE4gKyAxLCAnaTE4bmV4dCBlcnJvcicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgbmF2aWdhdG9yID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24sXG4gKi9cblxuaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgdG9SZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyByZXF1ZXN0IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IHRvVXJsIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHsgSTE4Tk9wdGlvbnMgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZWZhdWx0IHtcbiAgICBMT0FEX1BBVEggPSAncmVzL2xvY2FsZXMve3tuc319Lnt7bG5nfX0uanNvbicsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBGYWxsYmFja1Jlc291cmNlTWFwID0geyBbbG5nOiBzdHJpbmddOiBzdHJpbmc7IH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgYSBzaW1wbGUgYGkxOG5leHRgIGJhY2tlbmQgYnVpbHQtaW4gcGx1Z2luLiBJdCB3aWxsIGxvYWQgcmVzb3VyY2VzIGZyb20gYSBiYWNrZW5kIHNlcnZlciB1c2luZyB0aGUgYGZldGNoYCBBUEkuXG4gKiBAamEgYGZldGNoYCBBUEkg44KS55So44GE44GfIGBpMThuZXh0YCBiYWNrZW5kIOODk+ODq+ODiOOCpOODs+ODl+ODqeOCsOOCpOODs+OCr+ODqeOCuVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY2xhc3MgQWpheEJhY2tlbmQgaW1wbGVtZW50cyBpMThuLkJhY2tlbmRNb2R1bGU8aTE4bi5BamF4QmFja2VuZE9wdGlvbnM+IHtcbiAgICByZWFkb25seSB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHN0YXRpYyB0eXBlID0gJ2JhY2tlbmQnO1xuICAgIHByaXZhdGUgX3NlcnZpY2VzITogaTE4bi5TZXJ2aWNlcztcbiAgICBwcml2YXRlIF9vcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucyA9IHt9O1xuICAgIHByaXZhdGUgX2ZhbGxiYWNrTWFwOiBGYWxsYmFja1Jlc291cmNlTWFwID0ge307XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBpMThuLkJhY2tlbmRNb2R1bGU8QWpheEJhY2tlbmRPcHRpb25zPlxuXG4gICAgaW5pdChzZXJ2aWNlczogaTE4bi5TZXJ2aWNlcywgb3B0aW9uczogaTE4bi5BamF4QmFja2VuZE9wdGlvbnMsIGluaXRPcHRpb25zOiBJMThOT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgICAgICB0aGlzLl9vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoOiBEZWZhdWx0LkxPQURfUEFUSCB9LCB0aGlzLl9vcHRpb25zLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fZmFsbGJhY2tNYXAgPSBPYmplY3QuYXNzaWduKHRoaXMuX2ZhbGxiYWNrTWFwLCBpbml0T3B0aW9ucy5mYWxsYmFja1Jlc291cmNlcyk7XG4gICAgfVxuXG4gICAgcmVhZChsYW5ndWFnZTogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgY2FsbGJhY2s6IGkxOG4uUmVhZENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGxuZyA9IHRoaXMuX2ZhbGxiYWNrTWFwW2xhbmd1YWdlXSB8fCBsYW5ndWFnZTtcbiAgICAgICAgY29uc3QgbG9hZFBhdGggPSBpc0Z1bmN0aW9uKHRoaXMuX29wdGlvbnMubG9hZFBhdGgpID8gdGhpcy5fb3B0aW9ucy5sb2FkUGF0aChbbG5nXSwgW25hbWVzcGFjZV0pIDogdGhpcy5fb3B0aW9ucy5sb2FkUGF0aDtcbiAgICAgICAgY29uc3QgdXJsID0gdGhpcy5yZXNvbHZlVXJsKGxvYWRQYXRoIGFzIHN0cmluZywgeyBsbmcsIG5zOiBuYW1lc3BhY2UgfSk7XG4gICAgICAgIHRoaXMubG9hZFVybCh1cmwsIGNhbGxiYWNrKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICBwcml2YXRlIHJlc29sdmVVcmwobG9hZFBhdGg6IHN0cmluZywgZGF0YTogeyBsbmc6IHN0cmluZzsgbnM6IHN0cmluZzsgfSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b1VybCh0aGlzLl9zZXJ2aWNlcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUobG9hZFBhdGgsIGRhdGEsIHVuZGVmaW5lZCEsIHVuZGVmaW5lZCEpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvYWRVcmwodXJsOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBpMThuLkNhbGxiYWNrRXJyb3IgfCBzdHJpbmcsIGRhdGE6IGkxOG4uUmVzb3VyY2VLZXkgfCBib29sZWFuKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcXVlc3QuanNvbih1cmwsIHRoaXMuX29wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGpzb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRvUmVzdWx0KGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBmYWlsZWQgbG9hZGluZzogJHt1cmx9LCAke3Jlc3VsdC5tZXNzYWdlfWA7XG4gICAgICAgICAgICAgICAgaWYgKFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UgPT09IHJlc3VsdC5jb2RlICYmIHJlc3VsdC5jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHN0YXR1cyB9ID0gcmVzdWx0LmNhdXNlIGFzIHsgc3RhdHVzOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgICAgIGlmICg1MDAgPD0gc3RhdHVzICYmIHN0YXR1cyA8IDYwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1zZywgdHJ1ZSk7ICAvLyByZXRyeVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKDQwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCBmYWxzZSk7IC8vIG5vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobXNnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgaTE4biB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLWkxOG4nO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET00sXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCAnLi9tb2R1bGUtZXh0ZW5kcyc7XG5cbi8qKiBAaW50ZXJuYWwgZXh0ZW5kcyBbW0RPTV1dIGluc3RhbmNlIG1ldGhvZCAqL1xuZnVuY3Rpb24gZXh0ZW5kKGRvbU9wdGlvbnM6IFJlcXVpcmVkPGkxOG4uRG9tTG9jYWxpemVyT3B0aW9ucz4sIGkxOG5leHQ6IGkxOG4uaTE4bik6IHZvaWQge1xuICAgIGNvbnN0IHtcbiAgICAgICAgc2VsZWN0b3JBdHRyLFxuICAgICAgICB0YXJnZXRBdHRyLFxuICAgICAgICBvcHRpb25zQXR0cixcbiAgICAgICAgdXNlT3B0aW9uc0F0dHIsXG4gICAgICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQsXG4gICAgICAgIGN1c3RvbVRhZ05hbWUsXG4gICAgfSA9IGRvbU9wdGlvbnM7XG5cbiAgICBjb25zdCBleHRlbmREZWZhdWx0ID0gKG86IFBsYWluT2JqZWN0LCB2YWw6IHN0cmluZyk6IFBsYWluT2JqZWN0ID0+IHtcbiAgICAgICAgaWYgKCFwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyAuLi5vLCAuLi57IGRlZmF1bHRWYWx1ZTogdmFsIH0gfTtcbiAgICB9O1xuXG4gICAgLy8gW3ByZXBlbmRdL1thcHBlbmRdIGhlbHBlclxuICAgIGNvbnN0IGluc2VydCA9IChtZXRob2Q6ICdwcmVwZW5kJyB8ICdhcHBlbmQnLCAkZWw6IERPTSwga2V5OiBzdHJpbmcsIG9wdHM6IGkxOG4uVE9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmh0bWwoKSkpO1xuICAgICAgICBpZiAoZmFsc2UgPT09IGN1c3RvbVRhZ05hbWUpIHtcbiAgICAgICAgICAgICRlbFttZXRob2RdKHRyYW5zbGF0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZFdpdGhXcmFwID0gYDwke2N1c3RvbVRhZ05hbWV9PiR7dHJhbnNsYXRlZH08LyR7Y3VzdG9tVGFnTmFtZX0+YDtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkZWwuY2hpbGRyZW4oY3VzdG9tVGFnTmFtZSk7XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkdGFyZ2V0LnJlcGxhY2VXaXRoKHRyYW5zbGF0ZWRXaXRoV3JhcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRlbFttZXRob2RdKHRyYW5zbGF0ZWRXaXRoV3JhcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcGFyc2UgPSAoJGVsOiBET00sIGtleTogc3RyaW5nLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGxldCBhdHRyID0gJ3RleHQnO1xuXG4gICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnXScpO1xuICAgICAgICAgICAga2V5ICA9IHBhcnRzWzFdLnRyaW0oKTtcbiAgICAgICAgICAgIGF0dHIgPSBwYXJ0c1swXS5zdWJzdHJpbmcoMSwgcGFydHNbMF0ubGVuZ3RoKS50cmltKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2h0bWwnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwuaHRtbChpMThuZXh0LnQoa2V5LCBleHRlbmREZWZhdWx0KG9wdHMsICRlbC5odG1sKCkpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3RleHQnID09PSBhdHRyKSB7XG4gICAgICAgICAgICAkZWwudGV4dChpMThuZXh0LnQ8c3RyaW5nPihrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLnRleHQoKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmICgncHJlcGVuZCcgPT09IGF0dHIpIHtcbiAgICAgICAgICAgIGluc2VydCgncHJlcGVuZCcsICRlbCwga2V5LCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyA9PT0gYXR0cikge1xuICAgICAgICAgICAgaW5zZXJ0KCdhcHBlbmQnLCAkZWwsIGtleSwgb3B0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXR0ci5zdGFydHNXaXRoKCdkYXRhLScpKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhQXR0ciA9IGF0dHIuc3Vic3RyaW5nKCgnZGF0YS0nKS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IGkxOG5leHQudChrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmRhdGEoZGF0YUF0dHIpIGFzIHN0cmluZykpO1xuICAgICAgICAgICAgJGVsLmRhdGEoZGF0YUF0dHIsIHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgJGVsLmF0dHIoYXR0ciwgdHJhbnNsYXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZWwuYXR0cihhdHRyLCBpMThuZXh0LnQ8c3RyaW5nPihrZXksIGV4dGVuZERlZmF1bHQob3B0cywgJGVsLmF0dHIoYXR0cikgYXMgc3RyaW5nKSkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGxvY2FsaXplID0gKCRlbDogRE9NLCBvcHRzOiBpMThuLlRPcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9ICRlbC5hdHRyKHNlbGVjdG9yQXR0cik7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgJHRhcmdldCA9ICRlbDtcbiAgICAgICAgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSAkZWwuZGF0YSh0YXJnZXRBdHRyKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKHRhcmdldFNlbGVjdG9yKSB7XG4gICAgICAgICAgICAkdGFyZ2V0ID0gJGVsLmZpbmQodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRzICYmIHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBvcHRzID0gJGVsLmRhdGEob3B0aW9uc0F0dHIpIGFzIGkxOG4uVE9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2Yga2V5LnNwbGl0KCc7JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGsgPSBwYXJ0LnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgnJyAhPT0gaykge1xuICAgICAgICAgICAgICAgIHBhcnNlKCR0YXJnZXQsIGssIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRydWUgPT09IHVzZU9wdGlvbnNBdHRyKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHsgLi4ub3B0cyB9O1xuICAgICAgICAgICAgZGVsZXRlIGNsb25lLmxuZztcbiAgICAgICAgICAgICRlbC5kYXRhKG9wdGlvbnNBdHRyLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlKHRoaXM6IERPTSwgb3B0czogaTE4bi5UT3B0aW9ucyk6IERPTSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbnZhbGlkLXRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCgoaW5kZXg6IG51bWJlciwgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJvb3Qgb2YgJC51dGlscy5yb290aWZ5KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQocm9vdCk7XG4gICAgICAgICAgICAgICAgLy8gbG9jYWxpemUgZWxlbWVudCBpdHNlbGZcbiAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkZWwsIG9wdHMpO1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsaXplIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgY29uc3QgJGNoaWxkcmVuID0gJGVsLmZpbmQoYFske3NlbGVjdG9yQXR0cn1dYCk7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuLmVhY2goKGluZGV4OiBudW1iZXIsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbGl6ZSgkKGVsKSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNlbGVjdG9yIGZ1bmN0aW9uICQobXlTZWxlY3RvcikubG9jYWxpemUob3B0cyk7XG4gICAgJC5mblsnbG9jYWxpemUnXSA9IGhhbmRsZTtcbn1cblxuLyoqXG4gKiBAZW4gYGkxOG5leHRgIERPTSBsb2NhbGl6ZXIgYnVpbHQtaW4gcGx1Z2luIGZhY3RvcnkuXG4gKiBAamEgYGkxOG5leHRgIERPTSDjg63jg7zjgqvjg6njgqTjgrrjg5Pjg6vjg4jjgqTjg7Pjg5fjg6njgrDjgqTjg7Pjg5XjgqHjgq/jg4jjg6rjg7zjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIERvbUxvY2FsaXplcihkb21PcHRpb25zPzogaTE4bi5Eb21Mb2NhbGl6ZXJPcHRpb25zKTogaTE4bi5UaGlyZFBhcnR5TW9kdWxlIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnM3JkUGFydHknLFxuICAgICAgICBpbml0OiBleHRlbmQuYmluZChcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvckF0dHI6ICdkYXRhLWkxOG4nLFxuICAgICAgICAgICAgICAgIHRhcmdldEF0dHI6ICdpMThuLXRhcmdldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uc0F0dHI6ICdpMThuLW9wdGlvbnMnLFxuICAgICAgICAgICAgICAgIHVzZU9wdGlvbnNBdHRyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwYXJzZURlZmF1bHRWYWx1ZUZyb21Db250ZW50OiB0cnVlLFxuICAgICAgICAgICAgICAgIGN1c3RvbVRhZ05hbWU6ICdjZHAtaTE4bicsXG4gICAgICAgICAgICB9LCBkb21PcHRpb25zKVxuICAgICAgICApLFxuICAgIH07XG59XG4iLCJleHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBkb20gYXMgJCxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IEkxOE5PcHRpb25zLCBJMThORGV0ZWN0RXJyb3JCZWhhdmlvdXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgbmF2aWdhdG9yIH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgQWpheEJhY2tlbmQsIERvbUxvY2FsaXplciB9IGZyb20gJy4vcGx1Z2luJztcblxuLyoqXG4gKiBAZW4gVHJhbnNsYXRlIGZ1bmNpb24uXG4gKiBAamEg57+76Kiz6Zai5pWwXG4gKi9cbmV4cG9ydCBjb25zdCB0OiBpMThuLlRGdW5jdGlvbiA9IGkxOG4udC5iaW5kKGkxOG4pO1xuXG4vKipcbiAqIEBlbiBJbml0aWFsaXplIGBpMThuZXh0YCBpbnN0YW5jZS5cbiAqIEBqYSBgaTE4bmV4dGAg44Kk44Oz44K544K/44Oz44K544Gu5Yid5pyf5YyWXG4gKlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgaW5pdCBvcHRpb25zXG4gKiAgLSBgamFgIOWIneacn+WMluOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgaW5pdGlhbGl6ZUkxOE4gPSAob3B0aW9ucz86IEkxOE5PcHRpb25zKTogUHJvbWlzZTxpMThuLlRGdW5jdGlvbj4gPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbm9UaHJvdzogdHJ1ZSB9LCBvcHRpb25zKTtcblxuICAgIGNvbnN0IHsgbmFtZXNwYWNlLCByZXNvdXJjZVBhdGg6IGxvYWRQYXRoLCBkb20sIG5vVGhyb3cgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW9wdHMubG5nKSB7XG4gICAgICAgIG9wdHMubG5nID0gbmF2aWdhdG9yLmxhbmd1YWdlO1xuICAgIH1cblxuICAgIGlmIChuYW1lc3BhY2UpIHtcbiAgICAgICAgIW9wdHMubnMgJiYgKG9wdHMubnMgPSBuYW1lc3BhY2UpO1xuICAgICAgICAhb3B0cy5kZWZhdWx0TlMgJiYgKG9wdHMuZGVmYXVsdE5TID0gbmFtZXNwYWNlKTtcbiAgICB9XG5cbiAgICBpZiAobG9hZFBhdGgpIHtcbiAgICAgICAgb3B0cy5iYWNrZW5kID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoIH0sIG9wdHMuYmFja2VuZCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdHMuYmFja2VuZCkge1xuICAgICAgICBpMThuLnVzZShBamF4QmFja2VuZCk7XG4gICAgfVxuXG4gICAgaTE4bi51c2UoRG9tTG9jYWxpemVyKGRvbSkpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdm9pZCBpMThuLmluaXQob3B0cywgKGVycm9yLCB0cmFuc2xhdG9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0kxOE5fQ09SRV9MQVlFUiwgJ2kxOG4jaW5pdCgpIGZhaWxlZC4nLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgaWYgKG5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHJlc3VsdC5tZXNzYWdlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHRyYW5zbGF0b3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIEdldCB0aGUgY3VycmVudCBkZXRlY3RlZCBvciBzZXQgbGFuZ3VhZ2UuXG4gKiBAamEg54++5Zyo6Kit5a6a44GV44KM44Gm44GE44KL6KiA6Kqe44KS5Y+W5b6XXG4gKlxuICogQHJldHVybnMgYGphLUpQYCwgYGphYFxuICovXG5leHBvcnQgY29uc3QgZ2V0TGFuZ3VhZ2UgPSAoKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gaTE4bi5sYW5ndWFnZSB8fCBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgYW4gYXJyYXkgb2YgYGxhbmd1YWdlLWNvZGVzYCB0aGF0IHdpbGwgYmUgdXNlZCBpdCBvcmRlciB0byBsb29rdXAgdGhlIHRyYW5zbGF0aW9uIHZhbHVlLlxuICogQGphIOe/u+ios+OBruaknOe0ouOBq+S9v+eUqOOBleOCjOOCiyBgbGFuZ3VhZ2UtY29kZXNgIOODquOCueODiOOCkuWPluW+l1xuICpcbiAqIEBzZWVcbiAqICAtIGh0dHBzOi8vd3d3LmkxOG5leHQuY29tL292ZXJ2aWV3L2FwaSNsYW5ndWFnZXNcbiAqL1xuZXhwb3J0IGNvbnN0IGdldExhbmd1YWdlTGlzdCA9ICgpOiByZWFkb25seSBzdHJpbmdbXSA9PiB7XG4gICAgcmV0dXJuIGkxOG4ubGFuZ3VhZ2VzIHx8IFtuYXZpZ2F0b3IubGFuZ3VhZ2VdO1xufTtcblxuLyoqXG4gKiBAZW4gQ2hhbmdlcyB0aGUgbGFuZ3VhZ2UuXG4gKiBAamEg6KiA6Kqe44Gu5YiH44KK5pu/44GIXG4gKi9cbmV4cG9ydCBjb25zdCBjaGFuZ2VMYW5ndWFnZSA9IChsbmc6IHN0cmluZywgb3B0aW9ucz86IEkxOE5EZXRlY3RFcnJvckJlaGF2aW91cik6IFByb21pc2U8aTE4bi5URnVuY3Rpb24+ID0+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG5vVGhyb3c6IHRydWUgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdm9pZCBpMThuLmNoYW5nZUxhbmd1YWdlKGxuZywgKGVycm9yLCB0cmFuc2xhdG9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0kxOE5fQ09SRV9MQVlFUiwgJ2kxOG4jY2hhbmdlTGFuZ3VhdGUoKSBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRzLm5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHJlc3VsdC5tZXNzYWdlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHRyYW5zbGF0b3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQGVuIERPTSBsb2NhbGl6ZXIgbWV0aG9kLlxuICogQGphIERPTSDjg63jg7zjgqvjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdHJhbnNsYXRpb24gb3B0aW9ucy5cbiAqICAtIGBqYWAg57+76Kiz44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBjb25zdCBsb2NhbGl6ZSA9IDxUIGV4dGVuZHMgc3RyaW5nIHwgTm9kZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBvcHRpb25zPzogaTE4bi5UT3B0aW9ucyk6IERPTVJlc3VsdDxUPiA9PiB7XG4gICAgcmV0dXJuICQoc2VsZWN0b3IpLmxvY2FsaXplKG9wdGlvbnMpIGFzIERPTVJlc3VsdDxUPjtcbn07XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBOzs7QUFHRztBQUVILENBQUEsWUFBcUI7QUFNakI7OztBQUdHO0FBQ0gsSUFBQSxJQUdDLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQSxDQUFBO0FBSEQsSUFBQSxDQUFBLFlBQXVCO0FBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsY0FBMEMsQ0FBQTtRQUMxQyxXQUF3QixDQUFBLFdBQUEsQ0FBQSx1QkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsOEJBQXVCLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQSxHQUFBLHVCQUFBLENBQUE7QUFDL0csS0FBQyxHQUFBLENBQUE7QUFDTCxDQUFDLEdBQUE7O0FDbEJELGlCQUF3QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQzs7QUNEcEU7O0FBRUc7QUFnQkg7QUFFQTs7Ozs7QUFLRztBQUNILE1BQWEsV0FBVyxDQUFBO0lBQ1gsSUFBSSxHQUFHLFNBQVMsQ0FBQztBQUMxQixJQUFBLE9BQU8sSUFBSSxHQUFHLFNBQVMsQ0FBQztBQUNoQixJQUFBLFNBQVMsQ0FBaUI7SUFDMUIsUUFBUSxHQUE0QixFQUFFLENBQUM7SUFDdkMsWUFBWSxHQUF3QixFQUFFLENBQUM7OztBQUsvQyxJQUFBLElBQUksQ0FBQyxRQUF1QixFQUFFLE9BQWdDLEVBQUUsV0FBd0IsRUFBQTtBQUNwRixRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0FBQzFCLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFtQixpQ0FBQSwwQkFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDdkYsUUFBQSxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztLQUN2RjtBQUVELElBQUEsSUFBSSxDQUFDLFFBQWdCLEVBQUUsU0FBaUIsRUFBRSxRQUEyQixFQUFBO1FBQ2pFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDO0FBQ3BELFFBQUEsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7QUFDMUgsUUFBQSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQWtCLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFDeEUsUUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMvQjs7O0lBS08sVUFBVSxDQUFDLFFBQWdCLEVBQUUsSUFBa0MsRUFBQTtBQUNuRSxRQUFBLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLFNBQVUsRUFBRSxTQUFVLENBQUMsQ0FBQyxDQUFDO0tBQ2pHO0lBRU8sT0FBTyxDQUFDLEdBQVcsRUFBRSxRQUFzRixFQUFBO1FBQy9HLEtBQUssQ0FBQyxZQUFXO1lBQ2IsSUFBSTtBQUNBLGdCQUFBLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3BELGdCQUFBLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDeEIsYUFBQTtBQUFDLFlBQUEsT0FBTyxDQUFDLEVBQUU7QUFDUixnQkFBQSxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLE1BQU0sR0FBRyxHQUFHLENBQW1CLGdCQUFBLEVBQUEsR0FBRyxLQUFLLE1BQU0sQ0FBQyxPQUFPLENBQUEsQ0FBRSxDQUFDO2dCQUN4RCxJQUFJLFdBQVcsQ0FBQyxtQkFBbUIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7QUFDakUsb0JBQUEsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxLQUE0QixDQUFDO0FBQ3ZELG9CQUFBLElBQUksR0FBRyxJQUFJLE1BQU0sSUFBSSxNQUFNLEdBQUcsR0FBRyxFQUFFO3dCQUMvQixPQUFPLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUIscUJBQUE7QUFBTSx5QkFBQSxJQUFJLEdBQUcsSUFBSSxNQUFNLElBQUksTUFBTSxHQUFHLEdBQUcsRUFBRTt3QkFDdEMsT0FBTyxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQy9CLHFCQUFBO0FBQ0osaUJBQUE7QUFDRCxnQkFBQSxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3hCLGFBQUE7U0FDSixHQUFHLENBQUM7S0FDUjs7O0FDbkVMO0FBQ0EsU0FBUyxNQUFNLENBQUMsVUFBOEMsRUFBRSxPQUFrQixFQUFBO0FBQzlFLElBQUEsTUFBTSxFQUNGLFlBQVksRUFDWixVQUFVLEVBQ1YsV0FBVyxFQUNYLGNBQWMsRUFDZCw0QkFBNEIsRUFDNUIsYUFBYSxHQUNoQixHQUFHLFVBQVUsQ0FBQztBQUVmLElBQUEsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFjLEVBQUUsR0FBVyxLQUFpQjtRQUMvRCxJQUFJLENBQUMsNEJBQTRCLEVBQUU7QUFDL0IsWUFBQSxPQUFPLENBQUMsQ0FBQztBQUNaLFNBQUE7UUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQzlDLEtBQUMsQ0FBQzs7SUFHRixNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQTRCLEVBQUUsR0FBUSxFQUFFLEdBQVcsRUFBRSxJQUFtQixLQUFVO0FBQzlGLFFBQUEsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25FLElBQUksS0FBSyxLQUFLLGFBQWEsRUFBRTtBQUN6QixZQUFBLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMzQixTQUFBO0FBQU0sYUFBQTtZQUNILE1BQU0sa0JBQWtCLEdBQUcsQ0FBSSxDQUFBLEVBQUEsYUFBYSxJQUFJLFVBQVUsQ0FBQSxFQUFBLEVBQUssYUFBYSxDQUFBLENBQUEsQ0FBRyxDQUFDO1lBQ2hGLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDNUMsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ2hCLGdCQUFBLE9BQU8sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxhQUFBO0FBQU0saUJBQUE7QUFDSCxnQkFBQSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNuQyxhQUFBO0FBQ0osU0FBQTtBQUNMLEtBQUMsQ0FBQztJQUVGLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBUSxFQUFFLEdBQVcsRUFBRSxJQUFtQixLQUFVO1FBQy9ELElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQztBQUVsQixRQUFBLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNyQixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLEdBQUcsR0FBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdkIsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUN4RCxTQUFBO1FBRUQsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0QsU0FBQTthQUFNLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtZQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQVMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLFNBQUE7YUFBTSxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7WUFDM0IsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3JDLFNBQUE7YUFBTSxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDMUIsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3BDLFNBQUE7QUFBTSxhQUFBLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUNqQyxZQUFBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbEQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBVyxDQUFDLENBQUMsQ0FBQztBQUNyRixZQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQy9CLFlBQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDOUIsU0FBQTtBQUFNLGFBQUE7WUFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFTLEdBQUcsRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekYsU0FBQTtBQUNMLEtBQUMsQ0FBQztBQUVGLElBQUEsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFRLEVBQUUsSUFBbUIsS0FBVTtRQUNyRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDTixPQUFPO0FBQ1YsU0FBQTtRQUVELElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQztRQUNsQixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBVyxDQUFDO0FBRXRELFFBQUEsSUFBSSxjQUFjLEVBQUU7QUFDaEIsWUFBQSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN0QyxTQUFBO0FBRUQsUUFBQSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksS0FBSyxjQUFjLEVBQUU7QUFDbEMsWUFBQSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQWtCLENBQUM7QUFDakQsU0FBQTtBQUVELFFBQUEsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFFbEIsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQy9CLFlBQUEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtBQUNWLGdCQUFBLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNCLGFBQUE7QUFDSixTQUFBO1FBRUQsSUFBSSxJQUFJLEtBQUssY0FBYyxFQUFFO0FBQ3pCLFlBQUEsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDO1lBQzFCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQztBQUNqQixZQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2hDLFNBQUE7QUFDTCxLQUFDLENBQUM7SUFFRixTQUFTLE1BQU0sQ0FBWSxJQUFtQixFQUFBOztRQUUxQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFhLEVBQUUsRUFBZSxLQUFJO1lBQ2hELEtBQUssTUFBTSxJQUFJLElBQUlBLEdBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3BDLGdCQUFBLE1BQU0sR0FBRyxHQUFHQSxHQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXBCLGdCQUFBLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7O2dCQUVwQixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUksQ0FBQSxFQUFBLFlBQVksQ0FBRyxDQUFBLENBQUEsQ0FBQyxDQUFDO2dCQUNoRCxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBYSxFQUFFLEVBQWUsS0FBSTtvQkFDOUMsUUFBUSxDQUFDQSxHQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDMUIsaUJBQUMsQ0FBQyxDQUFDO0FBQ04sYUFBQTtBQUNMLFNBQUMsQ0FBQyxDQUFDO0tBQ047O0FBR0QsSUFBQUEsR0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxNQUFNLENBQUM7QUFDOUIsQ0FBQztBQUVEOzs7OztBQUtHO0FBQ0csU0FBVSxZQUFZLENBQUMsVUFBcUMsRUFBQTtJQUM5RCxPQUFPO0FBQ0gsUUFBQSxJQUFJLEVBQUUsVUFBVTtRQUNoQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FDYixJQUFJLEVBQ0osTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUNWLFlBQUEsWUFBWSxFQUFFLFdBQVc7QUFDekIsWUFBQSxVQUFVLEVBQUUsYUFBYTtBQUN6QixZQUFBLFdBQVcsRUFBRSxjQUFjO0FBQzNCLFlBQUEsY0FBYyxFQUFFLEtBQUs7QUFDckIsWUFBQSw0QkFBNEIsRUFBRSxJQUFJO0FBQ2xDLFlBQUEsYUFBYSxFQUFFLFVBQVU7U0FDNUIsRUFBRSxVQUFVLENBQUMsQ0FDakI7S0FDSixDQUFDO0FBQ047O0FDbklBOzs7QUFHRztBQUNJLE1BQU0sQ0FBQyxHQUFtQixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFFbkQ7Ozs7Ozs7QUFPRztBQUNVLE1BQUEsY0FBYyxHQUFHLENBQUMsT0FBcUIsS0FBNkI7QUFDN0UsSUFBQSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRXZELElBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFFakUsSUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNYLFFBQUEsSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQ2pDLEtBQUE7QUFFRCxJQUFBLElBQUksU0FBUyxFQUFFO1FBQ1gsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFDbkQsS0FBQTtBQUVELElBQUEsSUFBSSxRQUFRLEVBQUU7QUFDVixRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1RCxLQUFBO0lBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQ2QsUUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pCLEtBQUE7SUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRTVCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxLQUFJO1FBQ25DLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxLQUFJO0FBQ3ZDLFlBQUEsSUFBSSxLQUFLLEVBQUU7QUFDUCxnQkFBQSxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzNGLGdCQUFBLElBQUksT0FBTyxFQUFFO29CQUNULE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4QyxpQkFBQTtBQUFNLHFCQUFBO0FBQ0gsb0JBQUEsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDekIsaUJBQUE7QUFDSixhQUFBO1lBQ0QsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hCLFNBQUMsQ0FBQyxDQUFDO0FBQ1AsS0FBQyxDQUFDLENBQUM7QUFDUCxFQUFFO0FBRUY7Ozs7O0FBS0c7QUFDSSxNQUFNLFdBQVcsR0FBRyxNQUFhO0FBQ3BDLElBQUEsT0FBTyxJQUFJLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUM7QUFDL0MsRUFBRTtBQUVGOzs7Ozs7QUFNRztBQUNJLE1BQU0sZUFBZSxHQUFHLE1BQXdCO0lBQ25ELE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNsRCxFQUFFO0FBRUY7OztBQUdHO01BQ1UsY0FBYyxHQUFHLENBQUMsR0FBVyxFQUFFLE9BQWtDLEtBQTZCO0FBQ3ZHLElBQUEsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN2RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSTtRQUNuQyxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsS0FBSTtBQUNoRCxZQUFBLElBQUksS0FBSyxFQUFFO0FBQ1AsZ0JBQUEsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsRUFBRSwrQkFBK0IsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDckcsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO29CQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4QyxpQkFBQTtBQUFNLHFCQUFBO0FBQ0gsb0JBQUEsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDekIsaUJBQUE7QUFDSixhQUFBO1lBQ0QsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hCLFNBQUMsQ0FBQyxDQUFDO0FBQ1AsS0FBQyxDQUFDLENBQUM7QUFDUCxFQUFFO0FBRUY7Ozs7Ozs7Ozs7QUFVRztNQUNVLFFBQVEsR0FBRyxDQUEwQixRQUF3QixFQUFFLE9BQXVCLEtBQWtCO0lBQ2pILE9BQU9BLEdBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFpQixDQUFDO0FBQ3pEOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9pMThuLyJ9