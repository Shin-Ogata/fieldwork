export * from '@cdp/extension-i18n';
import { i18n } from '@cdp/extension-i18n';
import { RESULT_CODE, makeResult } from '@cdp/result';
import {
    dom as $,
    type DOMSelector,
    type DOMResult,
} from '@cdp/dom';
import type { I18NOptions, I18NDetectErrorBehaviour } from './interfaces';
import { navigator } from './ssr';
import { AjaxBackend, DomLocalizer } from './plugin';

/**
 * @en Translate funcion.
 * @ja 翻訳関数
 */
export const t: i18n.TFunction = i18n.t.bind(i18n);

/**
 * @en Initialize `i18next` instance.
 * @ja `i18next` インスタンスの初期化
 *
 * @param options
 *  - `en` init options
 *  - `ja` 初期化オプションを指定
 */
export const initializeI18N = (options?: I18NOptions): Promise<i18n.TFunction> => {
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
        i18n.use(AjaxBackend);
    }

    i18n.use(DomLocalizer(dom));

    return new Promise((resolve, reject) => {
        void i18n.init(opts, (error, translator) => {
            if (error) {
                const result = makeResult(RESULT_CODE.ERROR_I18N_CORE_LAYER, 'i18n#init() failed.', error);
                if (noThrow) {
                    console.warn(result.message, result);
                } else {
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
export const getLanguage = (): string => {
    return i18n.language || navigator.language;
};

/**
 * @en Get an array of `language-codes` that will be used it order to lookup the translation value.
 * @ja 翻訳の検索に使用される `language-codes` リストを取得
 *
 * @see
 *  - https://www.i18next.com/overview/api#languages
 */
export const getLanguageList = (): readonly string[] => {
    return i18n.languages || [navigator.language];
};

/**
 * @en Changes the language.
 * @ja 言語の切り替え
 */
export const changeLanguage = (lng: string, options?: I18NDetectErrorBehaviour): Promise<i18n.TFunction> => {
    const opts = Object.assign({ noThrow: true }, options);
    return new Promise((resolve, reject) => {
        void i18n.changeLanguage(lng, (error, translator) => {
            if (error) {
                const result = makeResult(RESULT_CODE.ERROR_I18N_CORE_LAYER, 'i18n#changeLanguate() failed.', error);
                if (opts.noThrow) {
                    console.warn(result.message, result);
                } else {
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
 *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
 *  - `ja` {@link DOM} のもとになるオブジェクト(群)またはセレクタ文字列
 * @param options
 *  - `en` translation options.
 *  - `ja` 翻訳オプション
 */
export const localize = <T extends string | Node>(selector: DOMSelector<T>, options?: i18n.TOptions): DOMResult<T> => {
    return $(selector).localize(options) as DOMResult<T>;
};
