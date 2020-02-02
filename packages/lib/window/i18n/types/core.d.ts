export * from '@cdp/extension-i18n';
import { i18n } from '@cdp/extension-i18n';
import { DOMSelector, DOMResult } from '@cdp/dom';
import { I18NOptions } from './interfaces';
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
