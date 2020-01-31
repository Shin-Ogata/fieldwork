import { AjaxRequestOptions } from '@cdp/ajax';
declare module '@cdp/extension-i18n' {
    namespace i18n {
        /**
         * @en [[AjaxBackend]] options interface.
         * @ja [[AjaxBackend]] のオプションインターフェイス
         */
        interface AjaxBackendOptions extends AjaxRequestOptions {
            /** load path resolver */
            loadPath?: string | ((languages: string[], namespaces: string[]) => string);
        }
    }
}
