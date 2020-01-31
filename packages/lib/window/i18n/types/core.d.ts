export * from '@cdp/extension-i18n';
import { i18n } from '@cdp/extension-i18n';
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
