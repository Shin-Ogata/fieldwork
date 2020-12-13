export * from '@cdp/extension-i18n';
import { i18n } from '@cdp/extension-i18n';
import { DOMSelector, DOMResult } from '@cdp/dom';
import { I18NOptions, I18NDetectErrorBehaviour } from './interfaces';
/**
 * @en Translate funcion.
 * @ja 翻訳関数
 */
export declare const t: i18n.TFunction;
/**
 * @en Initialize `i18next` instance.
 * @ja `i18next` インスタンスの初期化
 *
 * @param options
 *  - `en` init options
 *  - `ja` 初期化オプションを指定
 */
export declare const initializeI18N: (options?: I18NOptions | undefined) => Promise<i18n.TFunction>;
/**
 * @en Get the current detected or set language.
 * @ja 現在設定されている言語を取得
 *
 * @returns `ja-JP`, `ja`
 */
export declare const getLanguage: () => string;
/**
 * @en Get an array of `language-codes` that will be used it order to lookup the translation value.
 * @ja 翻訳の検索に使用される `language-codes` リストを取得
 *
 * @see
 *  - https://www.i18next.com/overview/api#languages
 */
export declare const getLanguageList: () => string[];
/**
 * @en Changes the language.
 * @ja 言語の切り替え
 */
export declare const changeLanguage: (lng: string, options?: I18NDetectErrorBehaviour | undefined) => Promise<i18n.TFunction>;
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
export declare const localize: <T extends string | Node>(selector: DOMSelector<T>, options?: i18n.TOptions<i18n.StringMap> | undefined) => DOMResult<T>;
