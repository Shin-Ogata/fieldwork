import { i18n } from '@cdp/extension-i18n';
import { PlainObject } from '@cdp/core-utils';
import { Cancelable } from '@cdp/promise';
import './plugin/module-extends';
/**
 * @en Option interface for [[initializeI18N]]().
 * @ja [[initializeI18N]]() に指定するオプションインターフェイス
 */
export interface I18NOptions extends i18n.InitOptions, Cancelable {
    /** short-cut for `ns` & 'defaultNS' */
    namespace?: string;
    /** backend options */
    backend?: i18n.AjaxBackendOptions | PlainObject;
    /** short-cut for backend.loadPath */
    resourcePath?: string;
    /** fallback resource name mapping */
    fallbackResources?: {
        [lng: string]: string;
    };
    /** dom-localizer options */
    dom?: i18n.DomLocalizerOptions;
}
