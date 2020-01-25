export * from '@cdp/extension-i18n';
import { i18n } from '@cdp/extension-i18n';

/**
 * @en Translate funcion.
 * @ja 翻訳関数
 */
export const t: i18n.TFunction = i18n.t.bind(i18n);
