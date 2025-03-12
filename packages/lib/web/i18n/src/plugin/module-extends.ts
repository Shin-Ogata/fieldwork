/* eslint-disable
    @typescript-eslint/no-namespace,
 */

import type { i18n } from '@cdp/extension-i18n';
import type { AjaxRequestOptions } from '@cdp/ajax';

declare module '@cdp/extension-i18n' {
    namespace i18n {
        /**
         * @en {@link AjaxBackend} options interface.
         * @ja {@link AjaxBackend} のオプションインターフェイス
         */
        export interface AjaxBackendOptions extends AjaxRequestOptions {
            /** load path resolver */
            loadPath?: string | ((languages: string[], namespaces: string[]) => string);
        }

        /**
         * @en {@link DomLocalizer} options interface.
         * @ja {@link DomLocalizer} のオプションインターフェイス
         */
        export interface DomLocalizerOptions {
            /** selector for translating elements */
            selectorAttr?: string;
            /** data-() attribute to grab target element to translate (if different than itself) */
            targetAttr?: string;
            /** data-() attribute that contains options, will load/set if useOptionsAttr = true */
            optionsAttr?: string;
            /** see optionsAttr */
            useOptionsAttr?: boolean;
            /** parses default values from content ele.val or ele.text */
            parseDefaultValueFromContent?: boolean;
            /** `append` and `prepend` wrapper tag name */
            customTagName?: string | false;
        }
    }
}

declare module '@cdp/dom' {
    interface DOMPlugin {
        /**
         * @en Localize DOM method.
         * @ja DOM のローカライズ
         *
         * @param options
         *  - `en` `i18n.t()` function options
         *  - `ja` `i18n.t()` に渡すオプションを指定
         */
        localize(options?: i18n.TOptions): this;
    }
}
