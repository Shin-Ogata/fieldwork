import type { i18n } from '@cdp/extension-i18n';
import type { PlainObject, AnyObject } from '@cdp/core-utils';
import type { Cancelable } from '@cdp/promise';
import './plugin/module-extends';

/**
 * @en The behaviour for `i18next` error detection.
 * @ja `i18next` のエラー検知時の振る舞い
 */
export interface I18NDetectErrorBehaviour extends Cancelable {
    /** default: true */
    noThrow?: boolean;
}

/**
 * @en The general interface for `i18next` plugin.
 * @ja `i18next` プラグインの汎用インターフェイス
 */
export type I18NPlugin = i18n.Module & AnyObject;

/**
 * @en Option interface for {@link initializeI18N}().
 * @ja {@link initializeI18N}() に指定するオプションインターフェイス
 */
export interface I18NOptions extends i18n.InitOptions, I18NDetectErrorBehaviour {
    /** short-cut for `ns` & 'defaultNS' */
    namespace?: string;
    /** backend options */
    backend?: i18n.AjaxBackendOptions | PlainObject;
    /** short-cut for backend.loadPath */
    resourcePath?: string;
    /** fallback resource name mapping [lng, locale]*/
    fallbackResources?: Record<string, string>;
    /** dom-localizer options */
    dom?: i18n.DomLocalizerOptions;
    /** other plugins */
    plugins?: I18NPlugin | I18NPlugin[];
}
